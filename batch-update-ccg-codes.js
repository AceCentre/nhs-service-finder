#!/usr/bin/env node

/**
 * Batch update CCG codes for all services based on ccg-code-mismatches.json
 * 
 * Usage: node batch-update-ccg-codes.js [--dry-run]
 * 
 * --dry-run: Show what would be changed without actually updating the file
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const SERVICES_FILE = path.join(__dirname, 'data/services.json');
const MISMATCHES_FILE = path.join(__dirname, 'ccg-code-mismatches.json');
const BACKUP_FILE = path.join(__dirname, 'data/services.json.backup');

function backupServicesFile() {
  if (fs.existsSync(SERVICES_FILE)) {
    fs.copyFileSync(SERVICES_FILE, BACKUP_FILE);
    console.log(`✅ Backed up services.json to services.json.backup`);
  }
}

function loadServices() {
  const content = fs.readFileSync(SERVICES_FILE, 'utf8');
  return JSON.parse(content);
}

function loadMismatches() {
  const content = fs.readFileSync(MISMATCHES_FILE, 'utf8');
  return JSON.parse(content);
}

function updateServices(services, mismatches) {
  const updates = [];
  const notFound = [];
  const unchanged = [];

  mismatches.services.forEach(mismatch => {
    const service = services.services.find(s => s.id === mismatch.id);
    
    if (!service) {
      notFound.push(mismatch.id);
      return;
    }

    const currentCodes = service.ccgCodes || [];
    const recommendedCode = mismatch.correctCodes.recommended;
    
    // Check if update is needed
    const needsUpdate = !currentCodes.includes(recommendedCode) || 
                        currentCodes.length !== 1 ||
                        currentCodes[0] !== recommendedCode;

    if (needsUpdate) {
      const oldCodes = [...currentCodes];
      service.ccgCodes = [recommendedCode];
      
      updates.push({
        id: mismatch.id,
        serviceName: mismatch.serviceName,
        oldCodes: oldCodes,
        newCode: recommendedCode,
        postcode: mismatch.postcode
      });
    } else {
      unchanged.push({
        id: mismatch.id,
        serviceName: mismatch.serviceName,
        codes: currentCodes
      });
    }
  });

  return { updates, notFound, unchanged };
}

function saveServices(services) {
  const content = JSON.stringify(services, null, 2);
  fs.writeFileSync(SERVICES_FILE, content, 'utf8');
}

function main() {
  console.log('=== Batch Update CCG Codes ===\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Load data
    console.log('Loading services.json...');
    const services = loadServices();
    console.log(`  Found ${services.services.length} services\n`);

    console.log('Loading ccg-code-mismatches.json...');
    const mismatches = loadMismatches();
    console.log(`  Found ${mismatches.mismatches} services with mismatches\n`);

    // Update services
    console.log('Analyzing updates...');
    const { updates, notFound, unchanged } = updateServices(services, mismatches);

    console.log(`\n=== Results ===`);
    console.log(`✅ Services to update: ${updates.length}`);
    console.log(`⚠️  Services not found: ${notFound.length}`);
    console.log(`ℹ️  Services already correct: ${unchanged.length}\n`);

    if (notFound.length > 0) {
      console.log('Services not found in services.json:');
      notFound.forEach(id => console.log(`  - ${id}`));
      console.log('');
    }

    if (unchanged.length > 0 && unchanged.length <= 10) {
      console.log('Services already correct:');
      unchanged.forEach(s => console.log(`  - ${s.id}: ${s.codes.join(', ')}`));
      console.log('');
    } else if (unchanged.length > 10) {
      console.log(`(${unchanged.length} services already have correct codes)\n`);
    }

    // Show updates
    if (updates.length > 0) {
      console.log('=== Services to be updated ===\n');
      
      // Show first 20 updates
      const toShow = updates.slice(0, 20);
      toShow.forEach((update, i) => {
        console.log(`${i + 1}. ${update.id} - ${update.serviceName}`);
        console.log(`   Old: ${update.oldCodes.join(', ')}`);
        console.log(`   New: ${update.newCode}`);
        console.log(`   Postcode: ${update.postcode}`);
        console.log('');
      });

      if (updates.length > 20) {
        console.log(`... and ${updates.length - 20} more services\n`);
      }

      // Save changes
      if (!DRY_RUN) {
        console.log('Creating backup...');
        backupServicesFile();
        
        console.log('Updating services.json...');
        saveServices(services);
        
        console.log('\n✅ Update complete!');
        console.log(`   Updated ${updates.length} services`);
        console.log(`   Backup saved to: data/services.json.backup`);
        console.log('\nNext steps:');
        console.log('  1. Review the changes');
        console.log('  2. Run: node scripts/create-geo-json.js');
        console.log('  3. Test that services appear correctly');
      } else {
        console.log('\n🔍 DRY RUN - No changes made');
        console.log(`   Would update ${updates.length} services`);
        console.log('\nRun without --dry-run to apply changes');
      }
    } else {
      console.log('✅ All services already have correct codes!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

