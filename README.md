# Service Finder

This is a repo which hosts the data of NHS Specialist Services around the UK - and the regions they cover. The main focus is for indivdiuals (clients/patients) looking for which service supports them in their postcoded area.

# Accessing the data

The data is exposed on a graphql server so that it can be accessed and explored. The API is self documenting. The API is hosted on [netlify and can be accessed here](https://servicefinder.acecentre.net/graphql).

# Development

You can run a local version of the graphql server for development. Here are the steps to run the server

1. Install npm deps: `npm install`
2. Run the dev server: `npm run dev`

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
