var assert    = require("assert");
var _         = require("underscore");
var seoaudit  = require("../plugins/audit-plugin.js");
var logger    = require("../plugins/log-plugin.js");
var cs        = require("../plugins/console-plugin.js");

var testSite  = require("./website-2/start.js").site;

var crawler = require("../index.js");



describe('Audit Plugin', function() {

        it('Audit a mini site - all links images ', function(done) {
            var end = function() {

                //assert(audit.errors.length == 0, "Error during the crawl");

                //console.log(audit.resources.get("http://localhost:9991/index.html"));

                assert(audit.resources.get("http://localhost:9991/index.html").title === "This is the meta title of the page");
                assert(audit.resources.get("http://localhost:9991/index.html").h2.length === 3);
                assert(audit.resources.get("http://localhost:9991/index.html").contentType === "text/html; charset=UTF-8");


                /*
                console.log(audit.duplicateContents.keys());
                audit.duplicateContents.keys().forEach(function(k){
                  console.log(audit.duplicateContents.get(k));
                });
                */
                assert(audit.duplicateContents.get("a02ecf7dbed6115812462ff0f55c5cd03bb8f3b8").length === 2);

                var outLinks = audit.outLinks.get("http://localhost:9991/markdown.html");
                assert(outLinks.length === 28, "incorrect outlink, it should be : " + outLinks.length);
                assert(_.filter(outLinks,function(page){ return page.isDoFollow === false;}).length === 3);

                assert(audit.inLinks.get("http://localhost:9991/markdown.html").length === 13);

                var inLinks = audit.inLinks.get("http://localhost:9991/markdown.html");
                assert(_.filter(inLinks,function(page){ return page.isDoFollow === false;}).length === 0);

                //console.log(audit.resources.get("http://localhost:9991/pdf/excelforseo.pdf"));

                assert(audit.externalLinks.keys().length === 8);


                assert(audit.inLinks.get("http://localhost:9991/css/bootstrap-theme.min.css").length === 5);

                done();

            };
            var audit = new seoaudit.Plugin();
            var log = new logger.Plugin();
            crawler.init(null, end);

            crawler.registerPlugin(audit);
            crawler.registerPlugin(log);
            crawler.queue({url : "http://localhost:9991/index.html"});

        });


        it('Audit a mini site - crawl only a.href links ', function(done) {

            var end = function() {
                //console.log(audit.resources.keys());
                assert(audit.resources.keys().length === 9);
                done();

            };
            crawler.init({images : false, links: false /*links = html link tag*/, scripts:false }, end );
            var audit = new seoaudit.Plugin();
            //var console = new cs.Plugin();

            crawler.registerPlugin(audit);
            //crawler.registerPlugin(console);
            crawler.queue({url : "http://localhost:9991/index.html"});

        });

});
