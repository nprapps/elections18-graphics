#!/bin/bash

export QT_QPA_PLATFORM=offscreen
FILEDATE=`date +%Y-%m-%d-%H\:%M`
FILEDIR=/home/ubuntu/screenshots/stage/map
SCRIPTDIR=/home/ubuntu/apps/elections16graphics/repository

mkdir -p $FILEDIR

phantomjs $SCRIPTDIR/screenshotter/screenshot.js "http://stage-apps.npr.org/elections16graphics/map-election-results-standalone/child.html?initialWidth=600&screenshot=1" $FILEDIR/$FILEDATE-election16-map.png
