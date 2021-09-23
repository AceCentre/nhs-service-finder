const { ApolloServer, gql } = require("apollo-server-lambda");
const { services } = require("../new-data/services.json");
const { serviceTypes } = require("../new-data/service-types.json");

const typeDefs = gql`
  type ServiceType {
    id: String!
    title: String!
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
    provider: String
    note: String
    serviceColor: String
    communicationMatters: String
  }

  type Query {
    services: [Service!]!
    serviceTypes: [ServiceType!]!
  }
`;

const resolvers = {
  Query: {
    services: () => services,
    serviceTypes: () => serviceTypes,
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true,
});

// We add this data to every event.
// For some reason 'apollo-server-lambda' needs extra data
// its a hack and might not be correct but it works.
// We merge this with the real event, the real event takes precedence.
const MANUAL_EVENT_PARAMS = { requestContext: true, version: "1.0" };

exports.handler = (event, context) => {
  const newEvent = { ...MANUAL_EVENT_PARAMS, ...event };

  return server.createHandler()(newEvent, context);
};
