#!/bin/bash

export QT_QPA_PLATFORM=offscreen
FILEDATE=`date +%Y-%m-%d-%H\:%M`
FILEDIR=/home/ubuntu/screenshots/stage/map
FILENAME="election16-map-$FILEDATE.png"
SCRIPTDIR=/home/ubuntu/apps/elections16graphics/repository

echo "screenshotting map at $FILEDATE"
mkdir -p $FILEDIR
LASTFILE=`ls -t $FILEDIR | head -1`


phantomjs $SCRIPTDIR/screenshotter/screenshot.js "http://stage-apps.npr.org/elections16graphics/map-election-results-standalone/child.html?initialWidth=600&screenshot=1" $FILEDIR/$FILENAME

if [ $LASTFILE ]; then
    NEWMD5=`md5sum $FILEDIR/$FILENAME | awk '{ print $1 }'`
    OLDMD5=`md5sum $FILEDIR/$LASTFILE | awk '{ print $1 }'`

    if [ $NEWMD5 = $OLDMD5 ]; then
        echo "duplicate of $LASTFILE, deleting"
        rm $FILEDIR/$FILENAME
    else
        aws s3 cp $FILEDIR/$FILENAME s3://stage-apps.npr.org/elections16graphics/assets/map/latest.png
        aws s3 cp $FILEDIR/$FILENAME.png s3://stage-apps.npr.org/elections16graphics/assets/map/$FILENAME.png
        $SCRIPTDIR/dropbox_uploader.sh $FILEDIR/$FILENAME $FILENAME
    fi
fi
