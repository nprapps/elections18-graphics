import maquette from 'maquette';
import request from 'superagent';

const resultsWrapper = document.querySelector('#county-results');
const projector = maquette.createProjector();
const h = maquette.h;

let data = null;
let dataURL = null;
let currentState = null;
let lastRequestTime = null;
let pymChild = null;
let selectedFilter = 'population';

/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    // init pym and render callback
    pymChild = new pym.Child({
        polling: 100
    });
    pymChild.onMessage('state-selected', changeState)

    projector.append(resultsWrapper, renderMaquette);
}

const changeState = function(state) {
    currentState = state;

    const dataFilename = currentState + '.json'
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
        return h('div.results', [
          Object.keys(data['senate']).map(race => renderSenateTable(data['senate'][race])),
          h('div.results-house', [
            h('h2', 'House'),
            Object.keys(data['house']).map(race => renderHouseTable(data['house'][race]))
          ]),
          Object.keys(data['governor']).map(race => renderGovTable(data['governor'][race])),
          h('div.results-ballot-measures', [
            h('h2', 'Ballot Measures'),
            Object.keys(data['ballot_measures']).map(measure => renderMeasureTable(data['ballot_measures'][measure]))
          ])
        ]);
    } else {
        return h('div.results');
    }
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


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
