# How to Regenerate GeoJSON Files

## Quick Start

```bash
node scripts/create-geo-json.js
```

That's it! This will regenerate all three GeoJSON files:

- `data/aac-services-geo.geojson`
- `data/ec-services-geo.geojson`
- `data/wcs-services-geo.geojson`

## Prerequisites

### 1. Required Dependencies

Make sure you have all npm packages installed:

```bash
npm install
```

### 2. Required Tools

The script uses `mapshaper` to process the GeoJSON files. Check if it's installed:

```bash
which mapshaper
```

If not installed, install it:

```bash
npm install -g mapshaper
```

Or if you prefer not to install globally, you can install it locally:

```bash
npm install --save-dev mapshaper
```

### 3. Archive Directory

The script needs boundary files in the `archive/` directory. Check if it exists:

```bash
ls -la archive/
```

Required files (at minimum):

- `ICBs-2023.json` - For ICB codes
- `Clinical_Commissioning_Groups_(April_2021)_EN_BUC.json` - For CCG codes
- `health-boards-small.json` - For Scotland Health Board codes
- Other boundary files as needed

If the archive directory is missing, you'll need to download the boundary files from ONS/NHS Digital.

## Step-by-Step Process

### Step 1: Update services.json

Before regenerating, make sure you've updated the CCG codes in `data/services.json`:

```json
{
  "id": "service-id",
  "ccgCodes": ["E54000054"],  // Updated codes
  ...
}
```

### Step 2: Run the Script

```bash
cd /Users/admin.stephen/Documents/Work/service-finder/nhs-service-finder
node scripts/create-geo-json.js
```

### Step 3: Check Output

The script will:

1. Read all services from `services.json`
2. Group them by type (AAC, EC, WCS)
3. For each service, look up CCG codes in boundary files
4. Create polygon features
5. Simplify and merge polygons
6. Write to GeoJSON files

**Watch for:**

- Warnings: `Could not find location for ccg, <code>, <service-id>`
  - This means a CCG code wasn't found in boundary files
  - The service won't get a polygon (won't appear in searches)

### Step 4: Verify Output

Check that the files were created/updated:

```bash
ls -lh data/*-services-geo.geojson
```

Check file sizes - they should be substantial (not empty or tiny).

## What the Script Does

1. **Reads services.json** - Gets all service data
2. **Filters by type** - Separates AAC, EC, and WCS services
3. **For each service:**
   - Gets CCG codes from service data
   - Looks up each code in boundary files (in priority order)
   - Creates polygon features for each found boundary
4. **Processes polygons:**
   - Simplifies coordinates (reduces file size)
   - Merges overlapping polygons for same service
5. **Writes GeoJSON files** - Outputs to `data/` folder

## Troubleshooting

### Error: "Cannot find module './archive/ICBs-2023.json'"

**Problem:** Archive directory or files are missing.

**Solution:**

1. Check if `archive/` directory exists
2. Download boundary files from ONS/NHS Digital
3. Place them in the `archive/` directory

### Error: "mapshaper: command not found"

**Problem:** mapshaper is not installed.

**Solution:**

```bash
npm install -g mapshaper
```

Or if you prefer local installation:

```bash
npm install --save-dev mapshaper
```

Then update the script to use local mapshaper:

```javascript
// In create-geo-json.js, change:
execSync(`mapshaper ...`);

// To:
execSync(`npx mapshaper ...`);
```

### Warning: "Could not find location for ccg, ..."

**Problem:** CCG code not found in any boundary file.

**Possible causes:**

- Code is incorrect/typo
- Code is outdated
- Boundary files are outdated
- Code format is wrong

**Solution:**

1. Verify the CCG code is correct
2. Check if code needs to be converted (e.g., CCG to ICB)
3. Update boundary files if needed
4. Use alternative code if available

### Script Runs But Files Are Empty

**Problem:** No services have valid CCG codes that match boundary files.

**Solution:**

1. Check if services have CCG codes
2. Verify codes exist in boundary files
3. Check script output for warnings

### Script Takes Too Long

**Problem:** Processing many services can take time.

**Solution:**

- This is normal for 185+ services
- Script processes sequentially
- Can take 1-5 minutes depending on system

## Verification After Regeneration

### 1. Check File Sizes

```bash
ls -lh data/*-services-geo.geojson
```

Files should be substantial (not empty).

### 2. Count Services in GeoJSON

```bash
node -e "const fs=require('fs');const wcs=JSON.parse(fs.readFileSync('data/wcs-services-geo.geojson','utf8'));const ids=new Set();wcs.features.forEach(f=>{if(f.properties&&f.properties.serviceId)ids.add(f.properties.serviceId);});console.log('WCS services in GeoJSON:',ids.size);"
```

### 3. Test a Service

Search for a service postcode and verify it appears:

```bash
# Start the server
npm run dev

# In another terminal, test the GraphQL query
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { search(query: \"WN8 9PN\") { services { id serviceName } } }"}'
```

## Best Practices

1. **Always regenerate after updating CCG codes** in services.json
2. **Check for warnings** - Address any "Could not find location" messages
3. **Test after regeneration** - Verify services appear in searches
4. **Commit both files** - services.json AND GeoJSON files
5. **Document changes** - Note what was updated and why

## Example Workflow

```bash
# 1. Update CCG codes in services.json
# (edit the file)

# 2. Regenerate GeoJSON files
node scripts/create-geo-json.js

# 3. Check for warnings
# (review script output)

# 4. Verify files were created
ls -lh data/*-services-geo.geojson

# 5. Test a service
npm run dev
# (test in browser or with curl)

# 6. Commit changes
git add data/services.json data/*-services-geo.geojson
git commit -m "Update CCG codes and regenerate GeoJSON files"
```

## Quick Reference

```bash
# Regenerate all GeoJSON files
node scripts/create-geo-json.js

# Check if mapshaper is installed
which mapshaper

# Install mapshaper (if needed)
npm install -g mapshaper

# Check archive directory exists
ls archive/

# Count services in GeoJSON
node -e "const fs=require('fs');const wcs=JSON.parse(fs.readFileSync('data/wcs-services-geo.geojson','utf8'));console.log('Features:',wcs.features.length);"
```

## Notes

- The script processes services sequentially (not in parallel)
- It creates temporary files in `temp/` directory
- Final files are written to `data/` directory
- The script will overwrite existing GeoJSON files
- Always backup before regenerating if you're unsure
