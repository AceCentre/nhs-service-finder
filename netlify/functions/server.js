// Netlify serverless function wrapper for Express app
const { ApolloServer } = require("@apollo/server");
const { typeDefs, resolvers } = require("../../src/graphql.js");
const { expressMiddleware } = require("@apollo/server/express4");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const serverless = require("serverless-http");

const app = express();
app.use(cors());

// Initialize Apollo Server
let server;
let serverStarted = false;
let handler;

const initServer = async () => {
  if (serverStarted) return handler;

  server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    playground: true,
  });

  await server.start();
  serverStarted = true;

  const graphqlStack = [
    bodyParser.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ token: req.headers.token }),
    }),
  ];

  app.use("/graphql", ...graphqlStack);
  app.use("/.netlify/functions/server/graphql", ...graphqlStack);

  app.get("/", (req, res) => {
    res.redirect("https://acecentre.org.uk/nhs-service-finder");
  });

  const dataPath = path.join(__dirname, "../../data");
  app.use("/data", express.static(dataPath));
  app.use("/raw-data", express.static(dataPath));
  app.use("/archive", express.static(path.join(__dirname, "../../archive")));

  app.get("/map-demo", (req, res) => {
    res.sendFile(path.join(__dirname, "../../index.html"));
  });

  // Create serverless handler
  handler = serverless(app);
  return handler;
};

// Export handler that initializes on first call
module.exports.handler = async (event, context) => {
  const h = await initServer();
  return h(event, context);
};
