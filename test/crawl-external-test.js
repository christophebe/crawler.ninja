var assert    = require("assert");
var _         = require("underscore");
var seoaudit  = require("../plugins/audit-plugin.js");
var cs        = require("../plugins/console-plugin.js");
var testSite  = require("./website/start.js").site;

var crawler = require("../index.js");


describe('External Links', function() {

        it('Should not crawl domains that are in the black list', function(done) {

            var end = function(){
                assert(audit.resources.toArray().length === 0);
                assert(audit.errors.toArray()[0].error.code === "DOMAINBLACKLIST");
                done();
            };
            crawler.init(null, end);
            var audit = new seoaudit.Plugin();
            crawler.registerPlugin(audit);
            crawler.queue({url : "http://www.youtube.com"});

        });


        it('Should not crawl external links & external domains by default', function(done) {
            var end = function(){

                assert(! audit.resources.get("http://www.nytimes.com"));
                assert(! audit.resources.get("http://www.nytimes.com/"));
                assert(audit.externalLinks.get("http://www.nytimes.com/") !== null);
                done();

            };
            crawler.init(null, end);
            var audit = new seoaudit.Plugin();
            crawler.registerPlugin(audit);
            crawler.queue({url : "http://localhost:9999/page2.html"});

        });


        it.skip('Should crawl external links but not entire domains', function(done) {
            this.timeout(3000);
            var end = function(){

                assert(audit.resources.get("http://www.nytimes.com/"));
                assert(audit.externalLinks.get("http://www.nytimes.com/") !== null);
                done();

            };
            crawler.init({externalDomains : true, firstExternalLinkOnly : true}, end );
            var audit = new seoaudit.Plugin();
            crawler.registerPlugin(audit);

            crawler.queue({url : "http://localhost:9999/page2.html"});

        });

        it.skip('Plugins Should verify if the link is external or not', function(done) {
            this.timeout(300000);
            var plugin = new TestPlugin();
            var end = function(){
                assert(plugin.isExternal);
                done();
            };

            crawler.init({externalDomains : true, firstExternalLinkOnly: true}, end);
            crawler.registerPlugin(plugin);
            crawler.queue({url : "http://localhost:9999/page12.html"});

        });

        it.skip('Should crawl a https site with a old config', function(done) {
            this.timeout(3000000);
            var end = function(){
                //assert(audit.resources.toArray().length === 0);
                //assert(audit.errors.toArray()[0].error.code === "DOMAINBLACKLIST");
                done();
            };
            var options = {
                secureOptions : require('constants').SSL_OP_NO_TLSv1_2,
                rejectUnauthorized : false
            };

            crawler.init(options, end);
            var console = new cs.Plugin();
            crawler.registerPlugin(console);

            crawler.queue({url : "https://www.notaire.be"}); //https://www.notaire.be/

        });

});



function TestPlugin() {
    this.name = "Test-Plugin";
}

TestPlugin.prototype.crawl = function (result,$, callback) {

      if (result.url === "http://cocoons.io/" && result.isExternal) {
        this.isExternal = true;
      }
      callback();
};
