// npm libraries
import d3 from 'd3';
import * as _ from 'underscore';
import textures from 'textures';

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

// Global vars
var DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
var pymChild = null;
var isMobile = false;
var lastUpdated = '';
var electoralData = [];
var categories = [];
var categoryLabels = [];
var colorScale = null;
var districtStates = [ { 'abbr': 'ME', 'votes': 4 },
                       { 'abbr': 'NE', 'votes': 5 } ];

/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    formatData();

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
 * Format data for D3.
 */
var formatData = function() {
    _.each(DATA, function(d) {
        d['electoral_votes'] = +d['electoral_votes'];
    });

    // Extract categories from data
    var colorRange = [];
    _.each(LEGEND, function(key) {
        categories.push(key['text']);
        if (key['text'] == 'Tossup') {
            colorRange.push(key['color']);
        } else {
            colorRange.push(eval(key['color']));
        }
    });

    colorScale = d3.scale.ordinal()
        .domain(categories)
        .range(colorRange);
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

    // Render the chart!
    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    var legendContainer = containerElement.append('ul')
        .attr('class', 'key');

    renderLegend({
        container: '.key'
    })

    var mapContainer = containerElement.append('div')
        .attr('class', 'map');

    renderElectoralMap({
        container: '.map',
        width: containerWidth,
        data: DATA
    });

    // renderBoxes({
    //     container: '#graphic',
    //     width: containerWidth,
    //     data: DATA
    // });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Draw legend
 */
var renderLegend = function(config) {
    // Create legend
    var legendElement = d3.select(config['container']);

    var legendSequence = [ 1, 2, 3, 4, 5 ];
    // different key sort order on mobile
    if (isMobile) {
        legendSequence = [ 1, 2, 3, 5, 4 ];
    }
    _.each(legendSequence, function(d, i) {
        var keyData = LEGEND[d];
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(keyData['text']));

        keyItem.append('label')
            .text(keyData['text']);
    });
};


/*
 * Render an electoral map
 */
var renderElectoralMap = function(config) {
    var dataColumn = 'category';

    // Copy map template
    var containerElement = d3.select(config['container'])
        .append('div')
        .attr('class', 'map-wrapper');
    var template = d3.select('#electoral-map');
    containerElement.html(template.html());
    var mapElement = containerElement.select('svg');

    var tDLean = textures.lines()
        .size(8)
        .strokeWidth(2)
        .stroke(colorScale('D-Lean'))
        .background('#bbb');

    var tRLean = textures.lines()
        .size(8)
        .strokeWidth(2)
        .stroke(colorScale('R-Lean'))
        .background('#bbb');

    mapElement.call(tDLean);
    mapElement.call(tRLean);

    var scaleFactor = 30;
    config['data'].forEach(function(d,i) {
        var st = d['usps'];
        var stCategory = LEGEND[d[dataColumn]]['text'];
        var stCategoryClass = classify(stCategory);

        var stBox = mapElement.select('.' + classify(st))
            .classed(stCategoryClass, true);

        var stRect = stBox.select('rect');
        switch(stCategory) {
            case 'D-Lean':
                stRect.attr('fill', tDLean.url());
                break;
            case 'R-Lean':
                stRect.attr('fill', tRLean.url());
                break;
            default:
                stRect.attr('fill', colorScale(stCategory));
                break;
        }

        if (d['flag'] != null) {
            stRect.classed(classify(d['flag']), true);
        }

        var stLabel = stBox.select('text');
        if (d['electoral_votes'] < 6) {
            stLabel.classed('small', true);
        }

        if (stLabel[0][0] != null) {
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
                    .text(d['electoral_votes'])
                    .attr('x', stLabel.attr('x'))
                    .attr('y', Number(stLabel.attr('y')) + 10);
            }
        }
    });

    // address the states w/ districts
    districtStates.forEach(function(d,i) {
        var stBox = mapElement.select('.' + classify(d['abbr']));
        var stLabel = stBox.select('text')
            .classed('small', true);
        if (!isMobile) {
            stLabel.text(function() {
                return d['abbr'] + ' (' + d['votes'] + ')';
            });
        }
    });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
