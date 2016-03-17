var crypto = require('crypto');
var Map    = require("collections/fast-map");
var Set    = require("collections/fast-set");
var URI    = require('crawler-ninja-uri');

var CONTENT_TYPE_HEADER = "content-type";
var CONTENT_LENGTH_HEADER = "content-length";

var ERROR_CODE_TIMEOUT = "ETIMEDOUT";
var ERROR_DNS_LOOKUP = "ENOTFOUND";

var STATUS_DNS_LOOKUP_ERROR = "DNS lookup failed";
/**
 * Basic crawler plugin that can be used to make a SEO audit for one site
 * This is just an example that requires some customizations
 *
 *  @param : the crawler engine that will emit events to this plugin
 */
function Plugin() {

    this.name = "Audit-Plugin";
    this.resources = new Map();
    this.duplicateContents = new Map();
    this.inLinks = new Map();
    this.outLinks = new Map();
    this.externalLinks = new Map();
    this.unparsedLinks =  new Set();
    this.images = new Map();
    this.errors = new Set();
    this.redirects = new Map();


}

Plugin.prototype.error = function (error, result, callback) {
        this.errors.add({url : result.url, error : error});
        if (error.code === ERROR_CODE_TIMEOUT) {
          var resourceInfo = this.getresourceInfo(result.url);
          resourceInfo.statusCode = 408;
        }
        if (error.code === ERROR_DNS_LOOKUP) {
          var resourceInfo = this.getresourceInfo(result.url);
          resourceInfo.statusCode = STATUS_DNS_LOOKUP_ERROR;
        }

        callback();
};


/**
 * callback function for the event crawl
 *
 * @param result : the result of the resource crawl
 * @param the jquery like object for accessing to the HTML tags. Null is the resource
 *        is not an HTML
 *
 */
Plugin.prototype.crawl = function(result, $, callback) {

      //http status 2**
      if (result.statusCode >= 200  &&  result.statusCode <= 299 ) {
          this.analyzeResource(result, $);
      }

      //http status 3**
      if (result.statusCode >= 300 && result.statusCode <= 399 ) {

          this.analyzeRedirect(result);
      }

      //http status 4** & 5**
      if (result.statusCode >= 400 && result.statusCode <= 599 ) {

          this.analyzeHttpError(result);
      }

      callback();


};

/**
 * Analyze resources & store the infos into the audit maps
 *
 * @param result : the result of the resource crawl
 * @param the jquery like object for accessing to the HTML tags. Null is the resource
 *        is not an HTML
 */
Plugin.prototype.analyzeResource = function(result, $) {

    var resourceInfo = this.getresourceInfo(result.url);

    resourceInfo.statusCode = result.statusCode;
    resourceInfo.responseTime = result.responseTime;

    resourceInfo.size = result.body.length;
    resourceInfo.contentType = result.responseHeaders["content-type"];

    // last modified & other header attributes
    resourceInfo.responseHeaders = result.responseHeaders;

    // if HTML
    if ($) {
        var titleElement = $("title");
        resourceInfo.title = ! titleElement ? "" :  titleElement.text();
        resourceInfo.titleLen = ! titleElement ? 0 :  resourceInfo.title.length;

        var description = $('meta[name=description]').attr("content");
        resourceInfo.description = ! description ? "" : description;
        resourceInfo.descriptionLen = ! resourceInfo.description ? 0 : resourceInfo.description.length;

        var keywords =  $('meta[name=keywords]').attr("content");
        resourceInfo.keywords = ! keywords ? "" : keywords;
        resourceInfo.keywordsLen = ! resourceInfo.keywords ? 0 : resourceInfo.keywords.length;

        var refresh = $('meta[http-equiv=Refresh]').attr("content");
        resourceInfo.refresh = ! refresh ? "" : refresh;

        var canonicalLink = $('link[rel=canonical]').attr("href");
        resourceInfo.canonicalLink = ! canonicalLink ? "" : canonicalLink;

        resourceInfo.wordCount = this.getNumberOfWords($);

        resourceInfo.h1 = this.getHeaders($, "h1");
        resourceInfo.h2 = this.getHeaders($, "h2");

        // Use hash for detecting duplicate content
        var shasum = crypto.createHash('sha1');
        shasum.update(result.body);
        resourceInfo.hash = shasum.digest('hex');
        this.addHash(result.url,resourceInfo.hash);
    }

    this.resources.set(result.url, resourceInfo);
};

/**
 * Analyze redirect & store info into the audit maps
 *
 * @param result : the result of the resource crawl
 *
 */
Plugin.prototype.analyzeRedirect = function(result) {

    var resourceInfo = this.getresourceInfo(result.url);

    resourceInfo.statusCode = result.statusCode;
    resourceInfo.responseTime = result.responseTime;

    resourceInfo.size = result.body.length;
    resourceInfo.contentType = result.responseHeaders["content-type"];

    // last modified & other header attributes
    resourceInfo.responseHeaders = result.responseHeaders;

    this.resources.set(result.url, resourceInfo);

    addToListMap(this.outLinks, result.url, {page: result.responseHeaders["location"], anchor : 'Redirect', isDoFollow : true});
};



Plugin.prototype.analyzeHttpError = function(result) {

    var resourceInfo = this.getresourceInfo(result.url);

    resourceInfo.statusCode = result.statusCode;
    resourceInfo.responseTime = result.responseTime;

    resourceInfo.responseHeaders = result.responseHeaders;

    this.resources.set(result.url, resourceInfo);

};

/**
 * Callback for the event crawlink. Triggers when the crawler found a link
 * on a page
 *
 * @param the page url that contains the link
 * @param the link found in the page
 * @param the link anchor text
 * @param true if the link is on follow
 * @returns
 */
Plugin.prototype.crawlLink = function(page, link, anchor, isDoFollow, callback) {

    // Outlinks
    addToListMap(this.outLinks, page, {page: link, anchor : anchor, isDoFollow : isDoFollow});

    // Inlinks
    addToListMap(this.inLinks, link, {page: page, anchor : anchor, isDoFollow : isDoFollow});

    // External links
    if (URI.host(page) !== URI.host(link)) {

        addToListMap(this.externalLinks, link, page);
    }

    callback();

};

/**
 * Callback for the event crawimage. Triggers when the crawler found a image
 * on a page
 *
 * @param the page url that contains the link
 * @param the link found in the page
 * @param the link anchor text
 * @param true if the link is on follow
 *
 */
Plugin.prototype.crawlImage = function(page, link, alt, callback) {

    // Outlinks
    addToListMap(this.outLinks, page, {page: link, anchor : alt, isDoFollow : null});

    // Don't add external images
    if (URI.host(page) === URI.host(link)) {
      addToListMap(this.images, link, {page: page, alt : alt});
    }

    callback();

};

/**
 * Add the redirect into a map in order to build the complete redirect chain
 *
 * @param the from url
 * @param the to url
 *
 */
Plugin.prototype.crawlRedirect = function(from, to, statusCode, callback) {
    this.redirects.set(from, {'to': to, 'statusCode' : statusCode});
    callback();
};


/**
 * Get the info for one url from the store (actually a map)
 *
 * @param the page url
 * @returns The page info
 */
Plugin.prototype.getresourceInfo = function(url) {


	if (this.resources.has(url)) {

    return this.resources.get(url);

	}
  else {
    var resourceInfo = {url : url};
    this.resources.set(url, resourceInfo);
    return resourceInfo;

	}

};

/**
 * Add a hex representation of a page in the duplicateContents map
 *
 * @param the page url
 * @param the hex representation
 *
 */
Plugin.prototype.addHash = function(pageUri, hex) {

    addToListMap(this.duplicateContents, hex, pageUri);

};

/**
 * Get the number of words in a page
 *
 * @param the jquery like represention of the page
 * @returns the number of words
 */
Plugin.prototype.getNumberOfWords = function($) {
  	var s = $('body').text();
  	var counter = 0;
  	counter = s.split(' ').length;

  	return counter;

};

/**
 * Find Hn tags in a page
 *
 * @param the jquery like represention of the page
 * @returns an array of Hn tags with their text & len
 */
Plugin.prototype.getHeaders = function($, headerTag) {
	var headers = [];
	$(headerTag).each(function(index,headerTag) {
			var headerText = $(headerTag).text();
			headers.push({"text" : headerText, "len" : headerText.length});

	});

	return headers;
};


/**
 * Generic method to add a new element in list which is indexed in a map
 * So, value of each key is a list
 *
 * @param the map
 * @param the key
 * @param the new value to add to the list (the value) for that key
 *
 */
var addToListMap = function(map, key, value) {

    var list = [];

    if (map.has(key)) {

      list = map.get(key);

      if (!list) {
        list = [];
      }


    }
    list.push(value);
    map.set(key, list);

};


module.exports.Plugin = Plugin;
