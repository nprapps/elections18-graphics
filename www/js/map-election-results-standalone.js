/* TODO
- account for NE and ME split votes
- tooltips
- legend
- electoral totals
- last updated (overall)
- pct reporting
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
        .stroke(colorScale('D-Leading'))
        .background('#bbb');

    tRLead = textures.lines()
        .size(8)
        .strokeWidth(2)
        .stroke(colorScale('R-Leading'))
        .background('#bbb');

    tILead = textures.lines()
        .size(8)
        .strokeWidth(2)
        .stroke(colorScale('I-Leading'))
        .background('#bbb');

    // render legend
    renderLegend();

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

    var blockSize = 15;
    var blockGap = 3;
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


    // // Create legend
    // var legendElement = d3.select(config['container']);
    //
    // var legendSequence = [ 1, 2, 3, 4, 5 ];
    // // different key sort order on mobile
    // if (isMobile) {
    //     legendSequence = [ 1, 2, 3, 5, 4 ];
    // }
    // _.each(legendSequence, function(d, i) {
    //     var keyData = LEGEND[d];
    //     var keyItem = legendElement.append('li')
    //         .classed('key-item', true)
    //
    //     keyItem.append('b')
    //         .style('background', colorScale(keyData['text']));
    //
    //     keyItem.append('label')
    //         .text(keyData['text']);
    // });
};


/*
 * Render an electoral map
 */
var renderElectoralMap = function(config) {
    var dataColumn = 'category';

    // Copy map template
    var containerElement = d3.select(config['container']);
    var mapElement = containerElement.select('svg');

    mapElement.call(tDLead);
    mapElement.call(tRLead);
    mapElement.call(tILead);

    var scaleFactor = 30;
    console.log(config['data']);
    _.each(config['data'], function(d,i) {
        var st = i;
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

        stBox.on('mouseover', onStateMouseover);
        stBox.on('mouseout', onStateMouseout);

        if (d['flag'] != null) {
            stRect.classed(classify(d['flag']), true);
        }

        var stLabel = stBox.select('text');
        if (d['electtotal'] < 6) {
            stLabel.classed('small', true);
        }

        if (stLabel[0][0] != null && st != 'ME' && st != 'NE') {
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

            if (!isMobile) {
                stLabel.attr('y', Number(stLabel.attr('y')) - 5);
                stBox.append('text')
                    .attr('class', 'votes')
                    .text(d['electtotal'])
                    .attr('x', stLabel.attr('x'))
                    .attr('y', Number(stLabel.attr('y')) + 10);
            }
        }
    });

    // address the states w/ districts
    districtStates.forEach(function(d,i) {
        var stBox = mapElement.select('.' + classify(d['abbr']));
        stBox.select('.votes').remove();
        console.log(stBox);
        var stLabel = stBox.select('text')
            .classed('small', true);
        if (!isMobile) {
            stLabel.text(function() {
                return d['abbr'] + ' (' + d['votes'] + ')';
            });
        }
    });
}


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
