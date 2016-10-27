import maquette from 'maquette';
import request from 'superagent';

const resultsWrapper = document.querySelector('.results-wrapper');
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
    currentState = 'pa';
    const dataFilename = 'presidential-' + currentState + '-counties.json'
    dataURL = buildDataURL(dataFilename);
    const extraDataFilename = '/extra_data/' + currentState + '-extra.json'
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
        console.log(data);

        stateTotals(data);

        const firstCounty = data[Object.keys(data)[0]];

        return h('div.results', ['Loaded',
          h('div.state-results', [
            h('h2', 'Overall State Results'),
            h('p', 'Lorem Ipsum dolemoar usted.'),
            h('h4', '2016'),
            h('table', [
              h('thead', [
                h('tr', [
                  h('th', 'Candidate'),
                  h('th', 'Votes'),
                  h('th', 'Percent')
                ])
              ]),
              h('tbody', [
                Object.keys(firstCounty).map(fipscode => renderStateRow(firstCounty[fipscode]))
              ])
            ])
          ]),
          h('div.county-results', [
            h('h2', 'Counties To Watch'),
            h('p', 'Lorem Ipsum blah blah blah'),
            h('h2', 'All Results'),
            h('table', [
              h('thead', [
                h('tr', [
                  h('th.county', 'County'),
                  h('th.vote', 'Trump'),
                  h('th.vote', 'Clinton'),
                  h('th.lastWon', '2012 Result'),
                  h('th.unemployment', 'Unemployment Rate')
                ])
              ]),
              h('tbody', [
                Object.keys(data).map(fipscode => renderCountyRow(data[fipscode]))

              ])
            ])
          ])
        ]);
    } else {
        return h('div.results');
    }
}

//Candidate State-wide data
let trumpTotal = 0;
let trumpPct = 0;
let clintonTotal = 0;
let clintonPct = 0;
let mcmullinTotal = 0;
let mcmullinPct = 0;
let johnsonTotal = 0;
let johnsonPct = 0;
let steinTotal = 0;
let steinPct = 0;

const stateTotals = function(data){
  for (var fipscode in data){
    let trump = null;
    let clinton = null;
    let mcmullin = null;
    let johnson = null;
    let stein = null;

    for (var i = 0; i < data[fipscode].length; i++){
      let candidate = data[fipscode][i];
      if (candidate.last == 'Trump'){
        trump = data[fipscode][i];
        trumpTotal += trump.votecount;
        trumpPct += trump.votepct;
      } else if (candidate.last == 'Clinton'){
        clinton = data[fipscode][i];
        clintonTotal += clinton.votecount;
        clintonPct += clinton.votepct;
      } else if (candidate.last == 'Johnson'){
        johnson = data[fipscode][i];
        johnsonTotal += johnson.votecount;
        johnsonPct += johnson.votepct;
      } else if (candidate.last == 'Stein'){
        stein = data[fipscode][i];
        steinTotal += stein.votecount;
        steinPct += stein.votepct;
      } else if (candidate.last == 'McMullin'){
        mcmullin = data[fipscode][i];
        mcmullinTotal += mcmullin.votecount;
        mcmullinPct += mcmullin.votepct;
      }
    }
  }
}

const renderStateRow = function(results){
  let voteTotal = null;
  let votePct = null;
  let party = null;

  if (results.last == 'Trump'){
    voteTotal = trumpTotal;
    votePct = trumpPct;
    party = 'R';
  } else if (results.last == 'Clinton'){
    voteTotal = clintonTotal;
    votePct = clintonPct;
    party = 'D';
  } else if (results.last == 'Johnson'){
    voteTotal = johnsonTotal;
    votePct = johnsonPct;
    party = 'L';
  } else if (results.last == 'Stein'){
    voteTotal = steinTotal;
    votePct = steinPct;
    party = 'G';
  } else if (results.last == 'McMullin'){
    voteTotal = mcmullinTotal;
    votePct = mcmullinPct;
    party = 'I';
  }

  return h('tr', [
    h('td', results.first + ' ' + results.last + ' (' + party + ')'),
    h('td', voteTotal.toLocaleString()),
    h('td', votePct.toFixed(2) + '%')
  ])
}

const renderCountyRow = function(results){
  let trump = null;
  let clinton = null;

  for (var i = 0; i < results.length; i++){
    let candidate = results[i];
    if (candidate.last == 'Trump'){
      trump = results[i];
    } else if (candidate.last == 'Clinton'){
      clinton = results[i];
    }
  }

  return h('tr', [
    h('td', trump.reportingunitname),
    h('td', (trump.votepct * 100).toFixed(1) + '%'),
    h('td', (clinton.votepct * 100).toFixed(1) + '%'),
    h('td', extraData[trump.fipscode].past_margin),
    h('td', extraData[trump.fipscode].unemployment + '%')
  ])
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
