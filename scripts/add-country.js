const { services } = require("../data/services.json");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const axios = require("axios").default;

(async () => {
  let countries = new Set();

  let newServices = [];

  let index = 0;
  for (const service of services) {
    index++;
    const { data } = await axios.get(
      `http://api.postcodes.io/postcodes/${service.postcode}`
    );

    countries.add(data.result.country);

    console.log(`${index}/${services.length}`);

    newServices.push({ ...service, country: data.result.country });
  }

  console.log(countries);

  const servicePath = path.join(__dirname, "../data/services.json");

  fs.writeFileSync(
    servicePath,
    JSON.stringify({ services: newServices }, null, 2)
  );

  execSync(`npx prettier ${servicePath} --write`);
})();
