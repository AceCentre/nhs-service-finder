# Guide: Adding New Services

Based on your spreadsheet data, here's what you need to collect for each service.

## Required Fields

### 1. **Basic Information** (from your spreadsheet)
- ✅ **serviceName** - Full service name (e.g., "Specialist Mobility Rehabilitation Centre")
- ✅ **postcode** - Service postcode (e.g., "PR2 8DY")
- ✅ **phoneNumber** - Contact phone (e.g., "01772716921")
- ✅ **addressLines** - Array of address lines (you'll need to expand from just city)

### 2. **Service Identification**
- ⚠️ **id** - Unique lowercase identifier (e.g., "preston-mobility" or "specialist-mobility-rehab")
  - Generate from service name: lowercase, replace spaces with hyphens
  - Must be unique across all services

### 3. **Service Type** (CRITICAL)
- ⚠️ **servicesOffered** - Array of service types: `["aac"]`, `["ec"]`, `["wcs"]`, or combinations
  - **AAC** = Augmentative and Alternative Communication
  - **EC** = Environmental Control
  - **WCS** = Wheelchair Service
  - From your spreadsheet, most appear to be **WCS** services

### 4. **CCG Codes** (CRITICAL - for search/map to work)
- ⚠️ **ccgCodes** - Array of CCG/ICB/Health Board codes
  - **This is the most important field** - without correct codes, services won't appear in search/map
  - Use `verify-ccg-codes.js` script to find correct codes based on postcode
  - Or use Postcodes.io API: `https://api.postcodes.io/postcodes/{postcode}`
  - Look for `ccg` or `icb` properties in the response

### 5. **Contact Information**
- ⚠️ **email** - Service email address
- ⚠️ **website** - Service website URL (full URL, e.g., "https://www.example.com")

### 6. **Additional Fields** (can be null/empty)
- **serviceColor** - Color code (can be `null`)
- **communicationMatters** - Link to Communication Matters listing (can be `null`)
- **caseload** - Usually `"All"` or specific description
- **provider** - Service provider name (can be `null`)
- **note** - Additional notes (can be `null`)
- **country** - `"England"`, `"Scotland"`, `"Wales"`, or `"NorthernIreland"`

### 7. **Extended Information** (optional but recommended)
- **additionalContactEmail** - Additional contact (can be `null`)
- **additionalContactName** - Additional contact name (can be `null`)
- **servicesProvidedDescription** - Description of services
- **scale** - Service scale/scope
- **populationServed** - Who the service serves
- **areaCoveredText** - Text description of coverage area
- **staffing** - Staffing information
- **referralProcess** - How to refer
- **fundedBy** - Funding source
- **permanentOrProject** - Service type
- **yearSetUp** - Year established

## Example Service Entry

```json
{
  "serviceName": "Specialist Mobility Rehabilitation Centre",
  "id": "preston-mobility",
  "serviceColor": null,
  "communicationMatters": null,
  "phoneNumber": "01772716921",
  "website": "https://www.example.com",
  "addressLines": [
    "Building Name",
    "Street Address",
    "Preston",
    "PR2 8DY"
  ],
  "email": "contact@example.com",
  "servicesOffered": ["wcs"],
  "ccgCodes": ["E54000054"],  // ← CRITICAL: Get from Postcodes.io API
  "caseload": "All",
  "postcode": "PR2 8DY",
  "provider": null,
  "note": null,
  "country": "England"
}
```

## Step-by-Step Process

### 1. For Each Service in Your Spreadsheet:

**a) Get the postcode and find CCG/ICB codes:**
```bash
# Option 1: Use the verify script
node verify-ccg-codes.js --postcode "PR2 8DY"

# Option 2: Use Postcodes.io API directly
curl "https://api.postcodes.io/postcodes/PR2 8DY"
# Look for "ccg" or "icb" in the response
```

**b) Determine service type:**
- Wheelchair services → `["wcs"]`
- AAC services → `["aac"]`
- EC services → `["ec"]`
- Multiple types → `["wcs", "aac"]`

**c) Create unique ID:**
- From service name: "Specialist Mobility Rehabilitation Centre"
- To ID: `"specialist-mobility-rehab"` or `"preston-mobility"`
- Make it short, lowercase, hyphenated

**d) Collect missing information:**
- Full address (not just city)
- Email address
- Website URL
- Any additional details

### 2. Add to services.json

Add each service as a new object in the `services` array in `data/services.json`.

### 3. Regenerate GeoJSON Files

After adding services, regenerate the GeoJSON files:
```bash
node scripts/create-geo-json.js
```

This will:
- Create polygons for services with valid CCG codes
- Show warnings for services with missing/invalid codes
- Generate the `*-services-geo.geojson` files used by the frontend

### 4. Verify Services Appear

Test that services appear in search:
- Search for the service's postcode
- Check the map for coverage polygons
- Verify the service appears in GraphQL queries

## Quick Checklist for Each Service

- [ ] Unique `id` (lowercase, hyphenated)
- [ ] `serviceName` (full name)
- [ ] `postcode` (from spreadsheet)
- [ ] `phoneNumber` (from spreadsheet)
- [ ] `addressLines` (full address array)
- [ ] `email` (contact email)
- [ ] `website` (full URL)
- [ ] `servicesOffered` (array: `["wcs"]`, `["aac"]`, `["ec"]`, or combinations)
- [ ] **`ccgCodes`** (array of CCG/ICB codes - **CRITICAL!**)
- [ ] `country` (`"England"`, `"Scotland"`, `"Wales"`, or `"NorthernIreland"`)
- [ ] `caseload` (usually `"All"`)

## Tools to Help

1. **`verify-ccg-codes.js`** - Verify/find CCG codes for services
2. **`find-wrong-ccg-codes.js`** - Check if existing codes are correct
3. **Postcodes.io API** - Get CCG/ICB codes from postcodes
4. **`scripts/create-geo-json.js`** - Regenerate GeoJSON after adding services

## Common Issues

1. **Service doesn't appear in search:**
   - Check `ccgCodes` are correct and exist in boundary files
   - Verify service is in GeoJSON files after regeneration
   - Check postcode resolves correctly

2. **Service appears but wrong area:**
   - CCG codes might be wrong - verify with Postcodes.io
   - Update `ccgCodes` and regenerate

3. **Missing required fields:**
   - Check all required fields are present
   - Use `null` for optional fields that don't have values

