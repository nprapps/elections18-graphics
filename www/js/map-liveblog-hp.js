// npm libraries
import map from '../js/includes/map.js'
import maquette from 'maquette';
import request from 'superagent';
import timeago from 'timeago.js';

// global vars
window.pymChild = null;
var isMapInit = false;
var h = maquette.h;
var headlineURL = null;
var headlines = null;
var projector = maquette.createProjector();
var liveblog = document.querySelector('#liveblog');
var lastRequestTime = null;

/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    // init pym and render callback
    pymChild = new pym.Child({
        renderCallback: render
    });

    headlineURL = buildHeadlineURL('headline.json');
    projector.append(liveblog, renderMaquette);
    getData();
    setInterval(getData, 5000);
}

var getData = function() {
    request.get(headlineURL)
        .set('If-Modified-Since', lastRequestTime ? lastRequestTime : '')
        .end(function(err, res) {
            if (res.body) {
                lastRequestTime = new Date().toUTCString();
                headlines = res.body.posts;
                projector.scheduleRender();
                setTimeout(pymChild.sendHeight, 0);
            }
        });
}

var buildHeadlineURL = function(filename) {
    if (document.location.hostname === '127.0.0.1' ||
        document.location.hostname === 'localhost' ||
        document.location.hostname === '0.0.0.0') {
        return document.location.protocol + '//' + document.location.hostname + ':' + document.location.port + '/data/extra_data/' + filename;
    } else {
        return document.location.protocol + '//' + document.location.hostname + '/elections16-liveblog/' + filename;
    }
}

var renderMaquette = function() {
    if (headlines) {
        return h('div.headlines', [
            h('h3', 'Latest news'),
            headlines.map(post => renderHeadline(post))
        ])
    } else {
        return h('div.headlines')
    }
}

var renderHeadline = function(post) {
    var timeAgo = new timeago().format(post.timestamp)

    return h('h4.headline', {
        key: post.url
    }, [
        h('a', {
            href: post.url
        }, post.headline),
        ' ',
        h('span.timestamp', timeAgo)
    ])
}

/*
 * Render
 */
var render = function(containerWidth) {
    // only run the first time
    if (!isMapInit) {
        map.initMap(containerWidth);
        isMapInit= true;
    // run onresize
    } else {
        map.renderMap(containerWidth);
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
