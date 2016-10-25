var resultsMenu = document.querySelector(".small-screen-nav-label");
var stateMenu = document.querySelector(".state-nav-label");

resultsMenu.addEventListener("click", function () {
    // Update iframe
    if (pymChild) {
        setTimeout(pymChild.sendHeight, 0);
    }
});

stateMenu.addEventListener("click", function () {
    // Update iframe
    if (pymChild) {
        setTimeout(pymChild.sendHeight, 0)
    }
});
