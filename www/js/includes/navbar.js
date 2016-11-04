import URL from 'url-parse';

const parseParentURL = function() {
    if (!pymChild) {
        return null;
    }
    const parentUrl = new URL(window.pymChild.parentUrl, location, true);
    if (parentUrl.hostname == '127.0.0.1') {
        return 'localhost';
    } else {
        return parentUrl.hostname.split('.').slice(-2).join('.');
    }
}

const updateMenuParent = function(e) {
    // Update iframe
    if (pymChild) {
        setTimeout(pymChild.sendHeight, 0);
    }
}

const followNavLink = function(e) {
    if (e.target !== e.currentTarget) {
        if (pymChild) {
            const domain = parseParentURL();
            if (domain == 'npr.org') {
                const seamusid = e.target.getAttribute('data-seamus-id');
                const url = 'http://www-s1.npr.org/templates/story/story.php?storyId=' + seamusid;
                pymChild.sendMessage('navigate', url);
            } else {
                pymChild.navigateParentTo(e.target.getAttribute('data-relative-href'));
            }
        } else {
            window.location.href = e.target.getAttribute('data-relative-href');
        }
    }
    e.preventDefault();
    e.stopPropagation();
}

var resultsMenuButton = document.querySelector(".small-screen-nav-label");
var resultsMenu = document.querySelector(".menu");
resultsMenuButton.addEventListener("click", updateMenuParent);
resultsMenu.addEventListener("click", followNavLink);

var stateMenuButton = document.querySelector(".state-nav-label");
var stateMenu = document.querySelector(".state-nav .states");
stateMenu.addEventListener("click", followNavLink);
stateMenuButton.addEventListener("click", updateMenuParent);
