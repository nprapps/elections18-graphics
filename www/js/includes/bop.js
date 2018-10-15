// npm libraries
import d3 from 'd3';
import * as _ from 'underscore';
import textures from 'textures';
import request from 'superagent';
import countdown from './countdown';
import { classify, buildDataURL } from './helpers.js';
import copy from './copy.js';

// Global vars
var DATA_FILE = 'top-level-results.json';

var CONGRESS = {
    house: {},
    senate: {}
};
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
var lastRequestTime = '';
var indicator = null;
var footnotes = null;

var houseCalled = [];
var senateCalled = [];

/*
 * Initialize the graphic.
 */
const initBop = function(containerWidth) {
    timestamp = d3.select('.footer .timestamp');
    indicator = document.querySelector('.countdown');
    footnotes = d3.select('.footnotes');

    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }
    graphicWidth = containerWidth;

    loadData();
    // console.log('YOU TURNED OFF THE REFRESH INTERVAL');
    setInterval(loadData, LOAD_INTERVAL);
}

/*
 * Load a datafile
 */
var loadData = function () {
    request.get(buildDataURL(DATA_FILE))
        .set('If-Modified-Since', lastRequestTime)
        .end(function (err, res) {
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

            countdown(indicator, LOAD_INTERVAL);
        });
};

/*
 * Format graphic data for processing by D3.
 */
var formatData = function () {
    // reset vars
    houseCalled = [];
    senateCalled = [];
    CONGRESS['house'] = [];
    CONGRESS['senate'] = [];

    // redefine based on newly-updated data
    var hData = bopData['house_bop'];
    houseCalled = [
        { 'name': 'Dem.', 'val': hData['Dem']['seats'], 'isWinner': (hData['npr_winner'] === 'Dem' ? true : false) },
        { 'name': 'Not yet called', 'val': hData['uncalled_races'] },
        { 'name': 'Ind.', 'val': hData['Other']['seats'], 'isWinner': (hData['npr_winner'] === 'Ind' ? true : false) },
        { 'name': 'GOP', 'val': hData['GOP']['seats'], 'isWinner': (hData['npr_winner'] === 'GOP' ? true : false) }
    ];

    CONGRESS['house']['total'] = hData['total_seats'];
    CONGRESS['house']['uncalled_races'] = hData['uncalled_races'];
    CONGRESS['house']['label'] = copy.bop['label_house'];
    CONGRESS['house']['winner'] = hData['npr_winner'];

    if (hData['Dem']['pickups'] > hData['GOP']['pickups']) {
        CONGRESS['house']['pickup_seats'] = hData['Dem']['pickups'];
        CONGRESS['house']['pickup_party'] = 'Dem';
    } else if (hData['GOP']['pickups'] > hData['Dem']['pickups']) {
        CONGRESS['house']['pickup_seats'] = hData['GOP']['pickups'];
        CONGRESS['house']['pickup_party'] = 'GOP';
    } else {
        CONGRESS['house']['pickup_seats'] = '0';
        CONGRESS['house']['party'] = null;
    }

    var sData = bopData['senate_bop'];
    senateCalled = [
        { 'name': 'Dem.', 'val': sData['Dem']['seats'], 'isWinner': (sData['npr_winner'] === 'Dem' ? true : false) },
        { 'name': 'Ind.', 'val': sData['Other']['seats'], 'isWinner': (sData['npr_winner'] === 'Ind' ? true : false) },
        { 'name': 'Not yet called', 'val': sData['uncalled_races'] },
        { 'name': 'GOP', 'val': sData['GOP']['seats'], 'isWinner': (sData['npr_winner'] === 'GOP' ? true : false) }
    ];
    CONGRESS['senate']['total'] = sData['total_seats'];
    CONGRESS['senate']['uncalled_races'] = sData['uncalled_races'];
    CONGRESS['senate']['label'] = copy.bop['label_senate'];
    CONGRESS['senate']['winner'] = sData['npr_winner'];

    if (sData['Dem']['pickups'] > sData['GOP']['pickups']) {
        CONGRESS['senate']['pickup_seats'] = sData['Dem']['pickups'];
        CONGRESS['senate']['pickup_party'] = 'Dem';
    } else if (sData['GOP']['pickups'] > sData['Dem']['pickups']) {
        CONGRESS['senate']['pickup_seats'] = sData['GOP']['pickups'];
        CONGRESS['senate']['pickup_party'] = 'GOP';
    } else {
        CONGRESS['senate']['pickup_seats'] = '0';
        CONGRESS['senate']['party'] = null;
    }

    _.each([ houseCalled, senateCalled ], function (d, i) {
        var x0 = 0;

        _.each(d, function (v, k) {
            v['x0'] = x0;
            v['x1'] = x0 + v['val'];
            x0 = v['x1'];
        });
    });

    redrawChart();
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
const renderBop = function (containerWidth) {
    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    graphicWidth = containerWidth;
    // LoadData calls redrawChart after ensuring that the data is there
    // for the graphic to render.
    loadData();
};

var redrawChart = function () {
    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#bop');
    containerElement.html('');

    if (copy.bop['show_pickups'] === 'yes') {
        containerElement.append('h2')
            .html(copy.bop['hed_pickups']);

        containerElement.append('div')
            .attr('class', 'pickups');

        renderPickups({
            container: '#bop .pickups'
        });
    }

    containerElement.append('h2')
        .html(copy.bop['hed_bars']);

    _.each(charts, function (d, i) {
        var chartDiv = containerElement.append('div')
            .attr('class', 'chart ' + classify(d));

        // Render the chart!
        renderStackedBarChart({
            container: '#bop .chart.' + classify(d),
            width: graphicWidth,
            dataCalled: d === 'house' ? houseCalled : senateCalled,
            chart: d
        });
    });

    // update timestamp
    timestamp.html('(as of ' + lastUpdated + ' ET)');

    // Update iframe
    if (window.pymChild) {
        window.pymChild.sendHeight();
    }
};

/*
 * Render pickups
 */
var renderPickups = function (config) {
    var containerElement = d3.select(config['container']);

    charts.forEach(function (d, i) {
        var chamberElement = containerElement.append('div')
            .attr('class', 'chamber ' + classify(d));

        chamberElement.append('h3')
            .text(copy.bop['label_' + d]);

        chamberElement.append('p')
            .attr('class', 'desc')
            .html(copy.bop['pickups_' + d]);

        var gainElement = chamberElement.append('p')
            .attr('class', 'net-gain');
        gainElement.append('abbr')
            .attr('class', function() {
                if (CONGRESS[d]['pickup_party']) {
                    return classify(CONGRESS[d]['pickup_party']);
                }
            })
            .attr('title', function () {
                var party = CONGRESS[d]['pickup_party'];
                var t = copy.bop['pickups_none'];
                if (party) {
                    party = party.toLowerCase();
                    t = copy.bop['pickups_' + party];
                    t = t.replace('___PICKUPS___', CONGRESS[d]['pickup_seats']);
                }

                return t;
            })
            .text(function () {
                if (CONGRESS[d]['pickup_party']) {
                    var party = CONGRESS[d]['pickup_party'];
                    if (party === 'Dem') {
                        party = 'Dem.';
                    }
                    return party + ' +' + CONGRESS[d]['pickup_seats'];
                } else {
                    return CONGRESS[d]['pickup_seats'];
                }
            });
        gainElement.append('i')
            .text(copy.bop['pickups_gain']);
    });
};

/*
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function (config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var barHeight = 20;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: 0,
        bottom: 5,
        left: 0
    };

    var chamber = config['chart'];
    var uncalled = CONGRESS[chamber]['uncalled_races'];
    var half = CONGRESS[chamber]['total'] / 2;
    // Want to display 50%+1 seats, even for Senate; see discussion:
    // https://github.com/nprapps/elections18-graphics/issues/118
    var majority = Math.floor(half + 1);
    var roundTicksFactor = 1;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = barHeight;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.append('h3')
        .text(CONGRESS[chamber]['label'])
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

    /*
     * Render bars to chart.
     */
    var group = chartElement.selectAll('.group')
        .data([ config['dataCalled'] ])
        .enter().append('g')
            .attr('class', function (d, i) {
                return 'group group-' + i;
            });

    group.selectAll('rect')
        .data(function (d) {
            return d;
        })
        .enter().append('rect')
            .attr('class', function (d) {
                return classify(d['name']);
            })
            .attr('x', function (d) {
                return xScale(d['x0']);
            })
            .attr('width', function (d) {
                return Math.abs(xScale(d['x1']) - xScale(d['x0']));
            })
            .attr('height', barHeight);

    /*
     * Render majority line.
     */
    var majorityMarker = chartElement.append('g')
        .attr('class', 'majority-marker');
    majorityMarker.append('line')
        .attr('x1', xScale(half))
        .attr('x2', xScale(half))
        .attr('y1', -margins['top'])
        .attr('y2', (barHeight + margins['top']));

    /*
     * Bar labels
     */
    var barLabels = chartWrapper.append('div')
        .attr('class', 'bar-labels');

    _.each(config['dataCalled'], function (d) {
        var lbl = d['name'];
        var textAnchor = null;
        var xPos = null;
        var sPos = null; // css for xPos
        var showLabel = true;
        switch (d['name']) {
            case 'Dem.':
                xPos = xScale(d['x0']);
                sPos = 'left: 0px; ';
                lbl = (d['isWinner'] ? '<i class="icon icon-ok"></i>Dem.' : 'Dem.');
                break;
            case 'GOP':
                xPos = xScale(d['x1']);
                sPos = 'right: 0px; ';
                lbl = (d['isWinner'] ? '<i class="icon icon-ok"></i>GOP' : 'GOP');
                break;
            default:
                xPos = xScale(d['x0'] + ((d['x1'] - d['x0']) / 2));
                sPos = 'left: ' + xPos + 'px; ';
                if (d['name'] == 'Not yet called' || d['val'] == 0) {
                    showLabel = false;
                }
                break;
        }

        if (showLabel) {
            barLabels.append('label')
                .html(lbl + ': ' + d['val'])
                .attr('class', 'party ' + classify(d['name']))
                .attr('style', function () {
                    var s = '';
                    s += 'top: ' + 0 + '; ';
                    s += sPos;
                    return s;
                });
        }
    });

    // shift xPos of independent label
    // base positioning on the xpos/width of the "Dem." label
    barLabels.select('.party.ind')
        .attr('style', function() {
            var bbox = this.getBoundingClientRect();
            var bboxDem = document.querySelector('label.dem').getBoundingClientRect();
            var bboxDemOffset = valueGap;
            if (CONGRESS[chamber]['winner'] == 'Dem') {
                bboxDemOffset = 18; // account for possible icon width
            }
            var bboxDemValue = bboxDem['x'] + bboxDem['width'] + bboxDemOffset;

            var xPos = bbox['x'] - (bbox['width'] / 2);
            if (xPos < bboxDemValue) {
                xPos = bboxDemValue;
            }

            var s = '';
            s += 'top: ' + 0 + '; ';
            s += 'left: ' + xPos + 'px;';
            return s;
        });

    // majority and seats remaining
    chartWrapper.append('h4')
        .text(majority + ' needed for majority | ' + uncalled + ' not yet called');
};

export {
    initBop,
    renderBop
};
