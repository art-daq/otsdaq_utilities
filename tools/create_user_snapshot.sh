#!/bin/sh
#
# create_user_snapshot.sh 
#	Creates snapshot of Data and databases by making zip files with transfers to otsdaq.fnal.gov web server.
#	After this script, experts can pull the snapshot to try to reproduce problems.
#
# usage: --snapshot <snapshot name> --data <path to user data> --database <path to database>
# 
#   snapshot 
#		e.g. a, b, or c
#
#	data 
#		is the full path to the $USER_DATA (NoGitData) folder for the snapshot
#	database
#		is the full path to the databases folder for the snapshot
#
#  example run:
#	./create_user_snapshot.sh --snapshot a --data /home/rrivera/ots/NoGitData --database /home/rrivera/databases
#

echo
echo
echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t Do not source this script, run it as ./create_user_snapshot.sh"
return  >/dev/null 2>&1 #return is used if script is sourced
		
echo
echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t Extracting parameters..."
echo

SRC=${PWD}
UDATA=${USER_DATA}
UDATABASES=`echo ${ARTDAQ_DATABASE_URI}|sed 's|.*//|/|'`
		

if [[ "$1"  == "--snapshot" && "x$2" != "x" ]]; then
	SNAPSHOT="$2"
fi

if [[ "$3"  == "--data" && "x$4" != "x" ]]; then
	UDATA="$4"
fi

if [[ "$5"  == "--database" && "x$6" != "x" ]]; then
	UDATABASES="$6"
fi

echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t SNAPSHOT \t= $SNAPSHOT"
echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t DATA     \t= $UDATA"
echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t DATABASE \t= $UDATABASES"

if [[ "x$SNAPSHOT" == "x" ]]; then 		#require a snapshot name
	echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t usage: --snapshot <snapshot name> --data <path to user data> --database <path to database>"
	exit
fi

echo
echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t Creating UserData and UserDatabases zips..."
echo

echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t user data directory: ${UDATA}"
echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t user databases directory: ${UDATABASES}"


#copy folders to SRC location and cleanup
rm -rf ${SRC}/snapshot_${SNAPSHOT}_databases; #replace databases 
cp -r ${UDATABASES} ${SRC}/snapshot_${SNAPSHOT}_databases;
rm -rf ${SRC}/snapshot_${SNAPSHOT}_databases/filesystemdb/test_db.*; 
rm -rf ${SRC}/snapshot_${SNAPSHOT}_databases/filesystemdb/test_db_*;
rm -rf ${SRC}/snapshot_${SNAPSHOT}_databases/filesystemdb/test_dbb*; #remove backups or bkups

rm -rf ${SRC}/snapshot_${SNAPSHOT}_Data; #replace data
cp -r ${UDATA} ${SRC}/snapshot_${SNAPSHOT}_Data; 
rm ${SRC}/snapshot_${SNAPSHOT}_Data/ServiceData/ActiveConfigurationGroups.cf*;
rm ${SRC}/snapshot_${SNAPSHOT}_Data/ServiceData/ActiveTableGroups.cfg.*; 
rm -rf ${SRC}/snapshot_${SNAPSHOT}_Data/ConfigurationInfo.*
rm -rf ${SRC}/snapshot_${SNAPSHOT}_Data/OutputData/*   #*/ fix comment text coloring
rm -rf ${SRC}/snapshot_${SNAPSHOT}_Data/Logs/*   #*/ fix comment text coloring
rm -rf ${SRC}/snapshot_${SNAPSHOT}_Data/ServiceData/RunNumber/*  #*/ fix comment text coloring
rm -rf ${SRC}/snapshot_${SNAPSHOT}_Data/ServiceData/MacroHistory/* #*/ fix comment text coloring
rm -rf ${SRC}/snapshot_${SNAPSHOT}_Data/ServiceData/ProgressBarData 
rm -rf ${SRC}/snapshot_${SNAPSHOT}_Data/ServiceData/RunControlData
rm -rf ${SRC}/snapshot_${SNAPSHOT}_Data/ServiceData/LoginData/UsersData/TooltipData


#make demo zips from repo
rm snapshot_${SNAPSHOT}_Data.zip
mv NoGitData NoGitData.mv.bk.snapshot; #for safety attempt to move and then restore temporary folder
cp -r ${SRC}/snapshot_${SNAPSHOT}_Data NoGitData;
zip -r snapshot_${SNAPSHOT}_Data.zip NoGitData; 
rm -rf NoGitData; 
mv NoGitData.mv.bk.snapshot NoGitData; 

rm snapshot_${SNAPSHOT}_database.zip
mv databases databases.mv.bk.snapshot; #for safety attempt to move and then restore temporary folder
cp -r ${SRC}/snapshot_${SNAPSHOT}_databases databases; 
zip -r snapshot_${SNAPSHOT}_database.zip databases; 
rm -rf databases; 
mv databases.mv.bk.snapshot databases;

#remove clean copies
rm -rf ${SRC}/snapshot_${SNAPSHOT}_Data
rm -rf ${SRC}/snapshot_${SNAPSHOT}_databases




echo
echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t Done creating UserData and UserDatabases zips."
echo


echo
echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t Transferring to web server..."
echo


scp snapshot_${SNAPSHOT}_Data.zip web-otsdaq@otsdaq.fnal.gov:/web/sites/otsdaq.fnal.gov/htdocs/downloads/
scp snapshot_${SNAPSHOT}_database.zip web-otsdaq@otsdaq.fnal.gov:/web/sites/otsdaq.fnal.gov/htdocs/downloads/

rm snapshot_${SNAPSHOT}_Data.zip
rm snapshot_${SNAPSHOT}_database.zip 



echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t SNAPSHOT \t= $SNAPSHOT"
echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t DATA     \t= $UDATA"
echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t DATABASE \t= $UDATABASES"

echo
echo -e `date +"%h%y %T"` "create_user_snapshot.sh [${LINENO}]  \t Done handling snapshot UserData and UserDatabases!"
echo



	