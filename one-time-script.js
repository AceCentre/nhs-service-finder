const path = require("path");
const fs = require("fs");

const CCG_FOLDER = path.join(__dirname, "./content/ccg");
const OUTPUT_PATH = path.join(__dirname, "./data.json");

// The variable saved to the raw file
let data = {};

if (fs.existsSync(OUTPUT_PATH)) {
  fs.unlinkSync(OUTPUT_PATH);
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
