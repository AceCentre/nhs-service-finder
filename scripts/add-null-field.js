const { services } = require("../data/services.json");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const fieldToAdd = process.argv[2];

console.log(`Adding field '${fieldToAdd}'`);

const newServices = services.map((service) => {
  return { ...service, [fieldToAdd]: null };
});

const servicePath = path.join(__dirname, "../data/services.json");

fs.writeFileSync(
  servicePath,
  JSON.stringify({ services: newServices }, null, 2)
);

execSync(`npx prettier ${servicePath} --write`);
