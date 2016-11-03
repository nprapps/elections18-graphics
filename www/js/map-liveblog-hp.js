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
