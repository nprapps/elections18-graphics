var page = require('webpage').create();

page.viewportSize = { width: 750 * 2, height: 500 };

page.open('http://127.0.0.1:8000/map-election-results-standalone/child.html?initialWidth=730&hp=1', function (status) {
    page.evaluate(function () {
        document.body.style.backgroundColor = "#fff";
        /* scale the whole body */
        document.body.style.webkitTransform = "scale(2)";
        document.body.style.webkitTransformOrigin = "0% 0%";
        //fix the body width that overflows out of the viewport 
        document.body.style.width = "50%";
    });

    window.setTimeout(function () {
        page.render('test.png');
        phantom.exit();
    }, 3000);
});
