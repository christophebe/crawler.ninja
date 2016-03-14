Crawler Ninja
-------------

This crawler aims to build custom solutions for crawling/scraping sites.
For example, it can help to audit a site, find expired domains, build corpus, scrap texts, find netlinking spots, retrieve site ranking, check if web pages are correctly indexed, ...

This is just a matter of plugins ! :-) We plan to build generic & simple plugins but you are free to create your owns.

The best environment to run Crawler Ninja is a linux server.


Help & Forks welcomed ! or please wait ... work in progress !

How to install
--------------

$ npm install crawler-ninja --save


On MacOs, if you got some issues like "Agreeing to the Xcode/iOS license requires admin privileges, please re-run as root via sudo", run the following command in the terminal :

$ sudo xcodebuild -license

Then accept the license &  rerun :
$ npm install crawler-ninja --save  (sudo is not required, in theory)

Crash course
------------
### How to use an existing plugin ?

```javascript
var crawler = require("crawler-ninja");
var cs      = require("crawler-ninja/plugins/console-plugin");

var options = {
  scripts : false,
  links : false,
  images : false
}

var consolePlugin = new cs.Plugin();
crawler.init(options, function(){console.log("End of the crawl")});
crawler.registerPlugin(consolePlugin);

crawler.queue({url : "http://www.mysite.com"});


```
This script logs on the console all crawled pages thanks to the usage of the console-plugin component.
You can register all plugins you want for each crawl by using the function registerPlugin.

The Crawler calls plugin functions depending on what kind of object is crawling (html pages, css, script, links, redirection, ...).
When the crawl ends, the end callback is called (secong argument of the function init).

You can also reduce the scope of the crawl by using the different crawl options (see below the section :  option references).

## Create a new plugin

The following code show you the functions that your have to implement for creating a new plugin.

This is not mandatory to implement all plugin functions.

```javascript
function Plugin() {


}

/**
 * Function triggers when an Http error occurs for request made by the crawler
 *
 * @param the http error
 * @param the http resource object (contains the url of the resource)
 * @param callback(error)
 */
Plugin.prototype.error = function (error, result, callback) {

}

/**
 * Function triggers when an html resource is crawled
 *
 * @param result : the result of the resource crawl
 * @param the jquery like object for accessing to the HTML tags. Null is the resource
 *        is not an HTML
 * @param callback(error)
 */
Plugin.prototype.crawl = function(result, $, callback) {

}

/**
 * Function triggers when the crawler found a link on a page
 *
 * @param the page url that contains the link
 * @param the link found in the page
 * @param the link anchor text
 * @param true if the link is on follow
 * @param callback(error)
 */
Plugin.prototype.crawlLink = function(page, link, anchor, isDoFollow, callback) {


}

/**
 * Function triggers when the crawler found an image on a page
 *
 * @param the page url that contains the image
 * @param the image link found in the page
 * @param the image alt
 * @param callback(error)
 *
 */
Plugin.prototype.crawlImage = function(page, link, alt, callback) {


}

/**
 * Function triggers when the crawler found an HTTP redirect
 * @param the from url
 * @param the to url
 * @param the redirect code (301, 302, ...)
 * @param callback(error)
 *
 */
Plugin.prototype.crawlRedirect = function(from, to, statusCode, callback) {

}

/**
 * Function triggers when a link is not crawled (depending on the crawler setting)
 *
 * @param the page url that contains the link
 * @param the link found in the page
 * @param the link anchor text
 * @param true if the link is on follow
 * @param callback(error)
 *
 */
Plugin.prototype.unCrawl = function(page, link, anchor, isDoFollow, endCallback) {

}

module.exports.Plugin = Plugin;


```


Option references
-----------------


### The main crawler config options

You can pass change/overide the default crawl options by using the init method.

```javascript

crawler.init({ scripts : false, links : false,images : false, ... }, function(){console.log("End of the crawl")});

```
- skipDuplicates        : if true skips URLs that were already crawled, default is true.
- userAgent             : String, defaults to "NinjaBot"
- maxConnections        : the number of connections used to crawl, default is 5.
- rateLimits            : number of milliseconds to delay between each requests , default = 0.
- externalDomains       : if true crawl external domains. This option can crawl a lot of different linked domains, default = false.
- externalHosts         : if true crawl the others hosts on the same domain, default = false.
- firstExternalLinkOnly : crawl only the first link found for an external domain/host. externalHosts and/or externalDomains should be = true
- scripts               : if true crawl script tags, default = true.
- links                 : if true crawl link tags, default = true.
- linkTypes             : the type of the links tags to crawl (match to the rel attribute), default = ["canonical", "stylesheet", "icon"].
- images                : if true crawl images, default = true.
- depthLimit            : the depth limit for the crawl, default is no limit.
- protocols             : list of the protocols to crawl, default = ["http", "https"].
- timeout               : timeout per requests in milliseconds (Default 20000).
- retries               : number of retries if the request fails (default 3).
- retryTimeout          : number of milliseconds to wait before retrying (Default 10000).
- followRedirect        : if true, the crawl will not return the 301, it will follow directly the redirection, default is false.
- referer               : String, if truthy sets the HTTP referer header
- domainBlackList       : The list of domain names (without tld) to avoid to crawl (an array of String). The default list is in the file : /default-lists/domain-black-list.js
- suffixBlackList       : The list of url suffice to avoid to crawl (an array of String). The default list is in the file : /default-lists/domain-black-list.js
- method                : HTTP method used for crawling, default : GET.


You can also use the [mikeal's request options](https://github.com/mikeal/request#requestoptions-callback) and will be directly passed to the request() method.

You can pass these options to the init() function if you want them to be global or as
items in the queue() calls if you want them to be specific to that item (overwriting global options).



### Add your own crawl rules

If the predefined options are not sufficient, you can customize which kind of links to crawl by implementing a callback function in the crawler config object. This is a nice way to limit the crawl scope in function of your needs. The following options crawls only dofollow links.


```javascript


var options = {

  // add here predefined options you want to override

  /**
   *  this callback is called for each link found in an html page
   *  @param  : the url of the page that contains the link
   *  @param  : the url of the link to check
   *  @param  : the anchor text of the link
   *  @param  : true if the link is dofollow
   *  @return : true if the crawler can crawl the link on this html page
   */
  canCrawl : function(htlmPage, link, anchor, isDoFollow) {
      return isDoFollow;
  }

});


```


Using proxies
-------------

Crawler.ninja can be configured to execute each http request through proxies.
It uses the module [simple-proxies](https://github.com/christophebe/simple-proxies).

You have to install it in your project with the command :

    $ npm install simple-proxies --save


Here is a code sample that uses proxies from a file :

```javascript
var proxyLoader = require("simple-proxies/lib/proxyfileloader");
var crawler     = require("crawler-ninja");

var proxyFile = "proxies.txt";

// Load proxies
var config = proxyLoader.config()
                        .setProxyFile(proxyFile)
                        .setCheckProxies(false)
                        .setRemoveInvalidProxies(false);

proxyLoader.loadProxyFile(config, function(error, proxyList) {
    if (error) {
      console.log(error);

    }
    else {
       crawl(proxyList);
    }

});


function crawl(proxyList){
  var options = {
    skipDuplicates: true,
    externalDomains: false,
    scripts : false,
    links : false,
    images : false,
    maxConnections : 10
  }
  var consolePlugin = new cs.Plugin();
  crawler.init(options, done, proxyList);
  crawler.registerPlugin(consolePlugin);
  crawler.queue({url : "http://www.mysite.com"});
}

```

Using the crawl logger
----------------------

The current crawl logger is based on [Bunyan](https://github.com/trentm/node-bunyan). It logs the all crawl actions & errors in the file "./logs/crawler.log".
You can query the log file after the crawl in order to filter errors or other info (see the Bunyan doc for more informations).

### Change the crawl log level

By default, the logger uses the level INFO. You can change this level within the init function :

```javascript
crawler.init(options, done, proxyList, "debug");
```
The previous code init the crawler with a dedug level. If you don't use proxies, set the proxyList argument to null.


### Use the default logger in your own plugin

You have to install the logger module into your own plugin project :

```
npm install crawler-ninja-logger --save

```
Then, in your own Plugin code :

```javascript

var log = require("crawler-ninja-logger").Logger;

log.info("log info");  // Log into crawler.log
log.debug("log debug"); // Log into crawler.log
log.error("log error"); // Log into crawler.log & errors.log
log.info({statusCode : 200, url: "http://www.google.com" }) // log a json
```

The crawler logs with the following structure

```
log.info({"url" : "url", "step" : "step", "message" : "message", "options" : "options"});
```

### Create a new logger for your plugin

Depending on your needs, you can create additional log files.


```javascript
// Log into crawler.log
var log = require("crawler-ninja-logger");
var myLog = log.createLogger("myLoggerName", {path : "./my-log-file-name.log"}););

myLog.info({url:"http://www.google.com", pageRank : 10});

```

Please, feel free to read the code in log-plugin to get more info on how to log from you own plugin.  

Control the crawl rate
-----------------------
All sites cannot support an intensive crawl. You can specify the crawl rate in the crawler config. The crawler will you are apply the same crawl rate for all requests on all hosts (even for successful requests).

```javascript

var options = {
  rateLimits : 200 //200ms between each request

};
```

Common issues
--------------

### Crawling https sites

With the default crawl options, it is possible to get errors like timeouts on some https sites. This happens with sites that do not support TLS 1.2+ .
You can check the HTTPS infos for you site with : https://www.ssllabs.com/ssltest/

In order to crawl those sites, you have to add the following parameters in the crawl options :

```javascript
var options = {
    secureOptions : require('constants').SSL_OP_NO_TLSv1_2,
    rejectUnauthorized : false
};
```

We will try to integrate this kind of exception in the crawler code for an upcoming release.

The Crawl Store
---------------
<add>doc!</add>


The Crawl Job Queue
-------------------
<add>doc!</add>



Utilities
---------
- See on npm the module "crawler-ninja-uri" that can be used for extracting info and transforming URLs

Current Plugins
---------------
- Console
- Log
- Stat
- Audit

We will certainly create external modules for the upcoming releases.

Rough todolist
--------------

 * Decrease the memory usage & add more optimizations.
 * More & more plugins.
 * Use Redis or Riak as default persistence layer/Crawler Store
 * Multicore architecture and/or micro service architecture for plugins that requires a lot of CPU usage
 * CLI for extracting data from the Crawl DB
 * Build UI : dashboards, view project data, ...


ChangeLog
---------

0.1.0
 - crawler engine that support navigation through a.href, detect images, links tag & scripts.
 - Add flexible parameters to crawl (see the section crawl option above) like the crawl depth, crawl rates, craw external links, ...
 - Implement a basic log plugin & an SEO audit plugin.
 - Unit tests.

0.1.1
 - Add proxy support.
 - Gives the possibility to crawl (or not) the external domains which is different than crawling only the external links. Crawl external links means to check the http status & content of the linked external resources which is different of expand the crawl through the entire external domains.

0.1.2
 - Review Log component.
 - set the default userAgent to NinjaBot.
 - update README.

0.1.3
 - avoid crash for long crawls.

0.1.4
 - code refactoring in order to make a tentative of multicore proccess for making http requests

0.1.5
  - remove the multicore support for making http requests due to the important overhead. Plan to use multicore for some intensive CPU plugins.
  - refactor the rate limit and http request retries in case of errors.

0.1.6
 - Review logger : use winston, different log files : the full crawl, errors and urls. Gives the possibility to create a specific logger for a plugin.

0.1.7
  - Too many issues with winston, use Bunyan for the logs
  - Refactor how to set the urls in the crawl option : simple url, an array of urls or of json option objects.
  - Review the doc aka README
  - Review how to manage the timeouts in function of the site to crawl. If too many timeouts for one domain, the crawler will change the settings in order to decrease request concurrency. If errors persist, the crawler will stop to crawl this domain.
  - Add support for a blacklist of domains.

0.1.8

- Add options to limit the crawl for one host or one entire domain.

0.1.9

- Bug fix : newest Bunyan version doesn't create the log dir.
- Manage more request errors type (with or without retries)
- Add a suffix black list in order to exclude the crawl with a specific suffix (extention) like .pdf,.docx, ...

0.1.10
- Use callbacks instead of events for the plugin management

0.1.11
- Externalize the log mechanism into the module crawler-ninja-logger

0.1.12
- Review black lists (domains & suffixs)
- Review README
- Bug fixs
- Add an empty plugin sample. See the js file : /plugins/empty-plugin.js

0.1.13
- Experiments for a better memory management

0.1.14
- Review the Crawler API
- Better memory management
- code cleanup
- bug fixs

0.1.15
- Set the log to "INFO" by default. The function init can be used to change the log level
- Review README.md

0.1.16
- Externalize URI.js in order to used it into Stores and plugins
- Review log info on error

0.1.17
- Better 301 management on crawl startup
- Bug fixs

0.1.18
- Simplify the options used for the error management (remove some of them)
- Gives the possibility to track a URL recrawl by the plugins
- Bug fix
- Review README.md

0.1.19
- Add in the crawl json param "isExternal". By this way, a plugin can check if the link is external or not.
- Add a new option "retry404" : some sites provide inconsistent response for some urls (status 404 instead of 200). In such case, it should be nice to retry (this issuee needs to be analyzed in more detail).

0.1.20
- Review the default domain blacklist.
- retry40* instead of 404.

0.2.0
- Add support for external Crawler DB/Store like Redis or any kind of Database.
- Build a Redis Store (external module).
- Add support for a more robust request queue. The current implementation is based on async.queue. Now, it is possible to replace this request queue by another one.
- Build a Redis Job Queue (external module).

0.2.1
- minor bug fixs

0.2.2
- minor bug fixs

0.2.3
- minor bug fixs

0.2.4
- Code refactoring : remove the attribute uri. Use only url in the options object & functions.
- Code refactoring : rename parentUri by parentUrl.
- Invalid output in the console plugin : the http method was not correctly displayed.
- Add more info in the README for https sites that do not support TLS 1.2+
