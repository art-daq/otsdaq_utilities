#include "otsdaq-utilities/MacroMaker/MacroMakerSupervisor.h"

#include "otsdaq/CodeEditor/CodeEditor.h"
#include "otsdaq/ConfigurationInterface/ConfigurationManager.h"
#include "otsdaq/FECore/FEVInterface.h"

#include <dirent.h>    //for DIR
#include <stdio.h>     //for file rename
#include <sys/stat.h>  //for mkdir
#include <cstdio>
#include <fstream>
#include <thread>  //for std::thread
#include "otsdaq/TableCore/TableGroupKey.h"

#define MACROS_DB_PATH std::string(__ENV__("SERVICE_DATA_PATH")) + "/MacroData/"
#define MACROS_HIST_PATH std::string(__ENV__("SERVICE_DATA_PATH")) + "/MacroHistory/"
#define MACROS_SEQUENCE_PATH std::string(__ENV__("SERVICE_DATA_PATH")) + "/MacroSequence/"
#define MACROS_EXPORT_PATH std::string("/MacroExport/")

#define SEQUENCE_FILE_NAME \
	std::string(__ENV__("SERVICE_DATA_PATH")) + "/OtsWizardData/sequence.dat"
#define SEQUENCE_OUT_FILE_NAME \
	std::string(__ENV__("SERVICE_DATA_PATH")) + "/OtsWizardData/sequence.out"

using namespace ots;

#undef __MF_SUBJECT__
#define __MF_SUBJECT__ "MacroMaker"

XDAQ_INSTANTIATOR_IMPL(MacroMakerSupervisor)

//==============================================================================
MacroMakerSupervisor::MacroMakerSupervisor(xdaq::ApplicationStub* stub)
    : CoreSupervisorBase(stub)
{
	__SUP_COUT__ << "Constructing..." << __E__;

	INIT_MF("." /*directory used is USER_DATA/LOG/.*/);

	// make macro directories in case they don't exist
	mkdir(((std::string)MACROS_DB_PATH).c_str(), 0755);
	mkdir(((std::string)MACROS_HIST_PATH).c_str(), 0755);
	mkdir(((std::string)MACROS_SEQUENCE_PATH).c_str(), 0755);
	mkdir((__ENV__("SERVICE_DATA_PATH") + MACROS_EXPORT_PATH).c_str(), 0755);

	xoap::bind(this,
	           &MacroMakerSupervisor::frontEndCommunicationRequest,
	           "FECommunication",
	           XDAQ_NS_URI);

	// start requests for MacroMaker only mode
	if(CorePropertySupervisorBase::allSupervisorInfo_.isMacroMakerMode())
	{
		__SUP_COUT__ << "Starting constructor for Macro Maker mode." << __E__;

		xgi::bind(this, &MacroMakerSupervisor::requestIcons, "requestIcons");
		xgi::bind(this, &MacroMakerSupervisor::verification, "Verify");
		xgi::bind(this, &MacroMakerSupervisor::tooltipRequest, "TooltipRequest");
		xgi::bind(this, &MacroMakerSupervisor::requestWrapper, "Request");
		generateURL();
		__SUP_COUT__ << "Completed constructor for Macro Maker mode." << __E__;
	}
	else
		__SUP_COUT__ << "Not Macro Maker only mode." << __E__;
	// end requests for MacroMaker only mode

	init();

	// initFElist for Macro Maker mode
	if(CorePropertySupervisorBase::allSupervisorInfo_.isMacroMakerMode())
	{
		// const SupervisorInfoMap& feTypeSupervisors =
		//     CorePropertySupervisorBase::allSupervisorInfo_.getAllFETypeSupervisorInfo();

		ConfigurationTree appsNode = theConfigurationManager_->getNode(
		    ConfigurationManager::XDAQ_APPLICATION_TABLE_NAME);

		// __SUP_COUT__ << "Number of FE Supervisors found = " << feTypeSupervisors.size()
		//              << __E__;

		FEPluginTypetoFEsMap_.clear();  // reset
		FEtoSupervisorMap_.clear();     // reset
		FEtoPluginTypeMap_.clear();     // reset
		                                // for(auto& feApp : feTypeSupervisors)
		                                // {
		__SUP_COUT__ << "FEs for app MacroMakerFESupervisor"
		             << __E__;  // << feApp.first << ":" << feApp.second.getName()
		                        //  << __E__;

		auto feChildren =
		    appsNode
		        .getNode("MacroMakerFESupervisor")  // feApp.second.getName())
		        .getNode("LinkToSupervisorTable")
		        .getNode("LinkToFEInterfaceTable")
		        .getChildren();

		for(auto& fe : feChildren)
		{
			if(!fe.second.status())
				continue;  // skip disabled FEs

			__SUP_COUTV__(fe.first);
			FEtoSupervisorMap_[fe.first] =
			    atoi(__ENV__("FE_SUPERVISOR_ID"));  // feApp.first;

			std::string pluginType =
			    fe.second.getNode("FEInterfacePluginName").getValue();
			FEPluginTypetoFEsMap_[pluginType].emplace(fe.first);
			FEtoPluginTypeMap_[fe.first] = pluginType;
		}
		// }

		__SUP_COUTV__(StringMacros::mapToString(FEtoSupervisorMap_));
		__SUP_COUTV__(StringMacros::mapToString(FEPluginTypetoFEsMap_));
		__SUP_COUTV__(StringMacros::mapToString(FEtoPluginTypeMap_));
	}

	__SUP_COUT__ << "Constructed." << __E__;
}  // end constructor

//==============================================================================
MacroMakerSupervisor::~MacroMakerSupervisor(void) { destroy(); }

//==============================================================================
void MacroMakerSupervisor::init(void)
{
	// called by constructor

	// MacroMaker should consider all FE compatible types..
	allFESupervisorInfo_ =
	    SupervisorInfoMap(allSupervisorInfo_.getAllFETypeSupervisorInfo());

}  // end init()

//==============================================================================
void MacroMakerSupervisor::destroy(void)
{
	// called by destructor
}

//==============================================================================
// forceSupervisorPropertyValues
//		override to force supervisor property values (and ignore user settings)
void MacroMakerSupervisor::forceSupervisorPropertyValues()
{
	//	CorePropertySupervisorBase::setSupervisorProperty(CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.NeedUsernameRequestTypes,
	//			"getPermission");
}  // end forceSupervisorPropertyValues()

//==============================================================================
void MacroMakerSupervisor::tooltipRequest(xgi::Input* in, xgi::Output* out)
{
	cgicc::Cgicc cgi(in);

	std::string Command = CgiDataUtilities::getData(cgi, "RequestType");
	//__COUT__ << "Command = " << Command << __E__;

	std::string submittedSequence = CgiDataUtilities::postData(cgi, "sequence");

	// SECURITY CHECK START ****
	if(securityCode_.compare(submittedSequence) != 0)
	{
		__COUT__ << "Unauthorized Request made, security sequence doesn't match!"
		         << __E__;
		return;
	}
	//	else
	//	{
	//		__COUT__ << "***Successfully authenticated security sequence." << __E__;
	//	}
	// SECURITY CHECK END ****

	HttpXmlDocument xmldoc;

	if(Command == "check")
	{
		WebUsers::tooltipCheckForUsername(WebUsers::DEFAULT_ADMIN_USERNAME,
		                                  &xmldoc,
		                                  CgiDataUtilities::getData(cgi, "srcFile"),
		                                  CgiDataUtilities::getData(cgi, "srcFunc"),
		                                  CgiDataUtilities::getData(cgi, "srcId"));
	}
	else if(Command == "setNeverShow")
	{
		WebUsers::tooltipSetNeverShowForUsername(
		    WebUsers::DEFAULT_ADMIN_USERNAME,
		    &xmldoc,
		    CgiDataUtilities::getData(cgi, "srcFile"),
		    CgiDataUtilities::getData(cgi, "srcFunc"),
		    CgiDataUtilities::getData(cgi, "srcId"),
		    CgiDataUtilities::getData(cgi, "doNeverShow") == "1" ? true : false,
		    CgiDataUtilities::getData(cgi, "temporarySilence") == "1" ? true : false);
	}
	else
		__COUT__ << "Command Request, " << Command << ", not recognized." << __E__;

	xmldoc.outputXmlDocument((std::ostringstream*)out, false, true);
}  // end tooltipRequest()

//==============================================================================
void MacroMakerSupervisor::verification(xgi::Input* in, xgi::Output* out)
{
	cgicc::Cgicc cgi(in);
	std::string  submittedSequence = CgiDataUtilities::getData(cgi, "code");
	__COUT__ << "submittedSequence=" << submittedSequence << " " << time(0) << __E__;

	std::string securityWarning = "";

	if(securityCode_.compare(submittedSequence) != 0)
	{
		__COUT__ << "Unauthorized Request made, security sequence doesn't match!"
		         << __E__;
		*out << "Invalid code.";
		return;
	}
	else
	{
		// defaultSequence_ = false;
		__COUT__ << "*** Successfully authenticated security sequence "
		         << "@ " << time(0) << __E__;

		if(defaultSequence_)
		{
			//__COUT__ << " UNSECURE!!!" << __E__;
			securityWarning = "&secure=False";
		}
	}

	*out << "<!DOCTYPE HTML><html lang='en'><head><title>ots MacroMaker mode</title>" <<
	    // show ots icon
	    //	from http://www.favicon-generator.org/
	    "<link rel='apple-touch-icon' sizes='57x57' href='/WebPath/images/otsdaqIcons/apple-icon-57x57.png'>\
		<link rel='apple-touch-icon' sizes='60x60' href='/WebPath/images/otsdaqIcons/apple-icon-60x60.png'>\
		<link rel='apple-touch-icon' sizes='72x72' href='/WebPath/images/otsdaqIcons/apple-icon-72x72.png'>\
		<link rel='apple-touch-icon' sizes='76x76' href='/WebPath/images/otsdaqIcons/apple-icon-76x76.png'>\
		<link rel='apple-touch-icon' sizes='114x114' href='/WebPath/images/otsdaqIcons/apple-icon-114x114.png'>\
		<link rel='apple-touch-icon' sizes='120x120' href='/WebPath/images/otsdaqIcons/apple-icon-120x120.png'>\
		<link rel='apple-touch-icon' sizes='144x144' href='/WebPath/images/otsdaqIcons/apple-icon-144x144.png'>\
		<link rel='apple-touch-icon' sizes='152x152' href='/WebPath/images/otsdaqIcons/apple-icon-152x152.png'>\
		<link rel='apple-touch-icon' sizes='180x180' href='/WebPath/images/otsdaqIcons/apple-icon-180x180.png'>\
		<link rel='icon' type='image/png' sizes='192x192'  href='/WebPath/images/otsdaqIcons/android-icon-192x192.png'>\
		<link rel='icon' type='image/png' sizes='32x32' href='/WebPath/images/otsdaqIcons/favicon-32x32.png'>\
		<link rel='icon' type='image/png' sizes='96x96' href='/WebPath/images/otsdaqIcons/favicon-96x96.png'>\
		<link rel='icon' type='image/png' sizes='16x16' href='/WebPath/images/otsdaqIcons/favicon-16x16.png'>\
		<link rel='manifest' href='/WebPath/images/otsdaqIcons/manifest.json'>\
		<meta name='msapplication-TileColor' content='#ffffff'>\
		<meta name='msapplication-TileImage' content='/ms-icon-144x144.png'>\
		<meta name='theme-color' content='#ffffff'>"
	     <<
	    // end show ots icon
	    "</head>"
	     << "<frameset col='100%' row='100%'><frame "
	        "src='/WebPath/html/MacroMakerSupervisor.html?urn="
	     << this->getApplicationDescriptor()->getLocalId() << securityWarning
	     << "'></frameset></html>";
}  // end verification()

//==============================================================================
void MacroMakerSupervisor::generateURL()
{
	defaultSequence_ = true;

	int   length = 4;
	FILE* fp     = fopen((SEQUENCE_FILE_NAME).c_str(), "r");
	if(fp)
	{
		__SUP_COUT_INFO__ << "Sequence length file found: " << SEQUENCE_FILE_NAME
		                  << __E__;
		char line[100];
		fgets(line, 100, fp);
		sscanf(line, "%d", &length);
		fclose(fp);
		if(length < 4)
			length = 4;  // don't allow shorter than 4
		else
			defaultSequence_ = false;
		srand(time(0));  // randomize differently each "time"
	}
	else
	{
		__SUP_COUT_INFO__
		    << "(Reverting to default wiz security) Sequence length file NOT found: "
		    << SEQUENCE_FILE_NAME << __E__;
		srand(0);  // use same seed for convenience if file not found
	}

	__SUP_COUT__ << "Sequence length = " << length << __E__;

	securityCode_ = "";

	const char alphanum[] =
	    "0123456789"
	    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	    "abcdefghijklmnopqrstuvwxyz";

	for(int i = 0; i < length; ++i)
	{
		securityCode_ += alphanum[rand() % (sizeof(alphanum) - 1)];
	}

	__SUP_COUT__ << __ENV__("HOSTNAME") << ":" << __ENV__("PORT")
	             << "/urn:xdaq-application:lid="
	             << this->getApplicationDescriptor()->getLocalId()
	             << "/Verify?code=" << securityCode_ << __E__;

	// Note: print out handled by start ots script now
	// std::thread([&](WizardSupervisor *ptr, std::string securityCode)
	//		{printURL(ptr,securityCode);},this,securityCode_).detach();

	fp = fopen((SEQUENCE_OUT_FILE_NAME).c_str(), "w");
	if(fp)
	{
		fprintf(fp, "%s", securityCode_.c_str());
		fclose(fp);
	}
	else
		__SUP_COUT_ERR__ << "Sequence output file NOT found: " << SEQUENCE_OUT_FILE_NAME
		                 << __E__;

	return;
}  // end generateURL()
//==============================================================================
void MacroMakerSupervisor::requestIcons(xgi::Input* in, xgi::Output* out)
{
	cgicc::Cgicc cgi(in);

	std::string submittedSequence = CgiDataUtilities::postData(cgi, "sequence");

	// SECURITY CHECK START ****
	if(securityCode_.compare(submittedSequence) != 0)
	{
		__COUT__ << "Unauthorized Request made, security sequence doesn't match! "
		         << time(0) << __E__;
		return;
	}
	else
	{
		__COUT__ << "***Successfully authenticated security sequence. " << time(0)
		         << __E__;
	}
	// SECURITY CHECK END ****

	// an icon is 7 fields.. give comma-separated
	// 0 - subtext = text below icon
	// 1 - altText = text for icon if image set to 0
	// 2 - uniqueWin = if true, only one window is allowed, else multiple instances of
	// window  3 - permissions = security level needed to see icon  4 - picfn = icon image
	// filename, 0 for no image  5 - linkurl = url of the window to open  6 - folderPath =
	// folder and subfolder location

	*out << "Macro Maker "
	        ",MM,0,1,icon-MacroMaker.png,/WebPath/html/"
	        "MacroMaker.html?urn=290,/"
	        ",FE Macros"
	        ",CFG,0,1,icon-Configure.png,/WebPath/html/"
	        "FEMacroTest.html?urn=290,/"
	     << "";

	// if there is a file of more icons, add to end of output
	std::string iconFile = std::string(__ENV__("USER_DATA")) + "/MacroMakerModeIcons.dat";
	__COUT__ << "Macro Maker mode user icons file: " << iconFile << __E__;
	FILE* fp = fopen(iconFile.c_str(), "r");
	if(fp)
	{
		__COUT__ << "Macro Maker mode user icons loading from " << iconFile << __E__;
		fseek(fp, 0, SEEK_END);
		const unsigned long fileSize = ftell(fp);
		std::string         fileString(fileSize, 0);
		rewind(fp);
		if(fread(&fileString[0], 1, fileSize, fp) != fileSize)
		{
			__COUT_ERR__ << "Unable to read proper size string from icons file!" << __E__;
			return;
		}

		fclose(fp);
		__COUTV__(fileString);
		*out << fileString;
	}
	else
		__COUT__ << "Macro Maker mode user icons file not found: " << iconFile << __E__;
	return;
}  // end requestIcons()

//==============================================================================
// requestWrapper ~
//	wrapper for handling very-specialized MacroMaker mode Supervisor request call
void MacroMakerSupervisor::requestWrapper(xgi::Input* in, xgi::Output* out)
{
	// use default wrapper if not Macro Maker mode
	if(!CorePropertySupervisorBase::allSupervisorInfo_.isMacroMakerMode())
	{
		//__SUP_COUT__ << "Default request wrapper" << __E__;
		return CoreSupervisorBase::requestWrapper(in, out);
	}
	// else very specialized Macro Maker mode!

	//__SUP_COUT__ << "MacroMaker mode request handler!" << __E__;

	// checkSupervisorPropertySetup();

	cgicc::Cgicc cgiIn(in);

	std::string submittedSequence = CgiDataUtilities::postData(cgiIn, "sequence");

	// SECURITY CHECK START ****
	if(securityCode_.compare(submittedSequence) != 0)
	{
		__COUT__ << "Unauthorized Request made, security sequence doesn't match! "
		         << time(0) << __E__;
		return;
	}
	else
	{
		__COUT__ << "***Successfully authenticated security sequence. " << time(0)
		         << __E__;
	}
	// SECURITY CHECK END ****

	std::string requestType = CgiDataUtilities::getData(cgiIn, "RequestType");

	//__SUP_COUT__ << "requestType " << requestType << " files: " <<
	//		cgiIn.getFiles().size() << __E__;

	HttpXmlDocument           xmlOut;
	WebUsers::RequestUserInfo userInfo(
	    requestType, CgiDataUtilities::getOrPostData(cgiIn, "CookieCode"));

	CorePropertySupervisorBase::getRequestUserInfo(userInfo);

	// copied from WebUsers::checkRequestAccess
	userInfo.username_               = "admin";
	userInfo.displayName_            = "Admin";
	userInfo.usernameWithLock_       = "admin";
	userInfo.activeUserSessionIndex_ = 0;
	std::map<std::string /*groupName*/, WebUsers::permissionLevel_t> initPermissions = {
	    {WebUsers::DEFAULT_USER_GROUP, WebUsers::PERMISSION_LEVEL_ADMIN}};
	userInfo.setGroupPermissionLevels(StringMacros::mapToString(initPermissions));

	if(1 || !userInfo.automatedCommand_)
		__SUP_COUT__ << "requestType: " << requestType << __E__;

	if(userInfo.NonXMLRequestType_)
	{
		try
		{
			nonXmlRequest(requestType, cgiIn, *out, userInfo);
		}
		catch(const std::runtime_error& e)
		{
			__SUP_SS__ << "An error was encountered handling requestType '" << requestType
			           << "':" << e.what() << __E__;
			__SUP_COUT_ERR__ << "\n" << ss.str();
			__SUP_MOUT_ERR__ << "\n" << ss.str();
		}
		catch(...)
		{
			__SUP_SS__ << "An unknown error was encountered handling requestType '"
			           << requestType << ".' "
			           << "Please check the printouts to debug." << __E__;
			__SUP_COUT_ERR__ << "\n" << ss.str();
			__SUP_MOUT_ERR__ << "\n" << ss.str();
		}
		return;
	}
	// else xml request type

	try
	{
		// call derived class' request()
		request(requestType, cgiIn, xmlOut, userInfo);
	}
	catch(const std::runtime_error& e)
	{
		__SUP_SS__ << "An error was encountered handling requestType '" << requestType
		           << "':" << e.what() << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
	catch(...)
	{
		__SUP_SS__ << "An unknown error was encountered handling requestType '"
		           << requestType << ".' "
		           << "Please check the printouts to debug." << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}

	// report any errors encountered
	{
		unsigned int occurance = 0;
		std::string  err       = xmlOut.getMatchingValue("Error", occurance++);
		while(err != "")
		{
			__SUP_COUT_ERR__ << "'" << requestType << "' ERROR encountered: " << err
			                 << __E__;
			__SUP_MOUT_ERR__ << "'" << requestType << "' ERROR encountered: " << err
			                 << __E__;
			err = xmlOut.getMatchingValue("Error", occurance++);
		}
	}

	// return xml doc holding server response
	xmlOut.outputXmlDocument((std::ostringstream*)out,
	                         false /*print to cout*/,
	                         !userInfo.NoXmlWhiteSpace_ /*allow whitespace*/);
}  // end requestWrapper()

//==============================================================================
void MacroMakerSupervisor::request(const std::string&               requestType,
                                   cgicc::Cgicc&                    cgiIn,
                                   HttpXmlDocument&                 xmlOut,
                                   const WebUsers::RequestUserInfo& userInfo)
try
{
	// sanitize username
	std::string username = "";
	for(unsigned int i = 0; i < userInfo.username_.size(); ++i)
		if((userInfo.username_[i] >= 'a' && userInfo.username_[i] <= 'z') ||
		   (userInfo.username_[i] >= 'A' && userInfo.username_[i] <= 'Z') ||
		   (userInfo.username_[i] >= '0' && userInfo.username_[i] <= '9') ||
		   userInfo.username_[i] >= '-' || userInfo.username_[i] <= '_')
			username += userInfo.username_[i];

	if(username.size() < 2)
	{
		__SUP_SS__ << "Illegal username '" << userInfo.username_ << "' received."
		           << __E__;
		__SUP_SS_THROW__;
	}

	__SUP_COUT__ << "User name is " << userInfo.username_ << "." << __E__;
	__SUP_COUT__ << "User permission level for request '" << requestType << "' is "
	             << unsigned(userInfo.permissionLevel_) << "." << __E__;

	// handle request per requestType

	if (requestType == "loadFEHistory")
	{
		std::string histPath = (std::string)MACROS_HIST_PATH + userInfo.username_ + "/";
		mkdir(histPath.c_str(), 0755);
	}

	if (requestType == "loadMacroSequences")
	{
		std::string seqPath = (std::string)MACROS_SEQUENCE_PATH + userInfo.username_ + "/";
		mkdir(seqPath.c_str(), 0755);
	}

	if(requestType == "getPermission")
	{
		xmlOut.addTextElementToData("Permission",
		                            std::to_string(unsigned(userInfo.permissionLevel_)));
		// create macro maker folders for the user (the first time a user authenticates
		// with macro maker)
		std::string macroPath = (std::string)MACROS_DB_PATH + userInfo.username_ + "/";
		mkdir(macroPath.c_str(), 0755);
		std::string histPath = (std::string)MACROS_HIST_PATH + userInfo.username_ + "/";
		mkdir(histPath.c_str(), 0755);
		std::string publicPath = (std::string)MACROS_DB_PATH + "publicMacros/";
		mkdir(publicPath.c_str(), 0755);
		std::string exportPath =
		    __ENV__("SERVICE_DATA_PATH") + MACROS_EXPORT_PATH + userInfo.username_ + "/";
		mkdir(exportPath.c_str(), 0755);
	}
	else
		handleRequest(requestType, xmlOut, cgiIn, userInfo);
}  // end request()
catch(const std::runtime_error& e)
{
	__SS__ << "Error occurred handling request '" << requestType << "': " << e.what()
	       << __E__;
	__SUP_COUT__ << ss.str();
	xmlOut.addTextElementToData("Error", ss.str());
}
catch(...)
{
	__SS__ << "Unknown error occurred handling request '" << requestType << "!'" << __E__;
	__SUP_COUT__ << ss.str();
	xmlOut.addTextElementToData("Error", ss.str());
}  // end request() error handling

//==============================================================================

void MacroMakerSupervisor::handleRequest(const std::string                Command,
                                         HttpXmlDocument&                 xmldoc,
                                         cgicc::Cgicc&                    cgi,
                                         const WebUsers::RequestUserInfo& userInfo)
{
	if(Command == "FElist")  // called by MacroMaker GUI
		getFElist(xmldoc);
	else if(Command == "writeData")  // called by MacroMaker GUI
		writeData(xmldoc, cgi, userInfo.username_);
	else if(Command == "readData")  // called by MacroMaker GUI
		readData(xmldoc, cgi, userInfo.username_);
	else if(Command == "createMacro")  // called by MacroMaker GUI
		createMacro(xmldoc, cgi, userInfo.username_);
	else if(Command == "loadMacros")  // called by MacroMaker GUI
		loadMacros(xmldoc, userInfo.username_);
	else if(Command == "loadHistory")  // called by MacroMaker GUI
		loadHistory(xmldoc, userInfo.username_);
	else if(Command == "deleteMacro")  // called by MacroMaker GUI
		deleteMacro(xmldoc, cgi, userInfo.username_);
	else if(Command == "editMacro")  // called by MacroMaker GUI
		editMacro(xmldoc, cgi, userInfo.username_);
	else if(Command == "clearHistory")  // called by MacroMaker GUI
		clearHistory(userInfo.username_);
	else if(Command == "exportMacro")  // called by MacroMaker GUI
		exportMacro(xmldoc, cgi, userInfo.username_);
	else if(Command == "exportFEMacro")  // called by MacroMaker GUI
		exportFEMacro(xmldoc, cgi, userInfo.username_);
	else if(Command == "getFEMacroList")  // called by FE Macro Test and returns FE Macros
	                                      // and Macro Maker Macros
		getFEMacroList(xmldoc, userInfo.username_);
	else if(Command == "runFEMacro")  // called by FE Macro Test returns FE Macros and
	                                  // Macro Maker Macros
		runFEMacro(xmldoc, cgi, userInfo);
	else if(Command == "loadFEHistory")  // called by FE Macro Test and returns FE Macros
	                                      // and Macro Maker Macros
		loadFEHistory(xmldoc, userInfo.username_);
	else if(Command == "clearFEHistory")  // called by FE Macro Test returns FE Macros and
	                                  		// Macro Maker Macros
		clearFEHistory(userInfo.username_);
	else if (Command == "loadMacroSequences")
		loadMacroSequences(xmldoc, userInfo.username_);
	else if (Command == "saveSequence")
		saveMacroSequence(cgi, userInfo.username_);
	else if (Command == "getSequence")
		getMacroSequence(xmldoc, cgi, userInfo.username_);
	else if (Command == "deleteSequence")
		deleteMacroSequence(cgi, userInfo.username_);
	else if (Command == "runSequence")
		runFEMacroSequence(xmldoc, cgi, userInfo.username_);
	else
		xmldoc.addTextElementToData("Error", "Unrecognized command '" + Command + "'");
}  // end handleRequest()

//==============================================================================
xoap::MessageReference MacroMakerSupervisor::frontEndCommunicationRequest(
    xoap::MessageReference message)
try
{
	__SUP_COUT__ << "FE Request received: " << SOAPUtilities::translate(message) << __E__;

	SOAPParameters typeParameter, rxParameters;  // params for xoap to recv
	typeParameter.addParameter("type");
	SOAPUtilities::receive(message, typeParameter);

	std::string type = typeParameter.getValue("type");

	std::string error = "";

	if(type == "initFElist")  // gateway initializes during configure
	{
		__SUP_COUTV__(type);

		rxParameters.addParameter("groupName");
		rxParameters.addParameter("groupKey");
		SOAPUtilities::receive(message, rxParameters);

		std::string groupName = rxParameters.getValue("groupName");
		std::string groupKey  = rxParameters.getValue("groupKey");

		__SUP_COUTV__(groupName);
		__SUP_COUTV__(groupKey);

		ConfigurationManager cfgMgr;
		cfgMgr.loadTableGroup(groupName, TableGroupKey(groupKey), true);

		// for each FESupervisor
		// get all front end children

		const SupervisorInfoMap& feTypeSupervisors =
		    CorePropertySupervisorBase::allSupervisorInfo_.getAllFETypeSupervisorInfo();

		ConfigurationTree appsNode =
		    cfgMgr.getNode(ConfigurationManager::XDAQ_APPLICATION_TABLE_NAME);

		__SUP_COUT__ << "Number of FE Supervisors found = " << feTypeSupervisors.size()
		             << __E__;

		FEPluginTypetoFEsMap_.clear();  // reset
		FEtoSupervisorMap_.clear();     // reset
		FEtoPluginTypeMap_.clear();     // reset
		for(auto& feApp : feTypeSupervisors)
		{
			__SUP_COUT__ << "FEs for app " << feApp.first << ":" << feApp.second.getName()
			             << __E__;

			auto feChildren = appsNode.getNode(feApp.second.getName())
			                      .getNode("LinkToSupervisorTable")
			                      .getNode("LinkToFEInterfaceTable")
			                      .getChildren();

			for(auto& fe : feChildren)
			{
				if(!fe.second.status())
					continue;  // skip disabled FEs

				__SUP_COUTV__(fe.first);
				FEtoSupervisorMap_[fe.first] = feApp.first;

				std::string pluginType =
				    fe.second.getNode("FEInterfacePluginName").getValue();
				FEPluginTypetoFEsMap_[pluginType].emplace(fe.first);
				FEtoPluginTypeMap_[fe.first] = pluginType;
			}
		}

		__SUP_COUTV__(StringMacros::mapToString(FEtoSupervisorMap_));
		__SUP_COUTV__(StringMacros::mapToString(FEPluginTypetoFEsMap_));
		__SUP_COUTV__(StringMacros::mapToString(FEtoPluginTypeMap_));
	}
	else if(type == "feSend" ||                        // from front-ends
	        type == "feMacro" ||                       // from front-ends
	        type == "feMacroMultiDimensionalStart" ||  // from iterator
	        type == "feMacroMultiDimensionalCheck" ||  // from iterator
	        type == "macroMultiDimensionalStart" ||    // from iterator
	        type == "macroMultiDimensionalCheck")      // from iterator
	{
		__SUP_COUTV__(type);

		rxParameters.addParameter("targetInterfaceID");
		SOAPUtilities::receive(message, rxParameters);

		std::string targetInterfaceID = rxParameters.getValue("targetInterfaceID");

		__SUP_COUTV__(targetInterfaceID);

		auto feIt = FEtoSupervisorMap_.find(targetInterfaceID);
		if(feIt == FEtoSupervisorMap_.end())
		{
			__SUP_SS__ << "Destination front end interface ID '" << targetInterfaceID
			           << "' was not found in the list of front ends." << __E__;
			__SUP_SS_THROW__;
		}

		unsigned int FESupervisorIndex = feIt->second;
		__SUP_COUT__ << "Found supervisor index: " << FESupervisorIndex << __E__;

		SupervisorInfoMap::iterator it = allFESupervisorInfo_.find(FESupervisorIndex);
		if(it == allFESupervisorInfo_.end())
		{
			__SUP_SS__ << "Error transmitting request to FE Supervisor '"
			           << targetInterfaceID << ":" << FESupervisorIndex << ".' \n\n"
			           << "The FE Supervisor Index does not exist. Have you configured "
			              "the state machine properly?"
			           << __E__;
			__SUP_SS_THROW__;
		}

		if(type == "macroMultiDimensionalStart")
		{
			// add Macro sequence (and check macro exists)

			SOAPParameters rxParameters;
			rxParameters.addParameter("macroName");
			SOAPUtilities::receive(message, rxParameters);
			std::string macroName = rxParameters.getValue("macroName");
			__SUP_COUTV__(macroName);

			std::string macroString;
			loadMacro(macroName, macroString);

			SOAPParameters parameters;
			parameters.addParameter("macroString", macroString);
			SOAPUtilities::addParameters(message, parameters);
		}

		try
		{
			__SUP_COUT__ << "Forwarding request: " << SOAPUtilities::translate(message)
			             << __E__;

			xoap::MessageReference replyMessage =
			    SOAPMessenger::sendWithSOAPReply(it->second.getDescriptor(), message);

			if(type != "feSend")
			{
				__SUP_COUT__ << "Forwarding FE Macro response: "
				             << SOAPUtilities::translate(replyMessage) << __E__;

				return replyMessage;
			}
		}
		catch(const xdaq::exception::Exception& e)
		{
			__SUP_SS__ << "Error forwarding FE Communication request to FE Supervisor '"
			           << targetInterfaceID << ":" << FESupervisorIndex << ".' "
			           << "Have you configured the state machine properly?\n\n"
			           << e.what() << __E__;
			__SUP_SS_THROW__;
		}
	}
	else
	{
		__SUP_SS__ << "Unrecognized FE Communication type: " << type << __E__;
		__SUP_SS_THROW__;
	}

	return SOAPUtilities::makeSOAPMessageReference("Received");
}  // end frontEndCommunicationRequest()
catch(const std::runtime_error& e)
{
	__SUP_SS__ << "Error processing FE communication request: " << e.what() << __E__;
	__SUP_COUT_ERR__ << ss.str();

	xoap::MessageReference returnMessage =
	    SOAPUtilities::makeSOAPMessageReference("Error");

	SOAPParameters parameters;
	parameters.addParameter("Error", ss.str());
	SOAPUtilities::addParameters(returnMessage, parameters);
	return returnMessage;
}
catch(...)
{
	xoap::MessageReference returnMessage =
	    SOAPUtilities::makeSOAPMessageReference("Error");

	__SUP_SS__ << "Unknown error processing FE communication request." << __E__;
	__SUP_COUT_ERR__ << ss.str();

	SOAPParameters parameters;
	parameters.addParameter("Error", ss.str());
	SOAPUtilities::addParameters(returnMessage, parameters);
	return returnMessage;
}  // end frontEndCommunicationRequest() catch

//==============================================================================
void MacroMakerSupervisor::getFElist(HttpXmlDocument& xmldoc)
{
	__SUP_COUT__ << "Getting FE list!!!!!!!!!" << __E__;

	SOAPParameters txParameters;  // params for xoap to send
	txParameters.addParameter("Request", "GetInterfaces");

	SOAPParameters rxParameters;  // params for xoap to recv
	rxParameters.addParameter("Command");
	rxParameters.addParameter("FEList");
	rxParameters.addParameter("frontEndError");  // if there were errors recorded (during
	                                             // configuration, e.g. in Macro Maker
	                                             // only mode)

	SupervisorInfoMap::const_iterator it;
	std::string                       oneInterface;
	std::string                       rxFEList;
	std::string                       rxFrontEndError;

	size_t lastColonIndex;

	// for each list of FE Supervisors,
	//	loop through each FE Supervisors and get FE interfaces list
	for(auto& appInfo : allFESupervisorInfo_)
	{
		//		__SUP_COUT__ << "Number of " << listPair.first << " = " <<
		//				listPair.second.size() << __E__;
		//
		//		for (it = listPair.second.begin(); it != listPair.second.end(); it++)
		//		{

		__SUP_COUT__ << "FESupervisor LID = " << appInfo.second.getId()
		             << " name = " << appInfo.second.getName() << __E__;

		try
		{
			xoap::MessageReference retMsg =
			    SOAPMessenger::sendWithSOAPReply(appInfo.second.getDescriptor(),
			                                     "MacroMakerSupervisorRequest",
			                                     txParameters);
			SOAPUtilities::receive(retMsg, rxParameters);

			__SUP_COUT__ << "Received MacroMaker response: "
			             << SOAPUtilities::translate(retMsg).getCommand() << "==>"
			             << SOAPUtilities::translate(retMsg) << __E__;

			if(SOAPUtilities::translate(retMsg).getCommand() == "Fault")
			{
				__SUP_SS__ << "Unrecognized command received!" << __E__;
				__SUP_SS_THROW__;
			}
		}
		catch(const xdaq::exception::Exception& e)
		{
			__SUP_SS__ << "Error transmitting request to FE Supervisor LID = "
			           << appInfo.second.getId() << " name = " << appInfo.second.getName()
			           << ". \n\n"
			           << e.what() << __E__;
			__SUP_SS_THROW__;
		}

		rxFEList        = rxParameters.getValue("FEList");
		rxFrontEndError = rxParameters.getValue("frontEndError");

		__SUP_COUT__ << "FE List received: \n" << rxFEList << __E__;

		if(rxFrontEndError != "")
		{
			__SUP_SS__ << "FE Errors received: \n" << rxFrontEndError << __E__;
			__SUP_SS_THROW__;
		}

		std::istringstream allInterfaces(rxFEList);
		while(std::getline(allInterfaces, oneInterface))
		{
			__SUP_COUTV__(oneInterface);
			xmldoc.addTextElementToData("FE", oneInterface);

			lastColonIndex = oneInterface.rfind(':');
			if(lastColonIndex == std::string::npos)
			{
				__SUP_SS__ << "Last colon could not be found in " << oneInterface
				           << __E__;
				__SUP_SS_THROW__;
			}
			oneInterface = oneInterface.substr(lastColonIndex);

			__SUP_COUTV__(oneInterface);
		}  // end FE extract loop

	}  // end ask Supervisors for their FE list loop

}  // end getFEList()

//==============================================================================
void MacroMakerSupervisor::writeData(HttpXmlDocument& /*xmldoc*/,
                                     cgicc::Cgicc&      cgi,
                                     const std::string& username)
{
	__SUP_COUT__ << "MacroMaker writing..." << __E__;

	std::string Address              = CgiDataUtilities::getData(cgi, "Address");
	std::string Data                 = CgiDataUtilities::getData(cgi, "Data");
	std::string interfaceIndexArray  = CgiDataUtilities::getData(cgi, "interfaceIndex");
	std::string supervisorIndexArray = CgiDataUtilities::getData(cgi, "supervisorIndex");
	std::string time =
	    StringMacros::decodeURIComponent(CgiDataUtilities::getData(cgi, "time"));
	std::string addressFormatStr = CgiDataUtilities::getData(cgi, "addressFormatStr");
	std::string dataFormatStr    = CgiDataUtilities::getData(cgi, "dataFormatStr");

	std::string interfaces = CgiDataUtilities::postData(cgi, "interfaces");

	__SUP_COUT__ << "Write Address: " << Address << " Data: " << Data << __E__;
	__SUP_COUTV__(interfaces);

	std::string command = "w:" + Address + ":" + Data;
	std::string format  = addressFormatStr + ":" + dataFormatStr;
	appendCommandToHistory(command, format, time, interfaces, username);

	SOAPParameters txParameters;  // params for xoap to send
	txParameters.addParameter("Request", "UniversalWrite");
	txParameters.addParameter("Address", Address);
	txParameters.addParameter("Data", Data);

	__SUP_COUT__ << "Here comes the array from multiselect box for WRITE, behold: \n"
	             << supervisorIndexArray << "\n"
	             << interfaceIndexArray << __E__;

	////////////////////////////////Store cgi arrays into
	/// vectors/////////////////////////////
	std::vector<std::string> interfaceIndices;
	std::istringstream       f(interfaceIndexArray);
	std::string              s;
	while(getline(f, s, ','))
		interfaceIndices.push_back(s);
	std::vector<int>   supervisorIndices;
	std::istringstream g(supervisorIndexArray);
	std::string        t;
	while(getline(g, t, ','))
		supervisorIndices.push_back(std::stoi(t));

	for(unsigned int i = 0; i < supervisorIndices.size(); i++)
	{
		unsigned int FESupervisorIndex = supervisorIndices[i];
		std::string  interfaceIndex    = interfaceIndices[i];

		txParameters.addParameter("InterfaceID", interfaceIndex);

		__SUP_COUT__ << "The index of the supervisor instance is: " << FESupervisorIndex
		             << __E__;
		__SUP_COUT__ << "...and the interface ID is: " << interfaceIndex << __E__;

		SupervisorInfoMap::iterator it = allFESupervisorInfo_.find(FESupervisorIndex);
		if(it == allFESupervisorInfo_.end())
		{
			__SUP_SS__ << "Error transmitting request to FE Supervisor '"
			           << interfaceIndex << ":" << FESupervisorIndex << ".' \n\n"
			           << "The FE Index doesn't exist. Have you configured the state "
			              "machine properly?"
			           << __E__;
			__SUP_SS_THROW__;
		}

		try
		{
			xoap::MessageReference replyMessage = SOAPMessenger::sendWithSOAPReply(
			    it->second.getDescriptor(), "MacroMakerSupervisorRequest", txParameters);

			__SUP_COUT__ << "Response received: "
			             << SOAPUtilities::translate(replyMessage) << __E__;

			SOAPParameters rxParameters;
			rxParameters.addParameter("Error");
			SOAPUtilities::receive(replyMessage, rxParameters);

			std::string error = rxParameters.getValue("Error");
			__SUP_COUTV__(error);

			if(error != "")
			{
				// error occurred!
				__SUP_SS__ << "Error transmitting request to FE Supervisor '"
				           << interfaceIndex << ":" << FESupervisorIndex << ".' "
				           << "Have you configured the state machine properly?\n\n"
				           << error << __E__;
				__SUP_SS_THROW__;
			}
		}
		catch(const xdaq::exception::Exception& e)
		{
			__SUP_SS__ << "Error transmitting request to FE Supervisor '"
			           << interfaceIndex << ":" << FESupervisorIndex << ".' "
			           << "Have you configured the state machine properly?\n\n"
			           << e.what() << __E__;
			__SUP_SS_THROW__;
		}

	}  // end FE Supervisor loop
}  // end writeData()

//==============================================================================
void MacroMakerSupervisor::readData(HttpXmlDocument&   xmldoc,
                                    cgicc::Cgicc&      cgi,
                                    const std::string& username)
{
	__SUP_COUT__ << "@@@@@@@ MacroMaker wants to read data @@@@@@@@" << __E__;
	std::string Address              = CgiDataUtilities::getData(cgi, "Address");
	std::string interfaceIndexArray  = CgiDataUtilities::getData(cgi, "interfaceIndex");
	std::string supervisorIndexArray = CgiDataUtilities::getData(cgi, "supervisorIndex");
	std::string time =
	    StringMacros::decodeURIComponent(CgiDataUtilities::getData(cgi, "time"));
	std::string addressFormatStr = CgiDataUtilities::getData(cgi, "addressFormatStr");
	std::string dataFormatStr    = CgiDataUtilities::getData(cgi, "dataFormatStr");

	std::string interfaces = CgiDataUtilities::postData(cgi, "interfaces");

	__SUP_COUT__ << "Read Address: " << Address << __E__;
	__SUP_COUTV__(interfaces);

	SOAPParameters txParameters;  // params for xoap to send
	txParameters.addParameter("Request", "UniversalRead");
	txParameters.addParameter("Address", Address);

	SOAPParameters rxParameters;
	rxParameters.addParameter("dataResult");
	rxParameters.addParameter("Error");
	__SUP_COUT__ << "Here comes the array from multiselect box for READ, behold: "
	             << supervisorIndexArray << "," << interfaceIndexArray << __E__;

	////////////////////////////////Store cgi arrays into
	/// vectors/////////////////////////////
	std::vector<std::string> interfaceIndices;
	std::istringstream       f(interfaceIndexArray);
	std::string              s;
	while(getline(f, s, ','))
		interfaceIndices.push_back(s);
	std::vector<int>   supervisorIndices;
	std::istringstream g(supervisorIndexArray);
	std::string        t;
	while(getline(g, t, ','))
		supervisorIndices.push_back(std::stoi(t));

	for(unsigned int i = 0; i < supervisorIndices.size(); i++)
	{
		unsigned int FESupervisorIndex = supervisorIndices[i];
		std::string  interfaceIndex    = interfaceIndices[i];

		txParameters.addParameter("InterfaceID", interfaceIndex);

		__SUP_COUT__ << "The index of the supervisor instance is: " << FESupervisorIndex
		             << __E__;
		__SUP_COUT__ << "...and the interface ID is: " << interfaceIndex << __E__;

		SupervisorInfoMap::iterator it = allFESupervisorInfo_.find(FESupervisorIndex);
		if(it == allFESupervisorInfo_.end())
		{
			__SUP_SS__ << "Error transmitting request to FE Supervisor '"
			           << interfaceIndex << ":" << FESupervisorIndex << ".' \n\n"
			           << "The FE Index doesn't exist. Have you configured the state "
			              "machine properly?"
			           << __E__;
			__SUP_SS_THROW__;
		}

		try
		{
			xoap::MessageReference retMsg = SOAPMessenger::sendWithSOAPReply(
			    it->second.getDescriptor(), "MacroMakerSupervisorRequest", txParameters);

			__SUP_COUT__ << "Response received: " << SOAPUtilities::translate(retMsg)
			             << __E__;

			// SOAPParameters rxParameters;
			// rxParameters.addParameter("Error");
			SOAPUtilities::receive(retMsg, rxParameters);

			std::string error = rxParameters.getValue("Error");
			__SUP_COUTV__(error);

			if(error != "")
			{
				// error occurred!
				__SUP_SS__ << "Error transmitting request to FE Supervisor '"
				           << interfaceIndex << ":" << FESupervisorIndex << ".' "
				           << "Have you configured the state machine properly?\n\n"
				           << error << __E__;
				__SUP_SS_THROW__;
			}
		}
		catch(const xdaq::exception::Exception& e)
		{
			__SUP_SS__ << "Error transmitting request to FE Supervisor '"
			           << interfaceIndex << ":" << FESupervisorIndex << ".' "
			           << "Have you configured the state machine properly?\n\n"
			           << e.what() << __E__;
			__SUP_SS_THROW__;
		}

		std::string dataReadResult = rxParameters.getValue("dataResult");
		__SUP_COUT__ << "Data reading result received: " << dataReadResult << __E__;
		xmldoc.addTextElementToData("readData", dataReadResult);
		std::string command = "r:" + Address + ":" + dataReadResult;
		std::string format  = addressFormatStr + ":" + dataFormatStr;
		appendCommandToHistory(command, format, time, interfaces, username);
	}
}

//==============================================================================
void MacroMakerSupervisor::createMacro(HttpXmlDocument& /*xmldoc*/,
                                       cgicc::Cgicc&      cgi,
                                       const std::string& username)
{
	__SUP_COUT__ << "MacroMaker wants to create a macro!!!!!!!!!" << __E__;
	std::string Name     = CgiDataUtilities::postData(cgi, "Name");
	std::string Sequence = CgiDataUtilities::postData(cgi, "Sequence");
	std::string Time     = CgiDataUtilities::postData(cgi, "Time");
	std::string Notes =
	    StringMacros::decodeURIComponent(CgiDataUtilities::postData(cgi, "Notes"));
	std::string isMacroPublic = CgiDataUtilities::getData(cgi, "isPublic");
	std::string isMacroLSBF   = CgiDataUtilities::getData(cgi, "isLSBF");

	__SUP_COUTV__(Name);
	__SUP_COUTV__(Sequence);
	__SUP_COUTV__(Notes);
	__SUP_COUTV__(Time);
	__SUP_COUTV__(isMacroPublic);
	__SUP_COUTV__(isMacroLSBF);

	__SUP_COUTV__(MACROS_DB_PATH);

	std::string fileName = Name + ".dat";
	std::string fullPath;
	if(isMacroPublic == "true")
		fullPath = (std::string)MACROS_DB_PATH + "publicMacros/" + fileName;
	else
		fullPath = (std::string)MACROS_DB_PATH + username + "/" + fileName;

	__SUP_COUTV__(fullPath);

	std::ofstream macrofile(fullPath.c_str());
	if(macrofile.is_open())
	{
		macrofile << "{\n";
		macrofile << "\"name\":\"" << Name << "\",\n";
		macrofile << "\"sequence\":\"" << Sequence << "\",\n";
		macrofile << "\"time\":\"" << Time << "\",\n";
		macrofile << "\"notes\":\"" << Notes << "\",\n";
		macrofile << "\"LSBF\":\"" << isMacroLSBF << "\"\n";
		macrofile << "}@" << __E__;
		macrofile.close();
	}
	else
		__SUP_COUT__ << "Unable to open file" << __E__;
}  // end createMacro()

//==============================================================================
// loadMacro
//	Load macro string from file.
//	look in public macros and username (if given)
//	for the macroName.
//
//	If found, return by reference
//	Else, throw exception
void MacroMakerSupervisor::loadMacro(const std::string& macroName,
                                     std::string&       macroString,
                                     const std::string& username /*=""*/)
{
	__SUP_COUTV__(macroName);

	// first check public folder, then user
	std::string fullPath, line;
	macroString = "";
	for(unsigned int i = 0; i < 2; ++i)
	{
		if(i == 1)
			fullPath = (std::string)MACROS_DB_PATH + username + "/";
		else
			fullPath = (std::string)MACROS_DB_PATH + "publicMacros/";

		fullPath += macroName;
		if(macroName.find(".dat") != macroName.size() - 4)
			fullPath += ".dat";
		__SUP_COUTV__(fullPath);

		std::ifstream read(fullPath.c_str());  // reading a file
		if(read.is_open())
		{
			while(!read.eof())
			{
				getline(read, line);
				macroString += line;
			}

			read.close();
		}
		else  // file does not exist
		{
			__SUP_COUT__ << "Unable to open file: " << fullPath << __E__;
			continue;
		}

		if(macroString != "")
			break;  // macro has been found!
	}               // end load from path loop

	if(macroString == "")
	{
		__SUP_SS__ << "Unable to locate file for macro '" << macroName
		           << "'... does it exist?" << __E__;
		if(username != "")
			ss << " Attempted username was '" << username << ".'" << __E__;
		__SUP_SS_THROW__;
	}

	__SUP_COUTV__(macroString);
}  // end loadMacro()

//==============================================================================
void MacroMakerSupervisor::loadMacroNames(
    const std::string&                                      username,
    std::pair<std::vector<std::string> /*public macros*/,
              std::vector<std::string> /*private macros*/>& returnMacroNames)
{
	DIR*           dir;
	struct dirent* ent;
	std::string    fullPath = (std::string)MACROS_DB_PATH + username + "/";
	if((dir = opendir(fullPath.c_str())) != NULL)
	{
		/* print all the files and directories within directory */
		while((ent = readdir(dir)) != NULL)
		{
			/* File name validation check */
			if((unsigned)strlen(ent->d_name) > 4)
			{
				std::string   line;
				std::ifstream read(
				    ((fullPath + (std::string)ent->d_name)).c_str());  // reading a file
				if(read.is_open())
				{
					read.close();
					// private macro found
					returnMacroNames.second.push_back(ent->d_name);
				}
				else
					__SUP_COUT__ << "Unable to open file" << __E__;
			}
		}
		closedir(dir);
	}
	else
	{
		__SUP_COUT__ << "Looping through privateMacros folder failed! Wrong directory"
		             << __E__;
	}
	fullPath = (std::string)MACROS_DB_PATH + "publicMacros/";
	if((dir = opendir(fullPath.c_str())) != NULL)
	{
		/* print all the files and directories within directory */
		while((ent = readdir(dir)) != NULL)
		{
			/* File name validation check */
			if((unsigned)strlen(ent->d_name) > 4)
			{
				std::string   line;
				std::ifstream read(
				    ((fullPath + (std::string)ent->d_name)).c_str());  // reading a file
				if(read.is_open())
				{
					// public macro found
					returnMacroNames.first.push_back(ent->d_name);
					read.close();
				}
				else
					__SUP_COUT__ << "Unable to open file" << __E__;
			}
		}
		closedir(dir);
	}
	else
	{
		__SUP_COUT__ << fullPath << __E__;
		__SUP_COUT__ << "Looping through MacroData folder failed! Wrong directory"
		             << __E__;
	}

}  // end loadMacroNames

//==============================================================================
void MacroMakerSupervisor::loadMacros(HttpXmlDocument&   xmldoc,
                                      const std::string& username)
{
	DIR*           dir;
	struct dirent* ent;
	std::string    returnStr = "";
	std::string    fullPath  = (std::string)MACROS_DB_PATH + username + "/";
	if((dir = opendir(fullPath.c_str())) != NULL)
	{
		/* print all the files and directories within directory */
		while((ent = readdir(dir)) != NULL)
		{
			/* File name validation check */
			if((unsigned)strlen(ent->d_name) > 4)
			{
				std::string   line;
				std::ifstream read(
				    ((fullPath + (std::string)ent->d_name)).c_str());  // reading a file
				if(read.is_open())
				{
					std::stringstream buffer;
					while(!read.eof())
					{
						getline(read, line);
						buffer << line;
						//__SUP_COUT__ << line << __E__;
					}
					returnStr += buffer.str();

					read.close();
				}
				else
					__SUP_COUT__ << "Unable to open file" << __E__;
			}
		}
		std::string returnMacroStr = returnStr.substr(0, returnStr.size() - 1);

		__SUP_COUT__ << "Loading existing macros! " << returnMacroStr << __E__;

		closedir(dir);
		xmldoc.addTextElementToData("returnMacroStr", returnMacroStr);
	}
	else
	{
		__SUP_COUT__ << "Looping through privateMacros folder failed! Wrong directory"
		             << __E__;
	}
	fullPath  = (std::string)MACROS_DB_PATH + "publicMacros/";
	returnStr = "";
	if((dir = opendir(fullPath.c_str())) != NULL)
	{
		/* print all the files and directories within directory */
		while((ent = readdir(dir)) != NULL)
		{
			/* File name validation check */
			if((unsigned)strlen(ent->d_name) > 4)
			{
				std::string   line;
				std::ifstream read(
				    ((fullPath + (std::string)ent->d_name)).c_str());  // reading a file
				if(read.is_open())
				{
					std::stringstream buffer;
					while(!read.eof())
					{
						getline(read, line);
						buffer << line;
						//__SUP_COUT__ << line << __E__;
					}
					returnStr += buffer.str();
					read.close();
				}
				else
					__SUP_COUT__ << "Unable to open file" << __E__;
			}
		}
		std::string returnPublicStr = returnStr.substr(0, returnStr.size() - 1);
		__SUP_COUT__ << "Loading existing public macros: " << returnPublicStr << __E__;
		closedir(dir);
		xmldoc.addTextElementToData("returnPublicStr", returnPublicStr);
	}
	else
	{
		__SUP_COUT__ << fullPath << __E__;
		__SUP_COUT__ << "Looping through MacroData folder failed! Wrong directory"
		             << __E__;
	}
}  // end loadMacros()

//==============================================================================
void MacroMakerSupervisor::appendCommandToHistory(std::string        Command,
                                                  std::string        Format,
                                                  std::string        Time,
                                                  std::string        Interfaces,
                                                  const std::string& username)
{
	std::string fileName = "history.hist";
	std::string fullPath = (std::string)MACROS_HIST_PATH + username + "/" + fileName;
	__SUP_COUT__ << fullPath << __E__;
	std::ofstream histfile(fullPath.c_str(), std::ios::app);
	if(histfile.is_open())
	{
		histfile << "{\n";
		histfile << "\"Command\":\"" << Command << "\",\n";
		histfile << "\"Format\":\"" << Format << "\",\n";
		histfile << "\"Time\":\"" << Time << "\",\n";
		histfile << "\"Interfaces\":\"" << Interfaces << "\"\n";
		histfile << "}#" << __E__;
		histfile.close();
	}
	else
		__SUP_COUT__ << "Unable to open history.hist" << __E__;
}
//==============================================================================
void MacroMakerSupervisor::appendCommandToHistory(std::string feClass,
												  std::string feUID,
												  std::string macroType,
												  std::string macroName,
												  std::string inputArgs,
												  std::string outputArgs,
												  bool saveOutputs,
												  const std::string& username)
{
	std::string fileName = "FEhistory.hist";
	std::string fullPath = (std::string)MACROS_HIST_PATH + username + "/" + fileName;
	__SUP_COUT__ << fullPath << __E__;
	std::ofstream histfile (fullPath.c_str(), std::ios::app);
	if (histfile.is_open())
	{
		histfile << "{\n";
		histfile << "\"feClass\":\"" << feClass << "\",\n";
		histfile << "\"feUID\":\"" << feUID << "\",\n";
		histfile << "\"macroType\":\"" << macroType << "\",\n";
		histfile << "\"macroName\":\"" << macroName << "\",\n";
		histfile << "\"inputArgs\":\"" << inputArgs << "\",\n";
		histfile << "\"outputArgs\":\"" << outputArgs << "\",\n";
		if (saveOutputs)
			histfile << "\"saveOutputs\":\"" << 1 << "\"\n";
		else
			histfile << "\"saveOutputs\":\"" << 0 << "\"\n";
		histfile << "}#" << __E__;
		histfile.close();
	}
	else
		__SUP_COUT__ << "Unable to open FEhistory.hist" << __E__;

}
//==============================================================================
void MacroMakerSupervisor::loadMacroSequences(HttpXmlDocument& xmldoc,
                                       		  const std::string& username) 
{
	DIR* dir;
	struct dirent* ent;
	std::string fullPath = (std::string)MACROS_SEQUENCE_PATH + username + "/";
	std::string sequences = "";
	if ((dir = opendir(fullPath.c_str())) != NULL)
	{
		/* print all the files and directories within directory */
		while((ent = readdir(dir)) != NULL)
		{
			std::string line;
			std::ifstream read(((fullPath + (std::string)ent->d_name)).c_str());  // reading a file
			if(read.is_open())
			{
				read.close();
				sequences = sequences + ent->d_name + ";";
			}
			else
				__SUP_COUT__ << "Unable to open file" << __E__;
		}
		closedir(dir);
	}
	else
	{
		__SUP_COUT__ << "Looping through MacroSequence/" + username + 
						" folder failed! Wrong directory" << __E__;
	}

	// return the list of sequences
	xmldoc.addTextElementToData("sequences", sequences);
	return;
}

//==============================================================================
void MacroMakerSupervisor::saveMacroSequence(cgicc::Cgicc& cgi,
											 const std::string& username) 
{
	// get data from the http request
	std::string name = CgiDataUtilities::postData(cgi, "sequenceName");
	std::string sequence = StringMacros::decodeURIComponent(CgiDataUtilities::postData(cgi, "sequence"));

	__SUP_COUTV__(name);
	__SUP_COUTV__(sequence);

	// append to the file
	std::string fullPath = (std::string)MACROS_SEQUENCE_PATH + username + "/" + name + ".dat";
	__SUP_COUT__ << fullPath << __E__;
	std::ofstream seqfile (fullPath.c_str(), std::ios::app);
	if (seqfile.is_open())
	{
		// seqfile << "#" << name << __E__;
		seqfile << sequence << __E__;
		seqfile.close();
	}
	else
		__SUP_COUT__ << "Unable to open " << name << ".dat" << __E__;
}

//==============================================================================
void MacroMakerSupervisor::getMacroSequence(HttpXmlDocument& xmldoc,
										   cgicc::Cgicc& cgi, 
										   const std::string& username)
{
	std::string sequenceName = CgiDataUtilities::getData(cgi, "name");

	__SUP_COUTV__(sequenceName);

	// access to the file
	std::string fullPath = (std::string)MACROS_SEQUENCE_PATH + username + "/" + sequenceName + ".dat";
	__SUP_COUT__ << fullPath << __E__;

	std::ifstream read(fullPath.c_str());	// reading the file
	char* response;
	unsigned long long fileSize;

	if (read.is_open())
	{
		read.seekg(0, std::ios::end);
		fileSize = read.tellg();
		response = new char[fileSize + 1];
		response[fileSize] = '\0';
		read.seekg(0, std::ios::beg);

		// read data as a block:
		read.read(response, fileSize);
		read.close();

		xmldoc.addTextElementToData("sequence", &response[0]);

		delete[] response;
	}
	else
	{
		__SUP_COUT__ << "Unable to open " << fullPath << "!" << __E__;
		xmldoc.addTextElementToData("error", "ERROR");
	}
}

//==============================================================================
void MacroMakerSupervisor::deleteMacroSequence(cgicc::Cgicc& cgi, 
										       const std::string& username)
{
	std::string sequenceName = CgiDataUtilities::getData(cgi, "name");

	__SUP_COUTV__(sequenceName);

	// access to the file
	std::string fullPath = (std::string)MACROS_SEQUENCE_PATH + username + "/" + sequenceName + ".dat";
	__SUP_COUT__ << fullPath << __E__;

	std::remove(fullPath.c_str());
	__SUP_COUT__ << "Successfully deleted " << fullPath;

}
//==============================================================================
void MacroMakerSupervisor::loadHistory(HttpXmlDocument&   xmldoc,
                                       const std::string& username)
{
	std::string fileName = MACROS_HIST_PATH + username + "/" + "history.hist";

	std::ifstream read(fileName.c_str());  // reading a file
	__SUP_COUT__ << fileName << __E__;

	if(read.is_open())
	{
		std::string        line;
		char*              returnStr;
		unsigned long long fileSz, i = 0, MAX_HISTORY_SIZE = 100000;

		// get length of file to reserve the string size
		//	and to cap history size
		read.seekg(0, std::ios::end);
		fileSz            = read.tellg();
		returnStr         = new char[fileSz + 1];
		returnStr[fileSz] = '\0';
		read.seekg(0, std::ios::beg);

		// read data as a block:
		read.read(returnStr, fileSz);
		read.close();

		// find i such that new string size is less than
		if(fileSz > MAX_HISTORY_SIZE)
		{
			i = fileSz - MAX_HISTORY_SIZE;
			for(; i < fileSz; ++i)
				if(returnStr[i] == '#')
				{
					i += 2;
					break;  // skip new line character also to get to next record
				}
			if(i > fileSz)
				i = fileSz;

			// write back to file truncated history
			FILE* fp = fopen(fileName.c_str(), "w");
			if(!fp)
			{
				__SS__ << "Big problem with macromaker history file: " << fileName
				       << __E__;
				__SS_THROW__;
			}
			fwrite(&returnStr[i], fileSz - i, 1, fp);
			fclose(fp);
		}

		__SUP_COUT__ << "Loading user history! " << __E__;

		if(fileSz > 1)
			returnStr[fileSz - 2] = '\0';  // remove final newline and last #

		xmldoc.addTextElementToData("returnHistStr", &returnStr[i]);

		delete[] returnStr;
	}
	else

		__SUP_COUT__ << "Unable to open history.hist" << __E__;
}
//==============================================================================
void MacroMakerSupervisor::loadFEHistory(HttpXmlDocument&   xmldoc,
                                       const std::string& username)
{
	std::string fileName = MACROS_HIST_PATH + username + "/" + "FEhistory.hist";

	std::ifstream read(fileName.c_str());
	__SUP_COUT__ << fileName << __E__;

	if (read.is_open())
	{
		std::string line;
		char* returnStr;
		unsigned long long fileSize;
		unsigned long long i = 0;
		unsigned long long MAX_HISTORY_SIZE = 100000;
		
		// get the length of the file
		read.seekg(0, std::ios::end);
		fileSize = read.tellg();
		returnStr = new char[fileSize + 1];
		returnStr[fileSize] = '\0';
		read.seekg(0, std::ios::beg);

		// read data as block
		read.read(returnStr, fileSize);
		read.close();

		// find i such that new string size is less than
		if (fileSize > MAX_HISTORY_SIZE)
		{
			i = fileSize - MAX_HISTORY_SIZE;
			for (; i < fileSize; ++i)
			{
				if (returnStr[i] == '#')	// skip the new line char
				{
					i += 2;
					break;
				}
			}
			if (i > fileSize)
				i = fileSize;

			// write back to file truncated history
			FILE* fp = fopen(fileName.c_str(), "w");
			if (!fp)
			{
				__SS__ << "Big problem with FE history file: " << fileName
				       << __E__;
				__SS_THROW__;
			}
			fwrite(&returnStr[i], fileSize - i, 1, fp);
			fclose(fp);
		}

		__SUP_COUT__ << "Loading user history! " << __E__;

		if(fileSize > 1)
			returnStr[fileSize - 2] = '\0';  // remove final newline and last #

		xmldoc.addTextElementToData("returnHistStr", &returnStr[i]);

		delete[] returnStr;
	}
	else
		__SUP_COUT__ << "Unable to open FE history.hist" << __E__;
}

//==============================================================================
void MacroMakerSupervisor::deleteMacro(HttpXmlDocument&   xmldoc,
                                       cgicc::Cgicc&      cgi,
                                       const std::string& username)
{
	std::string MacroName     = CgiDataUtilities::getData(cgi, "MacroName");
	std::string isMacroPublic = CgiDataUtilities::getData(cgi, "isPublic");

	std::string fileName = MacroName + ".dat";
	std::string fullPath;
	if(isMacroPublic == "true")
		fullPath = (std::string)MACROS_DB_PATH + "publicMacros/" + fileName;
	else
		fullPath = (std::string)MACROS_DB_PATH + username + "/" + fileName;

	__SUP_COUT__ << fullPath << __E__;

	std::remove(fullPath.c_str());
	__SUP_COUT__ << "Successfully deleted " << MacroName;
	xmldoc.addTextElementToData("deletedMacroName", MacroName);
}

//==============================================================================
void MacroMakerSupervisor::editMacro(HttpXmlDocument&   xmldoc,
                                     cgicc::Cgicc&      cgi,
                                     const std::string& username)
{
	std::string oldMacroName = CgiDataUtilities::postData(cgi, "oldMacroName");
	std::string newMacroName = CgiDataUtilities::postData(cgi, "newMacroName");
	std::string Sequence     = CgiDataUtilities::postData(cgi, "Sequence");
	std::string Time         = CgiDataUtilities::postData(cgi, "Time");
	std::string Notes =
	    StringMacros::decodeURIComponent(CgiDataUtilities::postData(cgi, "Notes"));

	std::string isMacroPublic = CgiDataUtilities::getData(cgi, "isPublic");
	std::string isMacroLSBF   = CgiDataUtilities::getData(cgi, "isLSBF");

	__SUP_COUTV__(oldMacroName);
	__SUP_COUTV__(newMacroName);
	__SUP_COUTV__(Sequence);
	__SUP_COUTV__(Notes);
	__SUP_COUTV__(Time);
	__SUP_COUTV__(isMacroPublic);
	__SUP_COUTV__(isMacroLSBF);

	__SUP_COUTV__(MACROS_DB_PATH);

	std::string fileName = oldMacroName + ".dat";
	std::string fullPath;
	if(isMacroPublic == "true")
		fullPath = (std::string)MACROS_DB_PATH + "publicMacros/" + fileName;
	else
		fullPath = (std::string)MACROS_DB_PATH + username + "/" + fileName;

	__SUP_COUTV__(fullPath);

	std::ofstream macrofile(fullPath.c_str());
	if(macrofile.is_open())
	{
		macrofile << "{\n";
		macrofile << "\"name\":\"" << newMacroName << "\",\n";
		macrofile << "\"sequence\":\"" << Sequence << "\",\n";
		macrofile << "\"time\":\"" << Time << "\",\n";
		macrofile << "\"notes\":\"" << Notes << "\",\n";
		macrofile << "\"LSBF\":\"" << isMacroLSBF << "\"\n";
		macrofile << "}@" << __E__;
		macrofile.close();
	}
	else
		__SUP_COUT__ << "Unable to open file" << __E__;

	if(oldMacroName != newMacroName)  // renaming macro
	{
		int result;
		result =
		    rename((MACROS_DB_PATH + username + "/" + oldMacroName + ".dat").c_str(),
		           (MACROS_DB_PATH + username + "/" + newMacroName + ".dat").c_str());
		if(result == 0)
			xmldoc.addTextElementToData("newMacroName", newMacroName);
		else
			xmldoc.addTextElementToData("newMacroName", "ERROR");
	}
}

//==============================================================================
void MacroMakerSupervisor::clearHistory(const std::string& username)
{
	std::string fileName = "history.hist";
	std::string fullPath = (std::string)MACROS_HIST_PATH + username + "/" + fileName;

	std::remove(fullPath.c_str());
	__SUP_COUT__ << "Successfully deleted " << fullPath;
}

//==============================================================================
void MacroMakerSupervisor::clearFEHistory(const std::string& username)
{
	std::string fileName = "FEhistory.hist";
	std::string fullPath = (std::string)MACROS_HIST_PATH + username + "/" + fileName;

	std::remove(fullPath.c_str());
	__SUP_COUT__ << "Successfully deleted " << fullPath;
}

//==============================================================================
void MacroMakerSupervisor::exportFEMacro(HttpXmlDocument&   xmldoc,
                                         cgicc::Cgicc&      cgi,
                                         const std::string& username)
{
	std::string macroName     = CgiDataUtilities::getData(cgi, "MacroName");
	std::string pluginName    = CgiDataUtilities::getData(cgi, "PluginName");
	std::string macroSequence = CgiDataUtilities::postData(cgi, "MacroSequence");
	std::string macroNotes =
	    StringMacros::decodeURIComponent(CgiDataUtilities::postData(cgi, "MacroNotes"));

	__SUP_COUTV__(pluginName);
	__SUP_COUTV__(macroName);
	__SUP_COUTV__(macroSequence);

	// replace all special characters with white space
	for(unsigned int i = 0; i < macroNotes.length(); ++i)
		if(macroNotes[i] == '\r' || macroNotes[i] == '\n')
			macroNotes[i] = ' ';
	__SUP_COUTV__(macroNotes);

	std::stringstream        ss(macroSequence);
	std::string              command;
	std::vector<std::string> commands;

	while(getline(ss, command, ','))
		commands.push_back(command);

	__SUP_COUTV__(StringMacros::vectorToString(commands));

	std::map<std::string /*special type*/, std::set<std::string> /*special file paths*/>
	    specialsCodeMap = CodeEditor::getSpecialsMap();

	//__SUP_COUTV__(StringMacros::mapToString(specialsCodeMap));
	auto specialsCodeMapIt = specialsCodeMap.find(CodeEditor::SPECIAL_TYPE_FEInterface);
	if(specialsCodeMapIt == specialsCodeMap.end())
	{
		__SS__
		    << "Could not find any FE Interface plugins in source code. Does MacroMaker "
		    << "have access to the source code? Check that the Supervisor context places "
		       "MacroMaker in a "
		    << "location with access to the source code." << __E__;
		__SS_THROW__;
	}

	// find first .h and .cc with the plugin name
	std::string headerFile      = pluginName + ".h";
	std::string sourceFile      = pluginName + "_interface.cc";
	bool        foundHeaderFile = false;
	bool        foundSourceFile = false;
	for(const auto& filePath : specialsCodeMapIt->second)
	{
		if(!foundHeaderFile && filePath.find(headerFile) != std::string::npos)
		{
			foundHeaderFile = true;
			headerFile      = filePath;
			__SUP_COUT__ << "found headerFile=" << filePath << __E__;
		}
		if(!foundSourceFile && filePath.find(sourceFile) != std::string::npos)
		{
			foundSourceFile = true;
			sourceFile      = filePath;
			__SUP_COUT__ << "found sourceFile=" << filePath << __E__;
		}

		if(foundSourceFile && foundHeaderFile)
			break;
	}  // end file search loop

	if(!foundHeaderFile)
	{
		__SS__ << "Could not find the header file for the FE Interface plugins at '"
		       << headerFile << ".' Does MacroMaker "
		       << "have access to the source code? Check that the Supervisor context "
		          "places MacroMaker in a "
		       << "location with access to the source code." << __E__;
		__SS_THROW__;
	}
	if(!foundSourceFile)
	{
		__SS__ << "Could not find the source file for the FE Interface plugins at '"
		       << sourceFile << ".' Does MacroMaker "
		       << "have access to the source code? Check that the Supervisor context "
		          "places MacroMaker in a "
		       << "location with access to the source code." << __E__;
		__SS_THROW__;
	}

	// at this point have header and source file, now add FE Macro
	// Steps for each file:
	//	- read current file
	//	- find insert point
	//	- open file for writing
	//		- write original file up to insert point
	//		- insert new code
	//		- write remaining original file

	char timeBuffer[100];
	{  // get time string
		time_t     rawtime;
		struct tm* timeinfo;

		time(&rawtime);
		timeinfo = localtime(&rawtime);

		strftime(timeBuffer, 100, "%b-%d-%Y %I:%M:%S", timeinfo);
	}

	std::string contents;
	std::string insert;

	////////////////////////////
	// handle source file modifications
	CodeEditor::readFile(CodeEditor::SOURCE_BASE_PATH, sourceFile, contents);
	//__SUP_COUTV__(contents);

	// return file locations, for the user to inspect on error
	xmldoc.addTextElementToData("sourceFile", sourceFile);
	xmldoc.addTextElementToData("headerFile", headerFile);

	// check for duplicate functions
	if(contents.find(pluginName + "::" + macroName) != std::string::npos)
	{
		__SS__ << "The function definition '" << (pluginName + "::" + macroName)
		       << "(...)' already exists in the source file '" << sourceFile
		       << ".' Duplicate functions are not allowed - please rename the macro or "
		          "modify the source file."
		       << __E__;
		__SS_THROW__;
	}

	std::stringstream     codess;
	std::set<std::string> inArgNames, outArgNames;
	createCode(codess,
	           commands,
	           "\t" /*tabOffset*/,
	           true /*forFeMacro*/,
	           &inArgNames,
	           &outArgNames);
	__SUP_COUTV__(StringMacros::setToString(inArgNames));
	__SUP_COUTV__(StringMacros::setToString(outArgNames));

	// find start of constructor and register macro
	{
		auto insertPos = contents.find(pluginName + "::" + pluginName);
		if(insertPos == std::string::npos)
		{
			__SS__ << "Could not find the code insert position in the source file '"
			       << sourceFile << ".' The FE plugin class constructor must be '"
			       << pluginName << ":" << pluginName << "' - is this the case?" << __E__;
			__SS_THROW__;
		}
		__SUP_COUTV__(insertPos);
		// find opening bracket after constructor name
		insertPos = contents.find("{", insertPos);
		if(insertPos == std::string::npos)
		{
			__SS__ << "Could not find the code insert position in the source file '"
			       << sourceFile
			       << ".' The FE plugin class constructor must begin with '{"
			       << "' - is this the case?" << __E__;
			__SS_THROW__;
		}
		++insertPos;  // go past {
		__SUP_COUTV__(insertPos);

		insert = "\n\t//registration of FEMacro '" + macroName + "' generated, " +
		         timeBuffer + ", by '" + username + "' using MacroMaker.\n\t" +
		         "FEVInterface::registerFEMacroFunction(\"" + macroName +
		         "\",//feMacroName \n\t\t" +
		         "static_cast<FEVInterface::frontEndMacroFunction_t>(&" + pluginName +
		         "::" + macroName + "), //feMacroFunction \n\t\t" +
		         "std::vector<std::string>{";
		{  // insert input argument names
			bool first = true;
			for(const auto& inArg : inArgNames)
			{
				if(first)
					first = false;
				else
					insert += ",";
				insert += "\"" + inArg + "\"";
			}
		}
		insert += "}, //namesOfInputArgs \n\t\t";
		insert += "std::vector<std::string>{";
		{  // insert output argument names
			bool first = true;
			for(const auto& outArg : outArgNames)
			{
				if(first)
					first = false;
				else
					insert += ",";
				insert += "\"" + outArg + "\"";
			}
		}
		insert += "}, //namesOfOutputArgs \n\t\t";
		insert += "1); //requiredUserPermissions \n\n";

		__SUP_COUTV__(insert);
		contents = contents.substr(0, insertPos) + insert + contents.substr(insertPos);
	}

	// find end of source to append FE Macro function
	{
		auto insertPos = contents.rfind("DEFINE_OTS_INTERFACE");
		if(insertPos == std::string::npos)
		{
			__SS__ << "Could not find the code insert position in the source file '"
			       << sourceFile
			       << ".' The FE plugin class must end with a 'DEFINE_OTS_INTERFACE("
			       << pluginName << ")' - is this the case?" << __E__;
			__SS_THROW__;
		}
		__SUP_COUTV__(insertPos);

		insert =
		    "\n//"
		    "============================================================================"
		    "============================================\n//" +
		    macroName + "\n" + "//\tFEMacro '" + macroName + "' generated, " +
		    timeBuffer + ", by '" + username + "' using MacroMaker.\n" +
		    "//\tMacro Notes: " + macroNotes + "\n" + "void " + pluginName +
		    "::" + macroName + "(__ARGS__)\n{\n\t" +
		    "__CFG_COUT__ << \"# of input args = \" << argsIn.size() << __E__; \n\t" +
		    "__CFG_COUT__ << \"# of output args = \" << argsOut.size() << __E__; \n\t" +
		    "for(auto &argIn:argsIn) \n\t\t" +
		    "__CFG_COUT__ << argIn.first << \": \" << argIn.second << __E__; \n\n\t" +
		    "//macro commands section \n" + codess.str() + "\n\n\t" +
		    "for(auto &argOut:argsOut) \n\t\t" +
		    "__CFG_COUT__ << argOut.first << \": \" << argOut.second << __E__; \n\n" +
		    "} //end " + macroName + "()\n\n";

		//__SUP_COUTV__(insert);
		CodeEditor::writeFile(CodeEditor::SOURCE_BASE_PATH,
		                      sourceFile,
		                      contents,
		                      "MacroMaker-" + username,
		                      insertPos,
		                      insert);
	}

	////////////////////////////
	// handle include file insertions
	CodeEditor::readFile(CodeEditor::SOURCE_BASE_PATH, headerFile, contents);
	//__SUP_COUTV__(contents);

	// find end of class by looking for last };
	{
		auto insertPos = contents.rfind("};");
		if(insertPos == std::string::npos)
		{
			__SS__ << "Could not find the code insert position in the header file '"
			       << headerFile
			       << ".' The FE plugin class must end with a '};' - is this the case?"
			       << __E__;
			__SS_THROW__;
		}

		__SUP_COUTV__(insertPos);

		insert = "\npublic: // FEMacro '" + macroName + "' generated, " + timeBuffer +
		         ", by '" + username + "' using MacroMaker.\n\t" + "void " + macroName +
		         "\t(__ARGS__);\n";

		__SUP_COUTV__(insert);
		CodeEditor::writeFile(CodeEditor::SOURCE_BASE_PATH,
		                      headerFile,
		                      contents,
		                      "MacroMaker-" + username,
		                      insertPos,
		                      insert);
	}

}  // end exportFEMacro ()

//==============================================================================
void MacroMakerSupervisor::exportMacro(HttpXmlDocument&   xmldoc,
                                       cgicc::Cgicc&      cgi,
                                       const std::string& username)
{
	std::string macroName     = CgiDataUtilities::getData(cgi, "MacroName");
	std::string macroSequence = CgiDataUtilities::postData(cgi, "MacroSequence");
	std::string macroNotes =
	    StringMacros::decodeURIComponent(CgiDataUtilities::postData(cgi, "MacroNotes"));

	__SUP_COUTV__(macroName);
	__SUP_COUTV__(macroSequence);

	// replace all special characters with white space
	for(unsigned int i = 0; i < macroNotes.length(); ++i)
		if(macroNotes[i] == '\r' || macroNotes[i] == '\n')
			macroNotes[i] = ' ';
	__SUP_COUTV__(macroNotes);

	std::stringstream        ss(macroSequence);
	std::string              command;
	std::vector<std::string> commands;

	while(getline(ss, command, ','))
		commands.push_back(command);

	std::string fileName = macroName + ".cc";

	std::string fullPath =
	    __ENV__("SERVICE_DATA_PATH") + MACROS_EXPORT_PATH + username + "/" + fileName;
	__SUP_COUT__ << fullPath << __E__;
	std::ofstream exportFile(fullPath.c_str(), std::ios::trunc);
	if(exportFile.is_open())
	{
		exportFile << "//Generated Macro Name:\t" << macroName << "\n";
		exportFile << "//Macro Notes: " << macroNotes << "\n";

		{
			time_t     rawtime;
			struct tm* timeinfo;
			char       buffer[100];

			time(&rawtime);
			timeinfo = localtime(&rawtime);

			strftime(buffer, 100, "%b-%d-%Y %I:%M:%S", timeinfo);
			exportFile << "//Generated Time: \t\t" << buffer << "\n";
		}

		exportFile << "//Paste this whole file into an interface to transfer Macro "
		              "functionality.\n";

		createCode(exportFile, commands);

		exportFile.close();

		xmldoc.addTextElementToData(
		    "ExportFile",
		    "$USER_DATA/ServiceData/" + MACROS_EXPORT_PATH + username + "/" + fileName);
	}
	else
		__SUP_COUT__ << "Unable to open file" << __E__;
}  // end exportMacro()

//==============================================================================
// createCode
void MacroMakerSupervisor::createCode(std::ostream&                   out,
                                      const std::vector<std::string>& commands,
                                      const std::string&              tabOffset,
                                      bool                            forFeMacro,
                                      std::set<std::string>*          inArgNames,
                                      std::set<std::string>*          outArgNames)
{
	// int                                 numOfHexBytes;
	std::set<std::string /*argInName*/> argInHasBeenInitializedSet;
	bool                                addressIsVariable, dataIsVariable;

	out << tabOffset << "{";

	out << "\n"
	    << tabOffset << "\t"
	    << "char *address \t= new char[universalAddressSize_]{0};	//create address "
	       "buffer of interface size and init to all 0";
	out << "\n"
	    << tabOffset << "\t"
	    << "char *data \t\t= new char[universalDataSize_]{0};		//create data buffer "
	       "of interface size and init to all 0";

	out << "\n"
	    << tabOffset << "\t"
	    << "uint64_t macroAddress;		//create macro address buffer (size 8 bytes)";
	out << "\n"
	    << tabOffset << "\t"
	    << "uint64_t macroData;			//create macro address buffer (size 8 bytes)";

	out << "\n"
	    << tabOffset << "\t"
	    << "std::map<std::string /*arg name*/,uint64_t /*arg val*/> macroArgs; //create "
	       "map from arg name to 64-bit number";

	// loop through each macro command
	for(unsigned int i = 0; i < commands.size(); i++)
	{
		std::stringstream sst(commands[i]);
		std::string       tokens;
		std::vector<std::string>
		    oneCommand;  // 4 fields: cmd index | cmd type | addr | data
		while(getline(sst, tokens, ':'))
			oneCommand.push_back(tokens);
		while(oneCommand.size() < 4)
			oneCommand.push_back("");  // fill out the 4 fields

		__SUP_COUTV__(StringMacros::vectorToString(oneCommand));

		// make this:
		//			std::map<std::string,uint64_t> macroArgs;
		//			{
		//				uint64_t address = 0x1001;	//create address buffer
		//				uint64_t data = 0x100203; 	//create data buffer
		//
		//				universalWrite(address,data);
		//				universalRead(address,data);
		//			}
		//
		//			//if variable, first time init
		//			{
		//				address =
		// theXDAQContextConfigTree_.getNode(theConfigurationPath_).getNode("variableName").getValue<uint64_t>();
		//				or
		//				address = __GET_ARG_IN__("variableName",uint64_t);
		//			}
		//
		//			//if variable, second time use macroArgs
		//			{
		//				address = macroArgs["variableName"];
		//				data = macroArgs["variableName"];
		//			}

		addressIsVariable = isArgumentVariable(oneCommand[2]);
		dataIsVariable    = isArgumentVariable(oneCommand[3]);

		__SUP_COUTV__(addressIsVariable);
		__SUP_COUTV__(dataIsVariable);

		out << "\n\n" << tabOffset << "\t// command-#" << i << ": ";

		if(oneCommand[1][0] == 'w' || oneCommand[1][0] == 'r')
		{
			if(oneCommand[1][0] == 'w')
				out << "Write(";
			else if(oneCommand[1][0] == 'r')
				out << "Read(";

			if(addressIsVariable)
				out << oneCommand[2];
			else  // literal hex address
				out << "0x" << oneCommand[2];
			out << " /*address*/,";

			if(dataIsVariable)  // read or write can have variable data, sink or source
			                    // respectively
				out << oneCommand[3] << " /*data*/";
			else if(oneCommand[1][0] == 'w')  // literal hex data
				out << "0x" << oneCommand[3] << " /*data*/";
			else if(oneCommand[1][0] == 'r')  // just reading to buffer
				out << "data";
			out << ");\n";
		}
		else if(oneCommand[1][0] == 'd')
		{
			out << "delay(" << oneCommand[2] << ");\n";
			out << tabOffset << "\t"
			    << "__CFG_COUT__ << \"Sleeping for... \" << " << oneCommand[2]
			    << " << \" milliseconds \" << __E__;\n";
			out << tabOffset << "\t"
			    << "usleep(" << oneCommand[2] << "*1000 /* microseconds */);\n";
			continue;
		}
		else
		{
			__SS__ << "FATAL ERROR: Unknown command '" << oneCommand[1]
			       << "'... command is not w, r or d" << __E__;
			__SS_THROW__;
		}

		//////////
		// handle address
		if(addressIsVariable)  // handle address as variable
		{
			if(argInHasBeenInitializedSet.find(oneCommand[2]) ==
			   argInHasBeenInitializedSet.end())  // only initialize input argument once
			{
				argInHasBeenInitializedSet.emplace(oneCommand[2]);

				if(!forFeMacro)
				{
					// get address from configuration Tree
					out << tabOffset << "\t"
					    << "macroArgs[\"" << oneCommand[2]
					    << "\"] = "
					       "theXDAQContextConfigTree_.getNode(theConfigurationPath_)."
					       "getNode("
					    << "\n"
					    << tabOffset << "\t\t\"" << oneCommand[2]
					    << "\").getValue<uint64_t>();";
				}
				else
				{
					if(inArgNames)
						inArgNames->emplace(oneCommand[2]);

					// get address from arguments
					out << tabOffset << "\t"
					    << "macroArgs[\"" << oneCommand[2] << "\"] = __GET_ARG_IN__(\""
					    << oneCommand[2] << "\", uint64_t);";
				}
			}
			out << "\t//get macro address argument";
			out << "\n"
			    << tabOffset << "\tmemcpy(address,&macroArgs[\"" << oneCommand[2]
			    << "\"],8); //copy macro address argument to buffer";
		}
		else  // handle address as literal
		{
			out << tabOffset << "\t"
			    << "macroAddress = 0x" << oneCommand[2]
			    << "; memcpy(address,&macroAddress,8);"
			    << "\t//copy macro address to buffer";
		}

		//////////
		// handle data
		if(oneCommand[1] == "w")  // if write, handle data too
		{
			if(dataIsVariable)  // handle data as variable
			{
				if(argInHasBeenInitializedSet.find(oneCommand[3]) ==
				   argInHasBeenInitializedSet
				       .end())  // only initialize input argument once
				{
					argInHasBeenInitializedSet.emplace(oneCommand[3]);

					if(forFeMacro)
					{
						if(inArgNames)
							inArgNames->emplace(oneCommand[3]);

						// get data from arguments
						out << "\n"
						    << tabOffset << "\t"
						    << "macroArgs[\"" << oneCommand[3]
						    << "\"] = __GET_ARG_IN__(\"" << oneCommand[3]
						    << "\", uint64_t); //initialize from input arguments";
					}
					else
					{
						// get data from configuration Tree
						out << "\n"
						    << tabOffset << "\t"
						    << "macroArgs[\"" << oneCommand[3]
						    << "\"] = "
						       "theXDAQContextConfigTree_.getNode(theConfigurationPath_)."
						       "getNode("
						    << "\n"
						    << tabOffset << "\t\t\"" << oneCommand[3]
						    << "\").getValue<uint64_t>(); //initialize from "
						       "configuration tree";
					}
				}
				out << "\t//get macro data argument";
				out << "\n"
				    << tabOffset << "\tmemcpy(data,&macroArgs[\"" << oneCommand[3]
				    << "\"],8); //copy macro data argument to buffer";
			}
			else  // handle data as literal
			{
				out << "\n"
				    << tabOffset << "\t"
				    << "macroData = 0x" << oneCommand[3] << "; memcpy(data,&macroData,8);"
				    << "\t//copy macro data to buffer";
			}
			out << "\n"
			    << tabOffset << "\t"
			    << "universalWrite(address,data);";
		}
		else
		{
			out << "\n"
			    << tabOffset << "\t"
			    << "universalRead(address,data);";

			std::string outputArgName;

			if(dataIsVariable)  // handle data as variable
				outputArgName = oneCommand[3];
			else  // give each read data a unique argument name
			{
				char str[20];
				sprintf(str, "outArg%d", i);
				outputArgName = str;  // use command index for uniqueness
			}
			__SUP_COUTV__(outputArgName);

			out << tabOffset << "\t"
			    << "memcpy(&macroArgs[\"" << outputArgName
			    << "\"],data,8); //copy buffer to argument map";

			// copy read data to output args
			if(forFeMacro)
				out << "\n"
				    << tabOffset << "\t"
				    << "__SET_ARG_OUT__(\"" << outputArgName << "\",macroArgs[\""
				    << outputArgName << "\"]); //update output argument result";

			if(outArgNames)
				outArgNames->emplace(outputArgName);
			argInHasBeenInitializedSet.emplace(
			    outputArgName);  // mark initialized since value has been read
		}
	}  // end command loop

	out << "\n\n" << tabOffset << "\tdelete[] address; //free the memory";
	out << "\n" << tabOffset << "\tdelete[] data; //free the memory";
	out << "\n" << tabOffset << "}";

	__SUP_COUT__ << "Done with code generation." << __E__;
}  // end createCode()

//==============================================================================
// isArgumentVariable
//	returns true if string should be interpreted as a variable for MacroMaker
bool MacroMakerSupervisor::isArgumentVariable(const std::string& argumentString)
{
	for(unsigned int i = 0; i < argumentString.length(); ++i)
	{
		// detect non-hex
		if(!((argumentString[i] >= '0' && argumentString[i] <= '9') ||
		     (argumentString[i] >= 'a' && argumentString[i] <= 'f') ||
		     (argumentString[i] >= 'A' && argumentString[i] <= 'F')))
			return true;
	}
	return false;
}  // end isArgumentVariable()
//==============================================================================
// generateHexArray
//	returns a char array initializer
//	something like this
//	"[8] = {0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x09};"
//		..depending a size of source string
//
// FIXME -- identify variables in a better way from macromaker...!
//	for now just assume a non hex is a variable name
//	return -1 size
std::string MacroMakerSupervisor::generateHexArray(const std::string& sourceHexString,
                                                   int&               numOfBytes)
{
	std::stringstream retSs;

	std::string srcHexStr = sourceHexString;
	__SUP_COUT__ << "Translating: \n";
	__SUP_COUT__ << srcHexStr << __E__;

	if(srcHexStr.size() % 2)  // if odd, make even
		srcHexStr = "0" + srcHexStr;

	numOfBytes = srcHexStr.size() / 2;
	retSs << "[" << numOfBytes << "] = {";

	for(int i = 0; i < numOfBytes * 2; i += 2)
	{
		// detect non-hex
		if(!((srcHexStr[i] >= '0' && srcHexStr[i] <= '9') ||
		     (srcHexStr[i] >= 'a' && srcHexStr[i] <= 'f') ||
		     (srcHexStr[i] >= 'A' && srcHexStr[i] <= 'F')) ||
		   !((srcHexStr[i + 1] >= '0' && srcHexStr[i + 1] <= '9') ||
		     (srcHexStr[i + 1] >= 'a' && srcHexStr[i + 1] <= 'f') ||
		     (srcHexStr[i + 1] >= 'A' && srcHexStr[i + 1] <= 'F')))
		{
			numOfBytes = -1;
			return srcHexStr;
		}

		if(i != 0)
			retSs << ", ";
		retSs << "0x" << srcHexStr[srcHexStr.size() - 1 - i - 1]
		      << srcHexStr[srcHexStr.size() - 1 - i];
	}
	retSs << "};";

	__SUP_COUT__ << retSs.str() << __E__;

	return retSs.str();
}
//==============================================================================
void MacroMakerSupervisor::runFEMacroSequence(HttpXmlDocument& xmldoc,
											  cgicc::Cgicc& cgi,
											  const std::string& username)
{
	std::string sequenceName = CgiDataUtilities::getData(cgi, "name");

	__SUP_COUTV__(sequenceName);

	// access to the file
	std::string fullPath = (std::string)MACROS_SEQUENCE_PATH + username + "/" + sequenceName + ".dat";
	__SUP_COUT__ << fullPath << __E__;

	// read from the file
	std::ifstream read(fullPath.c_str());	// reading the file
	std::string sequence;

	if (read.is_open())
	{
		char* seqFile;
		unsigned long long fileSize;
		read.seekg(0, std::ios::end);
		fileSize = read.tellg();
		seqFile = new char[fileSize + 1];
		seqFile[fileSize] = '\0';
		read.seekg(0, std::ios::beg);

		// read data as a block:
		read.read(seqFile, fileSize);
		read.close();

		sequence = StringMacros::decodeURIComponent(seqFile);
		delete[] seqFile;
	}
	else
	{
		__SUP_SS__ << "Unable to read the file " << sequenceName << "!" << __E__;
		__SUP_SS_THROW__;
	}

	// TODO: decode list
	std::map<std::string, std::string> sequenceMap;
	StringMacros::getMapFromString(
	    sequence,
	    sequenceMap,
	    std::set<char>({','}) /*pair delimiters*/,
	    std::set<char>({':'}) /*name/value delimiters*/);

	__SUP_COUTV__(sequenceName);

	//TODO: iterate over the list and exe macros

	// TODO: send backe the results
	xmldoc.addTextElementToData("result", "OK");
}
//==============================================================================
void MacroMakerSupervisor::runFEMacro(HttpXmlDocument&                 xmldoc,
                                      cgicc::Cgicc&                    cgi,
                                      const WebUsers::RequestUserInfo& userInfo)
try
{
	__SUP_COUT__ << __E__;

	// unsigned int feSupervisorID = CgiDataUtilities::getDataAsInt(cgi,
	// "feSupervisorID");
	std::string feClassSelected = CgiDataUtilities::getData(cgi, "feClassSelected");
	std::string feUIDSelected =
	    CgiDataUtilities::getData(cgi, "feUIDSelected");  // allow CSV multi-selection
	std::string macroType = CgiDataUtilities::getData(cgi, "macroType");
	std::string macroName =
	    StringMacros::decodeURIComponent(CgiDataUtilities::getData(cgi, "macroName"));
	std::string inputArgs   = CgiDataUtilities::postData(cgi, "inputArgs");
	std::string outputArgs  = CgiDataUtilities::postData(cgi, "outputArgs");
	bool        saveOutputs = CgiDataUtilities::getDataAsInt(cgi, "saveOutputs") == 1;

	//__SUP_COUTV__(feSupervisorID);
	__SUP_COUTV__(feClassSelected);
	__SUP_COUTV__(feUIDSelected);
	__SUP_COUTV__(macroType);
	__SUP_COUTV__(macroName);
	__SUP_COUTV__(inputArgs);
	__SUP_COUTV__(outputArgs);
	__SUP_COUTV__(saveOutputs);

	appendCommandToHistory(feClassSelected, 
						   feUIDSelected,
						   macroType,
						   macroName,
						   inputArgs,
						   outputArgs,
						   saveOutputs,
						   userInfo.username_);

	std::set<std::string /*feUID*/> feUIDs;

	if(feUIDSelected == "")
		feUIDSelected = "*";  // treat empty as all
	if(feClassSelected == "")
		feClassSelected = "*";  // treat empty as all

	if(feClassSelected == "" || feUIDSelected == "" || macroType == "" || macroName == "")
	{
		__SUP_SS__ << "Illegal empty front-end parameter." << __E__;
		__SUP_SS_THROW__;
	}
	else if(feUIDSelected != "*")
	{
		StringMacros::getSetFromString(feUIDSelected, feUIDs);
	}
	else  // * all case
	{
		// add all FEs for type
		if(feClassSelected == "*")
		{
			for(auto& feTypePair : FEPluginTypetoFEsMap_)
				for(auto& feUID : feTypePair.second)
					feUIDs.emplace(feUID);
		}
		else
		{
			auto typeIt = FEPluginTypetoFEsMap_.find(feClassSelected);
			if(typeIt == FEPluginTypetoFEsMap_.end())
			{
				__SUP_SS__ << "Illegal front-end type parameter '" << feClassSelected
				           << "' not in list of types." << __E__;
				__SUP_SS_THROW__;
			}

			for(auto& feUID : typeIt->second)
				feUIDs.emplace(feUID);
		}
	}

	__SUP_COUTV__(StringMacros::setToString(feUIDs));

	std::string macroString;
	if(macroType == "public")
		loadMacro(macroName, macroString);
	else if(macroType == "private")
		loadMacro(macroName, macroString, userInfo.username_);

	__SUP_COUTV__(macroString);

	FILE* fp = 0;
	try
	{
		if(saveOutputs)
		{
			std::string filename = "/macroOutput_" + std::to_string(time(0)) + "_" +
			                       std::to_string(clock()) + ".txt";

			__SUP_COUTV__(filename);
			fp = fopen((CodeEditor::OTSDAQ_DATA_PATH + filename).c_str(), "w");
			if(!fp)
			{
				__SUP_SS__ << "Failed to open file to save macro output '"
				           << CodeEditor::OTSDAQ_DATA_PATH << filename << "'..." << __E__;
				__SUP_SS_THROW__;
			}

			fprintf(fp, "############################\n");
			fprintf(fp,
			        "### Running '%s' at time %s\n",
			        macroName.c_str(),
			        StringMacros::getTimestampString().c_str());
			fprintf(fp,
			        "### \t Target front-ends (count=%lu): %s\n",
			        feUIDs.size(),
			        StringMacros::setToString(feUIDs).c_str());
			fprintf(fp, "### \t\t Inputs: %s\n", inputArgs.c_str());
			fprintf(fp, "############################\n\n\n");

			xmldoc.addTextElementToData("feMacroRunArgs_name", "Filename");
			xmldoc.addTextElementToData("feMacroRunArgs_value",
			                            "$OTSDAQ_DATA/" + filename);
		}

		// do for all target front-ends
		for(auto& feUID : feUIDs)
		{
			auto feIt = FEtoSupervisorMap_.find(feUID);
			if(feIt == FEtoSupervisorMap_.end())
			{
				__SUP_SS__ << "Destination front end interface ID '" << feUID
				           << "' was not found in the list of front ends." << __E__;
				ss << "\n\nHere is the map:\n\n"
				   << StringMacros::mapToString(FEtoSupervisorMap_) << __E__;
				__SUP_SS_THROW__;
			}

			unsigned int FESupervisorIndex = feIt->second;
			__SUP_COUT__ << "Found supervisor index: " << FESupervisorIndex << __E__;

			SupervisorInfoMap::iterator it = allFESupervisorInfo_.find(FESupervisorIndex);
			if(it == allFESupervisorInfo_.end())
			{
				__SUP_SS__
				    << "Error transmitting request to FE Supervisor '" << feUID << ":"
				    << FESupervisorIndex << ".' \n\n"
				    << "The FE Supervisor Index does not exist. Have you configured "
				       "the state machine properly?"
				    << __E__;
				__SUP_SS_THROW__;
			}

			// send command to chosen FE and await response
			SOAPParameters txParameters;  // params for xoap to send
			if(macroType == "fe")
				txParameters.addParameter("Request", "RunInterfaceMacro");
			else
				txParameters.addParameter("Request", "RunMacroMakerMacro");
			txParameters.addParameter("InterfaceID", feUID);
			if(macroType == "fe")
				txParameters.addParameter("feMacroName", macroName);
			else
			{
				txParameters.addParameter("macroName", macroName);
				txParameters.addParameter("macroString", macroString);
			}
			txParameters.addParameter("inputArgs", inputArgs);
			txParameters.addParameter("outputArgs", outputArgs);
			txParameters.addParameter(
			    "userPermissions",
			    StringMacros::mapToString(userInfo.getGroupPermissionLevels()));

			SOAPParameters rxParameters;  // params for xoap to recv
			// rxParameters.addParameter("success");
			rxParameters.addParameter("outputArgs");
			rxParameters.addParameter("Error");

			if(saveOutputs)
			{
				fprintf(fp,
				        "Running '%s' at time %s\n",
				        macroName.c_str(),
				        StringMacros::getTimestampString().c_str());
				fprintf(fp,
				        "\t Target front-end: '%s::%s'\n",
				        FEtoPluginTypeMap_[feUID].c_str(),
				        feUID.c_str());
				fprintf(fp,
				        "\t\t Inputs: %s\n",
				        StringMacros::decodeURIComponent(inputArgs).c_str());
			}

			// have FE supervisor descriptor, so send
			xoap::MessageReference retMsg = SOAPMessenger::sendWithSOAPReply(
			    it->second.getDescriptor(),  // supervisor descriptor
			    "MacroMakerSupervisorRequest",
			    txParameters);

			__SUP_COUT__ << "Received response message: "
			             << SOAPUtilities::translate(retMsg) << __E__;

			SOAPUtilities::receive(retMsg, rxParameters);

			__SUP_COUT__ << "Received it " << __E__;

			// bool success = rxParameters.getValue("success") == "1";
			std::string outputResults = rxParameters.getValue("outputArgs");
			std::string error         = rxParameters.getValue("Error");

			//__SUP_COUT__ << "rx success = " << success << __E__;
			__SUP_COUT__ << "outputArgs = " << outputResults << __E__;

			if(error != "")
			{
				__SS__ << "Attempted FE Macro Failed. Attempted target "
				       << "was UID=" << feUID
				       << " at feSupervisorID=" << FESupervisorIndex << "." << __E__;
				ss << "\n\n The error was:\n\n" << error << __E__;
				__SUP_COUT_ERR__ << "\n" << ss.str();
				xmldoc.addTextElementToData("Error", ss.str());

				return;
			}

			// build output arguments
			//	parse args, colon-separated pairs, and then comma-separated
			{
				DOMElement* feMacroExecParent =
				    xmldoc.addTextElementToData("feMacroExec", macroName);

				xmldoc.addTextElementToParent(
				    "exec_time", StringMacros::getTimestampString(), feMacroExecParent);
				xmldoc.addTextElementToParent("fe_uid", feUID, feMacroExecParent);
				xmldoc.addTextElementToParent(
				    "fe_type", FEtoPluginTypeMap_[feUID], feMacroExecParent);
				xmldoc.addTextElementToParent(
				    "fe_context", it->second.getContextName(), feMacroExecParent);
				xmldoc.addTextElementToParent(
				    "fe_supervisor", it->second.getName(), feMacroExecParent);
				xmldoc.addTextElementToParent(
				    "fe_hostname", it->second.getHostname(), feMacroExecParent);

				std::istringstream inputStream(outputResults);
				std::string        splitVal, argName, argValue;
				while(getline(inputStream, splitVal, ';'))
				{
					std::istringstream pairInputStream(splitVal);
					getline(pairInputStream, argName, ',');
					getline(pairInputStream, argValue, ',');

					if(saveOutputs)
					{
						fprintf(fp,
						        "\t\t Output '%s' = %s\n",
						        argName.c_str(),
						        StringMacros::decodeURIComponent(argValue).c_str());
					}
					else
					{
						xmldoc.addTextElementToParent(
						    "outputArgs_name", argName, feMacroExecParent);
						xmldoc.addTextElementToParent(
						    "outputArgs_value", argValue, feMacroExecParent);
					}
					__SUP_COUT__ << argName << ": " << argValue << __E__;
				}
			}
		}  // end target front-end loop
	}
	catch(...)  // handle file close on error
	{
		if(fp)
			fclose(fp);
		throw;
	}

	if(fp)
		fclose(fp);

}  // end runFEMacro()
catch(const std::runtime_error& e)
{
	__SUP_SS__ << "Error processing FE communication request: " << e.what() << __E__;
	__SUP_COUT_ERR__ << ss.str();
	xmldoc.addTextElementToData("Error", ss.str());
}
catch(...)
{
	__SUP_SS__ << "Unknown error processing FE communication request." << __E__;
	__SUP_COUT_ERR__ << ss.str();

	xmldoc.addTextElementToData("Error", ss.str());
}  // end runFEMacro() catch

//==============================================================================
void MacroMakerSupervisor::getFEMacroList(HttpXmlDocument&   xmldoc,
                                          const std::string& username)
{
	__SUP_COUT__ << "Getting FE Macro list" << __E__;

	SOAPParameters txParameters;  // params for xoap to send
	txParameters.addParameter("Request", "GetInterfaceMacros");

	SOAPParameters rxParameters;  // params for xoap to recv
	rxParameters.addParameter("FEMacros");

	std::string oneInterface;
	std::string rxFEMacros;

	// for each list of FE Supervisors,
	//			get all FE specific macros
	for(auto& appInfo : allFESupervisorInfo_)
	{
		__SUP_COUT__ << "FESupervisor LID = " << appInfo.second.getId()
		             << " name = " << appInfo.second.getName() << __E__;

		xoap::MessageReference retMsg = SOAPMessenger::sendWithSOAPReply(
		    appInfo.second.getDescriptor(), "MacroMakerSupervisorRequest", txParameters);
		SOAPUtilities::receive(retMsg, rxParameters);

		rxFEMacros = rxParameters.getValue("FEMacros");

		__SUP_COUT__ << "FE Macros received: \n" << rxFEMacros << __E__;

		std::istringstream allInterfaces(rxFEMacros);
		while(std::getline(allInterfaces, oneInterface))
		{
			//__SUP_COUT__ << oneInterface << __E__;
			//__SUP_COUT__ << appInfo.second.getId() << __E__;
			xmldoc.addTextElementToData("FEMacros", oneInterface);
			// xmldoc.outputXmlDocument(0,true);
		}
	}

	// add macros to response
	std::pair<std::vector<std::string> /*public macros*/,
	          std::vector<std::string> /*private macros*/>
	    macroNames;
	loadMacroNames(username, macroNames);

	__SUP_COUT__ << "Public macro count: " << macroNames.first.size() << __E__;
	__SUP_COUT__ << "Private macro count: " << macroNames.second.size() << __E__;

	std::string macroString;
	// make xml ':' separated fields:
	//	macro name
	//	permissions string
	//	number of inputs
	//	inputs separated by :
	//	number of outputs
	//	outputs separated by :

	for(int i = 0; i < 2; ++i)  // first is public, then private
		for(auto& macroName : (i ? macroNames.second : macroNames.first))
		{
			// get macro string
			loadMacro(macroName, macroString, username);

			// extract macro object
			FEVInterface::macroStruct_t macro(macroString);

			std::stringstream xmlMacroStream;
			xmlMacroStream << macro.macroName_;
			xmlMacroStream << ":"
			               << "1";  // permissions string
			xmlMacroStream << ":" << macro.namesOfInputArguments_.size();
			for(auto& inputArg : macro.namesOfInputArguments_)
				xmlMacroStream << ":" << inputArg;
			xmlMacroStream << ":" << macro.namesOfOutputArguments_.size();
			for(auto& inputArg : macro.namesOfOutputArguments_)
				xmlMacroStream << ":" << inputArg;

			xmldoc.addTextElementToData(i ? "PrivateMacro" : "PublicMacro",
			                            xmlMacroStream.str());
		}

	return;
}
