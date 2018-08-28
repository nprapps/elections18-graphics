// npm libraries
import d3 from 'd3';
import * as _ from 'underscore';
import textures from 'textures';
import request from 'superagent';
import countdown from './countdown';
import { classify, buildDataURL } from './helpers.js';

// Global vars
var DATA_FILE = 'top-level-results.json';

var CONGRESS = {
    'senate': {
        'half': 50,
        'Dem': 34,
        'GOP': 30,
        'Other': 2
    },
    'house': {
        'half': 217.5,
        'Dem': 0,
        'GOP': 0,
        'Other': 0
    }
}
var DEFAULT_WIDTH = 600;
var SIDEBAR_THRESHOLD = 280;
var MOBILE_THRESHOLD = 500;
var LOAD_INTERVAL = 5000;

var isInitialized = false;
var isMobile = false;
var lastUpdated = '';
var charts = d3.keys(CONGRESS);
var skipLabels = [ 'label', 'values' ];
var bopData = [];
var reloadData = null;
var graphicWidth = null;
var timestamp = null;
var lastRequestTime = null;
var footnotes = null;

var senateCalled = [];
var senateExpected = [];
var senateSummed = [];
var houseCalled = [];
var houseExpected = [];
var houseSummed = [];

var tDExpected = null;
var tRExpected = null;
var tIExpected = null;

var initialRender = true;

/*
 * Initialize the graphic.
 */
const initBop = function(containerWidth) {
    timestamp = d3.select('.footer .timestamp');
    footnotes = d3.select('.footnotes');
    graphicWidth = containerWidth;

    // define textures for "leading/ahead"
    tDExpected = textures.lines()
        .size(3)
        .strokeWidth(1)
        .stroke('#498dcb')
        .background('#cfdeed');

    tRExpected = textures.lines()
        .size(3)
        .strokeWidth(1)
        .stroke('#f05b4e')
        .background('#f3dad8');

    tIExpected = textures.lines()
        .size(3)
        .strokeWidth(1)
        .stroke('#15b16e')
        .background('#ceeee0');

    loadData();
    //console.log('YOU TURNED OFF THE REFRESH INTERVAL');
    setInterval(loadData, LOAD_INTERVAL)
}

/*
 * Load a datafile
 */
var loadData = function() {
    request.get(buildDataURL(DATA_FILE))
        .set('If-Modified-Since', lastRequestTime ? lastRequestTime : '')
        .end(function(err, res) {
            // Superagent takes anything outside of `200`-class responses to be errors
            if (err && ((res && res.statusCode !== 304) || !res)) { throw err; }
            if (res.body) {
                lastRequestTime = new Date().toUTCString();
                bopData = res.body;
                lastUpdated = res.body.last_updated;
                formatData();
            } else {
                redrawChart();
            }
        });
}


/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    var sData = bopData['senate_bop'];
    senateCalled = [
        { 'name': 'Dem.', 'val': sData['Dem']['seats'] },
        { 'name': 'Ind.', 'val': sData['Other']['seats'] },
        { 'name': 'Not yet called', 'val': sData['uncalled_races'] },
        { 'name': 'GOP', 'val': sData['GOP']['seats'] }
    ];
    senateExpected = [
        { 'name': 'Dem.', 'val': sData['Dem']['seats'] },
        { 'name': 'Ind.', 'val': sData['Other']['seats'] },
        { 'name': 'Dem.-expected', 'val': sData['Dem']['expected'] },
        { 'name': 'Ind.-expected', 'val': sData['Other']['expected'] },
        { 'name': 'Not yet called', 'val': (sData['uncalled_races'] - sData['Dem']['expected'] - sData['GOP']['expected'] - sData['Other']['expected']) },
        { 'name': 'GOP-expected', 'val': sData['GOP']['expected'] },
        { 'name': 'GOP', 'val': sData['GOP']['seats'] }
    ];
    senateSummed = [
        { 'name': 'Dem.', 'val': sData['Dem']['seats'] + sData['Dem']['expected'] },
        { 'name': 'Ind.', 'val': sData['Other']['seats'] + sData['Other']['expected'] },
        { 'name': 'GOP', 'val': sData['GOP']['seats'] + sData['GOP']['expected'] }
    ];
    CONGRESS['senate']['total'] = sData['total_seats'];
    CONGRESS['senate']['majority'] = sData['majority'];

    var hData = bopData['house_bop'];
    houseCalled = [
        { 'name': 'Dem.', 'val': hData['Dem']['seats'] },
        { 'name': 'Not yet called', 'val': hData['uncalled_races'] },
        { 'name': 'Ind.', 'val': hData['Other']['seats'] },
        { 'name': 'GOP', 'val': hData['GOP']['seats'] }
    ];
    houseExpected = [
        { 'name': 'Dem.', 'val': hData['Dem']['seats'] },
        { 'name': 'Dem.-expected', 'val': hData['Dem']['expected'] },
        { 'name': 'Not yet called', 'val': (hData['uncalled_races'] - hData['Dem']['expected'] - hData['GOP']['expected'] - hData['Other']['expected']) },
        { 'name': 'Ind.-expected', 'val': hData['Other']['expected'] },
        { 'name': 'Ind.', 'val': hData['Other']['seats'] },
        { 'name': 'GOP-expected', 'val': hData['GOP']['expected'] },
        { 'name': 'GOP', 'val': hData['GOP']['seats'] }
    ];
    houseSummed = [
        { 'name': 'Dem.', 'val': hData['Dem']['seats'] + hData['Dem']['expected'] },
        { 'name': 'Ind.', 'val': hData['Other']['seats'] + hData['Other']['expected'] },
        { 'name': 'GOP', 'val': hData['GOP']['seats'] + hData['GOP']['expected'] }
    ];
    CONGRESS['house']['total'] = hData['total_seats'];
    CONGRESS['house']['majority'] = hData['majority'];

    // console.log(senateExpected[0]['value'] + senateExpected[1]['value'] + senateExpected[2]['value'] + senateExpected[3]['value'] + senateExpected[4]['value'] + senateExpected[5]['value'] + senateExpected[6]['value']);
    // console.log(houseExpected[0]['value'] + houseExpected[1]['value'] + houseExpected[2]['value'] + houseExpected[3]['value'] + houseExpected[4]['value'] + houseExpected[5]['value'] + houseExpected[6]['value']);

    _.each([ senateCalled, senateExpected, senateSummed, houseCalled, houseExpected, houseSummed ], function(d, i) {
        var x0 = 0;

        _.each(d, function(v, k) {
            v['x0'] = x0;
            v['x1'] = x0 + v['val']
            x0 = v['x1'];
        });
    });

    redrawChart();
}


/*
 * Render the graphic(s). Called by pym with the container width.
 */
const renderBop = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    graphicWidth = containerWidth;

    loadData();
}

//
var redrawChart = function() {
    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#bop');
    containerElement.html('');

    var widthMultiplier = 0.46;

    _.each(charts, function(d, i) {
        var chartDiv = containerElement.append('div')
            .attr('class', 'chart ' + classify(d));

        // Render the chart!
        renderStackedBarChart({
            container: '#bop .chart.' + classify(d),
            width: graphicWidth * widthMultiplier,
            dataCalled: eval(classify(d) + 'Called'),
            dataExpected: eval(classify(d) + 'Expected'),
            dataSummed: eval(classify(d) + 'Summed'),
            chart: d
        });
    })

    // update timestamp
    timestamp.html('(as of ' + lastUpdated + ' ET)');

    // Update iframe
    if (window.pymChild) {
        window.pymChild.sendHeight();
    }

    if (initialRender) {
        initialRender = false;
        window.pymChild.sendMessage('initial-render', 'bop');
    }
}

/*
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var barExpectedHeight = 10;
    var barGap = 2;
    var valueGap = 4;

    var margins = {
        top: 15,
        right: 1,
        bottom: 15,
        left: 1
    };

    var chamber = config['chart'];
    var majority = CONGRESS[chamber]['majority'];
    var half = CONGRESS[chamber]['half'];
    var ticksX = 4;
    var roundTicksFactor = 1;

    if (isMobile) {
        ticksX = 2;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = barExpectedHeight;

    // footnotes.attr('style', 'margin-left: ' + margins['left'] + 'px;');

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.append('h3')
        .text(config['chart'])
        .attr('style', 'margin-left: ' + margins['left'] + 'px; margin-right: ' + margins['right'] + 'px;');

    /*
     * Create D3 scale objects.
     */
    var min = 0;
    var max = CONGRESS[chamber]['total'];

    var xScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([0, chartWidth]);

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    chartElement.call(tDExpected);
    chartElement.call(tRExpected);
    chartElement.call(tIExpected);


    /*
     * Render bars to chart.
     */
    var group = chartElement.selectAll('.group')
        .data([ config['dataExpected'] ])
        .enter().append('g')
            .attr('class', function(d, i) {
                return 'group group-' + i;
            })
            .attr('transform', function(d, i) {
                var yPos = null;
                yPos = 0;

                return 'translate(0,' + yPos + ')';
            });

    group.selectAll('rect')
        .data(function(d) {
            return d;
        })
        .enter().append('rect')
            .attr('x', function(d) {
                return xScale(d['x0']);
            })
            .attr('width', function(d) {
                return Math.abs(xScale(d['x1']) - xScale(d['x0']));
            })
            .attr('height', function(d) {
                var t = d3.select(this.parentNode)[0][0].getAttribute('class').split(' ')[1].split('-');
                var tIndex = t[1];

                return barExpectedHeight;
            })
            .attr('class', function(d) {
                return classify(d['name']);
            })
            .attr('fill', function(d) {
                switch(d['name']) {
                    case 'Dem.-expected':
                        return tDExpected.url();
                        break;
                    case 'GOP-expected':
                        return tRExpected.url();
                        break;
                    case 'Ind.-expected':
                        return tIExpected.url();
                        break;
                }
            });

    /*
     * Render majority line.
     */
    var majorityMarker = chartElement.append('g')
        .attr('class', 'majority-marker');
    majorityMarker.append('line')
        .attr('x1', xScale(half))
        .attr('x2', xScale(half))
        .attr('y1', -valueGap)
        .attr('y2', chartHeight);

    /*
     * Annotations
     */
    var annotations = chartElement.append('g')
        .attr('class', 'annotations');

    _.each(config['dataSummed'], function(d) {
        var lbl = d['name'];
        var textAnchor = null;
        var xPos = null;
        var yPos = 0;
        var showLabel = true;
        switch(d['name']) {
            case 'Dem.':
                //xPos = xScale(d['x0']);
                xPos = 0;
                textAnchor = 'start';
                lbl = 'Dem.';
                break;
            case 'GOP':
                //xPos = xScale(chartWid);
                xPos = chartWidth;
                textAnchor = 'end';
                break;
            default:
                xPos = xScale(d['x0'] + ((d['x1'] - d['x0']) / 2));
                textAnchor = 'middle';
                if (_.contains(['Ind.'], d['name']) || d['val'] == 0) {
                    showLabel = false;
                }
                break;
        }

        if (d['val'] > 0) {
            annotations.append('text')
                .text(lbl)
                .attr('class', 'party ' + classify(d['name']))
                .attr('x', xPos)
                .attr('y', yPos)
                .attr('dy', -6)
                .attr('style', function() {
                    var s = '';
                    s += 'text-anchor: ' + textAnchor + '; ';
                    return s;
                });
        }

        if (showLabel) {
            annotations.append('text')
                .text(d['val'] + ' expected')
                .attr('class', 'value ' + classify(d['name']))
                .attr('x', xPos)
                .attr('y', yPos)
                .attr('dy', barExpectedHeight + 12)
                .attr('style', function() {
                    var s = '';
                    s += 'text-anchor: ' + textAnchor + '; ';
                    return s;
                });
        }
    });

    // shift xPos of independent label
    // base positioning on the xpos/width of the "Ind." label, not the value
    annotations.select('.party.ind')
        .attr('x', function() {
            var t = d3.select(this);
            var tVal = annotations.select('.value.ind');
            var xPos = t.attr('x');
            var tBBox = t.node().getBBox();
            switch(config['chart']) {
                case 'senate':
                    var senBBox = annotations.select('.party.dem').node().getBBox();
                    if (tBBox['x'] < (senBBox['x'] + senBBox['width'])) {
                        xPos = (senBBox['x'] + senBBox['width']);
                    }
                    break;
                case 'house':
                    var houseBBox = annotations.select('.party.gop').node().getBBox();
                    if ((tBBox['x'] + tBBox['width'] + 5) > houseBBox['x']) {
                        xPos = houseBBox['x'] - 5;
                        tVal.attr('style', 'text-anchor: end');
                        t.attr('style', 'text-anchor: end');
                    }
                    break;
            }
            tVal.attr('x', xPos);
            return xPos;
        })
}

export {
  initBop,
  renderBop
};
