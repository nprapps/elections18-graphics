#!/bin/bash

# Run on Ubuntu server without X11
export QT_QPA_PLATFORM=offscreen

# Set up variables
FILEDATE=`date +%Y-%m-%d-%H\:%M`
FILEDIR=/home/ubuntu/screenshots
FILENAME="election16-map-$FILEDATE.png"
SCRIPTDIR=/home/ubuntu/apps/elections18-graphics/repository/screenshotter

echo "screenshotting map at $FILEDATE"
mkdir -p $FILEDIR

# Get last file generated
LASTFILE=`ls -t $FILEDIR | head -1`

# Screenshot site
phantomjs $SCRIPTDIR/screenshot.js "http://apps.npr.org/elections18-graphics/map-election-results-standalone/child.html?initialWidth=600&screenshot=1" $FILEDIR/$FILENAME

if [ $LASTFILE ]; then
    NEWMD5=`md5sum $FILEDIR/$FILENAME | awk '{ print $1 }'`
    OLDMD5=`md5sum $FILEDIR/$LASTFILE | awk '{ print $1 }'`

    if [ $NEWMD5 = $OLDMD5 ]; then
        echo "duplicate of $LASTFILE, deleting"
        rm $FILEDIR/$FILENAME
        exit
    fi
fi

echo "uploading to s3"
aws s3 cp $FILEDIR/$FILENAME s3://apps.npr.org/elections18-graphics/assets/map/latest.png --acl public-read
aws s3 cp $FILEDIR/$FILENAME s3://apps.npr.org/elections18-graphics/assets/map/$FILENAME
echo "uploading to dropbox"
$SCRIPTDIR/dropbox_uploader.sh upload $FILEDIR/$FILENAME $FILENAME
