const { ApolloError } = require("apollo-server-errors");
const { gql } = require("apollo-server-lambda");

const { services } = require("./new-data/services.json");
const { serviceTypes } = require("./new-data/service-types.json");

const typeDefs = gql`
  type ServiceType {
    id: String!
    title: String!
    services: [Service!]!
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
  }

  type Query {
    services: [Service!]!
    service(id: String!): Service!
    serviceTypes: [ServiceType!]!
    serviceType(id: String!): ServiceType!

    serviceForGivenCcgList(ccgCodes: [String!]!): [Service]!
  }
`;

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
      const servicesForGivenCcgList = services.filter((service) => {
        return ccgCodes.some((ccgCode) => service.ccgCodes.includes(ccgCode));
      });

      return servicesForGivenCcgList;
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
  },
};

module.exports = {
  resolvers,
  typeDefs,
};
