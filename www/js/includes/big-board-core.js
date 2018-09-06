// npm libraries
import { h, createProjector } from 'maquette';
import request from 'superagent';
import { buildDataURL } from './helpers.js';

// global vars
let dataURL = null;
let bopDataURL = null;
let lastRequestTime = '';
let lastBopRequestTime = '';
let boardTitle = null;
let resultsData = null;
let bopData = null;
let lastUpdated = null;

const boardWrapper = document.querySelector('.board');
const projector = createProjector();
const coloredParties = ['Dem', 'GOP', 'Yes', 'No'];

/*
* Initialize the graphic.
*/
function initBigBoard (filename, boardName, boardClass) {
  boardTitle = boardName;
  boardWrapper.classList.add(boardClass);

  bopDataURL = buildDataURL('top-level-results.json');
  dataURL = buildDataURL(filename);
  projector.append(boardWrapper, renderMaquette);
  getInitialData();

  setInterval(getBopData, 5000);
  setInterval(getData, 5000);
}

const getInitialData = function () {
  request.get(bopDataURL)
    .end(function (err, res) {
      if (err) { throw err; }
      if (res.body) {
        bopData = res.body;
        lastBopRequestTime = new Date().toUTCString();
      }
      request.get(dataURL)
        .end(function (err, res) {
          if (err) { throw err; }
          if (res.body) {
            lastRequestTime = new Date().toUTCString();
            resultsData = sortData(res.body.results);
            lastUpdated = res.body.last_updated;
            projector.scheduleRender();
          }
        });
    });
};

const getData = function () {
  request.get(dataURL)
    .set('If-Modified-Since', lastRequestTime)
    .end(function (err, res) {
      // Superagent takes anything outside of `200`-class responses to be errors
      if (err && ((res && res.statusCode !== 304) || !res)) { throw err; }
      if (res.body) {
        lastRequestTime = new Date().toUTCString();
        resultsData = sortData(res.body.results);
        lastUpdated = res.body.last_updated;
        projector.scheduleRender();
      }
    });
};

const getBopData = function () {
  request.get(bopDataURL)
    .set('If-Modified-Since', lastBopRequestTime)
    .end(function (err, res) {
      // Superagent takes anything outside of `200`-class responses to be errors
      if (err && ((res && res.statusCode !== 304) || !res)) { throw err; }
      if (res.body) {
        lastBopRequestTime = new Date().toUTCString();
        bopData = res.body;
        projector.scheduleRender();
      }
    });
};

const sortData = function (resultsData) {
  // sort each race
  for (var bucket in resultsData) {
    for (var race in resultsData[bucket]) {
      resultsData[bucket][race].sort(function (a, b) {
        if (a.npr_winner) return -1;
        if (b.npr_winner) return 1;
        return b.votecount - a.votecount;
      });
    }
  }

  return resultsData;
};

const isBucketedByTime = bucket =>
  bucket.includes(':') &&
  (bucket.includes('a.m.') || bucket.includes('p.m.'));

const renderMaquette = function () {
  if (!resultsData) {
    return h('div.results-wrapper', 'Loading...');
  }

  let numberOfRaces = 0;

  let buckets = [];
  for (let bucket in resultsData) {
    buckets.push(bucket);
    const group = resultsData[bucket];
    numberOfRaces += Object.keys(group).length;
  }

  const sortedBuckets = isBucketedByTime(buckets[0])
    ? buckets.sort(function (a, b) {
      var aHour = parseInt(a.split(':')[0]);
      var bHour = parseInt(b.split(':')[0]);

      if (a.slice(-4) === 'a.m.') return 1;
      if (b.slice(-4) === 'a.m.') return -1;
      if (aHour === bHour && a.indexOf('30') !== -1) return 1;
      if (aHour === bHour && b.indexOf('30') !== -1) return -1;
      else return aHour - bHour;
    })
    : buckets.sort();

  let sortedRacesPerBucket = {};

  for (let bucket in resultsData) {
    let sortedRaces = Object.keys(resultsData[bucket]).sort(function (a, b) {
      const aResult = resultsData[bucket][a][0];
      const bResult = resultsData[bucket][b][0];
      const as = determineSortKey(aResult);
      const bs = determineSortKey(bResult);

      const aState = as.substring(0, 2);
      const bState = bs.substring(0, 2);

      // if we pulled a number off something
      if (aState === bState && as.length > 2 && bs.length > 2) {
        const aID = as.split('-')[1];
        const bID = bs.split('-')[1];
        if (parseInt(aID) && parseInt(bID)) {
          if (parseInt(aID) < parseInt(bID)) {
            return -1;
          }
          if (parseInt(aID) > parseInt(bID)) {
            return 1;
          }
        }
      }

      if (as < bs) return -1;
      if (as > bs) return 1;
      return 0;
    });

    sortedRacesPerBucket[bucket] = sortedRaces;
  }

  const breakingIndex = Math.ceil(numberOfRaces / 2);
  let raceIndex = 0;
  let firstColumn = {};
  let secondColumn = {};
  let selectedColumn = firstColumn;

  sortedBuckets.forEach(function (bucket) {
    const group = resultsData[bucket];
    sortedRacesPerBucket[bucket].map(function (id) {
      raceIndex += 1;

      if (!selectedColumn[bucket]) {
        selectedColumn[bucket] = [];
      }
      selectedColumn[bucket].push(group[id]);

      if (raceIndex === breakingIndex) {
        selectedColumn = secondColumn;
      }
    });
  });

  let duplicates = diffArrays(Object.keys(firstColumn), Object.keys(secondColumn));

  setTimeout(pymChild.sendHeight, 0);

  return h('div.results-wrapper', [
    h('div.results-header', [
      h('h1', boardTitle),
      bopData ? renderLeaderboard() : ''
    ]),
    h('div.results', {
      classes: {
        'dupe-second-column-header': duplicates.length > 0
      }
    }, [
      renderResultsColumn(firstColumn, 'first'),
      renderResultsColumn(secondColumn, 'last')
    ]),
    h('div.footer', [
      h('p', ['Source: AP ', h('span', [
        '(as of ',
        lastUpdated,
        ' ET)'
      ])
      ])
    ])
  ]);
};

const renderLeaderboard = function () {
  let bop;
  if (boardTitle.indexOf('House') !== -1) {
    bop = bopData['house_bop'];
    return renderCongressBOP(bop);
  } else if (boardTitle.indexOf('Senate') !== -1) {
    bop = bopData['senate_bop'];
    return renderCongressBOP(bop);
  } else {
    return h('div.leaderboard', '');
  }
};

const renderCongressBOP = function (bop) {
  const demSeats = bop['Dem']['seats'];
  const gopSeats = bop['GOP']['seats'];
  const indSeats = bop['Other']['seats'];

  const demPickups = bop['Dem']['pickups'];
  const gopPickups = bop['GOP']['pickups'];
  const indPickups = bop['Other']['pickups'];

  const demNeed = bop['Dem']['needed'];
  const gopNeed = bop['GOP']['needed'];

  const uncalledRaces = bop['uncalled_races'];

  return h('div.leaderboard', [
    h('div.results-header-group.dem', [
      h('h2.party', [ 'Dem.: ' + demSeats ]),
      h('p.detail', [
        'Net gains: ',
        h('span.change.party', demPickups > 0 ? '+' + demPickups : demPickups),
        h('br'),
        'Need: ',
        h('span.needed.party', demNeed)
      ])
    ]),
    h('div.results-header-group.gop', [
      h('h2.party', 'GOP: ' + gopSeats),
      h('p.detail', [
        'Net gains: ',
        h('span.change.party', gopPickups > 0 ? '+' + gopPickups : gopPickups),
        h('br'),
        'Need: ',
        h('span.needed.party', gopNeed)
      ])
    ]),
    h('div.results-header-group.other', [
      h('h2.party', 'Ind.: ' + indSeats),
      h('p.detail', [
        'Net gains: ',
        h('span.change.party', indPickups > 0 ? '+' + indPickups : indPickups)
      ])
    ]),
    h('div.results-header-group.not-called', [
      h('h2.party', [
        'Not Yet',
        h('br'),
        'Called: ' + uncalledRaces
      ])
    ])
  ]);
};

const renderResultsColumn = function (column, orderClass) {
  const className = 'column ' + orderClass;
  if (resultsData) {
    return h('div', {
      key: orderClass,
      class: className
    }, [
      Object.keys(column).map(key => renderResultsTable(key, column))
    ]);
  } else {
    return h('div', {
      key: 'init'
    });
  }
};

const renderResultsTable = function (key, column) {
  if (column.hasOwnProperty(key)) {
    var races = column[key];
  }

  if (races) {
    return [
      h('h2.bucketed-group', h(
        'span',
        isBucketedByTime(key)
          ? key + ' ET'
          : key
      )),
      h('table.races', [
        h('thead', { class: 'screen-reader-only' }, [
          h('tr', [
            h('th', { scope: 'col', class: 'pickup' }, 'Pick-up?'),
            h('th', { scope: 'col' }, 'Name'),
            h('th', { scope: 'col' }, 'Percent reported'),
            h('th', { scope: 'col' }, 'Candidate one name'),
            h('th', { scope: 'col' }, 'Candidate one vote percent'),
            h('th', { scope: 'col' }, ''),
            h('th', { scope: 'col' }, 'Candidate two vote percent'),
            h('th', { scope: 'col' }, 'Candidate two name'),
          ]),
        ]),
        races.map(race => renderRace(race))
      ])
    ];
  } else {
    return '';
  }
};

const createClassesForBoardCells = result => {
  return {
    'winner': result.npr_winner,
    'dem': result.party === 'Dem',
    'gop': result.party === 'GOP',
    'yes': result.party === 'Yes',
    'no': result.party === 'No',
    'other': !coloredParties.includes(result.party) && result.party !== 'Uncontested',
    'uncontested': result.party === 'Uncontested',
    'incumbent': result.incumbent
  };
};

const renderRace = function (race) {
  let uncontested = (race.length === 1);

  const results = determineResults(race);
  const result1 = results[0];
  const result2 = results[1];

  let winningResult;
  if (result1['npr_winner']) {
    winningResult = result1;
  } else if (result2['npr_winner']) {
    winningResult = result2;
  }

  if (winningResult) {
    var called = true;
  }

  if (winningResult && result1['meta']['current_party'] && winningResult['party'] !== result1['meta']['current_party']) {
    var change = true;
  }

  if ((result1['votecount'] > 0 || result2['votecount'] > 0) || called) {
    var reporting = true;
  }

  return h('tr', {
    key: result1['last'],
    classes: {
      called,
      'party-change': change,
      reporting,
      uncontested
    }
  }, [
    h('td.pickup', {
      classes: {
        'winner': winningResult,
        'dem': winningResult && winningResult['party'] === 'Dem',
        'gop': winningResult && winningResult['party'] === 'GOP',
        'ind': winningResult && winningResult['party'] === 'Ind'
      }
    }, [
      insertRunoffImage(race)
    ]),
    h('th.state', {
      scope: 'row',
      classes: {
        'winner': winningResult,
        'dem': winningResult && winningResult['party'] === 'Dem',
        'gop': winningResult && winningResult['party'] === 'GOP',
        'ind': winningResult && coloredParties.indexOf(winningResult['party']) < 0
      }
    }, [
      decideLabel(result1)
    ]),
    uncontested ? h('td') : h('td.results-status', [
      calculatePrecinctsReporting(result1['precinctsreportingpct'])
    ]),
    h('td.candidate', { classes: createClassesForBoardCells(result1) }, [
      h('span.fname', [
        result1['first'] ? result1['first'] + ' ' : ''
      ]),
      h('span.lname', [
        result1['last']
      ])
    ]),
    h('td.candidate-total', { classes: createClassesForBoardCells(result1) }, [
      uncontested ? '' : h('span.candidate-total-wrapper', {
        updateAnimation: onUpdateAnimation
      }, [ Math.round(result1['votepct'] * 100) ])
    ]),
    h('td.candidate-total-spacer'),
    h('td.candidate-total', { classes: createClassesForBoardCells(result2) }, [
      uncontested ? '' : h('span.candidate-total-wrapper', {
        updateAnimation: onUpdateAnimation
      }, [ Math.round(result2['votepct'] * 100) ])
    ]),
    h('td.candidate', { classes: createClassesForBoardCells(result2) }, [
      h('span.fname', [
        result2 ? result2['first'] : ''
      ]),
      ' ',
      h('span.lname', [
        result2 ? result2['last'] : ''
      ])
    ])
  ]);
};

const determineResults = function (race) {
  // Create a fake 'uncontested' candidate when necessary
  if (race.length === 1) {
    race = race.concat(Object.assign(
      {},
      // Borrow the race metadata from the real candidate
      race[0],
      {
        first: '',
        last: 'uncontested',
        party: 'Uncontested',
        incumbent: false,
        npr_winner: false
      }
    ));
  }

  let result1;
  let result2;
  let loopArr;
  if (race[0]['precinctsreportingpct'] <= 0) {
    loopArr = race;
  } else {
    loopArr = [race[0], race[1]];
  }

  for (var i = 0; i < loopArr.length; i++) {
    var result = loopArr[i];
    if ((result['party'] === 'Dem' || result['party'] === 'Yes') && !result1) {
      result1 = result;
    } else if ((result['party'] === 'GOP' || result['party'] === 'No') && !result2) {
      result2 = result;
    }

    if (result1 && result2) {
      break;
    }
  }

  // handle the case where there are two GOP results to show
  if (!result1 && race[0] !== result2) {
    result1 = race[0];
  } else if (!result1 && race[0] !== result1) {
    result1 = race[1];
  }

  if (!result2) {
    result2 = race[1];
  }

  // if we have the same party, ensure we order by votepct
  let sortedResults;
  if (result1['party'] === result2['party']) {
    sortedResults = [result1, result2].sort(function (a, b) {
      return b['votepct'] - a['votepct'];
    });
  } else {
    sortedResults = [result1, result2];
  }

  return sortedResults;
};

const calculatePrecinctsReporting = function (pct) {
  if (pct > 0 && pct < 0.005) {
    return '<1';
  } else if (pct > 0.995 && pct < 1) {
    return '>99';
  } else {
    return Math.round(pct * 100);
  }
};

const decideLabel = function (race) {
  if (race['officename'] === 'U.S. House') {
    return race['statepostal'] + '-' + race['seatnum'];
  } else if (race['is_ballot_measure'] === true) {
    return race['statepostal'] + '-' + race['seatname'];
  } else {
    return race['statepostal'];
  }
};

const insertRunoffImage = function (race) {
  let runoff = false;
  race.forEach(function (result) {
    if (result['runoff'] === true) {
      runoff = true;
    }
  });

  if (runoff) {
    return h('img.img-responsive', {
      src: '../assets/runoff.svg'
    });
  } else {
    return '';
  }
};

const onUpdateAnimation = function (domNode, properties, previousProperties) {
  const parent = domNode.parentNode;

  // add class to the parent row
  const parentRow = domNode.parentNode.parentNode;
  parentRow.classList.add('updated');

  let party = '';
  if (parent.classList.contains('dem')) {
    party = 'dem';
  } else if (parent.classList.contains('gop')) {
    party = 'gop';
  } else if (parent.classList.contains('yes')) {
    party = 'yes';
  } else if (parent.classList.contains('no')) {
    party = 'no';
  }
  const sibling = domNode.parentNode.parentNode.querySelector('.candidate.' + party);

  // add class to the affected cells
  parent.classList.add('lighten');
  sibling.classList.add('lighten');

  setTimeout(function () {
    parentRow.classList.remove('updated');
    parent.classList.remove('lighten');
    sibling.classList.remove('lighten');
  }, 2000);
};

const determineSortKey = function (result) {
  if (result.officename === 'U.S. Senate') {
    return result.statepostal;
  } else if (result.officename === 'Governor') {
    return result.statepostal;
  } else if (result.officename === 'U.S. House') {
    return result.statepostal + '-' + result.seatnum;
  } else if (result.is_ballot_measure) {
    return result.statepostal + '-' + result.seatname.split(' - ')[0];
  }
};

const diffArrays = function (arr1, arr2) {
  var ret = [];
  for (var i in arr1) {
    if (arr2.indexOf(arr1[i]) > -1) {
      ret.push(arr1[i]);
    }
  }
  return ret;
};

export {
  initBigBoard,
  renderRace
};
