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

};

/**
 * Function triggers when an html resource is crawled
 *
 * @param result : the result of the resource crawl
 * @param the jquery like object for accessing to the HTML tags. Null is the resource
 *        is not an HTML
 * @param callback(error)
 */
Plugin.prototype.crawl = function(result, $, callback) {

};

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


};

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


};

/**
 * Function triggers when the crawler found an HTTP redirect
 * @param the from url
 * @param the to url
 * @param the redirect code (301, 302, ...)
 * @param callback(error)
 *
 */
Plugin.prototype.crawlRedirect = function(from, to, statusCode, callback) {

};

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

};

module.exports.Plugin = Plugin;
