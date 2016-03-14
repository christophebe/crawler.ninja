/**
 * The Request Queue
 *
 * its main job is to make the http requests & analyze the responses.
 * It is used an internal queue to limit the number of workers
 *
 */
var async       = require('async');
var log         = require("crawler-ninja-logger").Logger;
var URI         = require("crawler-ninja-uri");
var request     = require("../http/http-request.js");
var store       = require("../store/store.js");


(function () {

  var requestQueue = null;
  var proxyList = null;
  var numOfUrl = 0;
  var endUrl = 0;
  var onCrawl = null;
  var onRecrawl = null;

  /**
   * Init the Queue
   *
   * @param The number of tasks/connections that the request queue can run in parallel
   * @param The callback executed when a resource has been crawled
   * @param The callback executed when a resource has been recrawl (probably due to an error)
   * @param The callback executed when all tasks (urls to crawl) are completed
   * @param The proxies to used when making http requests
   *
   */
  function init (options, crawlCallback, recrawlCallback, endCallback, proxies) {

      requestQueue = require(options.queueModuleName);
      requestQueue.init(options, onUrlToCrawl, endCallback);
      onCrawl = crawlCallback;
      onRecrawl = recrawlCallback;

      proxyList = proxies;
  }

  /**
   * Add a new url to crawl in the queue.
   * Check the desired options and add it to the request queue
   *
   * @param the options used to crawl the url
   *
   */
  function queue(options, callback) {


        // if skipDuplicates, don't crawl twice the same url
        if (options.skipDuplicates) {
            store.getStore().checkInCrawlHistory(options.url, function(error, isInCrawlHistory) {

              if (isInCrawlHistory) {
                  log.debug({"url" : options.url, "step" : "queue-resquester.queue", "message" :  "Don't crawl this url - Option skipDuplicates=true & the url has already been crawled" });
                  callback();
              }
              else {

                  //numOfUrl++
                  //console.log("Queue length : " + requestQueue.length() + " - Running : " + requestQueue.running() + " - Total Add :" + numOfUrl + " - Total End : " + endUrl + " url : " + options.url );
                  log.debug({"url" : options.url, "step" : "queue-resquester.queue", "message" : "Add in the request queue"});
                  requestQueue.push(options);
                  callback();

              }

            });

        }
        else {
            //numOfUrl++
            //console.log("Queue length : " + requestQueue.length() + " - Running : " + requestQueue.running() + " - Total Add :" + numOfUrl + " - Total End : " + endUrl + " url : " + options.url );

            log.info({"url" : options.url, "step" : "queue-resquester.queue", "message" : "Add in the request queue"});
            requestQueue.push(options);
            callback();
        }

  }


  /**
   *  @return false if there are some URLs waiting to be crawled or being processed in the queue, or true if not.
   *
   */
  function idle() {
      return requestQueue.idle();
  }

  /*****************************************************************************************
   *
   *      PRIVATES FUNCTIONS
   *
   ******************************************************************************************/

  /**
   * Callback triggered by the queue when a new URl has to be crawl
   *
   *
   * @param The options/url to cral
   * @param callback(error)
   */
  function onUrlToCrawl(options, callback) {

      log.debug({"url" : options.url, "step" : "queue-resquester.onUrlToCrawl", "message" : "Start Crawling"});
      // If the domain is in the blacklist => don't crawl the url
      if (options.domainBlackList.indexOf(URI.domainName(options.url)) > 0) {

          log.error({"url" : options.url, "step" : "queue-resquester.onUrlToCrawl", "message" : "Domain of the url is in the blacklist"});
          onCrawl({code:"DOMAINBLACKLIST"}, options, function(error){
            process.nextTick(function() {callback(error);});
          });
          return;
      }

      crawl(options, callback);

  }


  /**
   * Crawl one url with optionnaly a delay (rate limit)
   *
   *
   * @param the crawl options
   * @param the callback used to inform the queue that request is finished
   */
  function crawl(options, callback) {

          // Case of retries
          if (options.currentRetries > 0) {
            log.error({"url" : options.url, "step" : "queue-resquester.crawl", "message" : "Retry the request with a delay : " + options.retryTimeout});
            setTimeout(function() {
              execHttp(options, callback);
            }, options.retryTimeout);
            return;
          }

          // Case of a ratelimit forcing
          if (options.rateLimits !== 0) {

              log.error({"url" : options.url, "step" : "queue-resquester.crawl", "message" : "Request with option on ratelimit = " + options.rateLimits});
              setTimeout(function() {
                execHttp(options, callback);
              }, options.rateLimits);

          }
          // The usual case without delay
          else {
            execHttp(options, callback);
          }


  }

  /**
   * Execute an http request
   *
   * @param The options to used for the request
   * @param callback executed when the request is finished
   *
   */
  function execHttp(options, callback) {

      if (proxyList) {
        options.proxy  = proxyList.getProxy().getUrl();
      }
      log.debug({"url" : options.url, "step" : "queue-requester.execHttp", "message" : "Execute the request"});
      request.get(options, function(error, result) {
        log.debug({"url" : options.url, "step" : "queue-requester.execHttp", "message" : "Execute the request done"});

        // TODO : review this solution/try to understand the origin of this problem
        // some sites provide inconsistent response for some urls (status 40* instead of 200).
        // In such case, it should be nice to retry (if the option retry400 == true)
        if (result.statusCode && result.statusCode >= 400 && result.statusCode <= 499 && result.retry400) {
           error = new Error("40* Error");
           error.code = result.statusCode;
        }

        if (error) {
          onRequestError(error, result, function(error){
            process.nextTick(function() {callback(error);});
          });
        }
        else {
          onCrawl(null, result, function(error){
            process.nextTick(function() {callback(error);});
          });
        }

      });


  }

  /**
   *  Callback used when a Http request generates an error.
   *  1.Inform plugins (if exists)
   *  2. Retry the same request/URL
   *
   * @param The Http error
   * @param the crawl options
   * @param the HTTP response
   * @param callback()
   */
  function onRequestError(error, result, endCallback) {
      result.currentRetries++;
      async.parallel([
        async.apply(recrawlError, error, result),
        async.apply(retrySameUrl,error, result)
      ],function(error){
          endCallback(error);
      });

  }

  /**
   *  Inform that a recrawl has to be done ()
   *
   * @param The Http error
   * @param the crawl options
   * @param callback()
   */
  function recrawlError(error, options, callback) {

      if (options.currentRetries <= options.retries) {
        onRecrawl(error,options, callback);
      }
      else {
        callback();
      }
  }

  /**
   * Recrawl an url if the maximum of retries is no yet fetched.
   * Otherwise call the callback onCrawl
   *
   * @param the HTTP error
   * @param the crawl options
   * @param callback(error)
   */
  function retrySameUrl(error, options, callback) {

    if (options.currentRetries <= options.retries) {

        log.warn({"url" : options.url, "step" : "queue-requester.recrawlUrl", "message" : "Recrawl -  retries : " + options.currentRetries});
        options.crawlWithDelay = true;

        //TODO : async this code
        // Reinject the same request in the queue
        // 1. Remove it from the crawl history in order to support the option skipDuplicates = true
        store.getStore().removeFromHistory(options.url);
        // 2. Add it again in the queue with the same options
        queue(options, callback);

    }
    else {

      onCrawl(error, options, function(error){
        process.nextTick(function() {callback(error);});
      });
    }


  }

  module.exports.init = init;
  module.exports.queue = queue;
  module.exports.idle = idle;


}());
