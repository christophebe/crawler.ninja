/**
 *
 *  Memory implementation for a crawl persistence store
 *
 */
var async =  require("async");
var Set   = require("collections/fast-set");
var Map   = require("collections/fast-map");
var URI   = require("crawler-ninja-uri");


var Store = function() {

    // The crawl history
    this.history = new Set();

    // Store the depth for each crawled url
    // Override config.updateDepth function in order to use another storage
    // This default implementation is not recommanded for big crawl
    this.depthUrls = new Map();

    // list of the hosts from which the crawl starts
    this.startFromHosts = new Set();

    // list of the domains from wih the crawl starts
    this.startFromDomains = new Set();

};

/**
 *  Check if an url is in the crawl history (that means already crawled)
 *  and add the url if it is not yet in it
 *
 * @param the url to check
 * @param callback(error, true/false), true means that the uri is in the history
 *
 */
Store.prototype.checkInCrawlHistory = function(url, callback) {
       var inHistory = this.history.has(url);
       if (! inHistory) {
         this.history.add(url);
       }
       callback(null, inHistory);
};


/**
 * Remove an url from the crawl history
 *
 * @param the url to remove
 * @param callback(error)
 */
Store.prototype.removeFromHistory = function(url, callback) {
  this.history.remove(url);
  if (callback) {
      callback();
  }
};

Store.prototype.getDepth = function (url, callback) {
    callback(null, this.depthUrls.get(url));
};

Store.prototype.setDepth = function (url, depth, callback) {
    this.depthUrls.set(url, depth);
    if (callback) {
      callback();
    }
};


Store.prototype.addStartUrls = function(urls, callback) {
    var self = this;
    urls.forEach(function(url){
        self.startFromHosts.add(URI.host(url));
        self.startFromDomains.add(URI.domain(url));
    });

    if (callback) {
      callback();
    }
};


Store.prototype.isStartFromUrl = function(parentUrl, link, callback) {

    callback(null,
        {
          parentUrl : {
            isStartFromHost : this.startFromHosts.has(URI.host(parentUrl)),
            isStartFromDomain : this.startFromDomains.has(URI.domain(parentUrl))
          },
          link : {
            isStartFromHost : this.startFromHosts.has(URI.host(link)),
            isStartFromDomain : this.startFromDomains.has(URI.domain(link))
          }

       }
    );

};


Store.prototype.toString = function() {
    return "Memory Store";
};

module.exports.Store = Store;
