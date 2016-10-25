// npm libraries
import navbar from '../js/includes/navbar.js';
import bigboard from '../js/includes/big-board-core.js'
import request from 'superagent';

// global vars
window.pymChild = null;
let dataURL = null;
let data = null;

var resultsMenu = document.querySelector(".small-screen-nav-label");
var stateMenu = document.querySelector(".state-nav-label");
/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    // init pym and render callback
    pymChild = new pym.Child({
        polling: 100
    });
    resultsMenu.addEventListener('click', function() {
        navbar.onResultsMenuClick(pymChild);
    });
    stateMenu.addEventListener('click', function() {
        navbar.onStateMenuClick(pymChild);
    });

    bigboard.initBigBoard('senate-national.json', 'Senate', 'senate');
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
