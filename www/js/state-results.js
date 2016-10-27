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
        let stateName = firstCounty[0].statename;

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
              Object.keys(firstCounty).map(fipscode => renderStateRow(firstCounty[fipscode]))
              ,h('tfoot', [
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
              Object.keys(data).map(fipscode => renderCountyRow(data[fipscode]))
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
    h('td.candidate', results.first + ' ' + results.last + ' (' + party + ')'),
    h('td.amt', voteTotal.toLocaleString()),
    h('td.amt', votePct.toFixed(2) + '%')
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
    h('td.county', trump.reportingunitname),
    h('td.amt.precincts', '100% in'),
    h('td.vote.gop', (trump.votepct * 100).toFixed(1) + '%'),
    h('td.vote.dem', (clinton.votepct * 100).toFixed(1) + '%'),
    h('td.vote.ind', 'MATH'),
    h('td.vote.margin', '-'),
    h('td.comparison', extraData[trump.fipscode].past_margin),
    h('td.unemployment', extraData[trump.fipscode].unemployment + '%')
  ])
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
