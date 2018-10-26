// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins
// However, these Babel polyfills only cover ECMAScript, so some additional
// polyfills are needed for browser-provided functionality
import 'promise-polyfill/src/polyfill';
import 'whatwg-fetch';

import { h, createProjector } from 'maquette';
import sortBy from 'lodash.sortby';
import getValues from 'lodash.values';
import without from 'lodash.without';
import commaNumber from 'comma-number';

import './includes/analytics.js';
import '../js/includes/navbar.js';
import copyContent from './includes/copy.content.js';
import {
  buildDataURL,
  getParameterByName,
  toTitleCase
} from './includes/helpers.js';
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
    'name': '2016 Presidential Margin',
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

const STATES_WITHOUT_COUNTY_INFO = [ 'AK' ];
const NEW_ENGLAND_STATES = ['ME', 'NH', 'VT', 'MA', 'CT', 'RI'];

let data = null;
let extraData = null;
let dataURL = null;
let extraDataURL = null;
let currentState = null;
let sortMetric = availableMetrics[0];
let dataTimer = null;
let stateName = null;
let statepostal = null;
let statefaceClass = null;
let parentScrollAboveIframeTop = null;
let resultsView = 'key';
let resultsType = 'Key Results';
let lastDownballotRequestTime = '';
let raceTypes = [
  'Key',
  'House',
  'Senate',
  'Senate Special',
  'Governor'
];

/*
* Initialize the graphic.
*/
var onWindowLoaded = function () {
  // init pym and render callback
  window.pymChild = new window.pym.Child();
  // Keep track of where the user's window is, relative to the top of
  // this `iframe`. This works in conjunction with Pym scroll-tracking:
  // http://blog.apps.npr.org/pym.js/#optional-scroll-tracking
  window.pymChild.onMessage('viewport-iframe-position', parentInfo => {
    parentScrollAboveIframeTop = parentInfo.split(' ')[2];
  });

  currentState = getParameterByName('state').toLowerCase();

  const dataFilename = currentState + '.json';
  dataURL = buildDataURL(dataFilename);
  extraDataURL = '../data/extra_data/' + currentState + '-extra.json';
  getExtraData();
  dataTimer = setInterval(getData, 5000);
};

const getData = function (forceReload) {
  window.fetch(
    dataURL,
    {
      headers: {
        'If-Modified-Since': forceReload ? '' : lastDownballotRequestTime
      }
    }
  ).then(res => {
    if (res.status === 304) {
      // There is no body to decode in a `304` response
      return new Promise(() => null);
    } else if (res.ok) {
      return res.json();
    } else {
      throw Error(res.statusText);
    }
  }).then(res => {
    lastDownballotRequestTime = new Date().toUTCString();

    if (res) {
      data = res.results;

      // Remove tabs from navigation if that race type isn't present
      // Only perform this removal if the standard state file was loaded;
      // county-level files won't be aware of which race types are available
      if (data.senate && data.house) {
        if (Object.keys(data.senate.results).length === 0) {
          raceTypes = without(raceTypes, 'Senate');
          raceTypes = without(raceTypes, 'Senate Special');
        } else if (Object.keys(data.senate.results).length === 1) {
          const isSpecial = data.senate
            .results[Object.keys(data.senate.results)[0]][0]
            .is_special_election;
          if (isSpecial) {
            raceTypes = without(raceTypes, 'Senate');
          } else {
            raceTypes = without(raceTypes, 'Senate Special');
          }
        }

        if (Object.keys(data.governor.results).length === 0) {
          raceTypes = without(raceTypes, 'Governor');
        }
      }

      document.querySelector('#last-updated-timestamp').innerText = res.last_updated;
    }

    projector.resume();
    projector.scheduleRender();
  }).catch(err => console.warn(err));
};

const getExtraData = function () {
  window.fetch(extraDataURL)
    .then(res => {
      if (res.status === 304) {
        // There is no body to decode in a `304` response
        return new Promise(() => null);
      } else if (res.ok) {
        return res.json();
      } else {
        throw Error(res.statusText);
      }
    }).then(res => {
      if (res) {
        extraData = res;
        return projector.append(resultsWrapper, renderMaquette);
      }
    }).catch(err => console.warn(err));
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
  setTimeout(window.pymChild.sendHeight, 0);

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
      renderResults()
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
        role: 'button',
        onclick: switchResultsView,
        name: 'race-type-nav',
        'data-hook': tab.toLowerCase(),
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

const renderMiniBigBoard = (title, boardClass, races, linkRaceType, linkText) => h(
  // Render a big-board-like element for a particular race type
  'div.board',
  { class: getBoardClasses(boardClass, races) },
  [
    h('h2', [ title,
      // Some race types don't have a link to anywhere
      linkRaceType ? h(
        'button',
        {
          name: 'see-more-nav',
          'data-hook': linkRaceType,
          onclick: switchResultsView
        },
        linkText
      ) : '']
    ),
    h('div.results-wrapper', [
      h('div.results', [
        h('div.column', [
          h('table.races', [
            // Trim the race down to just the top two candidates
            races.map(race => renderRace(race.slice(0, 2)))
          ])
        ])
      ])
    ])
  ]
);

const getBoardClasses = function (boardClass, races) {
  var c = [ boardClass ];
  if (races.length === 0) {
    c.push('hidden');
  }
  return c.join(' ');
};

const renderResults = function () {
  // Render race data elements, depending on which race-type tab is active
  let resultsElements;
  if (resultsView === 'key') {
    // Avoid showing too few (or no) House races, especially for small states
    const SHOW_ONLY_KEY_HOUSE_RACES_IF_MORE_THAN_N_DISTRICTS = 10;

    const houseResults = getValues(data.house.results);
    const keyHouseResults = houseResults.filter(race => race[0].meta.key_race);

    const allRaces = []
      .concat(getValues(data.house.results))
      .concat(getValues(data.senate.results))
      .concat(getValues(data.governor.results))
      .concat(getValues(data.ballot_measures.results));
    // Poll-close time is set at a statewide level, so don't worry
    // about which race it's extracted from
    const pollCloseTime = allRaces[0][0].meta.poll_closing;
    const areThereAnyVotesYet = allRaces.some(race => race.some(result =>
      result.votecount > 0 || result.npr_winner
    ));

    const showCountyResults = !STATES_WITHOUT_COUNTY_INFO.includes(allRaces[0][0].statepostal);

    resultsElements = h('div', [
      areThereAnyVotesYet
        ? ''
        : h('p.poll-closing', `Polls close at ${pollCloseTime} ET.`),
      renderMiniBigBoard('Senate', 'senate', getValues(data.senate.results).filter(r => !r[0].is_special_election), 'senate', showCountyResults ? 'County-level results \u203a' : 'Detailed Senate results \u203a'),
      renderMiniBigBoard('Senate Special', 'senate senate-special', getValues(data.senate.results).filter(r => r[0].is_special_election), 'senate special', showCountyResults ? 'County-level results \u203a' : 'Detailed Senate Special results \u203a'),
      renderMiniBigBoard('Governor', 'governor', getValues(data.governor.results), 'governor', showCountyResults ? 'County-level results \u203a' : 'Detailed gubernatorial results \u203a'),
      keyHouseResults.length && Object.keys(data.house.results).length > SHOW_ONLY_KEY_HOUSE_RACES_IF_MORE_THAN_N_DISTRICTS
        ? renderMiniBigBoard(
          'Key House Races',
          'house',
          sortBy(keyHouseResults, race => parseInt(race[0].seatnum)),
          'house',
          'All House results \u203a'
        )
        : renderMiniBigBoard(
          'House Races',
          'house',
          sortBy(houseResults, race => parseInt(race[0].seatnum)),
          'house',
          'Detailed House results \u203a'
        ),
      renderMiniBigBoard(
        'Key Ballot Initiatives',
        'ballot-measures',
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
        sortedHouseKeys.map(race => renderRacewideTable(data['house']['results'][race], 'house-race'))
      ])
    ]);
  } else if (
    resultsView === 'senate' ||
    resultsView === 'senate special' ||
    resultsView === 'governor'
  ) {
    resultsElements = [
      h('h2', 'Statewide Results'),
      renderRacewideTable(
        data.state,
        resultsView === 'senate'
          ? 'results-senate'
          : 'results-gubernatorial'
      )
    ];

    const stateResults = data.state
      .filter(c => !(c.first === '' && c.last === 'Other'));
    if (!STATES_WITHOUT_COUNTY_INFO.includes(stateResults[0].statepostal)) {
      // Render a county-level table below
      const sortKeys = sortCountyResults();
      const availableCandidates = stateResults.map(c => c.last);

      resultsElements = resultsElements.concat(
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
          h('h2', 'Results By County'),
          h('ul.sorter', [
            h('li.label', 'Sort Counties By'),
            availableMetrics.map(metric => renderMetricLi(metric))
          ]),
          h('table', { class: 'results-table candidates-' + availableCandidates.length }, [
            h('thead', [
              h('tr', [
                h('th.county', h('div', h('span', 'County'))),
                h('th.amt.precincts', h('div', h('span', ''))),
                availableCandidates.map(cand => renderCandidateTH(cand)),
                h('th.vote.margin', h('div', h('span', 'Vote margin'))),
                h('th.comparison', h('div', h('span', sortMetric['name'])))
              ])
            ]),
            sortKeys.map(key => renderCountyRow(data[key[0]], key[0], availableCandidates))
          ])
        ])
      );
    }
  }

  return h('div.results-elements', [resultsElements]);
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
  return h('th.vote', h('div', h('span', candidate)));
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
      // Correct issue where New England counties are all-uppercase
      // This will be fixed eventually upstream in Elex, as it's a bug therein
      // https://github.com/newsdev/elex/pull/337
      NEW_ENGLAND_STATES.includes(results[0].statepostal) ? toTitleCase(results[0].reportingunitname) : results[0].reportingunitname,
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
      'ind': !['Dem', 'GOP'].includes(result.party),
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

const renderRacewideTable = function (results, tableClass) {
  if (results.length === 1) {
    return renderUncontestedRace(results[0], tableClass);
  }

  const seatName = results[0].officename === 'U.S. House'
    ? results[0].seatname
    : null;
  let totalVotes = 0;
  for (let i = 0; i < results.length; i++) {
    totalVotes += results[i].votecount;
  }

  if (results.length > 2) {
    results = sortResults(results);
  }

  return h(`div.${tableClass}`, [
    h('table.results-table', [
      seatName ? h('caption', seatName) : '',
      h('colgroup', [
        h('col.seat-status'),
        h('col.candidate'),
        h('col.amt'),
        h('col.amt')
      ]),
      h('thead', [
        h('tr', [
          h('th.seat-info', { scope: 'col' }),
          h('th.candidate', { scope: 'col' }, 'Candidate'),
          h('th.amt', { scope: 'col' }, 'Votes'),
          h('th.amt', { scope: 'col' }, 'Percent')
        ])
      ]),
      h('tbody', [
        results.map(result => renderRow(result))
      ]),
      h('tfoot', [
        h('tr', [
          h('td.seat-status'),
          h('th.candidate', { scope: 'row' }, 'Total'),
          h('td.amt', commaNumber(totalVotes)),
          h('td.amt', '100%')
        ])
      ])
    ]),
    h('p.precincts', [calculatePrecinctsReporting(results[0]) + '% of precincts reporting (' + commaNumber(results[0].precinctsreporting) + ' of ' + commaNumber(results[0].precinctstotal) + ')'])
  ]);
};

const createClassesForCandidateRow = result => {
  return {
    'winner': result['npr_winner'],
    'incumbent': result['incumbent'],
    'dem': result['npr_winner'] && result['party'] === 'Dem',
    'gop': result['npr_winner'] && result['party'] === 'GOP',
    'ind': result['npr_winner'] && !['Dem', 'GOP'].includes(result['party']),
    'yes': result['npr_winner'] && result['party'] === 'Yes',
    'no': result['npr_winner'] && result['party'] === 'No'
  };
};

const renderCandidateName = result => {
  // Handle `Other` candidates, which won't have a `party` property
  const party = result.party ? ` (${result.party})` : '';

  return h(
    'td.candidate', { scope: 'col' },
    [
      h('span.fname', result.first),
      ' ',
      h('span.lname', result.last),
      party,
      result.npr_winner ? h('i.icon', { class: 'icon-ok' }) : ''
    ]
  );
};

const renderUncontestedRace = (result, tableClass) => {
  const seatName = result.officename === 'U.S. House'
    ? result.seatname
    : null;

  return h(`div.${tableClass}`, [
    h('table.results-table', [
      seatName ? h('caption', seatName) : '',
      h('colgroup', [
        h('col.seat-status'),
        h('col.candidate'),
        h('col')
      ]),
      h('thead', [
        h('tr', [
          h('th.seat-status', ''),
          h('th.candidate', 'Candidate'),
          h('th', '')
        ])
      ]),
      h('tbody',
        h('tr', { classes: createClassesForCandidateRow(result) }, [
          h('td.seat-status', [
            result.pickup
              ? h('span.pickup', { class: 'pickup' })
              : ''
          ]),
          renderCandidateName(result),
          h('td.amt.uncontested', 'uncontested')
        ])
      )
    ]),
    h('p.precincts', [ copyContent.ap_uncontested_note ])
  ]);
};

const renderRow = function (result) {
  return h('tr', { classes: createClassesForCandidateRow(result) }, [
    h('td.seat-status', [
      result.pickup
        ? h('span.pickup', { class: 'pickup' })
        : ''
    ]),
    renderCandidateName(result),
    h('td.amt', commaNumber(result.votecount)),
    h('td.amt', (result.votepct * 100).toFixed(1) + '%')
  ]);
};

const onMetricClick = function (e) {
  for (var i = 0; i < availableMetrics.length; i++) {
    if (availableMetrics[i]['name'] === e.target.innerHTML) {
      sortMetric = availableMetrics[i];
      window.ANALYTICS.trackEvent('county-sort-click', availableMetrics[i]['name']);
    }
  }
};

const switchResultsView = function (e) {
  // Switch which results tab is being displayed
  projector.stop();

  resultsView = e.target.getAttribute('data-hook');
  resultsType = `${toTitleCase(resultsView)} Results`;

  let dataFilename;
  if (resultsView === 'senate' || resultsView === 'governor') {
    dataFilename = `${currentState}-counties-${resultsView}.json`;
  } else if (resultsView === 'senate special') {
    dataFilename = `${currentState}-counties-senate-special.json`;
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

  // Track both which tab is switched to, and what element linked to it
  window.ANALYTICS.trackEvent('switch-state-tab', `${resultsView}-via-${e.target.getAttribute('name')}`);
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

// Watch the space bar for elements with 'role="button"',
// per https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Techniques/Using_the_button_role#Keyboard_and_focus
document.body.addEventListener('keyup', function (e) {
  if (e.keyCode === 32 || e.key === ' ') {
    if (document.activeElement.getAttribute('role') === 'button') {
      document.activeElement.click();
    }
  }
});

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.addEventListener('load', onWindowLoaded);
