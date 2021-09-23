const { ApolloServer, gql } = require("apollo-server-lambda");
const { services } = require("../new-data/services.json");
const {
  ApolloServerPluginLandingPageGraphQLPlayground,
} = require("apollo-server-core");

const typeDefs = gql`
  type Service {
    id: String!
  }

  type Query {
    services: [Service]
  }
`;

const resolvers = {
  Query: {
    services: () => services,
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true,
  //   plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
});

// We add this data to every event.
// For some reason 'apollo-server-lambda' needs extra data
// its a hack and might not be correct but it works.
// We merge this with the real event, the real event takes precedence.
const MANUAL_EVENT_PARAMS = { requestContext: true, version: "1.0" };

exports.handler = (event, context) => {
  const newEvent = { ...MANUAL_EVENT_PARAMS, ...event };

  console.log(JSON.stringify(newEvent, null, 2));

  return server.createHandler()(newEvent, context);
};
