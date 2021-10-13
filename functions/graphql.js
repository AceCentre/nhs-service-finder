const { ApolloServer } = require("apollo-server-lambda");
const { typeDefs, resolvers } = require("../src/graphql");

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

  console.log("Event has come in");

  try {
    return server.createHandler({
      expressGetMiddlewareOptions: {
        cors: {
          origin: "*",
          credentials: true,
        },
      },
    })(newEvent, context);
  } catch (e) {
    console.log("An error has occurred");
    console.log(e);
    console.log(JSON.stringify(newEvent, null, 2));
    throw e;
  }
};
