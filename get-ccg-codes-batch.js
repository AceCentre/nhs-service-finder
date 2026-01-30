#!/usr/bin/env node

/**
 * Batch script to get CCG/ICB codes for multiple postcodes
 * Usage: node get-ccg-codes-batch.js "PR2 8DY" "WN8 9PR" "CW1 4QJ"
 * Or: node get-ccg-codes-batch.js < postcodes.txt
 */

const fetch = require('node-fetch');

const postcodes = process.argv.slice(2);

if (postcodes.length === 0) {
  console.log('Usage: node get-ccg-codes-batch.js "PR2 8DY" "WN8 9PR" "CW1 4QJ"');
  console.log('');
  console.log('Or provide postcodes from your spreadsheet:');
  console.log('  PR2 8DY  (Preston)');
  console.log('  WN8 9PR  (Skelmersdale)');
  console.log('  CW1 4QJ  (Crewe)');
  console.log('  M28 2LY  (Salford)');
  console.log('  L9 7AL   (Liverpool)');
  console.log('  SK14 4NL (Hyde)');
  console.log('  WA9 3DA  (St Helens)');
  console.log('  L36 6HY  (Liverpool)');
  console.log('  SK11 8SR (Macclesfield)');
  process.exit(1);
}

async function getCCGCodes(postcode) {
  try {
    const normalized = postcode.replace(/\s+/g, '').toUpperCase();
    const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 200 || !data.result) {
      return {
        postcode,
        error: data.error || 'Postcode not found',
        ccg: null,
        icb: null,
        country: null,
      };
    }

    const result = data.result;
    return {
      postcode: result.postcode,
      ccg: result.codes?.ccg || null,
      icb: result.codes?.icb || null,
      country: result.country || null,
      adminDistrict: result.admin_district || null,
      adminCounty: result.admin_county || null,
      // Use ICB if available, otherwise CCG
      recommendedCode: result.codes?.icb || result.codes?.ccg || null,
    };
  } catch (error) {
    return {
      postcode,
      error: error.message,
      ccg: null,
      icb: null,
      country: null,
    };
  }
}

async function main() {
  console.log('Fetching CCG/ICB codes for postcodes...\n');

  const results = await Promise.all(
    postcodes.map(postcode => getCCGCodes(postcode))
  );

  console.log('Results:\n');
  console.log('Postcode | Recommended Code | CCG | ICB | Country');
  console.log('---------|------------------|-----|-----|--------');

  results.forEach(result => {
    if (result.error) {
      console.log(`${result.postcode.padEnd(9)} | ERROR: ${result.error}`);
    } else {
      const code = result.recommendedCode || 'NOT FOUND';
      const ccg = result.ccg || '-';
      const icb = result.icb || '-';
      const country = result.country || '-';
      console.log(
        `${result.postcode.padEnd(9)} | ${String(code).padEnd(16)} | ${String(ccg).padEnd(3)} | ${String(icb).padEnd(3)} | ${country}`
      );
    }
  });

  console.log('\n=== JSON Format (for services.json) ===\n');
  console.log('Copy this into your service entry:');
  console.log('');
  
  results.forEach((result, index) => {
    if (!result.error && result.recommendedCode) {
      console.log(`// ${postcodes[index]}`);
      console.log(`"ccgCodes": ["${result.recommendedCode}"],`);
      console.log(`"country": "${result.country || 'England'}",`);
      console.log('');
    }
  });

  console.log('\n=== Full Service Template ===\n');
  results.forEach((result, index) => {
    if (!result.error && result.recommendedCode) {
      const serviceName = `Service Name ${index + 1}`;
      const id = `service-${index + 1}`;
      console.log(`{`);
      console.log(`  "serviceName": "${serviceName}",`);
      console.log(`  "id": "${id}",`);
      console.log(`  "serviceColor": null,`);
      console.log(`  "communicationMatters": null,`);
      console.log(`  "phoneNumber": "PHONE_NUMBER",`);
      console.log(`  "website": "https://www.example.com",`);
      console.log(`  "addressLines": [`);
      console.log(`    "STREET_ADDRESS",`);
      console.log(`    "CITY",`);
      console.log(`    "${result.postcode}"`);
      console.log(`  ],`);
      console.log(`  "email": "email@example.com",`);
      console.log(`  "servicesOffered": ["wcs"],`);
      console.log(`  "ccgCodes": ["${result.recommendedCode}"],`);
      console.log(`  "caseload": "All",`);
      console.log(`  "postcode": "${result.postcode}",`);
      console.log(`  "provider": null,`);
      console.log(`  "note": null,`);
      console.log(`  "country": "${result.country || 'England'}",`);
      console.log(`  "yearSetUp": null,`);
      console.log(`  "permanentOrProject": null,`);
      console.log(`  "fundedBy": null,`);
      console.log(`  "referralProcess": null,`);
      console.log(`  "staffing": null,`);
      console.log(`  "areaCoveredText": null,`);
      console.log(`  "populationServed": null,`);
      console.log(`  "scale": null,`);
      console.log(`  "servicesProvidedDescription": null,`);
      console.log(`  "additionalContactName": null,`);
      console.log(`  "additionalContactEmail": null`);
      console.log(`},`);
      console.log('');
    }
  });
}

main().catch(console.error);

