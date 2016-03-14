
var request     = require('request');
var zlib        = require('zlib');
var _           = require('underscore');


(function () {
  /**
   * Resolve an HTTP redirection
   *
   * @param the url to check/resolve
   * @param callback (error, the resolved url)
   */
  function resolveRedirection(options, callback) {

      var opts = _.clone(options);
      opts.followRedirect = true;
      request(options, function(error, response) {
          if (error) {
            return callback(null, options.url);
          }

          callback(null, response.url);

      });

  }


  /**
   * Execute the HTTP call, check error, build a response
   * and send back this response/error to the queue requester job
   *
   */
   function get(options, endCallback) {

      if (! options.headers) {
          options.headers = {};
      }

      if (options.userAgent) {
          //console.log("User Agent :" + options.userAgent);
          options.headers['User-Agent'] = options.userAgent;
      }

      if (typeof options.encoding === 'undefined') {
          options.headers['Accept-Encoding'] = 'gzip';
          options.encoding = null;
      }

      if (options.referer) {
          options.headers.Referer = options.referer;
      }

      // For HTTPS requests
      // Some old servers do not support recent TSL version
      //options.secureOptions = require('constants').SSL_OP_NO_TLSv1_2;
      //options.rejectUnauthorized = false;

      var start = new Date();

      //console.log("options get", options);
      request.get(options, function(error,response) {

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

      // Sorry for this hack but that's solve some issues with Cheerio
      result.body = result.body.toString();

      result = _.extend(result, _.omit(options, _.keys(result)));

      options = null;

      endCallback(error, result);
  }

  module.exports.resolveRedirection = resolveRedirection;
  module.exports.get = get;


}());
