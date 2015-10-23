#/bin/bash

if [ "x$1" == "x" ]; then
    echo "Usage: parameter 1 is the comment for git commit"
    echo "Note: git status will be logged here: $CURRENT_AWESOME_BASE/checkinAll.log"
    return
fi


echo
echo "=================="

echo "Git comment '$1'"
echo "Status will be logged here: $CURRENT_AWESOME_BASE/checkinAll.log"


echo
echo "=================="

CURRENT_AWESOME_BASE=$PWD
if [ -d "$OTSDAQ_DIR" ]; then
    echo "Checking in $OTSDAQ_DIR"
    cd $OTSDAQ_DIR
    git pull
    echo "==================" > $CURRENT_AWESOME_BASE/checkinAll.log
    pwd >> $CURRENT_AWESOME_BASE/checkinAll.log
    git status &>> $CURRENT_AWESOME_BASE/checkinAll.log
    git commit -m "$1" .
    git push   
    cd $CURRENT_AWESOME_BASE
else
    echo "Path doesn't exist $OTSDAQ_DIR"
fi

echo
echo "=================="

if [ -d "$OTSDAQ_UTILITIES_DIR" ]; then
    echo "Checking in $OTSDAQ_UTILITIES_DIR"
    cd $OTSDAQ_UTILITIES_DIR
    git pull
    echo "==================" >> $CURRENT_AWESOME_BASE/checkinAll.log
    pwd >> $CURRENT_AWESOME_BASE/checkinAll.log
    git status &>> $CURRENT_AWESOME_BASE/checkinAll.log
    git commit -m "$1" .
    git push   
    cd $CURRENT_AWESOME_BASE
else
    echo "Path doesn't exist $OTSDAQ_UTILITIES_DIR"
fi

echo
echo "=================="

if [ -d "$OTSDAQ_DEMO_DIR" ]; then
    echo "Checking in $OTSDAQ_DEMO_DIR"
    cd $OTSDAQ_DEMO_DIR
    git pull
    echo "==================" >> $CURRENT_AWESOME_BASE/checkinAll.log
    pwd >> $CURRENT_AWESOME_BASE/checkinAll.log
    git status &>> $CURRENT_AWESOME_BASE/checkinAll.log
    git commit -m "$1" .
    git push   
    cd $CURRENT_AWESOME_BASE
else
    echo "Path doesn't exist $OTSDAQ_DEMO_DIR"
fi

echo
echo "=================="

if [ -d "$OTSDAQ_DEMO_DIR/../otsdaq-firmware" ]; then
    echo "Checking in $OTSDAQ_DEMO_DIR/../otsdaq-firmware"
    cd $OTSDAQ_DEMO_DIR/../otsdaq-firmware
    git pull
    pwd >> $CURRENT_AWESOME_BASE/checkinAll.log
    git status &>> $CURRENT_AWESOME_BASE/checkinAll.log
    git commit -m "$1" .
    git push   
    cd $CURRENT_AWESOME_BASE
else
    echo "Path doesn't exist $OTSDAQ_DEMO_DIR/../otsdaq-firmware"
fi

echo
echo "=================="

if [ -d "$OTSDAQ_DEMO_DIR/../otsdaq-web" ]; then
    echo "Checking in $OTSDAQ_DEMO_DIR/../otsdaq-web"
    cd $OTSDAQ_DEMO_DIR/../otsdaq-web
    git pull
    echo "==================" >> $CURRENT_AWESOME_BASE/checkinAll.log
    pwd >> $CURRENT_AWESOME_BASE/checkinAll.log
    git status &>> $CURRENT_AWESOME_BASE/checkinAll.log
    git commit -m "$1" .
    git push   
    cd $CURRENT_AWESOME_BASE
else
    echo "Path doesn't exist $OTSDAQ_DEMO_DIR/../otsdaq-web"
fi

echo
echo "=================="

echo "Git comment '$1'"
echo "Status will be logged here: $CURRENT_AWESOME_BASE/checkinAll.log"


echo
echo "=================="
echo
echo "=================="
echo "Awesome script done"
echo "*******************************"
echo "*******************************"