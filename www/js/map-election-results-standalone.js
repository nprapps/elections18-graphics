/* TODO
- account for NE and ME split votes
- tooltips
- legend (mobile)
- electoral totals
- last updated (overall)
- pct reporting
- poll closing times
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
var isMobile = false;
var lastUpdated = '';
var electoralData = [];
var colorScale = null;
var districtStates = [ { 'abbr': 'ME', 'votes': 4 },
                       { 'abbr': 'NE', 'votes': 5 } ];
var mapElement = null;
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
    timestamp = d3.select('.footer .timestamp');
    tooltip = d3.select('#tooltip');
    mapElement = d3.select('.map svg')

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
        s['winner'] = null;

        _.each(s, function(c) {
            if (c['winner']) {
                s['winner'] = c['party'];
            }
        });
    });

    // update timestamp
    timestamp.html('(as of TKTKTK)');

    // init map (only once)
    if (!pymChild) {
        init();
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

    // render legend
    renderLegend();

    // position map labels
    positionMapLabels();

    // disable loading css
    d3.select('#graphic')
        .classed('loading', false);

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

    // Render the map!
    renderElectoralMap({
        container: '.map',
        width: containerWidth,
        data: electoralData
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Draw legend
 */
var renderLegend = function() {
    console.log('render legend');

    var containerElement = d3.select('.map');
    var legendElement = containerElement.append('svg')
        .attr('width', 75)
        .attr('height', 145)
        .attr('class', 'legend');

    legendElement.call(tDLead);
    legendElement.call(tRLead);
    legendElement.call(tILead);

    var blockSize = 13;
    var blockGap = 2;
    var blockTextGap = 6;
    _.each(colorScale.domain(), function(d, i) {
        var l = legendElement.append('g')
            .attr('class', classify(d));
        l.append('rect')
            .attr('x', 0)
            .attr('width', blockSize)
            .attr('y', (blockSize + blockGap) * i)
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
            .attr('y', (blockSize + blockGap) * i)
            .attr('dy', (blockSize / 2) + 4);
    });
};


/*
 * Position map labels
 */
var positionMapLabels = function() {
    console.log('positionMapLabels');

    _.each(electoralData, function(d,i) {
        console.log(i, d);

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
 * Render an electoral map
 */
var renderElectoralMap = function(config) {
    _.each(config['data'], function(d,i) {
        var st = i;

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
        stBox.on('mouseover', onStateMouseover);
        stBox.on('mouseout', onStateMouseout);

        // show electoral votes on desktop; hide on mobile
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
    d3.event.preventDefault();
    var t = d3.select(this);
    t.classed('active', true);

    var st = t[0][0]['classList'][0];

    tooltip.classed('active', true);
    console.log(st, electoralData[st.toUpperCase()]);
}

var onStateMouseout = function() {
    d3.event.preventDefault();
    var t = d3.select(this);
    t.classed('active', false);
    tooltip.classed('active', false);
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
