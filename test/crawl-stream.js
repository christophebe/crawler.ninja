var assert    = require("assert");
var _         = require("underscore");
var memstat   = require("../plugins/stat-plugin.js");
var logger    = require("../plugins/log-plugin.js");

var testSite  = require("./website/start.js").site;

var crawler = require("../index.js");



describe('Streams', function() {

        it('should crawl a video without extension', function(done) {
            var end = function(){
                
                assert(stat.data.numberOfUrls === 1, "Incorrect number of crawled urls : " + stat.data.numberOfUrls);
                //assert(stat.data.contentTypes['text/html; charset=UTF-8'] === 2);
                assert(stat.data.numberOfHTMLs === 0, "Incorrect number of crawled HTML pages : " + stat.data.numberOfHTMLs);
                //c.removeAllListeners(["crawl"]);
                done();

            };

            crawler.init(null, end);
            var stat = new memstat.Plugin();
            crawler.registerPlugin(stat);
            crawler.queue({url : "http://localhost:9999/video"});

        });

        it('should crawl a buffer', function(done) {

            var end = function(){

                assert(stat.data.numberOfUrls === 1, "Incorrect number of crawled urls : " + stat.data.numberOfUrls);
                //assert(stat.data.contentTypes['text/html; charset=UTF-8'] === 2);
                assert(stat.data.numberOfHTMLs === 0, "Incorrect number of crawled HTML pages : " + stat.data.numberOfHTMLs);
                //c.removeAllListeners(["crawl"]);
                done();

            };

            crawler.init(null, end);
            var stat = new memstat.Plugin();
            crawler.registerPlugin(stat);
            crawler.queue({url : "http://localhost:9999/buffer"});

        });


});
