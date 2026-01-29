# How the NHS Service Finder Works

## Overview

The NHS Service Finder helps users find specialist services (AAC, EC, WCS) based on their location. It uses geographic boundaries to determine which services cover a user's postcode, town, or coordinates.

## Architecture

### 1. Data Storage

**`data/services.json`**

- Contains all service information (name, address, phone, etc.)
- Each service has:
  - `id`: Unique identifier
  - `ccgCodes`: Array of boundary codes (CCG, ICB, Health Board, etc.)
  - `servicesOffered`: Array of service types (["aac"], ["ec"], ["wcs"])
  - `postcode`: Service location postcode
  - Other metadata (phone, email, address, etc.)

**`data/*-services-geo.geojson`**

- Three separate GeoJSON files:
  - `aac-services-geo.geojson` - AAC services coverage areas
  - `ec-services-geo.geojson` - EC services coverage areas
  - `wcs-services-geo.geojson` - WCS services coverage areas
- Each file contains polygon features representing service coverage areas
- Each feature has `properties.serviceId` linking to the service in `services.json`

### 2. Boundary System

The system uses multiple types of boundaries depending on the country and region:

#### England

- **ICBs (Integrated Care Boards)** - Replaced CCGs in 2022
  - Code format: `E54xxxxxx` (e.g., `E54000039`)
  - Priority: Checked first (most recent)
- **CCGs (Clinical Commissioning Groups)** - Historical, multiple years
  - Code format: `e38xxxxxx` (e.g., `e38000034`)
  - Multiple versions: 2015, 2016, 2017, 2019, 2020, 2021
  - Used as fallback if ICB not found
- **Counties** - Used as last resort
- **London Boroughs** - Special handling for London services

#### Scotland

- **Health Boards** - NHS Scotland administrative areas
  - Code format: `S08xxxxxx` (e.g., `S08000024` for NHS Lothian)
  - Examples:
    - `S08000001` - NHS Grampian (Aberdeen)
    - `S08000017` - NHS Highland
    - `S08000024` - NHS Lothian (Edinburgh)

#### Wales

- **Postcode Areas** - Welsh postcode prefixes
  - CH, LD, LL, SY, CF, HR, SA, NP
- **AllWales** - Special flag for services covering all of Wales

#### Northern Ireland

- **Special Flag** - `isNorthernIreland` property

### 3. GeoJSON Generation Process

**Script: `scripts/create-geo-json.js`**

This script converts service CCG codes into geographic polygons:

1. **Reads service data** from `services.json`
2. **For each service:**
   - Gets the service's `ccgCodes` array
   - For each CCG code, searches boundary files in priority order:
     ```
     1. London Boroughs (UTLA22NM)
     2. ICBs 2023 (ICB23CD) - England
     3. Northern Ireland flag
     4. All Wales flag
     5. Scotland Health Boards (HBCode)
     6. Welsh postcode areas (name)
     7. CCG 2021 (CCG21CD)
     8. CCG 2020 (ccg20cd)
     9. CCG 2019 (CCG19CD)
     10. CCG 2017 (ccg17cd)
     11. CCG 2016 (ccg16cd)
     12. CCG 2015 (ccg15cd)
     13. Counties (CTY20NM)
     ```
   - If found, extracts the polygon geometry
   - Creates a GeoJSON feature with `serviceId` property
3. **Combines all features** for each service type
4. **Simplifies polygons** (reduces coordinate points for performance)
5. **Dissolves overlapping polygons** (merges multiple CCG areas for same service)
6. **Outputs** three GeoJSON files (one per service type)

**Key Point:** If a CCG code isn't found in any boundary file, the service gets NO polygon, meaning it won't appear in location searches.

### 4. Search Process

**GraphQL Query Flow:**

When a user searches (postcode, place name, or coordinates):

1. **Location Resolution:**

   - Postcode → Converted to coordinates via `postcodes.io` API
   - Place name → Converted to coordinates via `postcodes.io` API
   - Coordinates → Used directly

2. **Point-in-Polygon Check:**

   ```javascript
   getServicesFromPoint(currentPoint) {
     // Load GeoJSON files
     const { aac, ec, wcs } = await getServicesGeo();

     // For each polygon in all GeoJSON files
     for (const feature of [...aac.features, ...ec.features, ...wcs.features]) {
       // Check if the search point is within this polygon
       const ptsWithin = turf.pointsWithinPolygon(currentPoint, feature);

       if (ptsWithin.features.length > 0) {
         // Point is inside! Add this service
         featuresWithPoints.push(feature.properties.serviceId);
       }
     }

     // Return matching services
     return services.filter(s => featuresWithPoints.includes(s.id));
   }
   ```

3. **Result:**
   - Returns all services whose polygons contain the search point
   - Services are deduplicated (if a service has multiple polygons, it only appears once)

### 5. GraphQL API

**Main Queries:**

- `search(query: String!)` - Unified search (postcode, outcode, or place name)
- `servicesForPostcode(postcode: String!)` - Legacy postcode search
- `servicesForCoords(lat: Float!, lng: Float!)` - Coordinate-based search
- `servicesForPlace(placeName: String!)` - Place name search
- `servicesForOutcode(outcode: String!)` - Outcode search

All of these ultimately call `getServicesFromPoint()` with coordinates.

## Data Flow Diagram

```
User Input (Postcode/Place/Coords)
         ↓
   GraphQL Query
         ↓
   Location Resolution (postcodes.io API)
         ↓
   Get Coordinates (lat/lng)
         ↓
   Load GeoJSON Files
         ↓
   Point-in-Polygon Check (Turf.js)
         ↓
   Find Matching Services
         ↓
   Return Service Details
```

## Key Concepts

### CCG Codes

- **What they are:** Administrative boundary identifiers
- **Why they matter:** They define which geographic area a service covers
- **Problem:** If a service has no CCG codes, or codes that don't exist in boundary files, the service won't appear in searches

### GeoJSON Files

- **What they are:** Geographic data files containing polygon shapes
- **How they're created:** Generated from boundary files using CCG codes
- **Why they're needed:** Fast point-in-polygon checks (much faster than checking boundaries on-the-fly)

### Boundary Priority

The system checks boundaries in a specific order:

1. Most specific (London Boroughs, ICBs)
2. Country-level (Scotland Health Boards, Wales postcodes)
3. Historical CCG codes (newest to oldest)
4. Fallback (Counties)

This ensures services are matched to the most accurate boundary available.

## Common Issues

### 1. Service Missing from Search

**Cause:** Service has no CCG codes, or CCG codes don't exist in boundary files
**Solution:** Add correct CCG/ICB/Health Board codes to the service

### 2. Service Postcode Not in Polygon

**Cause:** CCG code creates a polygon that doesn't include the service's actual location
**Possible reasons:**

- Wrong CCG code
- Service located outside its CCG boundary
- Missing additional CCG codes
- Outdated boundary files

**Solution:** Verify CCG codes, add additional codes if service covers multiple areas

### 3. Service Appears for Wrong Areas

**Cause:** Incorrect CCG codes assigned to service
**Solution:** Verify and correct CCG codes

## Maintenance

### Adding a New Service

1. Add service to `data/services.json` with correct `ccgCodes`
2. Run `node scripts/create-geo-json.js` to regenerate GeoJSON files
3. Verify service appears in searches

### Updating Boundaries

1. Update boundary files in `archive/` folder
2. Update priority order in `create-geo-json.js` if needed
3. Regenerate GeoJSON files

### Fixing Coverage Issues

1. Identify services with coverage problems
2. Verify CCG codes are correct
3. Add missing CCG codes if service covers multiple areas
4. Regenerate GeoJSON files
5. Test that postcodes are within polygons

## Technical Stack

- **GraphQL:** Apollo Server
- **Geographic Processing:** Turf.js (point-in-polygon, polygon simplification)
- **Postcode API:** postcodes.io (UK postcode lookup)
- **GeoJSON Processing:** mapshaper (polygon dissolution)
- **Data Format:** GeoJSON for geographic data, JSON for service data
