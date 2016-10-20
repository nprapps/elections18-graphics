// npm libraries
import navbar from '../js/includes/navbar.js';
import h from 'virtual-dom/h';
import diff from 'virtual-dom/diff';
import patch from 'virtual-dom/patch';
import createElement from 'virtual-dom/create-element';
import request from 'superagent';

// global vars
let pymChild = null;
let dataURL = null;
let boardvDOM = null;
let boardDOM = null;
let lastRequestTime = null;

const boardWrapper = document.querySelector('.results-wrapper')
const FIRST_COLUMN_KEYS = ['6:00 PM', '7:00 PM', '7:30 PM', '8:00 PM']
const SECOND_COLUMN_KEYS = ['8:30 PM', '9:00 PM', '10:00 PM', '11:00 PM', '1:00 AM']

/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    // init pym and render callback
    pymChild = new pym.Child({ 
        renderCallback: updateIFrame
    });

    boardvDOM = renderInitialBoardvDOM();
    boardDOM = createElement(boardvDOM);
    boardWrapper.appendChild(boardDOM);
    dataURL = buildDataURL();
    getData();
}


const renderInitialBoardvDOM = function() {
    return h('div.init', h('p', 'Waiting for data...'));
}

const buildDataURL = function() {
    if (document.location.hostname === '127.0.0.1' ||
        document.location.hostname === 'localhost' ||
        document.location.hostname === '0.0.0.0') {
        return document.location.protocol + '//' + document.location.hostname + ':' + document.location.port + '/data/senate-national.json';
    } else {
        return document.location.protocol + '//' + document.location.hostname + '/elections16/data/senate-national.json';
    }
}

const getData = function() {
    request.get(dataURL)
        .set('If-Modified-Since', lastRequestTime)
        .end(function(err, res) {
            if (res.status === 200) {
                lastRequestTime = new Date().toUTCString();
                updateBoard(res.body);
                updateIFrame();
            }
        });
}

const updateBoard = function(data) {
    // sort each race
    for (var time in data) {
        for (var race in data[time]) {
            data[time][race].sort(function(a, b) {
                return b.votecount - a.votecount;
            })
        }
    }

    const newBoardvDOM = renderBoardvDOM(data);
    console.log(boardvDOM, newBoardvDOM);
    const patches = diff(boardvDOM, newBoardvDOM);
    boardDOM = patch(boardDOM, patches);
    console.log(boardDOM);
    boardvDOM = newBoardvDOM;
}

const renderBoardvDOM = function(data) {
    return h('div', [
        h('div.results-header', [
            h('h1', 'Senate')
        ]),
        h('div.leaderboard', [
        ]),
        h('div.results', [
            renderResultsColumn(data, FIRST_COLUMN_KEYS, 'first'),
            renderResultsColumn(data, SECOND_COLUMN_KEYS, 'last')
        ])
    ]);
}

const renderResultsColumn = function(data, keys, orderClass) {
    var className = 'column ' + orderClass;
    return h('div', {
        className: className
    }, [
        keys.map(key => renderResultsTable(data, key))
    ])
}

const renderResultsTable = function(data, key) {
    const races = data[key];
    return [
        h('h2.poll-closing-group', h('span.time', key)),
        h('table.races', [
            Object.keys(races).map(key => renderRace(races[key]))
        ])
    ]
}

const renderRace = function(race) {
    let classList = [];

    let race1 = race.find(findDemResult);
    let race2 = race.find(findGOPResult);

    if (!race1) {
        race1 = race[0]
    }

    if (!race2) {
        race2 = race[1];
    }

    let winner = '';
    if (race1['npr_winner']) {
        winner = race1;
    } else if (race2['npr_winner']) {
        winner = race2;
    }

    let called = ''
    if (winner) {
        called = 'called'
    }

    let change = ''
    if (winner && winner['party'] !== race1['meta']['current_party']) {
        change = 'party-change';
    }

    let reporting = ''
    if (race1['precinctsreporting'] > 0) {
        reporting = 'reporting';
    }

    if (winner) {
        classList.push(winner['party'].toLowerCase())
    }

    classList.push(change, called, reporting);

    return h('tr.race', {
        className: classList.join(' ')
    }, [
        h('td.pickup', [
            insertRunoffImage(race)
        ]),
        h('td.state', [
            race1['statepostal']
        ]),
        h('td.results-status', [
            Math.round(race1['precinctsreportingpct'] * 100) 
        ]),
        h('td.candidate', {
            className: race1['party'].toLowerCase()
        }, [
            h('span.fname', [
                race1['first'] + ' '
            ]),
            h('span.lname', [
                race1['last'] + ' '
            ]),
            insertIncumbentImage(race1['incumbent'])
        ]),
        h('td.candidate-total', {
            className: race1['party'].toLowerCase()
        }, [
            h('span.candidate-total-wrapper', [
                Math.round(race1['votepct'] * 100)
            ])
        ]),
        h('td.candidate-total-spacer'),
        h('td.candidate-total', {
            className: race2['party'].toLowerCase()
        }, [
            h('span.candidate-total-wrapper', [
                race2 ? Math.round(race2['votepct'] * 100) : 0
            ])
        ]),
        h('td.candidate', {
            className: race2['party'].toLowerCase()
        }, [
            h('span.fname', [
                race2 ? race2['first'] : ''
            ]),
            ' ',
            h('span.lname', [
                race2 ? race2['last'] : ''
            ]),
            ' ',
            insertIncumbentImage(race2['incumbent'])
        ])
    ])
}

const insertRunoffImage = function(race) {
    let runoff = false;
    for (var result of race) {
        if (result['runoff'] === true) {
            runoff = true;
        }
    }

    if (runoff) {
        return h('img.img-responsive', {
            src: '../assets/runoff.svg'
        })
    } else {
        return ''
    }
}

const insertIncumbentImage = function(incumbency) {
    if (incumbency) {
        return h('img.img-responsive', {
            src: '../assets/incumbent.svg'
        })
    } else {
        return ''
    }
}


const findGOPResult = function(result) {
    return result.party === 'GOP';
}

const findDemResult = function(result) {
    return result.party === 'Dem';
}

const updateIFrame = function() {
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
