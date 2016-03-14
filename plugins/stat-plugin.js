/**
 * Basic crawler plugin that can be used to harvest some statistics
 *
 */
var URI = require('crawler-ninja-uri');


var CONTENT_TYPE_HEADER = "content-type";
var CONTENT_LENGTH_HEADER = "content-length";


function Plugin(crawler) {
    this.crawler = crawler;

    this.data = {
        numberOfUrls : 0,        // could be any kind of content type
        numberOfHTMLs : 0,       // number of html pages
        numberOfUncrawlUrls : 0, // number of uncrawl urls
        hostnames : [],          // number of crawled resources per hostname
        contentTypes : [],       // number of crawled resources per content types
        errors : []              // List of the errors

    };
}

Plugin.prototype.unCrawl = function(parentUri, linkUri, anchor, isDoFollow, callback) {
      this.data.numberOfUncrawlUrls++;
      callback();
};

Plugin.prototype.error = function(error, result, callback) {

       this.data.errors.push(error);
       callback();
};



/**
 * callback function for the event crawl
 *
 */
Plugin.prototype.crawl = function(result, $, callback) {

    this.data.numberOfUrls++;

    var contentType = result.headers[CONTENT_TYPE_HEADER];
    if (contentType) {
      this.addContentType(contentType);
    }

    this.addHostname(URI.host(result.url));

    if ($) {
        this.data.numberOfHTMLs++;
    }

    callback();

};


/**
 * Add stat for the resource content type
 *
 */
Plugin.prototype.addContentType= function (contentType) {
   if (! this.data.contentTypes[contentType]) {
     this.data.contentTypes[contentType] = 1;
   }
   else {
     this.data.contentTypes[contentType]++;
   }
};


/**
 * Add stat for the hostname
 *
 */
Plugin.prototype.addHostname= function (hostname) {
   if (! this.data.hostnames[hostname]) {
     this.data.hostnames[hostname] = 1;
   }
   else {
     this.data.hostnames[hostname]++;
   }
};


module.exports.Plugin = Plugin;
