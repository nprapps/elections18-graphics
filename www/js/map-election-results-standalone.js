// npm libraries
import map from '../js/includes/map.js'

// global vars
window.pymChild = null;
var isMapInit = false;


/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    // init pym and render callback
    pymChild = new pym.Child({
        renderCallback: render
    });

    // pymChild.onMessage('on-screen', function(bucket) {
    //     ANALYTICS.trackEvent('on-screen', bucket);
    // });
    // pymChild.onMessage('scroll-depth', function(data) {
    //     data = JSON.parse(data);
    //     ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    // });
}


/*
 * Render
 */
var render = function(containerWidth) {
    if (!isMapInit) {
        map.initMap(containerWidth);
        isMapInit= true;
    } else {
        map.renderMap(containerWidth);
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
