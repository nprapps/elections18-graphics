#!/bin/bash

export QT_QPA_PLATFORM=offscreen
FILEDATE=`date +%Y-%m-%d-%H\:%M`
FILEDIR=/home/ubuntu/screenshots/stage/map
SCRIPTDIR=/home/ubuntu/apps/elections16graphics/repository

echo 'screenshotting map at $FILEDATE'

mkdir -p $FILEDIR

phantomjs $SCRIPTDIR/screenshotter/screenshot.js "http://stage-apps.npr.org/elections16graphics/map-election-results-standalone/child.html?initialWidth=600&screenshot=1" $FILEDIR/$FILEDATE-election16-map.png

LASTFILE=`ls -t ~/screenshots/stage/map/ | head -1`
NEWMD5=`md5 $FILEDIR/$FILEDATE-election16-map.png`
OLDMD5=`md5 $FILEDIR/$LASTFILE`

if [ $NEWMD5 = $OLDMD5 ]; then
  echo "matched"
else
  echo "didnt match"
fi
