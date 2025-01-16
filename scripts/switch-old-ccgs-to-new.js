const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const services = require("../data/services.json");

const getCsvData = (pathToCsv) => {
  return new Promise((res, rej) => {
    let results = [];
    fs.createReadStream(pathToCsv, { encoding: "utf8" })
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => {
        res(results);
      });
  });
};

const pathToCsv = path.join(
  __dirname,
  "../archive/NHS_Area_Team_(2014)_to_NHS_Region_(Geography)_(April_2015)_Lookup_in_England.csv"
);

(async () => {
  const result = await getCsvData(pathToCsv);

  let newServices = [];

  for (const currentService of services.services) {
    const newCodes = [];

    for (const currentCode of currentService.ccgCodes) {
      const replacementCode = result.find((current) => {
        const nhs14Code = getNHS14Code(current);
        return nhs14Code.toLowerCase() === currentCode.toLowerCase();
      });

      if (replacementCode) {
        newCodes.push(replacementCode.NHSRG15CD.toLowerCase());
      } else {
        newCodes.push(currentCode);
      }
    }

    newServices.push({ ...currentService, ccgCodes: newCodes });
  }

  fs.writeFileSync(
    path.join(__dirname, "../data/new-services.json"),
    JSON.stringify({ services: newServices }, null, 2)
  );
})();

const getNHS14Code = (row) => {
  for (const [key, val] of Object.entries(row)) {
    return val;
  }

  throw new Error("We should always find it");
};
