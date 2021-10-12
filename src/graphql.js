const { ApolloError } = require("apollo-server-errors");
const { gql } = require("apollo-server-lambda");
const fetch = require("node-fetch");

const { services } = require("../data/services.json");
const { serviceTypes } = require("../data/service-types.json");
const servicesGeo = require("../data/services-geo.json");
const turf = require("@turf/turf");

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
  }

  type ServiceResult {
    services: [Service!]!
    nearbyServices: [Service!]!
  }

  type Query {
    services: [Service!]!
    service(id: String!): Service!
    serviceTypes: [ServiceType!]!
    serviceType(id: String!): ServiceType!

    serviceForGivenCcgList(ccgCodes: [String!]!): [Service]!
    servicesForCoords(lat: Float!, lng: Float!): ServiceResult!
    servicesForPostcode(postcode: String!): ServiceResult!
  }
`;

// This could be optimized and cleaned up
const getServicesFromPoint = (currentPoint) => {
  console.log("Called with", currentPoint);
  let featuresWithPoints = [];
  for (const current of servicesGeo.features) {
    const multiPolygon = turf.multiPolygon(current.geometry.coordinates);
    const ptsWithin = turf.pointsWithinPolygon(currentPoint, multiPolygon);
    if (ptsWithin.features.length > 0) {
      featuresWithPoints.push(current.properties.serviceId);
    }
  }

  const foundServices = featuresWithPoints.map((feature) =>
    services.find((x) => x.id === feature)
  );
  return foundServices;
};

const servicesForGivenCcgList = (ccgCodes) => {
  const servicesForGivenCcgList = services.filter((service) => {
    return ccgCodes
      .map((x) => x.toLowerCase())
      .some((ccgCode) => service.ccgCodes.includes(ccgCode.toLowerCase()));
  });

  return servicesForGivenCcgList;
};

const resolvers = {
  Query: {
    services: () => services,
    service: (_, { id }) => {
      const service = services.find((service) => service.id === id);

      if (!service) {
        throw new ApolloError(`Service with id: '${id}' not found`);
      }

      return service;
    },
    serviceTypes: () => serviceTypes,
    serviceType: (_, { id }) => {
      const serviceType = serviceTypes.find(
        (serviceType) => serviceType.id === id
      );

      if (!serviceType) {
        throw new ApolloError(`ServiceType with id: '${id}' not found`);
      }

      return serviceType;
    },
    serviceForGivenCcgList: (_, { ccgCodes }) => {
      return servicesForGivenCcgList(ccgCodes);
    },
    servicesForCoords: async (_, { lat, lng }) => {
      const currentPoint = turf.point([lng, lat]);

      return {
        services: getServicesFromPoint(currentPoint),
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
        throw new ApolloError(`Failed to get CCGs for your given postcode`);
      }

      if (data.status !== 200) {
        throw new ApolloError(data.error || "Failed to get CCGs");
      }

      if (data.result.length === 0) {
        throw new ApolloError("No postcodes were found for you given postcode");
      }

      const nearestPostcode = data.result[0];
      const currentPoint = turf.point([
        nearestPostcode.longitude,
        nearestPostcode.latitude,
      ]);

      return {
        services: getServicesFromPoint(currentPoint),
        nearbyServices: [],
      };
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
        throw new ApolloError(`Failed to get CCGs for your given postcode`);
      }

      if (data.status !== 200) {
        throw new ApolloError(
          data.error || `Failed to get lat/long for: ${postcode}`
        );
      }

      if (!data.result.latitude || !data.result.longitude) {
        throw new ApolloError(`Failed to get lat/long for: ${postcode}`);
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
