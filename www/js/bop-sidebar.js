// npm libraries
import bop from '../js/includes/bop.js';
import request from 'superagent';

// Global vars
window.pymChild = null;
var DATA_FILE = 'top-level-results.json';
var LOAD_INTERVAL = 15000;
var isBopInit = false;
var isMobile = false;
var electoralData = [];
var lastRequestTime = null;
var reloadElectoralData = null;

var electoralTotals = null;
var clintonTitle = null;
var clintonElectoral = null;
var trumpTitle = null;
var trumpElectoral = null;


/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    electoralTotals = d3.select('#electoral-totals');
    clintonTitle = electoralTotals.select('.clinton h3');
    clintonElectoral = electoralTotals.select('.clinton-electoral');
    trumpTitle = electoralTotals.select('.trump h3');
    trumpElectoral = electoralTotals.select('.trump-electoral');

    loadElectoralData();

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
 * Load data
 */
var loadElectoralData = function() {
    clearInterval(reloadElectoralData);
    // console.log('loadData: ' + DATA_FILE);
    request.get(buildDataURL(DATA_FILE))
        .set('If-Modified-Since', lastRequestTime ? lastRequestTime : '')
        .end(function(err, res) {
            if (err) {
                console.warn(err);
            }

            lastRequestTime = new Date().toUTCString();
            electoralData = res.body.electoral_college;
            formatElectoralData();
        });
}


/*
 * Render
 */
var render = function(containerWidth) {
    // only run the first time
    if (!isBopInit) {
        bop.initBop(containerWidth);
        isBopInit= true;
    // run onresize
    } else {
        bop.renderBop(containerWidth);
    }
}


/*
 * Format data for D3.
 */
var formatElectoralData = function() {
    var parties = {
        'senate': [ 'Dem', 'Other', 'Not yet called', 'GOP' ],
        'house': [ 'Dem', 'Not yet called', 'Other', 'GOP' ]
    }

    // update overall totals
    trumpElectoral.html(electoralData['Trump']);
    if (electoralData['Trump'] >= 270) {
        trumpTitle.html('Trump <i class="icon icon-ok"></i>');
    } else {
        trumpTitle.html('Trump');
    }

    clintonElectoral.html(electoralData['Clinton']);
    if (electoralData['Clinton'] >= 270) {
        clintonTitle.html('Clinton <i class="icon icon-ok"></i>');
    } else {
        clintonTitle.html('Clinton');
    }

    reloadElectoralData = setInterval(loadElectoralData, LOAD_INTERVAL);

    // Update iframe
    if (window.pymChild) {
        window.pymChild.sendHeight();
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
