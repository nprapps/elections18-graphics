/*
 * Module for tracking standardized analytics.
 */

import appConfig from './app_config.js';
import URL from 'url-parse';

var _gaq = window._gaq || [];
var _sf_async_config = {};
var _comscore = window._comscore || [];

window.ANALYTICS = (function () {
    // Global time tracking variables
    var slideStartTime =  new Date();
    var timeOnLastSlide = null;

    var embedGa = function() {
        (function(i,s,o,g,r,a,m) {
            i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
            (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
            m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
    }

    var setupVizAnalytics = function() {
        var startUrl = window.location.host + window.location.pathname;

        var parentUrl = new URL(decodeURIComponent(getParameterByName('parentUrl')));
        var state = getParameterByName('state');
        
        var gaLocation = startUrl + '?parentUrl=' + parentUrl.hostname + '&state=' + state;
        var gaPath = window.location.pathname.substring(1) + '?parentUrl=' + parentUrl.hostname + '&state=' + state;

        window.ga('create', appConfig.VIZ_GOOGLE_ANALYTICS.ACCOUNT_ID, 'auto');
        window.ga('send', {
            hitType: 'pageview',
            location: gaLocation,
            page: gaPath
        });
    }

    var getParameterByName = function(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    var setupGoogle = function() {
        embedGa();
        setupVizAnalytics();
     }

    /*
     * Event tracking.
     */
    var trackEvent = function(eventName, label, value) {
        var eventData = {
            'hitType': 'event',
            'eventCategory': appConfig.PROJECT_SLUG,
            'eventAction': eventName
        }

        if (label) {
            eventData['eventLabel'] = label;
        }

        if (value) {
            eventData['eventValue'] = value;
        }

        window.ga('send', eventData);
    }

    // SHARING

    var openShareDiscuss = function() {
        trackEvent('open-share-discuss');
    }

    var closeShareDiscuss = function() {
        trackEvent('close-share-discuss');
    }

    var clickTweet = function(location) {
        trackEvent('tweet', location);
    }

    var clickFacebook = function(location) {
        trackEvent('facebook', location);
    }

    var clickEmail = function(location) {
        trackEvent('email', location);
    }

    var postComment = function() {
        trackEvent('new-comment');
    }

    var actOnFeaturedTweet = function(action, tweet_url) {
        trackEvent('featured-tweet-action', action, null);
    }

    var actOnFeaturedFacebook = function(action, post_url) {
        trackEvent('featured-facebook-action', action, null);
    }

    var copySummary = function() {
        trackEvent('summary-copied');
    }

    // NAVIGATION
    var usedKeyboardNavigation = false;

    var useKeyboardNavigation = function() {
        if (!usedKeyboardNavigation) {
            trackEvent('keyboard-nav');
            usedKeyboardNavigation = true;
        }
    }

    var begin = function(location) {
        trackEvent('begin', location);
    }

    // SLIDES

    var exitSlide = function(slide_index) {
        var currentTime = new Date();
        timeOnLastSlide = Math.abs(currentTime - slideStartTime);
        slideStartTime = currentTime;
        trackEvent('slide-exit', slide_index, timeOnLastSlide);
    }

    setupGoogle();

    return {
        'trackEvent': trackEvent,
        'openShareDiscuss': openShareDiscuss,
        'closeShareDiscuss': closeShareDiscuss,
        'clickTweet': clickTweet,
        'clickFacebook': clickFacebook,
        'clickEmail': clickEmail,
        'postComment': postComment,
        'actOnFeaturedTweet': actOnFeaturedTweet,
        'actOnFeaturedFacebook': actOnFeaturedFacebook,
        'copySummary': copySummary,
        'useKeyboardNavigation': useKeyboardNavigation,
        'exitSlide': exitSlide,
        'begin': begin
    };
}());

// Register a "completion" event when a user scrolls to or past
// the bottom of an embed's iframe
window.addEventListener('load', () => {
  // Queue this listener until Pym is ready
  setTimeout(() => {
    let wasIframeBottomVisibleOrPassed = false;
    window.pymChild.onMessage('viewport-iframe-position', parentInfo => {
      const parentWindowHeight = Number(parentInfo.split(' ')[1]);
      const iframeBottom = Number(parentInfo.split(' ')[4]);
      const isIframeBottomVisibleOrPassed = (parentWindowHeight > iframeBottom);
      if (
        // No need to run computation if the event already happened
        !wasIframeBottomVisibleOrPassed &&
        isIframeBottomVisibleOrPassed
      ) {
        wasIframeBottomVisibleOrPassed = true;
        window.ANALYTICS.trackEvent('finished-graphic', document.title);
      }
    });
  }, 0);
});
