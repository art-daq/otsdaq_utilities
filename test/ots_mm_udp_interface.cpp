
#include "test/ots_mm_udp_interface.h"

#include <arpa/inet.h>
#include <errno.h>
#include <netdb.h>
#include <netinet/in.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <unistd.h>
#include <iostream>

#define HWPORT "4950"  // the port of the front end (hardware) target
#define MAXBUFLEN 1492

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

//==============================================================================
// get sockaddr, IPv4 or IPv6:
void* get_in_addr(struct sockaddr* sa)
{
	if(sa->sa_family == AF_INET)
	{
		return &(((struct sockaddr_in*)sa)->sin_addr);
	}

	return &(((struct sockaddr_in6*)sa)->sin6_addr);
}

//==============================================================================
int makeSocket(char* ip, int /*port*/)
{
	int             sockfd;
	struct addrinfo hints, *servinfo, *p;
	int             rv;
	// int                     numbytes;
	// struct sockaddr_storage their_addr;
	// socklen_t               addr_len;
	// char                    s[INET6_ADDRSTRLEN];

	memset(&hints, 0, sizeof hints);
	hints.ai_family   = AF_UNSPEC;
	hints.ai_socktype = SOCK_DGRAM;

	if((rv = getaddrinfo(ip, HWPORT, &hints, &servinfo)) != 0)
	{
		fprintf(stderr, "getaddrinfo: %s\n", gai_strerror(rv));
		return 1;
	}

	// loop through all the results and make a socket
	for(p = servinfo; p != NULL; p = p->ai_next)
	{
		if((sockfd = socket(p->ai_family, p->ai_socktype, p->ai_protocol)) == -1)
		{
			perror("sw: socket");
			continue;
		}

		break;
	}

	if(p == NULL)
	{
		fprintf(stderr, "sw: failed to create socket\n");
		return 2;
	}

	freeaddrinfo(servinfo);

	return sockfd;
}

//==============================================================================
ots_mm_udp_interface::ots_mm_udp_interface()
{
    std::cout << "Constructor";
} //end constructor()


//==============================================================================
ots_mm_udp_interface::~ots_mm_udp_interface()
{
    std::cout << "Destructor";
} //end destructor()

//==============================================================================
std::string ots_mm_udp_interface::getCommands()
{
    __COUT__ << "getCommands" << __E__;
	return "command list";
} //end getCommands()

//==============================================================================
std::string ots_mm_udp_interface::runCommand(const std::string& command)
{
    __COUT__ << "runCommand: " << command << __E__;
	std::string returnString = command;
	return returnString;
} //end runCommand()