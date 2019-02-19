#ifndef _ots_Logbook_version_h_
#define _ots_Logbook_version_h_

#include "config/PackageInfo.h"

#define MYPACKAGE_VERSION_MAJOR 3
#define MYPACKAGE_VERSION_MINOR 0
#define MYPACKAGE_VERSION_PATCH 0
#undef MYPACKAGE_PREVIOUS_VERSIONS

#define MYPACKAGE_VERSION_CODE \
	PACKAGE_VERSION_CODE(      \
	    MYPACKAGE_VERSION_MAJOR, MYPACKAGE_VERSION_MINOR, MYPACKAGE_VERSION_PATCH)
#ifndef MYPACKAGE_PREVIOUS_VERSIONS
#define MYPACKAGE_FULL_VERSION_LIST \
	PACKAGE_VERSION_STRING(         \
	    MYPACKAGE_VERSION_MAJOR, MYPACKAGE_VERSION_MINOR, MYPACKAGE_VERSION_PATCH)
#else
#define MYPACKAGE_FULL_VERSION_LIST                         \
	MYPACKAGE_PREVIOUS_VERSIONS "," PACKAGE_VERSION_STRING( \
	    MYPACKAGE_VERSION_MAJOR, MYPACKAGE_VERSION_MINOR, MYPACKAGE_VERSION_PATCH)
#endif

namespace Logbook
{
const std::string package  = "Logbook";
const std::string versions = MYPACKAGE_FULL_VERSION_LIST;
const std::string summary  = "The Logbook Supervisor";
const std::string description =
    "The Logbook Supervisor handles logbook messages from the system and users as well "
    "as display through the Desktop graphical user interface.";
const std::string authors = "Ryan Rivera, Lorenzo Uplegger";
const std::string link    = "http://otsdaq.fnal.gov";

config::PackageInfo                            getPackageInfo();
void                                           checkPackageDependencies();
std::set<std::string, std::less<std::string> > getPackageDependencies();
}

#endif
