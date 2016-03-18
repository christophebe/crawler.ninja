var assert    = require("assert");
var _         = require("underscore");
var memstat   = require("../plugins/stat-plugin.js");
var logger    = require("../plugins/log-plugin.js");

var testSite  = require("./website/start.js").site;

var crawler = require("../index.js");



describe('Special Characters', function() {

        it('should crawl smoothly and with pleasure pages with special characters', function(done) {
            var end = function(){
                //console.log(stat);
                assert(stat.data.numberOfUrls === 2, "Incorrect number of crawled urls : " + stat.data.numberOfUrls);
                //assert(stat.data.contentTypes['text/html; charset=UTF-8'] === 2);
                assert(stat.data.numberOfHTMLs === 2, "Incorrect number of crawled HTML pages : " + stat.data.numberOfHTMLs);
                //c.removeAllListeners(["crawl"]);
                done();

            };

            crawler.init(null, end);
            var stat = new memstat.Plugin();
            crawler.registerPlugin(stat);
            crawler.queue({url : "http://localhost:9999/special.html"});

        });




});
