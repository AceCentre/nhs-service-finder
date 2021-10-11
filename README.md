# Service Finder [![Netlify Status](https://api.netlify.com/api/v1/badges/fd6cb4cc-b92a-44a2-91af-d6b58c37f63d/deploy-status)](https://app.netlify.com/sites/nhs-service-finder/deploys)

This is a repo which contains the data of NHS Specialist Services around the UK - and the regions they cover. The main focus is for indivdiuals (clients/patients) looking for which service supports them in their postcoded area.

This repo does not contain a UI for end users. However, you can explore the data using the UI on the [Ace Centre website, available here.](https://acecentre.org.uk/nhs-service-finder)

## Using the data

You can view the raw data in the [data](./data) folder of this repo. You are free to use this data to support whatever you want to build.

The data is also exposed on a GraphQL API so that it can be accessed and explored. The API is hosted on [netlify and can be accessed here](https://servicefinder.acecentre.net/graphql). You can view the schema using the GraphQL playground available at the same location. [You can learn more about GraphQL here.](https://graphql.org/learn/)

We ask that if you are going to use this data you make sure to continue to use the latest version of the data at all times so that you are not spreading old data.

We also ask that if you are going to deploy a large scale application using the APIs available that you open an issue before you do so that we can make sure our APIs are ready to handle the load.

## Development

You can run a local version of the graphql server for development. Here are the steps to run the server

1. Install npm deps: `npm install`
2. Run the dev server: `npm run dev`

## Deployment

The GraphQL server is deployed to Netlify. There are no build steps before deployment. The `functions` folder become serverless functions.

We have a few redirects in place so that if you access the root of the domain you are redirect to the Ace Centre service finder UI.

# FAQs

## Data in this dataset is incorrect

We try our best to keep it up to date but its hard when there is so many services. Open a an issue or a PR and we will update the information as best as possible

## What is a CCG?

Clinical Commissioning Groups (CCGs) commission most of the hospital and community NHS services in the local areas for which they are responsible.

Commissioning involves deciding what services are needed for diverse local populations, and ensuring that they are provided.

CCGs are assured by NHS England, which retains responsibility for commissioning primary care services such as GP and dental services, as well as some specialised hospital services. Many GP services are now co-commissioned with CCGs.

All GP practices now belong to a CCG, but CCGs also include other health professionals, such as nurses.

Services CCGs commission include:

- most planned hospital care
- rehabilitative care
- urgent and emergency care (including out-of-hours)
- most community health services
- mental health and learning disability services.

[Description taken from NHS England](https://www.england.nhs.uk/ccgs/)

## Where is the data from?

The data is taken from a few sources originally (with permission). It has since gone further than all of these sources and includes multiple services types. Most of the data is taken from Googling services and viewing the data on their website, or we have contacts at the given service.

Sources:

- [arcgis](https://hub.arcgis.com/datasets/ons::clinical-commissioning-groups-april-2019-names-and-codes-in-england)
