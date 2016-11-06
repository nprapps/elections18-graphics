var page = require('webpage').create(),
    system = require('system');

page.viewportSize = { width: 1200, height: 500 };

page.open(system.args[1], function (status) {
    page.evaluate(function () {
        document.body.style.backgroundColor = "#fff";
        /* scale the whole body */
        document.body.style.webkitTransform = "scale(2)";
        document.body.style.webkitTransformOrigin = "0% 0%";
        //fix the body width that overflows out of the viewport 
        document.body.style.width = "50%";
    });

    window.setTimeout(function () {
        page.render(system.args[2]);
        phantom.exit();
    }, 1000);
});
