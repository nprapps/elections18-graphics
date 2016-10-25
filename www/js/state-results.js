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
        return h('div.results', ['Loaded',
          h('div.overall-state', [
            h('h3', 'Overall State Results'),
            h('p', 'Lorem Ipsum dolemoar usted.'),
            h('h4', '2016'),
            h('table', [
              h('tr', [
                h('th', 'Candidate'),
                h('th', 'Party'),
                h('th', 'Votes'),
                h('th', 'Pct')
              ]),
              h('tr', [
                h('td', 'Donald Trump'),
                h('td', 'Republican'),
                h('td', 'Number'),
                h('td', 'Percent')
              ]),
              h('tr', [
                h('td', 'Hillary Clinton'),
                h('td', 'Democrat'),
                h('td', 'Number'),
                h('td', 'Percent')
              ])
            ]),
            h('h4', '2012'),
            h('table', [
              h('tr', [
                h('th', 'Candidate'),
                h('th', 'Party'),
                h('th', 'Votes'),
                h('th', 'Pct')
              ]),
              h('tr', [
                h('td', 'Mitt Romney'),
                h('td', 'Republican'),
                h('td', 'Number'),
                h('td', 'Percent')
              ]),
              h('tr', [
                h('td', 'Barack Obama'),
                h('td', 'Democrat'),
                h('td', 'Number'),
                h('td', 'Percent')
              ])
            ])
          ]),
        ]);
    } else {
        return h('div.results');
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
