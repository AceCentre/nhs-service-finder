const topojson = require("topojson-server");
const request = require("request");
const path = require("path");
const fs = require("fs");

let ccg_geodata_url = "https://ons-inspire.esriuk.com/arcgis/rest/services/Health_Boundaries/Clinical_Commissioning_Groups_April_2017_Boundaries_V4/MapServer/3/query?where=1%3D1&outFields=*&outSR=4326&f=geojson";
// let ccg_geodata_url = "https://opendata.arcgis.com/datasets/1bc1e6a77cdd4b3a9a0458b64af1ade4_3.geojson";
// "https://ons-inspire.esriuk.com/arcgis/rest/services/Health_Boundaries/Clinical_Commissioning_Groups_April_2016_Boundaries/MapServer/3/query?where=1%3D1&outFields=*&outSR=4326&f=geojson";
let output_fn = path.resolve(__dirname,  "../../static/data/ccg.topojson");

console.log("downloading..");
request(ccg_geodata_url, (err, res, body) => {
  if (err) {
    throw err;
  } else {
    let topology = topojson.topology({"ccg":JSON.parse(body)});
    fs.writeFileSync(output_fn, JSON.stringify(topology));
    console.log("Saved");
  }
});

