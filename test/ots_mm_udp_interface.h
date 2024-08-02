#ifndef _ots_mm_udp_interface_h_
#define _ots_mm_udp_interface_h_

#include <string>  //for string

class ots_mm_udp_interface
{
public:

	ots_mm_udp_interface();
	~ots_mm_udp_interface(void);

    std::string getCommands();
    std::string runCommand(const std::string& command);

}; //end ots_mm_udp_interface class declaration

#endif