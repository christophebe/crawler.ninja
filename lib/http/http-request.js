
var request     = require('request');
var zlib        = require('zlib');
var _           = require('underscore');


(function () {

  /**
   * Execute the HTTP call, check error, build a response
   * and send back this response/error to the queue requester job
   *
   */
   function get(options, endCallback) {

      var reqOptions = initRequestOptions(options);

      var start = new Date();

      //console.log("ops", ops);
      //console.log("options get", options);
      request.get(reqOptions, function(error,response) {

          var end = new Date() - start;
          if (error) {
              return endCallback({code: error.code}, options);
          }

          var result = {};

          result.url = response.request.href;
          result.statusCode = response.statusCode;
          result.responseTime = end;

          // can be usefull to add the proxy into the response to log
          result.proxy = options.proxy;
          result.headers = response.headers;
          result.body = response.body;
          result.method = options.method;

          if (response.headers['content-encoding'] &&
              response.headers['content-encoding'].toLowerCase().indexOf('gzip') >= 0 ) {
              zlib.gunzip(response.body, function (error, body) {
                  if (error) {
                      result = null;
                      return onContent(error, endCallback, options);
                  }

                  result.body = body;

                  onContent(error, endCallback, options,result);
              });
          }
          else {
              onContent(error, endCallback, options,result);
          }

      }).setMaxListeners(0);
  }

  /**
   *
   * Create the options for the http request based on the crawler options
   * Passing the complete crawler options to request doesn't work
   *
   * @param The crawler options
   */
  function initRequestOptions(options) {
      var opts = _.clone(options);
      if (! opts.headers) {
          opts.headers = {};
      }

      if (opts.userAgent) {
          //console.log("User Agent :" + options.userAgent);
          opts.headers['User-Agent'] = opts.userAgent;
      }

      if (typeof opts.encoding === 'undefined') {
          opts.headers['Accept-Encoding'] = 'gzip';
          opts.encoding = null;
      }

      if (opts.referer) {
          opts.headers.Referer = opts.referer;
      }

      opts.method = 'get';

      // For HTTPS requests
      // Some old servers do not support recent TSL version
      //options.secureOptions = require('constants').SSL_OP_NO_TLSv1_2;
      //options.rejectUnauthorized = false;

      var requestArgs = ['uri','url','method','headers','followRedirect', 'followAllRedirects', 'maxRedirects', 'encoding',
                         'pool','timeout','proxy', 'referer', 'strictSSL', 'secureOptions', 'rejectUnauthorized','jar' ];

      opts = _.pick.apply(this,[opts].concat(requestArgs));

      return opts;
  }

  /**
   *
   *  Create a new result/option data based on the response/body
   *
   * @param HTTP error
   * @param the callback
   * @param The crawl option
   * @
   */
  function onContent(error, endCallback, options, result) {

      if (!result) {
          result = {};
      }

      if (!result.body) {
          result.body='';
      }

      // This hack solves some issues with Cheerio
      // TODO : Check if it is still necessary
      result.body = result.body.toString();

      // Add the options used for the previous request in the result
      // By this way, the next request will use the same options
      // TODO : How to avoid this bad manipulation ?
      result = _.extend(result, _.omit(options, _.keys(result)));

      // The header of the response can be used later by the crawler
      result.responseHeaders = result.headers;

      // Remove headers. We will rebuild it for the following request in
      // the function initRequestOptions
      result.headers = null;

      options = null;

      endCallback(error, result);
  }

  module.exports.get = get;


}());
