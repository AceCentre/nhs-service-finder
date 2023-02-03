const { ApolloServer } = require("@apollo/server");
const { typeDefs, resolvers } = require("./src/graphql.js");
const {
  ApolloServerPluginDrainHttpServer,
} = require("@apollo/server/plugin/drainHttpServer");
const { expressMiddleware } = require("@apollo/server/express4");
const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const httpServer = http.createServer(app);

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  introspection: true,
  playground: true,
});

server.start().then(() => {
  app.use(cors());

  const graphqlStack = [
    bodyParser.json(),
    // expressMiddleware accepts the same arguments:
    // an Apollo Server instance and optional configuration options
    expressMiddleware(server, {
      context: async ({ req }) => ({ token: req.headers.token }),
    }),
  ];
  app.use("/graphql", ...graphqlStack);
  app.use("/.netlify/functions/graphql", ...graphqlStack);

  app.get("/", (req, res) => {
    res.redirect("https://acecentre.org.uk/nhs-service-finder");
  });

  const dataPath = path.join(__dirname, "./data");
  app.use("/data", express.static(dataPath));
  app.use("/raw-data", express.static(dataPath));
  app.use("/archive", express.static(path.join(__dirname, "./archive")));
  app.get("/map-demo", (req, res) => {
    res.sendFile(path.join(__dirname, "/index.html"));
  });

  // Modified server startup
  httpServer.listen({ port: process.env.PORT || 4001 }, (demo) => {
    console.log(`🚀 Server ready on port`, process.env.PORT || 4001);
  });
});
