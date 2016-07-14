#ifndef _ots_ConfigurationGUISupervisor_h
#define _ots_ConfigurationGUISupervisor_h

#include "otsdaq-core/SOAPUtilities/SOAPMessenger.h"

#include "otsdaq-core/SupervisorConfigurations/SupervisorConfiguration.h"
#include "otsdaq-core/WebUsersUtilities/RemoteWebUsers.h"
#include "xdaq/Application.h"
#include "xgi/Method.h"

#include "xoap/MessageReference.h"
#include "xoap/MessageFactory.h"
#include "xoap/SOAPEnvelope.h"
#include "xoap/SOAPBody.h"
#include "xoap/domutils.h"
#include "xoap/Method.h"


#include "cgicc/HTMLClasses.h"
#include <cgicc/HTTPCookie.h>
#include "cgicc/HTMLDoctype.h"
#include <cgicc/HTTPHeader.h>

#include <string>
#include <map>
#include "../../../otsdaq/otsdaq-core/ConfigurationInterface/ConfigurationManagerRW.h"
#include "otsdaq-core/XmlUtilities/HttpXmlDocument.h"

namespace ots
{

class ConfigurationGUISupervisor: public xdaq::Application, public SOAPMessenger
{

public:

    XDAQ_INSTANTIATOR();

    ConfigurationGUISupervisor            (xdaq::ApplicationStub * s) throw (xdaq::exception::Exception);
    virtual ~ConfigurationGUISupervisor   (void);

    void init                  (void);
    void destroy               (void);
    void Default               (xgi::Input* in, xgi::Output* out) throw (xgi::exception::Exception);

    void 						request                      			(xgi::Input* in, xgi::Output* out )  	throw (xgi::exception::Exception);

private:

    void fillSpecificSystemXML(HttpXmlDocument &xmldoc, ConfigurationManagerRW *cfgMgr, std::string alias, int backboneVersion);
    void fillSpecificSubSystemXML(HttpXmlDocument &xmldoc, ConfigurationManagerRW *cfgMgr, std::string subAlias, int version);


    enum {
        USER_PERMISSIONS_THRESHOLD = 10,
        CONFIGURATION_MANAGER_EXPIRATION_TIME = 60*60*1, //1 hour, in seconds
    };

    SupervisorConfiguration    										theSupervisorsConfiguration_;
    RemoteWebUsers             										theRemoteWebUsers_;


    ConfigurationManagerRW*											refreshUserSession(std::string username, uint64_t activeSessionIndex, int &backboneVersion);
    std::map<std::string, ConfigurationManagerRW *> 				userConfigurationManagers_;
    std::map<std::string, time_t> 									userLastUseTime_;
};

}

#endif
