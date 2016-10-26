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
    currentState = 'nc';
    const dataFilename = 'presidential-' + currentState + '-counties.json'
    dataURL = buildDataURL(dataFilename);
    extraDataURL = buildDataURL('fixed-data.json');
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
    if (data) {
        console.log(extraData);
        console.log(data);

        let trumpTotal = 0;
        let trumpPct = 0;
        let clintonTotal = 0;
        let clintonPct = 0;
        for (var fipscode in data){
            let trump = data[fipscode][0];
            let clinton = data[fipscode][1];
            trumpTotal += trump.votecount;
            clintonTotal += clinton.votecount;
            trumpPct += trump.votepct;
            clintonPct += clinton.votepct;
        }

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
                  h('th', 'Pct')
                ])
              ]),
              h('tr', [
                h('td', 'Donald Trump (R)'),
                h('td', trumpTotal),
                h('td', trumpPct.toFixed(2) + '%')
              ]),
              h('tr', [
                h('td', 'Hillary Clinton (D)'),
                h('td', clintonTotal),
                h('td', clintonPct.toFixed(2) + '%')
              ])
            ]),
            h('h4', '2012'),
            h('table', [
              h('thead', [
                h('tr', [
                  h('th', 'Candidate'),
                  h('th', 'Votes'),
                  h('th', 'Pct')
                ])
              ]),
              h('tr', [
                h('td', 'Mitt Romney (R)'),
                h('td', 'Number'),
                h('td', 'Percent')
              ]),
              h('tr', [
                h('td', 'Barack Obama (D)'),
                h('td', 'Number'),
                h('td', 'Percent')
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

const renderCountyRow = function(results){
  const trump = results[0];
  const clinton = results[1];

  return h('tr', [
    h('td', trump.reportingunitname),
    h('td', trump.votecount),
    h('td', clinton.votecount),
    h('td', extraData[trump.fipscode].winner + ' +' + extraData[trump.fipscode].advantage.toFixed(2) + '%'),
    h('td', extraData[trump.fipscode].unemployment + '%')
  ])
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
