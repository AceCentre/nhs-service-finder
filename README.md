# Service Finder

This is a database of NHS Specialist Services around the UK - and the regions they cover. The main focus is for indivdiuals (clients/patients) looking for which service supports them in their postcoded area. The site also is useful for professionals alike. As well as the postcode look up tool each service has its own detailed page (for example https://servicefinder.acecentre.net/ccg/reces/) with the data existing in just one file (for example https://github.com/AceCentre/nhs-service-finder/blob/master/content/ccg/reces.md). 

Data is also available in different formats;

- Each service type raw JSON data /ccgservices/type/rawdata.json where 'type' is either aac,ec or wcs ([AAC](https://servicefinder.acecentre.net/ccgservices/aac/rawdata.json), [EC](https://servicefinder.acecentre.net/ccgservices/ec/rawdata.json), [WCS](https://servicefinder.acecentre.net/ccgservices/wcs/rawdata.json))
- Each indivdual service as a JSON file /ccg/service-code/rawdata.json where 'service-code' is the unique id of each service (e.g. https://servicefinder.acecentre.net/ccg/nwat/rawdata.json)
- A [topoJson](https://github.com/topojson/topojson#topojson) file: /data/ccg.topojson (here: http://servicefinder.acecentre.net/data/ccg.topojson )
- A JSON file for each CCG code /ccgcodes/ccg-code/rawdata.json where 'ccg-code' is the ccg id (e.g. https://servicefinder.acecentre.net/ccgcodes/e38000001/rawdata.json)
- A JSON file for all ccgs and their services /ccgmap/all/rawdata.json (e.g. https://servicefinder.acecentre.net/ccgmap/all/rawdata.json)

Also note the site has been designed to be able to embeddable into your own website. See this for details: https://servicefinder.acecentre.net/embedexample/

## Development notes

This is a site developed as JAMstack - i.e it is serverless and is purely static. This reduces cost - but also dependency and maintenance issues. Build and hosting is by netlify, but could be anywhere in the future as its not dependent on any specific server stack. 

Note the build routine below. The pain with all this stuff is that CCG boundaries - and CCG's themselves are contantly changing. To try and keep up we regularly look for the latest CCG map data ([this](https://hub.arcgis.com/datasets/ons::clinical-commissioning-groups-april-2019-names-and-codes-in-england) currently) - and we then use the GeoJSON data of that for our building of map data etc. However - this format seems to be constantly changing. 

In the future we should be able to identify gaps in service provision better - and help services manage their own area data better. 

# Requirements

* hugo v0.42.1
* node v10.5.0
* bower v1.8.4

# Installation

```
git clone --recurse-submodules https://github.com/AceCentre/nhs-service-finder.git
cd nhs-service-finder
# set env variables
export IS_PRODUCTION=1
# get geo data converted to topojson
cd res/scripts
npm install
node ./fetch-ccg-geodata.js
# build theme jsbundle and css
cd ../../themes/hugo-acecentre-theme/
npm install
bower install
./node_modules/.bin/gulp build-prod
cd ../../
hugo
```

NB: to build the list of options. Take the spreadsheet (tsv) from arcgis
and then run this regex: 

```find: ^(E[0-9]{8})\t([a-zA-Z\s(),-]+)$
replace: { label: "\1", value: "\2" }, 
```