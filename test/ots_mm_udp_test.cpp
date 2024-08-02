
#include "test/ots_mm_udp_interface.h"

#include <unistd.h>
#include <iostream>


#include <string.h>  //for strstr (not the same as <string>)
#include <iostream>  //for cout
#include <sstream>   //for stringstream, std::stringbuf

#define TRACEMF_USE_VERBATIM 1 //for trace longer path filenames
#include "TRACE/tracemf.h"

#define __COUT_HDR__ 		""

#define Q(X) #X
#define QUOTE(X) Q(X)

#define TLOG(X)             std::cout << QUOTE(X) << ": " 
#define __FILENAME__ 		(__builtin_strrchr(__FILE__, '/') ? __builtin_strrchr(__FILE__, '/') + 1 : __FILE__)
#define __MF_SUBJECT__ 		__FILENAME__
#define __MF_DECOR__		(__MF_SUBJECT__)
#define __SHORTFILE__ 		(__builtin_strstr(&__FILE__[0], "/srcs/") ? __builtin_strstr(&__FILE__[0], "/srcs/") + 6 : __FILE__)
#define __COUT_HDR_L__ 		":" << std::dec        << __LINE__ << " |\t"
#define __COUT_HDR_FL__ 	__SHORTFILE__ << ""   << __COUT_HDR_L__
#define __COUT_ERR__ 		TLOG(TLVL_ERROR)    << __COUT_HDR__
#define __COUT_WARN__ 		TLOG(TLVL_WARN)     << __COUT_HDR__
#define __COUT_INFO__ 		TLOG(TLVL_INFO)     << __COUT_HDR__
#define __COUT__			TLOG(TLVL_DEBUG)    << __COUT_HDR__
#define __COUTT__			TLOG(TLVL_TRACE)    << __COUT_HDR__
//std::cout << __MF_DECOR__ << __COUT_HDR_FL__

#define __SS__            	std::stringstream ss; ss << "|" << __MF_DECOR__ << ": " << __COUT_HDR_FL__ << __COUT_HDR__
#define __SS_THROW__        { __COUT_ERR__ << "\n" << ss.str(); throw std::runtime_error(ss.str()); } //put in {}'s to prevent surprises, e.g. if ... else __SS_THROW__;
#define __SS_THROW_ONLY__   { throw std::runtime_error(ss.str()); } //put in {}'s to prevent surprises, e.g. if ... else __SS_THROW__;
#define __E__ 				std::endl

#define __COUTV__(X) 		__COUT__ << QUOTE(X) << " = " << X << __E__
#define __COUTVS__(LVL,X)	TLOG(TLVL_DEBUG + LVL) << __COUT_HDR__ << QUOTE(X) << " = " << X << __E__

int main(int argc, char* argv[])
{
    if(argc != 3)
	{
		fprintf(stderr, "usage: ots_mm_udp_interface <mm IP> <mm Port>\n");
		exit(1);
	}

    std::string target_mm_ip = argv[1];
    int target_mm_port = atoi(argv[2]);

    __COUTV__(target_mm_ip);
    __COUTV__(target_mm_port);

    ots_mm_udp_interface();
    return 0;
}