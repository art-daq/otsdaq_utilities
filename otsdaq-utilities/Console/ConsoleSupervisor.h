#ifndef _ots_ConsoleSupervisor_h_
#define _ots_ConsoleSupervisor_h_

#include <boost/regex.hpp>
#include <boost/tokenizer.hpp>
#include "otsdaq/CoreSupervisors/CoreSupervisorBase.h"

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
	void insertMessageRefresh(HttpXmlDocument* xmldoc, const size_t lastUpdateCount);

	// UDP Message Format:
	// UDPMFMESSAGE|TIMESTAMP|SEQNUM|HOSTNAME|HOSTADDR|SEVERITY|CATEGORY|APPLICATION|PID|ITERATION|MODULE|(FILE|LINE)|MESSAGE
	// FILE and LINE are only printed for s67+
	struct ConsoleMessageStruct
	{
		ConsoleMessageStruct(const std::string& msg, const size_t count)
		    : countStamp(count)
		{
			std::string hostname, category, application, message, hostaddr, file, line,
			    module, eventID;
			mf::ELseverityLevel sev;
			timeval             tv     = {0, 0};
			int                 pid    = 0;
			int                 seqNum = 0;

			boost::regex timestamp_regex_("(\\d{2}-[^-]*-\\d{4}\\s\\d{2}:\\d{2}:\\d{2})");
			boost::regex file_line_regex_("^\\s*([^:]*\\.[^:]{1,3}):(\\d+)(.*)");

			boost::char_separator<char> sep("|", "", boost::keep_empty_tokens);
			typedef boost::tokenizer<boost::char_separator<char>> tokenizer;
			tokenizer                                             tokens(msg, sep);
			tokenizer::iterator                                   it = tokens.begin();

			// There may be syslog garbage in the first token before the timestamp...
			boost::smatch res;
			while(it != tokens.end() && !boost::regex_search(*it, res, timestamp_regex_))
			{
				++it;
			}

			struct tm   tm;
			time_t      t;
			std::string value(res[1].first, res[1].second);
			strptime(value.c_str(), "%d-%b-%Y %H:%M:%S", &tm);
			tm.tm_isdst = -1;
			t           = mktime(&tm);
			tv.tv_sec   = t;
			tv.tv_usec  = 0;
			auto prevIt = it;
			try
			{
				if(it != tokens.end() && ++it != tokens.end() /* Advances it */)
				{
					seqNum = std::stoi(*it);
				}
			}
			catch(const std::invalid_argument& e)
			{
				it = prevIt;
			}
			if(it != tokens.end() && ++it != tokens.end() /* Advances it */)
			{
				hostname = *it;
			}
			if(it != tokens.end() && ++it != tokens.end() /* Advances it */)
			{
				hostaddr = *it;
			}
			if(it != tokens.end() && ++it != tokens.end() /* Advances it */)
			{
				sev = mf::ELseverityLevel(*it);
			}
			if(it != tokens.end() && ++it != tokens.end() /* Advances it */)
			{
				category = *it;
			}
			if(it != tokens.end() && ++it != tokens.end() /* Advances it */)
			{
				application = *it;
			}
			prevIt = it;
			try
			{
				if(it != tokens.end() && ++it != tokens.end() /* Advances it */)
				{
					pid = std::stol(*it);
				}
			}
			catch(const std::invalid_argument& e)
			{
				it = prevIt;
			}
			if(it != tokens.end() && ++it != tokens.end() /* Advances it */)
			{
				eventID = *it;
			}
			if(it != tokens.end() && ++it != tokens.end() /* Advances it */)
			{
				module = *it;
			}
			if(it != tokens.end() && ++it != tokens.end() /* Advances it */)
			{
				file = *it;
			}
			if(it != tokens.end() && ++it != tokens.end() /* Advances it */)
			{
				line = *it;
			}
			std::ostringstream oss;
			bool               first = true;
			while(it != tokens.end() && ++it != tokens.end() /* Advances it */)
			{
				if(!first)
				{
					oss << "|";
				}
				else
				{
					first = false;
				}
				oss << *it;
			}
			message = oss.str();

			// init fields to position -1 (for unknown)s
			// NOTE: must be in order of appearance in buffer
			fields[FieldType::TIMESTAMP].set("Timestamp", 1, std::to_string(tv.tv_sec));
			fields[FieldType::SEQID].set("SequenceID", 2, std::to_string(seqNum));
			fields[FieldType::LEVEL].set("Level", 5, sev.getName());
			fields[FieldType::LABEL].set("Label", 6, category);
			fields[FieldType::SOURCEID].set(
			    "SourceID", 7, std::to_string(pid));  // number
			fields[FieldType::SOURCE].set("Source", 9, application);
			fields[FieldType::FILE].set("File", 10, file);
			fields[FieldType::LINE].set("Line", 11, line);
			fields[FieldType::MSG].set("Msg", 12, message);

#if 0
			for (auto& field : fields) {
				std::cout << "Field " << field.second.fieldName << ": " << field.second.fieldValue
				          << std::endl;
			}
#endif
		}

		std::string getTime() const { return fields[FieldType::TIMESTAMP].fieldValue; }
		std::string getMsg() const { return fields[FieldType::MSG].fieldValue; }
		std::string getLabel() const { return fields[FieldType::LABEL].fieldValue; }
		std::string getLevel() const { return fields[FieldType::LEVEL].fieldValue; }

		std::string getFile() const { return fields[FieldType::FILE].fieldValue; }
		std::string getLine() const { return fields[FieldType::LINE].fieldValue; }

		std::string getSourceID() const { return fields[FieldType::SOURCEID].fieldValue; }
		uint32_t    getSourceIDAsNumber() const
		{
			auto val = fields[FieldType::SOURCEID].fieldValue;
			if(val != "")
			{
				return std::stoul(val);
			}
			return 0;
		}
		std::string getSource() const { return fields[FieldType::SOURCE].fieldValue; }
		std::string getSequenceID() const { return fields[FieldType::SEQID].fieldValue; }
		size_t      getSequenceIDAsNumber() const
		{
			auto val = fields[FieldType::SEQID].fieldValue;
			if(val != "")
			{
				return std::stoul(val);
			}
			return 0;
		}

		const size_t getCount() const { return countStamp; }

		// define field structure
		struct FieldStruct
		{
			void set(const std::string& fn, const int mc, const std::string& fv)
			{
				fieldName   = fn;
				fieldValue  = fv;
				markerCount = mc;
			}

			std::string fieldName;
			std::string fieldValue;
			int         markerCount;
		};

		// define field index enum alias
		enum class FieldType
		{  // must be in order of appearance in buffer
			TIMESTAMP,
			SEQID,
			LEVEL,  // aka SEVERITY
			LABEL,
			SOURCEID,
			SOURCE,
			FILE,
			LINE,
			MSG,
		};

		mutable std::unordered_map<FieldType, FieldStruct> fields;

	  private:
		size_t countStamp;
	};

	std::deque<ConsoleMessageStruct> messages_;
	std::mutex                       messageMutex_;
	size_t messageCount_;  //"unique" incrementing ID for messages
	size_t maxMessageCount_;

	// members for the refresh handler, ConsoleSupervisor::insertMessageRefresh
	xercesc::DOMElement* refreshParent_;
	size_t               refreshCurrentLastCount_;
};
}  // namespace ots

#endif
