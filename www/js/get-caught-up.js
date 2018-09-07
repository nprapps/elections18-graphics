// This will be transformed by Babel into only the polyfills that are needed,
// thanks to the `"useBuiltIns": true` option in `.babelrc`
// https://www.npmjs.com/package/babel-preset-env#usebuiltins
import 'babel-polyfill';

// global vars
window.pymChild = null;


/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    // init pym and render callback
    window.pymChild = new pym.Child({
        renderCallback: render
    });
    addLinkListener();
}


/*
 * Render
 */
var render = function(containerWidth) {
    // only run the first time
    //if (!isBopInit) {
    // run onresize
    //} else {
    //} 
    
    // Update iframe
    if (window.pymChild) {
        window.pymChild.sendHeight();
    }
}

/*
 * Make sure links open in _top
 * Cribbed from https://github.com/nprapps/elections16graphics/blob/master/www/js/map-liveblog-hp.js#L35-L48
 */
const addLinkListener = function() {
    const domain = parseParentURL();
    liveblog.addEventListener('click', function(e) {
        if(e.target && e.target.nodeName == "A") {
            if (window.pymChild && (domain == 'npr.org' || domain == 'localhost')) {
                pymChild.sendMessage('pjax-navigate', e.target.href);
                e.preventDefault();
                e.stopPropagation();
            } else {
                window.open(e.target.href, '_top');
            }
        }
    });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
