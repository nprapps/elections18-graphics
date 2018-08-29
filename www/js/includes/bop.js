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
var lastRequestTime = '';
var indicator = null;
var footnotes = null;

var senateCalled = [];
var houseCalled = [];

/*
 * Initialize the graphic.
 */
const initBop = function(containerWidth) {
    timestamp = d3.select('.footer .timestamp');
    indicator = document.querySelector('.countdown');
    footnotes = d3.select('.footnotes');
    graphicWidth = containerWidth;

    loadData();
    //console.log('YOU TURNED OFF THE REFRESH INTERVAL');
    setInterval(loadData, LOAD_INTERVAL)
}

/*
 * Load a datafile
 */
var loadData = function() {
    request.get(buildDataURL(DATA_FILE))
        .set('If-Modified-Since', lastRequestTime)
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

            countdown.resultsCountdown(indicator, LOAD_INTERVAL);
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
    CONGRESS['senate']['total'] = sData['total_seats'];
    CONGRESS['senate']['majority'] = sData['majority'];

    var hData = bopData['house_bop'];
    houseCalled = [
        { 'name': 'Dem.', 'val': hData['Dem']['seats'] },
        { 'name': 'Not yet called', 'val': hData['uncalled_races'] },
        { 'name': 'Ind.', 'val': hData['Other']['seats'] },
        { 'name': 'GOP', 'val': hData['GOP']['seats'] }
    ];
    CONGRESS['house']['total'] = hData['total_seats'];
    CONGRESS['house']['majority'] = hData['majority'];

    _.each([ senateCalled, houseCalled ], function(d, i) {
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
    // LoadData calls redrawChart after ensuring that the data is there
    // for the graphic to render.
    loadData();
}

//
var redrawChart = function() {
    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#bop');
    containerElement.html('');

    _.each(charts, function(d, i) {
        var chartDiv = containerElement.append('div')
            .attr('class', 'chart ' + classify(d));

        // Render the chart!
        renderStackedBarChart({
            container: '#bop .chart.' + classify(d),
            width: graphicWidth,
            dataCalled: eval(classify(d) + 'Called'),
            chart: d
        });
    })

    // update timestamp
    timestamp.html('(as of ' + lastUpdated + ' ET)');

    // Update iframe
    if (window.pymChild) {
        window.pymChild.sendHeight();
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

    var barCalledHeight = 35;
    var barGap = 2;
    var valueGap = 6;

    var margins = {
        top: 46,
        right: 1,
        bottom: 0,
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
    if (config['width'] <= SIDEBAR_THRESHOLD) {
        margins['left'] = 46;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = barCalledHeight;

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

    /*
     * Render bars to chart.
     */
    var group = chartElement.selectAll('.group')
        .data([ config['dataCalled'] ])
        .enter().append('g')
            .attr('class', function(d, i) {
                return 'group group-' + i;
            })
            .attr('transform', function(d, i) {
                var yPos = null;
                if (i == 0) {
                    yPos = 0;
                } else if (i == 1) {
                    yPos = barCalledHeight + barGap;
                }
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

                return barCalledHeight;
            })
            .attr('class', function(d) {
                return classify(d['name']);
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
    majorityMarker.append('text')
        .attr('x', xScale(half))
        .attr('y', (-margins['top'] + 10))
        .text(majority + ' needed for majority');

    /*
     * Annotations
     */
    var annotations = chartElement.append('g')
        .attr('class', 'annotations');

    _.each(config['dataCalled'], function(d) {
        var lbl = d['name'];
        var textAnchor = null;
        var xPos = null;
        var yPos = -18;
        var showLabel = true;
        switch(d['name']) {
            case 'Dem.':
                xPos = xScale(d['x0']);
                textAnchor = 'start';
                lbl = 'Dem.';
                break;
            case 'GOP':
                xPos = xScale(d['x1']);
                textAnchor = 'end';
                break;
            default:
                xPos = xScale(d['x0'] + ((d['x1'] - d['x0']) / 2));
                textAnchor = 'middle';
                if (_.contains([ 'Not yet called' ], d['name']) || d['val'] == 0) {
                    showLabel = false;
                }
                break;
        }

        if (showLabel) {
            annotations.append('text')
                .text(lbl)
                .attr('class', 'party ' + classify(d['name']))
                .attr('x', xPos)
                .attr('y', yPos)
                .attr('dy', 0)
                .attr('style', function() {
                    var s = '';
                    s += 'text-anchor: ' + textAnchor + '; ';
                    return s;
                });

            annotations.append('text')
                .text(d['val'])
                .attr('class', 'value ' + classify(d['name']))
                .attr('x', xPos)
                .attr('y', yPos)
                .attr('dy', 13)
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
