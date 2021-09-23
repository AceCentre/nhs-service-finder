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

exports.handler = (...all) => {
  console.log(JSON.stringify(all, null, 2));
  return server.createHandler()(...all);
};
