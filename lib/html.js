/**
 * Utility functions for managing HTML content
 *
 */
var cheerio     = require('cheerio');

function analyzeContent(result) {

  if (! result.responseHeaders["content-type"]) {
    result.body = result.body.toString();
    result.isHTML = result.body.match(/^\s*</) !== null;
    return result;
  }

  if (result.responseHeaders["content-type"].indexOf("html")>0  || result.responseHeaders["content-type"].indexOf("octet-stream")>0) {

    result.body = result.body.toString();
    result.isHTML = result.body.match(/^\s*</) !== null;
    return result;
  }
  else {
    result.isHTML = false;
    return result;
  }

}


module.exports.$ = function (result) {
    result = analyzeContent(result);

    if (! result.isHTML) {
      return null;
    }

    var options = {
          normalizeWhitespace: false,
          xmlMode: false,
          decodeEntities: true
    };
    return cheerio.load(result.body, options);

};
