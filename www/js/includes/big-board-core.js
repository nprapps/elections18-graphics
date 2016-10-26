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
exports.initBigBoard = function(filename, boardName, boardClass) {
    boardTitle = boardName;
    boardWrapper.classList.add(boardClass);

    bopDataURL = buildDataURL('top-level-results.json')
    dataURL = buildDataURL(filename);
    getBopData();
    getData();
    projector.append(boardWrapper, renderMaquette);

    setInterval(getBopData, 5000);
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
        .set('If-Modified-Since', lastRequestTime ? lastRequestTime : '')
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
    let numberOfRaces = 0;

    let times = [];
    for (let time in resultsData) {
        times.push(time);
        const group = resultsData[time];
        numberOfRaces += Object.keys(group).length;
    }
    const sortedTimes = times.sort(function(a, b) {
        var aHour = parseInt(a.split(':')[0]);
        var bHour = parseInt(b.split(':')[0]);

        if (a.slice(-2) === 'AM') return 1;
        if (b.slice(-2) === 'AM') return -1;
        if (aHour === bHour && a.indexOf('30') !== -1) return 1;
        if (aHour === bHour && b.indexOf('30') !== -1) return -1;
        else return aHour - bHour;        
    });

    const breakingIndex = Math.ceil(numberOfRaces / 2)
    let raceIndex = 0;
    let firstColumn = {};
    let secondColumn = {};
    let selectedColumn = firstColumn

    for (let time of sortedTimes) {
        const group = resultsData[time];
        for (let race in group) {
            raceIndex += 1

            if (!selectedColumn[time]) {
                selectedColumn[time] = {};
            }
            selectedColumn[time][race] = group[race]

            if (raceIndex === breakingIndex) {
                selectedColumn = secondColumn
            }
        }
    }

    return h('div.results-wrapper', [
        h('div.results-header', [
            h('h1', boardTitle),
            bopData ? renderLeaderboard() : ''
        ]),
        h('div.results', [
            renderResultsColumn(firstColumn, 'first'),
            renderResultsColumn(secondColumn, 'last')
        ])
    ]);
}

const renderLeaderboard = function() {
    if (boardTitle.indexOf('House') !== -1) {
        var bop = bopData['house_bop'];
    } else if (boardTitle.indexOf('Senate') !== -1) {
        var bop = bopData['senate_bop'];
    } else {
        return h('div.leaderboard', '');
    }

    const demSeats = bop['Dem']['seats'];
    const gopSeats = bop['GOP']['seats'];
    const indSeats = bop['Other']['seats'];

    const demPickups = bop['Dem']['pickups'];
    const gopPickups = bop['GOP']['pickups'];
    const indPickups = bop['Other']['pickups'];

    const demNeed = bop['Dem']['needed'];
    const gopNeed = bop['GOP']['needed'];

    const uncalledRaces = bop['uncalled_races']

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
                h('span.count', uncalledRaces)
            ])
        ])
    ])
}

const renderResultsColumn = function(column, orderClass) {
    const className = 'column ' + orderClass;
    if (resultsData) {
        return h('div', {
            key: orderClass,
            class: className
        }, [
            Object.keys(column).map(key => renderResultsTable(key, column))
        ])
    } else {
        return h('div', {
            key: 'init'
        });
    }
}

const renderResultsTable = function(key, column) {
    if (column.hasOwnProperty(key)) {
        var races = column[key];    
    }

    var sortedRaces = [];
    for (var race in races) {
        sortedRaces.push([race, races[race][0]['statepostal']]);
    }

    sortedRaces.sort(function(a, b) {
        if (a[1] < b[1]) return -1;
        if (a[1] > b[1]) return 1;
        return 0;
    });

    if (races) {
        return [
            h('h2.poll-closing-group', h('span.time', key)),
            h('table.races', [
                sortedRaces.map(sortedKey => renderRace(races[sortedKey[0]], sortedKey[0]))
            ])
        ]
    } else {
        return '';
    }
}

const renderRace = function(race, key) {
    const results = determineResults(race, key);
    const result1 = results[0];
    const result2 = results[1];

    if (result1['npr_winner']) {
        var winningResult = result1;
    } else if (result2['npr_winner']) {
        var winningResult = result2;
    }

    if (winningResult) {
        var called = true;
    }

    if (winningResult && result1['meta']['current_party'] && winningResult['party'] !== result1['meta']['current_party']) {
        var change = true
    }

    if (result1['precinctsreporting'] > 0) {
        var reporting = true;
    }

    return h('tr', {
        key: result1['last'],
        classes: { 
            'called': called,
            'party-change': change,
            'reporting': reporting
        }
    }, [
        h('td.pickup', {
            classes: {
                'winner': winningResult,
                'dem': winningResult && winningResult['party'] === 'dem',
                'gop': winningResult && winningResult['party'] === 'gop'
            }
        }, [
            insertRunoffImage(race)
        ]),
        h('td.state', {
            classes: {
                'winner': winningResult,
                'dem': winningResult && winningResult['party'] === 'Dem',
                'gop': winningResult && winningResult['party'] === 'GOP'
            }
        }, [
            decideLabel(result1, key)
        ]),
        h('td.results-status', [
            Math.round(result1['precinctsreportingpct'] * 100) 
        ]),
        h('td.candidate', {
            class: result1['party'].toLowerCase(),
            classes: {
                'winner': result1['npr_winner']
            }
        }, [
            h('span.fname', [
                result1['first'] ? result1['first'] + ' ' : ''
            ]),
            h('span.lname', [
                result1['last'] + ' '
            ]),
            insertIncumbentImage(result1['incumbent'])
        ]),
        h('td.candidate-total', {
            class: result1['party'].toLowerCase(),
            classes: {
                'winner': result1['npr_winner']
            }
        }, [
            h('span.candidate-total-wrapper', {
                updateAnimation: onUpdateAnimation
            }, [
                Math.round(result1['votepct'] * 100)
            ])
        ]),
        h('td.candidate-total-spacer'),
        h('td.candidate-total', {
            class: result2['party'].toLowerCase(),
            classes: {
                'winner': result2['npr_winner']
            }
        }, [
            h('span.candidate-total-wrapper', {
                updateAnimation: onUpdateAnimation
            }, [
                result2 ? Math.round(result2['votepct'] * 100) : 0
            ])
        ]),
        h('td.candidate', {
            class: result2['party'].toLowerCase(),
            classes: {
                'winner': result2['npr_winner']
            }
        }, [
            h('span.fname', [
                result2 ? result2['first'] : ''
            ]),
            ' ',
            h('span.lname', [
                result2 ? result2['last'] : ''
            ]),
            ' ',
            insertIncumbentImage(result2['incumbent'])
        ])
    ])
}

const determineResults = function(race) {
    let result1;
    let result2;
    for (var i = 0; i <= 1; i++) {
        var results = [race[0], race[1]];
        var result = results[i];
        if (result['party'] === 'Dem' && !result1) {
            result1 = race[i];
        } else if (result['party'] === 'GOP' && !result2) {
            result2 = race[i];
        }
    }

    // handle the case where there are two GOP results to show
    if (!result1 && race[0] !== result2) {
        result1 = race[0]
    } else if (!result1 && race[0] !== result1) {
        result1 = race[1]
    }

    if (!result2) {
        result2 = race[1];
    }

    // if we have the same party, ensure we order by votepct
    if (result1['party'] === result2['party']) {
        var sortedResults = [result1, result2].sort(function(a, b) {
            return b['votepct'] - a['votepct'];
        })
    } else {
        var sortedResults = [result1, result2];
    }

    return sortedResults;
}

const decideLabel = function(race, key) {
    if (race['officename'] == 'U.S. House') {
        return race['statepostal'] + '-' + race['seatnum'];
    } else if (race['officename'] === 'President') {
        return key; 
    } else if (race['is_ballot_measure'] === true) {
        return race['statepostal'] + '-' + race['seatname']; 
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