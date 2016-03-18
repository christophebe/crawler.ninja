var assert    = require("assert");
var _         = require("underscore");
var memstat   = require("../plugins/stat-plugin.js");
var logger    = require("../plugins/log-plugin.js");

var testSite  = require("./website/start.js").site;

var crawler = require("../index.js");



describe('Stat Plugin', function() {

        it('should return only one page stat', function(done) {
            var end = function(){

                assert(stat.data.numberOfUrls === 1, "Incorrect number of crawled urls : " + stat.data.numberOfUrls);
                assert(stat.data.contentTypes['text/html; charset=UTF-8'] === 1);
                assert(stat.data.numberOfHTMLs === 1, "Incorrect number of crawled HTML pages : " + stat.data.numberOfHTMLs);
                //c.removeAllListeners(["crawl"]);
                done();

            };

            crawler.init(null, end);
            var stat = new memstat.Plugin();
            crawler.registerPlugin(stat);
            crawler.queue({url : "http://localhost:9999/index.html"});

        });


        it('should return zero HTML page  for a page without tag', function(done) {
            var end = function(){

                assert(stat.data.numberOfUrls === 1, "Incorrect number of crawled urls : " + stat.data.numberOfUrls);
                //assert(stat.data.contentTypes['text/html; charset=UTF-8'] == 1);
                assert(stat.data.numberOfHTMLs === 0, "Incorrect number of crawled HTML pages : " + stat.data.numberOfHTMLs);
                done();

            };
            crawler.init(null, end);
            var stat = new memstat.Plugin();
            crawler.registerPlugin(stat);

            crawler.queue({url : "http://localhost:9999/without-tags.html"});

        });

        it('should return only one page stat for an HTML page without extension', function(done) {
            var end = function(){

                assert(stat.data.numberOfUrls === 1, "Incorrect number of crawled urls : " + stat.data.numberOfUrls);
                //assert(stat.data.contentTypes['text/html; charset=UTF-8'] == 1);
                assert(stat.data.numberOfHTMLs === 1, "Incorrect number of crawled HTML pages : " + stat.data.numberOfHTMLs);
                done();

            };
            crawler.init(null, end);
            var stat = new memstat.Plugin();
            crawler.registerPlugin(stat);

            crawler.queue({url : "http://localhost:9999/index"});

        });

        it('should return zero html page without extension for a text file', function(done) {
            var end = function(){

                assert(stat.data.numberOfUrls === 1, "Incorrect number of crawled urls : " + stat.data.numberOfUrls);
                //assert(stat.data.contentTypes['text/html; charset=UTF-8'] == 1);
                assert(stat.data.numberOfHTMLs === 0, "Incorrect number of crawled HTML pages : " + stat.data.numberOfHTMLs);
                done();

            };
            crawler.init(null, end);
            var stat = new memstat.Plugin();
            crawler.registerPlugin(stat);

            crawler.queue({url : "http://localhost:9999/text"});

        });

        it('should return zero html page for a image url without extension', function(done) {
            var end = function(){

                assert(stat.data.numberOfUrls === 1, "Incorrect number of crawled urls : " + stat.data.numberOfUrls);
                //assert(stat.data.contentTypes['text/html; charset=UTF-8'] == 1);
                assert(stat.data.numberOfHTMLs === 0, "Incorrect number of crawled HTML pages : " + stat.data.numberOfHTMLs);
                done();

            };
            crawler.init(null, end);
            var stat = new memstat.Plugin();
            crawler.registerPlugin(stat);

            crawler.queue({url : "http://localhost:9999/200x200-image"});

        });

        it('should return only one page stat for a text page', function(done) {
            var end = function(){

                assert(stat.data.numberOfUrls === 1, "Incorrect number of crawled urls : " + stat.data.numberOfUrls);
                assert(stat.data.contentTypes['text/plain; charset=UTF-8'] === 1);
                assert(stat.data.numberOfHTMLs === 0, "Incorrect number of crawled HTML pages : " + stat.data.numberOfHTMLs);
                done();

            };
            crawler.init(null, end);
            var stat = new memstat.Plugin();
            crawler.registerPlugin(stat);

            crawler.queue({url : "http://localhost:9999/test.txt"});

        });

        it('should return only internal pages stat', function(done) {

            var end = function(){

                assert(stat.data.numberOfUrls === 8, "Incorrect number of crawled urls : " + stat.data.numberOfUrls);
                assert(stat.data.contentTypes['text/html; charset=UTF-8'] === 6, "Incorrect number of HTML content type");
                assert(stat.data.numberOfHTMLs === 6, "Incorrect number of crawled HTML pages : " + stat.data.numberOfHTMLs);
                done();

            };

            crawler.init(null, end);
            var stat = new memstat.Plugin();
            crawler.registerPlugin(stat);

            crawler.queue({url : "http://localhost:9999/internal-links.html"});

        });


        it('should return 1 internal pages stat for a depthLimit = 0', function(done) {

            var end = function(){

                assert(stat.data.numberOfUrls === 1, "Incorrect number of crawled urls : " + stat.data.numberOfUrls);
                assert(stat.data.contentTypes['text/html; charset=UTF-8'] === 1, "Incorrect number of HTML content type");
                assert(stat.data.numberOfHTMLs === 1, "Incorrect number of crawled HTML pages : " + stat.data.numberOfHTMLs);
                done();

            };

            crawler.init({depthLimit : 0}, end);
            var stat = new memstat.Plugin();
            crawler.registerPlugin(stat);
            //var log = new logger.Plugin(c);

            crawler.queue({url : "http://localhost:9999/internal-links.html"});

        });

        it('should return 4 internal pages stat for a depthLimit = 1', function(done) {

            var end = function(){

                assert(stat.data.numberOfUrls === 4, "Incorrect number of crawled urls : " + stat.data.numberOfUrls);
                assert(stat.data.contentTypes['text/html; charset=UTF-8'] === 4, "Incorrect number of HTML content type");
                assert(stat.data.numberOfHTMLs === 4, "Incorrect number of crawled HTML pages : " + stat.data.numberOfHTMLs);
                done();

            };
            crawler.init({depthLimit : 1}, end);
            var stat = new memstat.Plugin();
            crawler.registerPlugin(stat);
            //var log = new logger.Plugin(c);

            crawler.queue({url : "http://localhost:9999/internal-links.html"});

        });

        it('should return only dofollow pages stat', function(done) {
            var end = function(){

                assert(stat.data.numberOfUrls === 6, "Incorrect number of crawled urls : " + stat.data.numberOfUrls);
                assert(stat.data.contentTypes['text/html; charset=UTF-8'] === 5, "Incorrect number of HTML content type");
                assert(stat.data.numberOfHTMLs === 5, "Incorrect number of crawled HTML pages : " + stat.data.numberOfHTMLs);
                done();

            };
            crawler.init({
               canCrawl : function(parentUrl, link, anchor, isDoFollow) {
                            return isDoFollow;
                          }
               },
               end);

            var stat = new memstat.Plugin();
            crawler.registerPlugin(stat);

            crawler.queue({url : "http://localhost:9999/internal-links.html"});

        });

});
