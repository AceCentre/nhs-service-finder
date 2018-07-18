const topojson = require("topojson-server");
const request = require("request");
const path = require("path");
const fs = require("fs");

let ccg_geodata_url = "https://ons-inspire.esriuk.com/arcgis/rest/services/Health_Boundaries/Clinical_Commissioning_Groups_April_2016_Boundaries/MapServer/3/query?where=1%3D1&outFields=*&outSR=4326&f=geojson";
let output_fn = path.resolve(__dirname,  "../../static/data/ccg.topojson");

console.log("downloading..");
request(ccg_geodata_url, (err, res, body) => {
  if (err) {
    throw err;
  } else {
    let topology = topojson.topology(JSON.parse(body));
    fs.writeFileSync(output_fn+".geojson", body);
    fs.writeFileSync(output_fn, JSON.stringify(topology));
    console.log("Saved");
  }
});

