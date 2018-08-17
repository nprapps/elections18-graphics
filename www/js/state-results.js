// This will be transformed by Babel into only the polyfills that are needed,
// thanks to the `"useBuiltIns": true` option in `.babelrc`
// https://www.npmjs.com/package/babel-preset-env#usebuiltins
import 'babel-polyfill';

import { h, createProjector } from 'maquette';
import {
  sortBy,
  values as getValues,
  without
} from 'underscore';
import request from 'superagent';
import commaNumber from 'comma-number';

import navbar from '../js/includes/navbar.js';
import briefingData from '../data/extra_data/state-briefings.json';
import { getParameterByName, buildDataURL } from './includes/helpers.js';
import { renderRace } from './includes/big-board-core.js';

const resultsWrapper = document.getElementById('state-results');
const projector = createProjector();

const availableMetrics = [
  {
    'name': 'Population',
    'key': 'population',
    'census': true,
    'comma_filter': true
  },
  {
    'name': '2012 Results',
    'key': 'past_margin',
    'census': false
  },
  {
    'name': 'Unemployment',
    'key': 'unemployment',
    'census': false,
    'append': '%'
  },
  {
    'name': '% White',
    'key': 'percent_white',
    'census': true,
    'percent_filter': true
  },
  {
    'name': '% Black',
    'key': 'percent_black',
    'census': true,
    'percent_filter': true
  },
  {
    'name': '% Hispanic',
    'key': 'percent_hispanic',
    'census': true,
    'percent_filter': true
  },
  {
    'name': 'Median Income',
    'key': 'median_income',
    'census': true,
    'comma_filter': true,
    'prepend': '$'
  },
  {
    'name': '% College-Educated',
    'key': 'percent_bachelors',
    'census': true,
    'percent_filter': true
  }
];

let data = null;
let extraData = null;
let dataURL = null;
let extraDataURL = null;
let currentState = null;
let sortMetric = availableMetrics[0];
let descriptions = null;
let dataTimer = null;
let stateName = null;
let statepostal = null;
let statefaceClass = null;
let lastUpdated = null;
let parentScrollAboveIframeTop = null;
let resultsView = 'key';
let resultsType = 'Key Results';
let lastDownballotRequestTime = null;
let raceTypes = [
  'Key',
  'House',
  'Senate',
  'Governor'
];

window.pymChild = null;
/*
* Initialize the graphic.
*/
var onWindowLoaded = function () {
  // init pym and render callback
  window.pymChild = new pym.Child();
  // Keep track of where the user's window is, relative to the top of
  // this `iframe`. This works in conjunction with Pym scroll-tracking:
  // http://blog.apps.npr.org/pym.js/#optional-scroll-tracking
  window.pymChild.onMessage('viewport-iframe-position', parentInfo => {
    parentScrollAboveIframeTop = parentInfo.split(' ')[2];
  });

  currentState = getParameterByName('state').toLowerCase();
  descriptions = briefingData.descriptions.find(function (el) {
    return el.state_postal === currentState;
  });

  const dataFilename = currentState + '.json';
  dataURL = buildDataURL(dataFilename);
  extraDataURL = '../data/extra_data/' + currentState + '-extra.json';
  getExtraData();
  dataTimer = setInterval(getData, 5000);
};

const getData = function (forceReload) {
  var requestTime = forceReload ? lastDownballotRequestTime : '';

  request.get(dataURL)
    .set('If-Modified-Since', requestTime || '')
    .end(function (err, res) {
      if (res.body) {
        if (err) { throw err; }

        lastDownballotRequestTime = new Date().toUTCString();

        data = res.body.results;

        // Remove tabs from navigation if that race type isn't present
        // Only perform this removal if the standard state file was loaded;
        // county-level files won't be aware of which race types are available
        if (data.senate && data.house) {
          if (Object.keys(data.senate.results).length === 0) {
            raceTypes = without(raceTypes, 'Senate');
          }
          if (Object.keys(data.governor.results).length === 0) {
            raceTypes = without(raceTypes, 'Governor');
          }
        }

        lastUpdated = res.body.last_updated;
        projector.resume();
        projector.scheduleRender();
      }
    });
};

const getExtraData = function () {
  request.get(extraDataURL)
    .end(function (err, res) {
      if (err) { throw err; }
      extraData = res.body;
      projector.append(resultsWrapper, renderMaquette);
    });
};

const sortCountyResults = function () {
  let values = [];

  for (let fipscode in extraData) {
    let sorter;
    if (sortMetric['census']) {
      sorter = extraData[fipscode].census[sortMetric['key']];
    } else {
      sorter = extraData[fipscode][sortMetric['key']];
    }
    values.push([fipscode, sorter]);
  }

  values.sort(function (a, b) {
    if (sortMetric['key'] === 'past_margin') {
      // always put Democratic wins on top
      if (a[1][0] === 'D' && b[1][0] === 'R') return -1;
      if (a[1][0] === 'R' && b[1][0] === 'D') return 1;

      const aMargin = parseInt(a[1].split('+')[1]);
      const bMargin = parseInt(b[1].split('+')[1]);

      // if Republican, sort in ascending order
      // if Democratic, sort in descending order
      if (a[1][0] === 'R') {
        return aMargin - bMargin;
      } else {
        return bMargin - aMargin;
      }
    }

    return b[1] - a[1];
  });

  return values;
};

const renderMaquette = function () {
  setTimeout(pymChild.sendHeight, 0);

  if (data && extraData) {
    if (!stateName && !statepostal && !statefaceClass) {
      // Pull the state metadata from a candidate object
      // House races will always have a candidate, so use those
      const anyHouseRaceID = Object.keys(data['house']['results'])[0];
      const anyHouseCandidate = data['house']['results'][anyHouseRaceID][0];

      stateName = anyHouseCandidate.statename;
      statepostal = anyHouseCandidate.statepostal;
      statefaceClass = 'stateface-' + statepostal.toLowerCase();
    }

    return h('div.results', [
      h('header#state-header', [
        h('div.state-icon', [
          h('i.stateface', {
            class: statefaceClass
          })
        ]),
        h('h1', [
          h('span.state-name', [
            stateName
          ]),
          resultsType
        ]),
        renderTabSwitcher()
      ]),
      renderResults(),
      h('div.footer', [
        h('p.sources', [
          'Sources: Current results from AP',
          ' ',
          h('span.timestamp', [
            '(as of ',
            lastUpdated,
            ' ET).'
          ]),
          ' ',
          'Unemployment numbers from the Bureau of Labor Statistics (2015). Other statistics from the Census Bureau (American Community Survey 5-year estimates). Median Income numbers are taken from ',
          h('a', {
            href: 'https://censusreporter.org/tables/B19013/',
            target: '_blank'
          }, 'Median Household Income.'),
          ' Percent White numbers are taken from ',
          h('a', {
            href: 'https://censusreporter.org/tables/B03002/',
            target: '_blank'
          }, 'Hispanic or Latino Origin by Race'),
          ' to find the percentage of non-Hispanic White people. ',
          'Percent College Educated is a calculation of all citizens ages 18 or older with a bachelor\'s degree or higher, taken from ',
          h('a', {
            href: 'https://censusreporter.org/tables/B15001/',
            target: '_blank'
          }, 'Sex by Age by Educational Attainment.')
        ])
      ])
    ]);
  } else {
    getData();
    return h('div.results', 'Loading...');
  }
};

const renderTabSwitcher = () => {
  // Create the tab switcher, between different race types
  // For styling on the page, these links will be split by a delimiter
  const DELIMITER = '|';

  const elements = raceTypes.map(tab =>
    h(
      'span',
      {
        onclick: switchResultsView,
        name: tab.toLowerCase(),
        classes: { active: resultsView === tab.toLowerCase() }
      },
      [tab]
    )
  );
  const delimited = elements.reduce((all, el, index) => {
    return index < elements.length - 1
      ? all.concat([el, DELIMITER])
      : all.concat(el);
  }, []);

  return h(
    'div.switcher',
    {},
    [
      'Election results: ',
      ...delimited
    ]
  );
};

const renderMiniBigBoard = (title, races, linkRaceType, linkText) => h(
  // Render a big-board-like element for a particular race type
  'div.board',
  { classes: { hidden: races.length === 0 } },
  [
    h('h2', title),
    // Some race types don't have a link to anywhere
    linkRaceType ? h(
      'button',
      {
        name: linkRaceType,
        onclick: switchResultsView
      },
      linkText
    ) : '',
    h('div.results-wrapper', [
      h('div.results', [
        h('div.column', [
          h('table.races', [
            races
              // Ignore any races where a single candidate runs unopposed
              .filter(race => race.length > 1)
              // Trim the race down to just the top two candidates
              .map(race => renderRace(race.slice(0, 2)))
          ])
        ])
      ])
    ])
  ]
);

const renderResults = function () {
  // Render race data elements, depending on which race-type tab is active
  let resultsElements;
  if (resultsView === 'key') {
    // Avoid showing too few (or no) House races, especially for small states
    const SHOW_ONLY_KEY_HOUSE_RACES_IF_MORE_THAN_N_DISTRICTS = 5;

    resultsElements = h('div', [
      h('h2', {classes: { hidden: !descriptions.state_desc }}, 'State Briefing'),
      h('p', descriptions.state_desc),
      renderMiniBigBoard('Senate', getValues(data.senate.results), 'senate', 'County-level results >'),
      renderMiniBigBoard('Governor', getValues(data.governor.results), 'governor', 'County-level results >'),
      Object.keys(data.house.results) > SHOW_ONLY_KEY_HOUSE_RACES_IF_MORE_THAN_N_DISTRICTS
        ? renderMiniBigBoard(
          'Key House Races',
          // TO-DO: Filter this down to key races, somehow
          sortBy(getValues(data.house.results).filter(race => true), race => parseInt(race[0].seatnum)),
          'house',
          'All House results >'
        )
        : renderMiniBigBoard(
          'House Races',
          sortBy(getValues(data.house.results), race => parseInt(race[0].seatnum)),
          'house',
          'Detailed House results >'
        ),
      renderMiniBigBoard(
        'Key Ballot Initiatives',
        sortBy(getValues(data.ballot_measures.results), race => race[0].seatname.split(' - ')[0])
      )
    ]);
  } else if (resultsView === 'house') {
    const sortedHouseKeys = Object.keys(data['house']['results']).sort(function (a, b) {
      return data['house']['results'][a][0]['seatnum'] - data['house']['results'][b][0]['seatnum'];
    });

    resultsElements = h('div.results-house', {
      classes: {
        'one-result': Object.keys(data['house']['results']).length === 1,
        'two-results': Object.keys(data['house']['results']).length === 2,
        'three-results': Object.keys(data['house']['results']).length === 3,
        'four-results': Object.keys(data['house']['results']).length === 4
      }
    }, [
      h('div.results-wrapper', [
        sortedHouseKeys.map(race => renderHouseTable(data['house']['results'][race]))
      ])
    ]);
  } else if (resultsView === 'senate' || resultsView === 'governor') {
    // Render a statewide table, and then below it a county-level table
    const sortedStateResults = data.state
      .filter(c => !(c.first === '' && c.last === 'Other'))
      .sort((a, b) => b['votecount'] - a['votecount']);
    const sortKeys = sortCountyResults();
    const availableCandidates = sortedStateResults.map(c => c.last);

    if (resultsView === 'senate') {
      resultsElements = renderSenateTable(data.state);
    } else {
      resultsElements = renderGovTable(data.state);
    }

    resultsElements = [resultsElements].concat([
      h('div.results-counties', {
        classes: {
          'population': sortMetric['key'] === 'population',
          'past-results': sortMetric['key'] === 'past_margin',
          'unemployment': sortMetric['key'] === 'unemployment',
          'percent-white': sortMetric['key'] === 'percent_white',
          'percent-black': sortMetric['key'] === 'percent_black',
          'percent-hispanic': sortMetric['key'] === 'percent_hispanic',
          'median-income': sortMetric['key'] === 'median_income',
          'percent-college-educated': sortMetric['key'] === 'percent_bachelors'
        }
      }, [
        h('h2.section-title', descriptions.county_desc ? ['Counties To Watch', h('i.icon.icon-star')] : 'Results By County'),
        h('p', {
          innerHTML: descriptions.county_desc ? descriptions.county_desc : ''
        }),
        h('ul.sorter', [
          h('li.label', 'Sort Counties By'),
          availableMetrics.map(metric => renderMetricLi(metric))
        ]),
        h('table.results-table', [
          h('thead', [
            h('tr', [
              h('th.county', h('div', h('span', 'County'))),
              h('th.amt.precincts', h('div', h('span', ''))),
              availableCandidates.map(cand => renderCandidateTH(cand)),
              h('th.vote.margin', h('div', h('span', '2016 Margin'))),
              h('th.comparison', h('div', h('span', sortMetric['name'])))
            ])
          ]),
          sortKeys.map(key => renderCountyRow(data[key[0]], key[0], availableCandidates))
        ])
      ])
    ]);
  }

  return h('div', [resultsElements]);
};

const renderMetricLi = function (metric) {
  if (metric.name === '% College-Educated') {
    return h('li.sortButton', {
      onclick: onMetricClick,
      classes: {
        'selected': metric === sortMetric
      }
    }, h('span.metric', [metric['name']]));
  } else {
    return h(
      'li.sortButton', {
        onclick: onMetricClick,
        classes: {
          'selected': metric === sortMetric
        }
      },
      [
        h('span.metric', [metric['name']]), h('span.pipe', ' | ')
      ]
    );
  }
};

const renderCandidateTH = function (candidate) {
  return h('th.vote', {
    classes: {
      'dem': candidate === 'Clinton',
      'gop': candidate === 'Trump',
      'ind': ['Johnson', 'McMullin', 'Stein'].indexOf(candidate) !== -1
    }
  }, h('div', h('span', candidate)));
};

const renderCountyRow = function (results, key, availableCandidates) {
  if (key === 'state') {
    return '';
  }

  const keyedResults = availableCandidates.reduce((obj, lastName) => {
    obj[lastName] = results.find(c => c.last === lastName);
    return obj;
  }, {});

  const winner = determineWinner(keyedResults);

  let extraMetric;
  if (sortMetric['census']) {
    extraMetric = extraData[results[0].fipscode].census[sortMetric['key']];
  } else {
    extraMetric = extraData[results[0].fipscode][sortMetric['key']];
  }

  if (sortMetric['comma_filter']) {
    extraMetric = commaNumber(extraMetric);
  }

  if (sortMetric['percent_filter']) {
    extraMetric = (extraMetric * 100).toFixed(1) + '%';
  }

  if (sortMetric['prepend']) {
    extraMetric = sortMetric['prepend'] + extraMetric;
  }

  if (sortMetric['append']) {
    extraMetric = extraMetric.toFixed(1) + sortMetric['append'];
  }

  return h('tr', [
    h('td.county', [
      results[0].reportingunitname,
      h('span.precincts.mobile', [calculatePrecinctsReporting(results[0]) + '% in'])
    ]),
    h('td.amt.precincts', [calculatePrecinctsReporting(results[0]) + '% in']),
    availableCandidates.map(key => renderCountyCell(keyedResults[key], winner)),
    h('td.vote.margin', calculateVoteMargin(keyedResults)),
    h('td.comparison', extraMetric)
  ]);
};

const renderCountyCell = function (result, winner) {
  return h('td.vote', {
    classes: {
      'dem': result.party === 'Dem',
      'gop': result.party === 'GOP',
      'ind': ['Dem', 'GOP'].indexOf(result.party) === -1,
      'winner': winner === result
    }
  }, [(result.votepct * 100).toFixed(1) + '%']);
};

const determineWinner = function (keyedResults) {
  let winner = null;
  let winningPct = 0;
  for (var key in keyedResults) {
    let result = keyedResults[key];

    if (result.precinctsreportingpct < 1) {
      return winner;
    }

    if (result.votepct > winningPct) {
      winningPct = result.votepct;
      winner = result;
    }
  }

  return winner;
};

const calculateVoteMargin = function (keyedResults) {
  let winnerVotePct = 0;
  let winner = null;
  for (let key in keyedResults) {
    let result = keyedResults[key];

    if (result.votepct > winnerVotePct) {
      winnerVotePct = result.votepct;
      winner = result;
    }
  }

  if (!winner) {
    return '';
  }
  let winnerMargin = 100;
  for (let key in keyedResults) {
    let result = keyedResults[key];

    if (winner.votepct - result.votepct < winnerMargin && winner !== result) {
      winnerMargin = winner.votepct - result.votepct;
    }
  }

  let prefix;
  if (winner.party === 'Dem') {
    prefix = 'D';
  } else if (winner.party === 'GOP') {
    prefix = 'R';
  } else {
    prefix = 'I';
  }

  return prefix + ' +' + Math.round(winnerMargin * 100);
};

const renderSenateTable = function (results) {
  let totalVotes = 0;
  for (var i = 0; i < results.length; i++) {
    totalVotes += results[i].votecount;
  }

  if (results.length > 2) {
    results = sortResults(results);
  }

  return h('div.results-senate', [
    h('table.results-table', [
      h('thead', [
        h('tr', [
          h('th.candidate', 'Candidate'),
          h('th.amt', 'Votes'),
          h('th.amt', 'Percent')
        ])
      ]),
      h('tbody', [
        results.map(key => renderRow(key))
      ]),
      h('tfoot', [
        h('tr', [
          h('td.candidate', 'Total'),
          h('td.amt', commaNumber(totalVotes)),
          h('td.amt', '100%')
        ])
      ])
    ]),
    h('p.precincts', [calculatePrecinctsReporting(results[0]) + '% of precincts reporting (' + commaNumber(results[0].precinctsreporting) + ' of ' + commaNumber(results[0].precinctstotal) + ')'])
  ]);
};

const renderHouseTable = function (results) {
  let seatName = results[0].seatname;
  let totalVotes = 0;
  for (var i = 0; i < results.length; i++) {
    totalVotes += results[i].votecount;
  }

  if (results.length > 2) {
    results = sortResults(results);
  }

  return h('div.house-race', [
    h('table.results-table', [
      h('caption', seatName),
      h('thead', [
        h('tr', [
          h('th.candidate', 'Candidate'),
          h('th.amt', 'Votes'),
          h('th.amt', 'Percent')
        ])
      ]),
      h('tbody', [
        results.map(result => renderRow(result))
      ]),
      h('tfoot', [
        h('tr', [
          h('td.candidate', 'Total'),
          h('td.amt', commaNumber(totalVotes)),
          h('td.amt', '100%')
        ])
      ])
    ]),
    h('p.precincts', [calculatePrecinctsReporting(results[0]) + '% of precincts reporting (' + commaNumber(results[0].precinctsreporting) + ' of ' + commaNumber(results[0].precinctstotal) + ')'])
  ]);
};

const renderRow = function (result) {
  let party = result.party ? '(' + result.party + ')' : '';
  let candidate = result.is_ballot_measure ? result.party : result.first + ' ' + result.last + ' ' + party;

  return h('tr', {
    classes: {
      'winner': result['npr_winner'],
      'dem': result['npr_winner'] && result['party'] === 'Dem',
      'gop': result['npr_winner'] && result['party'] === 'GOP',
      'ind': result['npr_winner'] && ['Dem', 'GOP'].indexOf(result['party']) === -1,
      'yes': result['npr_winner'] && result['party'] === 'Yes',
      'no': result['npr_winner'] && result['party'] === 'No',
      'hidden': result['last'] === 'Other' && result['votecount'] === 0
    }
  }, [
    h('td.candidate', [
      candidate,
      h('i.icon', {
        classes: {
          'icon-ok': result.npr_winner
        }
      })
    ]),
    h('td.amt', commaNumber(result.votecount)),
    h('td.amt', (result.votepct * 100).toFixed(1) + '%')
  ]);
};

const renderGovTable = function (results) {
  let totalVotes = 0;
  for (var i = 0; i < results.length; i++) {
    totalVotes += results[i].votecount;
  }

  if (results.length > 2) {
    results = sortResults(results);
  }

  return h('div.results-gubernatorial', [
    h('table.results-table', [
      h('thead', [
        h('tr', [
          h('th.candidate', 'Candidate'),
          h('th.amt', 'Votes'),
          h('th.amt', 'Percent')
        ])
      ]),
      h('tbody', [
        results.map(key => renderRow(key))
      ]),
      h('tfoot', [
        h('tr', [
          h('td.candidate', 'Total'),
          h('td.amt', commaNumber(totalVotes)),
          h('td.amt', '100%')
        ])
      ])
    ]),
    h('p.precincts', [calculatePrecinctsReporting(results[0]) + '% of precincts reporting (' + commaNumber(results[0].precinctsreporting) + ' of ' + commaNumber(results[0].precinctstotal) + ')'])
  ]);
};

const onMetricClick = function (e) {
  for (var i = 0; i < availableMetrics.length; i++) {
    if (availableMetrics[i]['name'] === e.target.innerHTML) {
      sortMetric = availableMetrics[i];
      ANALYTICS.trackEvent('county-sort-click', availableMetrics[i]['name']);
    }
  }
};

const onRatingClick = function (e) {
  const domain = navbar.parseParentURL();
  if (e.target.tagName === 'A' && pymChild && (domain === 'npr.org' || domain === 'localhost')) {
    pymChild.sendMessage('pjax-navigate', e.target.href);
    e.preventDefault();
    e.stopPropagation();
  }
};

const toTitleCase = str => {
  // Sourced from Sonya Moisset
  // https://gist.github.com/SonyaMoisset/aa79f51d78b39639430661c03d9b1058
  str = str.toLowerCase().split(' ');
  for (var i = 0; i < str.length; i++) {
    str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
  }
  return str.join(' ');
};

const switchResultsView = function (e) {
  // Switch which results tab is being displayed
  projector.stop();

  resultsView = e.target.getAttribute('name');
  resultsType = `${toTitleCase(resultsView)} Results`;

  let dataFilename;
  if (resultsView === 'senate' || resultsView === 'governor') {
    dataFilename = `${currentState}-counties-${resultsView}.json`;
  } else {
    dataFilename = currentState + '.json';
  }
  dataURL = buildDataURL(dataFilename);

  clearInterval(dataTimer);
  getData(true);
  dataTimer = setInterval(getData, 5000);

  // When switching tabs, if the user is below the header then
  // scroll back up to the top of the header. Otherwise, they're
  // stuck in the middle of a results view.
  const headerHeight = document.getElementById('state-header').offsetHeight;
  if (parentScrollAboveIframeTop < -headerHeight) {
    window.pymChild.scrollParentTo('state-results');
  }
};

const sortResults = function (results) {
  results.sort(function (a, b) {
    if (a.last === 'Other') return 1;
    if (b.last === 'Other') return -1;
    if (a.votecount > 0 || a.precinctsreporting > 0) {
      return b.votecount - a.votecount;
    } else {
      if (a.last < b.last) return -1;
      if (a.last > b.last) return 1;
      return 0;
    }
  });
  return results;
};

function calculatePrecinctsReporting (result) {
  var pct = result.precinctsreportingpct;
  var reporting = result.precinctsreporting;
  var total = result.precinctstotal;

  var pctFormatted = (pct * 100).toFixed(1);
  if (pctFormatted === 0 && reporting > 0) {
    return '<0.1';
  } else if (pctFormatted === 100 && reporting < total) {
    return '>99.9';
  } else if (pctFormatted === 100 && reporting === total) {
    return 100;
  } else {
    return pctFormatted;
  }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
