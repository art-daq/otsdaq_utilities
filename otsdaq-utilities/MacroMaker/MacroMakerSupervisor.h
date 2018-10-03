#ifndef _ots_MacroMakerSupervisor_h_
#define _ots_MacroMakerSupervisor_h_

#include "otsdaq-core/CoreSupervisors/CoreSupervisorBase.h"

namespace ots
{

//MacroMakerSupervisor
//	This class handles the user interface to the web desktop MacroMaker. MacroMaker
//	is a tool to conduct read and write commands with front-end interfaces and to manage
//	sequence of commands on a per user basis.
class MacroMakerSupervisor: public CoreSupervisorBase
{

public:

    XDAQ_INSTANTIATOR();


    						MacroMakerSupervisor            (xdaq::ApplicationStub* s);
	virtual 				~MacroMakerSupervisor   		(void);

	void 					init	              			(void);
	void 					destroy              			(void);

    virtual void			request         	 			(const std::string& requestType, cgicc::Cgicc& cgiIn, HttpXmlDocument& xmlOut, 	const WebUsers::RequestUserInfo& userInfo) override;

    virtual void			forceSupervisorPropertyValues	(void) override; //override to force supervisor property values (and ignore user settings)


    //void Default               		(xgi::Input* in, xgi::Output* out);
    //void MacroMakerRequest          (xgi::Input* in, xgi::Output* out);


    //xoap GetMacroList (username) //give macro list for user's and public
    //xoap RunMacro(macropath)		//get back unique id?
    //xoap getProgressOfRunningMacro(uid) //100%

private:

    //	void printStatus();

	void handleRequest				(const std::string Command, HttpXmlDocument& xmldoc, cgicc::Cgicc& cgi, const std::string &username);
	void getFElist					(HttpXmlDocument& xmldoc);
	void getFEMacroList				(HttpXmlDocument& xmldoc, const std::string &username);

	void writeData					(HttpXmlDocument& xmldoc, cgicc::Cgicc& cgi, const std::string &username);
	void readData					(HttpXmlDocument& xmldoc, cgicc::Cgicc& cgi, const std::string &username);
	void createMacro				(HttpXmlDocument& xmldoc, cgicc::Cgicc& cgi, const std::string &username);
	void loadMacros					(HttpXmlDocument& xmldoc, const std::string &username);
	void appendCommandToHistory		(std::string command, std::string Format, std::string time, std::string interfaces, const std::string &username);
	void loadHistory				(HttpXmlDocument& xmldoc, const std::string &username);
	void deleteMacro				(HttpXmlDocument& xmldoc,cgicc::Cgicc& cgi, const std::string &username);
	void editMacro					(HttpXmlDocument& xmldoc, cgicc::Cgicc& cgi, const std::string &username);
	void clearHistory				(const std::string &username);
	void exportMacro				(HttpXmlDocument& xmldoc, cgicc::Cgicc& cgi, const std::string &username);
	void exportFEMacro				(HttpXmlDocument& xmldoc, cgicc::Cgicc& cgi, const std::string &username);
	void runFEMacro					(HttpXmlDocument& xmldoc, cgicc::Cgicc& cgi);


	std::string generateHexArray	(const std::string& sourceHexString,int &numOfBytes);
	void createCode					(std::ostream& out, const std::vector<std::string>& commands, const std::string& tabOffset = "");

	SupervisorInfoMap				allFESupervisorInfo_;

};

}

#endif
