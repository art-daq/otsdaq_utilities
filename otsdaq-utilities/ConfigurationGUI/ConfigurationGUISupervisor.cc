#include "otsdaq-utilities/ConfigurationGUI/ConfigurationGUISupervisor.h"

#include "otsdaq/CgiDataUtilities/CgiDataUtilities.h"
#include "otsdaq/Macros/CoutMacros.h"
#include "otsdaq/MessageFacility/MessageFacility.h"
#include "otsdaq/TablePlugins/IterateTable.h"
#include "otsdaq/XmlUtilities/HttpXmlDocument.h"

#include <boost/stacktrace.hpp>

#include "otsdaq/GatewaySupervisor/GatewaySupervisor.h"  //for saveModifiedVersionXML()
#include "otsdaq/TablePlugins/ARTDAQTableBase/ARTDAQTableBase.h"  //for artdaq extraction
#include "otsdaq/TablePlugins/XDAQContextTable/XDAQContextTable.h"  //for context relaunch

#include <xdaq/NamespaceURI.h>

#include <iostream>
#include <map>
#include <utility>

using namespace ots;

#undef __MF_SUBJECT__
#define __MF_SUBJECT__ "CfgGUI"

#define TABLE_INFO_PATH std::string(__ENV__("TABLE_INFO_PATH")) + "/"
#define TABLE_INFO_EXT std::string("Info.xml")

#define ARTDAQ_CONFIG_LAYOUTS_PATH \
	std::string(__ENV__("SERVICE_DATA_PATH")) + "/ConfigurationGUI_artdaqLayouts/"

/*! the XDAQ_INSTANTIATOR_IMPL(ns1::ns2::...) macro needs to be put into the
 * implementation file (.cc) of the XDAQ application */
xdaq::Application* ConfigurationGUISupervisor::instantiate(xdaq::ApplicationStub* stub)
{
	return new ConfigurationGUISupervisor(stub);
}

//==============================================================================
// new user gets a table mgr assigned
// user can fill any of the tables (fill from version or init empty), which becomes the
// active view for that table
ConfigurationGUISupervisor::ConfigurationGUISupervisor(xdaq::ApplicationStub* stub)
    : CoreSupervisorBase(stub)
{
	__SUP_COUT__ << "Constructor started." << __E__;

	INIT_MF("." /*directory used is USER_DATA/LOG/.*/);

	// make macro directories in case they don't exist
	mkdir(((std::string)ARTDAQ_CONFIG_LAYOUTS_PATH).c_str(), 0755);

	init();
	__SUP_COUT__ << "Constructor complete." << __E__;
}  // end constructor()

//==============================================================================
ConfigurationGUISupervisor::~ConfigurationGUISupervisor(void) { destroy(); }

//==============================================================================
void ConfigurationGUISupervisor::init(void)
{
	__SUP_COUT__ << "Initializing..." << __E__;

	__SUP_COUT__ << "Activating saved context, which may prepare for normal mode..."
	             << __E__;
	try
	{
		testXDAQContext();  // test context group activation
		// theRemoteWebUsers_.sendSystemMessage("tracker:10","My Subject","This is my
		// body",false /*doEmail*/); theRemoteWebUsers_.sendSystemMessage("Ryan","My
		// Subject Dude","This is my body",false /*doEmail*/);
		// theRemoteWebUsers_.sendSystemMessage("*","My Rad Subject","This is my
		// body",false /*doEmail*/);

		__SUP_COUT__ << "Done with test context." << __E__;
	}
	catch(...)
	{
		__COUT_WARN__ << "Failed test context group activation. otsdaq, in Normal mode, "
		                 "will not launch when this test fails. "
		              << "Check the active context group from within Wizard Mode."
		              << __E__;
	}
}  // end init()

//==============================================================================
void ConfigurationGUISupervisor::destroy(void)
{
	// called by destructor
	for(std::map<std::string, ConfigurationManagerRW*>::iterator it =
	        userConfigurationManagers_.begin();
	    it != userConfigurationManagers_.end();
	    ++it)
	{
		delete it->second;
		it->second = 0;
	}
	userConfigurationManagers_.clear();

	if(ConfigurationInterface::getInstance(true) != 0)
		delete ConfigurationInterface::getInstance(true);
}  // end destroy()

//==============================================================================
void ConfigurationGUISupervisor::defaultPage(xgi::Input* in, xgi::Output* out)
{
	cgicc::Cgicc cgiIn(in);
	std::string  configWindowName =
	    CgiDataUtilities::getData(cgiIn, "configWindowName");  // from GET
	if(configWindowName == "tableEditor")
		*out << "<!DOCTYPE HTML><html lang='en'><frameset col='100%' row='100%'><frame "
		        "src='/WebPath/html/ConfigurationTableEditor.html?urn="
		     << this->getApplicationDescriptor()->getLocalId() << "'></frameset></html>";
	if(configWindowName == "iterate")
		*out << "<!DOCTYPE HTML><html lang='en'><frameset col='100%' row='100%'><frame "
		        "src='/WebPath/html/Iterate.html?urn="
		     << this->getApplicationDescriptor()->getLocalId() << "'></frameset></html>";
	else
		*out << "<!DOCTYPE HTML><html lang='en'><frameset col='100%' row='100%'><frame "
		        "src='/WebPath/html/ConfigurationGUI.html?urn="
		     << this->getApplicationDescriptor()->getLocalId() << "'></frameset></html>";
}  // end defaultPage()

//==============================================================================
// When overriding, setup default property values here
// called by CoreSupervisorBase constructor
void ConfigurationGUISupervisor::setSupervisorPropertyDefaults(void)
{
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.UserPermissionsThreshold,
	    "*=10 | deleteTreeNodeRecords=255 | saveTableInfo=255 | "
	    "deleteTableInfo=255");  // experienced users to edit, admins to delete
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.RequireUserLockRequestTypes,
	    "*");  // all
}  // end setSupervisorPropertyDefaults()

//==============================================================================
// forceSupervisorPropertyValues
//		override to force supervisor property values (and ignore user settings)
void ConfigurationGUISupervisor::forceSupervisorPropertyValues()
{
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.AutomatedRequestTypes,
	    "getActiveTableGroups");  // none
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.CheckUserLockRequestTypes,
	    "*");  // all
}  // end forceSupervisorPropertyValues()

//==============================================================================
void ConfigurationGUISupervisor::request(const std::string&               requestType,
                                         cgicc::Cgicc&                    cgiIn,
                                         HttpXmlDocument&                 xmlOut,
                                         const WebUsers::RequestUserInfo& userInfo)
try
{
	// Commands

	//	gatewayLaunchOTS -- and other StartOTS commands

	//	saveTableInfo
	//	deleteTableInfo
	// 	flattenToSystemAliases
	// 	versionTracking
	//	getColumnTypes
	//	getGroupAliases
	//	setGroupAliasInActiveBackbone
	//	setTableAliasInActiveBackbone
	//	setAliasOfGroupMembers
	//	getVersionAliases
	//	getTableGroups
	//	getTableGroupType
	//	getTables
	//	getContextMemberNames
	//	getBackboneMemberNames
	//	getIterateMemberNames
	//	getSpecificTableGroup
	//	saveNewTableGroup
	//	getSpecificTable
	//	saveSpecificTable
	//	clearTableTemporaryVersions
	//	clearTableCachedVersions
	//
	//		---- associated with JavaScript Table API
	//	getTreeView
	//	getTreeNodeCommonFields
	//	getUniqueFieldValuesForRecords
	//	getTreeNodeFieldValues
	//	setTreeNodeFieldValues
	//	addTreeNodeRecords
	//	deleteTreeNodeRecords
	//	renameTreeNodeRecords
	//	copyTreeNodeRecords
	//		---- end associated with JavaScript Table API
	//
	//		---- associated with JavaScript artdaq API
	//	getArtdaqNodes
	//	saveArtdaqNodes
	//  loadArtdaqNodeLayout
	//  saveArtdaqNodeLayout
	//		---- end associated with JavaScript artdaq API
	//
	//	activateTableGroup
	//	getActiveTableGroups
	//  copyViewToCurrentColumns
	//	saveTreeNodeEdit
	//	getAffectedActiveGroups
	// 	getLinkToChoices
	//	getLastTableGroups
	//	mergeGroups
	//
	//		---- associated with JavaScript Iterate App
	//	savePlanCommandSequence
	//		---- end associated with JavaScript Iterate App

	// acquire user's configuration manager based on username&  activeSessionIndex
	std::string refresh = CgiDataUtilities::getData(cgiIn, "refresh");  // from GET
	
	// refresh to reload from info files and db (maintains temporary views!)
	ConfigurationManagerRW* cfgMgr = refreshUserSession(
	    userInfo.username_, userInfo.activeUserSessionIndex_, (refresh == "1"));

	if(requestType == "saveTableInfo")
	{
		std::string tableName =
		    CgiDataUtilities::getData(cgiIn, "tableName");  // from GET
		std::string columnCSV =
		    CgiDataUtilities::postData(cgiIn, "columnCSV");  // from POST
		std::string allowOverwrite =
		    CgiDataUtilities::getData(cgiIn, "allowOverwrite");  // from GET
		std::string tableDescription =
		    CgiDataUtilities::postData(cgiIn, "tableDescription");  // from POST
		std::string columnChoicesCSV =
		    CgiDataUtilities::postData(cgiIn, "columnChoicesCSV");  // from POST

		__SUP_COUT__ << "tableName: " << tableName << __E__;
		__SUP_COUT__ << "columnCSV: " << columnCSV << __E__;
		__SUP_COUT__ << "tableDescription: " << tableDescription << __E__;
		__SUP_COUT__ << "columnChoicesCSV: " << columnChoicesCSV << __E__;
		__SUP_COUT__ << "allowOverwrite: " << allowOverwrite << __E__;

		if(!allSupervisorInfo_.isWizardMode())
		{
			__SUP_SS__ << "Improper permissions for saving table info." << __E__;
			xmlOut.addTextElementToData("Error", ss.str());
		}
		else
			handleSaveTableInfoXML(xmlOut,
			                       cfgMgr,
			                       tableName,
			                       columnCSV,
			                       tableDescription,
			                       columnChoicesCSV,
			                       allowOverwrite == "1");
	}
	else if(requestType == "deleteTableInfo")
	{
		std::string tableName =
		    CgiDataUtilities::getData(cgiIn, "tableName");  // from GET
		__SUP_COUT__ << "tableName: " << tableName << __E__;
		handleDeleteTableInfoXML(xmlOut, cfgMgr, tableName);
	}
	else if(requestType == "gatewayLaunchOTS" || requestType == "gatewayLaunchWiz" ||
	        requestType == "flattenToSystemAliases")
	{
		// NOTE: similar to Supervisor version but does not keep active sessions
		__SUP_COUT_WARN__ << requestType << " command received! " << __E__;
		__MOUT_WARN__ << requestType << " command received! " << __E__;

		// now launch
		__SUP_COUT_INFO__ << "Launching " << requestType << "... " << __E__;

		__SUP_COUT__ << "Extracting target context hostnames... " << __E__;
		std::vector<std::string> hostnames;

		// flattenToSystemAliases should always work in wiz mode!
		if(requestType == "flattenToSystemAliases" &&
		   CorePropertySupervisorBase::allSupervisorInfo_.isWizardMode())
		{
			hostnames.push_back(__ENV__("OTS_CONFIGURATION_WIZARD_SUPERVISOR_SERVER"));
			__SUP_COUT__ << "hostname = " << hostnames.back() << __E__;
		}
		else
		{
			try
			{
				cfgMgr->init();  // completely reset to re-align with any changes

				const XDAQContextTable* contextTable =
				    cfgMgr->__GET_CONFIG__(XDAQContextTable);

				auto         contexts = contextTable->getContexts();
				unsigned int i, j;
				for(const auto& context : contexts)
				{
					if(!context.status_)
						continue;

					// find last slash
					j = 0;  // default to whole string
					for(i = 0; i < context.address_.size(); ++i)
						if(context.address_[i] == '/')
							j = i + 1;
					hostnames.push_back(context.address_.substr(j));
					__SUP_COUT__ << "hostname = " << hostnames.back() << __E__;
				}
			}
			catch(...)
			{
				__SUP_SS__ << "The Configuration Manager could not be initialized to "
				              "extract contexts."
				           << __E__;

				__SUP_COUT_ERR__ << "\n" << ss.str();
				return;
			}
		}

		if(hostnames.size() == 0)
		{
			__SUP_SS__ << "No hostnames found to launch command '" + requestType +
			                  "'... Is there a valid Context group activated?"
			           << __E__;
			__SUP_COUT_ERR__ << "\n" << ss.str();

			xmlOut.addTextElementToData("Error", ss.str());
		}

		for(const auto& hostname : hostnames)
		{
			std::string fn = (std::string(__ENV__("SERVICE_DATA_PATH")) +
			                  "/StartOTS_action_" + hostname + ".cmd");
			FILE*       fp = fopen(fn.c_str(), "w");
			if(fp)
			{
				if(requestType == "gatewayLaunchOTS")
					fprintf(fp, "LAUNCH_OTS");
				else if(requestType == "gatewayLaunchWiz")
					fprintf(fp, "LAUNCH_WIZ");
				else if(requestType == "flattenToSystemAliases")
				{
					fprintf(fp, "FLATTEN_TO_SYSTEM_ALIASES");
					fclose(fp);
					break;  // only do at one host
				}

				fclose(fp);
			}
			else
				__SUP_COUT_ERR__ << "Unable to open command file: " << fn << __E__;
		}
	}
	else if(requestType == "versionTracking")
	{
		std::string type = CgiDataUtilities::getData(cgiIn, "Type");  // from GET
		__SUP_COUT__ << "type: " << type << __E__;

		if(type == "Get")
			xmlOut.addTextElementToData(
			    "versionTrackingStatus",
			    ConfigurationInterface::isVersionTrackingEnabled() ? "ON" : "OFF");
		else if(type == "ON")
		{
			ConfigurationInterface::setVersionTrackingEnabled(true);
			xmlOut.addTextElementToData(
			    "versionTrackingStatus",
			    ConfigurationInterface::isVersionTrackingEnabled() ? "ON" : "OFF");
		}
		else if(type == "OFF")
		{
			ConfigurationInterface::setVersionTrackingEnabled(false);
			xmlOut.addTextElementToData(
			    "versionTrackingStatus",
			    ConfigurationInterface::isVersionTrackingEnabled() ? "ON" : "OFF");
		}
	}
	else if(requestType == "getColumnTypes")
	{
		// return the possible column types and their defaults
		std::vector<std::string> allTypes = TableViewColumnInfo::getAllTypesForGUI();
		std::vector<std::string> allDataTypes =
		    TableViewColumnInfo::getAllDataTypesForGUI();
		std::map<std::pair<std::string, std::string>, std::string> allDefaults =
		    TableViewColumnInfo::getAllDefaultsForGUI();
		// TODO maybe here a new function will be needed to get allminmaxforGUI
		for(const auto& type : allTypes)
			xmlOut.addTextElementToData("columnTypeForGUI", type);
		for(const auto& dataType : allDataTypes)
			xmlOut.addTextElementToData("columnDataTypeForGUI", dataType);

		for(const auto& colDefault : allDefaults)
		{
			xmlOut.addTextElementToData("columnDefaultDataType", colDefault.first.first);
			xmlOut.addTextElementToData("columnDefaultTypeFilter",
			                            colDefault.first.second);
			xmlOut.addTextElementToData("columnDefaultValue", colDefault.second);
		}
		// TODO add min and max responses.
	}
	else if(requestType == "getGroupAliases")
	{
		// Since this is called from setting up System View in the table GUI
		//	give option for reloading "persistent" active configurations
		bool reloadActive =
		    1 == CgiDataUtilities::getDataAsInt(cgiIn, "reloadActiveGroups");  // from GET

		__SUP_COUT__ << "reloadActive: " << reloadActive << __E__;		
		if(reloadActive)
		{
			try
			{
				cfgMgr->clearAllCachedVersions();
				cfgMgr->restoreActiveTableGroups(true);
			}
			catch(std::runtime_error& e)
			{
				__SUP_SS__ << ("Error loading active groups!\n\n" + std::string(e.what()))
				           << __E__;
				__SUP_COUT_ERR__ << "\n" << ss.str();
				xmlOut.addTextElementToData("Error", ss.str());
			}
			catch(...)
			{
				__SUP_SS__ << ("Error loading active groups!\n\n") << __E__;
				__SUP_COUT_ERR__ << "\n" << ss.str();
				xmlOut.addTextElementToData("Error", ss.str());
			}
		}

		handleGroupAliasesXML(xmlOut, cfgMgr);
	}
	else if(requestType == "setGroupAliasInActiveBackbone")
	{
		std::string groupAlias =
		    CgiDataUtilities::getData(cgiIn, "groupAlias");  // from GET
		std::string groupName = CgiDataUtilities::getData(cgiIn, "groupName");  // from
		                                                                        // GET
		std::string groupKey = CgiDataUtilities::getData(cgiIn, "groupKey");  // from GET

		__SUP_COUT__ << "groupAlias: " << groupAlias << __E__;
		__SUP_COUT__ << "groupName: " << groupName << __E__;
		__SUP_COUT__ << "groupKey: " << groupKey << __E__;

		handleSetGroupAliasInBackboneXML(xmlOut,
		                                 cfgMgr,
		                                 groupAlias,
		                                 groupName,
		                                 TableGroupKey(groupKey),
		                                 userInfo.username_);
	}
	else if(requestType == "setTableAliasInActiveBackbone")
	{
		std::string tableAlias =
		    CgiDataUtilities::getData(cgiIn, "tableAlias");  // from GET
		std::string tableName =
		    CgiDataUtilities::getData(cgiIn, "tableName");                  // from GET
		std::string version = CgiDataUtilities::getData(cgiIn, "version");  // from GET

		__SUP_COUT__ << "tableAlias: " << tableAlias << __E__;
		__SUP_COUT__ << "tableName: " << tableName << __E__;
		__SUP_COUT__ << "version: " << version << __E__;

		handleSetTableAliasInBackboneXML(xmlOut,
		                                   cfgMgr,
		                                   tableAlias,
		                                   tableName,
		                                   TableVersion(version),
		                                   userInfo.username_);
	}
	else if(requestType == "setAliasOfGroupMembers")
	{
		std::string versionAlias =
		    CgiDataUtilities::getData(cgiIn, "versionAlias");  // from GET
		std::string groupName = CgiDataUtilities::getData(cgiIn, "groupName");  // from
		                                                                        // GET
		std::string groupKey = CgiDataUtilities::getData(cgiIn, "groupKey");  // from GET

		__SUP_COUT__ << "versionAlias: " << versionAlias << __E__;
		__SUP_COUT__ << "groupName: " << groupName << __E__;
		__SUP_COUT__ << "groupKey: " << groupKey << __E__;

		handleAliasGroupMembersInBackboneXML(xmlOut,
		                                     cfgMgr,
		                                     versionAlias,
		                                     groupName,
		                                     TableGroupKey(groupKey),
		                                     userInfo.username_);
	}
	else if(requestType == "getVersionAliases")
	{
		handleVersionAliasesXML(xmlOut, cfgMgr);
	}
	else if(requestType == "getTableGroups")
	{
		bool doNotReturnMembers =
		    CgiDataUtilities::getDataAsInt(cgiIn, "doNotReturnMembers") == 1
		        ? true
		        : false;  // from GET

		__SUP_COUT__ << "doNotReturnMembers: " << doNotReturnMembers << __E__;
		handleTableGroupsXML(xmlOut, cfgMgr, !doNotReturnMembers);
	}
	else if(requestType == "getTableGroupType")
	{
		std::string tableList =
		    CgiDataUtilities::postData(cgiIn, "tableList");  // from POST
		__SUP_COUT__ << "tableList: " << tableList << __E__;

		handleGetTableGroupTypeXML(xmlOut, cfgMgr, tableList);
	}
	else if(requestType == "getTables")
	{
		std::string allowIllegalColumns =
		    CgiDataUtilities::getData(cgiIn, "allowIllegalColumns");  // from GET

		__SUP_COUT__ << "allowIllegalColumns: " << allowIllegalColumns << __E__;

		handleTablesXML(xmlOut, cfgMgr, allowIllegalColumns == "1");
	}
	else if(requestType == "getContextMemberNames")
	{
		std::set<std::string> members = cfgMgr->getContextMemberNames();

		for(auto& member : members)
			xmlOut.addTextElementToData("ContextMember", member);
	}
	else if(requestType == "getBackboneMemberNames")
	{
		std::set<std::string> members = cfgMgr->getBackboneMemberNames();

		for(auto& member : members)
			xmlOut.addTextElementToData("BackboneMember", member);
	}
	else if(requestType == "getIterateMemberNames")
	{
		std::set<std::string> members = cfgMgr->getIterateMemberNames();

		for(auto& member : members)
			xmlOut.addTextElementToData("IterateMember", member);
	}
	else if(requestType == "getSpecificTableGroup")
	{
		std::string groupName = CgiDataUtilities::getData(cgiIn, "groupName");  // from
		                                                                        // GET
		std::string groupKey = CgiDataUtilities::getData(cgiIn, "groupKey");  // from GET

		__SUP_COUT__ << "groupName: " << groupName << __E__;
		__SUP_COUT__ << "groupKey: " << groupKey << __E__;

		ConfigurationSupervisorBase::handleGetTableGroupXML(
		    xmlOut, cfgMgr, groupName, TableGroupKey(groupKey));
	}
	else if(requestType == "saveNewTableGroup")
	{
		std::string groupName = CgiDataUtilities::getData(cgiIn, "groupName");  // from
		                                                                        // GET
		bool ignoreWarnings =
		    CgiDataUtilities::getDataAsInt(cgiIn, "ignoreWarnings");  // from GET
		bool allowDuplicates =
		    CgiDataUtilities::getDataAsInt(cgiIn, "allowDuplicates");  // from GET
		bool lookForEquivalent =
		    CgiDataUtilities::getDataAsInt(cgiIn, "lookForEquivalent");  // from GET
		std::string tableList =
		    CgiDataUtilities::postData(cgiIn, "tableList");  // from POST
		std::string comment =
		    CgiDataUtilities::getData(cgiIn, "groupComment");  // from GET

		__SUP_COUT__ << "saveNewTableGroup: " << groupName << __E__;
		__SUP_COUT__ << "tableList: " << tableList << __E__;
		__SUP_COUT__ << "ignoreWarnings: " << ignoreWarnings << __E__;
		__SUP_COUT__ << "allowDuplicates: " << allowDuplicates << __E__;
		__SUP_COUT__ << "lookForEquivalent: " << lookForEquivalent << __E__;
		__SUP_COUT__ << "comment: " << comment << __E__;

		ConfigurationSupervisorBase::handleCreateTableGroupXML(xmlOut,
		                                                       cfgMgr,
		                                                       groupName,
		                                                       tableList,
		                                                       allowDuplicates,
		                                                       ignoreWarnings,
		                                                       comment,
		                                                       lookForEquivalent);
	}
	else if(requestType == "getSpecificTable")
	{
		std::string tableName =
		    CgiDataUtilities::getData(cgiIn, "tableName");                     // from GET
		std::string versionStr = CgiDataUtilities::getData(cgiIn, "version");  // from GET
		int dataOffset = CgiDataUtilities::getDataAsInt(cgiIn, "dataOffset");  // from GET
		int chunkSize  = CgiDataUtilities::getDataAsInt(cgiIn, "chunkSize");   // from GET

		std::string allowIllegalColumns =
		    CgiDataUtilities::getData(cgiIn, "allowIllegalColumns");  // from GET
		__SUP_COUT__ << "allowIllegalColumns: " << (allowIllegalColumns == "1") << __E__;

		std::string rawData = CgiDataUtilities::getData(cgiIn, "rawData");  // from GET
		__SUP_COUT__ << "rawData: " << (rawData == "1") << __E__;

		__SUP_COUT__ << "getSpecificTable: " << tableName << " versionStr: " << versionStr
		             << " chunkSize: " << chunkSize << " dataOffset: " << dataOffset
		             << __E__;

		TableVersion                            version;
		const std::map<std::string, TableInfo>& allTableInfo = cfgMgr->getAllTableInfo();
		std::string                             versionAlias;

		if(allTableInfo.find(tableName) != allTableInfo.end())
		{
			if(versionStr == "" &&  // take latest version if no version specified
			   allTableInfo.at(tableName).versions_.size())
				version = *(allTableInfo.at(tableName).versions_.rbegin());
			else if(versionStr.find(ConfigurationManager::ALIAS_VERSION_PREAMBLE) == 0)
			{
				// convert alias to version
				std::map<std::string /*table*/,
				         std::map<std::string /*alias*/, TableVersion>>
				    versionAliases = cfgMgr->getVersionAliases();

				versionAlias = versionStr.substr(
				    ConfigurationManager::ALIAS_VERSION_PREAMBLE.size());
				//			if(versionAlias ==
				// ConfigurationManager::SCRATCH_VERSION_ALIAS)
				////NOT NEEDED IF SCRATCH IS ALWAYS ALIAS
				//			{
				//				version = TableVersion::SCRATCH;
				//				__SUP_COUT__ << "version alias translated to: " << version
				//<<
				//__E__;
				//			}
				//			else
				if(versionAliases.find(tableName) != versionAliases.end() &&
				   versionAliases[tableName].find(versionStr.substr(
				       ConfigurationManager::ALIAS_VERSION_PREAMBLE.size())) !=
				       versionAliases[tableName].end())
				{
					version = versionAliases[tableName][versionStr.substr(
					    ConfigurationManager::ALIAS_VERSION_PREAMBLE.size())];
					__SUP_COUT__ << "version alias translated to: " << version << __E__;
				}
				else
					__SUP_COUT_WARN__
					    << "version alias '"
					    << versionStr.substr(
					           ConfigurationManager::ALIAS_VERSION_PREAMBLE.size())
					    << "'was not found in active version aliases!" << __E__;
			}
			else  // else take specified version
				version = atoi(versionStr.c_str());
		}

		__SUP_COUT__ << "version: " << version << __E__;

		handleGetTableXML(xmlOut,
		                  cfgMgr,
		                  tableName,
		                  TableVersion(version),
		                  (allowIllegalColumns == "1"),
		                  (rawData == "1"));
		// append author column default value
		xmlOut.addTextElementToData("DefaultRowValue", userInfo.username_);
	}
	else if(requestType == "saveSpecificTable")
	{
		std::string tableName =
		    CgiDataUtilities::getData(cgiIn, "tableName");                     // from GET
		int version    = CgiDataUtilities::getDataAsInt(cgiIn, "version");     // from GET
		int dataOffset = CgiDataUtilities::getDataAsInt(cgiIn, "dataOffset");  // from GET
		bool sourceTableAsIs =
		    CgiDataUtilities::getDataAsInt(cgiIn, "sourceTableAsIs");  // from GET
		bool lookForEquivalent =
		    CgiDataUtilities::getDataAsInt(cgiIn, "lookForEquivalent");      // from GET
		int temporary = CgiDataUtilities::getDataAsInt(cgiIn, "temporary");  // from GET
		std::string comment =
		    CgiDataUtilities::getData(cgiIn, "tableComment");  // from GET

		std::string data = CgiDataUtilities::postData(cgiIn, "data");  // from POST
		// data format: commas and semi-colons indicate new row
		// r0c0,r0c1,...,r0cN,;r1c0,...

		__SUP_COUT__ << "tableName: " << tableName << " version: " << version
		             << " temporary: " << temporary << " dataOffset: " << dataOffset
		             << __E__;
		__SUP_COUT__ << "comment: " << comment << __E__;
		__SUP_COUT__ << "data: " << data << __E__;
		__SUP_COUT__ << "sourceTableAsIs: " << sourceTableAsIs << __E__;
		__SUP_COUT__ << "lookForEquivalent: " << lookForEquivalent << __E__;

		ConfigurationSupervisorBase::handleCreateTableXML(xmlOut,
		                                                  cfgMgr,
		                                                  tableName,
		                                                  TableVersion(version),
		                                                  temporary,
		                                                  data,
		                                                  dataOffset,
		                                                  userInfo.username_,
		                                                  comment,
		                                                  sourceTableAsIs,
		                                                  lookForEquivalent);
	}
	else if(requestType == "clearTableTemporaryVersions")
	{
		std::string tableName =
		    CgiDataUtilities::getData(cgiIn, "tableName");  // from GET
		__SUP_COUT__ << "tableName: " << tableName << __E__;

		try
		{
			cfgMgr->eraseTemporaryVersion(tableName);
		}
		catch(std::runtime_error& e)
		{
			__SUP_COUT__ << "Error detected!\n\n " << e.what() << __E__;
			xmlOut.addTextElementToData(
			    "Error", "Error clearing temporary views!\n " + std::string(e.what()));
		}
		catch(...)
		{
			__SUP_COUT__ << "Error detected!\n\n " << __E__;
			xmlOut.addTextElementToData("Error", "Error clearing temporary views! ");
		}
	}
	else if(requestType == "clearTableCachedVersions")
	{
		std::string tableName =
		    CgiDataUtilities::getData(cgiIn, "tableName");  // from GET
		__SUP_COUT__ << "tableName: " << tableName << __E__;

		try
		{
			if(tableName == "*")
				cfgMgr->clearAllCachedVersions();
			else
				cfgMgr->clearCachedVersions(tableName);

			// Force manual reload... not cfgMgr->getAllTableInfo(true /*refresh*/);
		}
		catch(std::runtime_error& e)
		{
			__SUP_COUT__ << "Error detected!\n\n " << e.what() << __E__;
			xmlOut.addTextElementToData(
			    "Error", "Error clearing cached views!\n " + std::string(e.what()));
		}
		catch(...)
		{
			__SUP_COUT__ << "Error detected!\n\n " << __E__;
			xmlOut.addTextElementToData("Error", "Error clearing cached views! ");
		}
	}
	else if(requestType == "getTreeView")
	{
		std::string tableGroup     = CgiDataUtilities::getData(cgiIn, "tableGroup");
		std::string tableGroupKey  = CgiDataUtilities::getData(cgiIn, "tableGroupKey");
		std::string startPath      = CgiDataUtilities::postData(cgiIn, "startPath");
		std::string modifiedTables = CgiDataUtilities::postData(cgiIn, "modifiedTables");
		std::string filterList     = CgiDataUtilities::postData(cgiIn, "filterList");
		int         depth          = CgiDataUtilities::getDataAsInt(cgiIn, "depth");
		bool hideStatusFalse = CgiDataUtilities::getDataAsInt(cgiIn, "hideStatusFalse");

		__SUP_COUT_TYPE__(TLVL_DEBUG+11) << __COUT_HDR__ << "tableGroup: " << tableGroup << __E__;
		__SUP_COUT_TYPE__(TLVL_DEBUG+11) << __COUT_HDR__ << "tableGroupKey: " << tableGroupKey << __E__;
		__SUP_COUT_TYPE__(TLVL_DEBUG+11) << __COUT_HDR__ << "startPath: " << startPath << __E__;
		__SUP_COUT_TYPE__(TLVL_DEBUG+11) << __COUT_HDR__ << "depth: " << depth << __E__;
		__SUP_COUT_TYPE__(TLVL_DEBUG+11) << __COUT_HDR__ << "hideStatusFalse: " << hideStatusFalse << __E__;
		__SUP_COUT_TYPE__(TLVL_DEBUG+11) << __COUT_HDR__ << "modifiedTables: " << modifiedTables << __E__;
		__SUP_COUT_TYPE__(TLVL_DEBUG+11) << __COUT_HDR__ << "filterList: " << filterList << __E__;

		handleFillTreeViewXML(xmlOut,
		                      cfgMgr,
		                      tableGroup,
		                      TableGroupKey(tableGroupKey),
		                      startPath,
		                      depth,
		                      hideStatusFalse,
		                      modifiedTables,
		                      filterList);
	}
	else if(requestType == "getTreeNodeCommonFields")
	{
		std::string tableGroup     = CgiDataUtilities::getData(cgiIn, "tableGroup");
		std::string tableGroupKey  = CgiDataUtilities::getData(cgiIn, "tableGroupKey");
		std::string startPath      = CgiDataUtilities::postData(cgiIn, "startPath");
		std::string modifiedTables = CgiDataUtilities::postData(cgiIn, "modifiedTables");
		std::string fieldList      = CgiDataUtilities::postData(cgiIn, "fieldList");
		std::string recordList     = CgiDataUtilities::postData(cgiIn, "recordList");
		int         depth          = CgiDataUtilities::getDataAsInt(cgiIn, "depth");

		__SUP_COUT__ << "tableGroup: " << tableGroup << __E__;
		__SUP_COUT__ << "tableGroupKey: " << tableGroupKey << __E__;
		__SUP_COUT__ << "startPath: " << startPath << __E__;
		__SUP_COUT__ << "depth: " << depth << __E__;
		if(depth == -1)
			depth = 10;  // protect users who probably do not actually mean -1
		__SUP_COUT__ << "fieldList: " << fieldList << __E__;
		__SUP_COUT__ << "recordList: " << recordList << __E__;
		__SUP_COUT__ << "modifiedTables: " << modifiedTables << __E__;

		handleFillTreeNodeCommonFieldsXML(xmlOut,
		                                  cfgMgr,
		                                  tableGroup,
		                                  TableGroupKey(tableGroupKey),
		                                  startPath,
		                                  depth,
		                                  modifiedTables,
		                                  recordList,
		                                  fieldList);
	}
	else if(requestType == "getUniqueFieldValuesForRecords")
	{
		std::string tableGroup     = CgiDataUtilities::getData(cgiIn, "tableGroup");
		std::string tableGroupKey  = CgiDataUtilities::getData(cgiIn, "tableGroupKey");
		std::string startPath      = CgiDataUtilities::postData(cgiIn, "startPath");
		std::string modifiedTables = CgiDataUtilities::postData(cgiIn, "modifiedTables");
		std::string fieldList      = CgiDataUtilities::postData(cgiIn, "fieldList");
		std::string recordList     = CgiDataUtilities::postData(cgiIn, "recordList");

		__SUP_COUT__ << "tableGroup: " << tableGroup << __E__;
		__SUP_COUT__ << "tableGroupKey: " << tableGroupKey << __E__;
		__SUP_COUT__ << "startPath: " << startPath << __E__;
		__SUP_COUT__ << "fieldList: " << fieldList << __E__;
		__SUP_COUT__ << "recordList: " << recordList << __E__;
		__SUP_COUT__ << "modifiedTables: " << modifiedTables << __E__;

		handleFillUniqueFieldValuesForRecordsXML(xmlOut,
		                                         cfgMgr,
		                                         tableGroup,
		                                         TableGroupKey(tableGroupKey),
		                                         startPath,
		                                         modifiedTables,
		                                         recordList,
		                                         fieldList);
	}
	else if(requestType == "getTreeNodeFieldValues")
	{
		std::string tableGroup     = CgiDataUtilities::getData(cgiIn, "tableGroup");
		std::string tableGroupKey  = CgiDataUtilities::getData(cgiIn, "tableGroupKey");
		std::string startPath      = CgiDataUtilities::postData(cgiIn, "startPath");
		std::string modifiedTables = CgiDataUtilities::postData(cgiIn, "modifiedTables");
		std::string fieldList      = CgiDataUtilities::postData(cgiIn, "fieldList");
		std::string recordList     = CgiDataUtilities::postData(cgiIn, "recordList");

		__SUP_COUT__ << "tableGroup: " << tableGroup << __E__;
		__SUP_COUT__ << "tableGroupKey: " << tableGroupKey << __E__;
		__SUP_COUT__ << "startPath: " << startPath << __E__;
		__SUP_COUT__ << "fieldList: " << fieldList << __E__;
		__SUP_COUT__ << "recordList: " << recordList << __E__;
		__SUP_COUT__ << "modifiedTables: " << modifiedTables << __E__;

		handleFillGetTreeNodeFieldValuesXML(xmlOut,
		                                    cfgMgr,
		                                    tableGroup,
		                                    TableGroupKey(tableGroupKey),
		                                    startPath,
		                                    modifiedTables,
		                                    recordList,
		                                    fieldList);
	}
	else if(requestType == "setTreeNodeFieldValues")
	{
		std::string tableGroup     = CgiDataUtilities::getData(cgiIn, "tableGroup");
		std::string tableGroupKey  = CgiDataUtilities::getData(cgiIn, "tableGroupKey");
		std::string startPath      = CgiDataUtilities::postData(cgiIn, "startPath");
		std::string modifiedTables = CgiDataUtilities::postData(cgiIn, "modifiedTables");
		std::string fieldList      = CgiDataUtilities::postData(cgiIn, "fieldList");
		std::string recordList     = CgiDataUtilities::postData(cgiIn, "recordList");
		std::string valueList      = CgiDataUtilities::postData(cgiIn, "valueList");

		__SUP_COUT__ << "tableGroup: " << tableGroup << __E__;
		__SUP_COUT__ << "tableGroupKey: " << tableGroupKey << __E__;
		__SUP_COUT__ << "startPath: " << startPath << __E__;
		__SUP_COUT__ << "fieldList: " << fieldList << __E__;
		__SUP_COUT__ << "valueList: " << valueList << __E__;
		__SUP_COUT__ << "recordList: " << recordList << __E__;
		__SUP_COUT__ << "modifiedTables: " << modifiedTables << __E__;

		handleFillSetTreeNodeFieldValuesXML(xmlOut,
		                                    cfgMgr,
		                                    tableGroup,
		                                    TableGroupKey(tableGroupKey),
		                                    startPath,
		                                    modifiedTables,
		                                    recordList,
		                                    fieldList,
		                                    valueList,
		                                    userInfo.username_);
	}
	else if(requestType == "addTreeNodeRecords")
	{
		std::string tableGroup     = CgiDataUtilities::getData(cgiIn, "tableGroup");
		std::string tableGroupKey  = CgiDataUtilities::getData(cgiIn, "tableGroupKey");
		std::string startPath      = CgiDataUtilities::postData(cgiIn, "startPath");
		std::string modifiedTables = CgiDataUtilities::postData(cgiIn, "modifiedTables");
		std::string recordList     = CgiDataUtilities::postData(cgiIn, "recordList");

		__SUP_COUT__ << "tableGroup: " << tableGroup << __E__;
		__SUP_COUT__ << "tableGroupKey: " << tableGroupKey << __E__;
		__SUP_COUT__ << "startPath: " << startPath << __E__;
		__SUP_COUT__ << "recordList: " << recordList << __E__;
		__SUP_COUT__ << "modifiedTables: " << modifiedTables << __E__;

		handleFillCreateTreeNodeRecordsXML(xmlOut,
		                                   cfgMgr,
		                                   tableGroup,
		                                   TableGroupKey(tableGroupKey),
		                                   startPath,
		                                   modifiedTables,
		                                   recordList,
		                                   userInfo.username_);
	}
	else if(requestType == "deleteTreeNodeRecords")
	{
		std::string tableGroup     = CgiDataUtilities::getData(cgiIn, "tableGroup");
		std::string tableGroupKey  = CgiDataUtilities::getData(cgiIn, "tableGroupKey");
		std::string startPath      = CgiDataUtilities::postData(cgiIn, "startPath");
		std::string modifiedTables = CgiDataUtilities::postData(cgiIn, "modifiedTables");
		std::string recordList     = CgiDataUtilities::postData(cgiIn, "recordList");

		__SUP_COUT__ << "tableGroup: " << tableGroup << __E__;
		__SUP_COUT__ << "tableGroupKey: " << tableGroupKey << __E__;
		__SUP_COUT__ << "startPath: " << startPath << __E__;
		__SUP_COUT__ << "recordList: " << recordList << __E__;
		__SUP_COUT__ << "modifiedTables: " << modifiedTables << __E__;

		handleFillDeleteTreeNodeRecordsXML(xmlOut,
		                                   cfgMgr,
		                                   tableGroup,
		                                   TableGroupKey(tableGroupKey),
		                                   startPath,
		                                   modifiedTables,
		                                   recordList);
	}
	else if(requestType == "renameTreeNodeRecords")
	{
		std::string tableGroup     = CgiDataUtilities::getData(cgiIn, "tableGroup");
		std::string tableGroupKey  = CgiDataUtilities::getData(cgiIn, "tableGroupKey");
		std::string startPath      = CgiDataUtilities::postData(cgiIn, "startPath");
		std::string modifiedTables = CgiDataUtilities::postData(cgiIn, "modifiedTables");
		std::string recordList     = CgiDataUtilities::postData(cgiIn, "recordList");
		std::string newRecordList  = CgiDataUtilities::postData(cgiIn, "newRecordList");

		__SUP_COUT__ << "tableGroup: " << tableGroup << __E__;
		__SUP_COUT__ << "tableGroupKey: " << tableGroupKey << __E__;
		__SUP_COUT__ << "startPath: " << startPath << __E__;
		__SUP_COUT__ << "recordList: " << recordList << __E__;
		__SUP_COUT__ << "modifiedTables: " << modifiedTables << __E__;
		__SUP_COUTV__(newRecordList);

		handleFillRenameTreeNodeRecordsXML(xmlOut,
		                                   cfgMgr,
		                                   tableGroup,
		                                   TableGroupKey(tableGroupKey),
		                                   startPath,
		                                   modifiedTables,
		                                   recordList,
		                                   newRecordList);
	}
	else if(requestType == "copyTreeNodeRecords")
	{
		std::string  tableGroup     = CgiDataUtilities::getData(cgiIn, "tableGroup");
		std::string  tableGroupKey  = CgiDataUtilities::getData(cgiIn, "tableGroupKey");
		std::string  startPath      = CgiDataUtilities::postData(cgiIn, "startPath");
		std::string  modifiedTables = CgiDataUtilities::postData(cgiIn, "modifiedTables");
		std::string  recordList     = CgiDataUtilities::postData(cgiIn, "recordList");
		unsigned int numberOfCopies =
		    CgiDataUtilities::getDataAsInt(cgiIn, "numberOfCopies");
		if(!numberOfCopies)
			numberOfCopies = 1;  // default to 1

		__SUP_COUT__ << "tableGroup: " << tableGroup << __E__;
		__SUP_COUT__ << "tableGroupKey: " << tableGroupKey << __E__;
		__SUP_COUT__ << "startPath: " << startPath << __E__;
		__SUP_COUT__ << "recordList: " << recordList << __E__;
		__SUP_COUT__ << "modifiedTables: " << modifiedTables << __E__;
		__SUP_COUTV__(numberOfCopies);

		handleFillCopyTreeNodeRecordsXML(xmlOut,
		                                 cfgMgr,
		                                 tableGroup,
		                                 TableGroupKey(tableGroupKey),
		                                 startPath,
		                                 modifiedTables,
		                                 recordList,
		                                 numberOfCopies);
	}
	else if(requestType == "getArtdaqNodes")
	{
		std::string modifiedTables = CgiDataUtilities::postData(cgiIn, "modifiedTables");

		__SUP_COUTV__(modifiedTables);

		handleGetArtdaqNodeRecordsXML(xmlOut, cfgMgr, modifiedTables);
	}
	else if(requestType == "saveArtdaqNodes")
	{
		std::string modifiedTables = CgiDataUtilities::postData(cgiIn, "modifiedTables");
		std::string nodeString     = CgiDataUtilities::postData(cgiIn, "nodeString");
		std::string subsystemString =
		    CgiDataUtilities::postData(cgiIn, "subsystemString");

		__SUP_COUTV__(modifiedTables);
		__SUP_COUTV__(nodeString);
		__SUP_COUTV__(subsystemString);

		handleSaveArtdaqNodeRecordsXML(
		    nodeString, subsystemString, xmlOut, cfgMgr, modifiedTables);
	}
	else if(requestType == "loadArtdaqNodeLayout")
	{
		std::string contextGroupName =
		    CgiDataUtilities::getData(cgiIn, "contextGroupName");
		std::string contextGroupKey = CgiDataUtilities::getData(cgiIn, "contextGroupKey");

		__SUP_COUTV__(contextGroupName);
		__SUP_COUTV__(contextGroupKey);

		handleLoadArtdaqNodeLayoutXML(
		    xmlOut, cfgMgr, contextGroupName, TableGroupKey(contextGroupKey));
	}
	else if(requestType == "saveArtdaqNodeLayout")
	{
		std::string layout = CgiDataUtilities::postData(cgiIn, "layout");
		std::string contextGroupName =
		    CgiDataUtilities::getData(cgiIn, "contextGroupName");
		std::string contextGroupKey = CgiDataUtilities::getData(cgiIn, "contextGroupKey");

		__SUP_COUTV__(layout);
		__SUP_COUTV__(contextGroupName);
		__SUP_COUTV__(contextGroupKey);

		handleSaveArtdaqNodeLayoutXML(
		    xmlOut, cfgMgr, layout, contextGroupName, TableGroupKey(contextGroupKey));
	}
	else if(requestType == "getAffectedActiveGroups")
	{
		std::string groupName      = CgiDataUtilities::getData(cgiIn, "groupName");
		std::string groupKey       = CgiDataUtilities::getData(cgiIn, "groupKey");
		std::string modifiedTables = CgiDataUtilities::postData(cgiIn, "modifiedTables");
		__SUP_COUT__ << "modifiedTables: " << modifiedTables << __E__;
		__SUP_COUT__ << "groupName: " << groupName << __E__;
		__SUP_COUT__ << "groupKey: " << groupKey << __E__;

		handleGetAffectedGroupsXML(
		    xmlOut, cfgMgr, groupName, TableGroupKey(groupKey), modifiedTables);
	}
	else if(requestType == "saveTreeNodeEdit")
	{
		std::string editNodeType = CgiDataUtilities::getData(cgiIn, "editNodeType");
		std::string targetTable  = CgiDataUtilities::getData(cgiIn, "targetTable");
		std::string targetTableVersion =
		    CgiDataUtilities::getData(cgiIn, "targetTableVersion");
		std::string targetUID    = CgiDataUtilities::getData(cgiIn, "targetUID");
		std::string targetColumn = CgiDataUtilities::getData(cgiIn, "targetColumn");
		std::string newValue     = CgiDataUtilities::postData(cgiIn, "newValue");

		__SUP_COUT__ << "editNodeType: " << editNodeType << __E__;
		__SUP_COUT__ << "targetTable: " << targetTable << __E__;
		__SUP_COUT__ << "targetTableVersion: " << targetTableVersion << __E__;
		__SUP_COUT__ << "targetUID: " << targetUID << __E__;
		__SUP_COUT__ << "targetColumn: " << targetColumn << __E__;
		__SUP_COUT__ << "newValue: " << newValue << __E__;

		handleSaveTreeNodeEditXML(xmlOut,
		                          cfgMgr,
		                          targetTable,
		                          TableVersion(targetTableVersion),
		                          editNodeType,
		                          StringMacros::decodeURIComponent(targetUID),
		                          StringMacros::decodeURIComponent(targetColumn),
		                          newValue,
		                          userInfo.username_);
	}
	else if(requestType == "getLinkToChoices")
	{
		std::string linkToTableName = CgiDataUtilities::getData(cgiIn, "linkToTableName");
		std::string linkToTableVersion =
		    CgiDataUtilities::getData(cgiIn, "linkToTableVersion");
		std::string linkIdType = CgiDataUtilities::getData(cgiIn, "linkIdType");
		std::string linkIndex  = StringMacros::decodeURIComponent(
            CgiDataUtilities::getData(cgiIn, "linkIndex"));
		std::string linkInitId = CgiDataUtilities::getData(cgiIn, "linkInitId");

		__SUP_COUT__ << "linkToTableName: " << linkToTableName << __E__;
		__SUP_COUT__ << "linkToTableVersion: " << linkToTableVersion << __E__;
		__SUP_COUT__ << "linkIdType: " << linkIdType << __E__;
		__SUP_COUT__ << "linkIndex: " << linkIndex << __E__;
		__SUP_COUT__ << "linkInitId: " << linkInitId << __E__;

		handleGetLinkToChoicesXML(xmlOut,
		                          cfgMgr,
		                          linkToTableName,
		                          TableVersion(linkToTableVersion),
		                          linkIdType,
		                          linkIndex,
		                          linkInitId);
	}
	else if(requestType == "activateTableGroup")
	{
		std::string groupName = CgiDataUtilities::getData(cgiIn, "groupName");
		std::string groupKey  = CgiDataUtilities::getData(cgiIn, "groupKey");
		bool ignoreWarnings   = CgiDataUtilities::getDataAsInt(cgiIn, "ignoreWarnings");

		__SUP_COUT__ << "Activating table: " << groupName << "(" << groupKey << ")"
		             << __E__;
		__SUP_COUTV__(ignoreWarnings);

		// add flag for GUI handling
		xmlOut.addTextElementToData("AttemptedGroupActivation", "1");
		xmlOut.addTextElementToData("AttemptedGroupActivationName", groupName);
		xmlOut.addTextElementToData("AttemptedGroupActivationKey", groupKey);

		try
		{
			std::string accumulatedErrors;

			// if ignore warnings,
			//	then only print errors, do not add to xml

			cfgMgr->activateTableGroup(
			    groupName, TableGroupKey(groupKey), &accumulatedErrors);

			if(accumulatedErrors != "")
			{
				if(!ignoreWarnings)
				{
					__SS__ << "Throwing exception on accumulated errors: "
					       << accumulatedErrors << __E__;
					__SS_ONLY_THROW__;
				}
				// else just print
				__COUT_WARN__ << "Ignoring warnings so ignoring this error:"
				              << accumulatedErrors << __E__;
				__COUT_WARN__ << "Done ignoring the above error(s)." << __E__;
			}
		}
		catch(std::runtime_error& e)
		{
			// NOTE it is critical for flimsy error parsing in JS GUI to leave
			//	single quotes around the groupName and groupKey and have them be
			//	the first single quotes encountered in the error mesage!
			__SUP_COUT__ << "Error detected!\n\n " << e.what() << __E__;
			xmlOut.addTextElementToData(
			    "Error",
			    "Error activating table group '" + groupName + "(" + groupKey + ")" +
			        ".' Please see details below:\n\n" + std::string(e.what()));
			__SUP_COUT_ERR__ << "Errors detected so de-activating group: " << groupName
			                 << " (" << groupKey << ")" << __E__;
			try  // just in case any lingering pieces, lets deactivate
			{
				cfgMgr->destroyTableGroup(groupName, true);
			}
			catch(...)
			{
			}
		}
		catch(cet::exception& e)
		{
			// NOTE it is critical for flimsy error parsing in JS GUI to leave
			//	single quotes around the groupName and groupKey and have them be
			//	the first single quotes encountered in the error mesage!

			__SUP_COUT__ << "Error detected!\n\n " << e.what() << __E__;
			xmlOut.addTextElementToData("Error",
			                            "Error activating table group '" + groupName +
			                                "(" + groupKey + ")" + "!'\n\n" +
			                                std::string(e.what()));
			__SUP_COUT_ERR__ << "Errors detected so de-activating group: " << groupName
			                 << " (" << groupKey << ")" << __E__;
			try  // just in case any lingering pieces, lets deactivate
			{
				cfgMgr->destroyTableGroup(groupName, true);
			}
			catch(...)
			{
			}
		}
		catch(...)
		{
			__SUP_COUT__ << "Unknown error detected!" << __E__;
			throw;  // unexpected exception!
		}
	}
	else if(requestType == "getActiveTableGroups")
		;  // do nothing, since they are always returned
	else if(requestType == "copyViewToCurrentColumns")
	{
		std::string tableName =
		    CgiDataUtilities::getData(cgiIn, "tableName");  // from GET
		std::string sourceVersion = CgiDataUtilities::getData(cgiIn, "sourceVersion");

		__SUP_COUT__ << "tableName: " << tableName << __E__;
		__SUP_COUT__ << "sourceVersion: " << sourceVersion << __E__;
		__SUP_COUT__ << "userInfo.username_: " << userInfo.username_ << __E__;

		// copy source version to new temporary version
		TableVersion newTemporaryVersion;
		try
		{
			newTemporaryVersion =
			    cfgMgr->copyViewToCurrentColumns(tableName, TableVersion(sourceVersion));

			__SUP_COUT__ << "New temporary version = " << newTemporaryVersion << __E__;
		}
		catch(std::runtime_error& e)
		{
			__SUP_COUT__ << "Error detected!\n\n " << e.what() << __E__;
			xmlOut.addTextElementToData("Error",
			                            "Error copying view from '" + tableName + "_v" +
			                                sourceVersion + "'! " +
			                                std::string(e.what()));
		}
		catch(...)
		{
			__SUP_COUT__ << "Error detected!\n\n " << __E__;
			xmlOut.addTextElementToData(
			    "Error",
			    "Error copying view from '" + tableName + "_v" + sourceVersion + "'! ");
		}

		handleGetTableXML(xmlOut, cfgMgr, tableName, newTemporaryVersion);
	}
	else if(requestType == "getLastTableGroups")
	{
		std::string                                          timeString;
		std::pair<std::string /*group name*/, TableGroupKey> theGroup;

		theGroup = theRemoteWebUsers_.getLastTableGroup("Configured", timeString);
		xmlOut.addTextElementToData("LastConfiguredGroupName", theGroup.first);
		xmlOut.addTextElementToData("LastConfiguredGroupKey", theGroup.second.toString());
		xmlOut.addTextElementToData("LastConfiguredGroupTime", timeString);
		theGroup = theRemoteWebUsers_.getLastTableGroup("Started", timeString);
		xmlOut.addTextElementToData("LastStartedGroupName", theGroup.first);
		xmlOut.addTextElementToData("LastStartedGroupKey", theGroup.second.toString());
		xmlOut.addTextElementToData("LastStartedGroupTime", timeString);
		theGroup = theRemoteWebUsers_.getLastTableGroup("ActivatedConfig", timeString);
		xmlOut.addTextElementToData("LastActivatedConfigGroupName", theGroup.first);
		xmlOut.addTextElementToData("LastActivatedConfigGroupKey",
		                            theGroup.second.toString());
		xmlOut.addTextElementToData("LastActivatedConfigGroupTime", timeString);
		theGroup = theRemoteWebUsers_.getLastTableGroup("ActivatedContext", timeString);
		xmlOut.addTextElementToData("LastActivatedContextGroupName", theGroup.first);
		xmlOut.addTextElementToData("LastActivatedContextGroupKey",
		                            theGroup.second.toString());
		xmlOut.addTextElementToData("LastActivatedContextGroupTime", timeString);
		theGroup = theRemoteWebUsers_.getLastTableGroup("ActivatedBackbone", timeString);
		xmlOut.addTextElementToData("LastActivatedBackboneGroupName", theGroup.first);
		xmlOut.addTextElementToData("LastActivatedBackboneGroupKey",
		                            theGroup.second.toString());
		xmlOut.addTextElementToData("LastActivatedBackboneGroupTime", timeString);
		theGroup = theRemoteWebUsers_.getLastTableGroup("ActivatedIterator", timeString);
		xmlOut.addTextElementToData("LastActivatedIteratorGroupName", theGroup.first);
		xmlOut.addTextElementToData("LastActivatedIteratorGroupKey",
		                            theGroup.second.toString());
		xmlOut.addTextElementToData("LastActivatedIteratorGroupTime", timeString);
	}
	else if(requestType == "savePlanCommandSequence")
	{
		std::string planName = CgiDataUtilities::getData(cgiIn, "planName");   // from GET
		std::string commands = CgiDataUtilities::postData(cgiIn, "commands");  // from
		                                                                       // POST
		std::string modifiedTables = CgiDataUtilities::postData(cgiIn, "modifiedTables");
		std::string groupName      = CgiDataUtilities::getData(cgiIn, "groupName");
		std::string groupKey       = CgiDataUtilities::getData(cgiIn, "groupKey");

		__SUP_COUT__ << "modifiedTables: " << modifiedTables << __E__;
		__SUP_COUT__ << "planName: " << planName << __E__;
		__SUP_COUT__ << "commands: " << commands << __E__;
		__SUP_COUT__ << "groupName: " << groupName << __E__;
		__SUP_COUT__ << "groupKey: " << groupKey << __E__;

		handleSavePlanCommandSequenceXML(xmlOut,
		                                 cfgMgr,
		                                 groupName,
		                                 TableGroupKey(groupKey),
		                                 modifiedTables,
		                                 userInfo.username_,
		                                 planName,
		                                 commands);
	}
	else if(requestType == "mergeGroups")
	{
		std::string groupANameContext =
		    CgiDataUtilities::getData(cgiIn, "groupANameContext");
		std::string groupAKeyContext =
		    CgiDataUtilities::getData(cgiIn, "groupAKeyContext");
		std::string groupBNameContext =
		    CgiDataUtilities::getData(cgiIn, "groupBNameContext");
		std::string groupBKeyContext =
		    CgiDataUtilities::getData(cgiIn, "groupBKeyContext");
		std::string groupANameConfig =
		    CgiDataUtilities::getData(cgiIn, "groupANameConfig");
		std::string groupAKeyConfig = CgiDataUtilities::getData(cgiIn, "groupAKeyConfig");
		std::string groupBNameConfig =
		    CgiDataUtilities::getData(cgiIn, "groupBNameConfig");
		std::string groupBKeyConfig = CgiDataUtilities::getData(cgiIn, "groupBKeyConfig");
		std::string mergeApproach   = CgiDataUtilities::getData(cgiIn, "mergeApproach");

		__SUP_COUTV__(groupANameContext);
		__SUP_COUTV__(groupAKeyContext);
		__SUP_COUTV__(groupBNameContext);
		__SUP_COUTV__(groupBKeyContext);
		__SUP_COUTV__(groupANameConfig);
		__SUP_COUTV__(groupAKeyConfig);
		__SUP_COUTV__(groupBNameConfig);
		__SUP_COUTV__(groupBKeyConfig);
		__SUP_COUTV__(mergeApproach);

		handleMergeGroupsXML(xmlOut,
		                     cfgMgr,
		                     groupANameContext,
		                     TableGroupKey(groupAKeyContext),
		                     groupBNameContext,
		                     TableGroupKey(groupBKeyContext),
		                     groupANameConfig,
		                     TableGroupKey(groupAKeyConfig),
		                     groupBNameConfig,
		                     TableGroupKey(groupBKeyConfig),
		                     userInfo.username_,
		                     mergeApproach);
	}
	else
	{
		__SUP_SS__ << "requestType '" << requestType << "' request not recognized."
		           << __E__;
		__SUP_COUT__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}

	// always add active table groups to xml response
	ConfigurationSupervisorBase::getConfigurationStatusXML(xmlOut, cfgMgr);

}  // end ::request()
catch(const std::runtime_error& e)
{
	__SS__ << "A fatal error occurred while handling the request '" << requestType
	       << ".' Error: " << e.what() << __E__;
	__COUT_ERR__ << "\n" << ss.str();
	xmlOut.addTextElementToData("Error", ss.str());

	try
	{
		// always add version tracking bool
		xmlOut.addTextElementToData(
		    "versionTracking",
		    ConfigurationInterface::isVersionTrackingEnabled() ? "ON" : "OFF");
	}
	catch(...)
	{
		__COUT_ERR__ << "Error getting version tracking status!" << __E__;
	}
}
catch(...)
{
	__SS__ << "An unknown fatal error occurred while handling the request '"
	       << requestType << ".'" << __E__;
	__COUT_ERR__ << "\n" << ss.str();
	xmlOut.addTextElementToData("Error", ss.str());

	try
	{
		// always add version tracking bool
		xmlOut.addTextElementToData(
		    "versionTracking",
		    ConfigurationInterface::isVersionTrackingEnabled() ? "ON" : "OFF");
	}
	catch(...)
	{
		__COUT_ERR__ << "Error getting version tracking status!" << __E__;
	}
}

//==============================================================================
// handleGetAffectedGroupsXML
//	checks which of the active groups are affected
//		by the tables changing in the modified tables list.
//
//	returns for each group affected:
//		the group name/key affected
//			and modified member map
void ConfigurationGUISupervisor::handleGetAffectedGroupsXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      rootGroupName,
    const TableGroupKey&    rootGroupKey,
    const std::string&      modifiedTables)
try
{
	// determine type of rootGroup
	// replace the matching type in considered groups
	// for each considered table group
	//
	//	check if there is a modified table that is also a member of that group
	//	if so,
	//		make xml entry pair

	std::map<std::string, std::pair<std::string, TableGroupKey>> consideredGroups =
	    cfgMgr->getActiveTableGroups();

	// check that there is a context and table group to consider
	//	if there is not, then pull from failed list
	if(consideredGroups[ConfigurationManager::ACTIVE_GROUP_NAME_CONTEXT]
	       .second.isInvalid())
	{
		__SUP_COUT__ << "Finding a context group to consider..." << __E__;
		if(cfgMgr->getFailedTableGroups().find(
		       ConfigurationManager::ACTIVE_GROUP_NAME_CONTEXT) !=
		   cfgMgr->getFailedTableGroups().end())
		{
			consideredGroups[ConfigurationManager::ACTIVE_GROUP_NAME_CONTEXT] =
			    cfgMgr->getFailedTableGroups().at(
			        ConfigurationManager::ACTIVE_GROUP_NAME_CONTEXT);
		}
		else if(cfgMgr->getFailedTableGroups().find(
		            ConfigurationManager::ACTIVE_GROUP_NAME_UNKNOWN) !=
		        cfgMgr->getFailedTableGroups().end())
		{
			consideredGroups[ConfigurationManager::ACTIVE_GROUP_NAME_CONTEXT] =
			    cfgMgr->getFailedTableGroups().at(
			        ConfigurationManager::ACTIVE_GROUP_NAME_UNKNOWN);
		}
	}
	if(consideredGroups[ConfigurationManager::ACTIVE_GROUP_NAME_CONFIGURATION]
	       .second.isInvalid())
	{
		__SUP_COUT__ << "Finding a table group to consider..." << __E__;
		if(cfgMgr->getFailedTableGroups().find(
		       ConfigurationManager::ACTIVE_GROUP_NAME_CONFIGURATION) !=
		   cfgMgr->getFailedTableGroups().end())
		{
			consideredGroups[ConfigurationManager::ACTIVE_GROUP_NAME_CONFIGURATION] =
			    cfgMgr->getFailedTableGroups().at(
			        ConfigurationManager::ACTIVE_GROUP_NAME_CONFIGURATION);
		}
		else if(cfgMgr->getFailedTableGroups().find(
		            ConfigurationManager::ACTIVE_GROUP_NAME_UNKNOWN) !=
		        cfgMgr->getFailedTableGroups().end())
		{
			consideredGroups[ConfigurationManager::ACTIVE_GROUP_NAME_CONFIGURATION] =
			    cfgMgr->getFailedTableGroups().at(
			        ConfigurationManager::ACTIVE_GROUP_NAME_UNKNOWN);
		}
	}

	__SUP_COUTV__(StringMacros::mapToString(consideredGroups));

	// determine the type of table group
	try
	{
		std::map<std::string /*name*/, TableVersion /*version*/> rootGroupMemberMap;

		cfgMgr->loadTableGroup(rootGroupName,
		                       rootGroupKey,
		                       0,
		                       &rootGroupMemberMap,
		                       0,
		                       0,
		                       0,
		                       0,
		                       0,      // defaults
		                       true);  // doNotLoadMember

		const std::string& groupType = cfgMgr->getTypeNameOfGroup(rootGroupMemberMap);

		consideredGroups[groupType] =
		    std::pair<std::string, TableGroupKey>(rootGroupName, rootGroupKey);
	}
	catch(const std::runtime_error& e)
	{
		// if actual group name was attempted re-throw
		if(rootGroupName.size())
		{
			__SUP_SS__ << "Failed to determine type of table group for " << rootGroupName
			           << "(" << rootGroupKey << ")! " << e.what() << __E__;
			__SUP_COUT_ERR__ << "\n" << ss.str();
			//__SS_THROW__;
		}

		// else assume it was the intention to just consider the active groups
		__SUP_COUT__ << "Did not modify considered active groups due to empty root group "
		                "name - assuming this was intentional."
		             << __E__;
	}
	catch(...)
	{
		// if actual group name was attempted re-throw
		if(rootGroupName.size())
		{
			__SUP_COUT_ERR__ << "Failed to determine type of table group for "
			                 << rootGroupName << "(" << rootGroupKey << ")!" << __E__;
			// throw;
		}

		// else assume it was the intention to just consider the active groups
		__SUP_COUT__ << "Did not modify considered active groups due to empty root group "
		                "name - assuming this was intentional."
		             << __E__;
	}

	std::map<std::string /*name*/,
	         std::pair<bool /*foundAffectedGroup*/, TableVersion /*version*/>>
	    modifiedTablesMap;
	std::map<std::string /*name*/,
	         std::pair<bool /*foundAffectedGroup*/, TableVersion /*version*/>>::iterator
	    modifiedTablesMapIt;
	{
		std::istringstream f(modifiedTables);
		std::string        table, version;
		while(getline(f, table, ','))
		{
			getline(f, version, ',');
			modifiedTablesMap.insert(
			    std::pair<
			        std::string /*name*/,
			        std::pair<bool /*foundAffectedGroup*/, TableVersion /*version*/>>(
			        table,
			        std::make_pair(false /*foundAffectedGroup*/, TableVersion(version))));
		}
		__SUP_COUT__ << modifiedTables << __E__;
		for(auto& pair : modifiedTablesMap)
			__SUP_COUT__ << "modified table " << pair.first << ":" << pair.second.second
			             << __E__;
	}

	bool                     affected;
	xercesc::DOMElement*     parentEl;
	std::string              groupComment;
	std::vector<std::string> orderedGroupTypes(
	    {ConfigurationManager::ACTIVE_GROUP_NAME_CONTEXT,
	     ConfigurationManager::ACTIVE_GROUP_NAME_BACKBONE,
	     ConfigurationManager::ACTIVE_GROUP_NAME_ITERATE,
	     ConfigurationManager::ACTIVE_GROUP_NAME_CONFIGURATION});
	for(auto groupType : orderedGroupTypes)
	{
		if(consideredGroups.find(groupType) == consideredGroups.end())
			continue;  // skip missing

		const std::pair<std::string, TableGroupKey>& group = consideredGroups[groupType];

		if(group.second.isInvalid())
			continue;  // skip invalid

		__SUP_COUT__ << "Considering " << groupType << " group " << group.first << " ("
		             << group.second << ")" << __E__;

		affected = false;

		std::map<std::string /*name*/, TableVersion /*version*/> memberMap;
		cfgMgr->loadTableGroup(group.first,
		                       group.second,
		                       0,
		                       &memberMap,
		                       0,
		                       0,
		                       &groupComment,
		                       0,
		                       0,  // mostly defaults
		                       true /*doNotLoadMember*/);

		__SUP_COUT__ << "groupComment = " << groupComment << __E__;

		for(auto& table : memberMap)
		{
			if((modifiedTablesMapIt = modifiedTablesMap.find(table.first)) !=
			       modifiedTablesMap
			           .end() &&  // check if version is different for member table
			   table.second != (*modifiedTablesMapIt).second.second)
			{
				__SUP_COUT__ << "Affected by " << (*modifiedTablesMapIt).first << ":"
				             << (*modifiedTablesMapIt).second.second << __E__;
				affected               = true;
				memberMap[table.first] = (*modifiedTablesMapIt).second.second;
				(*modifiedTablesMapIt).second.first = true;  // found affected group
			}
		}

		if(groupType == ConfigurationManager::ACTIVE_GROUP_NAME_CONFIGURATION)
		{
			__SUP_COUT__ << "Considering mockup tables for Configuration Group..."
			             << __E__;
			for(auto& table : modifiedTablesMap)
			{
				if(table.second.first)  // already found affected group
					continue;

				if(table.second.second.isMockupVersion() &&
				   memberMap.find(table.first) == memberMap.end())
				{
					__SUP_COUT__ << "Found mockup table '" << table.first
					             << "' for Configuration Group." << __E__;
					memberMap[table.first] = table.second.second;
					affected               = true;
				}
			}
		}

		if(affected)
		{
			parentEl = xmlOut.addTextElementToData("AffectedActiveGroup", "");
			xmlOut.addTextElementToParent("GroupName", group.first, parentEl);
			xmlOut.addTextElementToParent("GroupKey", group.second.toString(), parentEl);
			xmlOut.addTextElementToParent("GroupComment", groupComment, parentEl);

			for(auto& table : memberMap)
			{
				xmlOut.addTextElementToParent("MemberName", table.first, parentEl);
				xmlOut.addTextElementToParent(
				    "MemberVersion", table.second.toString(), parentEl);
			}
		}
	}  // end affected group loop
}
catch(std::runtime_error& e)
{
	__SUP_COUT__ << "Error detected!\n\n " << e.what() << __E__;
	xmlOut.addTextElementToData(
	    "Error", "Error getting affected groups! " + std::string(e.what()));
}
catch(...)
{
	__SUP_COUT__ << "Error detected!\n\n " << __E__;
	xmlOut.addTextElementToData("Error", "Error getting affected groups! ");
}

//==============================================================================
// setupActiveTables
//	setup active tables based on input group and modified tables
//
//	if groupName == "" || groupKey is invalid
//		then do for active groups
//	if valid, then replace appropriate active group with specified group
//	Also replace active versions of modified tables with the specified version
void ConfigurationGUISupervisor::setupActiveTablesXML(
    HttpXmlDocument&                                          xmlOut,
    ConfigurationManagerRW*                                   cfgMgr,
    const std::string&                                        groupName,
    const TableGroupKey&                                      groupKey,
    const std::string&                                        modifiedTables,
    bool                                                      refreshAll,
    bool                                                      doGetGroupInfo,
    std::map<std::string /*name*/, TableVersion /*version*/>* returnMemberMap,
    bool                                                      outputActiveTables,
    std::string*                                              accumulatedErrors)
try
{

	xmlOut.addTextElementToData("tableGroup", groupName);
	xmlOut.addTextElementToData("tableGroupKey", groupKey.toString());

	bool usingActiveGroups = (groupName == "" || groupKey.isInvalid());

	// reload all tables so that partially loaded tables are not allowed
	if(usingActiveGroups || refreshAll)
	{
		__SUP_COUT__ << "Refreshing all table info, ignoring warnings..." << __E__;
		std::string accumulatedWarnings = "";
		cfgMgr->getAllTableInfo(true, &accumulatedWarnings);  // do refresh
	}

	const std::map<std::string, TableInfo>& allTableInfo = cfgMgr->getAllTableInfo(false);

	std::map<std::string /*name*/, TableVersion /*version*/> modifiedTablesMap;
	std::map<std::string /*name*/, TableVersion /*version*/>::iterator modifiedTablesMapIt;

	if(usingActiveGroups)
	{
		// no need to load a target group
		__SUP_COUT__ << "Using active groups." << __E__;
	}
	else
	{
		__SUP_COUT__ << "Loading group '" << groupName << "(" << groupKey << ")'"
		             << __E__;

		std::string groupComment, groupAuthor, tableGroupCreationTime;

		// only same member map if object pointer was passed
		cfgMgr->loadTableGroup(groupName,
		                       groupKey,
		                       false /*doActivate*/,
		                       returnMemberMap,
		                       0 /*progressBar*/,
		                       accumulatedErrors,
		                       doGetGroupInfo ? &groupComment : 0,
		                       doGetGroupInfo ? &groupAuthor : 0,
		                       doGetGroupInfo ? &tableGroupCreationTime : 0);

		if(doGetGroupInfo)
		{
			xmlOut.addTextElementToData("tableGroupComment", groupComment);
			xmlOut.addTextElementToData("tableGroupAuthor", groupAuthor);
			xmlOut.addTextElementToData("tableGroupCreationTime", tableGroupCreationTime);
		}

		if(accumulatedErrors && *accumulatedErrors != "")
			__SUP_COUTV__(*accumulatedErrors);
	}

	// extract modified tables
	{
		std::istringstream f(modifiedTables);
		std::string        table, version;
		while(getline(f, table, ','))
		{
			getline(f, version, ',');
			modifiedTablesMap.insert(
			    std::pair<std::string /*name*/, TableVersion /*version*/>(
			        table, TableVersion(version)));
		}
		//__SUP_COUT__ << modifiedTables << __E__;
		for(auto& pair : modifiedTablesMap)
			__SUP_COUT__ << "modified table " << pair.first << ":" << pair.second
			             << __E__;
	}

	// add all active table pairs to xmlOut
	std::map<std::string, TableVersion> allActivePairs = cfgMgr->getActiveVersions();
	xmlOut.addTextElementToData("DefaultNoLink",
	                            TableViewColumnInfo::DATATYPE_LINK_DEFAULT);

	// construct specially ordered table name set
	std::set<std::string, StringMacros::IgnoreCaseCompareStruct> orderedTableSet;
	for(const auto& tablePair : allActivePairs)
		orderedTableSet.emplace(tablePair.first);

	std::map<std::string, TableInfo>::const_iterator tableInfoIt;
	for(auto& orderedTableName : orderedTableSet)
	{
		tableInfoIt = allTableInfo.find(orderedTableName);
		if(tableInfoIt == allTableInfo.end())
		{
			__SS__ << "Impossible missing table in map '" << orderedTableName << "'"
			       << __E__;
			__SS_THROW__;
		}

		if(outputActiveTables)
			xmlOut.addTextElementToData("ActiveTableName", orderedTableName);

		// check if name is in modifiedTables
		// if so, activate the temporary version
		if((modifiedTablesMapIt = modifiedTablesMap.find(orderedTableName)) !=
		   modifiedTablesMap.end())
		{
			__SUP_COUT__ << "Found modified table " << (*modifiedTablesMapIt).first
			             << ": trying... " << (*modifiedTablesMapIt).second << __E__;

			try
			{
				tableInfoIt->second.tablePtr_->setActiveView(
				    (*modifiedTablesMapIt).second);
			}
			catch(...)
			{
				__SUP_SS__ << "Modified table version v" << (*modifiedTablesMapIt).second
				           << " failed. Reverting to v"
				           << tableInfoIt->second.tablePtr_->getView().getVersion() << "."
				           << __E__;
				__SUP_COUT_WARN__ << "Warning detected!\n\n " << ss.str() << __E__;
				xmlOut.addTextElementToData(
				    "Warning",
				    "Error setting up active tables!\n\n" + std::string(ss.str()));
			}
		}

		if(outputActiveTables)
		{
			xmlOut.addTextElementToData(
			    "ActiveTableVersion",
			    tableInfoIt->second.tablePtr_->getView().getVersion().toString());
			xmlOut.addTextElementToData(
			    "ActiveTableComment",
			    tableInfoIt->second.tablePtr_->getView().getComment());
		}

	}  // end ordered table loop
}  // end setupActiveTablesXML()
catch(std::runtime_error& e)
{
	__SUP_SS__ << ("Error setting up active tables!\n\n" + std::string(e.what()))
	           << __E__;
	__SUP_COUT_ERR__ << "\n" << ss.str();
	xmlOut.addTextElementToData("Error", ss.str());
}
catch(...)
{
	__SUP_SS__ << ("Error setting up active tables!\n\n") << __E__;
	__SUP_COUT_ERR__ << "\n" << ss.str();
	xmlOut.addTextElementToData("Error", ss.str());
	throw;  // throw to get info from special errors at a parent level
}  // end setupActiveTablesXML() throw

//==============================================================================
// handleFillCreateTreeNodeRecordsXML
//	Creates the records in the appropriate table
//		and creates a temporary version.
//	the modified-<modified tables> list is returned in xml
//
// if groupName == "" || groupKey is invalid
//	 then do for active groups
//
// parameters
//	tableGroupName (full name with key)
//	starting node path
//	modifiedTables := CSV of table/version pairs
//	recordList := CSV list of records to create
//
void ConfigurationGUISupervisor::handleFillCreateTreeNodeRecordsXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      groupName,
    const TableGroupKey&    groupKey,
    const std::string&      startPath,
    const std::string&      modifiedTables,
    const std::string&      recordList,
    const std::string&      author)
{
	//	setup active tables based on input group and modified tables
	setupActiveTablesXML(xmlOut,
	                     cfgMgr,
	                     groupName,
	                     groupKey,
	                     modifiedTables,
	                     true /* refresh all */,
	                     false /* getGroupInfo */,
	                     0 /* returnMemberMap */,
	                     false /* outputActiveTables */);

	try
	{
		ConfigurationTree targetNode = cfgMgr->getNode(startPath);
		TableBase*        table      = cfgMgr->getTableByName(targetNode.getTableName());

		__SUP_COUT__ << table->getTableName() << __E__;
		TableVersion temporaryVersion;

		// if current version is not temporary
		//		create temporary
		//	else re-modify temporary version
		//	edit temporary version directly
		//	then after all edits return active versions
		//

		bool firstSave = true;

		// save current version
		TableView backupView(targetNode.getTableName());

		// extract record list
		{
			std::istringstream f(recordList);
			std::string        recordUID;

			while(getline(f, recordUID, ','))  // for each record
			{
				recordUID = StringMacros::decodeURIComponent(recordUID);

				__SUP_COUT__ << "recordUID " << recordUID << __E__;

				if(firstSave)  // handle version bookkeeping
				{
					if(!(temporaryVersion = targetNode.getTableVersion())
					        .isTemporaryVersion())
					{
						__SUP_COUT__ << "Start version " << temporaryVersion << __E__;
						// create temporary version for editing
						temporaryVersion = table->createTemporaryView(temporaryVersion);
						cfgMgr->saveNewTable(targetNode.getTableName(),
						                     temporaryVersion,
						                     true);  // proper bookkeeping for temporary
						                             // version with the new version

						__SUP_COUT__ << "Created temporary version " << temporaryVersion
						             << __E__;
					}
					else  // else table is already temporary version
						__SUP_COUT__ << "Using temporary version " << temporaryVersion
						             << __E__;

					firstSave = false;

					// copy original to backup before modifying
					backupView.copy(table->getView(), temporaryVersion, author);
				}

				// at this point have valid temporary version to edit

				// copy "table-newRow" type edit from handleSaveTreeNodeEditXML()
				// functionality

				// add row
				unsigned int row = table->getViewP()->addRow(
				    author, true /*incrementUniqueData*/);  // increment all unique data
				                                            // fields to void conflict

				// if TableViewColumnInfo::COL_NAME_STATUS exists, set it to true
				try
				{
					unsigned int col = table->getViewP()->getColStatus();
					table->getViewP()->setURIEncodedValue("1", row, col);
				}
				catch(...)
				{
				}  // if not, ignore

				// set UID value
				table->getViewP()->setURIEncodedValue(
				    recordUID, row, table->getViewP()->getColUID());
			}
		}

		if(!firstSave)  // only test table if there was a change
		{
			try
			{
				table->getViewP()->init();  // verify new table (throws runtime_errors)
			}
			catch(...)
			{
				__SUP_COUT_INFO__ << "Reverting to original view." << __E__;
				__SUP_COUT__ << "Before:" << __E__;
				table->getViewP()->print();
				table->getViewP()->copy(backupView, temporaryVersion, author);
				__SUP_COUT__ << "After:" << __E__;
				table->getViewP()->print();

				throw;  // rethrow
			}
		}

		handleFillModifiedTablesXML(xmlOut, cfgMgr);
	}
	catch(std::runtime_error& e)
	{
		__SUP_SS__ << ("Error creating new record(s)!\n\n" + std::string(e.what()))
		           << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
	catch(...)
	{
		__SUP_SS__ << ("Error creating new record(s)!\n\n") << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
}

//==============================================================================
// handleFillModifiedTablesXML
//	fills <modified tables> as used by ConfigurationAPI
void ConfigurationGUISupervisor::handleFillModifiedTablesXML(
    HttpXmlDocument& xmlOut, ConfigurationManagerRW* cfgMgr)
try
{
	// return modified <modified tables>
	const std::map<std::string, TableInfo>& allTableInfo   = cfgMgr->getAllTableInfo();
	std::map<std::string, TableVersion>     allActivePairs = cfgMgr->getActiveVersions();
	for(auto& activePair : allActivePairs)
	{
		xmlOut.addTextElementToData("NewActiveTableName", activePair.first);
		xmlOut.addTextElementToData("NewActiveTableVersion",
		                            allTableInfo.at(activePair.first)
		                                .tablePtr_->getView()
		                                .getVersion()
		                                .toString());
		xmlOut.addTextElementToData(
		    "NewActiveTableComment",
		    allTableInfo.at(activePair.first).tablePtr_->getView().getComment());
	}
}
catch(std::runtime_error& e)
{
	__SUP_SS__ << ("Error!\n\n" + std::string(e.what())) << __E__;
	__SUP_COUT_ERR__ << "\n" << ss.str();
	xmlOut.addTextElementToData("Error", ss.str());
}
catch(...)
{
	__SUP_SS__ << ("Error!\n\n") << __E__;
	__SUP_COUT_ERR__ << "\n" << ss.str();
	xmlOut.addTextElementToData("Error", ss.str());
}

//==============================================================================
// handleFillDeleteTreeNodeRecordsXML
//	Deletes the records in the appropriate table
//		and creates a temporary version.
//	the modified-<modified tables> list is returned in xml
//
// if groupName == "" || groupKey is invalid
//	 then do for active groups
//
// parameters
//	tableGroupName (full name with key)
//	starting node path
//	modifiedTables := CSV of table/version pairs
//	recordList := CSV list of records to create
//
void ConfigurationGUISupervisor::handleFillDeleteTreeNodeRecordsXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      groupName,
    const TableGroupKey&    groupKey,
    const std::string&      startPath,
    const std::string&      modifiedTables,
    const std::string&      recordList)
{
	//	setup active tables based on input group and modified tables
	setupActiveTablesXML(xmlOut,
	                     cfgMgr,
	                     groupName,
	                     groupKey,
	                     modifiedTables,
	                     true /* refresh all */,
	                     false /* getGroupInfo */,
	                     0 /* returnMemberMap */,
	                     false /* outputActiveTables */);

	try
	{
		ConfigurationTree targetNode = cfgMgr->getNode(startPath);
		TableBase*        table      = cfgMgr->getTableByName(targetNode.getTableName());

		__SUP_COUT__ << table->getTableName() << __E__;
		TableVersion temporaryVersion;

		// if current version is not temporary
		//		create temporary
		//	else re-modify temporary version
		//	edit temporary version directly
		//	then after all edits return active versions
		//

		bool firstSave = true;

		// extract record list
		{
			std::istringstream f(recordList);
			std::string        recordUID;
			// unsigned int       i;

			while(getline(f, recordUID, ','))  // for each record
			{
				recordUID = StringMacros::decodeURIComponent(recordUID);

				__SUP_COUT__ << "recordUID " << recordUID << __E__;

				if(firstSave)  // handle version bookkeeping
				{
					if(!(temporaryVersion = targetNode.getTableVersion())
					        .isTemporaryVersion())
					{
						__SUP_COUT__ << "Start version " << temporaryVersion << __E__;
						// create temporary version for editing
						temporaryVersion = table->createTemporaryView(temporaryVersion);
						cfgMgr->saveNewTable(targetNode.getTableName(),
						                     temporaryVersion,
						                     true);  // proper bookkeeping for temporary
						                             // version with the new version

						__SUP_COUT__ << "Created temporary version " << temporaryVersion
						             << __E__;
					}
					else  // else table is already temporary version
						__SUP_COUT__ << "Using temporary version " << temporaryVersion
						             << __E__;

					firstSave = false;
				}

				// at this point have valid temporary version to edit

				// copy "delete-uid" type edit from handleSaveTreeNodeEditXML()
				// functionality
				unsigned int row =
				    table->getViewP()->findRow(table->getViewP()->getColUID(), recordUID);
				table->getViewP()->deleteRow(row);
			}
		}

		if(!firstSave)                  // only test table if there was a change
			table->getViewP()->init();  // verify new table (throws runtime_errors)

		handleFillModifiedTablesXML(xmlOut, cfgMgr);
	}
	catch(std::runtime_error& e)
	{
		__SUP_SS__ << ("Error removing record(s)!\n\n" + std::string(e.what())) << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
	catch(...)
	{
		__SUP_SS__ << ("Error removing record(s)!\n\n") << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
}  // end handleFillDeleteTreeNodeRecordsXML()

//==============================================================================
// handleFillRenameTreeNodeRecordsXML
//	Rename the records in the appropriate table
//		and creates a temporary version.
//	the modified-<modified tables> list is returned in xml
//
// if groupName == "" || groupKey is invalid
//	 then do for active groups
//
// parameters
//	tableGroupName (full name with key)
//	starting node path
//	modifiedTables := CSV of table/version pairs
//	recordList := CSV list of records to rename
//	newRecordList := CSV list of new record names
//
void ConfigurationGUISupervisor::handleFillRenameTreeNodeRecordsXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      groupName,
    const TableGroupKey&    groupKey,
    const std::string&      startPath,
    const std::string&      modifiedTables,
    const std::string&      recordList,
    const std::string&      newRecordList)
{
	//	setup active tables based on input group and modified tables
	setupActiveTablesXML(xmlOut,
	                     cfgMgr,
	                     groupName,
	                     groupKey,
	                     modifiedTables,
	                     true /* refresh all */,
	                     false /* getGroupInfo */,
	                     0 /* returnMemberMap */,
	                     false /* outputActiveTables */);

	try
	{
		ConfigurationTree targetNode = cfgMgr->getNode(startPath);
		TableBase*        table      = cfgMgr->getTableByName(targetNode.getTableName());

		__SUP_COUT__ << table->getTableName() << __E__;
		TableVersion temporaryVersion;

		// if current version is not temporary
		//		create temporary
		//	else re-modify temporary version
		//	edit temporary version directly
		//	then after all edits return active versions
		//

		// extract record list
		std::vector<std::string> recordArray =
		    StringMacros::getVectorFromString(recordList);
		std::vector<std::string> newRecordArray =
		    StringMacros::getVectorFromString(newRecordList);

		__SUP_COUTV__(StringMacros::vectorToString(recordArray));
		__SUP_COUTV__(StringMacros::vectorToString(newRecordArray));

		if(recordArray.size() == 0 || recordArray.size() != newRecordArray.size())
		{
			__SUP_SS__
			    << "Invalid record size vs new record name size, they must be the same: "
			    << recordArray.size() << " vs " << newRecordArray.size() << __E__;
			__SUP_SS_THROW__;
		}

		// handle version bookkeeping
		{
			if(!(temporaryVersion = targetNode.getTableVersion()).isTemporaryVersion())
			{
				__SUP_COUT__ << "Start version " << temporaryVersion << __E__;
				// create temporary version for editing
				temporaryVersion = table->createTemporaryView(temporaryVersion);
				cfgMgr->saveNewTable(targetNode.getTableName(),
				                     temporaryVersion,
				                     true);  // proper bookkeeping for temporary
				                             // version with the new version

				__SUP_COUT__ << "Created temporary version " << temporaryVersion << __E__;
			}
			else  // else table is already temporary version
				__SUP_COUT__ << "Using temporary version " << temporaryVersion << __E__;
		}

		// at this point have valid temporary version to edit

		// for every record, change name
		unsigned int row;
		for(unsigned int i = 0; i < recordArray.size(); ++i)
		{
			row = table->getViewP()->findRow(
			    table->getViewP()->getColUID(),
			    StringMacros::decodeURIComponent(recordArray[i]));

			table->getViewP()->setValueAsString(
			    newRecordArray[i], row, table->getViewP()->getColUID());
		}

		table->getViewP()->init();  // verify new table (throws runtime_errors)

		handleFillModifiedTablesXML(xmlOut, cfgMgr);
	}
	catch(std::runtime_error& e)
	{
		__SUP_SS__ << ("Error renaming record(s)!\n\n" + std::string(e.what())) << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
	catch(...)
	{
		__SUP_SS__ << ("Error renaming record(s)!\n\n") << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
}  // end handleFillRenameTreeNodeRecordsXML()

//==============================================================================
// handleFillCopyTreeNodeRecordsXML
//	Copies the records in the appropriate table
//		and creates a temporary version.
//	Makes incremental unique names for each copy.
//	The modified-<modified tables> list is returned in xml
//
// if groupName == "" || groupKey is invalid
//	 then do for active groups
//
// parameters
//	tableGroupName (full name with key)
//	starting node path
//	modifiedTables := CSV of table/version pairs
//	recordList := CSV list of records to create
//	numberOfCopies := integer for number of copies for each record in recordList
//
void ConfigurationGUISupervisor::handleFillCopyTreeNodeRecordsXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      groupName,
    const TableGroupKey&    groupKey,
    const std::string&      startPath,
    const std::string&      modifiedTables,
    const std::string&      recordList,
    unsigned int            numberOfCopies /* = 1 */)
{
	if(!numberOfCopies)
		numberOfCopies = 1;  // force 0 to 1, assuming user meant to get one copy

	//	setup active tables based on input group and modified tables
	setupActiveTablesXML(xmlOut,
	                     cfgMgr,
	                     groupName,
	                     groupKey,
	                     modifiedTables,
	                     true /* refresh all */,
	                     false /* getGroupInfo */,
	                     0 /* returnMemberMap */,
	                     false /* outputActiveTables */);

	try
	{
		ConfigurationTree targetNode = cfgMgr->getNode(startPath);
		TableBase*        table      = cfgMgr->getTableByName(targetNode.getTableName());

		__SUP_COUT__ << table->getTableName() << __E__;
		TableVersion temporaryVersion;

		// if current version is not temporary
		//		create temporary
		//	else re-modify temporary version
		//	edit temporary version directly
		//	then after all edits return active versions
		//

		// extract record list
		std::vector<std::string> recordArray =
		    StringMacros::getVectorFromString(recordList);
		__SUP_COUTV__(StringMacros::vectorToString(recordArray));

		// handle version bookkeeping
		{
			if(!(temporaryVersion = targetNode.getTableVersion()).isTemporaryVersion())
			{
				__SUP_COUT__ << "Start version " << temporaryVersion << __E__;
				// create temporary version for editing
				temporaryVersion = table->createTemporaryView(temporaryVersion);
				cfgMgr->saveNewTable(targetNode.getTableName(),
				                     temporaryVersion,
				                     true);  // proper bookkeeping for temporary
				                             // version with the new version

				__SUP_COUT__ << "Created temporary version " << temporaryVersion << __E__;
			}
			else  // else table is already temporary version
				__SUP_COUT__ << "Using temporary version " << temporaryVersion << __E__;
		}

		// at this point have valid temporary version to edit

		// for every record, copy spec'd number of times
		unsigned int row;
		for(const auto& recordUID : recordArray)
		{
			row = table->getViewP()->findRow(table->getViewP()->getColUID(),
			                                 StringMacros::decodeURIComponent(recordUID));
			for(unsigned int i = 0; i < numberOfCopies; ++i)
				table->getViewP()->copyRows(
				    cfgMgr->getUsername(),
				    table->getView(),
				    row,
				    1 /*srcRowsToCopy*/,
				    -1 /*destOffsetRow*/,
				    true /*generateUniqueDataColumns*/,
				    recordUID /*baseNameAutoUID*/);  // make the name similar
		}                                            // end record loop

		table->getViewP()->init();  // verify new table (throws runtime_errors)

		handleFillModifiedTablesXML(xmlOut, cfgMgr);
	}
	catch(std::runtime_error& e)
	{
		__SUP_SS__ << ("Error copying record(s)!\n\n" + std::string(e.what())) << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
	catch(...)
	{
		__SUP_SS__ << ("Error copying record(s)!\n\n") << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
}  // end handleFillCopyTreeNodeRecordsXML()

//==============================================================================
// handleFillSetTreeNodeFieldValuesXML
//	writes for each record, the field/value pairs to the appropriate table
//		and creates a temporary version.
//	the modified-<modified tables> list is returned in xml
//
// if groupName == "" || groupKey is invalid
//	 then do for active groups
//
// parameters
//	tableGroupName (full name with key)
//	starting node path
//	modifiedTables := CSV of table/version pairs
//	recordList := CSV list of records for which to write values for fields
//	fieldList := CSV of relative-to-record-path to fields to write to each record
//	valueList := CSV of values corresponding to fields
//
void ConfigurationGUISupervisor::handleFillSetTreeNodeFieldValuesXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      groupName,
    const TableGroupKey&    groupKey,
    const std::string&      startPath,
    const std::string&      modifiedTables,
    const std::string&      recordList,
    const std::string&      fieldList,
    const std::string&      valueList,
    const std::string&      author)
{
	//	setup active tables based on input group and modified tables
	setupActiveTablesXML(xmlOut,
	                     cfgMgr,
	                     groupName,
	                     groupKey,
	                     modifiedTables,
	                     true /* refresh all */,
	                     false /* getGroupInfo */,
	                     0 /* returnMemberMap */,
	                     false /* outputActiveTables */);

	// for each field
	//	return field/value pair in xml

	try
	{
		std::vector<std::string /*relative-path*/> fieldPaths;
		// extract field list
		{
			std::istringstream f(fieldList);
			std::string        fieldPath;
			while(getline(f, fieldPath, ','))
			{
				fieldPaths.push_back(StringMacros::decodeURIComponent(fieldPath));
			}
			__SUP_COUT__ << fieldList << __E__;
			for(const auto& field : fieldPaths)
				__SUP_COUT__ << "fieldPath " << field << __E__;
		}

		std::vector<std::string /*relative-path*/> fieldValues;
		// extract value list
		{
			std::istringstream f(valueList);
			std::string        fieldValue;
			while(getline(f, fieldValue, ','))
			{
				fieldValues.push_back(
				    fieldValue);  // setURIEncodedValue is expected
				                  // StringMacros::decodeURIComponent(fieldValue));
			}

			// if last value is "" then push empty value
			if(valueList.size() && valueList[valueList.size() - 1] == ',')
				fieldValues.push_back("");

			__SUP_COUT__ << valueList << __E__;
			for(const auto& value : fieldValues)
				__SUP_COUT__ << "fieldValue " << value << __E__;
		}

		if(fieldPaths.size() != fieldValues.size())
		{
			__SUP_SS__;
			__THROW__(ss.str() + "Mismatch in fields and values array size!");
		}

		// extract record list
		{
			TableBase*         table;
			TableVersion       temporaryVersion;
			std::istringstream f(recordList);
			std::string        recordUID;
			unsigned int       i;

			while(getline(f, recordUID, ','))  // for each record
			{
				recordUID = StringMacros::decodeURIComponent(recordUID);

				/*xercesc::DOMElement* parentEl =*/
				xmlOut.addTextElementToData("fieldValues", recordUID);

				// for each field, set value
				for(i = 0; i < fieldPaths.size(); ++i)
				{
					__SUP_COUT__ << "fieldPath " << fieldPaths[i] << __E__;
					__SUP_COUT__ << "fieldValue " << fieldValues[i] << __E__;

					// doNotThrowOnBrokenUIDLinks so that link UIDs can be edited like
					// other fields
					ConfigurationTree targetNode =
					    cfgMgr->getNode(startPath + "/" + recordUID + "/" + fieldPaths[i],
					                    true /*doNotThrowOnBrokenUIDLinks*/);

					// need table, uid, columnName to set a value

					// assume correct table version is loaded by setupActiveTablesXML()
					// table = cfgMgr->getTableByName(
					//							targetNode.getTableName());
					//
					//__SUP_COUT__ << "Active version is " << table->getViewVersion() <<
					//__E__;

					// mimic handleSaveTreeNodeEditXML L 1750
					//					Actually call it! ..
					//					with a modifier?
					//					or
					//					handleSaveTreeNodeEditXML(xmlOut,
					//							cfgMgr,
					//							targetNode.getTableName(),
					//							targetNode.getTableVersion(),
					//							"value",
					//							targetNode.getUIDAsString(),
					//							targetNode.getValueName(), //col name
					//							fieldValues[i]
					//							);

					// or
					// 	(because problem is this would create a new temporary version each
					// time) if current version is not temporary
					//		create temporary
					//	else re-modify temporary version
					//	edit temporary version directly
					//	then after all edits return active versions
					//

					__SUP_COUT__ << "Getting table " << targetNode.getFieldTableName()
					             << __E__;

					// if link must get parent table name
					table = cfgMgr->getTableByName(
					    targetNode.getFieldTableName());  // NOT getTableName!
					if(!(temporaryVersion = table->getViewP()->getVersion())
					        .isTemporaryVersion())
					{
						// create temporary version for editing
						temporaryVersion =
						    table->createTemporaryView(table->getViewP()->getVersion());
						cfgMgr->saveNewTable(table->getTableName(),
						                     temporaryVersion,
						                     true);  // proper bookkeeping for temporary
						                             // version with the new version

						__SUP_COUT__ << "Created temporary version "
						             << table->getTableName() << "-v" << temporaryVersion
						             << __E__;
					}
					// else //else table is already temporary version
					__SUP_COUT__ << "Using temporary version " << table->getTableName()
					             << "-v" << temporaryVersion << __E__;

					// copy "value" type edit from handleSaveTreeNodeEditXML()
					// functionality
					table->getViewP()->setURIEncodedValue(fieldValues[i],
					                                      targetNode.getFieldRow(),
					                                      targetNode.getFieldColumn(),
					                                      author);

					table->getViewP()
					    ->init();  // verify new table (throws runtime_errors)
				}
			}
		}

		handleFillModifiedTablesXML(xmlOut, cfgMgr);
	}
	catch(std::runtime_error& e)
	{
		__SUP_SS__ << ("Error setting field values!\n\n" + std::string(e.what()))
		           << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
	catch(...)
	{
		__SUP_SS__ << ("Error setting field values!\n\n") << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
}

//==============================================================================
// handleFillGetTreeNodeFieldValuesXML
//	returns for each record, xml list of field/value pairs
//		field := relative-path
//
// if groupName == "" || groupKey is invalid
//	 then do for active groups
//
// parameters
//	tableGroupName (full name with key)
//	starting node path
//	modifiedTables := CSV of table/version pairs
//	recordStr := CSV list of records for which to lookup values for fields
//	fieldList := CSV of relative-to-record-path to filter common fields
//
void ConfigurationGUISupervisor::handleFillGetTreeNodeFieldValuesXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      groupName,
    const TableGroupKey&    groupKey,
    const std::string&      startPath,
    const std::string&      modifiedTables,
    const std::string&      recordList,
    const std::string&      fieldList)
{
	//	setup active tables based on input group and modified tables
	setupActiveTablesXML(xmlOut, cfgMgr, groupName, groupKey, modifiedTables);

	// for each field
	//	return field/value pair in xml

	try
	{
		std::vector<std::string /*relative-path*/> fieldPaths;
		// extract field list
		{
			std::istringstream f(fieldList);
			std::string        fieldPath;
			while(getline(f, fieldPath, ','))
			{
				fieldPaths.push_back(StringMacros::decodeURIComponent(fieldPath));
			}
			__SUP_COUT__ << fieldList << __E__;
		}

		// extract record list
		{
			std::istringstream f(recordList);
			std::string        recordUID;
			while(getline(f, recordUID, ','))  // for each record
			{
				recordUID = StringMacros::decodeURIComponent(recordUID);

				__SUP_COUT__ << "recordUID " << recordUID << __E__;

				xercesc::DOMElement* parentEl =
				    xmlOut.addTextElementToData("fieldValues", recordUID);

				// for each field, get value
				for(const auto& fieldPath : fieldPaths)
				{
					__SUP_COUT__ << "fieldPath " << fieldPath << __E__;

					ConfigurationTree node =
					    cfgMgr->getNode(startPath + "/" + recordUID + "/" + fieldPath);

					xmlOut.addTextElementToParent("FieldPath", fieldPath, parentEl);

					xmlOut.addTextElementToParent(
					    "FieldValue",
					    cfgMgr->getNode(startPath + "/" + recordUID + "/" + fieldPath)
					        .getValueAsString(true /*returnLinkTableValue*/),
					    parentEl);
				}
			}
		}
	}
	catch(std::runtime_error& e)
	{
		__SUP_SS__ << ("Error getting field values!\n\n" + std::string(e.what()))
		           << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
	catch(...)
	{
		__SUP_SS__ << ("Error getting field values!\n\n") << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
}

//==============================================================================
// handleFillTreeNodeCommonFieldsXML
//	returns xml list of common fields among records
//		field := relative-path
//
// if groupName == "" || groupKey is invalid
//	 then do for active groups
//
// parameters
//	tableGroupName (full name with key)
//	starting node path
//	depth from starting node path
//	modifiedTables := CSV of table/version pairs
//	recordList := CSV of records to search for fields
//	fieldList := CSV of relative-to-record-path to filter common fields
//		(accept or reject [use ! as first character to reject])
//		[use leading*  to ignore relative path - note that only leading and trailing
// wildcards work]
//
void ConfigurationGUISupervisor::handleFillTreeNodeCommonFieldsXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      groupName,
    const TableGroupKey&    groupKey,
    const std::string&      startPath,
    unsigned int            depth,
    const std::string&      modifiedTables,
    const std::string&      recordList,
    const std::string&      fieldList)
{
	//	setup active tables based on input group and modified tables
	setupActiveTablesXML(xmlOut, cfgMgr, groupName, groupKey, modifiedTables);

	try
	{
		xercesc::DOMElement* parentEl = xmlOut.addTextElementToData("fields", startPath);

		if(depth == 0)
		{
			__SUP_SS__ << "Depth of search must be greater than 0." << __E__;
			__SUP_COUT__ << ss.str();
			__SS_THROW__;  // done if 0 depth, no fields
		}

		// do not allow traversing for common fields from root level
		//	the tree view should be used for such a purpose
		// if(startPath == "/")
		//	return;

		std::vector<ConfigurationTree::RecordField> retFieldList;

		{
			ConfigurationTree startNode = cfgMgr->getNode(startPath);
			if(startNode.isLinkNode() && startNode.isDisconnected())
			{
				__SUP_SS__ << "Start path was a disconnected link node!" << __E__;
				__SUP_SS_THROW__;
				return;  // quietly ignore disconnected links at depth
				         // note: at the root level they will be flagged for the user
			}

			std::vector<std::string /*relative-path*/> fieldAcceptList, fieldRejectList;
			if(fieldList != "")
			{
				// extract field filter list
				{
					std::istringstream f(fieldList);
					std::string        fieldPath, decodedFieldPath;
					while(getline(f, fieldPath, ','))
					{
						decodedFieldPath = StringMacros::decodeURIComponent(fieldPath);

						if(decodedFieldPath[0] == '!')  // reject field
							fieldRejectList.push_back(decodedFieldPath.substr(1));
						else
							fieldAcceptList.push_back(decodedFieldPath);
					}
					__SUP_COUT__ << fieldList << __E__;
					for(auto& field : fieldAcceptList)
						__SUP_COUT__ << "fieldAcceptList " << field << __E__;
					for(auto& field : fieldRejectList)
						__SUP_COUT__ << "fieldRejectList " << field << __E__;
				}
			}

			std::vector<std::string /*relative-path*/> records;
			if(recordList == "*")  // handle all records case
			{
				records.clear();
				records = startNode.getChildrenNames();
				__SUP_COUT__ << "Translating wildcard..." << __E__;
				for(auto& record : records)
					__SUP_COUT__ << "recordList " << record << __E__;
			}
			else if(recordList != "")
			{
				// extract record list
				{
					std::istringstream f(recordList);
					std::string        recordStr;
					while(getline(f, recordStr, ','))
					{
						records.push_back(StringMacros::decodeURIComponent(recordStr));
					}
					__SUP_COUT__ << recordList << __E__;
					for(auto& record : records)
						__SUP_COUT__ << "recordList " << record << __E__;
				}
			}

			//=== get common fields call!
			retFieldList = startNode.getCommonFields(
			    records, fieldAcceptList, fieldRejectList, depth);
			//=== end get common fields call!
		}

		xercesc::DOMElement* parentTypeEl;
		for(const auto& fieldInfo : retFieldList)
		{
			xmlOut.addTextElementToParent(
			    "FieldTableName", fieldInfo.tableName_, parentEl);
			xmlOut.addTextElementToParent(
			    "FieldColumnName", fieldInfo.columnName_, parentEl);
			xmlOut.addTextElementToParent(
			    "FieldRelativePath", fieldInfo.relativePath_, parentEl);
			xmlOut.addTextElementToParent(
			    "FieldColumnType", fieldInfo.columnInfo_->getType(), parentEl);
			xmlOut.addTextElementToParent(
			    "FieldColumnDataType", fieldInfo.columnInfo_->getDataType(), parentEl);
			xmlOut.addTextElementToParent("FieldColumnDefaultValue",
			                              fieldInfo.columnInfo_->getDefaultValue(),
			                              parentEl);
			// again, should min and max be included here?
			parentTypeEl =
			    xmlOut.addTextElementToParent("FieldColumnDataChoices", "", parentEl);

			// if there are associated data choices, send info
			auto dataChoices = fieldInfo.columnInfo_->getDataChoices();
			xmlOut.addTextElementToParent(
			    "FieldColumnDataChoice",  // add default to list to mimic tree handling
			    fieldInfo.columnInfo_->getDefaultValue(),
			    parentTypeEl);
			for(const auto& dataChoice : dataChoices)
				xmlOut.addTextElementToParent(
				    "FieldColumnDataChoice", dataChoice, parentTypeEl);
		}
	}
	catch(std::runtime_error& e)
	{
		__SUP_SS__ << ("Error getting common fields!\n\n" + std::string(e.what()))
		           << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
	catch(...)
	{
		__SUP_SS__ << ("Error getting common fields!\n\n") << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
}

//==============================================================================
// handleFillUniqueFieldValuesForRecordsXML
//	returns xml list of unique values for each fields among records
//		field := relative-path
//
//	return xml
//		<xml>
//			<field val=relative-path>
//				<unique_val val=uval0>
//				<unique_val val=uval1>
//				.. next unique value
//			</field>
//			... next field
//		</xml>
//
// if groupName == "" || groupKey is invalid
//	 then do for active groups
//
// parameters
//		tableGroupName (full name with key)
//		starting node path
//		modifiedTables := CSV of table/version pairs
//		recordList := CSV of records to search for unique values
//		fieldList := CSV of fields relative-to-record-path for which to get list of unique
// values 			fieldList = AUTO is a special keyword
//				if AUTO, then server picks filter fields (usually 3, with preference
//				for GroupID, On/Off, and FixedChoice fields.
//
void ConfigurationGUISupervisor::handleFillUniqueFieldValuesForRecordsXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      groupName,
    const TableGroupKey&    groupKey,
    const std::string&      startPath,
    const std::string&      modifiedTables,
    const std::string&      recordList,
    const std::string&      fieldList)
{
	//	setup active tables based on input group and modified tables
	setupActiveTablesXML(xmlOut, cfgMgr, groupName, groupKey, modifiedTables);

	try
	{
		// do not allow traversing for common fields from root level
		//	the tree view should be used for such a purpose
		if(startPath == "/")
			return;

		ConfigurationTree startNode = cfgMgr->getNode(startPath);
		if(startNode.isLinkNode() && startNode.isDisconnected())
		{
			__SUP_SS__ << "Start path was a disconnected link node!" << __E__;
			__SUP_COUT_ERR__ << "\n" << ss.str();
			__SS_THROW__;
		}

		// extract records list
		std::vector<std::string /*relative-path*/> records;
		if(recordList == "*")  // handle all records case
		{
			records.clear();
			records = startNode.getChildrenNames();
			__SUP_COUT__ << "Translating wildcard..." << __E__;
			for(auto& record : records)
				__SUP_COUT__ << "recordList " << record << __E__;
		}
		else if(recordList != "")
		{
			// extract record list
			{
				std::istringstream f(recordList);
				std::string        recordStr;
				while(getline(f, recordStr, ','))
				{
					records.push_back(StringMacros::decodeURIComponent(recordStr));
				}
				__SUP_COUT__ << recordList << __E__;
				for(auto& record : records)
					__SUP_COUT__ << "recordList " << record << __E__;
			}
		}  // end records extraction

		// extract fields to get
		std::vector<std::string /*relative-path*/> fieldsToGet;
		if(fieldList != "")
		{
			// extract field filter list

			if(fieldList == "AUTO")
			{
				// automatically choose 3 fields, with preference
				//	for GroupID, On/Off, and FixedChoice fields.

				__SUP_COUT__ << "Getting AUTO filter fields!" << __E__;

				std::vector<ConfigurationTree::RecordField> retFieldList;
				std::vector<std::string /*relative-path*/>  fieldAcceptList,
				    fieldRejectList;
				fieldRejectList.push_back("*" + TableViewColumnInfo::COL_NAME_COMMENT);
				retFieldList = startNode.getCommonFields(
				    records, fieldAcceptList, fieldRejectList, 5, true /*auto*/);

				for(const auto& retField : retFieldList)
					fieldsToGet.push_back(retField.relativePath_ + retField.columnName_);
			}
			else
			{
				std::istringstream f(fieldList);
				std::string        fieldPath;
				while(getline(f, fieldPath, ','))
				{
					fieldsToGet.push_back(StringMacros::decodeURIComponent(fieldPath));
				}
				__SUP_COUTV__(fieldList);
			}
		}  // end fields extraction

		__SUP_COUTV__(StringMacros::vectorToString(fieldsToGet));

		// loop through each field and get unique values among records
		{
			ConfigurationTree startNode = cfgMgr->getNode(startPath);
			std::string       fieldGroupIDChildLinkIndex;
			for(auto& field : fieldsToGet)
			{
				__SUP_COUTV__(field);

				xercesc::DOMElement* parentEl =
				    xmlOut.addTextElementToData("field", field);

				// if groupID field, give child link index
				//	this can be used to pre-select particular group(s)

				// use set to force sorted unique values
				std::set<std::string /*unique-values*/> uniqueValues =
				    startNode.getUniqueValuesForField(
				        records, field, &fieldGroupIDChildLinkIndex);

				if(fieldGroupIDChildLinkIndex != "")
					xmlOut.addTextElementToParent(
					    "childLinkIndex", fieldGroupIDChildLinkIndex, parentEl);

				for(auto& uniqueValue : uniqueValues)
				{
					__SUP_COUT__ << "uniqueValue " << uniqueValue << __E__;

					xmlOut.addTextElementToParent("uniqueValue", uniqueValue, parentEl);
				}
			}
		}
	}
	catch(std::runtime_error& e)
	{
		__SUP_SS__ << ("Error getting common fields!\n\n" + std::string(e.what()))
		           << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
	catch(...)
	{
		__SUP_SS__ << ("Error getting common fields!\n\n") << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
}  // end handleFillUniqueFieldValuesForRecordsXML()

//==============================================================================
// handleFillTreeViewXML
//	returns xml tree from path for given depth
//
// if groupName == "" || groupKey is invalid
//	 then return tree for active groups
//
// parameters
//	tableGroupName (full name with key)
//	starting node path
//	depth from starting node path
//	modifiedTables := CSV of table/version pairs
//	filterList := relative-to-record-path=value(,value,...);path=value... filtering
//		records with relative path not meeting all filter criteria
//		- can accept multiple values per field (values separated by commas) (i.e. OR)
//		- fields/value pairs separated by ; for AND
//			- Note: limitation here is there is no OR among fields/value pairs (in future,
// could separate field/value pairs by : for OR) 		e.g.
//"LinkToFETypeTable=NIMPlus,TemplateUDP;FEInterfacePluginName=NIMPlusPlugin"
//
void ConfigurationGUISupervisor::handleFillTreeViewXML(HttpXmlDocument&        xmlOut,
                                                       ConfigurationManagerRW* cfgMgr,
                                                       const std::string&      groupName,
                                                       const TableGroupKey&    groupKey,
                                                       const std::string&      startPath,
                                                       unsigned int            depth,
                                                       bool               hideStatusFalse,
                                                       const std::string& modifiedTables,
                                                       const std::string& filterList)
{
	// return xml
	//	<groupName="groupName"/>
	//	<tree="path">
	//		<node="...">
	//			<node="...">
	//				<node="...">
	//					<value="...">
	//				</node>
	//				<node="...">
	//					<value="...">
	//				</node>
	//			</node>
	//			<node="...">
	//				<value="..">
	//			</node>
	//		...
	//		</node>
	//	</tree>

	// return the startPath as root "tree" element
	//	and then display all children if depth > 0

	// Think about using this in the future to clean up the code
	//	But may not work well since there is some special functionality used below
	//	like getting group comments, and not reloading everything except for at root level
	///
	// ....
	//	//	setup active tables based on input group and modified tables

	bool usingActiveGroups = (groupName == "" || groupKey.isInvalid());
	std::map<std::string /*name*/, TableVersion /*version*/> memberMap;

	std::string accumulatedErrors = "";
	try
	{
		setupActiveTablesXML(xmlOut,
		                     cfgMgr,
		                     groupName,
		                     groupKey,
		                     modifiedTables,
		                     (startPath == "/"),  // refreshAll, if at root node, reload
		                                          // all tables so that partially loaded
		                                          // tables are not allowed
		                     (startPath == "/"),  // get group info
		                     &memberMap,          // get group member map
		                     true,                // output active tables (default)
		                     &accumulatedErrors   // accumulate errors
		);
	}
	catch(const std::runtime_error& e)
	{
		__SS__ << "Error occured setting up active tables: " << e.what() << __E__;
		accumulatedErrors += ss.str();
	}
	catch(...)
	{
		__SS__ << "Unknown error occured setting up active tables." << __E__;
		accumulatedErrors += ss.str();
	}

	if(accumulatedErrors != "")
	{
		xmlOut.addTextElementToData("Warning", accumulatedErrors);

		__SUP_COUT__ << "Active tables are setup. Warning string: '" << accumulatedErrors
		             << "'" << __E__;

		__SUP_COUT__ << "Active table versions: "
		             << StringMacros::mapToString(cfgMgr->getActiveVersions()) << __E__;
	}
	else
		__SUP_COUT__ << "Active tables are setup. No issues found." << __E__;

	try
	{
		xercesc::DOMElement* parentEl = xmlOut.addTextElementToData("tree", startPath);

		if(depth == 0)
			return;  // already returned root node in itself

		std::vector<std::pair<std::string, ConfigurationTree>> rootMap;

		if(startPath == "/")
		{
			// then consider the configurationManager the root node

			std::string accumulateTreeErrs;

			if(usingActiveGroups)
				rootMap = cfgMgr->getChildren(0, &accumulateTreeErrs);
			else
				rootMap = cfgMgr->getChildren(&memberMap, &accumulateTreeErrs);

			__SUP_COUT__ << "accumulateTreeErrs = " << accumulateTreeErrs << __E__;
			if(accumulateTreeErrs != "")
				xmlOut.addTextElementToData("TreeErrors", accumulateTreeErrs);
		}
		else
		{
			ConfigurationTree startNode = cfgMgr->getNode(startPath, true /*doNotThrowOnBrokenUIDLinks*/);
			if(startNode.isLinkNode() && startNode.isDisconnected())
			{
				xmlOut.addTextElementToData("DisconnectedStartNode", "1");
				return;  // quietly ignore disconnected links at depth
				         // note: at the root level they will be flagged for the user
			}

			std::map<std::string /*relative-path*/, std::string /*value*/> filterMap;
			StringMacros::getMapFromString(
			    filterList,
			    filterMap,
			    std::set<char>({';'}) /*pair delimiters*/,
			    std::set<char>({'='}) /*name/value delimiters*/);

			__COUTV__(StringMacros::mapToString(filterMap));

			rootMap = cfgMgr->getNode(startPath).getChildren(filterMap);
		}

		for(auto& treePair : rootMap)
			recursiveTreeToXML(
			    treePair.second, depth - 1, xmlOut, parentEl, hideStatusFalse);
	}
	catch(std::runtime_error& e)
	{
		__SUP_SS__ << "Error detected generating XML tree!\n\n " << e.what() << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
	catch(...)
	{
		__SUP_SS__ << "Error detected generating XML tree!" << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
}  // end handleFillTreeViewXML()

//==============================================================================
// recursiveTreeToXML
//	output tree to XML from this node for desired depth
//	depth of 0 means output only this node's value
//	depth of 1 means include this node's children's values, etc..
//	depth of -1(unsigned int) effectively means output full tree
void ConfigurationGUISupervisor::recursiveTreeToXML(const ConfigurationTree& t,
                                                    unsigned int             depth,
                                                    HttpXmlDocument&         xmlOut,
                                                    xercesc::DOMElement*     parentEl,
                                                    bool hideStatusFalse)
{
	__COUT_TYPE__(TLVL_DEBUG+11) << __COUT_HDR__ << t.getValueAsString() << __E__;

	if(t.isValueNode())
	{
		parentEl = xmlOut.addTextElementToParent("node", t.getValueName(), parentEl);
		xmlOut.addTextElementToParent("value", t.getValueAsString(), parentEl);
		parentEl = xmlOut.addTextElementToParent("valueType", t.getValueType(), parentEl);

		// fixed choice and bitmap both use fixed choices strings
		//	so output them to xml
		if(t.getValueType() == TableViewColumnInfo::TYPE_FIXED_CHOICE_DATA ||
		   t.getValueType() == TableViewColumnInfo::TYPE_BITMAP_DATA)
		{
			__COUT_TYPE__(TLVL_DEBUG+11) << __COUT_HDR__ << t.getValueType() << __E__;

			std::vector<std::string> choices = t.getFixedChoices();
			for(const auto& choice : choices)
				xmlOut.addTextElementToParent("fixedChoice", choice, parentEl);
		}
	}
	else
	{
		if(t.isLinkNode())
		{
			__COUT_TYPE__(TLVL_DEBUG+11) << __COUT_HDR__ << t.getValueName() << __E__;

			// Note: The order of xml fields is required by JavaScript, so do NOT change
			// order.
			parentEl = xmlOut.addTextElementToParent("node", t.getValueName(), parentEl);

			if(t.isDisconnected())
			{
				__COUT_TYPE__(TLVL_DEBUG+11) << __COUT_HDR__ << t.getValueName() << __E__;

				// xmlOut.addTextElementToParent("value", t.getValueAsString(), parentEl);
				// xmlOut.addTextElementToParent("DisconnectedLink", t.getValueAsString(),
				// parentEl);

				xmlOut.addTextElementToParent("valueType", t.getValueType(), parentEl);

				// add extra fields for disconnected link
				xmlOut.addTextElementToParent(
				    (t.isGroupLinkNode() ? "Group" : "U") + std::string("ID"),
				    t.getDisconnectedLinkID(),
				    parentEl);
				xmlOut.addTextElementToParent(
				    "LinkTableName", t.getDisconnectedTableName(), parentEl);
				xmlOut.addTextElementToParent(
				    "LinkIndex", t.getChildLinkIndex(), parentEl);

				// add fixed choices (in case link has them)
				xercesc::DOMElement* choicesParentEl =
				    xmlOut.addTextElementToParent("fixedChoices", "", parentEl);
				// try
				//{

				std::vector<std::string> choices = t.getFixedChoices();
				__COUT__ << "choices.size() " << choices.size() << __E__;

				for(const auto& choice : choices)
					xmlOut.addTextElementToParent("fixedChoice", choice, choicesParentEl);
				//}
				// catch(...)
				//{
				//	__COUT__ << "Ignoring unknown fixed choice error"
				//} //ignore no fixed choices for disconnected

				return;
			}

			// handle connected links

			xmlOut.addTextElementToParent(
			    (t.isGroupLinkNode() ? "Group" : "U") + std::string("ID"),
			    t.getValueAsString(),
			    parentEl);

			xmlOut.addTextElementToParent("LinkTableName", t.getTableName(), parentEl);
			xmlOut.addTextElementToParent("LinkIndex", t.getChildLinkIndex(), parentEl);

			// add fixed choices (in case link has them)
			{
				xercesc::DOMElement* choicesParentEl =
				    xmlOut.addTextElementToParent("fixedChoices", "", parentEl);
				std::vector<std::string> choices = t.getFixedChoices();

				for(const auto& choice : choices)
					xmlOut.addTextElementToParent("fixedChoice", choice, choicesParentEl);
			}
		}
		else  // uid node
		{
			bool returnNode = true;  // default to shown

			if(hideStatusFalse)  // only show if status evaluates to true
			{
				try  // try to get Status child as boolean..
				{    // if Status bool doesn't exist exception will be thrown
					t.getNode(TableViewColumnInfo::COL_NAME_STATUS).getValue(returnNode);
				}
				catch(...)
				{
				}
			}

			if(returnNode)
				parentEl =
				    xmlOut.addTextElementToParent("node", t.getValueAsString(), parentEl);
			else
				return;  // done.. no further depth needed for node that is not shown
		}

		// if depth>=1 toXml all children
		// child.toXml(depth-1)
		if(depth >= 1)
		{
			auto C = t.getChildren();
			for(auto& c : C)
				recursiveTreeToXML(
				    c.second, depth - 1, xmlOut, parentEl, hideStatusFalse);
		}
	}
}  // end recursiveTreeToXML()

//==============================================================================
// handleGetLinkToChoicesXML
//	return all possible choices for link
//		linkIdType = "UID" or "GroupID"
//
//	as xml:
//	<linkToChoice = xxx>
void ConfigurationGUISupervisor::handleGetLinkToChoicesXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      linkToTableName,
    const TableVersion&     linkToTableVersion,
    const std::string&      linkIdType,
    const std::string&      linkIndex,
    const std::string&      linkInitId)
try
{
	// get table
	//	if uid link
	//		return all uids
	//	if groupid link
	//		find target column
	//		create the set of values (unique values only)
	//			note: insert group unions individually (i.e. groups | separated)

	// get table and activate target version
	//	rename to re-use code template
	const std::string&  tableName = linkToTableName;
	const TableVersion& version   = linkToTableVersion;
	TableBase*          table     = cfgMgr->getTableByName(tableName);
	try
	{
		table->setActiveView(version);
	}
	catch(...)
	{
		__SUP_COUT__ << "Failed to find stored version, so attempting to load version: "
		             << version << __E__;
		cfgMgr->getVersionedTableByName(tableName, version);
	}

	if(version != table->getViewVersion())
	{
		__SUP_SS__ << "Target table version (" << version
		           << ") is not the currently active version (" << table->getViewVersion()
		           << ". Try refreshing the tree." << __E__;
		__SUP_COUT_WARN__ << ss.str();
		__SS_THROW__;
	}

	__SUP_COUT__ << "Active version is " << table->getViewVersion() << __E__;

	if(linkIdType == "UID")
	{
		// give all UIDs
		unsigned int col = table->getView().getColUID();
		for(unsigned int row = 0; row < table->getView().getNumberOfRows(); ++row)
			xmlOut.addTextElementToData("linkToChoice",
			                            table->getView().getDataView()[row][col]);
	}
	else if(linkIdType == "GroupID")
	{
		//		find target column
		//		create the set of values (unique values only)
		//			note: insert group unions individually (i.e. groups | separated)

		__SUP_COUTV__(linkIndex);
		__SUP_COUTV__(linkInitId);

		std::set<std::string> setOfGroupIDs =
		    table->getView().getSetOfGroupIDs(linkIndex);

		// build list of groupids
		//	always include initial link group id in choices
		//	(even if not in set of group ids)
		bool foundInitId = false;
		for(const auto& groupID : setOfGroupIDs)
		{
			if(!foundInitId && linkInitId == groupID)
				foundInitId = true;  // mark init id found

			xmlOut.addTextElementToData("linkToChoice", groupID);
		}
		// if init id was not found, add to list
		if(!foundInitId)
			xmlOut.addTextElementToData("linkToChoice", linkInitId);

		// give all UIDs
		unsigned int col = table->getView().getColUID();
		for(unsigned int row = 0; row < table->getView().getNumberOfRows(); ++row)
		{
			xmlOut.addTextElementToData("groupChoice",
			                            table->getView().getDataView()[row][col]);
			if(table->getView().isEntryInGroup(row, linkIndex, linkInitId))
				xmlOut.addTextElementToData("groupMember",
				                            table->getView().getDataView()[row][col]);
		}
	}
	else
	{
		__SUP_SS__ << "Unrecognized linkIdType '" << linkIdType << ".'" << __E__;
		__SS_THROW__;
	}
}
catch(std::runtime_error& e)
{
	__SUP_SS__ << "Error detected saving tree node!\n\n " << e.what() << __E__;
	__SUP_COUT_ERR__ << "\n" << ss.str() << __E__;
	xmlOut.addTextElementToData("Error", ss.str());
}
catch(...)
{
	__SUP_SS__ << "Error detected saving tree node!\n\n " << __E__;
	__SUP_COUT_ERR__ << "\n" << ss.str() << __E__;
	xmlOut.addTextElementToData("Error", ss.str());
}

//==============================================================================
// handleMergeGroupsXML
void ConfigurationGUISupervisor::handleMergeGroupsXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      groupANameContext,
    const TableGroupKey&    groupAKeyContext,
    const std::string&      groupBNameContext,
    const TableGroupKey&    groupBKeyContext,
    const std::string&      groupANameConfig,
    const TableGroupKey&    groupAKeyConfig,
    const std::string&      groupBNameConfig,
    const TableGroupKey&    groupBKeyConfig,
    const std::string&      author,
    const std::string&      mergeApproach)
try
{
	__SUP_COUT__ << "Merging context group pair " << groupANameContext << " ("
	             << groupAKeyContext << ") & " << groupBNameContext << " ("
	             << groupBKeyContext << ") and table group pair " << groupANameConfig
	             << " (" << groupAKeyConfig << ") & " << groupBNameConfig << " ("
	             << groupBKeyConfig << ") with approach '" << mergeApproach << __E__;

	// Merges group A and group B
	//	with consideration for UID conflicts
	// Result is a new key of group A's name
	//
	// There 3 modes:
	//	Rename		-- All records from both groups are maintained, but conflicts from B
	// are  renamed.
	//					Must maintain a map of UIDs that are remapped to new name for
	// groupB, 					because linkUID fields must be preserved. 	Replace		--
	// Any UID conflicts for a record are replaced by the record from group B.
	//	Skip		-- Any UID conflicts for a record are skipped so that group A record
	// remains

	// check valid mode
	if(!(mergeApproach == "Rename" || mergeApproach == "Replace" ||
	     mergeApproach == "Skip"))
	{
		__SS__ << "Error! Invalid merge approach '" << mergeApproach << ".'" << __E__;
		__SS_THROW__;
	}

	std::map<std::string /*name*/, TableVersion /*version*/> memberMapAContext,
	    memberMapBContext, memberMapAConfig, memberMapBConfig;

	// check if skipping group pairs
	bool skippingContextPair = false;
	bool skippingConfigPair  = false;
	if(groupANameContext.size() == 0 || groupANameContext[0] == ' ' ||
	   groupBNameContext.size() == 0 || groupBNameContext[0] == ' ')
	{
		skippingContextPair = true;
		__SUP_COUTV__(skippingContextPair);
	}
	if(groupANameConfig.size() == 0 || groupANameConfig[0] == ' ' ||
	   groupBNameConfig.size() == 0 || groupBNameConfig[0] == ' ')
	{
		skippingConfigPair = true;
		__SUP_COUTV__(skippingConfigPair);
	}

	// get context group member maps
	if(!skippingContextPair)
	{
		cfgMgr->loadTableGroup(groupANameContext,
		                       groupAKeyContext,
		                       false /*doActivate*/,
		                       &memberMapAContext,
		                       0 /*progressBar*/,
		                       0 /*accumulateErrors*/,
		                       0 /*groupComment*/,
		                       0 /*groupAuthor*/,
		                       0 /*groupCreationTime*/,
		                       false /*doNotLoadMember*/,
		                       0 /*groupTypeString*/
		);
		__SUP_COUTV__(StringMacros::mapToString(memberMapAContext));

		cfgMgr->loadTableGroup(groupBNameContext,
		                       groupBKeyContext,
		                       false /*doActivate*/,
		                       &memberMapBContext,
		                       0 /*progressBar*/,
		                       0 /*accumulateErrors*/,
		                       0 /*groupComment*/,
		                       0 /*groupAuthor*/,
		                       0 /*groupCreationTime*/,
		                       false /*doNotLoadMember*/,
		                       0 /*groupTypeString*/
		);

		__SUP_COUTV__(StringMacros::mapToString(memberMapBContext));
	}

	// get table group member maps
	if(!skippingConfigPair)
	{
		cfgMgr->loadTableGroup(groupANameConfig,
		                       groupAKeyConfig,
		                       false /*doActivate*/,
		                       &memberMapAConfig,
		                       0 /*progressBar*/,
		                       0 /*accumulateErrors*/,
		                       0 /*groupComment*/,
		                       0 /*groupAuthor*/,
		                       0 /*groupCreationTime*/,
		                       false /*doNotLoadMember*/,
		                       0 /*groupTypeString*/
		);
		__SUP_COUTV__(StringMacros::mapToString(memberMapAConfig));

		cfgMgr->loadTableGroup(groupBNameConfig,
		                       groupBKeyConfig,
		                       false /*doActivate*/,
		                       &memberMapBConfig,
		                       0 /*progressBar*/,
		                       0 /*accumulateErrors*/,
		                       0 /*groupComment*/,
		                       0 /*groupAuthor*/,
		                       0 /*groupCreationTime*/,
		                       false /*doNotLoadMember*/,
		                       0 /*groupTypeString*/
		);

		__SUP_COUTV__(StringMacros::mapToString(memberMapBConfig));
	}

	// for each member of B
	//	if not found in A member map, add it
	//	if found in both member maps, and versions are different, load both tables and
	// merge

	std::map<std::pair<std::string /*original table*/, std::string /*original uidB*/>,
	         std::string /*converted uidB*/>
	    uidConversionMap;
	std::map<
	    std::pair<std::string /*original table*/,
	              std::pair<std::string /*group linkid*/, std::string /*original gidB*/>>,
	    std::string /*converted gidB*/>
	    groupidConversionMap;

	std::stringstream mergeReport;
	mergeReport << "======================================" << __E__;
	mergeReport << "Time of merge: " << StringMacros::getTimestampString() << __E__;
	mergeReport << "Merging context group pair " << groupANameContext << " ("
	            << groupAKeyContext << ") & " << groupBNameContext << " ("
	            << groupBKeyContext << ") and table group pair " << groupANameConfig
	            << " (" << groupAKeyConfig << ") & " << groupBNameConfig << " ("
	            << groupBKeyConfig << ") with approach '" << mergeApproach << __E__;
	mergeReport << "======================================" << __E__;

	// first loop create record conversion map, second loop implement merge (using
	// conversion map if Rename)
	for(unsigned int i = 0; i < 2; ++i)
	{
		if(i == 0 && mergeApproach != "Rename")
			continue;  // only need to construct uidConversionMap for rename approach

		// loop for context and table pair types
		for(unsigned int j = 0; j < 2; ++j)
		{
			if(j == 0 && skippingContextPair)  // context
			{
				__COUT__ << "Skipping context pair..." << __E__;
				continue;
			}
			else if(j == 1 && skippingConfigPair)
			{
				__COUT__ << "Skipping table pair..." << __E__;
				continue;
			}

			std::map<std::string /*name*/, TableVersion /*version*/>& memberMapAref =
			    j == 0 ? memberMapAContext : memberMapAConfig;

			std::map<std::string /*name*/, TableVersion /*version*/>& memberMapBref =
			    j == 0 ? memberMapBContext : memberMapBConfig;

			if(j == 0)  // context
				__COUT__ << "Context pair..." << __E__;
			else
				__COUT__ << "Table pair..." << __E__;

			__COUT__ << "Starting member map B scan." << __E__;
			for(const auto& bkey : memberMapBref)
			{
				__SUP_COUTV__(bkey.first);

				if(memberMapAref.find(bkey.first) == memberMapAref.end())
				{
					mergeReport << "\n'" << mergeApproach << "'-Missing table '"
					            << bkey.first << "' A=v" << -1 << ", adding B=v"
					            << bkey.second << __E__;

					// not found, so add to A member map
					memberMapAref[bkey.first] = bkey.second;
				}
				else if(memberMapAref[bkey.first] != bkey.second)
				{
					// found table version confict
					__SUP_COUTV__(memberMapAref[bkey.first]);
					__SUP_COUTV__(bkey.second);

					// load both tables, and merge
					TableBase* table = cfgMgr->getTableByName(bkey.first);

					__SUP_COUT__ << "Got table." << __E__;

					TableVersion newVersion = table->mergeViews(
					    cfgMgr
					        ->getVersionedTableByName(bkey.first,
					                                  memberMapAref[bkey.first])
					        ->getView(),
					    cfgMgr->getVersionedTableByName(bkey.first, bkey.second)
					        ->getView(),
					    TableVersion() /* destinationVersion*/,
					    author,
					    mergeApproach /*Rename,Replace,Skip*/,
					    uidConversionMap,
					    groupidConversionMap,
					    i == 0 /* fillRecordConversionMaps */,
					    i == 1 /* applyRecordConversionMaps */,
					    table->getTableName() ==
					        ConfigurationManager::
					            XDAQ_APPLICATION_TABLE_NAME /* generateUniqueDataColumns
					                                         */
					    ,
					    &mergeReport);  // dont make destination version the first time

					if(i == 1)
					{
						__SUP_COUTV__(newVersion);

						try
						{
							// save all temporary tables to persistent tables
							// finish off the version creation
							newVersion =
							    ConfigurationSupervisorBase::saveModifiedVersionXML(
							        xmlOut,
							        cfgMgr,
							        bkey.first,
							        TableVersion() /*original source version*/,
							        false /* makeTemporary */,
							        table,
							        newVersion /*temporary modified version*/,
							        false /*ignore duplicates*/,
							        true /*look for equivalent*/);
						}
						catch(std::runtime_error& e)
						{
							__SUP_SS__
							    << "There was an error saving the '"
							    << table->getTableName()
							    << "' merge result to a persistent table version. "
							    << "Perhaps you can modify this table in one of the "
							       "groups to resolve this issue, and then re-merge."
							    << __E__ << e.what();
							__SS_THROW__;
						}

						__SUP_COUTV__(newVersion);

						memberMapAref[bkey.first] = newVersion;
					}
				}  // end member version conflict handling
			}      // end B member map loop
		}          // end context and table loop
	}              // end top level conversion map or not loop

	// Now save groups

	if(!skippingContextPair)
	{
		__SUP_COUT__ << "New context member map complete." << __E__;
		__SUP_COUTV__(StringMacros::mapToString(memberMapAContext));

		// save the new table group
		TableGroupKey newKeyContext = cfgMgr->saveNewTableGroup(
		    groupANameContext,
		    memberMapAContext,
		    "Merger of group " + groupANameContext + " (" + groupAKeyContext.toString() +
		        ") and " + groupBNameContext + " (" + groupBKeyContext.toString() + ").");

		// return new resulting group
		xmlOut.addTextElementToData("ContextGroupName", groupANameContext);
		xmlOut.addTextElementToData("ContextGroupKey", newKeyContext.toString());
	}
	if(!skippingConfigPair)
	{
		__SUP_COUT__ << "New table member map complete." << __E__;
		__SUP_COUTV__(StringMacros::mapToString(memberMapAConfig));

		// save the new table group
		TableGroupKey newKeyConfig = cfgMgr->saveNewTableGroup(
		    groupANameConfig,
		    memberMapAConfig,
		    "Merger of group " + groupANameConfig + " (" + groupAKeyConfig.toString() +
		        ") and " + groupBNameConfig + " (" + groupBKeyConfig.toString() + ").");

		// return new resulting group
		xmlOut.addTextElementToData("ConfigGroupName", groupANameConfig);
		xmlOut.addTextElementToData("ConfigGroupKey", newKeyConfig.toString());
	}

	// output merge report
	{
		std::string mergeReportBasePath = std::string(__ENV__("USER_DATA"));
		std::string mergeReportPath     = "/ServiceData/";
		// make merge report directories in case they don't exist
		mkdir((mergeReportBasePath + mergeReportPath).c_str(), 0755);
		mergeReportPath += "ConfigurationGUI_mergeReports/";
		// make merge report directories in case they don't exist
		mkdir((mergeReportBasePath + mergeReportPath).c_str(), 0755);

		mergeReportPath += "merge_" + std::to_string(clock()) + ".txt";
		__SUP_COUTV__(mergeReportPath);

		FILE* fp = fopen((mergeReportBasePath + mergeReportPath).c_str(), "w");
		if(fp)
		{
			fprintf(fp, "%s", mergeReport.str().c_str());
			fclose(fp);
			xmlOut.addTextElementToData("MergeReportFile",
			                            "/$USER_DATA/" + mergeReportPath);
		}
		else
			xmlOut.addTextElementToData("MergeReportFile", "FILE FAILURE");
	}  // end output merge report

}  // end handleMergeGroupsXML
catch(std::runtime_error& e)
{
	__SUP_SS__ << "Error merging context group pair " << groupANameContext << " ("
	           << groupAKeyContext << ") & " << groupBNameContext << " ("
	           << groupBKeyContext << ") and table group pair " << groupANameConfig
	           << " (" << groupAKeyConfig << ") & " << groupBNameConfig << " ("
	           << groupBKeyConfig << ") with approach '" << mergeApproach << "': \n\n"
	           << e.what() << __E__;
	__SUP_COUT_ERR__ << "\n" << ss.str() << __E__;
	xmlOut.addTextElementToData("Error", ss.str());
}
catch(...)
{
	__SUP_SS__ << "Unknown error merging context group pair " << groupANameContext << " ("
	           << groupAKeyContext << ") & " << groupBNameContext << " ("
	           << groupBKeyContext << ") and table group pair " << groupANameConfig
	           << " (" << groupAKeyConfig << ") & " << groupBNameConfig << " ("
	           << groupBKeyConfig << ") with approach '" << mergeApproach << ".' \n\n";
	__SUP_COUT_ERR__ << "\n" << ss.str() << __E__;
	xmlOut.addTextElementToData("Error", ss.str());
}

//==============================================================================
// handleSavePlanCommandSequenceXML
void ConfigurationGUISupervisor::handleSavePlanCommandSequenceXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      groupName,
    const TableGroupKey&    groupKey,
    const std::string&      modifiedTables,
    const std::string&      author,
    const std::string&      planName,
    const std::string&      commandString)
try
{
	__MOUT__ << "handleSavePlanCommandSequenceXML" << __E__;

	//	setup active tables based on input group and modified tables
	setupActiveTablesXML(xmlOut,
	                     cfgMgr,
	                     groupName,
	                     groupKey,
	                     modifiedTables,
	                     true /* refresh all */,
	                     false /* getGroupInfo */,
	                     0 /* returnMemberMap */,
	                     false /* outputActiveTables */);

	TableEditStruct planTable(IterateTable::PLAN_TABLE,
	                          cfgMgr);  // Table ready for editing!
	TableEditStruct targetTable(IterateTable::TARGET_TABLE,
	                            cfgMgr);  // Table ready for editing!

	// create table-edit struct for each iterate command type
	std::map<std::string, TableEditStruct> commandTypeToCommandTableMap;
	for(const auto& commandPair : IterateTable::commandToTableMap_)
		if(commandPair.second != "")  // skip tables with no parameters
			commandTypeToCommandTableMap.emplace(std::pair<std::string, TableEditStruct>(
			    commandPair.first, TableEditStruct(commandPair.second, cfgMgr)));

	// try to catch any errors while editing..
	//	if errors delete temporary plan view (if created here)
	try
	{
		//	Steps:
		//		Reset plan commands
		// 			Remove all commands in group "<plan>-Plan"
		//				Delete linked command parameters row (in separate table)
		//				If no group remaining, then delete row.
		//
		//		Save plan commands (if modified)
		//			Create rows and add them to group "<plan>-Plan"
		//				create row for command paramaters and add to proper table

		std::string groupName = planName + "-Plan";
		__SUP_COUT__ << "Handling commands for group " << groupName << __E__;

		unsigned int groupIdCol =
		    planTable.tableView_->findCol(IterateTable::planTableCols_.GroupID_);
		unsigned int cmdTypeCol =
		    planTable.tableView_->findCol(IterateTable::planTableCols_.CommandType_);

		unsigned int targetGroupIdCol =
		    targetTable.tableView_->findCol(IterateTable::targetCols_.GroupID_);
		unsigned int targetTableCol =
		    targetTable.tableView_->findCol(IterateTable::targetCols_.TargetLink_);
		unsigned int targetUIDCol =
		    targetTable.tableView_->findCol(IterateTable::targetCols_.TargetLinkUID_);

		std::string groupLinkIndex =
		    planTable.tableView_->getColumnInfo(groupIdCol).getChildLinkIndex();
		__SUP_COUT__ << "groupLinkIndex: " << groupLinkIndex << __E__;

		std::pair<unsigned int /*link col*/, unsigned int /*link id col*/> commandUidLink;
		{
			bool isGroup;  // local because we know is uid link
			planTable.tableView_->getChildLink(
			    planTable.tableView_->findCol(IterateTable::planTableCols_.CommandLink_),
			    isGroup,
			    commandUidLink);
		}

		unsigned int cmdRow, cmdCol;
		std::string  targetGroupName;

		// Reset existing plan commands
		{
			std::string targetUID, cmdType;

			for(unsigned int row = 0; row < planTable.tableView_->getNumberOfRows();
			    ++row)
			{
				targetUID = planTable.tableView_
				                ->getDataView()[row][planTable.tableView_->getColUID()];
				__SUP_COUT__ << "targetUID: " << targetUID << __E__;

				// remove command from plan group.. if no more groups, delete
				if(planTable.tableView_->isEntryInGroup(row, groupLinkIndex, groupName))
				{
					__SUP_COUT__ << "Removing." << __E__;

					// delete linked command
					//	find linked UID in table (mapped by type)
					cmdType = planTable.tableView_->getDataView()[row][cmdTypeCol];
					if(commandTypeToCommandTableMap.find(cmdType) !=
					   commandTypeToCommandTableMap
					       .end())  // skip if invalid command type
					{
						cmdRow =
						    commandTypeToCommandTableMap[cmdType].tableView_->findRow(
						        commandTypeToCommandTableMap[cmdType]
						            .tableView_->getColUID(),
						        planTable.tableView_
						            ->getDataView()[row][commandUidLink.second]);

						// before deleting row...
						// look for target group
						//	remove all targets in group
						try
						{
							cmdCol =
							    commandTypeToCommandTableMap[cmdType].tableView_->findCol(
							        IterateTable::commandTargetCols_.TargetsLinkGroupID_);
							targetGroupName =
							    commandTypeToCommandTableMap[cmdType]
							        .tableView_->getDataView()[cmdRow][cmdCol];

							for(unsigned int trow = 0;
							    trow < targetTable.tableView_->getNumberOfRows();
							    ++trow)
							{
								// remove command from target group..
								if(targetTable.tableView_->isEntryInGroup(
								       trow,
								       commandTypeToCommandTableMap[cmdType]
								           .tableView_->getColumnInfo(cmdCol)
								           .getChildLinkIndex(),
								       targetGroupName))
								{
									__SUP_COUT__ << "Removing target." << __E__;
									// remove command entry in plan table
									if(targetTable.tableView_->removeRowFromGroup(
									       trow,
									       targetGroupIdCol,
									       targetGroupName,
									       true /*deleteRowIfNoGroup*/))
										--trow;  // since row was deleted, go back!
								}
							}
						}
						catch(...)
						{
							__SUP_COUT__ << "No targets." << __E__;
						}

						// now no more targets, delete row

						commandTypeToCommandTableMap[cmdType].tableView_->deleteRow(
						    cmdRow);

						commandTypeToCommandTableMap[cmdType].modified_ = true;
					}

					// remove command entry in plan table
					if(planTable.tableView_->removeRowFromGroup(
					       row, groupIdCol, groupName, true /*deleteRowIfNoGroup*/))
						--row;  // since row was deleted, go back!
				}
			}
		}

		// Done resetting existing plan
		// Now save new commands

		std::vector<IterateTable::Command> commands;

		// extract command sequence and add to table
		//	into vector with type, and params
		{
			std::istringstream f(commandString);
			std::string        commandSubString, paramSubString, paramValue;
			int                i;
			while(getline(f, commandSubString, ';'))
			{
				__SUP_COUT_TYPE__(TLVL_DEBUG+11) << __COUT_HDR__ << "commandSubString " << commandSubString << __E__;
				std::istringstream g(commandSubString);

				i = 0;
				while(getline(g, paramSubString, ','))
				{
					__SUP_COUT_TYPE__(TLVL_DEBUG+12) << __COUT_HDR__ << "paramSubString " << paramSubString << __E__;
					if(i == 0)  // type
					{
						if(paramSubString != "type")
						{
							__SUP_SS__ << "Invalid command sequence" << __E__;
							__SS_THROW__;
						}
						// create command object
						commands.push_back(IterateTable::Command());

						getline(g, paramValue, ',');
						++i;
						__SUP_COUT_TYPE__(TLVL_DEBUG+13) << __COUT_HDR__ << "paramValue " << paramValue << __E__;
						commands.back().type_ = paramValue;
					}
					else  // params
					{
						getline(g, paramValue, ',');
						++i;
						__SUP_COUT_TYPE__(TLVL_DEBUG+13) << __COUT_HDR__ << "paramValue " << paramValue << __E__;

						commands.back().params_.emplace(
						    std::pair<std::string /*param name*/,
						              std::string /*param value*/>(
						        paramSubString,
						        StringMacros::decodeURIComponent(paramValue)));
					}

					++i;
				}
			}

		}  // end extract command sequence

		__SUP_COUT__ << "commands size " << commands.size() << __E__;

		// at this point, have extracted commands

		// now save commands to plan group
		//	group should be "<plan>-Plan"

		unsigned int row, tgtRow;
		unsigned int targetIndex;
		std::string  targetStr, cmdUID;

		for(auto& command : commands)
		{
			__SUP_COUT__ << "command " << command.type_ << __E__;
			__SUP_COUT__ << "table " << IterateTable::commandToTableMap_.at(command.type_)
			             << __E__;

			// create command entry at plan level
			row = planTable.tableView_->addRow(
			    author, true /*incrementUniqueData*/, "planCommand");
			planTable.tableView_->addRowToGroup(row, groupIdCol, groupName);

			// set command type
			planTable.tableView_->setURIEncodedValue(command.type_, row, cmdTypeCol);

			// set command status true
			planTable.tableView_->setValueAsString(
			    "1", row, planTable.tableView_->getColStatus());

			// create command specifics
			if(commandTypeToCommandTableMap.find(command.type_) !=
			   commandTypeToCommandTableMap.end())  // if table exists in map! (some
			                                        // commands may have no parameters)
			{
				__SUP_COUT__ << "table "
				             << commandTypeToCommandTableMap[command.type_].tableName_
				             << __E__;

				// at this point have table, tempVersion, and createdFlag

				// create command parameter entry at command level
				cmdRow = commandTypeToCommandTableMap[command.type_].tableView_->addRow(
				    author, true /*incrementUniqueData*/, command.type_ + "_COMMAND_");

				// parameters are linked
				// now set value of all parameters
				//	find parameter column, and set value
				//	if special target parameter, extract targets
				for(auto& param : command.params_)
				{
					__SUP_COUT__ << "\t param " << param.first << " : " << param.second
					             << __E__;

					if(param.first == IterateTable::targetParams_.Tables_)
					{
						__SUP_COUT__ << "\t\t found target tables" << __E__;
						std::istringstream f(param.second);

						targetIndex = 0;
						while(getline(f, targetStr, '='))
						{
							__SUP_COUT__ << "\t\t targetStr = " << targetStr << __E__;
							if(!command.targets_.size() ||
							   command.targets_.back().table_ != "")
							{
								__SUP_COUT__ << "\t\t make targetStr = " << targetStr
								             << __E__;
								// make new target
								command.addTarget();
								command.targets_.back().table_ = targetStr;
							}
							else  // file existing target
								command.targets_[targetIndex++].table_ = targetStr;
						}

						continue;  // go to next parameter
					}

					if(param.first == IterateTable::targetParams_.UIDs_)
					{
						__SUP_COUT__ << "\t\t found target UIDs" << __E__;
						std::istringstream f(param.second);

						targetIndex = 0;
						while(getline(f, targetStr, '='))
						{
							__SUP_COUT__ << "\t\t targetStr = " << targetStr << __E__;
							if(!command.targets_.size() ||
							   command.targets_.back().UID_ != "")
							{
								__SUP_COUT__ << "\t\t make targetStr = " << targetStr
								             << __E__;
								// make new target
								command.addTarget();
								command.targets_.back().UID_ = targetStr;
							}
							else  // file existing target
								command.targets_[targetIndex++].UID_ = targetStr;
						}
						continue;
					}

					cmdCol =
					    commandTypeToCommandTableMap[command.type_].tableView_->findCol(
					        param.first);

					__SUP_COUT__ << "param col " << cmdCol << __E__;

					commandTypeToCommandTableMap[command.type_]
					    .tableView_->setURIEncodedValue(param.second, cmdRow, cmdCol);
				}  // end parameter loop

				cmdUID =
				    commandTypeToCommandTableMap[command.type_].tableView_->getDataView()
				        [cmdRow][commandTypeToCommandTableMap[command.type_]
				                     .tableView_->getColUID()];

				if(command.targets_.size())
				{
					// if targets, create group in target table

					__SUP_COUT__ << "targets found for command UID=" << cmdUID << __E__;

					// create link from command table to target
					cmdCol =
					    commandTypeToCommandTableMap[command.type_].tableView_->findCol(
					        IterateTable::commandTargetCols_.TargetsLink_);
					commandTypeToCommandTableMap[command.type_]
					    .tableView_->setValueAsString(
					        IterateTable::TARGET_TABLE, cmdRow, cmdCol);

					cmdCol =
					    commandTypeToCommandTableMap[command.type_].tableView_->findCol(
					        IterateTable::commandTargetCols_.TargetsLinkGroupID_);
					commandTypeToCommandTableMap[command.type_]
					    .tableView_->setValueAsString(
					        cmdUID + "_Targets", cmdRow, cmdCol);

					// create row(s) for each target in target table with correct groupID

					for(const auto& target : command.targets_)
					{
						__SUP_COUT__ << target.table_ << " " << target.UID_ << __E__;

						// create target entry in target table in group
						tgtRow = targetTable.tableView_->addRow(
						    author, true /*incrementUniqueData*/, "commandTarget");
						targetTable.tableView_->addRowToGroup(
						    tgtRow, targetGroupIdCol, cmdUID + "_Targets");

						// set target table
						targetTable.tableView_->setValueAsString(
						    target.table_, tgtRow, targetTableCol);

						// set target UID
						targetTable.tableView_->setValueAsString(
						    target.UID_, tgtRow, targetUIDCol);
					}
				}  // end target handling

				// add link at plan level to created UID
				planTable.tableView_->setValueAsString(
				    commandTypeToCommandTableMap[command.type_].tableName_,
				    row,
				    commandUidLink.first);
				planTable.tableView_->setValueAsString(
				    cmdUID, row, commandUidLink.second);

				__SUP_COUT__ << "linked to uid = " << cmdUID << __E__;

				commandTypeToCommandTableMap[command.type_].modified_ = true;
			}  // done with command specifics

		}  // end command loop

		// commands are created in the temporary tables
		//	validate with init

		planTable.tableView_->print();
		planTable.tableView_->init();  // verify new table (throws runtime_errors)

		__SUP_COUT__ << "requestType tables:" << __E__;

		for(auto& modifiedConfig : commandTypeToCommandTableMap)
		{
			modifiedConfig.second.tableView_->print();
			modifiedConfig.second.tableView_->init();
		}

		targetTable.tableView_->print();
		targetTable.tableView_->init();  // verify new table (throws runtime_errors)

	}  // end try for plan
	catch(...)
	{
		__SUP_COUT__ << "Handling command table errors while saving. Erasing all newly "
		                "created versions."
		             << __E__;

		// erase all temporary tables if created here

		if(planTable.createdTemporaryVersion_)  // if temporary version created here
		{
			__SUP_COUT__ << "Erasing temporary version " << planTable.tableName_ << "-v"
			             << planTable.temporaryVersion_ << __E__;
			// erase with proper version management
			cfgMgr->eraseTemporaryVersion(planTable.tableName_,
			                              planTable.temporaryVersion_);
		}

		if(targetTable.createdTemporaryVersion_)  // if temporary version created here
		{
			__SUP_COUT__ << "Erasing temporary version " << targetTable.tableName_ << "-v"
			             << targetTable.temporaryVersion_ << __E__;
			// erase with proper version management
			cfgMgr->eraseTemporaryVersion(targetTable.tableName_,
			                              targetTable.temporaryVersion_);
		}

		for(auto& modifiedConfig : commandTypeToCommandTableMap)
		{
			if(modifiedConfig.second
			       .createdTemporaryVersion_)  // if temporary version created here
			{
				__SUP_COUT__ << "Erasing temporary version "
				             << modifiedConfig.second.tableName_ << "-v"
				             << modifiedConfig.second.temporaryVersion_ << __E__;
				// erase with proper version management
				cfgMgr->eraseTemporaryVersion(modifiedConfig.second.tableName_,
				                              modifiedConfig.second.temporaryVersion_);
			}
		}

		throw;  // re-throw
	}

	// all edits are complete and tables verified
	//	need to save all edits properly
	//	if not modified, discard

	TableVersion finalVersion = ConfigurationSupervisorBase::saveModifiedVersionXML(
	    xmlOut,
	    cfgMgr,
	    planTable.tableName_,
	    planTable.originalVersion_,
	    true /*make temporary*/,
	    planTable.table_,
	    planTable.temporaryVersion_,
	    true /*ignoreDuplicates*/);  // save temporary version properly

	__SUP_COUT__ << "Final plan version is " << planTable.tableName_ << "-v"
	             << finalVersion << __E__;

	finalVersion = ConfigurationSupervisorBase::saveModifiedVersionXML(
	    xmlOut,
	    cfgMgr,
	    targetTable.tableName_,
	    targetTable.originalVersion_,
	    true /*make temporary*/,
	    targetTable.table_,
	    targetTable.temporaryVersion_,
	    true /*ignoreDuplicates*/);  // save temporary version properly

	__SUP_COUT__ << "Final target version is " << targetTable.tableName_ << "-v"
	             << finalVersion << __E__;

	for(auto& modifiedConfig : commandTypeToCommandTableMap)
	{
		if(!modifiedConfig.second.modified_)
		{
			if(modifiedConfig.second
			       .createdTemporaryVersion_)  // if temporary version created here
			{
				__SUP_COUT__ << "Erasing unmodified temporary version "
				             << modifiedConfig.second.tableName_ << "-v"
				             << modifiedConfig.second.temporaryVersion_ << __E__;
				// erase with proper version management
				cfgMgr->eraseTemporaryVersion(modifiedConfig.second.tableName_,
				                              modifiedConfig.second.temporaryVersion_);
			}
			continue;
		}

		finalVersion = ConfigurationSupervisorBase::saveModifiedVersionXML(
		    xmlOut,
		    cfgMgr,
		    modifiedConfig.second.tableName_,
		    modifiedConfig.second.originalVersion_,
		    true /*make temporary*/,
		    modifiedConfig.second.table_,
		    modifiedConfig.second.temporaryVersion_,
		    true /*ignoreDuplicates*/);  // save temporary version properly

		__SUP_COUT__ << "Final version is " << modifiedConfig.second.tableName_ << "-v"
		             << finalVersion << __E__;
	}

	handleFillModifiedTablesXML(xmlOut, cfgMgr);
}
catch(std::runtime_error& e)
{
	__SUP_SS__ << "Error detected saving Iteration Plan!\n\n " << e.what() << __E__;
	__SUP_COUT_ERR__ << "\n" << ss.str() << __E__;
	xmlOut.addTextElementToData("Error", ss.str());
}
catch(...)
{
	__SUP_SS__ << "Error detected saving Iteration Plan!\n\n " << __E__;
	__SUP_COUT_ERR__ << "\n" << ss.str() << __E__;
	xmlOut.addTextElementToData("Error", ss.str());
}  // end handleSavePlanCommandSequenceXML

//==============================================================================
// handleSaveTreeNodeEditXML
//	Changes the value specified by UID/Column
//	 in the specified version of the table.
//
//	Error, if the specified version is not the active one.
//	If the version is not temporary make a new temporary version
//
//	return this information on success
//	<resultingTargetTableVersion = xxx>
void ConfigurationGUISupervisor::handleSaveTreeNodeEditXML(HttpXmlDocument&        xmlOut,
                                                           ConfigurationManagerRW* cfgMgr,
                                                           const std::string& tableName,
                                                           TableVersion       version,
                                                           const std::string& type,
                                                           const std::string& uid,
                                                           const std::string& colName,
                                                           const std::string& newValue,
                                                           const std::string& author)
try
{
	__SUP_COUT__ << "table " << tableName << "(" << version << ")" << __E__;

	// get the current table/version
	// check if the value is new
	// if new edit value (in a temporary version only)

	// get table and activate target version
	TableBase* table = cfgMgr->getTableByName(tableName);
	try
	{
		table->setActiveView(version);
	}
	catch(...)
	{
		if(version.isTemporaryVersion())
			throw;  // if temporary, there is no hope to find lost version

		__SUP_COUT__ << "Failed to find stored version, so attempting to load version: "
		             << version << __E__;
		cfgMgr->getVersionedTableByName(tableName, version);
	}

	__SUP_COUT__ << "Active version is " << table->getViewVersion() << __E__;

	if(version != table->getViewVersion())
	{
		__SUP_SS__ << "Target table version (" << version
		           << ") is not the currently active version (" << table->getViewVersion()
		           << "). Try refreshing the tree." << __E__;
		__SS_THROW__;
	}

	unsigned int col = -1;
	if(type == "uid" || type == "delete-uid" || type == "tree-copy")
		col = table->getView().getColUID();
	else if(type == "link-UID" || type == "link-GroupID" || type == "value" ||
	        type == "value-groupid" || type == "value-bool" || type == "value-bitmap")
		col = table->getView().findCol(colName);
	else if(type == "table" || type == "link-comment" || type == "table-newGroupRow" ||
	        type == "table-newUIDRow" || type == "table-newRow")
		;  // column N/A
	else
	{
		__SUP_SS__ << "Impossible! Unrecognized edit type: " << type << __E__;
		__SS_THROW__;
	}

	// check if the comment value is new before making temporary version
	if(type == "table" || type == "link-comment")
	{
		// editing comment, so check if comment is different
		if(table->getView().isURIEncodedCommentTheSame(newValue))
		{
			__SUP_SS__ << "Comment '" << newValue
			           << "' is the same as the current comment. No need to save change."
			           << __E__;
			__SS_THROW__;
		}
	}

	// version handling:
	//	always make a new temporary-version from source-version
	//	edit temporary-version
	//		if edit fails
	//			delete temporary-version
	//		else
	//			return new temporary-version
	//			if source-version was temporary
	//				then delete source-version

	TableVersion temporaryVersion = table->createTemporaryView(version);

	__SUP_COUT__ << "Created temporary version " << temporaryVersion << __E__;

	TableView* cfgView = table->getTemporaryView(temporaryVersion);
	cfgView->init();  // prepare maps

	// edit/verify new table (throws runtime_errors)
	try
	{
		// have view so edit it
		if(type == "table" || type == "link-comment")
		{
			// edit comment
			cfgView->setURIEncodedComment(newValue);
		}
		else if(type == "table-newRow" || type == "table-newUIDRow")
		{
			// add row
			unsigned int row = cfgView->addRow(
			    author, true /*incrementUniqueData*/, newValue /*baseNameAutoUID*/);

			// if TableViewColumnInfo::COL_NAME_STATUS exists, set it to true
			try
			{
				col = cfgView->getColStatus();
				cfgView->setValueAsString("1", row, col);
			}
			catch(...)
			{
			}  // if not, ignore

			// set UID value
			cfgView->setURIEncodedValue(newValue, row, cfgView->getColUID());
		}
		else if(type == "table-newGroupRow")
		{
			// get index value and group id value
			unsigned int csvIndex = newValue.find(',');

			std::string linkIndex = newValue.substr(0, csvIndex);
			std::string groupId   = newValue.substr(csvIndex + 1);

			// get new row UID value from second part of string
			csvIndex              = groupId.find(',');
			std::string newRowUID = groupId.substr(csvIndex + 1);
			groupId               = groupId.substr(0, csvIndex);

			__SUP_COUT__ << "newValue " << linkIndex << "," << groupId << "," << newRowUID
			             << __E__;

			// add row
			unsigned int row = cfgView->addRow(
			    author, true /*incrementUniqueData*/, newRowUID /*baseNameAutoID*/);

			// set UID value
			cfgView->setURIEncodedValue(newRowUID, row, cfgView->getColUID());

			// find groupId column from link index
			col = cfgView->getLinkGroupIDColumn(linkIndex);

			// set group id
			cfgView->setURIEncodedValue(groupId, row, col);

			// if TableViewColumnInfo::COL_NAME_STATUS exists, set it to true
			try
			{
				col = cfgView->getColStatus();
				cfgView->setValueAsString("1", row, col);
			}
			catch(...)
			{
			}  // if not, ignore
		}
		else if(type == "delete-uid")
		{
			// delete row
			unsigned int row = cfgView->findRow(col, uid);
			cfgView->deleteRow(row);
		}
		else if(type == "tree-copy")
		{
			// recursively copy to depth
			__COUTV__(newValue);
			std::vector<std::string> paramArray =
			    StringMacros::getVectorFromString(newValue);
			__COUTV__(StringMacros::vectorToString(paramArray));

			if(paramArray.size() != 2)
			{
				__SS__ << "Illegal parameters for tree copy request: must be number of "
				          "copy instances & depth of copy."
				       << __E__;
				__SS_THROW__;
			}

			unsigned int row = cfgView->findRow(col, uid);
			__COUTV__(uid);
			__COUTV__(row);
			unsigned int numberOfInstances = atoi(paramArray[0].c_str());
			unsigned int depth             = atoi(paramArray[1].c_str());
			__COUTV__(depth);
			__COUTV__(numberOfInstances);
			if(numberOfInstances > 1000)
			{
				__SS__ << "Illegal parameters - the maximum number of copy instances is "
				          "1000. Number of instances provided was "
				       << numberOfInstances << __E__;
				__SS_THROW__;
			}

			std::map<std::string /*modified table*/, TableVersion /* modified version */>
			    modifiedTablesMap =
			        cfgMgr
			            ->getActiveVersions();  // handling copied from
			                                    // ConfigurationGUISupervisor::handleFillModifiedTablesXML()
			ConfigurationSupervisorBase::recursiveCopyTreeUIDNode(xmlOut,
			                                                      cfgMgr,
			                                                      modifiedTablesMap,
			                                                      depth,
			                                                      depth,
			                                                      numberOfInstances,
			                                                      cfgView,
			                                                      uid);
		}
		else if(type == "uid" || type == "value" || type == "value-groupid" ||
		        type == "value-bool" || type == "value-bitmap")
		{
			unsigned int row = cfgView->findRow(cfgView->getColUID(), uid);
			if(!cfgView->setURIEncodedValue(newValue, row, col, author))
			{
				// no change! so discard
				__SUP_SS__ << "Value '" << newValue
				           << "' is the same as the current value. No need to save "
				              "change to tree node."
				           << __E__;
				__SS_THROW__;
			}
		}
		else if(type == "link-UID" || type == "link-GroupID")
		{
			bool                                                               isGroup;
			std::pair<unsigned int /*link col*/, unsigned int /*link id col*/> linkPair;
			if(!cfgView->getChildLink(col, isGroup, linkPair))
			{
				// not a link ?!
				__SUP_SS__ << "Col '" << colName << "' is not a link column." << __E__;
				__SS_THROW__;
			}

			__SUP_COUT__ << "linkPair " << linkPair.first << "," << linkPair.second
			             << __E__;

			std::string linkIndex = cfgView->getColumnInfo(col).getChildLinkIndex();

			__SUP_COUT__ << "linkIndex " << linkIndex << __E__;

			// find table value and id value
			unsigned int csvIndexStart = 0, csvIndex = newValue.find(',');

			std::string newTable  = newValue.substr(csvIndexStart, csvIndex);
			csvIndexStart         = csvIndex + 1;
			csvIndex              = newValue.find(',', csvIndexStart);
			std::string newLinkId = newValue.substr(
			    csvIndexStart,
			    csvIndex -
			        csvIndexStart);  // if no more commas will take the rest of string

			__SUP_COUT__ << "newValue " << newTable << "," << newLinkId << __E__;

			// change target table in two parts
			unsigned int row     = cfgView->findRow(cfgView->getColUID(), uid);
			bool         changed = false;
			bool         needSecondaryChange = (type == "link-GroupID");

			if(!cfgView->setURIEncodedValue(newTable, row, linkPair.first, author))
			{
				// no change
				__SUP_COUT__ << "Value '" << newTable
				             << "' is the same as the current value." << __E__;
			}
			else
			{
				changed = true;
				// do NOT need secondary change for UID
			}

			std::string originalValue = cfgView->getValueAsString(row, linkPair.second);
			if(!cfgView->setURIEncodedValue(newLinkId, row, linkPair.second, author))
			{
				// no change
				__SUP_COUT__ << "Value '" << newLinkId
				             << "' is the same as the current value." << __E__;
			}
			else
			{
				if(!changed)
					needSecondaryChange =
					    true;  // if table was unchanged, then need secondary change for
					           // UID (groupID is already assumed needed)
				changed = true;
			}

			if(needSecondaryChange)  // do secondary changes to child table target
			{
				bool secondaryChanged = false;
				bool defaultIsInGroup =
				    false;  // use to indicate if a recent new member was created

				// first close out main target table
				if(!changed)  // if no changes throw out new version
				{
					__SUP_COUT__ << "No changes to primary view. Erasing temporary table."
					             << __E__;
					table->eraseView(temporaryVersion);
				}
				else  // if changes, save it
				{
					try
					{
						cfgView->init();  // verify new table (throws runtime_errors)

						ConfigurationSupervisorBase::saveModifiedVersionXML(
						    xmlOut,
						    cfgMgr,
						    tableName,
						    version,
						    true /*make temporary*/,
						    table,
						    temporaryVersion,
						    true /*ignoreDuplicates*/);  // save
						                                 // temporary
						                                 // version
						                                 // properly
					}
					catch(std::runtime_error&
					          e)  // erase temporary view before re-throwing error
					{
						__SUP_COUT__ << "Caught error while editing main table. Erasing "
						                "temporary version."
						             << __E__;
						table->eraseView(temporaryVersion);
						changed = false;  // undo changed bool

						// send warning so that, secondary table can still be changed
						xmlOut.addTextElementToData(
						    "Warning",
						    "Error saving primary tree node! " + std::string(e.what()));
					}
				}

				// now, onto linked table

				// get the current linked table/version
				// check if the value is new
				// if new edit value (in a temporary version only)

				__SUP_COUTV__(newValue);
				csvIndexStart = csvIndex + 1;
				csvIndex      = newValue.find(',', csvIndexStart);
				version       = TableVersion(newValue.substr(
                    csvIndexStart, csvIndex - csvIndexStart));  // if no more commas will
				                                                // take the rest of string

				if(newTable == TableViewColumnInfo::DATATYPE_LINK_DEFAULT)
				{
					// done, since init was already tested
					// the result should be purposely DISCONNECTED link
					return;
				}

				// get table and activate target version
				table = cfgMgr->getTableByName(newTable);
				try
				{
					table->setActiveView(version);
				}
				catch(...)
				{
					if(version.isTemporaryVersion())
						throw;  // if temporary, there is no hope to find lost version

					__SUP_COUT__ << "Failed to find stored version, so attempting to "
					                "load version: "
					             << newTable << " v" << version << __E__;
					cfgMgr->getVersionedTableByName(newTable, version);
				}

				__SUP_COUT__ << newTable << " active version is "
				             << table->getViewVersion() << __E__;

				if(version != table->getViewVersion())
				{
					__SUP_SS__;
					if(version.isMockupVersion())
						ss << "Target table '" << newTable
						   << "' is likely not a member of the current table group "
						   << "since the mock-up version was not successfully loaded. "
						   << "\n\n"
						   <<
						    // same as ConfigurationGUI.html L:9833
						    (std::string("") +
						     "To add a table to a group, click the group name to go to "
						     "the " +
						     "group view, then click 'Add/Remove/Modify Member Tables.' "
						     "You " +
						     "can then add or remove tables and save the new group." +
						     "\n\n" +
						     "OR!!! Click the following button to add the table '" +
						     newTable +
						     "' to the currently active Configuration Group: " +
						     "<input type='button' style='color:black !important;' " +
						     "title='Click to add table to the active Configuration "
						     "Group' " +
						     "onclick='addTableToConfigurationGroup(\"" + newTable +
						     "\"); Debug.closeErrorPop();event.stopPropagation();' "
						     "value='Add Table'>" +
						     "</input>")
						   << __E__;
					else
						ss << "Target table version (" << version
						   << ") is not the currently active version ("
						   << table->getViewVersion() << "). Try refreshing the tree."
						   << __E__;
					__SS_THROW__;
				}

				// create temporary version for editing
				temporaryVersion = table->createTemporaryView(version);

				__SUP_COUT__ << "Created temporary version " << temporaryVersion << __E__;

				cfgView = table->getTemporaryView(temporaryVersion);

				cfgView->init();  // prepare column lookup map

				if(type == "link-UID")
				{
					// handle UID links slightly differently
					//	when editing link-UID,.. if specified name does not exist in child
					// table, 	then change the UID in the child table (rename target
					// record).
					//  Otherwise, it is impossible to rename unique links targets in the
					//  tree-view GUI.

					col = cfgView->getColUID();
					__SUP_COUT__ << "target col " << col << __E__;

					unsigned int row = -1;
					try
					{
						row = cfgView->findRow(col, newLinkId);
					}
					catch(...)  // ignore not found error
					{
					}
					if(row == (unsigned int)-1)  // if row not found then add a row
					{
						__SUP_COUT__ << "New link UID '" << newLinkId
						             << "' was not found, so attempting to change UID of "
						                "target record '"
						             << originalValue << "'" << __E__;
						try
						{
							row = cfgView->findRow(col, originalValue);
							if(cfgView->setURIEncodedValue(newLinkId, row, col, author))
							{
								secondaryChanged = true;
								__SUP_COUT__ << "Original target record '"
								             << originalValue << "' was changed to '"
								             << newLinkId << "'" << __E__;
							}
						}
						catch(...)  // ignore not found error
						{
							__SUP_COUT__ << "Original target record '" << originalValue
							             << "' not found." << __E__;
						}
					}
				}
				else if(type == "link-GroupID")
				{
					// handle groupID links slightly differently
					//	have to look at changing link table too!
					// 	if group ID, set all in member list to be members of group

					col = cfgView->getLinkGroupIDColumn(linkIndex);

					__SUP_COUT__ << "target col " << col << __E__;

					// extract vector of members to be
					std::vector<std::string> memberUIDs;
					do
					{
						csvIndexStart = csvIndex + 1;
						csvIndex      = newValue.find(',', csvIndexStart);
						memberUIDs.push_back(
						    newValue.substr(csvIndexStart, csvIndex - csvIndexStart));
						__SUP_COUT__ << "memberUIDs: " << memberUIDs.back() << __E__;
					} while(csvIndex !=
					        (unsigned int)std::string::npos);  // no more commas

					// for each row,
					//	check if should be in group
					//		if should be but is not
					//			add to group, CHANGE
					//		if should not be but is
					//			remove from group, CHANGE
					//

					std::string targetUID;
					bool        shouldBeInGroup;
					bool        isInGroup;

					for(unsigned int row = 0; row < cfgView->getNumberOfRows(); ++row)
					{
						targetUID = cfgView->getDataView()[row][cfgView->getColUID()];
						__SUP_COUT__ << "targetUID: " << targetUID << __E__;

						shouldBeInGroup = false;
						for(unsigned int i = 0; i < memberUIDs.size(); ++i)
							if(targetUID == memberUIDs[i])
							{
								// found in member uid list
								shouldBeInGroup = true;
								break;
							}

						isInGroup = cfgView->isEntryInGroup(row, linkIndex, newLinkId);

						// if should be but is not
						if(shouldBeInGroup && !isInGroup)
						{
							__SUP_COUT__ << "Changed to YES: " << row << __E__;
							secondaryChanged = true;

							cfgView->addRowToGroup(row, col, newLinkId);

						}  // if should not be but is
						else if(!shouldBeInGroup && isInGroup)
						{
							__SUP_COUT__ << "Changed to NO: " << row << __E__;
							secondaryChanged = true;

							cfgView->removeRowFromGroup(row, col, newLinkId);
						}
						else if(targetUID ==
						            cfgView
						                ->getDefaultRowValues()[cfgView->getColUID()] &&
						        isInGroup)
						{
							// use to indicate if a recent new member was created
							defaultIsInGroup = true;
						}
					}
				}  // end (type == "link-GroupID")

				// first close out main target table
				if(!secondaryChanged)  // if no changes throw out new version
				{
					__SUP_COUT__
					    << "No changes to secondary view. Erasing temporary table."
					    << __E__;
					table->eraseView(temporaryVersion);
				}
				else  // if changes, save it
				{
					try
					{
						cfgView->init();  // verify new table (throws runtime_errors)

						ConfigurationSupervisorBase::saveModifiedVersionXML(
						    xmlOut,
						    cfgMgr,
						    newTable,
						    version,
						    true /*make temporary*/,
						    table,
						    temporaryVersion,
						    true /*ignoreDuplicates*/);  // save
						                                 // temporary
						                                 // version
						                                 // properly
					}
					catch(std::runtime_error&
					          e)  // erase temporary view before re-throwing error
					{
						__SUP_COUT__ << "Caught error while editing secondary table. "
						                "Erasing temporary version."
						             << __E__;
						table->eraseView(temporaryVersion);
						secondaryChanged = false;  // undo changed bool

						// send warning so that, secondary table can still be changed
						xmlOut.addTextElementToData(
						    "Warning",
						    "Error saving secondary tree node! " + std::string(e.what()));
					}
				}

				// Block error message if default is in group, assume new member was just
				// created. Blocked because its hard to detect if changes were recently
				// made (one idea: to check if all other values are defaults, to assume it
				// was just created)
				if(0 && !changed && !secondaryChanged && !defaultIsInGroup)
				{
					__SUP_SS__ << "Link to table '" << newTable << "', linkID '"
					           << newLinkId
					           << "', and selected group members are the same as the "
					              "current value. "
					           << "No need to save changes to tree." << __E__;
					__SS_THROW__;
				}

				return;  // exit since table inits were already tested
			}
			else if(0 && !changed)  // '0 &&' to block error message because sometimes
			                        // things get setup twice depending on the path of the
			                        // user (e.g. when editing links in tree-view)
			{  // '0 &&' to block error message also because versions are temporary at
			   // this point anyway, might as well abuse temporary versions
				__SUP_SS__ << "Link to table '" << newTable << "' and linkID '"
				           << newLinkId
				           << "' are the same as the current values. No need to save "
				              "change to tree node."
				           << __E__;
				__SS_THROW__;
			}
		}

		cfgView->init();  // verify new table (throws runtime_errors)
	}
	catch(...)  // erase temporary view before re-throwing error
	{
		__SUP_COUT__ << "Caught error while editing. Erasing temporary version." << __E__;
		table->eraseView(temporaryVersion);
		throw;
	}

	ConfigurationSupervisorBase::saveModifiedVersionXML(
	    xmlOut,
	    cfgMgr,
	    tableName,
	    version,
	    true /*make temporary*/,
	    table,
	    temporaryVersion,
	    true /*ignoreDuplicates*/);  // save temporary version properly
}
catch(std::runtime_error& e)
{
	__SUP_SS__ << "Error saving tree node! " << e.what() << __E__;
	__SUP_COUT_ERR__ << "\n" << ss.str() << __E__;
	xmlOut.addTextElementToData("Error", ss.str());
}
catch(...)
{
	__SUP_SS__ << "Unknown Error saving tree node! " << __E__;
	__SUP_COUT_ERR__ << "\n" << ss.str() << __E__;
	xmlOut.addTextElementToData("Error", ss.str());
}

//==============================================================================
// handleGetTableXML
//
//	if INVALID or version does not exists, default to mock-up
//
// give the detail of specific table specified
//	by tableName and version
//
// if no version selected, default to latest version
// if no versions exists, default to mock-up
//
// return existing versions
// return column headers
// return number of rows
// from dataOffset
// first CHUNK_SIZE rows
//
// return this information
//<table name=xxx version=xxx rowCount=xxx chunkReq=xxx chunkSz=xxx>
//	<existing version=xxx>
//	<existing version=xxx>
//	....
//	<colhdr name=xxx>
//	<colhdr name=xxx>
//	....
//	<rowdata>
//		<cell value=xxx>
//		<cell value=xxx>
//		....
//	</rowdata>
//	<rowdata>
//		....
//	</rowdata>
//	....
//</table>
//
//
// Note: options.. if allowIllegalColumns then attempts to load data to current mockup
// column names
//	if not allowIllegalColumns, then it is still ok if the source has more or less
// columns: 	the client is notified through "TableWarnings" field in this case.
void ConfigurationGUISupervisor::handleGetTableXML(HttpXmlDocument&        xmlOut,
                                                   ConfigurationManagerRW* cfgMgr,
                                                   const std::string&      tableName,
                                                   TableVersion            version,
                                                   bool allowIllegalColumns /* = false */,
                                                   bool getRawData /* = false */)
try
{
	char                 tmpIntStr[100];
	xercesc::DOMElement *parentEl, *subparentEl;

	std::string accumulatedErrors = "";

	if(allowIllegalColumns)
		xmlOut.addTextElementToData("allowIllegalColumns", "1");

	const std::map<std::string, TableInfo>&
	    allTableInfo =  // if allowIllegalColumns, then also refresh
	    cfgMgr->getAllTableInfo(allowIllegalColumns,
	                            allowIllegalColumns ? &accumulatedErrors : 0,
	                            tableName);  // filter errors by tableName

	TableBase* table = cfgMgr->getTableByName(tableName);

	if(!getRawData)
	{
		// send all table names along with
		//	and check for specific version
		xmlOut.addTextElementToData("ExistingTableNames",
		                            TableViewColumnInfo::DATATYPE_LINK_DEFAULT);
		for(auto& configPair : allTableInfo)
		{
			xmlOut.addTextElementToData("ExistingTableNames", configPair.first);
			if(configPair.first == tableName &&  // check that version exists
			   configPair.second.versions_.find(version) ==
			       configPair.second.versions_.end())
			{
				__SUP_COUT__ << "Version not found, so using mockup." << __E__;
				version = TableVersion();  // use INVALID
			}
		}
	}

	xmlOut.addTextElementToData("TableName", tableName);  // table name
	xmlOut.addTextElementToData("TableDescription",
	                            table->getTableDescription());  // table name

	// existing table versions
	if(!getRawData)
	{
		// get version aliases for translation
		std::map<
		    std::string /*table name*/,
		    std::map<std::string /*version alias*/, TableVersion /*aliased version*/>>
		    versionAliases;
		try
		{
			// use whatever backbone is currently active
			versionAliases = cfgMgr->getVersionAliases();
			for(const auto& aliases : versionAliases)
				for(const auto& alias : aliases.second)
					__SUP_COUT__ << "ALIAS: " << aliases.first << " " << alias.first
					             << " ==> " << alias.second << __E__;
		}
		catch(const std::runtime_error& e)
		{
			__SUP_COUT__ << "Could not get backbone information for version aliases: "
			             << e.what() << __E__;
		}

		auto tableIterator = versionAliases.find(tableName);

		parentEl = xmlOut.addTextElementToData("TableVersions", "");
		for(const TableVersion& v : allTableInfo.at(tableName).versions_)
		{
			subparentEl =
			    xmlOut.addTextElementToParent("Version", v.toString(), parentEl);

			if(tableIterator != versionAliases.end())
			{
				// check if this version has one or many aliases
				for(const auto& aliasPair : tableIterator->second)
				{
					if(v == aliasPair.second)
					{
						__SUP_COUT__ << "Found Alias " << aliasPair.second << " --> "
						             << aliasPair.first << __E__;
						xmlOut.addTextElementToParent(
						    "VersionAlias", aliasPair.first, subparentEl);
					}
				}
			}
		}
	}

	// table columns and then rows (from table view)

	// get view pointer
	TableView* tableViewPtr;
	if(version.isInvalid())  // use mock-up
	{
		tableViewPtr = table->getMockupViewP();
	}
	else  // use view version
	{
		try
		{
			// locally accumulate 'manageable' errors getting the version to avoid
			// reverting to mockup
			std::string localAccumulatedErrors = "";
			tableViewPtr =
			    cfgMgr
			        ->getVersionedTableByName(tableName,
			                                  version,
			                                  allowIllegalColumns /*looseColumnMatching*/,
			                                  &localAccumulatedErrors,
			                                  getRawData)
			        ->getViewP();

			if(getRawData)
			{
				xmlOut.addTextElementToData("TableRawData",
				                            tableViewPtr->getSourceRawData());

				const std::set<std::string>& srcColNames =
				    tableViewPtr->getSourceColumnNames();
				for(auto& srcColName : srcColNames)
					xmlOut.addTextElementToData("ColumnHeader", srcColName);

				if(!version.isTemporaryVersion())
				{
					// if version is temporary, view is already ok
					table->eraseView(
					    version);  // clear so that the next get will fill the table
					tableViewPtr = cfgMgr
					                   ->getVersionedTableByName(
					                       tableName,
					                       version,
					                       allowIllegalColumns /*looseColumnMatching*/,
					                       &localAccumulatedErrors,
					                       false /* getRawData */)
					                   ->getViewP();
				}
			}  // end rawData handling

			if(localAccumulatedErrors != "")
				xmlOut.addTextElementToData("Error", localAccumulatedErrors);
		}
		catch(std::runtime_error& e)  // default to mock-up for fail-safe in GUI editor
		{
			__SUP_SS__ << "Failed to get table " << tableName << " version " << version
			           << "... defaulting to mock-up! " << __E__;
			ss << "\n\n...Here is why it failed:\n\n" << e.what() << __E__;

			__SUP_COUT_ERR__ << "\n" << ss.str();
			version      = TableVersion();
			tableViewPtr = table->getMockupViewP();

			xmlOut.addTextElementToData("Error", "Error getting view! " + ss.str());
		}
		catch(...)  // default to mock-up for fail-safe in GUI editor
		{
			__SUP_SS__ << "Failed to get table " << tableName << " version: " << version
			           << "... defaulting to mock-up! "
			           << "(You may want to try again to see what was partially loaded "
			              "into cache before failure. "
			           << "If you think, the failure is due to a column name change, "
			           << "you can also try to Copy the failing view to the new column "
			              "names using "
			           << "'Copy and Move' functionality.)" << __E__;

			__SUP_COUT_ERR__ << "\n" << ss.str();
			version      = TableVersion();
			tableViewPtr = table->getMockupViewP();

			xmlOut.addTextElementToData("Error", "Error getting view! " + ss.str());
		}
	}
	xmlOut.addTextElementToData("TableVersion", version.toString());  // table version

	if(getRawData)
		return;  // no need to go further for rawData handling

	// get 'columns' of view
	xercesc::DOMElement* choicesParentEl;
	parentEl = xmlOut.addTextElementToData("CurrentVersionColumnHeaders", "");

	std::vector<TableViewColumnInfo> colInfo = tableViewPtr->getColumnsInfo();

	for(int i = 0; i < (int)colInfo.size(); ++i)  // column headers and types
	{
		xmlOut.addTextElementToParent("ColumnHeader", colInfo[i].getName(), parentEl);
		xmlOut.addTextElementToParent("ColumnType", colInfo[i].getType(), parentEl);
		xmlOut.addTextElementToParent(
		    "ColumnDataType", colInfo[i].getDataType(), parentEl);

		// NOTE!! ColumnDefaultValue defaults may be unique to this version of the table,
		// whereas DefaultRowValue are the defaults for the mockup
		xmlOut.addTextElementToParent(
		    "ColumnDefaultValue", colInfo[i].getDefaultValue(), parentEl);

		choicesParentEl = xmlOut.addTextElementToParent("ColumnChoices", "", parentEl);
		// add data choices if necessary
		if(colInfo[i].getType() == TableViewColumnInfo::TYPE_FIXED_CHOICE_DATA ||
		   colInfo[i].getType() == TableViewColumnInfo::TYPE_BITMAP_DATA ||
		   colInfo[i].isChildLink())
		{
			for(auto& choice : colInfo[i].getDataChoices())
				xmlOut.addTextElementToParent("ColumnChoice", choice, choicesParentEl);
		}

		xmlOut.addTextElementToParent(
		    "ColumnMinValue", colInfo[i].getMinValue(), parentEl);
		xmlOut.addTextElementToParent(
		    "ColumnMaxValue", colInfo[i].getMaxValue(), parentEl);
	}

	// verify mockup columns after columns are posted to xmlOut
	try
	{
		if(version.isInvalid())
			tableViewPtr->init();
	}
	catch(std::runtime_error& e)
	{
		// append accumulated errors, because they may be most useful
		__THROW__(e.what() + std::string("\n\n") + accumulatedErrors);
	}
	catch(...)
	{
		throw;
	}

	parentEl = xmlOut.addTextElementToData("CurrentVersionRows", "");

	for(int r = 0; r < (int)tableViewPtr->getNumberOfRows(); ++r)
	{
		sprintf(tmpIntStr, "%d", r);
		xercesc::DOMElement* tmpParentEl =
		    xmlOut.addTextElementToParent("Row", tmpIntStr, parentEl);

		for(int c = 0; c < (int)tableViewPtr->getNumberOfColumns(); ++c)
		{
			if(colInfo[c].getDataType() == TableViewColumnInfo::DATATYPE_TIME)
			{
				std::string timeAsString;
				tableViewPtr->getValue(timeAsString, r, c);
				xmlOut.addTextElementToParent("Entry", timeAsString, tmpParentEl);
			}
			else
				xmlOut.addTextElementToParent(
				    "Entry", tableViewPtr->getDataView()[r][c], tmpParentEl);
		}
	}

	// add "other" fields associated with configView
	xmlOut.addTextElementToData("TableComment", tableViewPtr->getComment());
	xmlOut.addTextElementToData("TableAuthor", tableViewPtr->getAuthor());
	xmlOut.addTextElementToData("TableCreationTime",
	                            std::to_string(tableViewPtr->getCreationTime()));
	xmlOut.addTextElementToData("TableLastAccessTime",
	                            std::to_string(tableViewPtr->getLastAccessTime()));

	// add to xml the default row values
	// NOTE!! ColumnDefaultValue defaults may be unique to this version of the table,
	// whereas DefaultRowValue are the defaults for the mockup
	std::vector<std::string> defaultRowValues =
	    table->getMockupViewP()->getDefaultRowValues();
	// don't give author and time.. force default author, let JS fill time
	for(unsigned int c = 0; c < defaultRowValues.size() - 2; ++c)
	{
		xmlOut.addTextElementToData("DefaultRowValue", defaultRowValues[c]);
	}

	const std::set<std::string> srcColNames = tableViewPtr->getSourceColumnNames();

	if(accumulatedErrors != "")  // add accumulated errors to xmlOut
	{
		__SUP_SS__ << (std::string("Column errors were allowed for this request, so "
		                           "perhaps you can ignore this, ") +
		               "but please note the following warnings:\n" + accumulatedErrors)
		           << __E__;
		__SUP_COUT_ERR__ << ss.str();
		xmlOut.addTextElementToData("TableWarnings", ss.str());
	}
	else if(!version.isTemporaryVersion() &&  // not temporary (these are not filled from
	                                          // interface source)
	        (srcColNames.size() != tableViewPtr->getNumberOfColumns() ||
	         tableViewPtr->getSourceColumnMismatch() !=
	             0))  // check for column size mismatch
	{
		__SUP_SS__ << "\n\nThere were warnings found when loading the table " << tableName
		           << ":v" << version << ". Please see the details below:\n\n"
		           << tableViewPtr->getMismatchColumnInfo();

		__SUP_COUT__ << "\n" << ss.str();
		xmlOut.addTextElementToData("TableWarnings", ss.str());
	}

}  // end handleGetTableXML()
catch(std::runtime_error& e)
{
	__SUP_COUT__ << "Error detected!\n\n " << e.what() << __E__;
	xmlOut.addTextElementToData("Error", "Error getting view! " + std::string(e.what()));
}
catch(...)
{
	__SUP_COUT__ << "Error detected!\n\n " << __E__;
	xmlOut.addTextElementToData("Error", "Error getting view! ");
}

//==============================================================================
//	refreshUserSession
//		Finds/creates the active user session based on username&  actionSessionIndex
//
//		Returns a configurationMangager instance dedictated to the user.
//		This configurationManager will have at least empty instances of all base
// configurations (no null pointers) 
ConfigurationManagerRW* ConfigurationGUISupervisor::refreshUserSession(
    std::string username, uint64_t activeSessionIndex, bool refresh)
{
	activeSessionIndex =
	    0;  // make session by username for now! (may never want to change back)

	std::stringstream ssMapKey;
	ssMapKey << username << ":" << activeSessionIndex;
	std::string mapKey = ssMapKey.str();
	__SUP_COUT_TYPE__(TLVL_DEBUG+15) << __COUT_HDR__ << "Using Config Session " << mapKey
					<< " ... Total Session Count: " << userConfigurationManagers_.size()
					<< __E__;

	time_t now = time(0);

	// create new table mgr if not one for active session index
	if(userConfigurationManagers_.find(mapKey) == userConfigurationManagers_.end())
	{
		__SUP_COUT_INFO__ << "Creating new Configuration Manager. time=" << time(0) << __E__;
		userConfigurationManagers_[mapKey] = new ConfigurationManagerRW(username);

		// update table info for each new configuration manager
		//	IMPORTANTLY this also fills all configuration manager pointers with instances,
		//	so we are not dealing with changing pointers later on
		userConfigurationManagers_[mapKey]->getAllTableInfo(
		    true);  // load empty instance of everything important
	}
	else if(userLastUseTime_.find(mapKey) == userLastUseTime_.end())
	{
		__SUP_SS__ << "Fatal error managing userLastUseTime_!" << __E__;
		__SUP_COUT_ERR__ << "\n" << ss.str();
		__SS_THROW__;
	}
	else if(refresh || (now - userLastUseTime_[mapKey]) >
	                       CONFIGURATION_MANAGER_REFRESH_THRESHOLD)  // check if should
	                                                                 // refresh all table
	                                                                 // info
	{
		__SUP_COUT_INFO__ << "Refreshing all table info." << __E__;
		userConfigurationManagers_[mapKey]->getAllTableInfo(true);
	}
	__SUP_COUT_TYPE__(TLVL_DEBUG+11) << __COUT_HDR__ << "Configuration Manager ready. time=" << time(0) << " " << clock() <<
		" runTimeSeconds=" << userConfigurationManagers_[mapKey]->runTimeSeconds() <<  __E__;

	// update active sessionIndex last use time
	userLastUseTime_[mapKey] = now;

	// check for stale sessions and remove them (so table user maps do not grow forever)
	for(std::map<std::string, time_t>::iterator it = userLastUseTime_.begin();
	    it != userLastUseTime_.end();
	    ++it)
		if(now - it->second > CONFIGURATION_MANAGER_EXPIRATION_TIME)  // expired!
		{
			__SUP_COUT__ << now << ":" << it->second << " = " << now - it->second
			             << __E__;
			delete userConfigurationManagers_[it->first];       // call destructor
			if(!(userConfigurationManagers_.erase(it->first)))  // erase by key
			{
				__SUP_SS__ << "Fatal error erasing configuration manager by key!"
				           << __E__;
				__SUP_COUT_ERR__ << "\n" << ss.str();
				__SS_THROW__;
			}
			userLastUseTime_.erase(it);  // erase by iterator

			it = userLastUseTime_.begin();  // fail safe.. reset it, to avoid trying to
			                                // understand what happens with the next
			                                // iterator
		}

	return userConfigurationManagers_[mapKey];
}

//==============================================================================
//	handleDeleteTableInfoXML
//
//		return nothing except Error in xmlOut
//
void ConfigurationGUISupervisor::handleDeleteTableInfoXML(HttpXmlDocument&        xmlOut,
                                                          ConfigurationManagerRW* cfgMgr,
                                                          std::string& tableName)
{
	if(0 == rename((TABLE_INFO_PATH + tableName + TABLE_INFO_EXT).c_str(),
	               (TABLE_INFO_PATH + tableName + TABLE_INFO_EXT + ".unused").c_str()))
		__SUP_COUT_INFO__ << ("Table Info File successfully renamed: " +
		                      (TABLE_INFO_PATH + tableName + TABLE_INFO_EXT + ".unused"))
		                  << __E__;
	else
	{
		__SUP_COUT_ERR__ << ("Error renaming file to " +
		                     (TABLE_INFO_PATH + tableName + TABLE_INFO_EXT + ".unused"))
		                 << __E__;

		xmlOut.addTextElementToData(
		    "Error",
		    ("Error renaming Table Info File to " +
		     (TABLE_INFO_PATH + tableName + TABLE_INFO_EXT + ".unused")));
		return;
	}

	// reload all with refresh to remove new table
	cfgMgr->getAllTableInfo(true);
}  // end handleDeleteTableInfoXML()

//==============================================================================
//	handleSaveTableInfoXML
//
//		write new info file for tableName based CSV column info
//			data="type,name,dataType;type,name,dataType;..."
//		return resulting handleGetTableXML mock-up view
//
void ConfigurationGUISupervisor::handleSaveTableInfoXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    std::string&            tableName,
    const std::string&      data,
    const std::string&      tableDescription,
    const std::string&      columnChoicesCSV,
    bool                    allowOverwrite)
{
	// create all caps name and validate
	//	only allow alpha-numeric names with "Table" at end
	std::string capsName;
	try
	{
		capsName = TableBase::convertToCaps(tableName, true);
	}
	catch(std::runtime_error& e)
	{  // error! non-alpha
		xmlOut.addTextElementToData("Error", e.what());
		return;
	}

	if(!allowOverwrite)
	{
		FILE* fp = fopen((TABLE_INFO_PATH + tableName + TABLE_INFO_EXT).c_str(), "r");
		if(fp)
		{
			fclose(fp);
			xmlOut.addTextElementToData("TableName", tableName);
			xmlOut.addTextElementToData("OverwriteError", "1");
			xmlOut.addTextElementToData(
			    "Error",
			    "File already exists! ('" +
			        (TABLE_INFO_PATH + tableName + TABLE_INFO_EXT) + "')");
			return;
		}
	}

	__SUP_COUT__ << "capsName=" << capsName << __E__;
	__SUP_COUT__ << "tableName=" << tableName << __E__;
	__SUP_COUT__ << "tableDescription=" << tableDescription << __E__;
	__SUP_COUT__ << "columnChoicesCSV=" << columnChoicesCSV << __E__;

	// create preview string to validate column info before write to file
	std::stringstream outss;

	outss << "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\" ?>\n";
	outss << "\t<ROOT xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" "
	         "xsi:noNamespaceSchemaLocation=\"TableInfo.xsd\">\n";
	outss << "\t\t<TABLE Name=\"" << tableName << "\">\n";
	outss << "\t\t\t<VIEW Name=\"" << capsName
	      << "\" Type=\"File,Database,DatabaseTest\" Description=\"" << tableDescription
	      << "\">\n";

	// each column is represented by 4 fields or 6
	//	- type, name, dataType, defaultValue, minValue, maxValue


	std::istringstream       columnChoicesISS(columnChoicesCSV);
	std::string              columnChoicesString;
	std::string              columnDefaultValue, columnMinValue, columnMaxValue;
	std::vector<std::string> columnParameters;
	std::vector<std::string> columnData =
	    StringMacros::getVectorFromString(data, {';'} /*delimiter*/);

	for(unsigned int c = 0; c < columnData.size() - 1; ++c)
	{
		columnParameters =
		    StringMacros::getVectorFromString(columnData[c], {','} /*delimiter*/);
		__COUT__ << "Column #" << c << ": "
		         << StringMacros::vectorToString(columnParameters) << __E__;
		for(unsigned int p = 0; p < columnParameters.size(); ++p)
		{
			__COUT__ << "\t Parameter #" << p << ": " << columnParameters[p] << __E__;
		}
		__COUT__ << "\t creating the new xml" << __E__;

		std::string& columnType     = columnParameters[0];
		std::string& columnDataType = columnParameters[2];

		outss << "\t\t\t\t<COLUMN Type=\"";
		outss << columnType;
		outss << "\" \t Name=\"";
		outss << columnParameters[1];
		outss << "\" \t StorageName=\"";
		try
		{
			outss << TableBase::convertToCaps(columnParameters[1]);  // now caps
		}
		catch(std::runtime_error& e)
		{  // error! non-alpha
			xmlOut.addTextElementToData("Error",
			                            std::string("For column name '") +
			                                columnParameters[1] + "' - " + e.what());
			return;
		}
		outss << "\" \t	DataType=\"";
		outss << columnDataType;

		columnDefaultValue = StringMacros::decodeURIComponent(columnParameters[3]);

		if(columnDefaultValue !=
		   TableViewColumnInfo::getDefaultDefaultValue(columnType, columnDataType))
		{
			__SUP_COUT__ << "FOUND user spec'd default value '" << columnDefaultValue
			             << "'" << __E__;
			outss << "\" \t	DefaultValue=\"";
			outss << columnParameters[3];
		}
		getline(columnChoicesISS, columnChoicesString, ';');
		outss << "\" \t	DataChoices=\"";
		outss << columnChoicesString;

		if(columnParameters.size() > 4 &&
		   columnDataType == TableViewColumnInfo::DATATYPE_NUMBER)
		{
			columnMinValue = StringMacros::decodeURIComponent(columnParameters[4]);
			if(columnMinValue != "")
			{
				if(columnMinValue !=
				   TableViewColumnInfo::getMinDefaultValue(columnDataType))
				{
					__SUP_COUT__ << "FOUND user spec'd min value '" << columnParameters[4]
					             << "'" << __E__;
					if(!StringMacros::isNumber(
					       StringMacros::convertEnvironmentVariables(columnMinValue)))
					{
						__SS__ << "Inavlid user spec'd min value '" << columnParameters[4]
						       << "' which evaluates to '" << columnMinValue
						       << "' and is not a valid number. The minimum value must "
						          "be a number (environment variables and math "
						          "operations are allowed)."
						       << __E__;
						__SS_THROW__;
					}
					outss << "\" \t	MinValue=\"" << columnParameters[4];
				}
			}

			columnMaxValue = StringMacros::decodeURIComponent(columnParameters[5]);
			if(columnMaxValue != "")
			{
				if(columnMaxValue !=
				   TableViewColumnInfo::getMaxDefaultValue(columnDataType))
				{
					__SUP_COUT__ << "FOUND user spec'd max value = " << columnMaxValue
					             << __E__;
					if(!StringMacros::isNumber(
					       StringMacros::convertEnvironmentVariables(columnMaxValue)))
					{
						__SS__ << "Inavlid user spec'd max value '" << columnParameters[5]
						       << "' which evaluates to '" << columnMaxValue
						       << "' and is not a valid number. The maximum value must "
						          "be a number (environment variables and math "
						          "operations are allowed)."
						       << __E__;
						__SS_THROW__;
					}
					outss << "\" \t	MaxValue=\"" << columnParameters[5];
				}
			}
		}
		outss << "\"/>\n";
	}

	outss << "\t\t\t</VIEW>\n";
	outss << "\t\t</TABLE>\n";
	outss << "\t</ROOT>\n";

	__SUP_COUT__ << outss.str() << __E__;

	FILE* fp = fopen((TABLE_INFO_PATH + tableName + TABLE_INFO_EXT).c_str(), "w");
	if(!fp)
	{
		xmlOut.addTextElementToData("Error",
		                            "Failed to open destination Table Info file:" +
		                                (TABLE_INFO_PATH + tableName + TABLE_INFO_EXT));
		return;
	}

	fprintf(fp, "%s", outss.str().c_str());
	fclose(fp);

	// reload all table info with refresh AND reset to pick up possibly new table
	// check for errors related to this tableName
	std::string accumulatedErrors = "";
	cfgMgr->getAllTableInfo(true, &accumulatedErrors, tableName);

	// if errors associated with this table name stop and report
	if(accumulatedErrors != "")
	{
		__SUP_SS__ << ("The new version of the '" + tableName +
		               "' table column info was saved, however errors were detected "
		               "reading back the table '" +
		               tableName + "' after the save attempt:\n\n" + accumulatedErrors)
		           << __E__;

		__SUP_COUT_ERR__ << ss.str() << __E__;
		xmlOut.addTextElementToData("Error", ss.str());

		// if error detected reading back then move the saved table info to
		// .unused
		// // This was disabled by RAR on 11/4/2016.. (just keep broken info files)
		// // ... especially since now there is a Delete button
		if(0)
		{
			// table info is illegal so report error, and disable file

			// if error detected //move file to ".unused"
			if(0 ==
			   rename((TABLE_INFO_PATH + tableName + TABLE_INFO_EXT).c_str(),
			          (TABLE_INFO_PATH + tableName + TABLE_INFO_EXT + ".unused").c_str()))
				__SUP_COUT_INFO__
				    << ("File successfully renamed: " +
				        (TABLE_INFO_PATH + tableName + TABLE_INFO_EXT + ".unused"))
				    << __E__;
			else

				__SUP_COUT_ERR__
				    << ("Error renaming file to " +
				        (TABLE_INFO_PATH + tableName + TABLE_INFO_EXT + ".unused"))
				    << __E__;

			// reload all with refresh to remove new table
			cfgMgr->getAllTableInfo(true);
		}
		return;
	}

	// return the new table info
	handleGetTableXML(xmlOut, cfgMgr, tableName, TableVersion());

	// After save, debug all table column info
	const std::map<std::string, TableInfo>& allTableInfo = cfgMgr->getAllTableInfo();

	// give a print out of currently illegal table column info
	__SUP_COUT_INFO__ << "Looking for errors in all table column info..." << __E__;
	for(const auto& cfgInfo : allTableInfo)
	{
		try
		{
			cfgMgr->getTableByName(cfgInfo.first)->getMockupViewP()->init();
		}
		catch(std::runtime_error& e)
		{
			__SUP_COUT_WARN__ << "\n\n##############################################\n"
			                  << "Error identified in column info of table '"
			                  << cfgInfo.first << "':\n\n"
			                  << e.what() << "\n\n"
			                  << __E__;
		}
	}
}  // end handleSaveTableInfoXML()

//==============================================================================
//	handleSetGroupAliasInBackboneXML
//		open current backbone
//		modify GroupAliases
//		save as new version of groupAliases
//		return new version of groupAliases
//
// Note: very similar to ConfigurationGUISupervisor::handleSetVersionAliasInBackboneXML
void ConfigurationGUISupervisor::handleSetGroupAliasInBackboneXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      groupAlias,
    const std::string&      groupName,
    TableGroupKey           groupKey,
    const std::string&      author)
try
{
	cfgMgr->loadConfigurationBackbone();
	std::map<std::string, TableVersion> activeVersions = cfgMgr->getActiveVersions();

	const std::string groupAliasesTableName =
	    ConfigurationManager::GROUP_ALIASES_TABLE_NAME;
	if(activeVersions.find(groupAliasesTableName) == activeVersions.end())
	{
		__SUP_SS__ << "Active version of " << groupAliasesTableName << " missing!"
		           << __E__;
		xmlOut.addTextElementToData("Error", ss.str());
		return;
	}

	// put all old backbone versions in xmlOut
	const std::set<std::string> backboneMembers = cfgMgr->getBackboneMemberNames();
	for(auto& memberName : backboneMembers)
	{
		__SUP_COUT__ << "activeVersions[\"" << memberName
		             << "\"]=" << activeVersions[memberName] << __E__;

		xmlOut.addTextElementToData("oldBackboneName", memberName);
		xmlOut.addTextElementToData("oldBackboneVersion",
		                            activeVersions[memberName].toString());
	}

	// make a temporary version from active view
	// modify the chosen groupAlias row
	// save as new version

	TableBase*   table            = cfgMgr->getTableByName(groupAliasesTableName);
	TableVersion originalVersion  = activeVersions[groupAliasesTableName];
	TableVersion temporaryVersion = table->createTemporaryView(originalVersion);

	__SUP_COUT__ << "\t\t temporaryVersion: " << temporaryVersion << __E__;
	bool isDifferent = false;

	try
	{
		TableView* configView = table->getTemporaryView(temporaryVersion);

		unsigned int col = configView->findCol("GroupKeyAlias");

		// only make a new version if we are changing compared to active backbone

		unsigned int row = -1;
		// find groupAlias row
		try
		{
			row = configView->findRow(col, groupAlias);
		}
		catch(...)  // ignore not found error
		{
		}
		if(row == (unsigned int)-1)  // if row not found then add a row
		{
			isDifferent = true;
			row         = configView->addRow();

			// set all columns in new row
			col = configView->findCol(TableViewColumnInfo::COL_NAME_COMMENT);
			configView->setValue(
			    "This Group Alias was automatically setup by the server.", row, col);
			col = configView->findCol("GroupKeyAlias");
			configView->setValue(groupAlias, row, col);
		}

		__SUP_COUT__ << "\t\t row: " << row << __E__;

		col = configView->findCol("GroupName");

		__SUP_COUT__ << "\t\t groupName: " << groupName << " vs "
		             << configView->getDataView()[row][col] << __E__;
		if(groupName != configView->getDataView()[row][col])
		{
			configView->setValue(groupName, row, col);
			isDifferent = true;
		}

		col = configView->findCol("GroupKey");
		__SUP_COUT__ << "\t\t groupKey: " << groupKey << " vs "
		             << configView->getDataView()[row][col] << __E__;
		if(groupKey.toString() != configView->getDataView()[row][col])
		{
			configView->setValue(groupKey.toString(), row, col);
			isDifferent = true;
		}

		if(isDifferent)  // set author/time of new version if different
		{
			configView->setValue(
			    author, row, configView->findCol(TableViewColumnInfo::COL_NAME_AUTHOR));
			configView->setValue(
			    time(0),
			    row,
			    configView->findCol(TableViewColumnInfo::COL_NAME_CREATION));
		}
	}
	catch(...)
	{
		__SUP_COUT_ERR__ << "Error editing Group Alias view!" << __E__;

		// delete temporaryVersion
		table->eraseView(temporaryVersion);
		throw;
	}

	TableVersion newAssignedVersion;
	if(isDifferent)  // make new version if different
	{
		__SUP_COUT__ << "\t\t**************************** Save as new table version"
		             << __E__;

		// save or find equivalent
		newAssignedVersion = ConfigurationSupervisorBase::saveModifiedVersionXML(
		    xmlOut,
		    cfgMgr,
		    table->getTableName(),
		    originalVersion,
		    false /*makeTemporary*/,
		    table,
		    temporaryVersion,
		    false /*ignoreDuplicates*/,
		    true /*lookForEquivalent*/);
	}
	else  // use existing version
	{
		__SUP_COUT__
		    << "\t\t**************************** Using the existing table version"
		    << __E__;

		// delete temporaryVersion
		table->eraseView(temporaryVersion);
		newAssignedVersion = activeVersions[groupAliasesTableName];

		xmlOut.addTextElementToData("savedName", groupAliasesTableName);
		xmlOut.addTextElementToData("savedVersion", newAssignedVersion.toString());
	}

	__SUP_COUT__ << "\t\t newAssignedVersion: " << newAssignedVersion << __E__;
}
catch(std::runtime_error& e)
{
	__SUP_COUT_ERR__ << "Error detected!\n\n " << e.what() << __E__;
	xmlOut.addTextElementToData(
	    "Error", "Error saving new Group Alias view!\n " + std::string(e.what()));
}
catch(...)
{
	__SUP_COUT_ERR__ << "Error detected!\n\n " << __E__;
	xmlOut.addTextElementToData("Error", "Error saving new Group Alias view! ");
}

//==============================================================================
//	handleSetTableAliasInBackboneXML
//		open current backbone
//		modify VersionAliases
//		save as new version of VersionAliases
//		return new version of VersionAliases
//
// Note: very similar to ConfigurationGUISupervisor::handleSetGroupAliasInBackboneXML
void ConfigurationGUISupervisor::handleSetTableAliasInBackboneXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      tableAlias,
    const std::string&      tableName,
    TableVersion            version,
    const std::string&      author)
try
{
	cfgMgr->loadConfigurationBackbone();
	std::map<std::string, TableVersion> activeVersions = cfgMgr->getActiveVersions();

	const std::string versionAliasesTableName =
	    ConfigurationManager::VERSION_ALIASES_TABLE_NAME;
	if(activeVersions.find(versionAliasesTableName) == activeVersions.end())
	{
		__SUP_SS__ << "Active version of " << versionAliasesTableName << " missing!"
		           << __E__;
		xmlOut.addTextElementToData("Error", ss.str());
		return;
	}

	// put all old backbone versions in xmlOut
	const std::set<std::string> backboneMembers = cfgMgr->getBackboneMemberNames();
	for(auto& memberName : backboneMembers)
	{
		__SUP_COUT__ << "activeVersions[\"" << memberName
		             << "\"]=" << activeVersions[memberName] << __E__;

		xmlOut.addTextElementToData("oldBackboneName", memberName);
		xmlOut.addTextElementToData("oldBackboneVersion",
		                            activeVersions[memberName].toString());
	}

	// make a temporary version from active view
	// modify the chosen versionAlias row
	// save as new version

	TableBase*   table            = cfgMgr->getTableByName(versionAliasesTableName);
	TableVersion originalVersion  = activeVersions[versionAliasesTableName];
	TableVersion temporaryVersion = table->createTemporaryView(originalVersion);

	__SUP_COUT__ << "\t\t temporaryVersion: " << temporaryVersion << __E__;

	bool isDifferent = false;

	try
	{
		TableView* configView = table->getTemporaryView(temporaryVersion);

		unsigned int col;
		unsigned int col2 = configView->findCol("VersionAlias");
		unsigned int col3 = configView->findCol("TableName");

		// only make a new version if we are changing compared to active backbone

		unsigned int row = -1;
		// find tableName, versionAlias pair
		//	NOTE: only accept the first pair, repeats are ignored.
		try
		{
			unsigned int tmpRow = -1;
			do
			{  // start looking from beyond last find
				tmpRow = configView->findRow(col3, tableName, tmpRow + 1);
			} while(configView->getDataView()[tmpRow][col2] != tableAlias);
			// at this point the first pair was found! (else exception was thrown)
			row = tmpRow;
		}
		catch(...)
		{
		}
		if(row == (unsigned int)-1)  // if row not found then add a row
		{
			isDifferent = true;
			row         = configView->addRow();

			// set all columns in new row
			col = configView->findCol(TableViewColumnInfo::COL_NAME_COMMENT);
			configView->setValue(
			    std::string("Entry was added by server in ") +
			        "ConfigurationGUISupervisor::setTableAliasInActiveBackbone().",
			    row,
			    col);

			col = configView->findCol("VersionAliasUID");
			configView->setValue(
			    tableName.substr(0, tableName.rfind("Table")) + tableAlias, row, col);

			configView->setValue(tableAlias, row, col2);
			configView->setValue(tableName, row, col3);
		}

		__SUP_COUT__ << "\t\t row: " << row << __E__;

		col = configView->findCol("Version");
		__SUP_COUT__ << "\t\t version: " << version << " vs "
		             << configView->getDataView()[row][col] << __E__;
		if(version.toString() != configView->getDataView()[row][col])
		{
			configView->setValue(version.toString(), row, col);
			isDifferent = true;
		}

		if(isDifferent)  // set author/time of new version if different
		{
			configView->setValue(
			    author, row, configView->findCol(TableViewColumnInfo::COL_NAME_AUTHOR));
			configView->setValue(
			    time(0),
			    row,
			    configView->findCol(TableViewColumnInfo::COL_NAME_CREATION));
		}
	}
	catch(...)
	{
		__SUP_COUT_ERR__ << "Error editing Version Alias view!" << __E__;

		// delete temporaryVersion
		table->eraseView(temporaryVersion);
		throw;
	}

	TableVersion newAssignedVersion;
	if(isDifferent)  // make new version if different
	{
		__SUP_COUT__ << "\t\t**************************** Save as new table version"
		             << __E__;

		newAssignedVersion = ConfigurationSupervisorBase::saveModifiedVersionXML(
		    xmlOut,
		    cfgMgr,
		    table->getTableName(),
		    originalVersion,
		    false /*makeTemporary*/,
		    table,
		    temporaryVersion,
		    false /*ignoreDuplicates*/,
		    true /*lookForEquivalent*/);
	}
	else  // use existing version
	{
		__SUP_COUT__ << "\t\t**************************** Using existing table version"
		             << __E__;

		// delete temporaryVersion
		table->eraseView(temporaryVersion);
		newAssignedVersion = activeVersions[versionAliasesTableName];

		xmlOut.addTextElementToData("savedName", versionAliasesTableName);
		xmlOut.addTextElementToData("savedVersion", newAssignedVersion.toString());
	}

	__SUP_COUT__ << "\t\t newAssignedVersion: " << newAssignedVersion << __E__;
}  // end handleSetVersionAliasInBackboneXML()
catch(std::runtime_error& e)
{
	__SUP_COUT__ << "Error detected!\n\n " << e.what() << __E__;
	xmlOut.addTextElementToData(
	    "Error", "Error saving new Version Alias view!\n " + std::string(e.what()));
}
catch(...)
{
	__SUP_COUT__ << "Error detected!\n\n " << __E__;
	xmlOut.addTextElementToData("Error", "Error saving new Version Alias view! ");
}  // end handleSetVersionAliasInBackboneXML() catch

//==============================================================================
//	handleAliasGroupMembersInBackboneXML
//		open current backbone
//		modify VersionAliases
//		save as new version of VersionAliases
//		return new version of VersionAliases
void ConfigurationGUISupervisor::handleAliasGroupMembersInBackboneXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      versionAlias,
    const std::string&      groupName,
    TableGroupKey           groupKey,
    const std::string&      author)
try
{
	cfgMgr->loadConfigurationBackbone();
	std::map<std::string, TableVersion> activeVersions = cfgMgr->getActiveVersions();

	const std::string versionAliasesTableName =
	    ConfigurationManager::VERSION_ALIASES_TABLE_NAME;
	if(activeVersions.find(versionAliasesTableName) == activeVersions.end())
	{
		__SUP_SS__ << "Active version of " << versionAliasesTableName << " missing!"
		           << __E__;
		xmlOut.addTextElementToData("Error", ss.str());
		return;
	}

	// put all old backbone versions in xmlOut
	const std::set<std::string> backboneMembers = cfgMgr->getBackboneMemberNames();
	for(auto& memberName : backboneMembers)
	{
		__SUP_COUT__ << "activeVersions[\"" << memberName
		             << "\"]=" << activeVersions[memberName] << __E__;

		xmlOut.addTextElementToData("oldBackboneName", memberName);
		xmlOut.addTextElementToData("oldBackboneVersion",
		                            activeVersions[memberName].toString());
	}

	// make a temporary version from active view
	// modify the chosen versionAlias row
	// save as new version

	TableBase*   table = cfgMgr->getTableByName(versionAliasesTableName);
	TableVersion temporaryVersion =
	    table->createTemporaryView(activeVersions[versionAliasesTableName]);

	__SUP_COUT__ << "\t\t temporaryVersion: " << temporaryVersion << __E__;

	TableView* configView = table->getTemporaryView(temporaryVersion);

	// only make a new version if we are changing compared to active backbone
	bool isDifferent = false;

	// get member names and versions
	std::map<std::string /*name*/, TableVersion /*version*/> memberMap;
	try
	{
		cfgMgr->loadTableGroup(groupName,
		                       groupKey,
		                       false /*doActivate*/,
		                       &memberMap,
		                       0,
		                       0,
		                       0,
		                       0,
		                       0,  // defaults
		                       true /*doNotLoadMember*/);
	}
	catch(...)
	{
		xmlOut.addTextElementToData(
		    "Error",
		    "Table group \"" + TableGroupKey::getFullGroupString(groupName, groupKey) +
		        "\" can not be retrieved!");
		return;
	}

	unsigned int col;
	unsigned int col2 = configView->findCol("VersionAlias");
	unsigned int col3 = configView->findCol("TableName");

	for(auto& memberPair : memberMap)
	{
		bool         thisMemberIsDifferent = false;
		unsigned int row                   = -1;

		__SUP_COUT__ << "Adding alias for " << memberPair.first << "_v"
		             << memberPair.second << " to " << versionAlias << __E__;

		// find tableName, versionAlias pair
		//	NOTE: only accept the first pair, repeats are ignored.
		try
		{
			unsigned int tmpRow = -1;
			do
			{  // start looking from beyond last find
				tmpRow = configView->findRow(col3, memberPair.first, tmpRow + 1);
			} while(configView->getDataView()[tmpRow][col2] != versionAlias);
			// at this point the first pair was found! (else exception was thrown)
			row = tmpRow;
		}
		catch(...)
		{
		}
		if(row == (unsigned int)-1)  // if row not found then add a row
		{
			thisMemberIsDifferent = true;
			row                   = configView->addRow();

			// set all columns in new row
			col = configView->findCol(TableViewColumnInfo::COL_NAME_COMMENT);
			configView->setValue(
			    std::string("Entry was added by server in ") +
			        "ConfigurationGUISupervisor::setTableAliasInActiveBackbone().",
			    row,
			    col);

			col = configView->getColUID();
			configView->setValue(
			    memberPair.first.substr(0, memberPair.first.rfind("Table")) +
			        versionAlias,
			    row,
			    col);

			configView->setValue(versionAlias, row, col2);
			configView->setValue(memberPair.first, row, col3);
		}

		col = configView->findCol("Version");

		if(memberPair.second.toString() != configView->getDataView()[row][col])
		{
			configView->setValue(memberPair.second.toString(), row, col);
			thisMemberIsDifferent = true;
		}

		if(thisMemberIsDifferent)  // change author and time if row is different
		{
			configView->setValue(
			    author, row, configView->findCol(TableViewColumnInfo::COL_NAME_AUTHOR));
			configView->setValue(
			    time(0),
			    row,
			    configView->findCol(TableViewColumnInfo::COL_NAME_CREATION));
		}

		if(thisMemberIsDifferent)
			isDifferent = true;
	}

	// configView->print();

	TableVersion newAssignedVersion;
	if(isDifferent)  // make new version if different
	{
		__SUP_COUT__ << "\t\t**************************** Save v" << temporaryVersion
		             << " as new table version" << __E__;

		newAssignedVersion =
		    cfgMgr->saveNewTable(versionAliasesTableName, temporaryVersion);
	}
	else  // use existing version
	{
		__SUP_COUT__ << "\t\t**************************** Using existing table version"
		             << __E__;

		// delete temporaryVersion
		table->eraseView(temporaryVersion);
		newAssignedVersion = activeVersions[versionAliasesTableName];
	}

	xmlOut.addTextElementToData("savedName", versionAliasesTableName);
	xmlOut.addTextElementToData("savedVersion", newAssignedVersion.toString());
	__SUP_COUT__ << "\t\t Resulting Version: " << newAssignedVersion << __E__;
}  // end handleAliasGroupMembersInBackboneXML()
catch(std::runtime_error& e)
{
	__SUP_COUT__ << "Error detected!\n\n " << e.what() << __E__;
	xmlOut.addTextElementToData(
	    "Error", "Error saving new Version Alias view!\n " + std::string(e.what()));
}
catch(...)
{
	__SUP_COUT__ << "Error detected!\n\n " << __E__;
	xmlOut.addTextElementToData("Error", "Error saving new Version Alias view! ");
}  // end handleAliasGroupMembersInBackboneXML() catch

//==============================================================================
//	handleGroupAliasesXML
//
//		return aliases and backbone groupAlias table version
//
//		return this information:
//		<backbone groupTableName=xxx version=xxx>
//		<group alias=xxx name=xxx key=xxx comment=xxx>
//		<group alias=xxx name=xxx key=xxx comment=xxx>
//		...
//
void ConfigurationGUISupervisor::handleGroupAliasesXML(HttpXmlDocument&        xmlOut,
                                                       ConfigurationManagerRW* cfgMgr)
{
	cfgMgr->loadConfigurationBackbone();
	std::map<std::string, TableVersion> activeVersions = cfgMgr->getActiveVersions();

	std::string groupAliasesTableName = ConfigurationManager::GROUP_ALIASES_TABLE_NAME;
	if(activeVersions.find(groupAliasesTableName) == activeVersions.end())
	{
		__SUP_SS__ << "\nActive version of " << groupAliasesTableName << " missing! "
		           << groupAliasesTableName
		           << " is a required member of the Backbone table group."
		           << "\n\nLikely you need to activate a valid Backbone table group."
		           << __E__;
		__SUP_COUT__ << ss.str();  // just output findings, and return empty xml to avoid
		                           // infinite error loops in GUI
		// xmlOut.addTextElementToData("Error", ss.str());
		return;
	}
	__SUP_COUT__ << "activeVersions[\"" << groupAliasesTableName
	             << "\"]=" << activeVersions[groupAliasesTableName] << __E__;
	xmlOut.addTextElementToData("GroupAliasesTableName", groupAliasesTableName);
	xmlOut.addTextElementToData("GroupAliasesTableVersion",
	                            activeVersions[groupAliasesTableName].toString());

	std::vector<std::pair<std::string, ConfigurationTree>> aliasNodePairs =
	    cfgMgr->getNode(groupAliasesTableName).getChildren();

	std::string groupName, groupKey, groupComment, groupType;
	for(auto& aliasNodePair : aliasNodePairs)
	{
		groupName = aliasNodePair.second.getNode("GroupName").getValueAsString();
		groupKey  = aliasNodePair.second.getNode("GroupKey").getValueAsString();

		xmlOut.addTextElementToData("GroupAlias", aliasNodePair.first);
		xmlOut.addTextElementToData("GroupName", groupName);
		xmlOut.addTextElementToData("GroupKey", groupKey);
		xmlOut.addTextElementToData(
		    "AliasComment",
		    aliasNodePair.second.getNode(TableViewColumnInfo::COL_NAME_COMMENT)
		        .getValueAsString());

		// get group comment
		groupComment = "";  // clear just in case failure
		groupType    = "Invalid";
		try
		{
			cfgMgr->loadTableGroup(groupName,
			                       TableGroupKey(groupKey),
			                       0,
			                       0,
			                       0,
			                       0,
			                       &groupComment,
			                       0,
			                       0,  // mostly defaults
			                       true /*doNotLoadMembers*/,
			                       &groupType);
		}
		catch(...)
		{
			__SUP_COUT_WARN__ << "Failed to load group '" << groupName << "(" << groupKey
			                  << ")' to extract group comment and type." << __E__;
		}
		xmlOut.addTextElementToData("GroupComment", groupComment);
		xmlOut.addTextElementToData("GroupType", groupType);
	}
}  // end handleGroupAliasesXML

//==============================================================================
//	handleTableVersionAliasesXML
//
//		return version aliases and backbone versionAliases table version
//
//		return this information:
//		<backbone aliasTableName=xxx version=xxx>
//		<version alias=xxx name=xxx version=xxx comment=xxx>
//		<version alias=xxx name=xxx version=xxx comment=xxx>
//		...
//
void ConfigurationGUISupervisor::handleVersionAliasesXML(HttpXmlDocument&        xmlOut,
                                                         ConfigurationManagerRW* cfgMgr)
{
	cfgMgr->loadConfigurationBackbone();
	std::map<std::string, TableVersion> activeVersions = cfgMgr->getActiveVersions();

	std::string versionAliasesTableName =
	    ConfigurationManager::VERSION_ALIASES_TABLE_NAME;
	if(activeVersions.find(versionAliasesTableName) == activeVersions.end())
	{
		__SUP_SS__ << "Active version of VersionAliases  missing!"
		           << "Make sure you have a valid active Backbone Group." << __E__;
		xmlOut.addTextElementToData("Error", ss.str());
		return;
	}
	__SUP_COUT__ << "activeVersions[\"" << versionAliasesTableName
	             << "\"]=" << activeVersions[versionAliasesTableName] << __E__;
	xmlOut.addTextElementToData("VersionAliasesVersion",
	                            activeVersions[versionAliasesTableName].toString());

	std::vector<std::pair<std::string, ConfigurationTree>> aliasNodePairs =
	    cfgMgr->getNode(versionAliasesTableName).getChildren();

	for(auto& aliasNodePair : aliasNodePairs)
	{
		// note : these are column names in the versionAliasesTableName table
		// VersionAlias, TableName, Version, CommentDescription
		xmlOut.addTextElementToData(
		    "VersionAlias",
		    aliasNodePair.second.getNode("VersionAlias").getValueAsString());
		xmlOut.addTextElementToData(
		    "TableName", aliasNodePair.second.getNode("TableName").getValueAsString());
		xmlOut.addTextElementToData(
		    "Version", aliasNodePair.second.getNode("Version").getValueAsString());
		xmlOut.addTextElementToData(
		    "Comment",
		    aliasNodePair.second.getNode(TableViewColumnInfo::COL_NAME_COMMENT)
		        .getValueAsString());
	}
}  // end handleVersionAliasesXML()

//==============================================================================
//	handleGetTableGroupTypeXML
//
//		return this information based on member table list
//		<TableGroupType value=xxx>
//
void ConfigurationGUISupervisor::handleGetTableGroupTypeXML(
    HttpXmlDocument& xmlOut, ConfigurationManagerRW* cfgMgr, const std::string& tableList)
{
	std::map<std::string /*name*/, TableVersion /*version*/> memberMap;
	std::string                                              name, versionStr;
	auto                                                     c = tableList.find(',', 0);
	auto                                                     i = c;
	i = 0;  // auto used to get proper index/length type
	while(c < tableList.length())
	{
		// add the table name and version pair to the map
		name = tableList.substr(i, c - i);
		i    = c + 1;
		c    = tableList.find(',', i);
		if(c == std::string::npos)  // missing version list entry?!
		{
			__SUP_SS__ << "Incomplete Table Name-Version pair!" << __E__;
			__SUP_COUT_ERR__ << "\n" << ss.str();
			xmlOut.addTextElementToData("Error", ss.str());
			return;
		}

		versionStr = tableList.substr(i, c - i);
		i          = c + 1;
		c          = tableList.find(',', i);

		memberMap[name] = TableVersion(versionStr);
	}

	std::string groupTypeString = "";
	// try to determine type, dont report errors, just mark "Invalid"
	try
	{
		// determine the type of the table group
		groupTypeString = cfgMgr->getTypeNameOfGroup(memberMap);
		xmlOut.addTextElementToData("TableGroupType", groupTypeString);
	}
	catch(std::runtime_error& e)
	{
		__SUP_SS__ << "Table group has invalid type! " << e.what() << __E__;
		__SUP_COUT__ << "\n" << ss.str();
		groupTypeString = "Invalid";
		xmlOut.addTextElementToData("TableGroupType", groupTypeString);
	}
	catch(...)
	{
		__SUP_SS__ << "Table group has invalid type! " << __E__;
		__SUP_COUT__ << "\n" << ss.str();
		groupTypeString = "Invalid";
		xmlOut.addTextElementToData("TableGroupType", groupTypeString);
	}
}

//==============================================================================
//	handleTableGroupsXML
//
//		if returnMembers then
//			return type, comment and members
//		else just name and key
//
//		return this information
//		<group name=xxx key=xxx>
//			<table name=xxx version=xxx />
//			<table name=xxx version=xxx />
//			...
//		</group>
//		<group name=xxx key=xxx>...</group>
//		...
//
void ConfigurationGUISupervisor::handleTableGroupsXML(HttpXmlDocument&        xmlOut,
                                                      ConfigurationManagerRW* cfgMgr,
                                                      bool returnMembers)
{
	xercesc::DOMElement* parentEl;

	// get all group info from cache (if no cache, get from interface)

	if(!cfgMgr->getAllGroupInfo()
	        .size())  // empty cache is strange, attempt to get from interface
	{
		__SUP_COUT__ << "Cache is empty? Attempting to regenerate." << __E__;
		cfgMgr->getAllTableInfo(true /*refresh*/);
	}

	const std::map<std::string, GroupInfo>& allGroupInfo = cfgMgr->getAllGroupInfo();

	TableGroupKey groupKey;
	std::string   groupName;
	std::string   groupString, groupTypeString, groupComment, groupCreationTime,
	    groupAuthor;
	for(auto& groupInfo : allGroupInfo)
	{
		groupName = groupInfo.first;
		if(groupInfo.second.keys_.size() == 0)
		{
			__SUP_COUT__ << "Group name '" << groupName
			             << "' found, but no keys so ignoring." << __E__;
			continue;
		}

		groupKey = *(groupInfo.second.keys_.rbegin());

		xmlOut.addTextElementToData("TableGroupName", groupName);
		xmlOut.addTextElementToData("TableGroupKey", groupKey.toString());

		// trusting the cache!
		xmlOut.addTextElementToData("TableGroupType",
		                            groupInfo.second.latestKeyGroupTypeString_);
		xmlOut.addTextElementToData("TableGroupComment",
		                            groupInfo.second.latestKeyGroupComment_);
		xmlOut.addTextElementToData("TableGroupAuthor",
		                            groupInfo.second.latestKeyGroupAuthor_);
		xmlOut.addTextElementToData("TableGroupCreationTime",
		                            groupInfo.second.latestKeyGroupCreationTime_);

		if(returnMembers)
		{
			parentEl = xmlOut.addTextElementToData("TableGroupMembers", "");
			
			for(auto& memberPair : groupInfo.second.latestKeyMemberMap_)
			{
				xmlOut.addTextElementToParent("MemberName", memberPair.first, parentEl);
				xmlOut.addTextElementToParent(
				    "MemberVersion", memberPair.second.toString(), parentEl);
			}
		}  // end if returnMembers

		// add other group keys to xml for this group name
		//	but just empty members (not displayed anyway)
		for(auto& keyInSet : groupInfo.second.keys_)
		{
			if(keyInSet == groupKey)
				continue;  // skip the lastest
			xmlOut.addTextElementToData("TableGroupName", groupName);
			xmlOut.addTextElementToData("TableGroupKey", keyInSet.toString());

			// assume latest in cache reflects others (for speed)
			xmlOut.addTextElementToData("TableGroupType",
			                            groupInfo.second.latestKeyGroupTypeString_);
			xmlOut.addTextElementToData("TableGroupComment",
			                            groupInfo.second.latestKeyGroupComment_);
			xmlOut.addTextElementToData("TableGroupAuthor",
			                            groupInfo.second.latestKeyGroupAuthor_);
			xmlOut.addTextElementToData("TableGroupCreationTime",
			                            groupInfo.second.latestKeyGroupCreationTime_);

			if(returnMembers)
			{
				xmlOut.addTextElementToData("TableGroupMembers", "");

				// TODO -- make loadingHistoricalInfo an input parameter
				bool loadingHistoricalInfo = false;
				if(loadingHistoricalInfo)
				{
					groupComment = "";  // clear just in case failure
					try
					{
						cfgMgr->loadTableGroup(groupName,
						                       keyInSet,
						                       0,
						                       0,
						                       0,
						                       0,
						                       &groupComment,
						                       0,
						                       0,  // mostly defaults
						                       true /*doNotLoadMembers*/,
						                       &groupTypeString);
					}
					catch(...)
					{
						groupTypeString = "Invalid";
						__SUP_COUT_WARN__
						    << "Failed to load group '" << groupName << "(" << keyInSet
						    << ")' to extract group comment and type." << __E__;
					}

					xmlOut.addTextElementToData("TableGroupType", groupTypeString);
					xmlOut.addTextElementToData("TableGroupComment", groupComment);
					xmlOut.addTextElementToData("TableGroupAuthor", groupAuthor);
					xmlOut.addTextElementToData("TableGroupCreationTime",
					                            groupCreationTime);
				}
			}

		}  // end other key loop
	}      // end primary group loop
}  // end handleTableGroupsXML()

//==============================================================================
//	handleTablesXML
//
//		return this information
//		<table name=xxx>
//			<version key=xxx />
//			<version key=xxx />
//			...
//		</table>
//		<table name=xxx>...</table>
//		...
//
void ConfigurationGUISupervisor::handleTablesXML(HttpXmlDocument&        xmlOut,
                                                 ConfigurationManagerRW* cfgMgr,
                                                 bool allowIllegalColumns)
{
	xercesc::DOMElement* parentEl;

	__COUTV__(allowIllegalColumns);
	std::string                             accumulatedErrors = "";
	const std::map<std::string, TableInfo>& allTableInfo      = cfgMgr->getAllTableInfo(
        true,                 // always refresh!!  allowIllegalColumns /*refresh*/,
        &accumulatedErrors);  // if allowIllegalColumns, then also refresh

	// construct specially ordered table name set
	std::set<std::string, StringMacros::IgnoreCaseCompareStruct> orderedTableSet;
	for(const auto& tablePair : allTableInfo)
		orderedTableSet.emplace(tablePair.first);

	// std::map<std::string, TableInfo>::const_iterator it = allTableInfo.begin();

	__SUP_COUT__ << "# of tables found: " << allTableInfo.size() << __E__;

	std::map<std::string, std::map<std::string, TableVersion>> versionAliases =
	    cfgMgr->getVersionAliases();

	__SUP_COUT__ << "# of tables w/aliases: " << versionAliases.size() << __E__;

	for(const auto& orderedTableName : orderedTableSet)  // while(it !=
	                                                     // allTableInfo.end())
	{
		std::map<std::string, TableInfo>::const_iterator it =
		    allTableInfo.find(orderedTableName);
		if(it == allTableInfo.end())
		{
			__SS__ << "Impossible missing table in map '" << orderedTableName << "'"
			       << __E__;
			__SS_THROW__;
		}

		// for each table name
		// get existing version keys

		// add system table name
		xmlOut.addTextElementToData("TableName", it->first);
		parentEl = xmlOut.addTextElementToData("TableVersions", "");

		// include aliases for this table (if the versions exist)
		if(versionAliases.find(it->first) != versionAliases.end())
			for(auto& aliasVersion : versionAliases[it->first])
				if(it->second.versions_.find(aliasVersion.second) !=
				   it->second.versions_.end())
					// if(aliasVersion.first !=
					// ConfigurationManager::SCRATCH_VERSION_ALIAS) //NOT NEEDED IF
					// SCRATCH IS ALWAYS ALIAS
					xmlOut.addTextElementToParent(
					    "Version",
					    ConfigurationManager::ALIAS_VERSION_PREAMBLE + aliasVersion.first,
					    parentEl);
		//				else //NOT NEEDED IF SCRATCH IS ALWAYS ALIAS
		//					__SUP_COUT_ERR__ << "Alias for table " << it->first << " is a
		// reserved  alias '" <<
		//						ConfigurationManager::SCRATCH_VERSION_ALIAS << "' - this
		// is  illegal." << __E__;

		//		//if scratch version exists, add an alias for it /NOT NEEDED IF SCRATCH IS
		// ALWAYS ALIAS
		//		if(it->second.versions_.find(TableVersion(TableVersion::SCRATCH)) !=
		//				it->second.versions_.end())
		//			xmlOut.addTextElementToParent("Version",
		//					ConfigurationManager::ALIAS_VERSION_PREAMBLE +
		// ConfigurationManager::SCRATCH_VERSION_ALIAS, 					parentEl);

		// get all table versions for the current table
		//	except skip scratch version
		for(auto& version : it->second.versions_)
			if(!version.isScratchVersion())
				xmlOut.addTextElementToParent("Version", version.toString(), parentEl);

		//++it;
	}  // end table loop

	if(accumulatedErrors != "")
		xmlOut.addTextElementToData(
		    "Warning",
		    std::string("Column errors were allowed for this request, ") +
		        "but please note the following errors:\n" + accumulatedErrors);
}  // end handleTablesXML()

//==============================================================================
// handleGetArtdaqNodeRecordsXML
//	get artdaq nodes for active groups
//
// parameters
//	modifiedTables := CSV of table/version pairs
//
void ConfigurationGUISupervisor::handleGetArtdaqNodeRecordsXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      modifiedTables)
{
	__COUT__ << "Retrieving artdaq nodes..." << __E__;

	//	setup active tables based on active groups and modified tables
	setupActiveTablesXML(xmlOut, cfgMgr, "", TableGroupKey(-1), modifiedTables);

	std::map<std::string /*type*/,
	         std::map<std::string /*record*/, std::vector<std::string /*property*/>>>
	    nodeTypeToObjectMap;
	std::map<std::string /*subsystemName*/, std::string /*destinationSubsystemName*/>
	    subsystemObjectMap;

	std::vector<std::string /*property*/> artdaqSupervisorInfo;

	std::string                        artdaqSupervisorName;
	const ARTDAQTableBase::ARTDAQInfo& info = ARTDAQTableBase::getARTDAQSystem(
	    cfgMgr, nodeTypeToObjectMap, subsystemObjectMap, artdaqSupervisorInfo);

	if(artdaqSupervisorInfo.size() != 4 /*expecting 4 artdaq Supervisor parameters*/)
	{
		__SUP_COUT__ << "No artdaq supervisor found." << __E__;
		return;
	}

	__SUP_COUT__ << "========== "
	             << "Found " << info.subsystems.size() << " subsystems." << __E__;

	unsigned int paramIndex = 0;  // start at first artdaq Supervisor parameter

	auto parentEl = xmlOut.addTextElementToData("artdaqSupervisor",
	                                            artdaqSupervisorInfo[paramIndex++]);

	std::string typeString = "artdaqSupervisor";

	xmlOut.addTextElementToParent(
	    typeString + "-status", artdaqSupervisorInfo[paramIndex++], parentEl);
	xmlOut.addTextElementToParent(
	    typeString + "-contextAddress", artdaqSupervisorInfo[paramIndex++], parentEl);
	xmlOut.addTextElementToParent(
	    typeString + "-contextPort", artdaqSupervisorInfo[paramIndex++], parentEl);

	for(auto& subsystem : info.subsystems)
	{
		typeString = "subsystem";

		__SUP_COUT__ << "\t\t"
		             << "Found " << typeString << " " << subsystem.first << " \t := '"
		             << subsystem.second.label << "'" << __E__;

		xmlOut.addTextElementToParent(typeString, subsystem.second.label, parentEl);
		xmlOut.addTextElementToParent(
		    typeString + "-id", std::to_string(subsystem.first), parentEl);

		xmlOut.addTextElementToParent(typeString + "-sourcesCount",
		                              std::to_string(subsystem.second.sources.size()),
		                              parentEl);

		// destination
		xmlOut.addTextElementToParent(typeString + "-destination",
		                              std::to_string(subsystem.second.destination),
		                              parentEl);

	}  // end subsystem handling

	__SUP_COUT__ << "========== "
	             << "Found " << nodeTypeToObjectMap.size() << " process types." << __E__;

	for(auto& nameTypePair : nodeTypeToObjectMap)
	{
		typeString = nameTypePair.first;

		__SUP_COUT__ << "\t"
		             << "Found " << nameTypePair.second.size() << " " << typeString
		             << "(s)" << __E__;

		for(auto& artdaqNode : nameTypePair.second)
		{
			__SUP_COUT__ << "\t\t"
			             << "Found '" << artdaqNode.first << "' " << typeString << __E__;
			__SUP_COUTV__(StringMacros::vectorToString(artdaqNode.second));

			if(artdaqNode.second.size() < 2)
			{
				__SUP_SS__ << "Impossible parameter size for node '" << artdaqNode.first
				           << "' " << typeString << " - please notify admins!" << __E__;
				__SUP_SS_THROW__;
			}

			auto nodeEl =
			    xmlOut.addTextElementToParent(typeString, artdaqNode.first, parentEl);

			paramIndex = 3;  // start at 3 after subsystem parameter
			if(artdaqNode.second.size() > paramIndex)
				xmlOut.addTextElementToParent(
				    typeString + "-multinode", artdaqNode.second[paramIndex++], nodeEl);
			if(artdaqNode.second.size() > paramIndex)
				xmlOut.addTextElementToParent(typeString + "-nodefixedwidth",
				                              artdaqNode.second[paramIndex++],
				                              nodeEl);
			if(artdaqNode.second.size() > paramIndex)
				xmlOut.addTextElementToParent(
				    typeString + "-hostarray", artdaqNode.second[paramIndex++], nodeEl);
			if(artdaqNode.second.size() > paramIndex)
				xmlOut.addTextElementToParent(typeString + "-hostfixedwidth",
				                              artdaqNode.second[paramIndex++],
				                              nodeEl);

			paramIndex = 0;  // return to starting parameter
			xmlOut.addTextElementToParent(
			    typeString + "-status", artdaqNode.second[paramIndex++], parentEl);
			xmlOut.addTextElementToParent(
			    typeString + "-hostname", artdaqNode.second[paramIndex++], parentEl);
			xmlOut.addTextElementToParent(
			    typeString + "-subsystem", artdaqNode.second[paramIndex], parentEl);
		}
	}  // end processor type handling

	__SUP_COUT__ << "Done retrieving artdaq nodes." << __E__;

}  // end handleGetArtdaqNodeRecordsXML()

//==============================================================================
// handleSaveArtdaqNodeRecordsXML
//	save artdaq nodes into active groups
//
// parameters
//	modifiedTables := CSV of table/version pairs
//
void ConfigurationGUISupervisor::handleSaveArtdaqNodeRecordsXML(
    const std::string&      nodeString,
    const std::string&      subsystemString,
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      modifiedTables)
{
	__SUP_COUT__ << "Saving artdaq nodes..." << __E__;

	//	setup active tables based on active groups and modified tables
	setupActiveTablesXML(xmlOut, cfgMgr, "", TableGroupKey(-1), modifiedTables);

	// start node object extraction from nodeString
	std::map<std::string /*type*/,
	         std::map<std::string /*record*/, std::vector<std::string /*property*/>>>
	    nodeTypeToObjectMap;
	{
		// nodeString format:
		//	<type>:<nodeName>=<originalName>,<hostname>,<subsystemName>;<nodeName>=<originalName>,<hostname>,<subsystemName>;
		//	... |<type>:...|
		//	repeat | separated types
		std::map<std::string /*type*/, std::string /*typeRecordSetString*/>
		    nodeTypeToStringMap;
		StringMacros::getMapFromString(nodeString, nodeTypeToStringMap, {'|'}, {':'});

		__SUP_COUTV__(StringMacros::mapToString(nodeTypeToStringMap));

		for(auto& typePair : nodeTypeToStringMap)
		{
			if(typePair.first == "")
				continue;  // skip empty names

			__SUP_COUTV__(StringMacros::decodeURIComponent(typePair.first));

			nodeTypeToObjectMap.emplace(
			    std::make_pair(StringMacros::decodeURIComponent(typePair.first),
			                   std::map<std::string /*record*/,
			                            std::vector<std::string /*property*/>>()));

			std::map<std::string /*node*/, std::string /*nodeRecordSetString*/>
			    nodeRecordToStringMap;

			StringMacros::getMapFromString(
			    typePair.second, nodeRecordToStringMap, {';'}, {'='});

			__SUP_COUTV__(StringMacros::mapToString(nodeRecordToStringMap));

			for(auto& nodePair : nodeRecordToStringMap)
			{
				if(nodePair.first == "")
					continue;  // skip empty names

				__SUP_COUTV__(StringMacros::decodeURIComponent(nodePair.first));

				std::vector<std::string /*property*/> nodePropertyVector;

				StringMacros::getVectorFromString(
				    nodePair.second, nodePropertyVector, {','});

				__SUP_COUTV__(StringMacros::vectorToString(nodePropertyVector));

				// decode all properties
				for(unsigned int i = 0; i < nodePropertyVector.size(); ++i)
				{
					__SUP_COUTV__(
					    StringMacros::decodeURIComponent(nodePropertyVector[i]));

					nodePropertyVector[i] =
					    StringMacros::decodeURIComponent(nodePropertyVector[i]);
				}

				nodeTypeToObjectMap[typePair.first].emplace(
				    std::make_pair(StringMacros::decodeURIComponent(nodePair.first),
				                   nodePropertyVector));
			}
		}
	}  // end node object extraction from nodeString

	// start subsystem object extraction from subsystemString
	std::map<std::string /*subsystemName*/, std::string /*destinationSubsystemName*/>
	    subsystemObjectMap;
	{
		// subsystemString format:
		//	<name>:<destination>;<name>:<destination>; ...;
		//	repeat ; separated subsystems

		std::map<std::string /*subsystemName*/, std::string /*destinationSubsystemName*/>
		    tmpSubsystemObjectMap;
		StringMacros::getMapFromString(
		    subsystemString, tmpSubsystemObjectMap, {';'}, {':'});

		__SUP_COUTV__(StringMacros::mapToString(tmpSubsystemObjectMap));

		// decode all values (probably unnecessary, but more future proof)
		for(auto& subsystemPair : tmpSubsystemObjectMap)
		{
			__SUP_COUTV__(StringMacros::decodeURIComponent(subsystemPair.first));
			__SUP_COUTV__(StringMacros::decodeURIComponent(subsystemPair.second));

			subsystemObjectMap.emplace(
			    std::make_pair(StringMacros::decodeURIComponent(subsystemPair.first),
			                   StringMacros::decodeURIComponent(subsystemPair.second)));
		}
	}  // end subsystem object extraction from subsystemString

	ARTDAQTableBase::setAndActivateARTDAQSystem(
	    cfgMgr, nodeTypeToObjectMap, subsystemObjectMap);

	__SUP_COUT__ << "Done saving artdaq nodes." << __E__;
}  // end handleSaveArtdaqNodeRecordsXML()

//==============================================================================
// handleLoadArtdaqNodeLayoutXML
//	load artdaq configuration GUI layout for group/key
//
// parameters
//	contextGroupName (full name with key)
//
void ConfigurationGUISupervisor::handleLoadArtdaqNodeLayoutXML(
    HttpXmlDocument&        xmlOut,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      contextGroupName /* = "" */,
    const TableGroupKey&    contextGroupKey /* = INVALID */)
{
	bool usingActiveGroups = (contextGroupName == "" || contextGroupKey.isInvalid());

	const std::string& finalContextGroupName =
	    usingActiveGroups
	        ? cfgMgr->getActiveGroupName(ConfigurationManager::GroupType::CONTEXT_TYPE)
	        : contextGroupName;
	const TableGroupKey& finalContextGroupKey =
	    usingActiveGroups
	        ? cfgMgr->getActiveGroupKey(ConfigurationManager::GroupType::CONTEXT_TYPE)
	        : contextGroupKey;

	std::stringstream layoutPath;
	layoutPath << ARTDAQ_CONFIG_LAYOUTS_PATH << finalContextGroupName << "_"
	           << finalContextGroupKey << ".dat";
	__SUP_COUTV__(layoutPath.str());

	FILE* fp = fopen(layoutPath.str().c_str(), "r");
	if(!fp)
	{
		__SUP_COUT__ << "Layout file not found for '" << finalContextGroupName << "("
		             << finalContextGroupKey << ")'" << __E__;
		return;
	}

	// file format is line by line
	// line 0 -- grid: <rows> <cols>
	// line 1-N -- node: <type> <name> <x-grid> <y-grid>

	const size_t maxLineSz = 1000;
	char         line[maxLineSz];
	if(!fgets(line, maxLineSz, fp))
	{
		fclose(fp);
		return;
	}
	else
	{
		// extract grid

		unsigned int rows, cols;

		sscanf(line, "%u %u", &rows, &cols);

		__COUT__ << "Grid rows,cols = " << rows << "," << cols << __E__;

		xmlOut.addTextElementToData("grid-rows", std::to_string(rows));
		xmlOut.addTextElementToData("grid-cols", std::to_string(cols));
	}

	char         name[maxLineSz];
	char         type[maxLineSz];
	unsigned int x, y;
	while(fgets(line, maxLineSz, fp))
	{
		// extract node
		sscanf(line, "%s %s %u %u", type, name, &x, &y);

		xmlOut.addTextElementToData("node-type", type);
		xmlOut.addTextElementToData("node-name", name);
		xmlOut.addTextElementToData("node-x", std::to_string(x));
		xmlOut.addTextElementToData("node-y", std::to_string(y));
	}  // end node extraction loop

	fclose(fp);

}  // end handleLoadArtdaqNodeLayoutXML()

//==============================================================================
// handleSaveArtdaqNodeLayoutXML
//	save artdaq configuration GUI layout for group/key
//
// parameters
//	tableGroupName (full name with key)
//
void ConfigurationGUISupervisor::handleSaveArtdaqNodeLayoutXML(
    HttpXmlDocument& /*xmlOut*/,
    ConfigurationManagerRW* cfgMgr,
    const std::string&      layoutString,
    const std::string&      contextGroupName,
    const TableGroupKey&    contextGroupKey)
{
	bool usingActiveGroups = (contextGroupName == "" || contextGroupKey.isInvalid());

	const std::string& finalContextGroupName =
	    usingActiveGroups
	        ? cfgMgr->getActiveGroupName(ConfigurationManager::GroupType::CONTEXT_TYPE)
	        : contextGroupName;
	const TableGroupKey& finalContextGroupKey =
	    usingActiveGroups
	        ? cfgMgr->getActiveGroupKey(ConfigurationManager::GroupType::CONTEXT_TYPE)
	        : contextGroupKey;

	__SUP_COUTV__(layoutString);

	std::stringstream layoutPath;
	layoutPath << ARTDAQ_CONFIG_LAYOUTS_PATH << finalContextGroupName << "_"
	           << finalContextGroupKey << ".dat";
	__SUP_COUTV__(layoutPath.str());

	std::vector<std::string> fields = StringMacros::getVectorFromString(layoutString);
	__SUP_COUTV__(StringMacros::vectorToString(fields));

	if(fields.size() < 2 || (fields.size() - 2) % 4 != 0)
	{
		__SUP_SS__ << "Invalid layout string fields size of " << fields.size() << __E__;
		__SUP_SS_THROW__;
	}

	FILE* fp = fopen(layoutPath.str().c_str(), "w");
	if(!fp)
	{
		__SUP_SS__ << "Could not open layout file for writing for '"
		           << finalContextGroupName << "(" << finalContextGroupKey << ")'"
		           << __E__;
		__SUP_SS_THROW__;
	}

	// match load code at ::handleLoadArtdaqNodeLayoutXML()

	// write grid
	fprintf(fp, "%s %s\n", fields[0].c_str(), fields[1].c_str());

	// write nodes
	for(unsigned int i = 2; i < fields.size(); i += 4)
		fprintf(fp,
		        "%s %s %s %s\n",
		        fields[i + 0].c_str(),
		        fields[i + 1].c_str(),
		        fields[i + 2].c_str(),
		        fields[i + 3].c_str());

	fclose(fp);

}  // end handleSaveArtdaqNodeLayoutXML()

//==============================================================================
//	testXDAQContext
//		test activation of context group
void ConfigurationGUISupervisor::testXDAQContext()
{
	try
	{
		__SUP_COUT__ << "Attempting test activation of the context group." << __E__;
		ConfigurationManager cfgMgr;  // create instance to activate saved groups
	}
	catch(const std::runtime_error& e)
	{
		__SUP_COUT_WARN__
		    << "The test activation of the context group failed. Ignoring error: \n"
		    << e.what() << __E__;
	}
	catch(...)
	{
		__SUP_COUT_WARN__ << "The test activation of the context group failed. Ignoring."
		                  << __E__;
	}
	return;

	/////////////////////////////////
	// below has been used for debugging.

	// behave like a user
	// start with top level xdaq context
	//	then add and delete rows proof-of-concept
	// export xml xdaq table file

	////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////////
	// behave like a new user
	//
	// ConfigurationManagerRW cfgMgrInst("ExampleUser");
	//
	// ConfigurationManagerRW* cfgMgr =& cfgMgrInst;

	// std::map<std::string, TableVersion> groupMembers;
	// groupMembers["DesktopIcon"] = TableVersion(2);
	//	cfgMgr->saveNewTableGroup("test",
	//			groupMembers, "test comment");

	//	//
	//	const std::map<std::string, TableInfo>& allTableInfo =
	// cfgMgr->getAllTableInfo(true);
	//	__SUP_COUT__ << "allTableInfo.size() = " << allTableInfo.size() << __E__;
	//	for(auto& mapIt : allTableInfo)
	//	{
	//		__SUP_COUT__ << "Table Name: " << mapIt.first << __E__;
	//		__SUP_COUT__ << "\t\tExisting Versions: " << mapIt.second.versions_.size()
	//<<
	//__E__;
	//
	//		//get version key for the current system table key
	//		for (auto& v:mapIt.second.versions_)
	//		{
	//			__SUP_COUT__ << "\t\t" << v << __E__;
	//		}
	//	}

	// testXDAQContext just a test bed for navigating the new config tree
	// cfgMgr->testXDAQContext();

	////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////////
}  // end testXDAQContext()
