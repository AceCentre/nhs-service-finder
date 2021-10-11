/**
 * Must be globally installed
 */
const matter = require("gray-matter");

/**
 * Node built-ins
 */
const path = require("path");
const fs = require("fs");

/**
 * File locations
 */
const CCG_FOLDER = path.join(__dirname, "./content/ccg");
const OUTPUT_PATH = path.join(__dirname, "./data/services.json");
const SERVICE_TYPES = path.join(__dirname, "./data/service-types.json");

/**
 *  Services types
 */
const { serviceTypes } = JSON.parse(fs.readFileSync(SERVICE_TYPES).toString());

/**
 *
 * Takes in the file content of a md file then outputs the front matter
 * Simple wrapper around gray-matter to provide a useful error when
 * it fails to parse
 *
 * @param {*} content
 * @param {*} fullPath
 * @returns {*} frontMatter
 */
const parseFrontMatter = (content, fullPath) => {
  try {
    return matter(content);
  } catch (error) {
    console.log("Error whilst parsing", fullPath);
    throw error;
  }
};

/**
 *
 * Takes in raw frontMatter and then returns a service name
 * Returns null if both title and serviceName exists but don't match
 *
 * @param {*} data
 * @returns serviceName
 */
const getServiceName = (data) => {
  const title = data.title;
  const serviceName = data.servicename;

  if (title && !serviceName) {
    return title;
  }

  if (serviceName && !title) {
    return serviceName;
  }

  // We only want the service name if the title and service name is the same
  if (title && serviceName && title === serviceName) {
    return title;
  }

  return null;
};

/**
 * Get the website from the front matter
 * Prioritize the website field but call back to the CM link
 *
 * @param {*} data
 * @returns website
 */
const getWebsite = (data) => {
  if (data.website) {
    return data.website;
  }

  if (data.cm_listing_link) {
    return data.cm_listing_link;
  }

  return null;
};

/**
 * Returns the address as an array of lines
 *
 * @param {*} data
 * @returns addressLines
 */
const getAddressLines = (data) => {
  const rawAddress = data.address;
  if (!rawAddress) return null;

  return multiSplit(rawAddress, ["\t", ",", "   ", "  "]).map((line) =>
    line.trim()
  );
};

/**
 * Split a string with multiple separators
 *
 * @param {*} str
 * @param {*} separators
 * @returns split
 */
const multiSplit = (str, separators) => {
  let current = str;

  for (let separator of separators) {
    current = current.split(separator).join("=");
  }

  return current.split("=");
};

/**
 * Get a list of the services offered, must be valid
 *
 * @param {*} data
 * @returns services
 */
const getServicesOffered = (data) => {
  const services = data.ccgservices;

  if (!services || services.length === 0 || !Array.isArray(services)) {
    return null;
  }

  const validServiceTypeIds = serviceTypes.map((x) => x.id);
  const validCurrentServices = services.filter((value) =>
    validServiceTypeIds.includes(value)
  );

  if (services.length !== validCurrentServices.length) {
    return null;
  }

  return validCurrentServices;
};

const getCcgCodes = (data) => {
  const codes = data.ccgcodes;

  if (!codes || !Array.isArray(codes)) {
    return null;
  }

  return codes.filter((x) => x !== null);
};

const throwIfUnknownField = (data, fullPath) => {
  const knownFields = [
    "title",
    "serviceid",
    "servicename",
    "contactphone",
    "email",
    "website",
    "address",
    "ccgservices",
    "ccgcodes",
    "servicecolor",
    "cm_listing_link",
    "caseload",
    "note",
    "host",
  ];

  for (const key of Object.keys(data)) {
    if (!knownFields.includes(key)) {
      throw new Error(`Unknown field '${key}' found in ${fullPath}`);
    }
  }
};

/**
 * Main function that controls the flow of the script
 */
const main = () => {
  // The variable saved to the raw file
  let data = {};

  // Read all the files in the CCG folder
  const files = fs.readdirSync(CCG_FOLDER);

  // Convert a file path into a service object
  const services = files.map((file) => {
    const fullPath = path.join(CCG_FOLDER, file);
    const content = fs.readFileSync(fullPath).toString();
    const frontMatter = parseFrontMatter(content, fullPath);

    throwIfUnknownField(frontMatter.data, fullPath);

    const serviceName = getServiceName(frontMatter.data);
    const id = frontMatter.data.serviceid.toLowerCase();
    const serviceColor = frontMatter.data.servicecolor || null;
    const communicationMatters = frontMatter.data.cm_listing_link || null;
    const phoneNumber = frontMatter.data.contactphone || null;
    const website = getWebsite(frontMatter.data);
    const addressLines = getAddressLines(frontMatter.data);
    const email = frontMatter.data.email;
    const servicesOffered = getServicesOffered(frontMatter.data);
    const ccgCodes = getCcgCodes(frontMatter.data);
    const caseload = frontMatter.caseload || "All";
    const serviceColour = frontMatter.servicecolor || null;
    const note = frontMatter.note || null;
    const provider = frontMatter.host || null;

    if (
      !serviceName ||
      !id ||
      !phoneNumber ||
      !website ||
      !addressLines ||
      addressLines.length === 0 ||
      !email ||
      !servicesOffered ||
      servicesOffered.length === 0 ||
      !ccgCodes
    ) {
      throw new Error(`Data missing from front matter for file: ${fullPath}`);
    }

    return {
      serviceName,
      id,
      serviceColor,
      communicationMatters,
      phoneNumber,
      website,
      addressLines,
      email,
      servicesOffered,
      ccgCodes,
      caseload,
      serviceColour,
      provider,
      note,
    };
  });

  // Output services
  data["services"] = services;

  if (fs.existsSync(OUTPUT_PATH)) {
    // If the file already exists then we do a shallow merge of the content in the file
    const oldContent = fs.readFileSync(OUTPUT_PATH).toString();
    const oldData = JSON.parse(oldContent);
    const newData = { ...oldData, ...data };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(newData, null, 2));
  } else {
    // Otherwise its a new file so we just write what we have
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  }
};

// Call the main function to start the script
main();
