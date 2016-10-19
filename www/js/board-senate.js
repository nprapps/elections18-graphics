// npm libraries
import d3 from 'd3';
import * as _ from 'underscore';
import navbar from '../js/includes/navbar.js';

// global vars
var pymChild = null;


/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    // init pym and render callback
    pymChild = new pym.Child({ });

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
