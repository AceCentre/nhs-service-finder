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
