#!/bin/bash

# build in $WORKSPACE/build
# copyback directory is $WORKSPACE/copyBack

usage()
{
  cat 1>&2 <<EOF
Usage: $(basename ${0}) [-h]

Options:

  -h    This help.

EOF
}

working_dir=${WORKSPACE}
version=${VERSION}
qual_set="${QUAL}"
build_type=${BUILDTYPE}
copyback_deps=${COPYBACK_DEPS}

IFS_save=$IFS
IFS=":"
read -a qualarray <<<"$qual_set"
IFS=$IFS_save
basequal=
squal=
pyflag=
build_db=1

# Remove shared memory segments which have 0 nattach
killall art && sleep 5 && killall -9 art
killall transfer_driver
for key in `ipcs|grep " $USER "|grep " 0 "|awk '{print $1}'`;do ipcrm -M $key;done

for qual in ${qualarray[@]};do
	case ${qual} in
		e*)		basequal=${qual};;
		c*)		basequal=${qual};;
		py*)	pyflag=${qual};;
		nodb)	build_db=0;;
		s*)     squal=${qual};;
		esac
done

if [[ "x$squal" == "x" ]] || [[ "x$basequal" == "x" ]]; then
	echo "unexpected qualifier set ${qual_set}"
	usage
	exit 1
fi

wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/revisions/${version}/raw/ups/product_deps && \
artdaq_ver=`grep "^artdaq " product_deps|awk '{print $2}'` || \
$(echo "Unexpected version ${version}" && usage && exit 1)

basequal_dash=$basequal${pyflag:+-${pyflag}}

case ${build_type} in
    debug) ;;
    prof) ;;
    *)
	echo "ERROR: build type must be debug or prof"
	usage
	exit 1
esac

dotver=`echo ${version} | sed -e 's/_/./g' | sed -e 's/^v//'`

echo "building the otsdaq distribution for ${version} ${dotver} ${qual_set} ${build_type}"

OS=`uname`
if [ "${OS}" = "Linux" ]
then
    flvr=slf`lsb_release -r | sed -e 's/[[:space:]]//g' | cut -f2 -d":" | cut -f1 -d"."`
else 
  echo "ERROR: unrecognized operating system ${OS}"
  exit 1
fi
echo "build flavor is ${flvr}"
echo ""

qualdir=`echo ${qual_set} | sed -e 's%:%-%'`

set -x

srcdir=${working_dir}/source
blddir=${working_dir}/build
# start with clean directories
rm -rf ${blddir}
rm -rf ${srcdir}
rm -rf $WORKSPACE/copyBack 
# now make the dfirectories
mkdir -p ${srcdir} || exit 1
mkdir -p ${blddir} || exit 1
mkdir -p $WORKSPACE/copyBack || exit 1

cd ${blddir} || exit 1
curl --fail --silent --location --insecure -O http://scisoft.fnal.gov/scisoft/bundles/tools/pullProducts || exit 1
chmod +x pullProducts
curl --fail --silent --location --insecure -O http://scisoft.fnal.gov/scisoft/bundles/tools/buildFW || exit 1
chmod +x buildFW

mv ${blddir}/*source* ${srcdir}/

cd ${blddir} || exit 1

# remove any artdaq_demo entities that were pulled so it will always be rebuilt
if [ -d ${blddir}/otsdaq ] || [ -d ${blddir}/otsdaq_utilities ] || [ -d ${blddir}/otsdaq_components ]; then
  echo "Removing ${blddir}/otsdaq*"
  rm -rf ${blddir}/otsdaq*
  if [ `ls -l ${blddir}/otsdaq*.tar.bz2 | wc -l` -gt 0 ]; then rm -fv ${blddir}/otsdaq*.tar.bz2; fi
fi 

echo
echo "begin build"
echo
./buildFW -t -b ${basequal} ${pyflag:+-l ${pyflag}} -s ${squal} ${blddir} ${build_type} otsdaq-${version} || \
 { mv ${blddir}/*.log  $WORKSPACE/copyBack/
   exit 1 
 }

source ${blddir}/setups
upsflavor=`ups flavor`
echo "Fix Manifests"

artManifest=`ls ${blddir}/art-*_MANIFEST.txt|tail -1`
artdaqManifest=`ls ${blddir}/artdaq-*_MANIFEST.txt|tail -1`
otsdaqManifest=`ls ${blddir}/otsdaq-*_MANIFEST.txt|tail -1`

cat ${artManifest} >>${artdaqManifest}
cat ${artdaqManifest} >>${otsdaqManifest}
cat ${artdaqManifest}|grep -v source|sort|uniq >>${artdaqManifest}.tmp
mv ${artdaqManifest}.tmp ${artdaqManifest}
cat ${otsdaqManifest}|grep -v source|sort|uniq >>${otsdaqManifest}.tmp
mv ${otsdaqManifest}.tmp ${otsdaqManifest}

if [ $copyback_deps == "false" ]; then
  echo "Removing art and artdaq bundle products"
  for file in ${blddir}/*.bz2;do
    filebase=`basename $file`
    if [[ "${filebase}" =~ "otsdaq" ]]; then
        echo "Not deleting ${filebase}"
    elif [[ "${filebase}" =~ "qt" ]]; then
        echo "Not deleting ${filebase}"
    elif [[ "${filebase}" =~ "swig" ]]; then
        echo "Not deleting ${filebase}"
    elif [[ "${filebase}" =~ "mongodb" ]]; then
        echo "Not deleting ${filebase}"
    elif [[ "${filebase}" =~ "xdaq" ]]; then
        echo "Not deleting ${filebase}"
    elif [[ "${filebase}" =~ "pqxx" ]]; then
        echo "Not deleting ${filebase}"
    elif [[ "${filebase}" =~ "artdaq_daqinterface" ]]; then
        echo "Not deleting ${filebase}"
    elif [[ "${filebase}" =~ "artdaq_mfextensions" ]]; then
        echo "Not deleting ${filebase}"
    elif [[ "${filebase}" =~ "artdaq_database" ]]; then
        echo "Not deleting ${filebase}"
    else
        echo "Deleting ${filebase}"
	    rm -f $file
    fi
  done
  rm -f ${blddir}/art-*_MANIFEST.txt
fi

echo
echo "move files"
echo
mv ${blddir}/*.bz2  $WORKSPACE/copyBack/
mv ${blddir}/*.txt  $WORKSPACE/copyBack/
mv ${blddir}/*.log  $WORKSPACE/copyBack/

echo
echo "cleanup"
echo
rm -rf ${blddir}
rm -rf ${srcdir}

exit 0
