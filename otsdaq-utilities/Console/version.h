#ifndef _ots_Console_version_h_
#define _ots_Console_version_h_

#include "config/PackageInfo.h"

#define MYPACKAGE_VERSION_MAJOR OTSDAQ_MAJOR_VERSION
#define MYPACKAGE_VERSION_MINOR OTSDAQ_MINOR_VERSION
#define MYPACKAGE_VERSION_PATCH OTSDAQ_PATCH_VERSION
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

namespace Console
{
const std::string project  = "otsdaq";
const std::string package  = "Console";
const std::string versions = MYPACKAGE_FULL_VERSION_LIST;
const std::string summary  = "The Console Supervisor";
const std::string description =
    "The Console Supervisor handles console messages that are displayed through the web "
    "graphical user interface.";
const std::string authors = "Ryan Rivera, Lorenzo Uplegger";
const std::string link    = "http://otsdaq.fnal.gov";

config::PackageInfo                            getPackageInfo();
void                                           checkPackageDependencies();
std::set<std::string, std::less<std::string> > getPackageDependencies();
}  // namespace Console

#endif
