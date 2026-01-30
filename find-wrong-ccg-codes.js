const fs = require('fs');
const fetch = require('node-fetch');
const { services } = require('./data/services.json');

/**
 * Get CCG/ICB codes for a postcode
 */
async function getCcgCodesForPostcode(postcode) {
  try {
    const result = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    const data = await result.json();

    if (data.status !== 200) {
      return { error: data.error || 'Postcode not found' };
    }

    return {
      postcode: data.result.postcode,
      ccg: data.result.codes?.ccg || null,  // Full CCG code (e.g., E38000200)
      ccgId: data.result.codes?.ccg_id || null,  // Short CCG code (e.g., 02G)
      icb: data.result.codes?.icb || null,  // ICB code (e.g., E54000048)
      country: data.result.country,
      adminArea: data.result.admin_district,
      coordinates: {
        lat: data.result.latitude,
        lng: data.result.longitude
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Normalize code for comparison (lowercase, remove spaces)
 */
function normalizeCode(code) {
  if (!code) return null;
  return code.toLowerCase().trim();
}

/**
 * Check if service codes match postcode codes
 */
function codesMatch(serviceCodes, postcodeData) {
  if (!serviceCodes || serviceCodes.length === 0) return { match: false, reason: 'No service codes' };
  if (postcodeData.error) return { match: false, reason: 'Postcode lookup failed' };

  const normalizedServiceCodes = serviceCodes.map(normalizeCode);
  const postcodeCcg = normalizeCode(postcodeData.ccg);  // Use full CCG code
  const postcodeIcb = normalizeCode(postcodeData.icb);  // Use ICB code

  // Check for matches
  const hasCcgMatch = postcodeCcg && normalizedServiceCodes.includes(postcodeCcg);
  const hasIcbMatch = postcodeIcb && normalizedServiceCodes.includes(postcodeIcb);

  if (hasCcgMatch || hasIcbMatch) {
    return { 
      match: true, 
      matchedCode: hasIcbMatch ? postcodeIcb : postcodeCcg,
      matchedType: hasIcbMatch ? 'ICB' : 'CCG'
    };
  }

  return { 
    match: false, 
    reason: 'No match',
    postcodeCcg: postcodeData.ccg,
    postcodeIcb: postcodeData.icb,
    serviceCodes: normalizedServiceCodes
  };
}

/**
 * Analyze a service
 */
async function analyzeService(service, index, total) {
  if (!service.postcode) {
    return { service, issue: 'No postcode', skip: true };
  }

  // Show progress
  if ((index + 1) % 10 === 0) {
    console.log(`Processing ${index + 1}/${total}...`);
  }

  const postcodeData = await getCcgCodesForPostcode(service.postcode);
  
  if (postcodeData.error) {
    return { 
      service, 
      issue: 'Postcode lookup failed', 
      error: postcodeData.error,
      skip: true 
    };
  }

  const codeCheck = codesMatch(service.ccgCodes, postcodeData);

  if (codeCheck.match) {
    return { service, match: true, skip: true };
  }

  // Mismatch found!
  return {
    service,
    match: false,
    postcodeData,
    codeCheck,
    correctCodes: {
      ccg: postcodeData.ccg,
      icb: postcodeData.icb,
      recommended: postcodeData.icb || postcodeData.ccg  // Prefer ICB, fallback to CCG
    }
  };
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Finding services with incorrect CCG codes...\n');
  console.log(`Analyzing ${services.length} services...\n`);

  const results = [];
  const issues = [];

  for (let i = 0; i < services.length; i++) {
    const result = await analyzeService(services[i], i, services.length);
    
    if (result.skip) {
      if (result.issue) {
        issues.push(result);
      }
      continue;
    }

    results.push(result);

    // Small delay to avoid rate limiting
    if (i < services.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  console.log(`\n✅ Analysis complete!\n`);
  console.log(`Found ${results.length} services with CCG code mismatches\n`);

  if (results.length === 0) {
    console.log('🎉 All services have correct CCG codes!');
    return;
  }

  // Group by issue type
  const scotlandServices = results.filter(r => r.postcodeData.country === 'Scotland');
  const englandServices = results.filter(r => r.postcodeData.country === 'England');
  const walesServices = results.filter(r => r.postcodeData.country === 'Wales');

  console.log('='.repeat(80));
  console.log('SERVICES WITH INCORRECT CCG CODES');
  console.log('='.repeat(80));
  console.log(`\nTotal mismatches: ${results.length}`);
  console.log(`  - England: ${englandServices.length}`);
  console.log(`  - Scotland: ${scotlandServices.length}`);
  console.log(`  - Wales: ${walesServices.length}`);
  console.log(`  - Other issues: ${issues.length}\n`);

  // Detailed report
  console.log('\n' + '='.repeat(80));
  console.log('DETAILED REPORT');
  console.log('='.repeat(80));

  results.forEach((result, index) => {
    const s = result.service;
    const pd = result.postcodeData;
    const cc = result.codeCheck;
    const correct = result.correctCodes;

    console.log(`\n${index + 1}. ${s.serviceName}`);
    console.log(`   ID: ${s.id}`);
    console.log(`   Postcode: ${s.postcode}`);
    console.log(`   Location: ${pd.adminArea}, ${pd.country}`);
    console.log(`   Current CCG Codes: ${JSON.stringify(s.ccgCodes)}`);
    console.log(`   Postcode CCG: ${pd.ccg || 'N/A'}`);
    console.log(`   Postcode ICB: ${pd.icb || 'N/A'}`);
    
    if (pd.country === 'Scotland') {
      console.log(`   ⚠️  SCOTLAND: Should use Health Board codes (S08xxxxxx)`);
      console.log(`   💡 Recommendation: Check existing Scotland services for correct Health Board code`);
    } else {
      console.log(`   ❌ Mismatch: Service codes don't match postcode location`);
      console.log(`   ✅ Recommended code: ${correct.recommended || 'N/A'}`);
      if (correct.icb) {
        console.log(`      (ICB code: ${correct.icb} - preferred for England)`);
      } else if (correct.ccg) {
        console.log(`      (CCG code: ${correct.ccg})`);
      }
    }
  });

  // Generate fix suggestions
  console.log('\n' + '='.repeat(80));
  console.log('FIX SUGGESTIONS');
  console.log('='.repeat(80));

  results.forEach((result) => {
    const s = result.service;
    const pd = result.postcodeData;
    const correct = result.correctCodes;

    if (pd.country === 'Scotland') {
      console.log(`\n// ${s.serviceName} (${s.id})`);
      console.log(`// Scotland service - needs Health Board code`);
      console.log(`// Postcode: ${s.postcode}, Location: ${pd.adminArea}`);
      console.log(`// TODO: Find correct Health Board code (S08xxxxxx)`);
    } else if (correct.recommended) {
      console.log(`\n// ${s.serviceName} (${s.id})`);
      console.log(`"ccgCodes": [${JSON.stringify(correct.recommended)}],`);
    }
  });

  // Save report to file
  const report = {
    generated: new Date().toISOString(),
    totalServices: services.length,
    mismatches: results.length,
    services: results.map(r => ({
      id: r.service.id,
      serviceName: r.service.serviceName,
      postcode: r.service.postcode,
      currentCodes: r.service.ccgCodes,
      correctCodes: r.correctCodes,
      location: r.postcodeData.adminArea,
      country: r.postcodeData.country
    }))
  };

  fs.writeFileSync('ccg-code-mismatches.json', JSON.stringify(report, null, 2));
  console.log(`\n\n📄 Detailed report saved to: ccg-code-mismatches.json`);
}

main().catch(console.error);

