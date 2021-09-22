import { ApolloServer, gql } from "apollo-server-lambda";
import { services } from "../new-data/services.json";

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
});

exports.handler = server.createHandler();
