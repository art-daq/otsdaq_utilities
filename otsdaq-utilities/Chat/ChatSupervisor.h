#ifndef _ots_ChatSupervisor_h
#define _ots_ChatSupervisor_h

#include "otsdaq-core/CoreSupervisors/CoreSupervisorBase.h"


namespace ots
{

class ChatSupervisor: public CoreSupervisorBase
{

public:

    XDAQ_INSTANTIATOR();

    						ChatSupervisor            		(xdaq::ApplicationStub * s);
    virtual 				~ChatSupervisor   				(void);

    void 					destroy               			(void);

    virtual void 			defaultPage      				(xgi::Input* in, xgi::Output* out) override;
    virtual void			request         	 			(const std::string& requestType, cgicc::Cgicc& cgiIn, HttpXmlDocument& xmlOut, const WebUsers::RequestUserInfo& userInfo) override;

    virtual void			forceSupervisorPropertyValues	(void) override; //override to force supervisor property values (and ignore user settings)

private:


    //"Chat History" database associations ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    	//Maintain list of most recent chats and active display names
    		//keep for set period (e.g. 10 sec)
    		//each new chat is a string/displayName pair and is given a running index (0 is skipped)
	std::vector<std::string> 	ChatHistoryEntry_, ChatHistoryAuthor_;
	std::vector<time_t> 		ChatHistoryTime_;
	std::vector<uint64_t>		ChatHistoryIndex_;

	uint64_t					ChatLastUpdateIndex;

	std::vector<std::string> 	ChatUsers_;
	std::vector<time_t> 		ChatUsersTime_;

	enum {
		CHAT_HISTORY_EXPIRATION_TIME = 10, 		//10 seconds
		CHAT_HISTORY_MAX_ENTRIES = 100, 		//100 entries is vector max size
	};


	uint64_t					incrementAndGetLastUpdate();
	bool						isLastUpdateIndexStale(uint64_t last);
	bool						isChatOld(uint64_t chatIndex, uint64_t last);

	void						newUser(std::string user);
	void 						newChat(std::string chat, std::string user);
	void						removeChatHistoryEntry(uint64_t i);
	void						removeChatUserEntry(uint64_t i);
	void						cleanupExpiredChats();

	void 						insertActiveUsers(HttpXmlDocument *xmldoc);
	void 						insertChatRefresh(HttpXmlDocument *xmldoc, uint64_t lastUpdateIndex, std::string user);

	void 						escapeChat(std::string &chat);

};

}

#endif
