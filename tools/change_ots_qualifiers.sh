#!/bin/bash
#
# This script is expected to be executed (not sourced).
# It can be executed from any path (do not source it, execute with ./ )
#
# ./path/to/script/change_ots_qualifiers.sh <ots version> <qualifiers>
#
# If no parameters are given, the script will list the available versions and qualifiers
#
#	Example execution:
#
# 		./change_ots_qualifiers.sh    v2_05_00    s89:19:prof
#

export MRB_PROJECT=otsdaq_demo

echo -e "change_ots_qualifiers.sh [${LINENO}]  "
echo -e "change_ots_qualifiers.sh [${LINENO}]  \t ~~ change_ots_qualifiers ~~ "
echo -e "change_ots_qualifiers.sh [${LINENO}]  "
echo -e "change_ots_qualifiers.sh [${LINENO}]  "


#############################
#############################
# function to display otsdaq versions and qualifiers
function displayVersionsAndQualifiers 
{	
	

	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t Note: below are the available otsdaq releases..."
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t ----------------------------"
	#-s for silent, sed to remove closing </a>
	curl -s https://scisoft.fnal.gov/scisoft/bundles/otsdaq/ | grep \<\/a\> | grep _ | grep v  | grep --invert-match href | sed -e 's/<.*//'
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t ----------------------------"
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t Note: above are the available otsdaq releases..."
	echo

	ALL_RELEASES=( $(curl -s https://scisoft.fnal.gov/scisoft/bundles/otsdaq/ | grep \<\/a\> | grep _ | grep v  | grep --invert-match href | sed -e 's/<.*//') )
	LATEST_RELEASE=${ALL_RELEASES[${#ALL_RELEASES[@]}-1]}
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t The latest otsdaq release is $LATEST_RELEASE"	

	echo
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t Note: below are the available qualifiers for $LATEST_RELEASE.."
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t ----------------------------"
	#-s for silent, sed to remove closing </a>
	curl -s https://scisoft.fnal.gov/scisoft/bundles/otsdaq/$LATEST_RELEASE/manifest/ | grep \<\/a\> | grep MANIFEST | sed -e 's/-d.*//' |  sed -e 's/-p.*//' |  sed -e 's/.*-s/                                                        s/' | sed -e 's/-/:/'
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t ----------------------------"
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t Note: above are the available qualifiers for $LATEST_RELEASE.."
	echo
	ALL_QUALS=( $(curl -s https://scisoft.fnal.gov/scisoft/bundles/otsdaq/$LATEST_RELEASE/manifest/ | grep \<\/a\> | grep MANIFEST | sed -e 's/-d.*//' |  sed -e 's/-p.*//' |  sed -e 's/.*-s/ s/' | sed -e 's/-/:/') )
	LATEST_QUAL=${ALL_QUALS[${#ALL_QUALS[@]}-1]}
	echo
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t To explore the available qualifiers go here in your browser:"
	echo
	echo -e "\t\t\t\t https://scisoft.fnal.gov/scisoft/bundles/otsdaq"
	echo
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t ... then click the version, and manifest folder to view qualifiers."
	echo
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t To switch qualifiers, do the following: \n\n\t\t\t\t ./change_ots_qualifiers.sh   $LATEST_RELEASE   $LATEST_QUAL:prof"
	echo
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t ...and replace '$LATEST_RELEASE' with your target version. and '$LATEST_QUAL:prof' with your qualifiers"
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t ...a new localProducts directory will be created, which you should use when you setup ots."
	echo
	echo

	
} #end displayVersionsAndQualifiers

#check parameters
if [[ "x$1" == "x"  || "x$2" == "x" ]]; then
    echo -e "change_ots_qualifiers.sh [${LINENO}]  \t Usage: Parameter 1 is the ots version, Parameter 2 is the compiler qualifiers"
	echo -e "change_ots_qualifiers.sh [${LINENO}]  "
    echo -e "change_ots_qualifiers.sh [${LINENO}]  (do not source the script, execute with ./ )"
	echo -e "change_ots_qualifiers.sh [${LINENO}]  "
	echo -e "change_ots_qualifiers.sh [${LINENO}]  If no parameters are given, the script will list the available versions and qualifiers."
	echo -e "change_ots_qualifiers.sh [${LINENO}]  "
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t\t Example execution:"
	echo -e "change_ots_qualifiers.sh [${LINENO}]  "
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t\t\t ./change_ots_qualifiers.sh    v2_05_00    s89:e19:prof"
	echo -e "change_ots_qualifiers.sh [${LINENO}]  "
		
	displayVersionsAndQualifiers
	
		
	echo -e "change_ots_qualifiers.sh [${LINENO}]  "
	exit
fi

# at this point, there must have been valid parameters

echo -e "change_ots_qualifiers.sh [${LINENO}]  \t\t\t VERSION = $1    QUALS = $2"

displayVersionsAndQualifiers

VERSION=$1
if [ "$1" == "DEFAULT" ]; then
	VERSION=$LATEST_RELEASE
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t\t\t DEFAULT VERSION = $VERSION"
fi

QUAL=$2
if [ "$2" == "DEFAULT" ]; then
	QUAL="s94:e19:prof" #"$LATEST_QUAL:prof"
	echo -e "change_ots_qualifiers.sh [${LINENO}]  \t\t\t DEFAULT QUALS = $QUAL"
fi


mkdir oldLocalProducts
mv localProducts* oldLocalProducts/
source setup_ots.sh
mrb newDev -f -v $VERSION -q $QUAL

echo -e "change_ots_qualifiers.sh [${LINENO}]  \t =================="
echo -e "change_ots_qualifiers.sh [${LINENO}]  \t ots change_ots_qualifiers script done"
echo -e "change_ots_qualifiers.sh [${LINENO}]  \t *******************************"
echo -e "change_ots_qualifiers.sh [${LINENO}]  \t *******************************"

		

exit






		



