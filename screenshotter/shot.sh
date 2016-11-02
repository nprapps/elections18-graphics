#!/bin/bash

export QT_QPA_PLATFORM=offscreen
phantomjs `pwd`/screenshot.js "http://stage-apps.npr.org/elections16graphics/map-election-results-standalone/child.html?initialWidth=600&screenshot=1" /tmp/test.png
