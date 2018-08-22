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
}


/*
 * Render
 */
var render = function(containerWidth) {
    // only run the first time
    if (!isBopInit) {
    // run onresize
    } else {
    }
    
    // Update iframe
    if (window.pymChild) {
        window.pymChild.sendHeight();
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
