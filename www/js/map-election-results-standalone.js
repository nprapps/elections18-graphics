/* TODO
- account for NE and ME split votes in color blocks
- electoral totals
- popular vote
- last updated timestamp (overall)
- poll closing times
- modernizr support? disable tooltips on touch devices.
- load updated json on an interval
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
var DATA_URL = '../data/presidential-national.json';
var DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
var pymChild = null;
var isInitialized = false;
var isMobile = false;
var lastUpdated = '';
var electoralData = [];
var colorScale = null;
var countySelector = null;
var districtStates = [ { 'abbr': 'ME', 'votes': 4 },
                       { 'abbr': 'NE', 'votes': 5 } ];
var mapElement = null;
var mapWidth = null;
var mapScale = null;
var timestamp = null;
var tooltip = null;
var tDLead = null;
var tRLead = null;
var tILead = null;


/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    // cache elements
    countySelector = d3.select('#county-selector select');
    mapElement = d3.select('.map svg');
    timestamp = d3.select('.footer .timestamp');
    tooltip = d3.select('#tooltip');

    // load data
    loadData(DATA_URL);
}


/*
 * Load data
 */
var loadData = function(url) {
    d3.json(url, function(error, data) {
        if (error) {
            console.warn(error);
        }

        electoralData = data;
        formatData();
    });
}


/*
 * Format data for D3.
 */
var formatData = function() {
    // format data
    _.each(electoralData, function(s) {
        s = s.sort(function(a, b){
            return d3.descending(a['votecount'], b['votecount']);
        });

        s['precinctsreporting'] = s[0]['precinctsreporting'];
        s['precinctsreportingpct'] = s[0]['precinctsreportingpct'];
        s['precinctstotal'] = s[0]['precinctstotal'];
        s['electtotal'] = s[0]['electtotal'];
        s['statename'] = s[0]['statename'];
        s['winner'] = null;

        _.each(s, function(c) {
            if (c['winner']) {
                s['winner'] = c['party'];
            }
        });
    });

    // update timestamp
    timestamp.html('(as of TKTKTK)');

    // init pym and render callback
    pymChild = new pym.Child({
        renderCallback: render
    });

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}


/*
 * Render the graphic.
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

    // init map (only once)
    if (!isInitialized) {
        init();
    }

    // render legend
    renderLegend();

    // adjust map measurements
    mapWidth = containerWidth;
    mapElement.attr('width', mapWidth);

    // reset map scale (relevant to tooltip positioning)
    mapScale = mapWidth / 720;

    // color in the map!
    updateElectoralMap();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Initialization
 */
var init = function() {
    console.log('init');

    // Extract categories from data
    var categories = [];
    var colorRange = [];

    _.each(LEGEND, function(key) {
        categories.push(key['label']);
        colorRange.push(eval(key['color']));
    });

    colorScale = d3.scale.ordinal()
        .domain(categories)
        .range(colorRange);

    // define textures
    tDLead = textures.lines()
        .size(8)
        .strokeWidth(2)
        .stroke(colorScale('D-Ahead'))
        .background(COLORS['gray5']);

    tRLead = textures.lines()
        .size(8)
        .strokeWidth(2)
        .stroke(colorScale('R-Ahead'))
        .background(COLORS['gray5']);

    tILead = textures.lines()
        .size(8)
        .strokeWidth(2)
        .stroke(colorScale('I-Ahead'))
        .background(COLORS['gray5']);

    mapElement.call(tDLead);
    mapElement.call(tRLead);
    mapElement.call(tILead);

    // position map labels
    positionMapLabels();

    // county selector dropdown
    countySelector.on('change', onCountySelected);

    // disable loading css
    d3.select('#graphic')
        .classed('loading', false);

    isInitialized = true;
}


/*
 * Draw legend
 */
var renderLegend = function() {
    console.log('render legend');

    var containerElement = d3.select('.map');
    containerElement.select('.legend').remove();

    var legendWidth = 75;
    var legendHeight = 125;

    if (isMobile) {
        legendWidth = 300;
        legendHeight = 45;
    }

    var legendElement = containerElement.append('svg')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .attr('class', 'legend');

    legendElement.call(tDLead);
    legendElement.call(tRLead);
    legendElement.call(tILead);

    var blockSize = 13;
    var blockGap = 2;
    var blockTextGap = 6;
    var col = 0;
    var row = 0;
    _.each(colorScale.domain(), function(d, i) {
        var xPos = 0;
        var yPos = ((blockSize + blockGap) * i);
        if (isMobile) {
            xPos = (legendWidth / 4) * col;
            yPos = ((blockSize + blockGap) * row);
            row++;
            if (row == 3) {
                row = 0;
                col++;
            }
        }

        var l = legendElement.append('g')
            .attr('class', classify(d))
            .attr('transform', 'translate(' + xPos + ',' + yPos + ')');
        l.append('rect')
            .attr('x', 0)
            .attr('width', blockSize)
            .attr('y', 0)
            .attr('height', blockSize)
            .attr('fill', function() {
                var f = colorScale(d)
                switch(i) {
                    case 3:
                        f = tDLead.url();
                        break;
                    case 4:
                        f = tRLead.url();
                        break;
                    case 5:
                        f = tILead.url();
                        break;
                }
                return f;
            });
        l.append('text')
            .text(d)
            .attr('x', (blockSize + blockTextGap))
            .attr('y', 0)
            .attr('dy', (blockSize / 2) + 4);
    });
};

/*
 * Render totals
*/
var renderStackedBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 60;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 100;

    if (isMobile) {
        ticksX = 2;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var min = d3.min(config['data'], function(d) {
        var lastValue = d['values'][d['values'].length - 1];
        return Math.floor(lastValue['x1'] / roundTicksFactor) * roundTicksFactor;
     });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        var lastValue = d['values'][d['values'].length - 1];
        return Math.ceil(lastValue['x1'] / roundTicksFactor) * roundTicksFactor;
    });

    var xScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([0, chartWidth]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        .range([ COLORS['teal3'], COLORS['orange3'], COLORS['blue3'], '#ccc' ]);

    /*
     * Render the legend.
     */
    var legend = containerElement.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(colorScale.domain())
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d);
			});

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d);
        });

    legend.append('label')
        .text(function(d) {
            return d;
        });

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
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d + '%';
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    /*
     * Render bars to chart.
     */
     var group = chartElement.selectAll('.group')
         .data(config['data'])
         .enter().append('g')
             .attr('class', function(d) {
                 return 'group ' + classify(d[labelColumn]);
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
      * Render bar values.
      */
     group.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('text')
            .text(function(d) {
                if (d['val'] != 0) {
                    return d['val'] + '%';
                }
            })
            .attr('class', function(d) {
                return classify(d['name']);
            })
            .attr('x', function(d) {
 				return xScale(d['x1']);
            })
            .attr('dx', function(d) {
                var textWidth = this.getComputedTextLength();
                var barWidth = Math.abs(xScale(d['x1']) - xScale(d['x0']));

                // Hide labels that don't fit
                if (textWidth + valueGap * 2 > barWidth) {
                    d3.select(this).classed('hidden', true)
                }

                if (d['x1'] < 0) {
                    return valueGap;
                }

                return -(valueGap + textWidth);
            })
            .attr('dy', (barHeight / 2) + 4)

    /*
     * Render 0-line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', xScale(0))
            .attr('x2', xScale(0))
            .attr('y1', 0)
            .attr('y2', chartHeight);
    }

    /*
     * Render bar labels.
     */
    chartWrapper.append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': margins['top'] + 'px',
            'left': '0'
        }))
        .selectAll('li')
        .data(config['data'])
        .enter()
        .append('li')
            .attr('style', function(d, i) {
                return formatStyle({
                    'width': labelWidth + 'px',
                    'height': barHeight + 'px',
                    'left': '0px',
                    'top': (i * (barHeight + barGap)) + 'px;'
                });
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .append('span')
                .text(function(d) {
                    return d[labelColumn];
                });
}


/*
 * Update the electoral map
 */
var updateElectoralMap = function() {
    _.each(electoralData, function(d,i) {
        var st = i;
        if (st != 'US') {
            // define category
            var stCategory = null;
            if (d['winner']) {
                switch(d['winner']) {
                    case 'Dem':
                        stCategory = colorScale.domain()[0];
                        break;
                    case 'GOP':
                        stCategory = colorScale.domain()[1];
                        break;
                    case 'Ind':
                        stCategory = colorScale.domain()[2];
                        break;
                }
            } else if (d[0]['votecount'] > d[0]['votecount']) {
                switch(d[0]['party']) {
                    case 'Dem':
                        stCategory = colorScale.domain()[4];
                        break;
                    case 'GOP':
                        stCategory = colorScale.domain()[5];
                        break;
                    case 'Ind':
                        stCategory = colorScale.domain()[6];
                        break;
                }
            } else if (d[0]['votecount'] > 0) {
                stCategory = colorScale.domain()[7];
            } else {
                stCategory = colorScale.domain()[8];
            }

            // color in state
            var stCategoryClass = classify(stCategory);

            var stBox = mapElement.select('.' + classify(st))
                .classed(stCategoryClass, true);

            var stRect = stBox.selectAll('rect');

            switch(stCategory) {
                case colorScale.domain()[4]:
                    stRect.attr('fill', tDLead.url());
                    break;
                case colorScale.domain()[5]:
                    stRect.attr('fill', tRLead.url());
                    break;
                case colorScale.domain()[6]:
                    stRect.attr('fill', tILead.url());
                    break;
                default:
                    stRect.attr('fill', colorScale(stCategory));
                    break;
            }

            // tooltips
            if (!isMobile) {
                stBox.on('mouseover', onStateMouseover);
                stBox.on('mouseout', onStateMouseout);
                stBox.attr('xlink:href', COUNTY_DATA[st]['url']);
            } else {
                stBox.on('mouseover', undefined);
                stBox.on('mouseout', undefined);
                stBox.attr('xlink:href', null);
            }

            // show electoral votes on desktop; hide on small screens
            var stLabel = stBox.select('text.state-abbr');
            if (stLabel[0][0] != null && st != 'ME' && st != 'NE') {
                if (!isMobile) {
                    stLabel.attr('dy', -5);
                    stBox.select('.votes')
                        .classed('active', true);
                } else {
                    stLabel.attr('dy', 0);
                    stBox.select('.votes')
                        .classed('active', false);
                }
            }
        }
    });

    _.each(districtStates, function(d,i) {
        var stBox = mapElement.select('.' + classify(d['abbr']));
        var stLabel = stBox.select('text');
        if (!isMobile) {
            stLabel.text(d['abbr'] + ' (' + d['votes'] + ')');
        } else {
            stLabel.text(d['abbr']);
        }
    });
}


/*
 * Tooltips / mouseovers
 */
var onStateMouseover = function() {
    // d3.event.preventDefault();
    var t = d3.select(this);
    var coords = d3.mouse(this);
    var st = t[0][0]['classList'][0].toUpperCase();
    var ttWidth = 150;

    // define tooltip text
    var ttText = '';
    ttText += '<h3>' + electoralData[st]['statename'] + ' <span>(' + electoralData[st]['electtotal'] + ')</span></h3>';
    ttText += '<table>';
    _.each(electoralData[st], function(c, k) {
        if ((_.contains([ 'ME', 'NE' ], st) && c['reportingunitname'] == 'At Large') || !_.contains([ 'ME', 'NE' ], st)) {
            ttText += '<tr>';
            ttText += '<td><b class="' + classify(c['party']) +  '"></b>' + c['last'];
            if (c['winner']) {
                ttText += '<i class="icon icon-ok"></i>';
            }
            ttText += '</td>';
            ttText += '<td class="amt">' + (c['votepct'] * 100).toFixed(1) + '%</td>';
            ttText += '</tr>';
        }
    });
    ttText += '</table>';
    ttText += '<p class="precincts">' + (electoralData[st]['precinctsreportingpct'] * 100).toFixed(0) + '% reporting</p>';

    // position the tooltip
    tooltip.html(ttText)
        .attr('style', function() {
            var leftPos = (coords[0] * mapScale) + 5;
            if (leftPos + ttWidth > mapWidth) {
                leftPos = leftPos - ttWidth;
            }
            var topPos = (coords[1] * mapScale) + 5;

            var s = '';
            s += 'left: ' + leftPos + 'px; ';
            s += 'top: ' + topPos + 'px;';
            return s;
        })
        .classed('active', true);

    // highlight the active state box
    t.classed('active', true);
}

var onStateMouseout = function() {
    // d3.event.preventDefault();
    var t = d3.select(this);
    t.classed('active', false);
    tooltip.classed('active', false);
}


/*
 * Position map labels
 */
var positionMapLabels = function() {
    _.each(electoralData, function(d,i) {
        var stBox = mapElement.select('.' + classify(i));
        var stRect = stBox.select('rect');
        var stLabel = stBox.select('text');

        if (d['electtotal'] < 6) {
            stLabel.classed('small', true);
        }

        if (stLabel[0][0] != null && i != 'ME' && i != 'NE') {
            stLabel.attr('x', function() {
                    var boxX = Number(stRect.attr('x'));
                    var boxWidth = Number(stRect.attr('width'));

                    return (boxX + (boxWidth / 2));
                })
                .attr('y', function() {
                    var boxY = Number(stRect.attr('y'));
                    var boxHeight = Number(stRect.attr('height'));
                    var labelBbox = stLabel[0][0].getBBox();

                    return (boxY + (boxHeight / 2) + (labelBbox.height / 3));
                })
                .attr('class', 'state-abbr');

            stBox.append('text')
                .attr('class', 'votes')
                .text(d['electtotal'])
                .attr('x', stLabel.attr('x'))
                .attr('y', Number(stLabel.attr('y')) + 5);
        }
    });

    // address the states w/ districts
    _.each(districtStates, function(d,i) {
        var stBox = mapElement.select('.' + classify(d['abbr']));
        stBox.select('.votes').remove();
        var stLabel = stBox.select('text')
            .classed('small', true);
    });
}


/*
 * county selector dropdown
 */
var onCountySelected = function() {
    var url = d3.select(this).property('value');
    window.open(url, '_top');
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
