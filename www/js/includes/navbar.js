var resultsMenu = document.querySelector(".small-screen-nav-label");
var stateMenuButton = document.querySelector(".state-nav-label");
var stateMenu = document.querySelector(".state-nav .states");

const updateMenuParent = function(e) {
    // Update iframe
    if (pymChild) {
        setTimeout(pymChild.sendHeight, 0);
    }
}

const followStateMenuLink = function(e) {
    if (pymChild && pymChild.parentUrl) {
        if (e.target !== e.currentTarget) {
            console.log(e.target);
            console.log(pymChild);
        }
        //window.location.href = e.target.getAttribute('data-seamusid');
    } else {
        window.location.href = e.target.getAttribute('data-relative-href');
    }
    e.stopPropagation();
}

resultsMenu.addEventListener("click", updateMenuParent);
stateMenuButton.addEventListener("click", updateMenuParent);
stateMenu.addEventListener("click", followStateMenuLink);
