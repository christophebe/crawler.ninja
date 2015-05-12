var assert    = require("assert");
var _         = require("underscore");
var seoaudit  = require("../plugins/audit-plugin.js");
var logger    = require("../plugins/log-plugin.js");

var testSite  = require("./website/start.js").site;

var crawler = require("../index.js");


describe('External Links', function() {

        it('Should not crawl external links & external domains by default', function(done) {

            var c = new crawler.Crawler();
            var audit = new seoaudit.Plugin(c);


            c.on("end", function(){

                assert(! audit.resources.get("http://www.nytimes.com"));
                assert(! audit.resources.get("http://www.nytimes.com/"));
                assert(audit.externalLinks.get("http://www.nytimes.com/") != null);
                done();

            });

            c.queue({url : "http://localhost:9999/page2.html"});

        });


        it('Should crawl external links but not entire domains', function(done) {

            var c = new crawler.Crawler({externalLinks : true});
            var audit = new seoaudit.Plugin(c);
            //var log = new logger.Plugin(c);

            c.on("end", function(){

                assert(audit.resources.get("http://www.nytimes.com/"));
                assert(audit.externalLinks.get("http://www.nytimes.com/") != null);
                done();

            });

            c.queue({url : "http://localhost:9999/page2.html"});

        });

});