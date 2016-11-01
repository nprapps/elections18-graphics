/* TODO
- popular vote
- modernizr support? disable tooltips on touch devices.
- refresh counter
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

window.pymChild = null;
var DATA_FILE = 'presidential-national.json';
var DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 480;
var LOAD_INTERVAL = 20000;
var isHP = false;
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
var reloadData = null;
var timestamp = null;
var lastUpdated = null;
var tooltip = null;
var tDLead = null;
var tRLead = null;
var tILead = null;

var electoralTotals = null;
var clintonTitle = null;
var clintonElectoral = null;
var trumpTitle = null;
var trumpElectoral = null;

/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    // cache elements
    countySelector = d3.select('#county-selector select');
    mapElement = d3.select('.map svg');
    timestamp = d3.select('.footer .timestamp');
    tooltip = d3.select('#tooltip');

    electoralTotals = d3.select('#electoral-totals');
    clintonTitle = electoralTotals.select('.clinton h3');
    clintonElectoral = electoralTotals.select('.clinton-electoral');
    trumpTitle = electoralTotals.select('.trump h3');
    trumpElectoral = electoralTotals.select('.trump-electoral');

    if (getParameterByName('hp')) {
        isHP = true;
        d3.select('body').classed('hp', true);
    }

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

    // define textures for "leading/ahead"
    tDLead = textures.lines()
        .size(8)
        .strokeWidth(2)
        .stroke(colorScale('D-Ahead'))
        .background(COLORS['gray3']);

    tRLead = textures.lines()
        .size(8)
        .strokeWidth(2)
        .stroke(colorScale('R-Ahead'))
        .background(COLORS['gray3']);

    tILead = textures.lines()
        .size(8)
        .strokeWidth(2)
        .stroke(colorScale('I-Ahead'))
        .background(COLORS['gray3']);

    mapElement.call(tDLead);
    mapElement.call(tRLead);
    mapElement.call(tILead);

    // load data
    loadData();
}


/*
 * Load data
 */
var loadData = function() {
    clearInterval(reloadData);
    console.log('loadData: ' + DATA_FILE);
    d3.json(buildDataURL(DATA_FILE), function(error, data) {
        if (error) {
            console.warn(error);
        }

        electoralData = data.results;
        lastUpdated = data.last_updated;
        console.log(electoralData);
        formatData();
    });
}

var buildDataURL = function(filename) {
    if (document.location.hostname === '127.0.0.1' ||
        document.location.hostname === 'localhost' ||
        document.location.hostname === '0.0.0.0') {
        return document.location.protocol + '//' + document.location.hostname + ':' + document.location.port + '/data/' + filename;
    } else {
        return document.location.protocol + '//' + document.location.hostname + '/elections16/data/' + filename;
    }
}


/*
 * Format data for D3.
 */
var formatData = function() {
    _.each(electoralData, function(s, i) {
        s = s.sort(function(a, b){
            return d3.descending(a['votecount'], b['votecount']);
        });

        s['winner'] = null;
        s['category'] = null;
        s['category_class'] = null;
        s['has_districts'] = true;

        var districts = null;
        if (_.contains([ 'ME', 'NE' ], i)) {
            s['districts'] = [];
            districts = _.pluck(s, 'reportingunitname');
            districts = d3.set(districts).values()
                .filter(function(dist) {
                    return dist != 'null';
                });
            _.each(districts, function(dist) {
                s['districts'][dist] = [];
                s['districts'][dist]['winner'] = null;
            });

            var stateLevel = s.filter(function(c) {
                return c.level == 'state';
            });

            s['precinctsreporting'] = stateLevel[0]['precinctsreporting'];
            s['precinctsreportingpct'] = stateLevel[0]['precinctsreportingpct'];
            s['precinctstotal'] = stateLevel[0]['precinctstotal'];
            s['electtotal'] = stateLevel[0]['electtotal'];
            s['statename'] = stateLevel[0]['statename'];
        } else {
            s['precinctsreporting'] = s[0]['precinctsreporting'];
            s['precinctsreportingpct'] = s[0]['precinctsreportingpct'];
            s['precinctstotal'] = s[0]['precinctstotal'];
            s['electtotal'] = s[0]['electtotal'];
            s['statename'] = s[0]['statename'];
        };

        _.each(s, function(c) {
            if (!_.contains([ 'Dem', 'GOP' ], c['party'])) {
                c['party'] = 'Ind';
            }
            if (c['npr_winner'] && c['level'] == 'state') {
                s['winner'] = c['party'];
            }
            if (c['level'] == 'district') {
                s['districts'][c['reportingunitname']].push(c);

                if (c['npr_winner']) {
                    s['districts'][c['reportingunitname']]['winner'] = c['party'];
                }
            }
        });

        if (s['statename'] != 'National') {
            if (typeof s[0]['meta'] != 'undefined') {
                s['poll_closing'] = s[0]['meta']['poll_closing'] + ' ET';
            } else {
                s['poll_closing'] = null;
            }

            // define which legend category this fits with
            s['category'] = assignCategory(s);
            s['color'] = assignColor(s['category']);

            if (districts) {
                _.each(districts, function(dist, k) {
                    s['districts'][dist]['category'] = assignCategory(s['districts'][dist]);
                    s['districts'][dist]['color'] = assignColor(s['districts'][dist]['category']);
                });
            }
        }
    });

    // update overall totals
    _.each(electoralData['US'], function(c) {
        switch(c['last']) {
            case 'Trump':
                var votePct = c['votepct'] * 100;
                trumpElectoral.html(c['npr_electwon']);
                if (c['npr_electwon'] >= 270) {
                    trumpTitle.html(c['last'] + ' <i class="icon icon-ok"></i>');
                } else {
                    trumpTitle.html(c['last']);
                }
                break;
            case 'Clinton':
                var votePct = c['votepct'] * 100;
                clintonElectoral.html(c['npr_electwon']);
                if (c['npr_electwon'] >= 270) {
                    clintonTitle.html(c['last'] + ' <i class="icon icon-ok"></i>');
                } else {
                    clintonTitle.html(c['last']);
                }
                break;
        }
    });

    // update timestamp
    timestamp.html('(as of ' + lastUpdated + ' ET)');

    // color in the map!
    updateElectoralMap();

    reloadData = setInterval(loadData, LOAD_INTERVAL);

    if (!isInitialized) {
        init();
    }
}


/*
 * Assign categories
 */
var assignCategory = function(data) {
    var category = null;

    if (data['winner']) {
        switch(data['winner']) {
            case 'Dem':
                category = colorScale.domain()[0];
                break;
            case 'GOP':
                category = colorScale.domain()[1];
                break;
            case 'Ind':
                category = colorScale.domain()[2];
                break;
        }
    } else if (data[0]['votecount'] > data[1]['votecount']) {
        switch(data[0]['party']) {
            case 'Dem':
                category = colorScale.domain()[3];
                break;
            case 'GOP':
                category = colorScale.domain()[4];
                break;
            case 'Ind':
                category = colorScale.domain()[5];
                break;
        }
    } else if (data[0]['votecount'] > 0) {
        category = colorScale.domain()[6];
    } else {
        category = colorScale.domain()[7];
    }

    return category;
}


/*
 * Assign state color/pattern
 */
var assignColor = function(category) {
    switch(category) {
        case colorScale.domain()[3]:
            return tDLead.url();
            break;
        case colorScale.domain()[4]:
            return tRLead.url();
            break;
        case colorScale.domain()[5]:
            return tILead.url();
            break;
        default:
            return colorScale(category);
            break;
    }
}


/*
 * Initialization
 */
var init = function() {
    // position map labels
    positionMapLabels();

    // county selector dropdown
    countySelector.on('change', onCountySelected);

    // disable loading css
    d3.select('#graphic')
        .classed('loading', false);

    isInitialized = true;

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
 * Draw legend
 */
var renderLegend = function() {
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
 * Update the electoral map
 */
var updateElectoralMap = function() {
    _.each(electoralData, function(d,i) {
        var st = i;
        if (st != 'US') {
            var stBox = mapElement.select('.' + classify(st));

            if (electoralData[st]['districts']) {
                var distData = electoralData[st]['districts'];
                switch(st) {
                    case 'ME':
                        stBox.select('.me-1 rect')
                            .attr('fill', distData['District 1']['color']);
                        stBox.select('.me-2 rect')
                            .attr('fill', distData['District 2']['color']);
                        stBox.select('.me-3 rect')
                            .attr('fill', distData['At Large']['color']);
                        stBox.select('.me-4 rect')
                            .attr('fill', distData['At Large']['color']);
                        break;
                    case 'NE':
                        stBox.select('.ne-2 rect')
                            .attr('fill', distData['District 1']['color']);
                        stBox.select('.ne-3 rect')
                            .attr('fill', distData['District 2']['color']);
                        stBox.select('.ne-5 rect')
                            .attr('fill', distData['District 3']['color']);
                        stBox.select('.ne-1 rect')
                            .attr('fill', distData['At Large']['color']);
                        stBox.select('.ne-4 rect')
                            .attr('fill', distData['At Large']['color']);
                        break;
                }
            } else {
                stBox.select('rect')
                    .attr('fill', electoralData[st]['color']);
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
    var stateData = electoralData[st];
    var ttWidth = 150;

    // define tooltip text
    var ttText = '';
    ttText += '<h3>' + stateData['statename'] + ' <span>(' + stateData['electtotal'] + ')</span></h3>';
    if (stateData['category'] == colorScale.domain()[7]) {
        if (stateData['poll_closing']) {
            ttText += '<p class="poll-closing">Polls close at ' + stateData['poll_closing'] + '</p>';
        } else {
            ttText += '<p class="poll-closing">No data available.</p>';
        }
    } else {
        ttText += '<table>';
        _.each(electoralData[st], function(c, k) {
            if (c['level'] == 'state') {
                ttText += '<tr>';
                ttText += '<td><b class="' + classify(c['party']) +  '"></b>' + c['last'];
                if (c['npr_winner']) {
                    ttText += '<i class="icon icon-ok"></i>';
                }
                ttText += '</td>';
                // ttText += '<td class="amt">' + fmtComma(c['votecount']) + '</td>';
                ttText += '<td class="amt">' + (c['votepct'] * 100).toFixed(1) + '%</td>';
                ttText += '</tr>';
            }
        });
        ttText += '</table>';
        ttText += '<p class="precincts">' + (stateData['precinctsreportingpct'] * 100).toFixed(0) + '% reporting</p>';
    }

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
