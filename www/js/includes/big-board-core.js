// npm libraries
import maquette from 'maquette';
import request from 'superagent';

// global vars
let dataURL = null;
let bopDataURL = null;
let lastRequestTime = null;
let boardTitle = null;
let resultsData = null;
let bopData = null;

const boardWrapper = document.querySelector('.board')
const FIRST_COLUMN_KEYS = ['6:00 PM', '7:00 PM', '7:30 PM', '8:00 PM']
const SECOND_COLUMN_KEYS = ['8:30 PM', '9:00 PM', '10:00 PM', '11:00 PM', '1:00 AM']
const projector = maquette.createProjector();
const h = maquette.h;

var exports = module.exports = {};
/*
* Initialize the graphic.
*/
exports.initBigBoard = function(filename, boardName) {
    boardTitle = boardName;
    dataURL = buildDataURL(filename);
    bopDataURL = buildDataURL('top-level-results.json')
    getData();
    getBopData();
    projector.append(boardWrapper, renderMaquette);

    setInterval(getData, 5000);
}

const buildDataURL = function(filename) {
    if (document.location.hostname === '127.0.0.1' ||
        document.location.hostname === 'localhost' ||
        document.location.hostname === '0.0.0.0') {
        return document.location.protocol + '//' + document.location.hostname + ':' + document.location.port + '/data/' + filename;
    } else {
        return document.location.protocol + '//' + document.location.hostname + '/elections16/data/' + filename;
    }
}

const getData = function() {
    request.get(dataURL)
        .set('If-Modified-Since', lastRequestTime)
        .end(function(err, res) {
            if (res.body) {
                lastRequestTime = new Date().toUTCString();
                resultsData = sortData(res.body)
                projector.scheduleRender();
            }
        });
}

const getBopData = function() {
    request.get(bopDataURL)
        .end(function(err, res) {
            if (res.body) {
                bopData = res.body;
                projector.scheduleRender();
            }
        });
}

const sortData = function(resultsData) {
    // sort each race
    for (var time in resultsData) {
        for (var race in resultsData[time]) {
            resultsData[time][race].sort(function(a, b) {
                return b.votecount - a.votecount;
            })
        }
    }
    return resultsData
}

const renderMaquette = function() {
    return h('div.results-wrapper', [
        h('div.results-header', [
            h('h1', boardTitle),
            renderLeaderboard()
        ]),
        h('div.results', [
            renderResultsColumn(FIRST_COLUMN_KEYS, 'first'),
            renderResultsColumn(SECOND_COLUMN_KEYS, 'last')
        ])
    ]);
}

const renderLeaderboard = function() {
    if (bopData) {
        let bop = {};
        let totalSeats = 0;
        let majority = 0;
        if (boardTitle.indexOf('House') !== -1) {
            bop = bopData['house_bop'];
            totalSeats = 435;
            majority = 218;
        } else if (boardTitle.indexOf('Senate') !== -1) {
            bop = bopData['senate_bop'];
            totalSeats = 100;
            majority = 51;
        } else {
            return h('div.leaderboard', '');
        }

        const demSeats = bop['Dem']['seats'];
        const gopSeats = bop['GOP']['seats'];
        const indSeats = bop['Other']['seats'];

        const demPickups = bop['Dem']['pickups'];
        const gopPickups = bop['GOP']['pickups'];
        const indPickups = bop['Other']['pickups'];

        const demNeed = (majority - demSeats) > 0 ? (majority - demSeats) : 0;
        const gopNeed = (majority - gopSeats) > 0 ? (majority - gopSeats) : 0;

        const notCalled = totalSeats - (demSeats + gopSeats + indSeats);

        return h('div.leaderboard', [
            h('div.results-header-group.dem', [
                h('h2.party', 'Dem.'),
                h('p.total', [
                    h('span.percentage', demSeats),
                    h('span.change', demPickups >= 0 ? '+' + demPickups : demPickups)
                ]),
                h('p.seats-needed', [
                    h('span.count', demNeed)
                ])
            ]),
            h('div.results-header-group.gop', [
                h('h2.party', 'GOP'),
                h('p.total', [
                    h('span.percentage', gopSeats),
                    h('span.change', gopPickups >= 0 ? '+' + gopPickups : gopPickups)
                ]),
                h('p.seats-needed', [
                    h('span.count', gopNeed)
                ])
            ]),
            h('div.results-header-group.other', [
                h('h2.party', 'Ind.'),
                h('p.total', [
                    h('span.percentage', indSeats),
                    h('span.change', indPickups >= 0 ? '+' + indPickups : indPickups)
                ]),
            ]),
            h('div.results-header-group.not-called', [
                h('h2', 'Not Called'),
                h('p.total', [
                    h('span.count', notCalled)
                ])
            ])
        ])
    } else {
        return h('div.leaderboard', '');
    }
}

const renderResultsColumn = function(keys, orderClass) {
    var className = 'column ' + orderClass;
    if (resultsData) {
        return h('div', {
            key: orderClass,
            class: className
        }, [
            keys.map(key => renderResultsTable(key))
        ])
    } else {
        return h('div', {
            key: 'init'
        });
    }
}

const renderResultsTable = function(key) {
    let races = '';
    if (resultsData.hasOwnProperty(key)) {
        races = resultsData[key];    
    }
    if (races) {
        return [
            h('h2.poll-closing-group', h('span.time', key)),
            h('table.races', [
                Object.keys(races).map(key => renderRace(races[key]))
            ])
        ]
    } else {
        return '';
    }
}

const renderRace = function(race) {
    let race1 = race.find(findDemResult);
    let race2 = race.find(findGOPResult);

    if (!race1) {
        race1 = race[0]
    }

    if (!race2) {
        race2 = race[1];
    }

    let winningResult = '';
    if (race1['npr_winner']) {
        winningResult = race1;
    } else if (race2['npr_winner']) {
        winningResult = race2;
    }

    let demWinner = false;
    let gopWinner = false;
    let indWinner = false;
    if (winningResult) {
        if (winningResult['party'] === 'Dem') {
            demWinner = true;
        } else if (winningResult['party'] === 'GOP') {
            gopWinner = true;
        } else {
            indWinner = true;
        }
    }


    let called = false;
    if (race1['npr_winner'] || race2['npr_winner']) {
        called = true;
    }

    let change = false
    if (winningResult && winningResult['party'] !== race1['meta']['current_party']) {
        change = true
    }

    let reporting = false;
    if (race1['precinctsreporting'] > 0) {
        reporting = true;
    }

    return h('tr', {
        key: race1['last'],
        classes: { 
            'dem': demWinner,
            'gop': gopWinner,
            'ind': indWinner,
            'called': called,
            'party-change': change,
            'reporting': reporting
        }
    }, [
        h('td.pickup', [
            insertRunoffImage(race)
        ]),
        h('td.state', [
            decideLabel(race1)
        ]),
        h('td.results-status', [
            Math.round(race1['precinctsreportingpct'] * 100) 
        ]),
        h('td.candidate', {
            class: race1['party'].toLowerCase()
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
            class: race1['party'].toLowerCase()
        }, [
            h('span.candidate-total-wrapper', {
                updateAnimation: onUpdateAnimation
            }, [
                Math.round(race1['votepct'] * 100)
            ])
        ]),
        h('td.candidate-total-spacer'),
        h('td.candidate-total', {
            class: race2['party'].toLowerCase()
        }, [
            h('span.candidate-total-wrapper', {
                updateAnimation: onUpdateAnimation
            }, [
                race2 ? Math.round(race2['votepct'] * 100) : 0
            ])
        ]),
        h('td.candidate', {
            class: race2['party'].toLowerCase()
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

const decideLabel = function(race) {
    if (race['officename'] == 'U.S. House') {
        return race['statepostal'] + '-' + race['seatnum'];
    } else {
        return race['statepostal'];
    }
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

const onUpdateAnimation = function(domNode, properties, previousProperties) {
    const parent = domNode.parentNode;
    let party = '';
    if (parent.classList.contains('dem')) {
        party = 'dem';
    } else if (parent.classList.contains('gop')) {
        party = 'gop';
    }
    const sibling = domNode.parentNode.parentNode.querySelector('.candidate.' + party)
    
    parent.classList.add('lighten');
    sibling.classList.add('lighten');
    
    setTimeout(function() { 
        parent.classList.remove('lighten')
        sibling.classList.remove('lighten');
    }, 2000);
}