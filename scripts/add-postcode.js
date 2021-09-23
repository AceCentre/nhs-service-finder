const fs = require("fs");
const path = require("path");
const axios = require("axios").default;

const { services } = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../new-data/services.json")).toString()
);

(async () => {
  const newServices = await Promise.all(
    services.map(async (current) => {
      const postcode = current.addressLines[current.addressLines.length - 1];

      const { data } = await axios.get(
        `http://api.postcodes.io/postcodes/${postcode}/validate`
      );

      if (!data.result) {
        throw new Error(`${postcode} is not a valid postcode`);
      }

      return { ...current, postcode };
    })
  );

  fs.writeFileSync(
    path.join(__dirname, "../new-data/updated-services.json"),
    JSON.stringify({ services: newServices }, null, 2)
  );
})();
