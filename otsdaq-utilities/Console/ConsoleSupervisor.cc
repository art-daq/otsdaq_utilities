#include "otsdaq-utilities/Console/ConsoleSupervisor.h"
#include <xdaq/NamespaceURI.h>
#include "otsdaq/CgiDataUtilities/CgiDataUtilities.h"
#include "otsdaq/Macros/CoutMacros.h"
#include "otsdaq/MessageFacility/MessageFacility.h"
#include "otsdaq/NetworkUtilities/ReceiverSocket.h"
#include "otsdaq/XmlUtilities/HttpXmlDocument.h"
#include "otsdaq/Macros/StringMacros.h"

#include <dirent.h>    //for DIR
#include <sys/stat.h>  //for mkdir
#include <fstream>
#include <iostream>
#include <string>
#include <thread>  //for std::thread

using namespace ots;

// UDP Message Format:
// UDPMESSAGE|TIMESTAMP|SEQNUM|HOSTNAME|HOSTADDR|SEVERITY|CATEGORY |APPLICATION|PID|ITERATION|MODULE|(FILE|LINE)|MESSAGE
// FILE and LINE are only printed for s67+

XDAQ_INSTANTIATOR_IMPL(ConsoleSupervisor)

#define USER_CONSOLE_PREF_PATH \
	std::string(__ENV__("SERVICE_DATA_PATH")) + "/ConsolePreferences/"
#define USER_CONSOLE_SNAPSHOT_PATH \
	std::string(__ENV__("SERVICE_DATA_PATH")) + "/ConsoleSnapshots/"
#define USERS_PREFERENCES_FILETYPE "pref"
#define USERS_TRIGGER_STRING_FILETYPE "triggers"
#define QUIET_CFG_FILE                    \
	std::string(__ENV__("USER_DATA")) +   \
	    "/MessageFacilityConfigurations/" \
	    "QuietForwarder.cfg"

#define CONSOLE_SPECIAL_ERROR                                                            \
	std::string("|30-Aug-2019 15:30:17 CDT|0|||Error|Console||-1||ConsoleSupervisor|") + \
	    std::string(__FILE__) + std::string("|") + std::to_string(__LINE__) +            \
	    std::string("|")
#define CONSOLE_SPECIAL_WARNING                                                    \
	std::string(                                                                   \
	    "|30-Aug-2019 15:30:17 CDT|0|||Warning|Console||-1||ConsoleSupervisor|") + \
	    std::string(__FILE__) + std::string("|") + std::to_string(__LINE__) +      \
	    std::string("|")

#undef __MF_SUBJECT__
#define __MF_SUBJECT__ "Console"

//==============================================================================
ConsoleSupervisor::ConsoleSupervisor(xdaq::ApplicationStub* stub)
    : CoreSupervisorBase(stub)
    , messageCount_(0)
    , maxMessageCount_(100000)
    , maxClientMessageRequest_(500)
{
	__SUP_COUT__ << "Constructor started." << __E__;

	INIT_MF("." /*directory used is USER_DATA/LOG/.*/);

	// attempt to make directory structure (just in case)
	mkdir(((std::string)USER_CONSOLE_PREF_PATH).c_str(), 0755);
	mkdir(((std::string)USER_CONSOLE_SNAPSHOT_PATH).c_str(), 0755);

	init();

	__SUP_COUT__ << "Constructor complete." << __E__;

}  // end constructor()

//==============================================================================
ConsoleSupervisor::~ConsoleSupervisor(void) { destroy(); }
//==============================================================================
void ConsoleSupervisor::init(void)
{
	// start mf msg listener
	std::thread(
	    [](ConsoleSupervisor* cs) {
		    ConsoleSupervisor::messageFacilityReceiverWorkLoop(cs);
	    },
	    this)
	    .detach();
}  // end init()

//==============================================================================
void ConsoleSupervisor::destroy(void)
{
	// called by destructor
}  // end destroy()

//==============================================================================
// messageFacilityReceiverWorkLoop ~~
//	Thread for printing Message Facility messages without decorations
//	Note: Uses std::mutex to avoid conflict with reading thread.
void ConsoleSupervisor::messageFacilityReceiverWorkLoop(ConsoleSupervisor* cs)
try
{
	__COUT__ << "Starting workloop based on config file: " << QUIET_CFG_FILE << __E__;

	std::string configFile = QUIET_CFG_FILE;
	FILE*       fp         = fopen(configFile.c_str(), "r");
	if(!fp)
	{
		__SS__ << "File with port info could not be loaded: " << QUIET_CFG_FILE << __E__;
		__COUT__ << "\n" << ss.str();
		__SS_THROW__;
	}
	char tmp[100];
	fgets(tmp, 100, fp);  // receive port (ignore)
	fgets(tmp, 100, fp);  // destination port *** used here ***
	int myport;
	sscanf(tmp, "%*s %d", &myport);
	
	//get trigger strings
	std::string haltTrigger, pauseTrigger, countTrigger, systemMessageTrigger; 
	//read from prefrence file and set trigger strings 
	
	fgets(tmp, 100, fp);  // destination ip *** used here ***
	char myip[100];
	sscanf(tmp, "%*s %s", myip);
	fclose(fp);

	ReceiverSocket rsock(myip, myport);  // Take Port from Configuration
	try
	{
		rsock.initialize(0x1400000 /*socketReceiveBufferSize*/);
	}
	catch(...)
	{
		// lockout the messages array for the remainder of the scope
		// this guarantees the reading thread can safely access the messages
		std::lock_guard<std::mutex> lock(cs->messageMutex_);

		// NOTE: if we do not want this to be fatal, do not throw here, just print out

		if(1)  // generate special message and throw for failed socket
		{
			__SS__ << "FATAL Console error. Could not initialize socket on port "
			       << myport
			       << ". Perhaps the port is already in use? Check for multiple stale "
			          "instances of otsdaq processes, or notify admins."
			       << " Multiple instances of otsdaq on the same node should be "
			          "possible, but port numbers must be unique."
			       << __E__;
			__SS_THROW__;
		}

		// generate special message to indicate failed socket
		__SS__ << "FATAL Console error. Could not initialize socket on port " << myport
		       << ". Perhaps it is already in use? Exiting Console receive loop."
		       << __E__;
		__COUT__ << ss.str();

		cs->messages_.emplace_back(CONSOLE_SPECIAL_ERROR + ss.str(), cs->messageCount_++);

		if(cs->messages_.size() > cs->maxMessageCount_)
		{
			cs->messages_.erase(cs->messages_.begin());
		}

		return;
	}

	std::string buffer;
	int         i                         = 0;
	int         heartbeatCount            = 0;
	int         selfGeneratedMessageCount = 0;

	std::map<unsigned int, unsigned int>
	    sourceLastSequenceID;  // map from sourceID to
	                           // lastSequenceID to
	                           // identify missed messages
	long long    newSourceId;
	uint32_t     newSequenceId;
	unsigned int c;

	// force a starting message
	__MOUT__ << "DEBUG messages look like this." << __E__;

	while(1)
	{
		// if receive succeeds display message

		//__COUTV__(i);

		if(rsock.receive(
		       buffer, 1 /*timeoutSeconds*/, 0 /*timeoutUSeconds*/, false /*verbose*/) !=
		   -1)
		{
			// use 1-byte "ping" to keep socket alive
			if(buffer.size() == 1)
			{
				// std::cout << "Ping!" << __E__;
				continue;
			}

			if(i != 200)
			{
				__COUT__ << "Console has first message." << __E__;
				i = 200;  // mark so things are good for all time. (this indicates things
				          // are configured to be sent here)

				__MOUT_INFO__ << "INFO messages look like this." << __E__;
				__MOUT_WARN__ << "WARNING messages look like this." << __E__;
				__MOUT_ERR__ << "ERROR messages look like this." << __E__;

				//				//to debug special packets
				//				__SS__ << "???";
				//				cs->messages_[cs->writePointer_].set(CONSOLE_SPECIAL_ERROR
				//+ 						ss.str(),
				//						cs->messageCount_++);
				//
				//				if(++cs->writePointer_ == cs->messages_.size()) //handle
				// wrap-around 					cs->writePointer_ = 0;
			}

			if(selfGeneratedMessageCount)
				--selfGeneratedMessageCount;  // decrement internal message count
			else  // reset heartbeat if external messages are coming through
				heartbeatCount = 0;

			//__COUT__ << buffer << __E__;

			// lockout the messages array for the remainder of the scope
			// this guarantees the reading thread can safely access the messages
			std::lock_guard<std::mutex> lock(cs->messageMutex_);

			// handle message stacking in packet
			c = 0;
			while(c < buffer.size())
			{
				// std::cout << "CONSOLE " << c << " sz=" << buffer.size() << " len=" <<
				// 	strlen(&(buffer.c_str()[c])) << __E__;
				cs->messages_.emplace_back(&(buffer.c_str()[c]), cs->messageCount_++);
				
				
				//check if any trigger strings are contained with in the buffer string
				if (pauseTrigger  && StringMacros::wildCardMatch(&pauseTrigger, &buffer, pausePriorityIndex ){
					
				}
				}
				 if (haltTrigger && StringMacros::wildCardMatch(&haltTrigger, &buffer, haltPriorityIndex ){
				}
				 if (systemMessageTrigger && StringMacros::wildCardMatch(&systemMessageTrigger, &buffer, systemPriorityIndex ){
				}
				 if (countTrigger && StringMacros::wildCardMatch(&pauseTrigger, &buffer, countPriorityIndex ){
				}

				// check if sequence ID is out of order
				newSourceId   = cs->messages_.back().getSourceIDAsNumber();
				newSequenceId = cs->messages_.back().getSequenceIDAsNumber();

				//__COUT__ << "newSourceId: " << newSourceId << __E__;
				//__COUT__ << "newSequenceId: " << newSequenceId << __E__;

				if(newSourceId != -1 &&
				   sourceLastSequenceID.find(newSourceId) !=
				       sourceLastSequenceID.end() &&  // ensure not first packet received
				   ((newSequenceId == 0 && sourceLastSequenceID[newSourceId] !=
				                               (uint32_t)-1) ||  // wrap around case
				    newSequenceId !=
				        sourceLastSequenceID[newSourceId] + 1))  // normal sequence case
				{
					// missed some messages!
					std::stringstream missedSs;
					missedSs << "Console missed "
					         << (newSequenceId - 1) -
					                (sourceLastSequenceID[newSourceId] + 1) + 1
					         << " packet(s) from " << cs->messages_.back().getSource()
					         << "!" << __E__;
					__SS__ << missedSs.str();
					std::cout << ss.str();

					// generate special message to indicate missed packets
					cs->messages_.emplace_back(CONSOLE_SPECIAL_WARNING + missedSs.str(),
					                           cs->messageCount_++);
				}

				// save the new last sequence ID
				sourceLastSequenceID[newSourceId] = newSequenceId;

				while(cs->messages_.size() > 0 &&
				      cs->messages_.size() > cs->maxMessageCount_)
				{
					cs->messages_.erase(cs->messages_.begin());
				}

				c += strlen(&(buffer.c_str()[c])) + 1;
			}  // end handle message stacking in packet
		}      // end received packet handling
		else   // idle network handling
		{
			if(i < 120)  // if nothing received for 120 seconds, then something is wrong
			             // with Console configuration
				++i;

			sleep(1);  // sleep one second, if timeout

			// every 60 heartbeatCount (2 seconds each = 1 sleep and 1 timeout) print a
			// heartbeat message
			if(i != 200 ||  // show first message, if not already a message
			   (heartbeatCount < 60 * 5 &&
			    heartbeatCount % 60 == 59))  // every ~2 min for first 5 messages
			{
				++selfGeneratedMessageCount;  // increment internal message count
				__MOUT__ << "Console is alive and waiting... (if no messages, next "
				            "heartbeat is in two minutes)"
				         << __E__;
			}
			else if(heartbeatCount % (60 * 30) == 59)  // approx every hour
			{
				++selfGeneratedMessageCount;  // increment internal message count
				__MOUT__ << "Console is alive and waiting a long time... (if no "
				            "messages, next heartbeat is in one hour)"
				         << __E__;
			}

			++heartbeatCount;
		}  // end idle network handling

		// if nothing received for 2 minutes seconds, then something is wrong with Console
		// configuration 	after 5 seconds there is a self-send. Which will at least
		// confirm configuration. 	OR if 5 generated messages and never cleared.. then
		// the forwarding is not working.
		if(i == 120 || selfGeneratedMessageCount == 5)
		{
			__COUTV__(i);
			__COUTV__(selfGeneratedMessageCount);
			__COUT__ << "No messages received at Console Supervisor. Exiting Console "
			            "messageFacilityReceiverWorkLoop"
			         << __E__;
			break;  // assume something wrong, and break loop
		}
	}  // end infinite loop
}  // end messageFacilityReceiverWorkLoop()
catch(const std::runtime_error& e)
{
	__COUT_ERR__ << "Error caught at Console Supervisor thread: " << e.what() << __E__;
}
catch(...)
{
	__COUT_ERR__ << "Unknown error caught at Console Supervisor thread." << __E__;
}  // end messageFacilityReceiverWorkLoop() exception handling

//==============================================================================
void ConsoleSupervisor::defaultPage(xgi::Input* /*in*/, xgi::Output* out)
{
	__SUP_COUT__ << "ApplicationDescriptor LID="
	             << getApplicationDescriptor()->getLocalId() << __E__;
	*out << "<!DOCTYPE HTML><html lang='en'><frameset col='100%' row='100%'><frame "
	        "src='/WebPath/html/Console.html?urn="
	     << getApplicationDescriptor()->getLocalId() << "'></frameset></html>";
}  // end defaultPage()

//==============================================================================
// forceSupervisorPropertyValues
//		override to force supervisor property values (and ignore user settings)
void ConsoleSupervisor::forceSupervisorPropertyValues()
{
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.AutomatedRequestTypes,
	    "GetConsoleMsgs");
	//	CorePropertySupervisorBase::setSupervisorProperty(CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.NeedUsernameRequestTypes,
	//			"SaveUserPreferences | LoadUserPreferences");
}  // end forceSupervisorPropertyValues()

//==============================================================================
//	Request
//		Handles Web Interface requests to Console supervisor.
//		Does not refresh cookie for automatic update checks.
void ConsoleSupervisor::request(const std::string&               requestType,
                                cgicc::Cgicc&                    cgiIn,
                                HttpXmlDocument&                 xmlOut,
                                const WebUsers::RequestUserInfo& userInfo)
{
	//__SUP_COUT__ << "requestType " << requestType << __E__;

	// Commands:
	// GetConsoleMsgs
	// SaveUserPreferences
	// LoadUserPreferences
	// GetTraceLevels
	// SetTraceLevels
	// GetTriggerStatus
	// SetTriggerEnable
	// ResetTRACE
	// EnableTRACE
	// GetTraceSnapshot

	// Note: to report to logbook admin status use
	// xmlOut.addTextElementToData(XML_ADMIN_STATUS,refreshTempStr_);

	if(requestType == "GetConsoleMsgs")
	{
		// lindex of -1 means first time and user just gets update lcount and lindex
		std::string lastUpdateCountStr = CgiDataUtilities::postData(cgiFIn, "lcount");

		if(lastUpdateCountStr == "")
		{
			__SUP_COUT_ERR__ << "Invalid Parameters! lastUpdateCount="
			                 << lastUpdateCountStr << __E__;
			xmlOut.addTextElementToData("Error",
			                            "Error - Invalid parameters for GetConsoleMsgs.");
			return;
		}

		size_t lastUpdateCount = std::stoull(lastUpdateCountStr);

		//		__SUP_COUT__ << "lastUpdateCount=" << lastUpdateCount << __E__;

		insertMessageRefresh(&xmlOut, lastUpdateCount);
	}
	else if(requestType == "SaveUserPreferences")
	{
		int colorIndex     = CgiDataUtilities::postDataAsInt(cgiIn, "colorIndex");
		int showSideBar    = CgiDataUtilities::postDataAsInt(cgiIn, "showSideBar");
		int noWrap         = CgiDataUtilities::postDataAsInt(cgiIn, "noWrap");
		int messageOnly    = CgiDataUtilities::postDataAsInt(cgiIn, "messageOnly");
		int hideLineNumers = CgiDataUtilities::postDataAsInt(cgiIn, "hideLineNumers");

		// __SUP_COUT__ << "requestType " << requestType << __E__;
		// __SUP_COUT__ << "colorIndex: " << colorIndex << __E__;
		// __SUP_COUT__ << "showSideBar: " << showSideBar << __E__;
		// __SUP_COUT__ << "noWrap: " << noWrap << __E__;
		// __SUP_COUT__ << "messageOnly: " << messageOnly << __E__;
		// __SUP_COUT__ << "hideLineNumers: " << hideLineNumers << __E__;

		if(userInfo.username_ == "")  // should never happen?
		{
			__SUP_COUT_ERR__ << "Invalid user found! user=" << userInfo.username_
			                 << __E__;
			xmlOut.addTextElementToData("Error",
			                            "Error - InvauserInfo.username_user found.");
			return;
		}

		std::string fn = (std::string)USER_CONSOLE_PREF_PATH + userInfo.username_ + "." +
		                 (std::string)USERS_PREFERENCES_FILETYPE;

		// __SUP_COUT__ << "Save preferences: " << fn << __E__;
		FILE* fp = fopen(fn.c_str(), "w");
		if(!fp)
		{
			__SS__;
			__THROW__(ss.str() + "Could not open file: " + fn);
		}
		fprintf(fp, "colorIndex %d\n", colorIndex);
		fprintf(fp, "showSideBar %d\n", showSideBar);
		fprintf(fp, "noWrap %d\n", noWrap);
		fprintf(fp, "messageOnly %d\n", messageOnly);
		fprintf(fp, "hideLineNumers %d\n", hideLineNumers);
		fclose(fp);
	}
	else if(requestType == "LoadUserPreferences")
	{
		// __SUP_COUT__ << "requestType " << requestType << __E__;

		unsigned int colorIndex, showSideBar, noWrap, messageOnly, hideLineNumers;

		if(userInfo.username_ == "")  // should never happen?
		{
			__SUP_COUT_ERR__ << "Invalid user found! user=" << userInfo.username_
			                 << __E__;
			xmlOut.addTextElementToData("Error", "Error - Invalid user found.");
			return;
		}

		std::string fn = (std::string)USER_CONSOLE_PREF_PATH + userInfo.username_ + "." +
		                 (std::string)USERS_PREFERENCES_FILETYPE;

		// __SUP_COUT__ << "Load preferences: " << fn << __E__;

		FILE* fp = fopen(fn.c_str(), "r");
		if(!fp)
		{
			// return defaults
			__SUP_COUT__ << "Returning defaults." << __E__;
			xmlOut.addTextElementToData("colorIndex", "0");
			xmlOut.addTextElementToData("showSideBar", "0");
			xmlOut.addTextElementToData("noWrap", "1");
			xmlOut.addTextElementToData("messageOnly", "0");
			xmlOut.addTextElementToData("hideLineNumers", "1");
			return;
		}
		fscanf(fp, "%*s %u", &colorIndex);
		fscanf(fp, "%*s %u", &showSideBar);
		fscanf(fp, "%*s %u", &noWrap);
		fscanf(fp, "%*s %u", &messageOnly);
		fscanf(fp, "%*s %u", &hideLineNumers);
		fclose(fp);
		// __SUP_COUT__ << "colorIndex: " << colorIndex << __E__;
		// __SUP_COUT__ << "showSideBar: " << showSideBar << __E__;
		// __SUP_COUT__ << "noWrap: " << noWrap << __E__;
		// __SUP_COUT__ << "messageOnly: " << messageOnly << __E__;
		// __SUP_COUT__ << "hideLineNumers: " << hideLineNumers << __E__;

		char tmpStr[20];
		sprintf(tmpStr, "%u", colorIndex);
		xmlOut.addTextElementToData("colorIndex", tmpStr);
		sprintf(tmpStr, "%u", showSideBar);
		xmlOut.addTextElementToData("showSideBar", tmpStr);
		sprintf(tmpStr, "%u", noWrap);
		xmlOut.addTextElementToData("noWrap", tmpStr);
		sprintf(tmpStr, "%u", messageOnly);
		xmlOut.addTextElementToData("messageOnly", tmpStr);
		sprintf(tmpStr, "%u", hideLineNumers);
		xmlOut.addTextElementToData("hideLineNumers", tmpStr);
	}
	else if(requestType == "GetTraceLevels")
	{
		__SUP_COUT__ << "requestType " << requestType << __E__;

		SOAPParameters txParameters;  // params for xoap to send
		txParameters.addParameter("Request", "GetTraceLevels");

		SOAPParameters rxParameters;  // params for xoap to recv
		rxParameters.addParameter("Command");
		rxParameters.addParameter("Error");
		rxParameters.addParameter("TRACEHostnameList");
		rxParameters.addParameter("TRACEList");

		traceMapToXDAQHostname_.clear();  // reset

		std::string traceList = "";
		auto& allTraceApps    = allSupervisorInfo_.getAllTraceControllerSupervisorInfo();
		for(const auto& appInfo : allTraceApps)
		{
			__SUP_COUT__ << "Supervisor hostname = " << appInfo.first << "/"
			             << appInfo.second.getId()
			             << " name = " << appInfo.second.getName()
			             << " class = " << appInfo.second.getClass()
			             << " hostname = " << appInfo.second.getHostname() << __E__;
			try
			{
				xoap::MessageReference retMsg =
				    SOAPMessenger::sendWithSOAPReply(appInfo.second.getDescriptor(),
				                                     "TRACESupervisorRequest",
				                                     txParameters);
				SOAPUtilities::receive(retMsg, rxParameters);
				__SUP_COUT__ << "Received TRACE response: "
				             << SOAPUtilities::translate(retMsg).getCommand() << " ==> "
				             << SOAPUtilities::translate(retMsg) << __E__;

				if(SOAPUtilities::translate(retMsg).getCommand() == "Fault")
				{
					__SUP_SS__ << "Unrecognized command at destination TRACE Supervisor "
					              "hostname = "
					           << appInfo.first << "/" << appInfo.second.getId()
					           << " name = " << appInfo.second.getName()
					           << " class = " << appInfo.second.getClass()
					           << " hostname = " << appInfo.second.getHostname() << __E__;
					__SUP_SS_THROW__;
				}
				else if(SOAPUtilities::translate(retMsg).getCommand() == "TRACEFault")
				{
					__SUP_SS__ << "Error received: " << rxParameters.getValue("Error")
					           << __E__;
					__SUP_SS_THROW__;
				}
			}
			catch(const xdaq::exception::Exception& e)
			{
				__SUP_SS__ << "Error transmitting request to TRACE Supervi	sor LID = "
				           << appInfo.second.getId()
				           << " name = " << appInfo.second.getName() << ". \n\n"
				           << e.what() << __E__;
				__SUP_SS_THROW__;
			}

			std::vector<std::string> traceHostnameArr;
			StringMacros::getVectorFromString(
			    rxParameters.getValue("TRACEHostnameList"), traceHostnameArr, {';'});
			for(const auto& traceHostname : traceHostnameArr)
				traceMapToXDAQHostname_[traceHostname] = appInfo.first;

			// traceList 		  += ";" + appInfo.first; //insert xdaq context version of
			// name
			//						//FIXME and create mapp from user's typed in xdaq
			// context name to TRACE hostname resolution

			traceList += rxParameters.getValue("TRACEList");

		}  // end app get TRACE loop
		__SUP_COUT__ << "TRACE hostname map received: \n"
		             << StringMacros::mapToString(traceMapToXDAQHostname_) << __E__;
		__SUP_COUT__ << "TRACE List received: \n" << traceList << __E__;
		xmlOut.addTextElementToData("traceList", traceList);
	}  // end GetTraceLevels
	else if(requestType == "SetTraceLevels")
	{
		__SUP_COUT__ << "requestType " << requestType << __E__;

		std::string individualValues =
		    CgiDataUtilities::postData(cgiIn, "individualValues");
		std::string hostLabelMap = CgiDataUtilities::postData(cgiIn, "hostLabelMap");
		std::string setMode      = CgiDataUtilities::postData(cgiIn, "setMode");
		std::string setValueMSB  = CgiDataUtilities::postData(cgiIn, "setValueMSB");
		std::string setValueLSB  = CgiDataUtilities::postData(cgiIn, "setValueLSB");

		__SUP_COUTV__(individualValues);
		__SUP_COUTV__(setMode);
		// set modes: SLOW, FAST, TRIGGER
		__SUP_COUTV__(setValueMSB);
		__SUP_COUTV__(setValueLSB);

		std::map<std::string /*host*/, std::string /*labelArr*/> hostToLabelMap;

		auto& allTraceApps = allSupervisorInfo_.getAllTraceControllerSupervisorInfo();

		SOAPParameters rxParameters;  // params for xoap to recv
		rxParameters.addParameter("Command");
		rxParameters.addParameter("Error");
		rxParameters.addParameter("TRACEList");

		std::string modifiedTraceList = "";
		std::string xdaqHostname;
		StringMacros::getMapFromString(hostLabelMap, hostToLabelMap, {';'}, {':'});
		for(auto& hostLabelsPair : hostToLabelMap)
		{
			// identify artdaq hosts to go through ARTDAQ supervisor
			//	by adding "artdaq.." to hostname artdaq..correlator2.fnal.gov
			__SUP_COUTV__(hostLabelsPair.first);
			__SUP_COUTV__(hostLabelsPair.second);

			// use map to convert to xdaq host
			try
			{
				xdaqHostname = traceMapToXDAQHostname_.at(hostLabelsPair.first);
			}
			catch(...)
			{
				__SUP_SS__ << "Could not find the translation from TRACE hostname '"
				           << hostLabelsPair.first << "' to xdaq Context hostname."
				           << __E__;
				ss << "Here is the existing map (size=" << traceMapToXDAQHostname_.size()
				   << "): " << StringMacros::mapToString(traceMapToXDAQHostname_)
				   << __E__;
				__SUP_SS_THROW__;
			}

			__SUP_COUTV__(xdaqHostname);

			auto& appInfo = allTraceApps.at(xdaqHostname);
			__SUP_COUT__ << "Supervisor hostname = " << hostLabelsPair.first << "/"
			             << xdaqHostname << ":" << appInfo.getId()
			             << " name = " << appInfo.getName()
			             << " class = " << appInfo.getClass()
			             << " hostname = " << appInfo.getHostname() << __E__;
			try
			{
				SOAPParameters txParameters;  // params for xoap to send
				txParameters.addParameter("Request", "SetTraceLevels");
				txParameters.addParameter("IndividualValues", individualValues);
				txParameters.addParameter("Host", hostLabelsPair.first);
				txParameters.addParameter("SetMode", setMode);
				txParameters.addParameter("Labels", hostLabelsPair.second);
				txParameters.addParameter("SetValueMSB", setValueMSB);
				txParameters.addParameter("SetValueLSB", setValueLSB);

				xoap::MessageReference retMsg = SOAPMessenger::sendWithSOAPReply(
				    appInfo.getDescriptor(), "TRACESupervisorRequest", txParameters);
				SOAPUtilities::receive(retMsg, rxParameters);
				__SUP_COUT__ << "Received TRACE response: "
				             << SOAPUtilities::translate(retMsg).getCommand() << " ==> "
				             << SOAPUtilities::translate(retMsg) << __E__;

				if(SOAPUtilities::translate(retMsg).getCommand() == "Fault")
				{
					__SUP_SS__ << "Unrecognized command at destination TRACE Supervisor "
					              "hostname = "
					           << hostLabelsPair.first << "/" << appInfo.getId()
					           << " name = " << appInfo.getName()
					           << " class = " << appInfo.getClass()
					           << " hostname = " << appInfo.getHostname() << __E__;
					__SUP_SS_THROW__;
				}
				else if(SOAPUtilities::translate(retMsg).getCommand() == "TRACEFault")
				{
					__SUP_SS__ << "Error received: " << rxParameters.getValue("Error")
					           << __E__;
					__SUP_SS_THROW__;
				}
			}
			catch(const xdaq::exception::Exception& e)
			{
				__SUP_SS__ << "Error transmitting request to TRACE Supervisor LID = "
				           << appInfo.getId() << " name = " << appInfo.getName()
				           << ". \n\n"
				           << e.what() << __E__;
				__SUP_SS_THROW__;
			}

			modifiedTraceList +=
			    ";" +
			    hostLabelsPair.first;  // insert xdaq context version of name
			                           // FIXME and create mapp from user's typed in xdaq
			                           // context name to TRACE hostname resolution

			modifiedTraceList += rxParameters.getValue("TRACEList");

		}  // end host set TRACE loop

		__SUP_COUT__ << "mod'd TRACE List received: \n" << modifiedTraceList << __E__;
		xmlOut.addTextElementToData("modTraceList", modifiedTraceList);
	}  // end SetTraceLevels
	else if(requestType == "GetTriggerStatus")
	{
		__SUP_COUT__ << "requestType " << requestType << __E__;
		SOAPParameters txParameters;  // params for xoap to send
		txParameters.addParameter("Request", "GetTriggerStatus");

		SOAPParameters rxParameters;  // params for xoap to recv
		rxParameters.addParameter("Command");
		rxParameters.addParameter("Error");
		rxParameters.addParameter("TRACETriggerStatus");

		std::string traceTriggerStatus = "";
		auto& allTraceApps = allSupervisorInfo_.getAllTraceControllerSupervisorInfo();
		for(const auto& appInfo : allTraceApps)
		{
			__SUP_COUT__ << "Supervisor hostname = " << appInfo.first << "/"
			             << appInfo.second.getId()
			             << " name = " << appInfo.second.getName()
			             << " class = " << appInfo.second.getClass()
			             << " hostname = " << appInfo.second.getHostname() << __E__;
			try
			{
				xoap::MessageReference retMsg =
				    SOAPMessenger::sendWithSOAPReply(appInfo.second.getDescriptor(),
				                                     "TRACESupervisorRequest",
				                                     txParameters);
				SOAPUtilities::receive(retMsg, rxParameters);
				__SUP_COUT__ << "Received TRACE response: "
				             << SOAPUtilities::translate(retMsg).getCommand() << " ==> "
				             << SOAPUtilities::translate(retMsg) << __E__;

				if(SOAPUtilities::translate(retMsg).getCommand() == "Fault")
				{
					__SUP_SS__ << "Unrecognized command at destination TRACE Supervisor "
					              "hostname = "
					           << appInfo.first << "/" << appInfo.second.getId()
					           << " name = " << appInfo.second.getName()
					           << " class = " << appInfo.second.getClass()
					           << " hostname = " << appInfo.second.getHostname() << __E__;
					__SUP_SS_THROW__;
				}
				else if(SOAPUtilities::translate(retMsg).getCommand() == "TRACEFault")
				{
					__SUP_SS__ << "Error received: " << rxParameters.getValue("Error")
					           << __E__;
					__SUP_SS_THROW__;
				}
			}
			catch(const xdaq::exception::Exception& e)
			{
				__SUP_SS__ << "Error transmitting request to TRACE Supervisor LID = "
				           << appInfo.second.getId()
				           << " name = " << appInfo.second.getName() << ". \n\n"
				           << e.what() << __E__;
				__SUP_SS_THROW__;
			}

			traceTriggerStatus += rxParameters.getValue("TRACETriggerStatus");

		}  // end app get TRACE loop
		__SUP_COUT__ << "TRACE Trigger Status received: \n"
		             << traceTriggerStatus << __E__;
		xmlOut.addTextElementToData("traceTriggerStatus", traceTriggerStatus);
	}  // end GetTriggerStatus
	else if(requestType == "SetTriggerEnable")
	{
		__SUP_COUT__ << "requestType " << requestType << __E__;

		std::string hostList = CgiDataUtilities::postData(cgiIn, "hostList");

		__SUP_COUTV__(hostList);

		std::vector<std::string /*host*/> hosts;

		auto& allTraceApps = allSupervisorInfo_.getAllTraceControllerSupervisorInfo();

		SOAPParameters rxParameters;  // params for xoap to recv
		rxParameters.addParameter("Command");
		rxParameters.addParameter("Error");
		rxParameters.addParameter("TRACETriggerStatus");

		std::string modifiedTriggerStatus = "";
		std::string xdaqHostname;
		StringMacros::getVectorFromString(hostList, hosts, {';'});
		for(auto& host : hosts)
		{
			// identify artdaq hosts to go through ARTDAQ supervisor
			//	by adding "artdaq.." to hostname artdaq..correlator2.fnal.gov
			__SUP_COUTV__(host);
			if(host.size() < 3)
				continue;  // skip bad hostnames

			// use map to convert to xdaq host
			try
			{
				xdaqHostname = traceMapToXDAQHostname_.at(host);
			}
			catch(...)
			{
				__SUP_SS__ << "Could not find the translation from TRACE hostname '"
				           << host << "' to xdaq Context hostname." << __E__;
				ss << "Here is the existing map (size=" << traceMapToXDAQHostname_.size()
				   << "): " << StringMacros::mapToString(traceMapToXDAQHostname_)
				   << __E__;
				__SUP_SS_THROW__;
			}

			__SUP_COUTV__(xdaqHostname);

			auto& appInfo = allTraceApps.at(xdaqHostname);
			__SUP_COUT__ << "Supervisor hostname = " << host << "/" << xdaqHostname << ":"
			             << appInfo.getId() << " name = " << appInfo.getName()
			             << " class = " << appInfo.getClass()
			             << " hostname = " << appInfo.getHostname() << __E__;
			try
			{
				SOAPParameters txParameters;  // params for xoap to send
				txParameters.addParameter("Request", "SetTriggerEnable");
				txParameters.addParameter("Host", host);

				xoap::MessageReference retMsg = SOAPMessenger::sendWithSOAPReply(
				    appInfo.getDescriptor(), "TRACESupervisorRequest", txParameters);
				SOAPUtilities::receive(retMsg, rxParameters);
				__SUP_COUT__ << "Received TRACE response: "
				             << SOAPUtilities::translate(retMsg).getCommand() << " ==> "
				             << SOAPUtilities::translate(retMsg) << __E__;

				if(SOAPUtilities::translate(retMsg).getCommand() == "Fault")
				{
					__SUP_SS__ << "Unrecognized command at destination TRACE Supervisor "
					              "hostname = "
					           << host << "/" << appInfo.getId()
					           << " name = " << appInfo.getName()
					           << " class = " << appInfo.getClass()
					           << " hostname = " << appInfo.getHostname() << __E__;
					__SUP_SS_THROW__;
				}
				else if(SOAPUtilities::translate(retMsg).getCommand() == "TRACEFault")
				{
					__SUP_SS__ << "Error received: " << rxParameters.getValue("Error")
					           << __E__;
					__SUP_SS_THROW__;
				}
			}
			catch(const xdaq::exception::Exception& e)
			{
				__SUP_SS__ << "Error transmitting request to TRACE Supervisor LID = "
				           << appInfo.getId() << " name = " << appInfo.getName()
				           << ". \n\n"
				           << e.what() << __E__;
				__SUP_SS_THROW__;
			}

			modifiedTriggerStatus += rxParameters.getValue("TRACETriggerStatus");
		}  // end host set TRACE loop

		__SUP_COUT__ << "mod'd TRACE Trigger Status received: \n"
		             << modifiedTriggerStatus << __E__;
		xmlOut.addTextElementToData("modTriggerStatus", modifiedTriggerStatus);
	}  // end SetTriggerEnable
	else if(requestType == "ResetTRACE")
	{
		__SUP_COUT__ << "requestType " << requestType << __E__;

		std::string hostList = CgiDataUtilities::postData(cgiIn, "hostList");

		__SUP_COUTV__(hostList);

		std::vector<std::string /*host*/> hosts;

		auto& allTraceApps = allSupervisorInfo_.getAllTraceControllerSupervisorInfo();

		SOAPParameters rxParameters;  // params for xoap to recv
		rxParameters.addParameter("Command");
		rxParameters.addParameter("Error");
		rxParameters.addParameter("TRACETriggerStatus");

		std::string modifiedTriggerStatus = "";
		std::string xdaqHostname;
		StringMacros::getVectorFromString(hostList, hosts, {';'});
		for(auto& host : hosts)
		{
			// identify artdaq hosts to go through ARTDAQ supervisor
			//	by adding "artdaq.." to hostname artdaq..correlator2.fnal.gov
			__SUP_COUTV__(host);
			if(host.size() < 3)
				continue;  // skip bad hostnames

			// use map to convert to xdaq host
			try
			{
				xdaqHostname = traceMapToXDAQHostname_.at(host);
			}
			catch(...)
			{
				__SUP_SS__ << "Could not find the translation from TRACE hostname '"
				           << host << "' to xdaq Context hostname." << __E__;
				ss << "Here is the existing map (size=" << traceMapToXDAQHostname_.size()
				   << "): " << StringMacros::mapToString(traceMapToXDAQHostname_)
				   << __E__;
				__SUP_SS_THROW__;
			}

			__SUP_COUTV__(xdaqHostname);

			auto& appInfo = allTraceApps.at(xdaqHostname);
			__SUP_COUT__ << "Supervisor hostname = " << host << "/" << xdaqHostname << ":"
			             << appInfo.getId() << " name = " << appInfo.getName()
			             << " class = " << appInfo.getClass()
			             << " hostname = " << appInfo.getHostname() << __E__;
			try
			{
				SOAPParameters txParameters;  // params for xoap to send
				txParameters.addParameter("Request", "ResetTRACE");
				txParameters.addParameter("Host", host);

				xoap::MessageReference retMsg = SOAPMessenger::sendWithSOAPReply(
				    appInfo.getDescriptor(), "TRACESupervisorRequest", txParameters);
				SOAPUtilities::receive(retMsg, rxParameters);
				__SUP_COUT__ << "Received TRACE response: "
				             << SOAPUtilities::translate(retMsg).getCommand() << " ==> "
				             << SOAPUtilities::translate(retMsg) << __E__;

				if(SOAPUtilities::translate(retMsg).getCommand() == "Fault")
				{
					__SUP_SS__ << "Unrecognized command at destination TRACE Supervisor "
					              "hostname = "
					           << host << "/" << appInfo.getId()
					           << " name = " << appInfo.getName()
					           << " class = " << appInfo.getClass()
					           << " hostname = " << appInfo.getHostname() << __E__;
					__SUP_SS_THROW__;
				}
				else if(SOAPUtilities::translate(retMsg).getCommand() == "TRACEFault")
				{
					__SUP_SS__ << "Error received: " << rxParameters.getValue("Error")
					           << __E__;
					__SUP_SS_THROW__;
				}
			}
			catch(const xdaq::exception::Exception& e)
			{
				__SUP_SS__ << "Error transmitting request to TRACE Supervisor LID = "
				           << appInfo.getId() << " name = " << appInfo.getName()
				           << ". \n\n"
				           << e.what() << __E__;
				__SUP_SS_THROW__;
			}

			modifiedTriggerStatus += rxParameters.getValue("TRACETriggerStatus");
		}  // end host set TRACE loop

		__SUP_COUT__ << "mod'd TRACE Trigger Status received: \n"
		             << modifiedTriggerStatus << __E__;
		xmlOut.addTextElementToData("modTriggerStatus", modifiedTriggerStatus);
	}  // end ResetTRACE
	else if(requestType == "EnableTRACE")
	{
		__SUP_COUT__ << "requestType " << requestType << __E__;

		std::string hostList = CgiDataUtilities::postData(cgiIn, "hostList");
		std::string enable   = CgiDataUtilities::postData(cgiIn, "enable");

		__SUP_COUTV__(hostList);
		__SUP_COUTV__(enable);

		std::vector<std::string /*host*/> hosts;

		auto& allTraceApps = allSupervisorInfo_.getAllTraceControllerSupervisorInfo();

		SOAPParameters rxParameters;  // params for xoap to recv
		rxParameters.addParameter("Command");
		rxParameters.addParameter("Error");
		rxParameters.addParameter("TRACETriggerStatus");

		std::string modifiedTriggerStatus = "";
		std::string xdaqHostname;
		StringMacros::getVectorFromString(hostList, hosts, {';'});
		for(auto& host : hosts)
		{
			// identify artdaq hosts to go through ARTDAQ supervisor
			//	by adding "artdaq.." to hostname artdaq..correlator2.fnal.gov
			__SUP_COUTV__(host);
			if(host.size() < 3)
				continue;  // skip bad hostnames

			// use map to convert to xdaq host
			try
			{
				xdaqHostname = traceMapToXDAQHostname_.at(host);
			}
			catch(...)
			{
				__SUP_SS__ << "Could not find the translation from TRACE hostname '"
				           << host << "' to xdaq Context hostname." << __E__;
				ss << "Here is the existing map (size=" << traceMapToXDAQHostname_.size()
				   << "): " << StringMacros::mapToString(traceMapToXDAQHostname_)
				   << __E__;
				__SUP_SS_THROW__;
			}

			__SUP_COUTV__(xdaqHostname);

			auto& appInfo = allTraceApps.at(xdaqHostname);
			__SUP_COUT__ << "Supervisor hostname = " << host << "/" << xdaqHostname << ":"
			             << appInfo.getId() << " name = " << appInfo.getName()
			             << " class = " << appInfo.getClass()
			             << " hostname = " << appInfo.getHostname() << __E__;
			try
			{
				SOAPParameters txParameters;  // params for xoap to send
				txParameters.addParameter("Request", "EnableTRACE");
				txParameters.addParameter("Host", host);
				txParameters.addParameter("SetEnable", enable);

				xoap::MessageReference retMsg = SOAPMessenger::sendWithSOAPReply(
				    appInfo.getDescriptor(), "TRACESupervisorRequest", txParameters);
				SOAPUtilities::receive(retMsg, rxParameters);
				__SUP_COUT__ << "Received TRACE response: "
				             << SOAPUtilities::translate(retMsg).getCommand() << " ==> "
				             << SOAPUtilities::translate(retMsg) << __E__;

				if(SOAPUtilities::translate(retMsg).getCommand() == "Fault")
				{
					__SUP_SS__ << "Unrecognized command at destination TRACE Supervisor "
					              "hostname = "
					           << host << "/" << appInfo.getId()
					           << " name = " << appInfo.getName()
					           << " class = " << appInfo.getClass()
					           << " hostname = " << appInfo.getHostname() << __E__;
					__SUP_SS_THROW__;
				}
				else if(SOAPUtilities::translate(retMsg).getCommand() == "TRACEFault")
				{
					__SUP_SS__ << "Error received: " << rxParameters.getValue("Error")
					           << __E__;
					__SUP_SS_THROW__;
				}
			}
			catch(const xdaq::exception::Exception& e)
			{
				__SUP_SS__ << "Error transmitting request to TRACE Supervisor LID = "
				           << appInfo.getId() << " name = " << appInfo.getName()
				           << ". \n\n"
				           << e.what() << __E__;
				__SUP_SS_THROW__;
			}

			modifiedTriggerStatus += rxParameters.getValue("TRACETriggerStatus");
		}  // end host set TRACE loop

		__SUP_COUT__ << "mod'd TRACE Trigger Status received: \n"
		             << modifiedTriggerStatus << __E__;
		xmlOut.addTextElementToData("modTriggerStatus", modifiedTriggerStatus);
	}  // end EnableTRACE
	else if(requestType == "GetTraceSnapshot")
	{
		__SUP_COUT__ << "requestType " << requestType << __E__;

		std::string hostList  = CgiDataUtilities::postData(cgiIn, "hostList");
		std::string filterFor = CgiDataUtilities::postData(cgiIn, "filterFor");
		std::string filterOut = CgiDataUtilities::postData(cgiIn, "filterOut");

		__SUP_COUTV__(hostList);
		__SUP_COUTV__(filterFor);
		__SUP_COUTV__(filterOut);

		std::vector<std::string /*host*/> hosts;

		auto& allTraceApps = allSupervisorInfo_.getAllTraceControllerSupervisorInfo();

		SOAPParameters rxParameters;  // params for xoap to recv
		rxParameters.addParameter("Command");
		rxParameters.addParameter("Error");
		rxParameters.addParameter("TRACETriggerStatus");
		rxParameters.addParameter("TRACESnapshot");

		std::string modifiedTriggerStatus = "";
		std::string xdaqHostname;
		StringMacros::getVectorFromString(hostList, hosts, {';'});
		for(auto& host : hosts)
		{
			// identify artdaq hosts to go through ARTDAQ supervisor
			//	by adding "artdaq.." to hostname artdaq..correlator2.fnal.gov
			__SUP_COUTV__(host);
			if(host.size() < 3)
				continue;  // skip bad hostnames

			// use map to convert to xdaq host
			try
			{
				xdaqHostname = traceMapToXDAQHostname_.at(host);
			}
			catch(...)
			{
				__SUP_SS__ << "Could not find the translation from TRACE hostname '"
				           << host << "' to xdaq Context hostname." << __E__;
				ss << "Here is the existing map (size=" << traceMapToXDAQHostname_.size()
				   << "): " << StringMacros::mapToString(traceMapToXDAQHostname_)
				   << __E__;
				__SUP_SS_THROW__;
			}

			__SUP_COUTV__(xdaqHostname);

			auto& appInfo = allTraceApps.at(xdaqHostname);
			__SUP_COUT__ << "Supervisor hostname = " << host << "/" << xdaqHostname << ":"
			             << appInfo.getId() << " name = " << appInfo.getName()
			             << " class = " << appInfo.getClass()
			             << " hostname = " << appInfo.getHostname() << __E__;
			try
			{
				SOAPParameters txParameters;  // params for xoap to send
				txParameters.addParameter("Request", "GetSnapshot");
				txParameters.addParameter("Host", host);
				txParameters.addParameter("FilterForCSV", filterFor);
				txParameters.addParameter("FilterOutCSV", filterOut);

				xoap::MessageReference retMsg = SOAPMessenger::sendWithSOAPReply(
				    appInfo.getDescriptor(), "TRACESupervisorRequest", txParameters);
				SOAPUtilities::receive(retMsg, rxParameters);
				__SUP_COUT__ << "Received TRACE response: "
				             << SOAPUtilities::translate(retMsg).getCommand() << __E__;
				//<< " ==> Bytes " << SOAPUtilities::translate(retMsg) << __E__;

				if(SOAPUtilities::translate(retMsg).getCommand() == "Fault")
				{
					__SUP_SS__ << "Unrecognized command at destination TRACE Supervisor "
					              "hostname = "
					           << host << "/" << appInfo.getId()
					           << " name = " << appInfo.getName()
					           << " class = " << appInfo.getClass()
					           << " hostname = " << appInfo.getHostname() << __E__;
					__SUP_SS_THROW__;
				}
				else if(SOAPUtilities::translate(retMsg).getCommand() == "TRACEFault")
				{
					__SUP_SS__ << "Error received: " << rxParameters.getValue("Error")
					           << __E__;
					__SUP_SS_THROW__;
				}
			}
			catch(const xdaq::exception::Exception& e)
			{
				__SUP_SS__ << "Error transmitting request to TRACE Supervisor LID = "
				           << appInfo.getId() << " name = " << appInfo.getName()
				           << ". \n\n"
				           << e.what() << __E__;
				__SUP_SS_THROW__;
			}

			modifiedTriggerStatus += rxParameters.getValue("TRACETriggerStatus");
			xmlOut.addTextElementToData("host", host);
			std::string snapshot = rxParameters.getValue("TRACESnapshot");
			//			if(snapshot.size() > 100000)
			//			{
			//				__SUP_COUT__ << "Truncating snapshot" << __E__;
			//				snapshot.resize(100000);
			//			}
			//			xmlOut.addTextElementToData("hostSnapshot", snapshot);

			{
				std::string filename =
				    USER_CONSOLE_SNAPSHOT_PATH + "snapshot_" + host + ".txt";
				__SUP_COUTV__(filename);
				FILE* fp = fopen(filename.c_str(), "w");
				if(!fp)
				{
					__SUP_SS__ << "Failed to create snapshot file: " << filename << __E__;
					__SUP_SS_THROW__;
				}
				fprintf(fp,
				        "TRACE Snapshot taken at %s\n",
				        StringMacros::getTimestampString().c_str());

				if(snapshot.size() > 5 && snapshot[2] != 'i')
				{
					// add header lines
					fprintf(
					    fp,
					    "  idx           us_tod       delta    pid    tid cpu            "
					    "                    trcname lvl r msg                       \n");
					fprintf(fp,
					        "----- ---------------- ----------- ------ ------ --- "
					        "-------------------------------------- --- - "
					        "--------------------------\n");
				}
				fprintf(fp, "%s", snapshot.c_str());
				fclose(fp);
			}
		}  // end host set TRACE loop

		__SUP_COUT__ << "mod'd TRACE Trigger Status received: \n"
		             << modifiedTriggerStatus << __E__;
		xmlOut.addTextElementToData("modTriggerStatus", modifiedTriggerStatus);
	}  // end getTraceSnapshot
	else if (requestType = "setTriggerStrings") {
		// read in the trigger string in form like "pauseTrigger=[USER_INPUT]
		// Add to user preference file 
		int pauseTrigger = CgiDataUtilities::postDataAsInt(cgiIn, "pauseTrigger");
		int haltTrigger = CgiDataUtilities::postDataAsInt(cgiIn, "haltTrigger");
		int countTrigger = CgiDataUtilities::postDataAsInt(cgiIn, "countTrigger");
		int systemMessageTrigger = CgiDataUtilities::postDataAsInt(cgiIn, "systemMessageTrigger");
//		int hideLineNumers = CgiDataUtilities::postDataAsInt(cgiIn, "hideLineNumers");
		if (pauseTrigger == haltTrigger || haltTrigger = countTrigger || countTrigger == systemMessageTrigger
		|| pauseTrigger = countTrigger || haltTrigger = systemMessageTrigger  || pauseTrigger = systemMessageTrigger) {
	
			__SUP_COUT_ERR__ << "Tried to set two trigger strings to identitical values"
			                 << __E__;

			return;

		}
		// __SUP_COUT__ << "requestType " << requestType << __E__;
		// __SUP_COUT__ << "colorIndex: " << colorIndex << __E__;
		// __SUP_COUT__ << "showSideBar: " << showSideBar << __E__;
		// __SUP_COUT__ << "noWrap: " << noWrap << __E__;
		// __SUP_COUT__ << "messageOnly: " << messageOnly << __E__;
		// __SUP_COUT__ << "hideLineNumers: " << hideLineNumers << __E__;

		if(userInfo.username_ == "")  // should never happen?
		{
			__SUP_COUT_ERR__ << "Invalid user found! user=" << userInfo.username_
			                 << __E__;
			xmlOut.addTextElementToData("Error",
			                            "Error - InvauserInfo.username_user found.");
			return;
		}

		std::string fn = (std::string)USER_CONSOLE_PREF_PATH + userInfo.username_ + "." +
		                 (std::string)USERS_TRIGGER_STRING_FILETYPE;

		// __SUP_COUT__ << "Save preferences: " << fn << __E__;
		FILE* fp = fopen(fn.c_str(), "w");
		if(!fp)
		{
			__SS__;
			__THROW__(ss.str() + "Could not open file: " + fn);
		}
		fprintf(fp, "pauseTrigger: %s\n", pauseTrigger );
		fprintf(fp, "haltTrigger: %s\n", haltTrigger );
		fprintf(fp, "countTrigger: %s\n", countTrigger );
		fprintf(fp, "systemMessageTrigger: %s\n", systemMessageTrigger);
		fclose(fp);
	}
	else
	{
		__SUP_SS__ << "requestType Request, " << requestType << ", not recognized."
		           << __E__;
		__SUP_SS_THROW__;
	}
}  // end request()

//==============================================================================
// ConsoleSupervisor::insertMessageRefresh()
//	if lastUpdateClock is current, return nothing
//	else return new messages
//	(note: lastUpdateIndex==(unsigned int)-1 first time and returns as much as possible//
// nothing but lastUpdateClock)
//
//	format of xml:
//
//	<last_update_count/>
//	<last_update_index/>
//	<messages>
//		<message_FIELDNAME*/>
//"Level"
//"Label"
//"Source"
//"Msg"
//"Time"
//"Count"
//	</messages>
//
//	NOTE: Uses std::mutex to avoid conflict with writing thread. (this is the reading
// thread)
void ConsoleSupervisor::insertMessageRefresh(HttpXmlDocument* xmlOut,
                                             const size_t     lastUpdateCount)
{
	//__SUP_COUT__ << __E__;

	if(messages_.size() == 0)
		return;

	// validate lastUpdateCount
	if(lastUpdateCount > messages_.back().getCount() && lastUpdateCount != (size_t)-1)
	{
		__SS__ << "Invalid lastUpdateCount: " << lastUpdateCount
		       << " messagesArray size = " << messages_.back().getCount() << __E__;
		__SS_THROW__;
	}

	// lockout the messages array for the remainder of the scope
	// this guarantees the reading thread can safely access the messages
	std::lock_guard<std::mutex> lock(messageMutex_);

	xmlOut->addTextElementToData("last_update_count",
	                             std::to_string(messages_.back().getCount()));

	refreshParent_ = xmlOut->addTextElementToData("messages", "");

	bool        requestOutOfSync = false;
	std::string requestOutOfSyncMsg;

	size_t refreshReadPointer = 0;
	if(lastUpdateCount != (size_t)-1)
	{
		while(refreshReadPointer < messages_.size() &&
		      messages_[refreshReadPointer].getCount() <= lastUpdateCount)
		{
			++refreshReadPointer;
		}
	}

	if(refreshReadPointer >= messages_.size())
		return;

	// limit number of catch-up messages
	if(messages_.size() - refreshReadPointer > maxClientMessageRequest_)
	{
		// __SUP_COUT__ << "Only sending latest " << maxClientMessageRequest_ << "
		// messages!";

		// auto oldrrp        = refreshReadPointer;
		refreshReadPointer = messages_.size() - maxClientMessageRequest_;

		// __SS__ << "Skipping " << (refreshReadPointer - oldrrp)
		//        << " messages because the web console has fallen behind!" << __E__;
		// __COUT__ << ss.str();
		// ConsoleMessageStruct msg(CONSOLE_SPECIAL_WARNING + ss.str(), lastUpdateCount);
		// auto                 it = messages_.begin();
		// std::advance(it, refreshReadPointer + 1);
		// messages_.insert(it, msg);
	}

	// output oldest to new
	for(; refreshReadPointer < messages_.size(); ++refreshReadPointer)
	{
		auto msg = messages_[refreshReadPointer];
		if(msg.getCount() < lastUpdateCount)
		{
			if(!requestOutOfSync)  // record out of sync message once only
			{
				requestOutOfSync = true;
				__SS__ << "Request is out of sync! Message count should be more recent! "
				       << msg.getCount() << " < " << lastUpdateCount << __E__;
				requestOutOfSyncMsg = ss.str();
			}
			// assume these messages are new (due to a system restart)
			// continue;
		}

		// for all fields, give value
		for(auto& field : msg.fields)
		{
			if(field.second.fieldName == "Source")
				continue;  // skip, not userful
			if(field.second.fieldName == "SourceID")
				continue;  // skip, not userful

			xmlOut->addTextElementToParent("message_" + field.second.fieldName,
			                               field.second.fieldValue,
			                               refreshParent_);
		}

		// give timestamp also
		xmlOut->addTextElementToParent("message_Time", msg.getTime(), refreshParent_);
		// give clock also
		xmlOut->addTextElementToParent(
		    "message_Count", std::to_string(msg.getCount()), refreshParent_);
	}

	if(requestOutOfSync)  // if request was out of sync, show message
		__SUP_COUT__ << requestOutOfSyncMsg;
}  // end insertMessageRefresh()
