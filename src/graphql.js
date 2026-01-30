const { GraphQLError } = require("graphql");
const { gql } = require("graphql-tag");
const fetch = require("node-fetch");
const fs = require("fs").promises;
const path = require("path");
const turf = require("@turf/turf");
const { uniqBy } = require("lodash");

const { services } = require("../data/services.json");
const { serviceTypes } = require("../data/service-types.json");

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

const typeDefs = gql`
  type ServiceType {
    id: String!
    title: String!
    description: String!
    services: [Service!]!
  }

  type Coordinates {
    latitude: Float!
    longitude: Float!
  }

  type Service {
    id: String!
    serviceName: String!
    phoneNumber: String!
    website: String!
    addressLines: [String!]!
    email: String!
    ccgCodes: [String!]!
    caseload: String!
    postcode: String!
    provider: String
    note: String
    serviceColor: String
    communicationMatters: String
    servicesOffered: [ServiceType]!
    coordinates: Coordinates!
    additionalContactEmail: String
    additionalContactName: String
    servicesProvidedDescription: String
    scale: String
    populationServed: String
    areaCoveredText: String
    staffing: String
    referralProcess: String
    fundedBy: String
    permanentOrProject: String
    yearSetUp: String
    country: CountryEnum!
  }

  type ServiceResult {
    services: [Service!]!
    nearbyServices: [Service!]!
  }

  "Describes how the location was resolved from the user's search input"
  enum LocationTypeEnum {
    POSTCODE
    OUTCODE
    PLACE
  }

  "Result from a unified location search"
  type LocationSearchResult {
    services: [Service!]!
    nearbyServices: [Service!]!
    "The type of location that was matched"
    locationType: LocationTypeEnum!
    "The resolved location name (e.g., 'Manchester', 'SW1A 1AA')"
    resolvedLocation: String!
    "Coordinates of the resolved location"
    coordinates: Coordinates!
  }

  "A place suggestion for autocomplete"
  type PlaceSuggestion {
    name: String!
    county: String
    country: String!
    latitude: Float!
    longitude: Float!
  }

  enum ServiceTypeEnum {
    AAC
    EC
    WCS
  }

  enum CountryEnum {
    Scotland
    England
    NorthernIreland
    Wales
  }

  input FilterInput {
    serviceTypes: [ServiceTypeEnum!]!
    countries: [CountryEnum!]!
  }

  type Query {
    services: [Service!]!
    service(id: String!): Service!
    serviceTypes: [ServiceType!]!
    serviceType(id: String!): ServiceType!

    serviceForGivenCcgList(ccgCodes: [String!]!): [Service]!
    servicesForCoords(lat: Float!, lng: Float!): ServiceResult!
    servicesForPostcode(postcode: String!): ServiceResult!
    servicesFilter(filters: FilterInput!): [Service!]!

    """
    Search for services by place name (city, town, village).
    Example: servicesForPlace(placeName: "Manchester")
    """
    servicesForPlace(placeName: String!): LocationSearchResult!

    """
    Search for services by outcode (first part of postcode).
    Example: servicesForOutcode(outcode: "M1") or servicesForOutcode(outcode: "SW1A")
    """
    servicesForOutcode(outcode: String!): LocationSearchResult!

    """
    Unified search that accepts postcodes, outcodes, or place names.
    Automatically detects the input type and returns appropriate results.
    Example: search(query: "Manchester") or search(query: "M1 1AA") or search(query: "SW1")
    """
    search(query: String!): LocationSearchResult!

    """
    Get place name suggestions for autocomplete.
    Example: placeSuggestions(query: "Manch", limit: 5)
    """
    placeSuggestions(query: String!, limit: Int): [PlaceSuggestion!]!
  }
`;

// This could be optimized and cleaned up
const getServicesFromPoint = async (currentPoint) => {
  if (process.env.NODE_ENV === "development") {
    console.log("Called with", currentPoint);
  }
  let featuresWithPoints = [];

  const { aac, ec, wcs } = await getServicesGeo();

  for (const current of [...aac.features, ...ec.features, ...wcs.features]) {
    if (!current.geometry) {
      continue;
    }

    const currentFeature = turf.feature(current.geometry);
    const ptsWithin = turf.pointsWithinPolygon(currentPoint, currentFeature);

    if (ptsWithin.features.length > 0) {
      featuresWithPoints.push(current.properties.serviceId);
    }
  }

  const foundServices = featuresWithPoints.map((feature) =>
    services.find((x) => x.id === feature)
  );
  return uniqBy(foundServices, "id");
};

const servicesForGivenCcgList = (ccgCodes) => {
  const servicesForGivenCcgList = services.filter((service) => {
    return ccgCodes
      .map((x) => x.toLowerCase())
      .some((ccgCode) => service.ccgCodes.includes(ccgCode.toLowerCase()));
  });

  return servicesForGivenCcgList;
};

// Regex patterns for UK postcodes
const FULL_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/i;
const OUTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?$/i;

/**
 * Normalizes a postcode by removing spaces and converting to uppercase
 */
const normalizePostcode = (input) => {
  return input.replace(/\s+/g, "").toUpperCase();
};

/**
 * Detects whether input looks like a postcode, outcode, or place name
 */
const detectInputType = (input) => {
  const normalized = normalizePostcode(input);

  if (FULL_POSTCODE_REGEX.test(normalized)) {
    return "POSTCODE";
  }

  if (OUTCODE_REGEX.test(normalized)) {
    return "OUTCODE";
  }

  return "PLACE";
};

/**
 * Fetches place data from postcodes.io
 */
const fetchPlace = async (placeName) => {
  const result = await fetch(
    `https://api.postcodes.io/places?q=${encodeURIComponent(placeName)}&limit=1`
  );
  const data = await result.json();

  if (data.status !== 200 || !data.result || data.result.length === 0) {
    throw new GraphQLError(
      `No location found for "${placeName}". Try a UK city, town, or village name.`
    );
  }

  return data.result[0];
};

/**
 * Fetches outcode (partial postcode) data from postcodes.io
 */
const fetchOutcode = async (outcode) => {
  const normalized = normalizePostcode(outcode);
  const result = await fetch(
    `https://api.postcodes.io/outcodes/${encodeURIComponent(normalized)}`
  );
  const data = await result.json();

  if (data.status !== 200 || !data.result) {
    throw new GraphQLError(
      `Invalid outcode "${outcode}". Enter the first part of a UK postcode (e.g., "M1", "SW1A").`
    );
  }

  return data.result;
};

/**
 * Fetches full postcode data from postcodes.io
 */
const fetchPostcode = async (postcode) => {
  const normalized = normalizePostcode(postcode);
  const result = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`
  );
  const data = await result.json();

  if (data.status !== 200 || !data.result) {
    throw new GraphQLError(
      `Invalid postcode "${postcode}". Enter a valid UK postcode (e.g., "SW1A 1AA").`
    );
  }

  return data.result;
};

/**
 * Fetches place suggestions for autocomplete
 */
const fetchPlaceSuggestions = async (query, limit = 5) => {
  const result = await fetch(
    `https://api.postcodes.io/places?q=${encodeURIComponent(
      query
    )}&limit=${limit}`
  );
  const data = await result.json();

  if (data.status !== 200 || !data.result) {
    return [];
  }

  return data.result.map((place) => ({
    name: place.name_1,
    county: place.county_unitary || place.region || null,
    country: place.country || "England",
    latitude: place.latitude,
    longitude: place.longitude,
  }));
};

const resolvers = {
  Query: {
    services: () => services,
    service: (_, { id }) => {
      const service = services.find((service) => service.id === id);

      if (!service) {
        throw new GraphQLError(`Service with id: '${id}' not found`);
      }

      return service;
    },
    serviceTypes: () => serviceTypes,
    serviceType: (_, { id }) => {
      const serviceType = serviceTypes.find(
        (serviceType) => serviceType.id === id
      );

      if (!serviceType) {
        throw new GraphQLError(`ServiceType with id: '${id}' not found`);
      }

      return serviceType;
    },
    serviceForGivenCcgList: (_, { ccgCodes }) => {
      return servicesForGivenCcgList(ccgCodes);
    },
    servicesForCoords: async (_, { lat, lng }) => {
      const currentPoint = turf.point([lng, lat]);

      return {
        services: await getServicesFromPoint(currentPoint),
        nearbyServices: [],
      };
    },
    servicesForPostcode: async (_, { postcode }) => {
      let data;
      try {
        const result = await fetch(
          `https://api.postcodes.io/postcodes/${postcode}/nearest?limit=100&radius=2000`
        );
        data = await result.json();
      } catch (error) {
        throw new GraphQLError(`Failed to get CCGs for your given postcode`);
      }

      if (data.status !== 200) {
        throw new GraphQLError(data.error || "Failed to get CCGs");
      }

      if (data.result.length === 0) {
        throw new GraphQLError(
          "No postcodes were found for you given postcode"
        );
      }

      const nearestPostcode = data.result[0];
      const currentPoint = turf.point([
        nearestPostcode.longitude,
        nearestPostcode.latitude,
      ]);

      return {
        services: await getServicesFromPoint(currentPoint),
        nearbyServices: [],
      };
    },
    servicesFilter: (_, { filters }) => {
      let filteredServices = services.filter((current) => {
        return filters.serviceTypes.some((serviceType) => {
          return current.servicesOffered.includes(serviceType.toLowerCase());
        });
      });

      filteredServices = filteredServices.filter((current) => {
        return filters.countries.includes(current.country.replace(/\s/g, ""));
      });

      return filteredServices;
    },

    servicesForPlace: async (_, { placeName }) => {
      const place = await fetchPlace(placeName);
      const currentPoint = turf.point([place.longitude, place.latitude]);

      return {
        services: await getServicesFromPoint(currentPoint),
        nearbyServices: [],
        locationType: "PLACE",
        resolvedLocation: place.name_1,
        coordinates: {
          latitude: place.latitude,
          longitude: place.longitude,
        },
      };
    },

    servicesForOutcode: async (_, { outcode }) => {
      const outcodeData = await fetchOutcode(outcode);
      const currentPoint = turf.point([
        outcodeData.longitude,
        outcodeData.latitude,
      ]);

      return {
        services: await getServicesFromPoint(currentPoint),
        nearbyServices: [],
        locationType: "OUTCODE",
        resolvedLocation: outcodeData.outcode,
        coordinates: {
          latitude: outcodeData.latitude,
          longitude: outcodeData.longitude,
        },
      };
    },

    search: async (_, { query }) => {
      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        throw new GraphQLError("Please enter a postcode, town, or city name.");
      }

      const inputType = detectInputType(trimmedQuery);

      if (inputType === "POSTCODE") {
        const postcodeData = await fetchPostcode(trimmedQuery);
        const currentPoint = turf.point([
          postcodeData.longitude,
          postcodeData.latitude,
        ]);

        return {
          services: await getServicesFromPoint(currentPoint),
          nearbyServices: [],
          locationType: "POSTCODE",
          resolvedLocation: postcodeData.postcode,
          coordinates: {
            latitude: postcodeData.latitude,
            longitude: postcodeData.longitude,
          },
        };
      }

      if (inputType === "OUTCODE") {
        const outcodeData = await fetchOutcode(trimmedQuery);
        const currentPoint = turf.point([
          outcodeData.longitude,
          outcodeData.latitude,
        ]);

        return {
          services: await getServicesFromPoint(currentPoint),
          nearbyServices: [],
          locationType: "OUTCODE",
          resolvedLocation: outcodeData.outcode,
          coordinates: {
            latitude: outcodeData.latitude,
            longitude: outcodeData.longitude,
          },
        };
      }

      // Default to place search
      const place = await fetchPlace(trimmedQuery);
      const currentPoint = turf.point([place.longitude, place.latitude]);

      return {
        services: await getServicesFromPoint(currentPoint),
        nearbyServices: [],
        locationType: "PLACE",
        resolvedLocation: place.name_1,
        coordinates: {
          latitude: place.latitude,
          longitude: place.longitude,
        },
      };
    },

    placeSuggestions: async (_, { query, limit }) => {
      const trimmedQuery = query.trim();

      if (trimmedQuery.length < 2) {
        return [];
      }

      return fetchPlaceSuggestions(trimmedQuery, limit || 5);
    },
  },
  ServiceType: {
    services: (serviceType) => {
      return services.filter((currentService) => {
        return currentService.servicesOffered.includes(serviceType.id);
      });
    },
  },
  Service: {
    country: (service) => {
      return service.country.replace(/\s/g, "");
    },
    servicesOffered: (service) => {
      const fullServices = service.servicesOffered.map((serviceType) => {
        return serviceTypes.find((current) => current.id === serviceType);
      });

      return fullServices;
    },
    coordinates: async (service) => {
      const postcode = service.postcode;

      let data;

      try {
        const result = await fetch(
          `https://api.postcodes.io/postcodes/${postcode}`
        );
        data = await result.json();
      } catch (error) {
        throw new GraphQLError(`Failed to get CCGs for your given postcode`);
      }

      if (data.status !== 200) {
        throw new GraphQLError(
          data.error || `Failed to get lat/long for: ${postcode}`
        );
      }

      if (!data.result.latitude || !data.result.longitude) {
        throw new GraphQLError(`Failed to get lat/long for: ${postcode}`);
      }

      return {
        latitude: data.result.latitude,
        longitude: data.result.longitude,
      };
    },
  },
};

module.exports = {
  resolvers,
  typeDefs,
};
