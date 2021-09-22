import { ApolloServer, gql } from "apollo-server-lambda";
import { services } from "../new-data/services.json";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";

const typeDefs = gql`
  type Service {
    id: String!
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
  plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
});

exports.handler = server.createHandler();
