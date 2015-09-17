/**
 * Basic crawler plugin that can be used to harvest some statistics
 *
 */
var URI = require('URIjs');


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

    var self = this;

    this.crawler.on("crawl", function(result,$) {
          self.crawl(result,$);
    });

    this.crawler.on("uncrawl", function(parentUri, linkUri, anchor, isDoFollow) {
          self.data.numberOfUncrawlUrls++;
    });

    this.crawler.on("error", function(error, uri) {
       self.data.errors.push(error);
    });


}

/**
 * callback function for the event crawl
 *
 */
Plugin.prototype.crawl = function(result, $) {

    this.data.numberOfUrls++;

    var contentType = result.headers[CONTENT_TYPE_HEADER];
    if (contentType) {
      this.addContentType(contentType);
    }


    var uri = URI(result.uri);
    this.addHostname(uri.hostname());

    if ($) {
        this.data.numberOfHTMLs++;
    }


}


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
}


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
}


module.exports.Plugin = Plugin;
