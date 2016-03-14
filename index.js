var timers       = require('timers');
var util         = require("util");
var _            = require("underscore");
var async        = require('async');
var log          = require("crawler-ninja-logger").Logger;
var requestQueue = require("./lib/queue/request-queue.js");
var http         = require("./lib/http/http-request.js");
var URI          = require('crawler-ninja-uri');
var html         = require("./lib/html.js");
var store        = require("./lib/store/store.js");
var plugin       = require("./lib/plugin-manager.js");

var domainBlackList  = require("./default-lists/domain-black-list.js").list();
var suffixBlackList  = require("./default-lists/suffix-black-list.js").list();

var DEFAULT_NUMBER_OF_CONNECTIONS = 5;
var DEFAULT_DEPTH_LIMIT = -1; // no limit
var DEFAULT_TIME_OUT = 20000;
var DEFAULT_RETRIES = 3;
var DEFAULT_RETRY_TIMEOUT = 10000;
var DEFAULT_RETRY_400 = false;
var DEFAULT_SKIP_DUPLICATES = true;
var DEFAULT_RATE_LIMITS = 0;

var DEFAULT_FIRST_EXTERNAL_LINK_ONLY = false;
var DEFAULT_CRAWL_EXTERNAL_DOMAINS = false;
var DEFAULT_CRAWL_EXTERNAL_HOSTS = false;
var DEFAULT_CRAWL_SCRIPTS = true;   // Crawl <script>
var DEFAULT_CRAWL_LINKS = true;     // Crawl <link>
var DEFAULT_CRAWL_IMAGES = true;

var DEFAULT_PROTOCOLS_TO_CRAWL = ["http", "https"];

// The Http request doesn't follow redirect
// in order to catch/log/manage them in some plugins
var DEFAULT_FOLLOW_301 = false;

var DEFAULT_LINKS_TYPES = ["canonical", "stylesheet", "icon"];
var DEFAULT_USER_AGENT = "NinjaBot";
var DEFAULT_CACHE = false;
var DEFAULT_REFERER = false;

var DEFAULT_STORE_MODULE = "./memory-store.js";
var DEFAULT_QUEUE_MODULE = "./async-queue.js";

(function () {


  var globalOptions = {};

  // assign the default updateDepth method used to calculate the crawl depth
  var updateDepthFn = updateDepth;

  var endCallback = null;

  var pm = new plugin.PluginManager();

  /**
   * Init the crawler
   *
   * @param options used to customize the crawler.
   *
   *  The current options attributes are :
   *  - skipDuplicates        : if true skips URLs that were already crawled - default is true
   *  - maxConnections        : the number of connections used to crawl - default is 5
   *  - rateLimits            : number of milliseconds to delay between each requests (Default 0).
   *                            Note that this option will force crawler to use only one connection
   *  - externalDomains       : if true crawl the  external domains. This option can crawl a lot of different linked domains, default = false.
   *  - externalHosts         : if true crawl the others hosts on the same domain, default = false.
   *  - firstExternalLinkOnly : crawl only the first link found for external domains/hosts. externalHosts or externalDomains should be = true
   *  - scripts               : if true crawl script tags
   *  - links                 : if true crawl link tags
   *  - linkTypes             : the type of the links tags to crawl (match to the rel attribute), default : ["canonical", "stylesheet"]
   *  - images                : if true crawl images
   *  - protocols             : list of the protocols to crawl, default = ["http", "https"]
   *  - timeout               : timeout per requests in milliseconds (Default 20000)
   *  - retries               : number of retries if the request fails (default 3)
   *  - retryTimeout          : number of milliseconds to wait before retrying (Default 10000)
   *  - depthLimit            : the depth limit for the crawl
   *  - followRedirect        : if true, the crawl will not return the 301, it will follow directly the redirection
   *  - proxyList             : the list of proxies (see the project simple-proxies on npm)
   *  - storeModuleName       : the npm nodule name used for the store implementation, by default  : memory-store
   *  - storeParams           : the params to pass to the store module when create it.
   *  - queueModuleName       : the npm module name used for the job queue. By default : async-queue
   *  - queueParams           : the params to pass to the job queue when create it.
   *
   *  + all options provided by nodejs request : https://github.com/request/request
   *
   * @param callback() called when all URLs have been crawled
   * @param proxies to used when making http requests (optional)
   * @param logLevel : a new log level (eg. "debug") (optional, default value is info)
   */

  function init(options, callback, proxies, logLevel) {

      if (! callback) {
        log.error("The end callback is not defined");
      }

      // Default options
      globalOptions = createDefaultOptions();

      // Merge default options values & overridden values provided by the arg options
      if (options) {
        _.extend(globalOptions, options);
      }

      // if using rateLimits we want to use only one connection with delay between requests
      if (globalOptions.rateLimits !== 0) {
          globalOptions.maxConnections = 1;
      }

      // create the crawl store
      store.createStore(globalOptions.storeModuleName, globalOptions.storeParams ? globalOptions.storeParams : null);

      // If the options object contains an new implementation of the updateDepth method
      if (globalOptions.updateDepth) {
        updateDepthFn = globalOptions.updateDepth;
      }

      // Init the crawl queue
      endCallback = callback;
      requestQueue.init(globalOptions, crawl, recrawl, endCallback, proxies);

      if (logLevel) {
        console.log("Change Log level into :" + logLevel);
        log.level(logLevel);
      }
      else {
        log.level("info"); // By default debug level is not activated
      }
  }

  /**
   *
   * Set the Crawl Store. See the memory-store.js as an example
   *
   * @param The Store to used
   *
   */
  function setStore(newStore) {
    store.setStore(newStore);

  }

  /**
   * Add one or more urls to crawl
   *
   * @param The url(s) to crawl. This could one of the following possibilities :
   * - A simple String matching to an URL. In this case the default options will be used.
   * - An array of String matching to a list of URLs. In this case the default options will be used.
   * - A Crawl option object containing a URL and a set of options (see the method init to get the list)
   * - An array of crawl options
   *
   */
 function queue(options) {
    if (! endCallback) {
      console.log("The end callback is not defined, impossible to run correctly");
      return;
    }

    // Error if no options
    if (! options){

        crawl({errorCode : "NO_OPTIONS"}, {method:"GET", url : "unknown", proxy : "", error : true},
              function(error){
                  if (requestQueue.idle()) {
                      endCallback();
                  }
              });
        return;
    }


    // if Array => recall this method for each element
    if (_.isArray(options)) {
        options.forEach(function(opt){
            queue(opt);
        });

        return;
    }


    // if String, we expect to receive an url
    if (_.isString(options)) {
      addInQueue(addDefaultOptions({url:options}, globalOptions));
    }
    // Last possibility, this is a json
    else {

      if (! _.has(options, "url") && ! _.has(options, "url")) {

            crawl({errorCode : "NO_URL_OPTION"}, {method:"GET", url : "unknown", proxy : "", error : true},
                  function(error){
                      if (requestQueue.idle()) {
                          endCallback();
                      }
                  });
      }
      else {
        addInQueue(addDefaultOptions(options, globalOptions));
      }
    }

}

/**
 *
 *  Add a new url in the queue
 *
 * @param The url to add (with its crawl option)
 *
 */
function addInQueue(options) {

  //TODO : review this code with async
  http.resolveRedirection(options, function(error, targetUrl){
    store.getStore().addStartUrls([targetUrl, options.url], function(error) {
        requestQueue.queue(options, function(error){
          log.debug({"url" : options.url, "step" : "addInQueue", "message" : "Url correctly added in the queue"});
          if (requestQueue.idle()){
            endCallback();
          }
        });
    });
  });


}

/**
 *  Add the default crawler options into the option used for the current request
 *
 *
 * @param the option used for the current request
 * @param The default options
 * @return the modified option object
 */
 function addDefaultOptions(options, defaultOptions) {

    _.defaults(options, defaultOptions);
    options.currentRetries = 0;
    return options;

}

/**
 *  Make a copy of an option object for a specific url
 *
 *
 * @param the options object to create/copy
 * @param the url to apply into the new option object
 * @return the new options object
 */
 function buildNewOptions (options, newUrl) {

    var o = createDefaultOptions(newUrl);

    // Copy only options attributes that are in the options used for the previous request
    // Could be more simple ? ;-)
    o =  _.extend(o, _.pick(options, _.without(_.keys(o), "url")));
    o.depthLimit = options.depthLimit;
    o.currentRetries = 0;

    if (options.canCrawl) {
      o.canCrawl = options.canCrawl;
    }

    return o;

 }


/**
 * Create the default crawl options
 *
 * @returns the default crawl options
 */
function createDefaultOptions(url) {

  var options = {
      referer                 : DEFAULT_REFERER,
      skipDuplicates          : DEFAULT_SKIP_DUPLICATES,
      maxConnections          : DEFAULT_NUMBER_OF_CONNECTIONS,
      rateLimits              : DEFAULT_RATE_LIMITS,
      externalDomains         : DEFAULT_CRAWL_EXTERNAL_DOMAINS,
      externalHosts           : DEFAULT_CRAWL_EXTERNAL_HOSTS,
      firstExternalLinkOnly   : DEFAULT_FIRST_EXTERNAL_LINK_ONLY,
      scripts                 : DEFAULT_CRAWL_SCRIPTS,
      links                   : DEFAULT_CRAWL_LINKS,
      linkTypes               : DEFAULT_LINKS_TYPES,
      images                  : DEFAULT_CRAWL_IMAGES,
      protocols               : DEFAULT_PROTOCOLS_TO_CRAWL,
      timeout                 : DEFAULT_TIME_OUT,
      retries                 : DEFAULT_RETRIES,
      retryTimeout            : DEFAULT_RETRY_TIMEOUT,
      depthLimit              : DEFAULT_DEPTH_LIMIT,
      followRedirect          : DEFAULT_FOLLOW_301,
      userAgent               : DEFAULT_USER_AGENT,
      domainBlackList         : domainBlackList,
      suffixBlackList         : suffixBlackList,
      retry400                : DEFAULT_RETRY_400,
      isExternal              : false,
      storeModuleName         : DEFAULT_STORE_MODULE,
      queueModuleName         : DEFAULT_QUEUE_MODULE

  };

  if (url) {
    options.url = url;
  }

  return options;

}

/**
 * Default callback used when the http request queue gets a resource (html, pdf, css, ...) or an error
 *
 * @param the HTTP error (if exist)
 * @param The HTTP result with the crawl options
 * @param callback(error)
 *
 */
function crawl(error, result, callback) {

    // if HTTP error, delegate to the plugins
    if (error) {
        pm.error(error,result, callback);
        return;
    }

    var $ = html.isHTML(result.body) ? html.$(result.body) : null;

    // Analyse the HTTP response in order to check the content (links, images, ...)
    // or apply a redirect
    async.parallel([
      // Call crawl function of the different plugins
      async.apply(pm.crawl.bind(pm), result, $),

      // Check if redirect
      async.apply(applyRedirect, result),

      // Check if HTML
      async.apply(analyzeHTML, result, $),
    ], function(error) {
        result = null;
        callback(error);
    });

}

/**
 *
 * Inform plugin of a recrawl
 *
 */
function recrawl(error, result, callback) {
  pm.recrawl(error,result, callback);
}

/**
 *
 * Manage a redirection response
 *
 * @param the Http response/result with the crawl option
 * @param callback()
 */
function applyRedirect(result, callback) {
  // if 30* & followRedirect = false => chain 30*
  if (result.statusCode >= 300 && result.statusCode <= 399  &&  ! result.followRedirect) {

      var from = result.url;
      var to = URI.linkToURI(from, result.headers.location);

      // Send the redirect info to the plugins &
      // Add the link "to" the request queue
      pm.crawlRedirect(from, to, result.statusCode, function(){
        requestQueue.queue(buildNewOptions(result,to), callback);
      });
  }
  else {
      callback();
  }

}

/**
 * Analyze an HTML page. Mainly, found a.href, links,scripts & images in the page
 *
 * @param The Http response with the crawl option
 * @param the jquery like object for accessing to the HTML tags. Null is the resource
 *        is not an HTML
 * @param callback()
 */
function analyzeHTML(result, $, callback) {

  // if $ is note defined, this is not a HTML page with an http status 200
  if (! $) {
    return callback();
  }

  log.debug({"url" : result.url, "step" : "analyzeHTML", "message" : "Start check HTML code"});

  async.parallel([

    async.apply(crawlHrefs, result, $),
    async.apply(crawlLinks, result, $),
    async.apply(crawlScripts, result, $),
    async.apply(crawlImages, result, $),

  ], callback);

}


/**
 * Crawl urls that match to HTML tags a.href found in one page
 *
 * @param The Http response with the crawl option
 * @param the jquery like object for accessing to the HTML tags.
 * @param callback()
 *
 */
function crawlHrefs(result, $, endCallback) {

    log.debug({"url" : result.url, "step" : "analyzeHTML", "message" : "CrawlHrefs"});
    async.each($('a'), function(a, callback) {
        crawlHref($, result, a, callback);
    }, endCallback);

}

/**
 *  Extract info of ahref & send the info to the plugins
 *
 *
 * @param The HTML body containing the link (Cheerio wraper)
 * @param The http response with the crawl options
 * @param The anchor tag
 * @param callback()
 */
function crawlHref($,result, a, callback) {

      var link = $(a).attr('href');
      var parentUri = result.url;
      if (link) {

        var anchor = $(a).text() ? $(a).text() : "";
        var noFollow = $(a).attr("rel");
        var isDoFollow =  ! (noFollow && noFollow === "nofollow");

        var linkUri = URI.linkToURI(parentUri, link);

        pm.crawlLink(parentUri, linkUri, anchor, isDoFollow, function(){
          addLinkToQueue(result, parentUri, linkUri, anchor, isDoFollow, callback);
        });

      }
      else {
        callback();
      }

}


/**
 * Crawl link tags found in the HTML page
 * eg. : <link rel="stylesheet" href="/css/bootstrap.min.css">
 *
 * @param The HTTP result with the crawl options
 * @param the jquery like object for accessing to the HTML tags.
 * @param callback()
 */
function crawlLinks(result, $, endCallback) {

    if (! result.links){
        return endCallback();
    }

    log.debug({"url" : result.url, "step" : "analyzeHTML", "message" : "CrawlLinks"});

    async.each($('link'), function(linkTag, callback) {
        crawLink($, result, linkTag, callback);
    }, endCallback);
}

/**
 *  Extract info of html link tag & send the info to the plugins
 *
 *
 * @param The HTML body containing the link (Cheerio wraper)
 * @param The http response with the crawl options
 * @param The link tag
 * @param callback()
 */
function crawLink($,result,linkTag, callback) {
      var link = $(linkTag).attr('href');
      var parentUri = result.url;

      if (link) {

          var rel =  $(linkTag).attr('rel');

          if (result.linkTypes.indexOf(rel) > 0) {
              var linkUri = URI.linkToURI(parentUri, link);

              pm.crawlLink(parentUri, linkUri, null, null, function(){
                addLinkToQueue(result, parentUri, linkUri, null, null, callback);
              });
          }
          else {
            callback();
          }
      }
      else {
        callback();
      }
}


/**
 * Crawl script tags found in the HTML page
 *
 * @param The HTTP response with the crawl options
 * @param the jquery like object for accessing to the HTML tags.
 * @param callback()
 */
function crawlScripts(result, $, endCallback) {

    if (! result.scripts) {
      return endCallback();
    }

    log.debug({"url" : result.url, "step" : "analyzeHTML", "message" : "CrawlScripts"});

    async.each($('script'), function(script, callback) {
        crawlScript($, result, script, callback);
    }, endCallback);
}

/**
 *  Extract info of script tag & send the info to the plugins
 *
 *
 * @param The HTML body containing the script tag (Cheerio wraper)
 * @param The http response with the crawl options
 * @param The script tag
 * @param callback()
 */
function crawlScript($,result, script, callback) {

    var link = $(script).attr('src');
    var parentUri = result.url;

    if (link) {
          var linkUri = URI.linkToURI(parentUri, link);
          pm.crawlLink(parentUri, linkUri, null, null, function(){
            addLinkToQueue(result, parentUri, linkUri, null, null, callback);
          });
    }
    else {
      callback();
    }


}


/**
 * Crawl image tags found in the HTML page
 *
 * @param The HTTP response with the crawl options
 * @param the jquery like object for accessing to the HTML tags.
 * @param callback()
 */
function crawlImages(result, $, endCallback) {

    if (! result.images) {
      return endCallback();
    }

    log.debug({"url" : result.url, "step" : "analyzeHTML", "message" : "CrawlImages"});

    async.each($('img'), function(img, callback) {
        crawlImage($, result, img, callback);
    }, endCallback);
}

/**
 *  Extract info of an image tag & send the info to the plugins
 *
 *
 * @param The HTML body containing the link (Cheerio wraper)
 * @param The http response with the crawl options
 * @param The image tag
 * @param callback()
 */
function crawlImage ($,result, img, callback) {
      var parentUri = result.url;

      var link = $(img).attr('src');
      var alt = $(img).attr('alt');
      if (link) {
          var linkUri = URI.linkToURI(parentUri, link);
          pm.crawlImage(parentUri, linkUri, alt, function(){
            addLinkToQueue(result, parentUri, linkUri, null, null, callback);
          });
      }
      else {
        callback();
      }
}

/**
 *  Add a new link to the queue in order to be cralw (based on some conditions)
 *
 * @param the HTTP response with the crawl option
 * @param the url of the page that contains the link
 * @param the link matching to an HTTP resource
 * @param the anchor text of the link
 * @param true if the link is in dofollow
 * @param callback(error)
 */
function addLinkToQueue(result, parentUri, linkUri, anchor, isDoFollow, endCallback) {

    async.waterfall([
        function(callback) {
            updateDepth(parentUri, linkUri, function(error, currentDepth) {
                callback(error,currentDepth);
            });

        },
        function(currentDepth, callback) {
          isAGoodLinkToCrawl(result, currentDepth, parentUri, linkUri, anchor, isDoFollow, function(error, info) {

              if (error) {
                return callback(error);
              }

              if (info.toCrawl && (result.depthLimit === -1 || currentDepth <= result.depthLimit)) {
                  result.isExternal = info.isExternal;
                  requestQueue.queue(buildNewOptions(result,linkUri), callback);

              }
              else {
                log.info({"url" : linkUri, "step" : "addLinkToQueue", "message" : "Don't crawl the url",
                          "options" : {isGoogLink : info.toCrawl, depthLimit : result.depthLimit, currentDepth : currentDepth }});
                pm.unCrawl(parentUri, linkUri, anchor, isDoFollow, callback);
              }

          });

        }
    ], endCallback);
}


/**
 * Check if a link has to be crawled/ can be added into the queue
 *
 * @param the HTTP response with the crawl option
 * @param the current crawl depth
 * @param the url of the page that contains the link
 * @param the link matching to an HTTP resource
 * @param the anchor text of the link
 * @param true if the link is in dofollow
 * @param callback(error)
 */
function isAGoodLinkToCrawl(result, currentDepth, parentUri, link, anchor, isDoFollow, callback) {

  store.getStore().isStartFromUrl(parentUri, link, function(error, startFrom){

        // 1. Check if we need to crawl other hosts
        if (startFrom.link.isStartFromDomain && ! startFrom.link.isStartFromHost && ! result.externalHosts) {
          log.warn({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "Don't crawl url - no external host"});
          return callback(null, {toCrawl : false, isExternal : ! startFrom.link.isStartFromDomain});
        }

        // 2. Check if we need to crawl other domains
        if (! startFrom.link.isStartFromDomain &&  ! result.externalDomains) {

          log.warn({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "Don't crawl url - no external domain"});
          return callback(null, {toCrawl : false, isExternal : ! startFrom.link.isStartFromDomain});
        }

        // 3. Check if we need to crawl only the first pages of external hosts/domains
        if (result.firstExternalLinkOnly &&  ((! startFrom.link.isStartFromHost) || (! startFrom.link.isStartFromDomains))) {
          if (! startFrom.parentUri.isStartFromHost) {
            log.warn({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "Don't crawl url - External link and not the first link)"});
            return callback(null, {toCrawl : false, isExternal : ! startFrom.link.isStartFromDomain});
          }
        }

        // 4. Check if the link is based on a good protocol
        var protocol = URI.protocol(link);
        if (result.protocols.indexOf(protocol) < 0) {
          log.warn({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "Don't crawl url - no valid protocol : " + protocol});
          return callback(null, {toCrawl : false, isExternal : ! startFrom.link.isStartFromDomain});
        }

        // 5. Check if the domain is in the domain black-list
        if (result.domainBlackList.indexOf(URI.domainName(link)) > 0) {
          log.warn({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "Don't crawl url - domain is blacklisted" });
          return callback(null, {toCrawl : false, isExternal : ! startFrom.link.isStartFromDomain});
        }

        // 6. Check if the domain is in the suffix black-list
        var suffix = URI.suffix(link);
        if (result.suffixBlackList.indexOf(suffix) > 0) {
          log.warn({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "Don't crawl url - suffix is blacklisted"});
          return callback(null, {toCrawl : false, isExternal : ! startFrom.link.isStartFromDomain});
        }

        // 7. Check if there is a rule in the crawler options
        if (! result.canCrawl) {
          log.info({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "URL can be crawled"});
          return callback(null, {toCrawl : true, isExternal : ! startFrom.link.isStartFromDomain });
        }
        // TODO : asynch this function ?
        var check =  result.canCrawl(parentUri, link, anchor, isDoFollow);
        log.debug({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "method options.canCrawl has been called and return "} + check);
        return callback(null, {toCrawl : check, isExternal : ! startFrom.link.isStartFromDomain});

  });

}

/**
 *  Register a new plugin
 *
 *
 * @param The plugin
 *
 */
function registerPlugin(plugin) {
    pm.registerPlugin(plugin);
}

/**
 *
 *  Unregister a plugin
 *
 * @param The plugin
 *
 */
function unregisterPlugin(plugin) {
    pm.unregisterPlugin(plugin);
}

/**
 * Compute the crawl depth for a link in function of the crawl depth
 * of the page that contains the link
 *
 * @param The URI of page that contains the link
 * @param The link for which the crawl depth has to be calculated
 * @param callback(error, depth)
 *
 */
function updateDepth(parentUri, linkUri, callback) {

    var depths = {parentUri : parentUri, linkUri : linkUri, parentDepth : 0, linkDepth : 0};
    var execFns = async.seq(getDepths , calcultateDepths , saveDepths);

    execFns(depths, function (error, result) {
      if (error) {
         return callback(error);
      }
      callback(error, result.linkDepth);
    });

}

/**
 * get the crawl depths for a parent & link uri
 *
 *
 * @param a structure containing both url
 *        {parentUri : parentUri, linkUri : linkUri}
 * @param callback(error, depth)
 */
function getDepths(depths, callback) {

    async.parallel([
        async.apply(store.getStore().getDepth.bind(store.getStore()), depths.parentUri),
        async.apply(store.getStore().getDepth.bind(store.getStore()), depths.linkUri)
    ],
    function(error, results){
        if (error) {
          return callback(error);
        }
        depths.parentDepth = results[0];
        depths.linkDepth = results[1];
        callback(null, depths);
    });
}

/**
 * Calculate the depth
 *
 *
 * @param a structure containing both url
 *        {parentUri : parentUri, linkUri : linkUri}
 * @param callback(error, depth)
 */

function calcultateDepths(depths, callback) {
    if (depths.parentDepth) {
        // if a depth of the links doesn't exist : assign the parehtDepth +1
        // if not, this link has been already found in the past => don't update its depth
        if (! depths.linkDepth) {
            depths.linkDepth = depths.parentDepth + 1;
        }
    }
    else {
        depths.parentDepth = 0;
        depths.linkDepth = 1;
    }
    callback(null, depths);
}

/**
 * Save the crawl depths for a parent & link uri
 *
 *
 * @param a structure containing both url
 *        {parentUri : parentUri, linkUri : linkUri}
 * @param callback(error, depth)
 */
function saveDepths(depths, callback) {

  async.parallel([
      async.apply(store.getStore().setDepth.bind(store.getStore()), depths.parentUri, depths.parentDepth ),
      async.apply(store.getStore().setDepth.bind(store.getStore()), depths.linkUri, depths.linkDepth )
  ],
  function(error){
      callback(error, depths);
  });
}

module.exports.init = init;
module.exports.queue = queue;
module.exports.setStore = setStore;
module.exports.registerPlugin = registerPlugin;
module.exports.unregisterPlugin = unregisterPlugin;

}());
