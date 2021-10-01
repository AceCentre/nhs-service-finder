import "./compat";
import $ from "jquery";
import Foundation from 'foundation-sites';
import {ccg_lookup, ccg_lookup_auto} from "./ccglookup";
import {get_postcode_url_prefix, ccgtopo_path, ccgmap_all_path,
        ccgcode_taxonomy_data_path, ccgtemplate_path} from "./config";

window.$ = $
window.Foundation = Foundation

let ccglookup_extra = {
  get_postcode_url_prefix, ccgtopo_url: ccgtopo_path,
  ccgmap_all_url: ccgmap_all_path, ccgtemplate_url: ccgtemplate_path,
  ccgcode_taxonomy_data_url: ccgcode_taxonomy_data_path,
  item_templates: {}
};

async function ondomready() {
  if (await ccg_lookup_auto(ccglookup_extra)) {
    if (!process.env.IS_PRODUCTION) {
      // autotest
      ccg_lookup("ALL", "#e38000211", ccglookup_extra);
    }
  }
}
document.addEventListener("DOMContentLoaded", ondomready, false);
