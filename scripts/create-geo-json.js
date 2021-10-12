const { services } = require("../data/services.json");
const fs = require("fs");
const path = require("path");

const geojsonhint = require("@mapbox/geojsonhint");

const writeGeoJsonForServices = (currentServiceList, outputName) => {
  let features = [];

  const CcgEngland21 = require("../archive/Clinical_Commissioning_Groups_(April_2021)_EN_BUC.json");
  const CcgEngland20 = require("../archive/Clinical_Commissioning_Groups_(April_2020)_EN_BFC_V2.json");
  const CcgEngland19 = require("../archive/Clinical_Commissioning_Groups_(April_2019).json");
  const CcgEngland17 = require("../archive/Clinical_Commissioning_Groups_(April_2017)_Boundaries_(Version_4).json");
  const CcgEngland16 = require("../archive/Clinical_Commissioning_Groups_(April_2016)_Boundaries.json");
  const CcgEngland15 = require("../archive/Clinical_Commissioning_Groups_(July_2015)_Boundaries.json");

  const PRIORITY_ORDER_GEOJSON = [
    { map: CcgEngland21, key: "CCG21CD" },
    { map: CcgEngland20, key: "ccg20cd" },
    { map: CcgEngland19, key: "ccg19cd" },
    { map: CcgEngland17, key: "ccg17cd" },
    { map: CcgEngland16, key: "ccg16cd" },
    { map: CcgEngland15, key: "ccg15cd" },
  ];

  for (const currentService of currentServiceList) {
    let coordinateGroups = [];

    for (const currentCcg of currentService.ccgCodes) {
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
        if (featureForCcg.geometry.type === "MultiPolygon") {
          featureForCcg.geometry.coordinates.forEach((coordinateGroup) => {
            coordinateGroups.push(coordinateGroup);
          });
        } else if ("Polygon") {
          coordinateGroups.push(featureForCcg.geometry.coordinates);
        } else {
          throw new Error("We dont know how to deal with that");
        }
      } else {
        console.log(`Could not find location for ccg, ${currentCcg}`);
        // throw new Error(`Could not find location for ccg, ${currentCcg}`);
      }
    }

    let currentFeature = {
      type: "Feature",
      properties: { serviceId: currentService.id },
      geometry: {
        type: "MultiPolygon",
        coordinates: coordinateGroups,
      },
    };

    features.push(currentFeature);
  }

  const result = { type: "FeatureCollection", features };

  console.log(geojsonhint.hint(JSON.stringify(result, null, 2)));

  fs.writeFileSync(
    path.join(__dirname, "../data/", outputName),
    JSON.stringify(result, null, 2)
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
writeGeoJsonForServices(services, "services-geo.json");
