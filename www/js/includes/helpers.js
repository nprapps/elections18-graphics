/*
 * Basic Javascript helpers used in analytics.js and graphics code.
 */
var exports = module.exports = {};
/*
 * Convert arbitrary strings to valid css classes.
 * via: https://gist.github.com/mathewbyrne/1280286
 *
 * NOTE: This implementation must be consistent with the Python classify
 * function defined in base_filters.py.
 */
exports.classify = function(str) {
    return str.toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

/*
 * Convert key/value pairs to a style string.
 */
exports.formatStyle = function(props) {
    var s = '';

    for (var key in props) {
        s += key + ': ' + props[key].toString() + '; ';
    }

    return s;
}

/*
 * Create a SVG tansform for a given translation.
 */
exports.makeTranslate = function(x, y) {
    var transform = d3.transform();

    transform.translate[0] = x;
    transform.translate[1] = y;

    return transform.toString();
}

/*
 * Parse a url parameter by name.
 * via: http://stackoverflow.com/a/901144
 */
exports.getParameterByName = function(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/*
 * Convert a url to a location object.
 */
exports.urlToLocation = function(url) {
    var a = document.createElement('a');
    a.href = url;
    return a;
}

exports.buildDataURL = function(filename) {
    if (document.location.hostname === '127.0.0.1' ||
        document.location.hostname === 'localhost' ||
        document.location.hostname === '0.0.0.0') {
        return document.location.protocol + '//' + document.location.hostname + ':' + document.location.port + '/data/' + filename;
    } else {
        return document.location.protocol + '//' + document.location.hostname + '/elections18/data/' + filename;
    }
}

exports.injectCustomCSS = function() {
    var link = document.createElement('link')
    link.setAttribute('rel', 'stylesheet')
    link.setAttribute('type', 'text/css')
    if (APP_CONFIG.DEPLOYMENT_TARGET == 'production' || APP_CONFIG.DEPLOYMENT_TARGET == 'staging') {
        link.setAttribute('href', '../css/rendered/screenshot.css');
    } else {
        link.setAttribute('href', '../less/screenshot.less');
    }
    document.getElementsByTagName('head')[0].appendChild(link)
}

// Evaluate custom css injection onload
if (Boolean(exports.getParameterByName('screenshot'))) {
    if (document.readyState != 'loading'){
        exports.injectCustomCSS();
    } else {
        document.addEventListener('DOMContentLoaded', exports.injectCustomCSS);
    }
}
