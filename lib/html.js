/**
 * Utility functions for managing HTML content
 *
 */

var binary = require('istextorbinary');
var cheerio = require('cheerio');

function $ (result) {
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

}

function analyzeContent(result) {

  if (! result.responseHeaders["content-type"]) {
      result.body = result.body.toString();
      result.isHTML = result.body.match(/^\s*</) !== null;
      return result;
  }

  // Some HTML content can be just text without html tags, don't blame me !
  // We are just trying to crawl also bad sites ;-)
  if (result.responseHeaders["content-type"].indexOf("html")>0) {
      result.body = result.body.toString();
      result.isHTML = result.body.match(/^\s*</) !== null;
      return result;
  }

  // Some octect stream could be an HTML page, don't blame me !
  // We are just trying to crawl also bad sites ;-)
  if (result.responseHeaders["content-type"].indexOf("octet-stream")>0) {

      // Check if the buffer is not a text
      if (! binary.isTextSync(null, result.body)) {
        result.isHTML = false;
        return result;
      }

      // Check if the text contains html tags
      result.body = result.body.toString();
      result.isHTML = result.body.match(/^\s*</) !== null;
      return result;
  }
  else {
      result.isHTML = false;
      return result;
  }

}


module.exports.$ = $;
