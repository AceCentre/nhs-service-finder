const { services } = require("../data/services.json");
const fs = require("fs");
const path = require("path");
const turf = require("@turf/turf");
const { execSync } = require("child_process");
const { uniq } = require("lodash");

const geojsonhint = require("@mapbox/geojsonhint");

const writeGeoJsonForServices = (currentServiceList, outputName) => {
  let features = [];

  const ICBs = require("../archive/ICBs-2023.json");

  const NorthernIreland = require("../archive/northern-ireland.json");
  const AllWales = require("../archive/all-wales.json");

  const Counties = require("../archive/Counties_(December_2020)_EN_BGC.json");

  const CcgEngland21 = require("../archive/Clinical_Commissioning_Groups_(April_2021)_EN_BUC.json");
  const CcgEngland20 = require("../archive/Clinical_Commissioning_Groups_(April_2020)_EN_BFC_V2.json");
  const CcgEngland19 = require("../archive/Clinical_Commissioning_Groups__April_2019__Boundaries_EN_BUC.json");
  const CcgEngland17 = require("../archive/Clinical_Commissioning_Groups_(April_2017)_Boundaries_(Version_4).json");
  const CcgEngland16 = require("../archive/Clinical_Commissioning_Groups_(April_2016)_Boundaries.json");
  const CcgEngland15 = require("../archive/Clinical_Commissioning_Groups_(July_2015)_Boundaries.json");

  const PostcodeCH = require("../archive/welsh-postcodes/CH.json");
  const PostcodeLD = require("../archive/welsh-postcodes/LD.json");
  const PostcodeLL = require("../archive/welsh-postcodes/LL.json");
  const PostcodeSY = require("../archive/welsh-postcodes/SY.json");
  const PostcodeCF = require("../archive/welsh-postcodes/CF.json");
  const PostcodeHR = require("../archive/welsh-postcodes/HR.json");
  const PostcodeSA = require("../archive/welsh-postcodes/SA.json");
  const PostcodeNP = require("../archive/welsh-postcodes/NP.json");

  const Scotland = require("../archive/health-boards-small.json");

  const LondonBoroughs = require("../archive/Upper_Tier_Local_Authorities_December_2022_Boundaries_UK_BFC_-582766102348601148.json");

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

      for (const currentSource of PRIORITY_ORDER_GEOJSON) {
        if (!featureForCcg) {
          featureForCcg = currentSource.map.features.find((x) => {
            return (
              x.properties[currentSource.key].toLowerCase() ===
              currentCcg.toLowerCase()
            );
          });
        }
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
