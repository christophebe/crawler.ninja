var assert      = require("assert");
var crawler     = require("../index.js");
var cs          = require("../plugins/console-plugin.js");
var testSite    = require("./website-2/start.js").site;
var proxyLoader = require("simple-proxies/lib/proxyfileloader");
var log         = require("crawler-ninja-logger").Logger;

//var heapdump    = require('heapdump');

log.level("debug");

var proxyListTest = null;

describe.skip('Memory leaks', function() {

        before(function(done) {
          var proxyFile = "./test/proxies-all.txt";

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
                 proxyListTest = proxyList;
                 done();
              }

          });
        });
        it('should crawl a big site without memory leaks', function(done) {
            this.timeout(3000000);
            /*
            setInterval(function(){
              console.log(">>>>> Dump !");
              heapdump.writeSnapshot('./dump/dump' + Date.now() + '.heapsnapshot');
            }, 120000);
            */
            var options = {
              skipDuplicates: true,
              externalDomains: false,
              scripts : false,
              links : false,
              images : false,
              maxConnections : 10
            }
            var consolePlugin = new cs.Plugin();
            //crawler.init(options, done, proxyListTest);
            crawler.init(options, done, null);
            crawler.registerPlugin(consolePlugin);

            //crawler.queue({url : "http://localhost:9991/index.html" });
            crawler.queue({url : "http://www.rtbf.be"});

        });

});
