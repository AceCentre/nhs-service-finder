const { services } = require("../data/services.json");
const fs = require("fs");
const path = require("path");
const turf = require("@turf/turf");
const { execSync } = require("child_process");
const { uniq } = require("lodash");

const geojsonhint = require("@mapbox/geojsonhint");

const writeGeoJsonForServices = (currentServiceList, outputName) => {
  let features = [];

  // Helper function to safely require files
  const safeRequire = (filePath, defaultValue = null) => {
    try {
      return require(filePath);
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        return defaultValue;
      }
      throw error;
    }
  };

  const ICBs = safeRequire("../archive/ICBs-2023.json", { type: "FeatureCollection", features: [] });

  const NorthernIreland = safeRequire("../archive/northern-ireland.json", { type: "FeatureCollection", features: [] });
  const AllWales = safeRequire("../archive/all-wales.json", { type: "FeatureCollection", features: [] });

  const Counties = safeRequire("../archive/Counties_(December_2020)_EN_BGC.json", { type: "FeatureCollection", features: [] });

  const CcgEngland21 = safeRequire("../archive/Clinical_Commissioning_Groups_(April_2021)_EN_BUC.json", { type: "FeatureCollection", features: [] });
  const CcgEngland20 = safeRequire("../archive/Clinical_Commissioning_Groups_(April_2020)_EN_BFC_V2.json", { type: "FeatureCollection", features: [] });
  const CcgEngland19 = safeRequire("../archive/Clinical_Commissioning_Groups__April_2019__Boundaries_EN_BUC.json", { type: "FeatureCollection", features: [] });
  const CcgEngland17 = safeRequire("../archive/Clinical_Commissioning_Groups_(April_2017)_Boundaries_(Version_4).json", { type: "FeatureCollection", features: [] });
  const CcgEngland16 = safeRequire("../archive/Clinical_Commissioning_Groups_(April_2016)_Boundaries.json", { type: "FeatureCollection", features: [] });
  const CcgEngland15 = safeRequire("../archive/Clinical_Commissioning_Groups_(July_2015)_Boundaries.json", { type: "FeatureCollection", features: [] });

  const PostcodeCH = safeRequire("../archive/welsh-postcodes/CH.json", { type: "FeatureCollection", features: [] });
  const PostcodeLD = safeRequire("../archive/welsh-postcodes/LD.json", { type: "FeatureCollection", features: [] });
  const PostcodeLL = safeRequire("../archive/welsh-postcodes/LL.json", { type: "FeatureCollection", features: [] });
  const PostcodeSY = safeRequire("../archive/welsh-postcodes/SY.json", { type: "FeatureCollection", features: [] });
  const PostcodeCF = safeRequire("../archive/welsh-postcodes/CF.json", { type: "FeatureCollection", features: [] });
  const PostcodeHR = safeRequire("../archive/welsh-postcodes/HR.json", { type: "FeatureCollection", features: [] });
  const PostcodeSA = safeRequire("../archive/welsh-postcodes/SA.json", { type: "FeatureCollection", features: [] });
  const PostcodeNP = safeRequire("../archive/welsh-postcodes/NP.json", { type: "FeatureCollection", features: [] });

  const Scotland = safeRequire("../archive/health-boards-small.json", { type: "FeatureCollection", features: [] });

  const LondonBoroughs = safeRequire("../archive/Upper_Tier_Local_Authorities_December_2022_Boundaries_UK_BFC_-582766102348601148.json", { type: "FeatureCollection", features: [] });

  const PRIORITY_ORDER_GEOJSON = [
    { map: LondonBoroughs, key: "UTLA22NM" },
    { map: ICBs, key: "ICB23CD" },
    { map: NorthernIreland, key: "isNorthernIreland" },
    { map: AllWales, key: "isAllOfWales" },
    { map: Scotland, key: "HBCode" },
    { map: PostcodeCH, key: "name" },
    { map: PostcodeLD, key: "name" },
    { map: PostcodeLL, key: "name" },
    { map: PostcodeSY, key: "name" },
    { map: PostcodeCF, key: "name" },
    { map: PostcodeHR, key: "name" },
    { map: PostcodeSA, key: "name" },
    { map: PostcodeNP, key: "name" },
    { map: CcgEngland21, key: "CCG21CD" },
    { map: CcgEngland20, key: "ccg20cd" },
    { map: CcgEngland19, key: "CCG19CD" },
    { map: CcgEngland17, key: "ccg17cd" },
    { map: CcgEngland16, key: "ccg16cd" },
    { map: CcgEngland15, key: "ccg15cd" },
    { map: Counties, key: "CTY20NM" },
  ];

  for (const currentService of currentServiceList) {
    const uniqueCodes = uniq(currentService.ccgCodes);

    if (uniqueCodes.length !== currentService.ccgCodes.length) {
      const duplicates = currentService.ccgCodes.filter(
        (e, i, a) => a.indexOf(e) !== i
      );

      console.log(`Duplicate in ${currentService.serviceName}: ${duplicates}`);
    }

    for (const currentCcg of uniqueCodes) {
      let featureForCcg = null;

      // Check if this is a Welsh postcode area (CF, NP, SA, LL, LD, SY, CH, HR)
      // If individual postcode files don't exist, fall back to all-wales.json
      const welshPostcodePrefixes = ['CF', 'NP', 'SA', 'LL', 'LD', 'SY', 'CH', 'HR'];
      const isWelshPostcode = welshPostcodePrefixes.some(prefix => 
        currentCcg.toUpperCase().startsWith(prefix)
      );

      for (const currentSource of PRIORITY_ORDER_GEOJSON) {
        if (!featureForCcg) {
          // Skip individual Welsh postcode files if they're empty (not found)
          // and use all-wales.json instead
          if (isWelshPostcode && 
              (currentSource.map === PostcodeCH || 
               currentSource.map === PostcodeLD || 
               currentSource.map === PostcodeLL || 
               currentSource.map === PostcodeSY || 
               currentSource.map === PostcodeCF || 
               currentSource.map === PostcodeHR || 
               currentSource.map === PostcodeSA || 
               currentSource.map === PostcodeNP) &&
              (!currentSource.map.features || currentSource.map.features.length === 0)) {
            // Skip this source, will fall back to all-wales.json
            continue;
          }

          featureForCcg = currentSource.map.features.find((x) => {
            return (
              x.properties[currentSource.key].toLowerCase() ===
              currentCcg.toLowerCase()
            );
          });
        }
      }

      // Check for Wales placeholder code (W99999999) or "all-wales"
      const isWalesPlaceholder = currentCcg.toLowerCase() === 'w99999999' || 
                                  currentCcg.toLowerCase() === 'all-wales';

      // Fallback: If it's a Welsh postcode or Wales placeholder code, use all-wales.json
      if (!featureForCcg && (isWelshPostcode || isWalesPlaceholder) && AllWales.features && AllWales.features.length > 0) {
        // For Welsh postcodes, add ALL health board polygons to cover all of Wales
        // This ensures services like carsglam cover the entire country
        AllWales.features.forEach((walesFeature) => {
          if (walesFeature.geometry) {
            if (walesFeature.geometry.type === "MultiPolygon") {
              walesFeature.geometry.coordinates.forEach((coordinateGroup) => {
                let currentFeature = {
                  type: "Feature",
                  properties: { serviceId: currentService.id },
                  geometry: {
                    type: "Polygon",
                    coordinates: coordinateGroup,
                  },
                };
                features.push(currentFeature);
              });
            } else if (walesFeature.geometry.type === "Polygon") {
              let currentFeature = {
                type: "Feature",
                properties: { serviceId: currentService.id },
                geometry: {
                  type: "Polygon",
                  coordinates: walesFeature.geometry.coordinates,
                },
              };
              features.push(currentFeature);
            }
          }
        });
        // Skip the normal feature processing since we've already added all polygons
        continue;
      }

      if (featureForCcg) {
        if (
          featureForCcg.geometry &&
          featureForCcg.geometry.type === "MultiPolygon"
        ) {
          featureForCcg.geometry.coordinates.forEach((coordinateGroup) => {
            let currentFeature = {
              type: "Feature",
              properties: { serviceId: currentService.id },
              geometry: {
                type: "Polygon",
                coordinates: coordinateGroup,
              },
            };

            features.push(currentFeature);
          });
        } else if (
          featureForCcg.geometry &&
          featureForCcg.geometry.type === "Polygon"
        ) {
          let currentFeature = {
            type: "Feature",
            properties: { serviceId: currentService.id },
            geometry: {
              type: "Polygon",
              coordinates: featureForCcg.geometry.coordinates,
            },
          };

          features.push(currentFeature);
        } else {
          throw new Error(
            `We dont know how to deal with that\n${JSON.stringify(
              featureForCcg,
              null,
              2
            )}`
          );
        }
      } else {
        console.log(
          `Could not find location for ccg, ${currentCcg}, ${currentService.id}`
        );
        // throw new Error(`Could not find location for ccg, ${currentCcg}`);
      }
    }
  }

  const collection = turf.featureCollection(features);
  const simplified = turf.simplify(collection, {
    tolerance: 0.0001,
    highQuality: true,
  });

  const tempFile = path.join(__dirname, "../temp/", outputName);
  const outFile = path.join(__dirname, "../data/", outputName);

  fs.writeFileSync(tempFile, JSON.stringify(simplified, null, 2));

  execSync(
    `mapshaper ${tempFile} -dissolve2 'serviceId' allow-overlaps -o ${outFile}`
  );
};

const aac = services.filter((service) =>
  service.servicesOffered.includes("aac")
);
const ec = services.filter((service) => service.servicesOffered.includes("ec"));
const wcs = services.filter((service) =>
  service.servicesOffered.includes("wcs")
);

writeGeoJsonForServices(aac, "aac-services-geo.geojson");
writeGeoJsonForServices(ec, "ec-services-geo.geojson");
writeGeoJsonForServices(wcs, "wcs-services-geo.geojson");
