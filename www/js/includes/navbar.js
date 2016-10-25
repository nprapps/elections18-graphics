

var resultsMenu = document.querySelector(".small-screen-nav-label");
var stateMenu = document.querySelector(".state-nav-label");
var pymChild = null;

resultsMenu.addEventListener("click", function () {
    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
});

stateMenu.addEventListener("click", function () {
    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
});
