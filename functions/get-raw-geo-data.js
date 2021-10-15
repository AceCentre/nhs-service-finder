const fs = require("fs").promises;
const path = require("path");

let aacServicesGeo = null;
let ecServicesGeo = null;
let wcsServicesGeo = null;

const getServicesGeo = async () => {
  // Return the files if we have already done the work to get them
  if (aacServicesGeo && ecServicesGeo && wcsServicesGeo) {
    return {
      aac: aacServicesGeo,
      ec: ecServicesGeo,
      wcs: wcsServicesGeo,
    };
  }

  const dataFolder = path.join(__dirname, "../data");

  const results = await Promise.all([
    fs.readFile(path.join(dataFolder, "./aac-services-geo.geojson")),
    fs.readFile(path.join(dataFolder, "./ec-services-geo.geojson")),
    fs.readFile(path.join(dataFolder, "./wcs-services-geo.geojson")),
  ]);

  aacServicesGeo = JSON.parse(results[0].toString());
  ecServicesGeo = JSON.parse(results[1].toString());
  wcsServicesGeo = JSON.parse(results[2].toString());

  return {
    aac: aacServicesGeo,
    ec: ecServicesGeo,
    wcs: wcsServicesGeo,
  };
};

exports.handler = async ({ queryStringParameters }, context) => {
  const data = await getServicesGeo();

  if (
    !queryStringParameters ||
    !queryStringParameters.type ||
    !data[queryStringParameters.type.toLowerCase()]
  ) {
    return {
      statusCode: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTION",
      },
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTION",
    },
    body: JSON.stringify(data[queryStringParameters.type.toLowerCase()]),
  };
};
