import maquette from 'maquette';
import request from 'superagent';

const resultsWrapper = document.querySelector('.results-wrapper');
const projector = maquette.createProjector();
const h = maquette.h;

let data = null;
let dataURL = null;
let currentState = null;
let lastRequestTime = null;
let pymChild = null;

/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    // init pym and render callback
    pymChild = new pym.Child({
        polling: 100
    });
    projector.append(resultsWrapper, renderMaquette);
    currentState = 'pa';
    const dataFilename = 'presidential-' + currentState + '-counties.json'
    dataURL = buildDataURL(dataFilename);
    getData();
}

const getData = function() {
    request.get(dataURL)
        .end(function(err, res) {
            data = res.body;
            projector.scheduleRender();
        });
}

const renderMaquette = function() {
    if (data) {
        console.log(data);
        return h('div.results', 'Results loaded');
    } else {
        return h('div.results');    
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
