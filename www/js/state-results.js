import maquette from 'maquette';
import request from 'superagent';
import commaNumber from 'comma-number';
import navbar from '../js/includes/navbar.js';
import briefingData from '../data/extra_data/state-briefings.json'

const resultsWrapper = document.querySelector('#county-results');
const projector = maquette.createProjector();
const h = maquette.h;

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
        'percent_filter': true,
    },
    {
        'name': '% Black',
        'key': 'percent_black',
        'census': true,
        'percent_filter': true,
    },
    {
        'name': '% Hispanic',
        'key': 'percent_hispanic',
        'census': true,
        'percent_filter': true,
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
        'percent_filter': true,
    },
]

let data = null;
let extraData = null;
let dataURL = null;
let extraDataURL = null;
let currentState = null;
let lastRequestTime = null;
let sortMetric = availableMetrics[0];
let descriptions = null;
let keyCounties = null;
let stateTotalVotes = 0;
let dataTimer = null;
let resultsView = 'presidential';
let stateName = null;
let statepostal = null;
let statefaceClass = null;
let lastUpdated = null;
let resultsType = 'Presidential Results';

window.pymChild = null;
/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    // init pym and render callback
    pymChild = new pym.Child({
        polling: 100
    });
    currentState = getParameterByName('state');
    descriptions = briefingData.descriptions.find(function(el) {
      return el.state_postal === currentState;
    });
    keyCounties = briefingData.key_counties.filter(function(el) {
      return el.state === currentState;
    });

    const dataFilename = 'presidential-' + currentState + '-counties.json'
    dataURL = buildDataURL(dataFilename);
    extraDataURL = '../data/extra_data/' + currentState + '-extra.json'
    getData();
    getExtraData();

    dataTimer = setInterval(getData, 5000);
    projector.append(resultsWrapper, renderMaquette);
}

const getData = function() {
    projector.resume();
    request.get(dataURL)
        .end(function(err, res) {
            if (dataURL.indexOf('presidential') !== -1) {
              resultsView = 'presidential';
            } else {
              resultsView = 'downballot';
            }
            data = res.body.results;
            lastUpdated = res.body.last_updated;
            projector.scheduleRender();
        });
}

const getExtraData = function() {
    request.get(extraDataURL)
        .end(function(err, res) {
            extraData = res.body;
        });
}

const sortCountyResults = function() {
    let values = []

    for (let fipscode in extraData) {
        if (sortMetric['census']) {
            var sorter = extraData[fipscode].census[sortMetric['key']];
        } else {
            var sorter = extraData[fipscode][sortMetric['key']];
        }
        values.push([fipscode, sorter]);
    }

    values.sort(function(a, b) {
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
    })

    return values;
}


const renderMaquette = function() {
    if (data, extraData) {
        if (!stateName && !statepostal && !statefaceClass) {
          stateName = data['state'][0].statename;
          statepostal = data['state'][0].statepostal;

          statefaceClass = 'stateface-' + statepostal.toLowerCase();
        }

        return h('div.results', [
          h('header', [
              h('div.switcher', [
                stateName + ' election results: ',
                h('span#presidential', {
                  'onclick': switchResultsView
                }, [
                  'Presidential'
                ]),
                ' | ',
                h('span#downballot', {
                  'onclick': switchResultsView
                }, [
                  'Statewide'
                ]),
              ]),
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
              h('p.rating', [
                  'Battleground rating: ',
                  h('span', {
                    classes:{
                      'd-safe': descriptions.rating === 'D-Safe/Likely',
                      'd-lean': descriptions.rating === 'D-Lean',
                      'toss-up': descriptions.rating === 'Toss-up',
                      'r-lean': descriptions.rating === 'R-Lean',
                      'r-safe': descriptions.rating === 'R-Safe/Likely',
                    }
                  }, descriptions.rating)
                ])
          ]),
          renderResults(),
          h('div.footer', [
            h('p', [
              'Sources: Current results from AP',
              ' ',
              h('span.timestamp', [
                '(as of ',
                lastUpdated,
                ' ET).'
              ]),
              ' Other statistics from the Census Bureau (2014 American Community Survey 5-year estimates) and Bureau of Labor Statistics (2015 figures).'
            ])
          ])
        ]);
    } else {
        return h('div.results', 'Loading...');
    }
}

const renderResults = function() {
  const body = document.getElementsByTagName('BODY')[0];

  if (resultsView === 'presidential') {
    body.classList.remove('tab-downballot');
    body.classList.add('tab-presidential');
    const stateResults = data['state'];
    const sortedStateResults = stateResults.sort(function(a, b) {
      return b['votecount'] - a['votecount'];
    });
    const sortKeys = sortCountyResults();

    return h('div.presidential-results', [
      renderStateResults(sortedStateResults),
      h('div.results-counties', {
        classes: {
          'population': sortMetric['key'] === 'population',
          'past-results': sortMetric['key'] === 'past_margin',
          'unemployment': sortMetric['key'] === 'unemployment',
          'percent-white': sortMetric['key'] === 'percent_white',
          'percent-black': sortMetric['key'] === 'percent_black',
          'percent-hispanic': sortMetric['key'] === 'percent_hispanic',
          'median-income': sortMetric['key'] === 'median_income',
          'percent-college-educated': sortMetric['key'] === 'percent_bachelors',
        }
      }, [
        h('h2', descriptions.county_desc ? ['Counties To Watch', h('i.icon.icon-star')] : 'Results By County'),
        h('p', descriptions.county_desc ? descriptions.county_desc : ''),
        h('ul.sorter', [
          h('li.label', 'Sort Counties By'),
          availableMetrics.map(metric => renderMetricLi(metric))
        ]),
        h('table.results-table', [
          h('thead', [
            h('tr', [
              h('th.county', 'County'),
              h('th.amt.precincts', ''),
              h('th.vote.candidate.dem', 'Clinton'),
              h('th.vote.candidate.gop', 'Trump'),
              h('th.vote.candidate.ind', 'Other'),
              h('th.vote.margin', '2016 Margin'),
              h('th.comparison', sortMetric['name']),
            ])
          ]),
          sortKeys.map(key => renderCountyRow(data[key[0]], key[0]))
        ])
      ])
    ])
  } else if (resultsView === 'downballot') {
    body.classList.remove('tab-presidential');
    body.classList.add('tab-downballot');

    const sortedHouseKeys = Object.keys(data['house']['results']).sort(function(a, b) {
      return data['house']['results'][a][0]['seatnum'] - data['house']['results'][b][0]['seatnum'];
    });

    const sortedBallotKeys = Object.keys(data['ballot_measures']['results']).sort(function(a, b) {
      return data['ballot_measures']['results'][a][0]['seatname'].split(' - ')[0] - data['ballot_measures']['results'][b][0]['seatname'].split(' - ')[0];
    });

    return h('div.downballot', [
      Object.keys(data['senate']['results']).map(race => renderSenateTable(data['senate']['results'][race])),
      h('div.results-house', {
        classes: {
          'one-result': Object.keys(data['house']['results']).length === 1,
          'two-results': Object.keys(data['house']['results']).length === 2,
          'three-results': Object.keys(data['house']['results']).length === 3,
          'four-results': Object.keys(data['house']['results']).length === 4,
        }
      },[
        h('h2', {
          classes: {
            'hidden': Object.keys(data['house']['results']).length === 0,
          }
        }, 'House'),
        h('div.results-wrapper', [
            sortedHouseKeys.map(race => renderHouseTable(data['house']['results'][race]))
        ]),
      ]),
      Object.keys(data['governor']['results']).map(race => renderGovTable(data['governor']['results'][race])),
      h('div.results-ballot-measures', {
        classes: {
          'one-result': Object.keys(data['ballot_measures']['results']).length === 1,
          'two-results': Object.keys(data['ballot_measures']['results']).length === 2,
          'three-results': Object.keys(data['ballot_measures']['results']).length === 3,
          'four-results': Object.keys(data['ballot_measures']['results']).length === 4,
        }
      },[
        h('h2', {
          classes: {
            'hidden': Object.keys(data['ballot_measures']['results']).length === 0,
          }
        }, 'Ballot Measures'),
        h('div.results-wrapper', [
            sortedBallotKeys.map(measure => renderMeasureTable(data['ballot_measures']['results'][measure]))
        ]),
      ])
    ]);
  }
}

const renderStateResults = function(results) {
  stateTotalVotes = 0;

  results = sortResults(results);
  return h('div.results-statewide', [
    h('h2', 'Statewide Results'),
    h('p', [
      descriptions.state_desc ? descriptions.state_desc : ''
    ]),
    h('table.results-table', [
      h('thead', [
        h('tr', [
          h('th.candidate', 'Candidate'),
          h('th.amt', 'Votes'),
          h('th.amt', 'Percent')
        ])
      ]),
      h('tbody', [
        results.map(result => renderStateRow(result))
      ]),
      h('tfoot', [
        h('tr', [
          h('td.candidate', 'Total'),
          h('td.amt', commaNumber(stateTotalVotes)),
          h('td.amt', '100%')
        ])
      ])
    ]),
    h('p.precincts', [(results[0].precinctsreportingpct * 100).toFixed(1) + '% of precincts reporting (' + results[0].precinctsreporting +' of ' + results[0].precinctstotal + ')'])
  ])
}

const renderStateRow = function(result){
  stateTotalVotes += parseInt(result.votecount);

  return h('tr', {
    classes: {
      'winner': result['npr_winner'],
      'dem': result['npr_winner'] && result['party'] === 'Dem',
      'gop': result['npr_winner'] && result['party'] === 'GOP',
      'ind': result['npr_winner'] && result['party'] === 'Ind',
      'hidden': result['last'] === 'Other' && result['votecount'] === 0
    }
  }, [
    h('td.candidate', [
      result.first,
      ' ',
      result.last,
      ' ',
      result.party ? '(' + result.party + ')': '',
      h('i.icon', {
        classes: {
          'icon-ok': result.npr_winner
        }
      })
    ]),
    h('td.amt', commaNumber(result.votecount)),
    h('td.amt', (result.votepct * 100).toFixed(1) + '%')
  ])
}

const renderMetricLi = function(metric) {
    return h('li.metric', {
      onclick: onMetricClick,
      classes: {
        'selected': metric === sortMetric
      }
    }, [metric['name']])

}

const renderCountyRow = function(results, key){
  if (key === 'state') {
    return '';
  }
  let trump = null;
  let clinton = null;
  let other = null;

  for (var i = 0; i < results.length; i++){
    let candidate = results[i];
    if (candidate.last == 'Trump'){
      trump = results[i];
    } else if (candidate.last == 'Clinton'){
      clinton = results[i];
    } else if (candidate.last == 'Other') {
      other = results[i];
    }
  }

  let isKeyCounty = keyCounties.find(function(el) {
    return el.fips === trump.fipscode
  })

  if (sortMetric['census']) {
    var extraMetric = extraData[trump.fipscode].census[sortMetric['key']]
  } else {
    var extraMetric = extraData[trump.fipscode][sortMetric['key']]
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

  return h('tr', {
    classes: {
      'featured': isKeyCounty
    }
  }, [
    h('td.county', [
      toTitlecase(trump.reportingunitname),
      h('i.icon', {
        classes: {
          'icon-star': isKeyCounty
        }
      })
    ]),
    h('td.amt.precincts', [(trump.precinctsreportingpct * 100).toFixed(1) + '% in']),
    h('td.vote.dem', {
      classes: {
        'winner': clinton.votecount > trump.votecount && clinton.votecount > other.votecount && clinton.precinctsreportingpct === 1
      }
    }, [(clinton.votepct * 100).toFixed(1) + '%']),
    h('td.vote.gop', {
      classes: {
        'winner': trump.votecount > clinton.votecount && trump.votecount > other.votecount && trump.precinctsreportingpct === 1
      }
    }, [(trump.votepct * 100).toFixed(1) + '%']),
    h('td.vote.ind', {
      classes: {
        'winner': other.npr_winner && clinton.precinctsreportingpct === 1
      }
    }, (other.votepct * 100).toFixed(1) + '%'),
    h('td.vote.margin', calculateVoteMargin(trump.votepct, clinton.votepct)),
    h('td.comparison', extraMetric),
  ])
}

const renderSenateTable = function(results){
  let totalVotes = 0;
  for (var i = 0; i < results.length; i++){
    totalVotes += results[i].votecount;
  }

  if (results.length > 2) {
    results = sortResults(results);
  }

  return h('div.results-senate', [
    h('h2', 'Senate'),
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
    ])
  ])
}

const renderHouseTable = function(results){
  let seatName = results[0].seatname;
  let totalVotes = 0;
  for (var i = 0; i < results.length; i++){
    totalVotes += results[i].votecount;
  }

  if (results.length > 2) {
    results = sortResults(results)
  }

  return h('div.house-race', [
   h('table.results-table', [
    h('caption', [ seatName,
      h('amt.precincts', [(results[0].precinctsreportingpct * 100).toFixed(1) + '% in']),
    ]),
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
  ])
])
}

const renderRow = function(result){
  let party = result.party ? '(' + result.party + ')' : ''
  let candidate = result.is_ballot_measure ? result.party : result.first + ' ' + result.last + ' ' + party

  return h('tr', {
    classes: {
      'winner': result['npr_winner'],
      'dem': result['npr_winner'] && result['party'] === 'Dem',
      'gop': result['npr_winner'] && result['party'] === 'GOP',
      'ind': result['npr_winner'] && result['party'] === 'Ind',
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
  ])
}

const renderGovTable = function(results){
  let totalVotes = 0;
  for (var i = 0; i < results.length; i++){
    totalVotes += results[i].votecount;
  }

  if (results.length > 2) {
    results = sortResults(results);
  }

  return h('div.results-gubernatorial', [
    h('h2', 'Gubernatorial'),
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
    ])
  ])
}

const renderMeasureTable = function(results){
  let propName = results[0].seatname;
  let totalVotes = 0;
  for (var i = 0; i < results.length; i++){
    totalVotes += results[i].votecount;
  }

  if (results.length > 2) {
    results = sortResults(results);
  }

  return h('div.ballot-measure', [
  h('table.results-table', [
    h('caption', propName),
    h('thead', [
      h('tr', [
        h('th.candidate', 'Ballot Measure'),
        h('th.amt', 'Votes'),
        h('th.amt', 'Percent')
      ])
    ]),
    h('tbody', [
      results.map(measure => renderRow(measure))
    ]),
    h('tfoot', [
      h('tr', [
        h('td.candidate', 'Total'),
        h('td.amt', commaNumber(totalVotes)),
        h('td.amt', '100%')
      ])
    ])
  ])
])
}

const calculateVoteMargin = function(trump, clinton) {
  const difference = clinton - trump;
  if (difference > 0) {
    return 'D +' + Math.round(difference * 100);
  } else {
    return 'R +' + Math.round(Math.abs(difference) * 100);
  }
}

const onMetricClick = function(e) {
    for (var i = 0; i < availableMetrics.length; i++) {
        if (availableMetrics[i]['name'] === e.target.innerHTML) {
            sortMetric = availableMetrics[i];
        }
    }
}

const toTitlecase = function(str) {
    return str.replace(/\w*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}


const switchResultsView = function(e) {
  if (e.target.getAttribute('id') === 'presidential') {
    var dataFilename = 'presidential-' + currentState + '-counties.json';
    resultsType = 'Presidential Results';
  } else {
    var dataFilename = currentState + '.json';
    resultsType = 'Statewide Results';
  }
  dataURL = buildDataURL(dataFilename);

  clearInterval(dataTimer);
  getData();
  dataTimer = setInterval(getData, 5000);
}

const sortResults = function(results) {
  results.sort(function(a, b) {
    if (a.votecount > 0 || a.precinctsreporting > 0) {
      return b.votecount - a.votecount;
    } else {
      if (a.last === 'Other') return 1;
      if (b.last === 'Other') return -1;
      if (a.last < b.last) return -1;
      if (a.last > b.last) return 1;
      return 0;
    }
  });
  return results
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
