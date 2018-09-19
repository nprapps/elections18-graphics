/*
 * Basic Javascript helpers used in analytics.js and graphics code.
 */

/*
 * Convert arbitrary strings to valid css classes.
 * via: https://gist.github.com/mathewbyrne/1280286
 *
 * NOTE: This implementation must be consistent with the Python classify
 * function defined in base_filters.py.
 */
const classify = function(str) {
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
const formatStyle = function(props) {
    var s = '';

    for (var key in props) {
        s += key + ': ' + props[key].toString() + '; ';
    }

    return s;
}

/*
 * Create a SVG tansform for a given translation.
 */
const makeTranslate = function(x, y) {
    var transform = d3.transform();

    transform.translate[0] = x;
    transform.translate[1] = y;

    return transform.toString();
}

/*
 * Parse a url parameter by name.
 * via: http://stackoverflow.com/a/901144
 */
const getParameterByName = function(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/*
 * Convert a url to a location object.
 */
const urlToLocation = function(url) {
    var a = document.createElement('a');
    a.href = url;
    return a;
}

const buildDataURL = function(filename) {
    if (document.location.hostname === '127.0.0.1' ||
        document.location.hostname === 'localhost' ||
        document.location.hostname === '0.0.0.0') {
        return document.location.protocol + '//' + document.location.hostname + ':' + document.location.port + '/data/' + filename;
    } else {
        return document.location.protocol + '//' + document.location.hostname + '/elections18-graphics/data/' + filename;
    }
}

export {
    classify,
    formatStyle,
    makeTranslate,
    getParameterByName,
    urlToLocation,
    buildDataURL
};
