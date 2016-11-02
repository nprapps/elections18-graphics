#!/bin/bash

export QT_QPA_PLATFORM=offscreen
FILEDATE=`date +%Y-%m-%d-%H\:%M`
FILEDIR=/home/ubuntu/screenshots/stage/map
SCRIPTDIR=/home/ubuntu/apps/elections16graphics/repository

echo "screenshotting map at $FILEDATE"
mkdir -p $FILEDIR
LASTFILE=`ls -t $FILEDIR | head -1`

phantomjs $SCRIPTDIR/screenshotter/screenshot.js "http://stage-apps.npr.org/elections16graphics/map-election-results-standalone/child.html?initialWidth=600&screenshot=1" $FILEDIR/$FILEDATE-election16-map.png

if [ $LASTFILE ]; then
    NEWMD5=`md5sum $FILEDIR/$FILEDATE-election16-map.png | awk '{ print $1 }'`
    OLDMD5=`md5sum $FILEDIR/$LASTFILE | awk '{ print $1 }'`

    if [ $NEWMD5 = $OLDMD5 ]; then
        echo "duplicate of $FILEDATE, deleting"
        rm $FILEDIR/$FILEDATE-election16-map.png
    fi
fi
