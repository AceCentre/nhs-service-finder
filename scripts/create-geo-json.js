const { services } = require("../data/services.json");
const fs = require("fs");
const path = require("path");
const ccgGeoData = require("../archive/Clinical_Commissioning_Groups_(April_2019).json");
const geojsonhint = require("@mapbox/geojsonhint");

let features = [];

// Start with only AAC services for simplicity
// const aacServices = services.filter((service) =>
//   service.servicesOffered.includes("aac")
// );

for (const currentService of services) {
  let coordinateGroups = [];

  for (const currentCcg of currentService.ccgCodes) {
    const featureForCcg = ccgGeoData.features.find((x) => {
      return x.properties.ccg19cd.toLowerCase() === currentCcg.toLowerCase();
    });

    if (featureForCcg) {
      if (featureForCcg.geometry.type === "MultiPolygon") {
        featureForCcg.geometry.coordinates.forEach((coordinateGroup) => {
          coordinateGroups.push(coordinateGroup);
        });
      } else {
        coordinateGroups.push(featureForCcg.geometry.coordinates);
      }
    }
  }

  let currentFeature = {
    type: "Feature",
    properties: currentService,
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
  path.join(__dirname, "../data/services.geojson"),
  JSON.stringify(result, null, 2)
);
