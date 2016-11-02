// npm libraries
import d3 from 'd3';
import * as _ from 'underscore';
import request from 'superagent';

// Global vars
window.pymChild = null;
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
var MOBILE_THRESHOLD = 500;
var LOAD_INTERVAL = 15000;
var isInitialized = false;
var isMobile = false;
var lastUpdated = '';
var charts = d3.keys(CONGRESS);
var skipLabels = [ 'label', 'values' ];
var bopData = [];
var electoralData = [];
var reloadData = null;
var graphicWidth = null;
var timestamp = null;

var electoralTotals = null;
var clintonTitle = null;
var clintonElectoral = null;
var trumpTitle = null;
var trumpElectoral = null;
var lastRequestTime = null;

/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    electoralTotals = d3.select('#electoral-totals');
    clintonTitle = electoralTotals.select('.clinton h3');
    clintonElectoral = electoralTotals.select('.clinton-electoral');
    trumpTitle = electoralTotals.select('.trump h3');
    trumpElectoral = electoralTotals.select('.trump-electoral');
    timestamp = d3.select('.footer .timestamp');

    // load data
    loadData();
}


/*
 * Load data
 */
var loadData = function() {
    clearInterval(reloadData);
    console.log('loadData: ' + DATA_FILE);
    request.get(buildDataURL(DATA_FILE))
        .set('If-Modified-Since', lastRequestTime ? lastRequestTime : '')
        .end(function(err, res) {
            if (err) {
                console.warn(err);
            }

            lastRequestTime = new Date().toUTCString();
            bopData = res.body;
            electoralData = res.body.electoral_college;
            lastUpdated = res.body.last_updated;
            formatData();
        });
}



/*
 * Format data for D3.
 */
var formatData = function() {
    var parties = {
        'senate': [ 'Dem', 'Other', 'Not yet called', 'GOP' ],
        'house': [ 'Dem', 'Not yet called', 'Other', 'GOP' ]
    }

    // update overall totals
    trumpElectoral.html(electoralData['Trump']);
    if (electoralData['Trump'] >= 270) {
        trumpTitle.html('Trump <i class="icon icon-ok"></i>');
    } else {
        trumpTitle.html('Trump');
    }

    clintonElectoral.html(electoralData['Clinton']);
    if (electoralData['Clinton'] >= 270) {
        clintonTitle.html('Clinton <i class="icon icon-ok"></i>');
    } else {
        clintonTitle.html('Clinton');
    }

    // bop chart
    _.each(charts, function(d) {
        var chamber = bopData[d + '_bop'];
        var x0 = 0;

        chamber['values'] = [];

        _.each(parties[d], function(party) {
            var val = null;

            if (party == 'Not yet called') {
                val = +chamber['uncalled_races'];
            } else {
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
    });

    if (!isInitialized) {
        init();
    } else {
        redrawChart();
    }

    reloadData = setInterval(loadData, LOAD_INTERVAL);

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
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

    graphicWidth = containerWidth;

    redrawChart();
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
            data: [ bopData[classify(d) + '_bop'] ],
            chart: d
        });
    })

    // update timestamp
    timestamp.html('(as of ' + lastUpdated + ' ET)');

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

    var majority = config['data'][0]['majority'];
    var half = CONGRESS[config['chart']]['half'];
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
    var max = config['data'][0]['total_seats'];

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
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
