const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const { makeExecutableSchema } = require('graphql-tools');
const { GraphQLDateTime } = require('graphql-iso-date');
const cors = require('cors');
require('isomorphic-fetch');

const api = "https://api.graphql.jobs/";

const typeDefs = `
  type Query {
    getJobs(location: String!): [Job!]
  }

  type Job {
    id: ID!
    title: String!
    cities: [City!]
    countries: [Country!]
    description: String
    applyUrl: String
    company: Company
    userEmail: String
    postedAt: DateTime!
  }

  type City {
    name: String!
  }

  type Country {
    name: String!
  }

  type Company {
    name: String!
    websiteUrl: String!
    logoUrl: String
  }

  scalar DateTime
`;

const resolvers = {
  Query: {
    getJobs: async (parent, { location }) => {
      return await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `
          query {
            locations(input: {value: "${location}"}) {
              name
              type
            }
          }`
        })
      })
      .then(async res => res.json())
      .then(async res => {
        console.log(res.data);
        var isCountry = false, isCity = false;
        var ret = [];
        for (var i = 0; i < res.data.locations.length; i++) {
          var location = res.data.locations[i];
          if (location.type == 'country') {
            isCountry = true;
          } else {
            isCity = true;
          }
          await fetch(api, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: `
              query {
                ${location.type.toLowerCase()}(input: {slug: "${location.name.replace(/\s+/g, '-').toLowerCase()}"}) {
                  jobs {
                    id
                    title
                    cities {
                      name
                    }
                    countries {
                      name
                    }
                    description
                    applyUrl
                    company {
                      name
                      websiteUrl
                      logoUrl
                    }
                    locationNames
                    userEmail
                    postedAt
                  }
                }
              }`
            })
          })
          .then(res => res.json())
          .then(res => {
            var details = [];
            if (isCountry) {
              details = res.data.country.jobs;
            } else {
              details = res.data.city.jobs;
            }
            for (var i = 0; i < details.length; i++) {
              ret.push(details[i]);
            }
          });
        }
        console.log(ret);
        return ret;
      });
    }
  },

  DateTime: GraphQLDateTime
}

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const app = express();

app.use(cors());

app.use('/graphql', graphqlHTTP({
  schema,
  graphiql: true
}));

app.listen(5000, () => {
  console.log("Listening on port 5000");
});
