#ifndef _ots_ConsoleSupervisor_h_
#define _ots_ConsoleSupervisor_h_

#include "otsdaq-core/CoreSupervisors/CoreSupervisorBase.h"

#include <mutex>  //for std::mutex

namespace ots
{
// ConsoleSupervisor
//	This class handles the presentation of Message Facility printouts to the web desktop
// Console
class ConsoleSupervisor : public CoreSupervisorBase
{
  public:
  public:
	XDAQ_INSTANTIATOR();

	ConsoleSupervisor(xdaq::ApplicationStub* s);
	virtual ~ConsoleSupervisor(void);

	void init(void);
	void destroy(void);

	virtual void defaultPage(xgi::Input* in, xgi::Output* out) override;
	virtual void request(const std::string&               requestType,
	                     cgicc::Cgicc&                    cgiIn,
	                     HttpXmlDocument&                 xmlOut,
	                     const WebUsers::RequestUserInfo& userInfo) override;

	virtual void forceSupervisorPropertyValues(void) override;  // override to force
	                                                            // supervisor property
	                                                            // values (and ignore user
	                                                            // settings)

  private:
	static void messageFacilityReceiverWorkLoop(ConsoleSupervisor* cs);
	void        insertMessageRefresh(HttpXmlDocument*   xmldoc,
	                                 const clock_t      lastUpdateClock,
	                                 const unsigned int lastUpdateIndex);

	// UDP Message Format:
	// UDPMFMESSAGE|TIMESTAMP|SEQNUM|HOSTNAME|HOSTADDR|SEVERITY|CATEGORY|APPLICATION|PID|ITERATION|MODULE|(FILE|LINE)|MESSAGE
	// FILE and LINE are only printed for s67+
	struct ConsoleMessageStruct
	{
		ConsoleMessageStruct()
		{
			buffer.resize(BUFFER_SZ);
			timeStamp  = 0;           // use this being 0 to indicate uninitialized
			countStamp = (time_t)-1;  // this is still a valid countStamp, just unlikely
			                          // to be reached

			// init fields to position -1 (for unknown)
			// NOTE: must be in order of appearance in buffer
			fields[SEQID].set("SequenceID", 2, -1);
			fields[LEVEL].set("Level", 5, -1);
			fields[LABEL].set("Label", 6, -1);
			fields[SOURCEID].set("SourceID", 7, -1);  // number
			fields[SOURCE].set("Source", 9, -1);
			//fields[MSG].set(
			 //   "Msg", 10, -1);
			// the message facility contents have changed!
#if MESSAGEFACILITY_HEX_VERSION >= 0x20201
			fields[MSG].set("Msg", 12, -1);
#else
			fields[MSG].set("Msg", 10, -1);
#endif
		}

		void set(const std::string& msg, const time_t count)
		{
			buffer = (std::string)(msg.substr(0, BUFFER_SZ));  // clip to BUFFER_SZ

			timeStamp  = time(0);  // get time of msg
			countStamp = count;    // get "unique" incrementing id for message

			// find fields
			int    i = 0, m = 0;
			size_t p = 0;

			// if first field is position 0, mark it complete
			if(fields[i].markerCount == 0)
				fields[i++].posInString = 0;

			// loop until no more markers
			while((p = buffer.find('|', p)) != std::string::npos)
			{
				++m;  // found next marker

				if(i < (int)fields.size() &&
				   m == fields[i].markerCount)  // found marker for field
					fields[i++].posInString =
					    p + 1;  // set position in string and move on to next field

				// change all | to \0 so strings are terminated
				buffer[p] = '\0';

				// handle special Level/Label case (where | is missing)
				if(i == LABEL && p + 1 + strlen(&buffer[p + 1]) != msg.length())
				{
					// std::cout << "LEN = " << strlen(&buffer[p+1]) << __E__;
					// std::cout << "buff = " <<(&buffer[p+1]) << __E__;
					fields[i++].posInString = p + 2 + strlen(&buffer[p + 1]);
				}
			}

			// debug
			//			std::cout << ":::::" << msg << "\n";
			//			for(auto &f: fields)
			//			{
			//				std::cout << f.fieldName << ": ";
			//				std::cout << (char *)&buffer[f.posInString] << std::endl;
			//			}
		}

		const char* getMsg() { return (char*)&buffer[fields[MSG].posInString]; }
		const char* getLabel() { return (char*)&buffer[fields[LABEL].posInString]; }
		const char* getLevel() { return (char*)&buffer[fields[LEVEL].posInString]; }
		const char* getSourceID() { return (char*)&buffer[fields[SOURCEID].posInString]; }
		const long long getSourceIDAsNumber()
		{
			// signed to allow -1 to ignore sequence number
			long long srcid;
			sscanf((char*)&buffer[fields[SOURCEID].posInString],
			       "%lld",
			       &srcid);  // signed long long
			return srcid;
		}
		const char* getSource() { return (char*)&buffer[fields[SOURCE].posInString]; }
		const char* getSequenceID() { return (char*)&buffer[fields[SEQID].posInString]; }
		const unsigned int getSequenceIDAsNumber()
		{
			unsigned long long longSeqid;
			sscanf((char*)&buffer[fields[SEQID].posInString],
			       "%llu",
			       &longSeqid);  // unsigned long long
			// Eric says this field is a "C++ int" which can change based on OS from 32 to
			// 64?...  then convert to unsigned int for our sanity
			return (unsigned int)longSeqid;
		}

		const char*  getField(int i) { return (char*)&buffer[fields[i].posInString]; }
		const time_t getTime() { return timeStamp; }
		const time_t getCount() { return countStamp; }

		// define field structure
		struct FieldStruct
		{
			void set(const std::string& fn, const int mc, const int ps)
			{
				fieldName   = fn;
				markerCount = mc;
				posInString = ps;
			}

			std::string fieldName;
			int         markerCount;
			int         posInString;
		};

		// define field index enum alias
		enum
		{  // must be in order of appearance in buffer
			SEQID,
			LEVEL,  // aka SEVERITY
			LABEL,
			SOURCEID,
			SOURCE,
			MSG,
		};

		const int                  BUFFER_SZ = 5000;
		std::array<FieldStruct, 6> fields;

	  private:
		std::string buffer;
		time_t      timeStamp;
		time_t      countStamp;
	};

	std::array<ConsoleMessageStruct, 100> messages_;
	std::mutex                            messageMutex_;
	volatile unsigned int writePointer_;  // use volatile to avoid compiler optimizations
	time_t                messageCount_;  //"unique" incrementing ID for messages

	// members for the refresh handler, ConsoleSupervisor::insertMessageRefresh
	unsigned int         refreshReadPointer_;
	char                 refreshTempStr_[50];
	unsigned int         refreshIndex_;
	xercesc::DOMElement* refreshParent_;
	time_t               refreshCurrentLastCount_;
};
}

#endif
