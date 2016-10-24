console.log('loading bop');

/* TODO
- refresh data on an interval
- highlight existing senate seats differently?
- last updated timestamp
- refresh counter
- link bars to the big board
*/

// npm libraries
import d3 from 'd3';
import * as _ from 'underscore';
import textures from 'textures';

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

// Global vars
var DATA_URL = '../data/top-level-results.json';
var CONGRESS = {
    'senate': {
        'total': 100,
        'majority': 51,
        'Dem': 34,
        'GOP': 30,
        'Other': 2
    },
    'house': {
        'total': 435,
        'majority': 218,
        'Dem': 0,
        'GOP': 0,
        'Other': 0
    }
}
var DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

var pymChild = null;
var isInitialized = false;
var isMobile = false;
var charts = d3.keys(CONGRESS);
var skipLabels = [ 'label', 'values' ];
var bopData = [];
var reloadData = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    loadData();
}

/*
 * Load a datafile
 */
var loadData = function() {
    clearInterval(reloadData);
    console.log('loadData: ' + DATA_URL);
    d3.json(DATA_URL, function(error, data) {
        if (error) {
            console.warn(error);
        }

        bopData = data;
        formatData();
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    var parties = {
        'senate': [ 'Dem', 'Other', 'Not yet called', 'GOP' ],
        'house': [ 'Dem', 'Not yet called', 'Other', 'GOP' ]
    }

    _.each(charts, function(d) {
        var chamber = bopData[d + '_bop'];
        var x0 = 0;
        var totalCalled = 0;
        var totalRemaining = 0;

        _.each(chamber, function(c) {
            totalCalled += +c['seats'];
            // totalCalled = CONGRESS[d]['Dem'] + CONGRESS[d]['GOP'] + CONGRESS[d]['Other'];
        });

        totalRemaining = CONGRESS[d]['total'] - totalCalled;
        chamber['totalRemaining'] = totalRemaining;

        chamber['values'] = [];

        _.each(parties[d], function(party) {
            var val = null;

            if (party == 'Not yet called') {
                val = totalRemaining;
            } else {
                // chamber[party]['seats'] = CONGRESS[d][party];
                val = chamber[party]['seats'];
            }

            var x1 = x0 + val;

            chamber['values'].push({
                'name': party,
                'x0': x0,
                'x1': x1,
                'val': val
            })

            x0 = x1;
        });

        switch(d) {
            case 'senate':
                chamber['colorDomain'] = parties[d];
                chamber['colorRange'] =  [ COLORS['blue2'],
                                           COLORS['yellow3'],
                                           '#aaa',
                                           COLORS['red2'] ];
                break;
            case 'house':
                chamber['colorDomain'] = parties[d];
                chamber['colorRange'] =  [ COLORS['blue2'],
                                           '#aaa',
                                           COLORS['yellow3'],
                                           COLORS['red2'] ];
                break;
        }
    });

    if (!isInitialized) {
        init();
    }
}


/*
 * Initialize
 */
var init = function() {
    pymChild = new pym.Child({
        renderCallback: render
    });

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });

    isInitialized = true;
}


/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#bop');
    containerElement.html('');

    _.each(charts, function(d, i) {
        var chartDiv = containerElement.append('div')
            .attr('class', 'chart ' + classify(d));

        // Render the chart!
        renderStackedBarChart({
            container: '#bop .chart.' + classify(d),
            width: containerWidth,
            data: [ bopData[classify(d) + '_bop'] ],
            chart: d
        });
    })

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
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

    var barHeight = 20;
    var barGap = 0;
    var valueGap = 6;

    var margins = {
        top: 19,
        right: 1,
        bottom: 30,
        left: 1
    };

    var majority = CONGRESS[config['chart']]['majority'];
    var ticksX = 4;
    var roundTicksFactor = 1;

    if (isMobile) {
        ticksX = 2;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.append('h3')
        .text(config['chart'])
        .attr('style', 'margin-left: ' + margins['left'] + 'px; margin-right: ' + margins['right'] + 'px;');

    /*
     * Create D3 scale objects.
     */
    var min = 0;
    var max = CONGRESS[config['chart']]['total'];

    var xScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([0, chartWidth]);

    var colorScale = d3.scale.ordinal()
        .domain(config['data'][0]['colorDomain'])
        .range(config['data'][0]['colorRange']);


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

    // /*
    //  * Create D3 axes.
    //  */
    // var xAxis = d3.svg.axis()
    //     .scale(xScale)
    //     .orient('top')
    //     .tickValues([ majority ])
    //     .tickFormat(function(d) {
    //         return d + ' needed for majority';
    //     });
    //
    // /*
    //  * Render axes to chart.
    //  */
    // chartElement.append('g')
    //     .attr('class', 'x axis')
    //     .attr('transform', makeTranslate(0, 0))
    //     .call(xAxis);

    /*
     * Render bars to chart.
     */
     var group = chartElement.selectAll('.group')
         .data(config['data'])
         .enter().append('g')
             .attr('class', function(d) {
                 return 'group ' + classify(config['chart']);
             })
             .attr('transform', function(d,i) {
                 return 'translate(0,' + (i * (barHeight + barGap)) + ')';
             });

     group.selectAll('rect')
         .data(function(d) {
             return d['values'];
         })
         .enter().append('rect')
             .attr('x', function(d) {
                 if (d['x0'] < d['x1']) {
                     return xScale(d['x0']);
                 }

                 return xScale(d['x1']);
             })
             .attr('width', function(d) {
                 return Math.abs(xScale(d['x1']) - xScale(d['x0']));
             })
             .attr('height', barHeight)
             .style('fill', function(d) {
                 return colorScale(d['name']);
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
        .attr('x1', xScale(majority))
        .attr('x2', xScale(majority))
        .attr('y1', -valueGap)
        .attr('y2', chartHeight);
    majorityMarker.append('text')
        .attr('x', xScale(majority))
        .attr('y', 0)
        .attr('dy', -10)
        .text(majority + ' needed for majority');

    /*
     * Annotations
     */
    var annotations = chartElement.append('g')
        .attr('class', 'annotations');
    _.each(config['data'][0]['values'], function(d) {
        var lbl = d['name'];
        var textAnchor = null;
        var xPos = null;
        var yPos = chartHeight + 15;
        var showLabel = true;
        switch(d['name']) {
            case 'Dem':
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
                if (d['name'] == 'Not yet called' || d['val'] == 0) {
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
                    s += 'fill: ' + colorScale(d['name']);
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
                    // s += 'fill: ' + colorScale(d['name']);
                    return s;
                });
        }
    });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;