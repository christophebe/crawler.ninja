var assert    = require("assert");
var _         = require("underscore");
var seoaudit  = require("../plugins/audit-plugin.js");
var cs        = require("../plugins/console-plugin.js");

var testSite  = require("./website/start.js").site;

var crawler = require("../index.js");


describe('Audit Plugin Basic tests', function() {


        it('Should return an error for an invalid site', function(done) {
            var audit = new seoaudit.Plugin();
            var end = function(){
                assert(audit.errors.length === 2);
                done();

            };
            crawler.init({ externalDomains :true, externalHosts : true, retries : 0}, end);
            crawler.registerPlugin(audit);

            crawler.queue({url : "http://localhost:9999/error.html" });

        });

        it('Should return the redirect info for 301', function(done) {

            var audit = new seoaudit.Plugin();

            var end = function() {
              var resource = audit.resources.get("http://localhost:9999/redirect");
              assert(resource.statusCode===301);
              var pageDest = audit.outLinks.get("http://localhost:9999/redirect")[0].page;
              assert( pageDest === "/page2.html", "invalide destination page for the redirect : " + pageDest );

              done();

            };

            crawler.init(null, end);
            crawler.registerPlugin(audit);
            crawler.queue({url : "http://localhost:9999/redirect"});

        });

        it('Should return the redirect chain info for a series of 301', function(done) {


            var audit = new seoaudit.Plugin();

            var end = function(){

                var resource = audit.resources.get("http://localhost:9999/redirect1");
                assert(resource.statusCode===301);

                resource = audit.resources.get("http://localhost:9999/redirect2");
                assert(resource.statusCode===302);
                assert(audit.redirects.get("http://localhost:9999/redirect1").to === "http://localhost:9999/redirect2");
                assert(audit.redirects.get("http://localhost:9999/redirect1").statusCode === 301);
                assert(audit.redirects.get("http://localhost:9999/redirect2").to === "http://localhost:9999/redirect3");
                assert(audit.redirects.get("http://localhost:9999/redirect2").statusCode === 302);
                assert(audit.redirects.get("http://localhost:9999/redirect3").to === "http://localhost:9999/index.html");
                assert(audit.redirects.get("http://localhost:9999/redirect3").statusCode === 301);
                done();

            };
            crawler.init(null, end);
            crawler.registerPlugin(audit);
            crawler.queue({url : "http://localhost:9999/redirect1"});

        });

        it('Should return only the latest url after a 301 chain with the option followRedirect = true', function(done) {

            var audit = new seoaudit.Plugin();
            var end = function(){

                var resource = audit.resources.get("http://localhost:9999/index.html");
                assert(resource.statusCode===200);

                assert(audit.redirects.keys = []);

                done();

            };

            crawler.init({followRedirect : true}, end);
            crawler.registerPlugin(audit);

            crawler.queue({url : "http://localhost:9999/redirect1"});

        });

        it('Should crawl images', function(done) {

            var audit = new seoaudit.Plugin();
            //var cons = new cs.Plugin();
            var end = function(){
                var resource = audit.resources.get("http://localhost:9999/200x200-image.jpg");
                assert(resource.contentType ==='image/jpeg');

                done();

            };

            crawler.init(null, end);
            crawler.registerPlugin(audit);
            //crawler.registerPlugin(cons);

            crawler.queue({url : "http://localhost:9999/page1.html"});

        });

        it('Should crawl 404 urls', function(done) {

            var audit = new seoaudit.Plugin();
            //var cons = new cs.Plugin();
            var end = function(){

                var resource = audit.resources.get("http://localhost:9999/404-test.html");
                assert(resource.statusCode===404);
                assert(audit.outLinks.get("http://localhost:9999/page3.html")[0].page === "http://localhost:9999/404-test.html");
                assert(audit.inLinks.get("http://localhost:9999/404-test.html")[0].page === "http://localhost:9999/page3.html");

                done();

            };

            crawler.init(null, end);
            crawler.registerPlugin(audit);
            //crawler.registerPlugin(cons);

            crawler.queue({url : "http://localhost:9999/page3.html"});

        });


        it('Should crawl 500 urls', function(done) {

            var audit = new seoaudit.Plugin();
            var end = function(){

                var resource = audit.resources.get("http://localhost:9999/internal-error");

                assert(resource.statusCode===500);
                assert(audit.outLinks.get("http://localhost:9999/page3.html")[1].page === "http://localhost:9999/internal-error");
                assert(audit.inLinks.get("http://localhost:9999/internal-error")[0].page === "http://localhost:9999/page3.html");

                done();

            };

            crawler.init(null, end);
            crawler.registerPlugin(audit);
            crawler.queue({url : "http://localhost:9999/page3.html"});

        });


        it('Should crawl even with dns error', function(done) {

            var end = function(){

                var resource = audit.resources.get("http://www.thisnotcorrect.abc/");

                assert(resource.statusCode === "DNS lookup failed");
                assert(audit.outLinks.get("http://localhost:9999/page5.html")[0].page === "http://www.thisnotcorrect.abc/");
                assert(audit.outLinks.get("http://localhost:9999/page5.html")[1].page === "http://localhost:9999/");
                assert(audit.inLinks.get("http://www.thisnotcorrect.abc/")[0].page === "http://localhost:9999/page5.html");

                done();

            };

            var audit = new seoaudit.Plugin();
            crawler.init({externalDomains : true, retries : 0}, end);
            crawler.registerPlugin(audit);
            crawler.queue({url : "http://localhost:9999/page5.html"});

        });

});
