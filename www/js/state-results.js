import maquette from 'maquette';
import request from 'superagent';

const resultsWrapper = document.querySelector('#county-results');
const projector = maquette.createProjector();
const h = maquette.h;

let data = null;
let extraData = null;
let dataURL = null;
let extraDataURL = null;
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
    currentState = 'tx';
    const dataFilename = 'presidential-' + currentState + '-counties.json'
    dataURL = buildDataURL(dataFilename);
    const extraDataFilename = 'extra_data/' + currentState + '-extra.json'
    extraDataURL = buildDataURL(extraDataFilename);
    getExtraData();
    getData();
}

const getData = function() {
    request.get(dataURL)
        .end(function(err, res) {
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


const renderMaquette = function() {
    if (data, extraData) {
        const stateResults = data['state'];
        const sortedStateResults = stateResults.sort(function(a, b) {
          return b['votecount'] - a['votecount'];
        });

        let stateName = stateResults[0].statename;

        return h('div.results', [
          h('h1', stateName),
          h('p', 'Blah blah blah'),
          h('div.results-statewide', [
            h('h2', 'STATEWIDE RESULTS'),
            h('p', 'Tell them about the state history and stuff here.'),
            h('table.results-table', [
              h('thead', [
                h('tr', [
                  h('th.candidate', 'Candidate'),
                  h('th.amt', 'Votes'),
                  h('th.amt', 'Percent')
                ])
              ]),
              h('tbody', [
                sortedStateResults.map(result => renderStateRow(result))
              ]),
              h('tfoot', [
                h('tr', [
                  h('td.candidate', 'Total'),
                  h('td.amt', 'NUMBER'),
                  h('td.amt', '100%')
                ])
              ])
            ]),
            h('p.precincts', '10% of precincts reporting (10 of 100)')
          ]),
          h('div.results-counties', [
            h('h2', 'COUNTIES TO WATCH'),
            h('p', 'Lorem Ipsum blah blah blah'),
            h('ul.sorter', [
              h('li.label', 'Sort Counties By'),
              h('li.metric', 'Population'),
              h('li.metric', '2012 Results'),
              h('li.metric', 'Unemployment'),
              h('li.metric', '% White'),
              h('li.metric', '% Black'),
              h('li.metric', '% Hispanic'),
              h('li.metric', 'Median Income'),
              h('li.metric', 'Foreclosure Rate'),
              h('li.metric', '% College-Educated'),
            ]),
            h('table.results-table', [
              h('thead', [
                h('tr', [
                  h('th.county', 'County'),
                  h('th.amt.precincts', ''),
                  h('th.vote.candidate.gop', 'Trump'),
                  h('th.vote.candidate.dem', 'Clinton'),
                  h('th.vote.candidate.ind', 'Other'),
                  h('th.vote.margin', '2016 Margin'),
                  h('th.comparison', '2012 Result'),
                  h('th.unemployment', 'Unemployment Rate')
                ])
              ]),
              Object.keys(data).map(key => renderCountyRow(data[key], key))
            ])
          ]),
          h('div.footer', [
            h('p', 'Sources: sources go here.')
          ])
        ]);
    } else {
        return h('div.results');
    }
}

const renderStateRow = function(result){

  return h('tr', [
    h('td.candidate', result.first + ' ' + result.last + ' (' + result.party + ')'),
    h('td.amt', result.votecount.toLocaleString()),
    h('td.amt', (result.votepct * 100).toFixed(2) + '%')
  ])
}

const renderCountyRow = function(results, key){
  if (key === 'state') {
    return '';
  }

  let trump = null;
  let clinton = null;
  let othervotepct = 0;

  for (var i = 0; i < results.length; i++){
    let candidate = results[i];
    if (candidate.last == 'Trump'){
      trump = results[i];
    } else if (candidate.last == 'Clinton'){
      clinton = results[i];
    } else {
      othervotepct += candidate.votepct;
    }
  }

  return h('tr', [
    h('td.county', trump.reportingunitname),
    h('td.amt.precincts', '100% in'),
    h('td.vote.gop', (trump.votepct * 100).toFixed(1) + '%'),
    h('td.vote.dem', (clinton.votepct * 100).toFixed(1) + '%'),
    h('td.vote.ind', (othervotepct * 100).toFixed(1) + '%'),
    h('td.vote.margin', calculateVoteMargin(trump.votepct, clinton.votepct)),
    h('td.comparison', extraData[trump.fipscode].past_margin),
    h('td.unemployment', extraData[trump.fipscode].unemployment + '%')
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

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
