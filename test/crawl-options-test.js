var assert    = require("assert");
var crawler   = require("../index.js");
var audit     = require("../plugins/audit-plugin.js");
var cs        = require("../plugins/console-plugin.js");
var logger    = require("../plugins/log-plugin.js");

var testSite  = require("./website/start.js").site;


describe('Crawl Option tests', function() {

        it('Should returns an error for an empty options', function(done) {
            var end = function(){

                assert(a.errors.toArray()[0].error.errorCode==="NO_OPTIONS");
                done();

            };
            crawler.init(null, end);
            var a = new audit.Plugin();
            crawler.registerPlugin(a);

            crawler.queue();

        });

        it('Should returns a ressource with an option as a String', function(done) {

            var end = function(){

                assert(a.resources.get("http://localhost:9999/").statusCode === 200);
                done();

            };
            crawler.init(null, end);
            var a = new audit.Plugin();
            crawler.registerPlugin(a);

            crawler.queue("http://localhost:9999/");

        });

        it('Should returns a ressource with an option as a json object', function(done) {
            var end = function(){

                assert(a.resources.get("http://localhost:9999/").statusCode === 200);
                done();

            };

            crawler.init(null, end);
            var a = new audit.Plugin();
            //var cons = new cs.Plugin();
            //crawler.registerPlugin(cons);
            crawler.registerPlugin(a);

            crawler.queue({url:"http://localhost:9999/"});

        });

        it('Should returns an error for an options without url ', function(done) {

            var end = function(){

                assert(a.errors.toArray()[0].error.errorCode  === "NO_URL_OPTION");
                done();

            };

            crawler.init(null, end);
            var a = new audit.Plugin();
            crawler.registerPlugin(a);

            crawler.queue({});

        });

        it('Should returns a ressource with an option as a Array', function(done) {

            var end = function(){

                assert(a.resources.get("http://localhost:9999/page6.html").statusCode === 200);
                assert(a.resources.get("http://localhost:9999/").statusCode === 200);
                done();

            };

            crawler.init(null, end);
            var a = new audit.Plugin();
            crawler.registerPlugin(a);

            //var l = new logger.Plugin(c);
            crawler.queue(["http://localhost:9999/", {url:"http://localhost:9999/page6.html"}]);

        });


        it('Should use the custom options for all upcoming requests', function(done) {

            var end = function(){

                assert(ok);
                done();

            };
            crawler.init(null, end);
            var a = new audit.Plugin();
            //var l = new logger.Plugin();
            crawler.registerPlugin(a);

            var ok = false;

            crawler.queue({url :"http://localhost:9999/page7.html",
                     userAgent : "dummyBot",
                     canCrawl : function (parentUri, link, anchor, isDoFollow){
                                    if (link === "http://localhost:9999/page9.html") {
                                      ok = true;
                                    }
                                    return true;
                                }

                     });


        });


        it('Should recrawl url with 404', function(done) {

            var end = function(){
                assert(a.resources.get("http://localhost:9999/notfound").statusCode === 200);
                assert(! a.resources.get("http://localhost:9999/notfound-2"));

                done();

            };
            crawler.init({retry400 : true, retryTimeout:20}, end);
            var a = new audit.Plugin();
            //var cons = new cs.Plugin();
            crawler.registerPlugin(a);
            //crawler.registerPlugin(cons);

            crawler.queue("http://localhost:9999/page13.html");
            //crawler.queue("http://localhost:9999/notfound");


        });



});
