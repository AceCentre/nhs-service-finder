const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

/**
 * Verify if a CCG code exists in the boundary files
 */
function verifyCcgInBoundaryFiles(ccgCode) {
  const archivePath = path.join(__dirname, 'archive');
  
  // Check if archive directory exists
  if (!fs.existsSync(archivePath)) {
    console.log('⚠️  Archive directory not found. Cannot verify CCG codes in boundary files.');
    return { found: false, reason: 'Archive directory missing' };
  }

  const boundaryFiles = [
    { file: 'ICBs-2023.json', key: 'ICB23CD', name: 'ICBs 2023' },
    { file: 'Clinical_Commissioning_Groups_(April_2021)_EN_BUC.json', key: 'CCG21CD', name: 'CCG 2021' },
    { file: 'Clinical_Commissioning_Groups_(April_2020)_EN_BFC_V2.json', key: 'ccg20cd', name: 'CCG 2020' },
    { file: 'Clinical_Commissioning_Groups__April_2019__Boundaries_EN_BUC.json', key: 'CCG19CD', name: 'CCG 2019' },
    { file: 'health-boards-small.json', key: 'HBCode', name: 'Scotland Health Boards' },
  ];

  const results = [];

  for (const boundary of boundaryFiles) {
    const filePath = path.join(archivePath, boundary.file);
    
    if (!fs.existsSync(filePath)) {
      continue;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const found = data.features.find(f => {
        const value = f.properties[boundary.key];
        return value && value.toLowerCase() === ccgCode.toLowerCase();
      });

      if (found) {
        results.push({
          found: true,
          source: boundary.name,
          file: boundary.file,
          name: found.properties[boundary.key + 'H'] || found.properties[boundary.key + 'NM'] || found.properties.name || 'Unknown'
        });
      }
    } catch (error) {
      // File exists but can't be read
      continue;
    }
  }

  return results.length > 0 
    ? { found: true, results } 
    : { found: false, reason: 'Code not found in any boundary file' };
}

/**
 * Get CCG/ICB codes for a postcode using postcodes.io API
 */
async function getCcgCodesForPostcode(postcode) {
  try {
    const result = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    const data = await result.json();

    if (data.status !== 200) {
      return { error: data.error || 'Postcode not found' };
    }

    const codes = {
      postcode: data.result.postcode,
      coordinates: {
        lat: data.result.latitude,
        lng: data.result.longitude
      },
      adminArea: data.result.admin_district,
      ccg: data.result.codes?.ccg || null,
      ccgId: data.result.codes?.ccg_id || null,
      icb: data.result.codes?.icb || null,
      icbCode: data.result.codes?.icb_code || null,
      parliamentaryConstituency: data.result.parliamentary_constituency,
      region: data.result.region,
      country: data.result.country
    };

    return codes;
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Verify a service's CCG codes
 */
async function verifyServiceCcgCodes(service) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Service: ${service.serviceName}`);
  console.log(`ID: ${service.id}`);
  console.log(`Postcode: ${service.postcode}`);
  console.log(`CCG Codes: ${JSON.stringify(service.ccgCodes)}`);
  console.log(`${'='.repeat(60)}\n`);

  // Step 1: Get CCG/ICB codes for the service's postcode
  let postcodeData = null;
  if (service.postcode) {
    console.log('Step 1: Checking postcode location...');
    postcodeData = await getCcgCodesForPostcode(service.postcode);
    
    if (postcodeData.error) {
      console.log(`  ❌ Error: ${postcodeData.error}`);
    } else {
      console.log(`  ✅ Postcode found: ${postcodeData.postcode}`);
      console.log(`     Location: ${postcodeData.adminArea}, ${postcodeData.region}`);
      console.log(`     Coordinates: [${postcodeData.coordinates.lng}, ${postcodeData.coordinates.lat}]`);
      
      if (postcodeData.ccg) {
        console.log(`     CCG: ${postcodeData.ccg} (ID: ${postcodeData.ccgId})`);
      }
      if (postcodeData.icb) {
        console.log(`     ICB: ${postcodeData.icb} (Code: ${postcodeData.icbCode})`);
      }
      if (postcodeData.country === 'Scotland') {
        console.log(`     Note: This is in Scotland - should use Health Board codes (S08xxxxxx)`);
      }
    }
    console.log('');
  }

  // Step 2: Verify each CCG code exists in boundary files
  console.log('Step 2: Verifying CCG codes in boundary files...');
  
  if (!service.ccgCodes || service.ccgCodes.length === 0) {
    console.log('  ❌ Service has NO CCG codes - this is why it\'s missing!');
    return;
  }

  for (const ccgCode of service.ccgCodes) {
    console.log(`\n  Checking: ${ccgCode}`);
    const verification = verifyCcgInBoundaryFiles(ccgCode);
    
    if (verification.found) {
      console.log(`    ✅ Found in: ${verification.results.map(r => r.source).join(', ')}`);
      verification.results.forEach(r => {
        console.log(`       - ${r.source}: ${r.name}`);
      });
    } else {
      console.log(`    ❌ NOT FOUND in boundary files`);
      console.log(`       Reason: ${verification.reason}`);
      console.log(`       ⚠️  This code needs to be fixed or the boundary files need updating`);
    }
  }

  // Step 3: Check if codes match the postcode location
  if (service.postcode && postcodeData && !postcodeData.error) {
    console.log('\nStep 3: Checking if CCG codes match postcode location...');
    
    const serviceCodes = service.ccgCodes.map(c => c.toLowerCase());
    const postcodeCcg = postcodeData.ccgId?.toLowerCase();
    const postcodeIcb = postcodeData.icbCode?.toLowerCase();
    
    let matches = false;
    if (postcodeCcg && serviceCodes.includes(postcodeCcg)) {
      console.log(`  ✅ Service CCG code matches postcode CCG: ${postcodeData.ccgId}`);
      matches = true;
    }
    if (postcodeIcb && serviceCodes.includes(postcodeIcb)) {
      console.log(`  ✅ Service ICB code matches postcode ICB: ${postcodeData.icbCode}`);
      matches = true;
    }
    
    if (!matches) {
      console.log(`  ⚠️  Service CCG codes don't match postcode location`);
      if (postcodeCcg) {
        console.log(`     Postcode CCG: ${postcodeData.ccgId} (not in service codes)`);
      }
      if (postcodeIcb) {
        console.log(`     Postcode ICB: ${postcodeData.icbCode} (not in service codes)`);
      }
      console.log(`     This might be correct if the service covers a different area than its location`);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node verify-ccg-codes.js <service-id> [service-id2 ...]');
    console.log('   or: node verify-ccg-codes.js --all');
    console.log('\nExamples:');
    console.log('  node verify-ccg-codes.js chrlyman');
    console.log('  node verify-ccg-codes.js clifstffds nthdurm');
    console.log('  node verify-ccg-codes.js --all');
    process.exit(1);
  }

  const { services } = require('./data/services.json');

  if (args[0] === '--all') {
    console.log('Verifying all services...\n');
    for (const service of services) {
      await verifyServiceCcgCodes(service);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } else {
    for (const serviceId of args) {
      const service = services.find(s => s.id === serviceId);
      if (!service) {
        console.log(`❌ Service not found: ${serviceId}`);
        continue;
      }
      await verifyServiceCcgCodes(service);
    }
  }
}

main().catch(console.error);

