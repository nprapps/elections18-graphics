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
            data = res.body;
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
          h('div.switcher', [
            h('span#presidential', {
              'onclick': switchResultsView
            }, [
              'Presidential Results'
            ]),
            ' ',
            h('span#downballot', {
              'onclick': switchResultsView
            }, [
              'Downballot Results'
            ]),
          ]),
          h('h1', [
            stateName,
            ' ', 
            h('i.stateface', {
                class: statefaceClass
            })
          ]),
          h('p', [
            'Battleground rating: ',
            descriptions.rating
          ]),
          renderResults()
        ]);
    } else {
        return h('div.results', 'Loading...');
    }
}

const renderResults = function() {
  if (resultsView === 'presidential') {
    const stateResults = data['state'];
    const sortedStateResults = stateResults.sort(function(a, b) {
      return b['votecount'] - a['votecount'];
    });
    const sortKeys = sortCountyResults();

    return h('div.presidential-results', [
      renderStateResults(sortedStateResults),
      h('div.results-counties', [
        h('h2', descriptions.county_desc ? 'Counties To Watch' : ''),
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
      ]),
      h('div.footer', [
        h('p', 'Sources: sources go here.')
      ])
    ])
  } else if (resultsView === 'downballot') {
    const sortedHouseKeys = Object.keys(data['house']).sort(function(a, b) {
      return data['house'][a][0]['seatnum'] - data['house'][b][0]['seatnum'];
    });

    console.log(sortedHouseKeys);

    return h('div.downballot', [
      Object.keys(data['senate']).map(race => renderSenateTable(data['senate'][race])),
      h('div.results-house', [
        h('h2', 'House'),
        sortedHouseKeys.map(race => renderHouseTable(data['house'][race]))
      ]),
      Object.keys(data['governor']).map(race => renderGovTable(data['governor'][race])),
      h('div.results-ballot-measures', [
        h('h2', 'Ballot Measures'),
        Object.keys(data['ballot_measures']).map(measure => renderMeasureTable(data['ballot_measures'][measure]))
      ])
    ]);
  }
}

const renderStateResults = function(results) {
  stateTotalVotes = 0;
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
          h('td.amt', stateTotalVotes.toLocaleString()),
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
      'ind': result['npr_winner'] && result['party'] === 'Ind'
    }
  }, [
    h('td.candidate', result.first + ' ' + result.last + ' (' + result.party + ')'),
    h('td.amt', result.votecount.toLocaleString()),
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
  let othervotecount = 0;
  let othervotepct = 0;

  for (var i = 0; i < results.length; i++){
    let candidate = results[i];
    if (candidate.last == 'Trump'){
      trump = results[i];
    } else if (candidate.last == 'Clinton'){
      clinton = results[i];
    } else {
      othervotecount += candidate.votecount;
      othervotepct += candidate.votepct;
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
        'winner': clinton.votecount > trump.votecount && clinton.votecount > othervotecount && clinton.precinctsreportingpct === 1
      }
    }, [(clinton.votepct * 100).toFixed(1) + '%']),
    h('td.vote.gop', {
      classes: {
        'winner': trump.votecount > clinton.votecount && trump.votecount > othervotecount && trump.precinctsreportingpct === 1
      }
    }, [(trump.votepct * 100).toFixed(1) + '%']),
    h('td.vote.ind', {
      classes: {
        'winner': othervotecount > trump.votecount && othervotecount > clinton.votecount && clinton.precinctsreportingpct === 1
      }
    }, (othervotepct * 100).toFixed(1) + '%'),
    h('td.vote.margin', calculateVoteMargin(trump.votepct, clinton.votepct)),
    h('td.comparison', extraMetric),
  ])
}

const renderSenateTable = function(results){
  let totalVotes = 0;
  for (var i = 0; i < results.length; i++){
    totalVotes += results[i].votecount;
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
        results.map(key => renderSenateRow(key))
      ]),
      h('tfoot', [
        h('tr', [
          h('td.candidate', 'Total'),
          h('td.amt', totalVotes.toLocaleString()),
          h('td.amt', '100%')
        ])
      ])
    ])
  ])
}

const renderSenateRow = function(result){
    return h('tr', {
      classes: {
        'winner': result['npr_winner'],
        'dem': result['npr_winner'] && result['party'] === 'Dem',
        'gop': result['npr_winner'] && result['party'] === 'GOP',
        'ind': result['npr_winner'] && result['party'] === 'Ind'
      }
    }, [
      h('td.candidate', result.first + ' ' + result.last + ' (' + result.party + ')'),
      h('td.amt', result.votecount.toLocaleString()),
      h('td.amt', (result.votepct * 100).toFixed(1) + '%')
    ])
}

const renderHouseTable = function(results){
  console.log(results);
  let seatName = results[0].seatname;
  let totalVotes = 0;
  for (var i = 0; i < results.length; i++){
    totalVotes += results[i].votecount;
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
      results.map(result => renderHouseRow(result))
    ]),
    h('tfoot', [
      h('tr', [
        h('td.candidate', 'Total'),
        h('td.amt', totalVotes.toLocaleString()),
        h('td.amt', '100%')
      ])
    ])
  ])
])
}

const renderHouseRow = function(result){
  return h('tr', {
    classes: {
      'winner': result['npr_winner'],
      'dem': result['npr_winner'] && result['party'] === 'Dem',
      'gop': result['npr_winner'] && result['party'] === 'GOP',
      'ind': result['npr_winner'] && result['party'] === 'Ind'
    }
  }, [
    h('td.candidate', result.first + ' ' + result.last + ' (' + result.party + ')'),
    h('td.amt', result.votecount.toLocaleString()),
    h('td.amt', (result.votepct * 100).toFixed(1) + '%')
  ])
}

const renderGovTable = function(results){
  let totalVotes = 0;
  for (var i = 0; i < results.length; i++){
    totalVotes += results[i].votecount;
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
        results.map(key => renderGovRow(key))
      ]),
      h('tfoot', [
        h('tr', [
          h('td.candidate', 'Total'),
          h('td.amt', totalVotes.toLocaleString()),
          h('td.amt', '100%')
        ])
      ])
    ])
  ])
}

const renderGovRow = function(result){
  return h('tr', {
    classes: {
      'winner': result['npr_winner'],
      'dem': result['npr_winner'] && result['party'] === 'Dem',
      'gop': result['npr_winner'] && result['party'] === 'GOP',
      'ind': result['npr_winner'] && result['party'] === 'Ind'
    }
  }, [
    h('td.candidate', result.first + ' ' + result.last + ' (' + result.party + ')'),
    h('td.amt', result.votecount.toLocaleString()),
    h('td.amt', (result.votepct * 100).toFixed(1) + '%')
  ])
}

const renderMeasureTable = function(results){
  let propName = results[0].seatname;
  let totalVotes = 0;
  for (var i = 0; i < results.length; i++){
    totalVotes += results[i].votecount;
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
      results.map(measure => renderMeasureRow(measure))
    ]),
    h('tfoot', [
      h('tr', [
        h('td.candidate', 'Total'),
        h('td.amt', totalVotes.toLocaleString()),
        h('td.amt', '100%')
      ])
    ])
  ])
])
}

const renderMeasureRow = function(result){
  return h('tr', {
    classes: {
      'winner': result['npr_winner'],
      'yes': result['npr_winner'] && result['party'] === 'Yes',
      'no': result['npr_winner'] && result['party'] === 'No'
    }
  }, [
    h('td.candidate', result.party),
    h('td.amt', result.votecount.toLocaleString()),
    h('td.amt', (result.votepct * 100).toFixed(1) + '%')
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
    var dataFilename = 'presidential-' + currentState + '-counties.json'
  } else {
    var dataFilename = currentState + '.json';
  }
  dataURL = buildDataURL(dataFilename);

  clearInterval(dataTimer);
  getData();
  dataTimer = setInterval(getData, 5000);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
