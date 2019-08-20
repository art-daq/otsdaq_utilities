#ifndef _ots_ConfigurationGUISupervisor_h_
#define _ots_ConfigurationGUISupervisor_h_

#include "otsdaq-core/ConfigurationInterface/ConfigurationManagerRW.h"
#include "otsdaq-core/CoreSupervisors/CoreSupervisorBase.h"

namespace ots
{
// ConfigurationGUISupervisor
//	This class handles the user requests to read and write the Configuration Tree.
class ConfigurationGUISupervisor : public CoreSupervisorBase
{
  public:
	static xdaq::Application* instantiate(xdaq::ApplicationStub* s);

	ConfigurationGUISupervisor(xdaq::ApplicationStub* s);
	virtual ~ConfigurationGUISupervisor(void);

	void init(void);
	void destroy(void);

	virtual void defaultPage(xgi::Input* in, xgi::Output* out) override;
	virtual void request(const std::string&               requestType,
	                     cgicc::Cgicc&                    cgiIn,
	                     HttpXmlDocument&                 xmlOut,
	                     const WebUsers::RequestUserInfo& userInfo) override;

	virtual void setSupervisorPropertyDefaults(void) override;
	virtual void forceSupervisorPropertyValues(void) override;  // override to force
	                                                            // supervisor property
	                                                            // values (and ignore user
	                                                            // settings)

  private:
	void handleSaveTableInfoXML(HttpXmlDocument&        xmldoc,
	                            ConfigurationManagerRW* cfgMgr,
	                            std::string&            tableName,
	                            const std::string&      columnCSV,
	                            const std::string&      tableDescription,
	                            const std::string&      columnChoicesCSV,
	                            bool                    allowOverwrite = false);
	void handleDeleteTableInfoXML(HttpXmlDocument&        xmldoc,
	                              ConfigurationManagerRW* cfgMgr,
	                              std::string&            tableName);

	void handleGroupAliasesXML(HttpXmlDocument& xmldoc, ConfigurationManagerRW* cfgMgr);
	void handleSetGroupAliasInBackboneXML(HttpXmlDocument&        xmldoc,
	                                      ConfigurationManagerRW* cfgMgr,
	                                      const std::string&      groupAlias,
	                                      const std::string&      groupName,
	                                      TableGroupKey           groupKey,
	                                      const std::string&      author);
	void handleSetVersionAliasInBackboneXML(HttpXmlDocument&        xmldoc,
	                                        ConfigurationManagerRW* cfgMgr,
	                                        const std::string&      versionAlias,
	                                        const std::string&      tableName,
	                                        TableVersion            version,
	                                        const std::string&      author);
	void handleAliasGroupMembersInBackboneXML(HttpXmlDocument&        xmldoc,
	                                          ConfigurationManagerRW* cfgMgr,
	                                          const std::string&      versionAlias,
	                                          const std::string&      groupName,
	                                          TableGroupKey           groupKey,
	                                          const std::string&      author);
	void handleVersionAliasesXML(HttpXmlDocument& xmldoc, ConfigurationManagerRW* cfgMgr);
	void handleTableGroupsXML(HttpXmlDocument&        xmldoc,
	                          ConfigurationManagerRW* cfgMgr,
	                          bool                    returnMembers);
	void handleGetTableGroupXML(HttpXmlDocument&        xmldoc,
	                            ConfigurationManagerRW* cfgMgr,
	                            const std::string&      groupName,
	                            TableGroupKey           groupKey,
	                            bool                    ignoreWarnings = false);
	void handleGetTableGroupTypeXML(HttpXmlDocument&        xmldoc,
	                                ConfigurationManagerRW* cfgMgr,
	                                const std::string&      configList);
	void handleCreateTableGroupXML(HttpXmlDocument&        xmldoc,
	                               ConfigurationManagerRW* cfgMgr,
	                               const std::string&      groupName,
	                               const std::string&      configList,
	                               bool                    allowDuplicates   = false,
	                               bool                    ignoreWarnings    = false,
	                               const std::string&      groupComment      = "",
	                               bool                    lookForEquivalent = false);

	void handleTablesXML(HttpXmlDocument&        xmldoc,
	                     ConfigurationManagerRW* cfgMgr,
	                     bool                    allowIllegalColumns);
	void handleGetTableXML(HttpXmlDocument&        xmldoc,
	                       ConfigurationManagerRW* cfgMgr,
	                       const std::string&      tableName,
	                       TableVersion            version,
	                       bool                    allowIllegalColumns = false);
	void handleCreateTableXML(HttpXmlDocument&        xmldoc,
	                          ConfigurationManagerRW* cfgMgr,
	                          const std::string&      tableName,
	                          TableVersion            version,
	                          bool                    makeTemporary,
	                          const std::string&      data,
	                          const int&              dataOffset,
	                          const std::string&      author,
	                          const std::string&      comment,
	                          bool                    sourceTableAsIs,
	                          bool                    lookForEquivalent);

	void setupActiveTablesXML(
	    HttpXmlDocument&                                          xmldoc,
	    ConfigurationManagerRW*                                   cfgMgr,
	    const std::string&                                        groupName,
	    const TableGroupKey&                                      groupKey,
	    const std::string&                                        modifiedTables,
	    bool                                                      refreshAll      = true,
	    bool                                                      getGroupInfo    = false,
	    std::map<std::string /*name*/, TableVersion /*version*/>* returnMemberMap = 0,
	    bool         outputActiveTables                                           = true,
	    std::string* accumulatedErrors                                            = 0);
	void        handleFillTreeViewXML(HttpXmlDocument&        xmldoc,
	                                  ConfigurationManagerRW* cfgMgr,
	                                  const std::string&      groupName,
	                                  const TableGroupKey&    groupKey,
	                                  const std::string&      startPath,
	                                  unsigned int            depth,
	                                  bool                    hideStatusFalse,
	                                  const std::string&      modifiedTables,
	                                  const std::string&      filterList);
	static void recursiveTreeToXML(const ConfigurationTree& t,
	                               unsigned int             depth,
	                               HttpXmlDocument&         xmldoc,
	                               DOMElement*              parentEl,
	                               bool                     hideStatusFalse);
	void        handleFillTreeNodeCommonFieldsXML(HttpXmlDocument&        xmldoc,
	                                              ConfigurationManagerRW* cfgMgr,
	                                              const std::string&      groupName,
	                                              const TableGroupKey&    groupKey,
	                                              const std::string&      startPath,
	                                              unsigned int            depth,
	                                              const std::string&      modifiedTables,
	                                              const std::string&      recordList,
	                                              const std::string&      fieldList);
	void        handleFillUniqueFieldValuesForRecordsXML(HttpXmlDocument&        xmldoc,
	                                                     ConfigurationManagerRW* cfgMgr,
	                                                     const std::string&      groupName,
	                                                     const TableGroupKey&    groupKey,
	                                                     const std::string&      startPath,
	                                                     const std::string&      modifiedTables,
	                                                     const std::string&      recordList,
	                                                     const std::string&      fieldList);
	void        handleFillGetTreeNodeFieldValuesXML(HttpXmlDocument&        xmldoc,
	                                                ConfigurationManagerRW* cfgMgr,
	                                                const std::string&      groupName,
	                                                const TableGroupKey&    groupKey,
	                                                const std::string&      startPath,
	                                                const std::string&      modifiedTables,
	                                                const std::string&      recordList,
	                                                const std::string&      fieldList);
	void        handleFillSetTreeNodeFieldValuesXML(HttpXmlDocument&        xmldoc,
	                                                ConfigurationManagerRW* cfgMgr,
	                                                const std::string&      groupName,
	                                                const TableGroupKey&    groupKey,
	                                                const std::string&      startPath,
	                                                const std::string&      modifiedTables,
	                                                const std::string&      recordList,
	                                                const std::string&      fieldList,
	                                                const std::string&      valueList,
	                                                const std::string&      author);
	void        handleFillCreateTreeNodeRecordsXML(HttpXmlDocument&        xmldoc,
	                                               ConfigurationManagerRW* cfgMgr,
	                                               const std::string&      groupName,
	                                               const TableGroupKey&    groupKey,
	                                               const std::string&      startPath,
	                                               const std::string&      modifiedTables,
	                                               const std::string&      recordList,
	                                               const std::string&      author);
	void        handleFillDeleteTreeNodeRecordsXML(HttpXmlDocument&        xmldoc,
	                                               ConfigurationManagerRW* cfgMgr,
	                                               const std::string&      groupName,
	                                               const TableGroupKey&    groupKey,
	                                               const std::string&      startPath,
	                                               const std::string&      modifiedTables,
	                                               const std::string&      recordList);
	void        handleFillModifiedTablesXML(HttpXmlDocument&        xmldoc,
	                                        ConfigurationManagerRW* cfgMgr);

	void handleSaveTreeNodeEditXML(HttpXmlDocument&        xmldoc,
	                               ConfigurationManagerRW* cfgMgr,
	                               const std::string&      tableName,
	                               TableVersion            version,
	                               const std::string&      type,
	                               const std::string&      uid,
	                               const std::string&      column,
	                               const std::string&      newValue,
	                               const std::string&      author);
	void handleGetAffectedGroupsXML(HttpXmlDocument&        xmldoc,
	                                ConfigurationManagerRW* cfgMgr,
	                                const std::string&      rootGroupName,
	                                const TableGroupKey&    rootGroupKey,
	                                const std::string&      modifiedTables);
	void handleGetLinkToChoicesXML(HttpXmlDocument&        xmldoc,
	                               ConfigurationManagerRW* cfgMgr,
	                               const std::string&      linkToTableName,
	                               const TableVersion&     linkToTableVersion,
	                               const std::string&      linkIdType,
	                               const std::string&      linkIndex,
	                               const std::string&      linkInitId);

	void handleSavePlanCommandSequenceXML(HttpXmlDocument&        xmldoc,
	                                      ConfigurationManagerRW* cfgMgr,
	                                      const std::string&      groupName,
	                                      const TableGroupKey&    groupKey,
	                                      const std::string&      modifiedTables,
	                                      const std::string&      author,
	                                      const std::string&      planName,
	                                      const std::string&      commandString);

	void handleMergeGroupsXML(HttpXmlDocument&        xmlOut,
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
	                          const std::string&      mergeApproach);

	TableVersion saveModifiedVersionXML(HttpXmlDocument&        xmldoc,
	                                    ConfigurationManagerRW* cfgMgr,
	                                    const std::string&      tableName,
	                                    TableVersion            originalVersion,
	                                    bool                    makeTemporary,
	                                    TableBase*              config,
	                                    TableVersion            temporaryModifiedVersion,
	                                    bool                    ignoreDuplicates = false,
	                                    bool lookForEquivalent                   = false);

	void handleGetArtdaqNodeRecordsXML(HttpXmlDocument&        xmlOut,
	                          ConfigurationManagerRW* cfgMgr,
                              const std::string&      modifiedTables);
	void handleLoadArtdaqNodeLayoutXML(HttpXmlDocument&        xmlOut,
	                          ConfigurationManagerRW* cfgMgr,
	                          const std::string&      contextGroupName = "",
	                          const TableGroupKey&    contextGroupKey = TableGroupKey());
	void handleSaveArtdaqNodeLayoutXML(HttpXmlDocument&        xmlOut,
	                          ConfigurationManagerRW* cfgMgr,
	                          const std::string&      layoutString,
	                          const std::string&      contextGroupName = "",
	                          const TableGroupKey&    contextGroupKey = TableGroupKey());




	void testXDAQContext(void);

	enum
	{
		CONFIGURATION_MANAGER_EXPIRATION_TIME   = 60 * 60 * 1,  // 1 hour, in seconds
		CONFIGURATION_MANAGER_REFRESH_THRESHOLD = 60 * 15,      // 15 minutes, in seconds
	};

	ConfigurationManagerRW* refreshUserSession(std::string username,
	                                           uint64_t    activeSessionIndex,
	                                           bool        refresh);
	std::map<std::string, ConfigurationManagerRW*> userConfigurationManagers_;
	std::map<std::string, time_t>                  userLastUseTime_;
};

}  // end ots namespace

#endif
