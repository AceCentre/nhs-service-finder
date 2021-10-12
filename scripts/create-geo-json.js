const { services } = require("../data/services.json");
const fs = require("fs");
const path = require("path");
const ccgGeoData = require("../archive/Clinical_Commissioning_Groups_(April_2019).json");
const olderCcgGeoData = require("../archive/Clinical_Commissioning_Groups_(April_2016)_Boundaries.json");

const geojsonhint = require("@mapbox/geojsonhint");

let features = [];

// Start with only AAC services for simplicity
// const aacServices = services.filter((service) =>
//   service.servicesOffered.includes("aac")
// );

for (const currentService of services) {
  let coordinateGroups = [];

  for (const currentCcg of currentService.ccgCodes) {
    let featureForCcg = ccgGeoData.features.find((x) => {
      return x.properties.ccg19cd.toLowerCase() === currentCcg.toLowerCase();
    });

    // Look in older data if we cant find the answer in newer data
    if (!featureForCcg) {
      olderCcgGeoData.features.find((x) => {
        return x.properties.ccg16cd.toLowerCase() === currentCcg.toLowerCase();
      });
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
  path.join(__dirname, "../data/services-geo.json"),
  JSON.stringify(result, null, 2)
);

// const turf = require("@turf/turf");

// // AceCentre location
// // @53.5166219,-2.1425253
// const currentPoint = turf.point([-2.1425253, 53.5166219]);
// let featuresWithPoints = [];
// for (const current of features) {
//   const multiPolygon = turf.multiPolygon(current.geometry.coordinates);
//   const ptsWithin = turf.pointsWithinPolygon(currentPoint, multiPolygon);
//   if (ptsWithin.features.length > 0) {
//     featuresWithPoints.push(current.properties);
//   }
// }
