const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const { makeExecutableSchema } = require('graphql-tools');
const { GraphQLDateTime } = require('graphql-iso-date');
const cors = require('cors');
const Diacritics = require('diacritic');
require('isomorphic-fetch');

const api = "https://api.graphql.jobs/";

const typeDefs = `
  type Query {
    getJobs(location: String!): [Job!]
  }

  type Job {
    id: ID!
    title: String!
    commitment: Commitment!
    cities: [City!]
    countries: [Country!]
    description: String
    applyUrl: String
    company: Company
    isFeatured: Boolean
    userEmail: String
    postedAt: DateTime!
  }

  type Commitment {
    title: String!
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
          var ret = new Map();
          for (var i = 0; i < res.data.locations.length; i++) {
            var location = res.data.locations[i];
            if (location.type == 'country') {
              isCountry = true;
            } else {
              isCity = true;
            }
            var normalised = Diacritics.clean(location.name.replace(/\s+/g, '-')).toLowerCase();
            console.log(normalised);
            if (normalised == "remote") {
              continue;
            }
            await fetch(api, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: `
              query {
                ${location.type}(input: {slug: "${normalised}"}) {
                  jobs {
                    id
                    title
                    commitment {
                      title
                    }
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
                    isFeatured
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
                  if (res.data.city == null)
                    console.log("city is null");
                  details = res.data.city.jobs;
                }
                for (var i = 0; i < details.length; i++) {
                  ret.set(details[i].id, details[i]);
                  console.log(details[i].id);
                }
              });
          }
          return Array.from(ret.values());
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
