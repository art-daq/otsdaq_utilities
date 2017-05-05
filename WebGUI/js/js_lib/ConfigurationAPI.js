//=====================================================================================
//
//	Created April, 2017
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	ConfigurationAPI.js
//
//  Requirements: 
//   1. paste the following: 
//				
//				<script type="text/JavaScript" src="/WebPath/js/Globals.js"></script>	
//				<script type="text/JavaScript" src="/WebPath/js/Debug.js"></script>	
//				<script type="text/JavaScript" src="/WebPath/js/DesktopWindowContentCode.js"></script>
//				<script type="text/JavaScript" src="/WebPath/js/js_lib/ConfiguraitonAPI.js"></script>
//				<link rel="stylesheet" type="text/css" href="/WebPath/css/ConfigurationAPI.css">
//
//		...anywhere inside the <head></head> tag of a window content html page
//	 2. for proper functionality certain handlers are used:
//   		cannot overwrite handlers for window: onfocus, onscroll, onblur, onmousemove
//			(if you must overwrite, try to call the DesktopContent handlers from your handlers)
//
//	Recommendations:
//	 1. use Debug to output status and errors, e.g.:
//				Debug.log("this is my status",Debug.LOW_PRIORITY); //LOW_PRIORITY, MED_PRIORITY, INFO_PRIORITY, WARN_PRIORITY, HIGH_PRIORITY
//	 2. call window.focus() to bring your window to the front of the Desktop
//
//	The code of Requirement #1 should be inserted in the header of each page that will be 
//  the content of a window in the ots desktop.
//
//  This code handles bringing the window to the front when the content
//  is clicked or scrolled.
//
// Example usage: 	/WebPath/html/ConfigurationGUI.html
//					/WebPath/html/ConfigurationGUI_subset.html
//
//=====================================================================================

var ConfigurationAPI = ConfigurationAPI || {}; //define ConfigurationAPI namespace

if (typeof Debug == 'undefined') 
	alert('ERROR: Debug is undefined! Must include Debug.js before ConfigurationAPI.js');
if (typeof Globals == 'undefined') 
	alert('ERROR: Globals is undefined! Must include Globals.js before ConfigurationAPI.js');
if (typeof DesktopContent == 'undefined' && 
		typeof Desktop == 'undefined') 
	alert('ERROR: DesktopContent is undefined! Must include DesktopContent.js before ConfigurationAPI.js');


//"public" function list: 
//	ConfigurationAPI.getDateString(date)
// 	ConfigurationAPI.getSubsetRecords(subsetBasePath,filterList,responseHandler)
//	ConfigurationAPI.getFieldsOfRecords(subsetBasePath,recordArr,fieldList,maxDepth,responseHandler,modifiedTables)
//	ConfigurationAPI.getFieldValuesForRecord(subsetBasePath,recordArr,fieldObjArr,responseHandler,modifiedTables)
//	ConfigurationAPI.setFieldValuesForRecords(subsetBasePath,recordArr,fieldObjArr,valueArr,responseHandler,modifiedTables)
//	ConfigurationAPI.popUpSaveModifiedTablesForm(modifiedTables,responseHandler)
//	ConfigurationAPI.saveModifiedTables(modifiedTables,responseHandler,doNotIgnoreWarnings,doNotSaveAffectedGroups,doNotActivateAffectedGroups,doNotSaveAliases)
//	ConfigurationAPI.bitMapDialog(bitMapParams,initBitMapValue,okHandler,cancelHandler)

//"public" constants:
ConfigurationAPI._DEFAULT_COMMENT = "No comment.";
ConfigurationAPI._POP_UP_DIALOG_ID = "ConfigurationAPI-popUpDialog";

//"private" function list:
//	ConfigurationAPI.handleGroupCommentToggle(groupName,setHideVal)
//	ConfigurationAPI.handlePopUpHeightToggle(h,gh)
//	ConfigurationAPI.handlePopUpAliasEditToggle(i)
//	ConfigurationAPI.activateGroup(groupName, groupKey, ignoreWarnings)
//	ConfigurationAPI.setGroupAliasInActiveBackbone(groupAlias,groupName,groupKey,newBackboneNameAdd,doneHandler,doReturnParams)
//	ConfigurationAPI.newWizBackboneMemberHandler(req,params)
//	ConfigurationAPI.saveGroupAndActivate(groupName,configMap,doneHandler,doReturnParams)
//	ConfigurationAPI.getOneBitPngData(r,g,b,a)

//"private" constants:
ConfigurationAPI._VERSION_ALIAS_PREPEND = "ALIAS:";
ConfigurationAPI._SCRATCH_VERSION = 2147483647;
ConfigurationAPI._SCRATCH_ALIAS = "Scratch";

//=====================================================================================
//getSubsetRecords ~~
//	takes as input a base path where the desired records are, 
//	  and a filter list.
//
// <filterList> is a ;=separated list of tree paths relative to <subsetBasePath> 
//	 and their required value (CSV for multiple values).
//		e.g. "LinkToFETypeConfiguration=NIMPlus,FEInterfacePluginName=NIMPlusPlugin"
//
// <modifiedTables> is an array of Table objects (as returned from 
//		ConfigurationAPI.setFieldValuesForRecords)
//
//	when complete, the responseHandler is called with an array parameter.
//		on failure, the array will be empty.
//		on success, the array will be an array of records (their UIDs) 
//			from the subset that match the filter list
//
ConfigurationAPI.getSubsetRecords = function(subsetBasePath,
		filterList,responseHandler,modifiedTables)
{
	var modifiedTablesListStr = "";
	for(var i=0;modifiedTables && i<modifiedTables.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTables[i].tableName + "," +
				modifiedTables[i].tableVersion;
	}
	
	DesktopContent.XMLHttpRequest("Request?RequestType=getTreeView" + 
			"&configGroup=" +
			"&configGroupKey=-1" +
			"&hideStatusFalse=0" + 
			"&depth=1", //end get data 
			"startPath=/" + subsetBasePath +  
			"&filterList=" + filterList + 
			"&modifiedTables=" + modifiedTablesListStr, //end post data
			function(req)
			{
		var records = [];
		var err = DesktopContent.getXMLValue(req,"Error");
		if(err) 
		{
			Debug.log(err,Debug.HIGH_PRIORITY);
			responseHandler(records);
			return;
		}
		
		//console.log(req);
		
		var tree = DesktopContent.getXMLNode(req,"tree");
		var nodes = tree.children;
		for(var i=0;i<nodes.length;++i)
			records.push(nodes[i].getAttribute("value"));
		Debug.log("Records: " + records);
		responseHandler(records);

			}, //handler
			0, //handler param
			0,0,true); //progressHandler, callHandlerOnErr, showLoadingOverlay
}


//=====================================================================================
//getFieldsOfRecords ~~
//	takes as input a base path where the records are, 
//	  and an array of records.
// <recordArr> is an array or record UIDs (as returned from 
//		ConfigurationAPI.getSubsetRecords)
// <fieldList> is a CSV list of tree paths relative to <subsetBasePath> 
//	 to the allowed fields. If empty, then all available fields are allowed.
//		e.g. "LinkToFETypeConfiguration,FEInterfacePluginName"
//
// <modifiedTables> is an array of Table objects (as returned from 
//		ConfigurationAPI.setFieldValuesForRecords)
//
// 	maxDepth is used to force a end to search for common fields
//	
//	when complete, the responseHandler is called with an array parameter.
//		on failure, the array will be empty.
//		on success, the array will be an array of Field objects	
//		Field := {}
//			obj.fieldTableName 
//			obj.fieldUID 
//			obj.fieldColumnName
//			obj.fieldRelativePath 
//			obj.fieldColumnType
//			
//
ConfigurationAPI.getFieldsOfRecords = function(subsetBasePath,recordArr,fieldList,
		maxDepth,responseHandler,modifiedTables)
{
	var modifiedTablesListStr = "";
	for(var i=0;modifiedTables && i<modifiedTables.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTables[i].tableName + "," +
				modifiedTables[i].tableVersion;
	}
	
	var recordListStr = "";
	for(var i=0;i<recordArr.length;++i)
	{
		if(i) recordListStr += ",";
		recordListStr += recordArr[i];
	}
	
	DesktopContent.XMLHttpRequest("Request?RequestType=getTreeNodeCommonFields" + 
			"&configGroup=" +
			"&configGroupKey=-1" + 
			"&depth=" + (maxDepth|0), //end get data 
			"startPath=/" + subsetBasePath + 
			"&recordList=" + recordListStr +  
			"&fieldList=" + fieldList +
			"&modifiedTables=" + modifiedTablesListStr, //end post data
			function(req)
			{
		var recFields = [];
		var err = DesktopContent.getXMLValue(req,"Error");
		if(err) 
		{
			Debug.log(err,Debug.HIGH_PRIORITY);
			responseHandler(recFields);
			return;
		}
		
		var fields = DesktopContent.getXMLNode(req,"fields");
		
		var FieldTableNames = fields.getElementsByTagName("FieldTableName");
		var FieldColumnNames = fields.getElementsByTagName("FieldColumnName");
		var FieldRelativePaths = fields.getElementsByTagName("FieldRelativePath");
		var FieldColumnTypes = fields.getElementsByTagName("FieldColumnType");
		
		for(var i=0;i<FieldTableNames.length;++i)
		{
			var obj = {};
			obj.fieldTableName = DesktopContent.getXMLValue(FieldTableNames[i]);
			obj.fieldColumnName = DesktopContent.getXMLValue(FieldColumnNames[i]);
			obj.fieldRelativePath = DesktopContent.getXMLValue(FieldRelativePaths[i]);
			obj.fieldColumnType = DesktopContent.getXMLValue(FieldColumnTypes[i]);
			recFields.push(obj);
		}
		Debug.log("Records: " + recFields);		
		responseHandler(recFields);

			}, //handler
			0, //handler param
			0,0,true); //progressHandler, callHandlerOnErr, showLoadingOverlay
}


//=====================================================================================
//getFieldValuesForRecord ~~
//	takes as input a base path where the record is, 
//	  and the record uid.
// <recordArr> is an array or record UIDs (as returned from 
//		ConfigurationAPI.getSubsetRecords)
// <fieldObjArr> is an array of field objects (as returned from 
//		ConfigurationAPI.getFieldsOfRecords). This
//		is converted internally to a CSV list of tree paths relative to <subsetBasePath> 
//	 	to the fields to be read.
//	
// <modifiedTables> is an array of Table objects (as returned from 
//		ConfigurationAPI.setFieldValuesForRecords)
//
//	when complete, the responseHandler is called with an array parameter.
//		on failure, the array will be empty.
//		on success, the array will be an array of FieldValue objects	
//		FieldValue := {}
//			obj.fieldUID
//			obj.fieldPath   
//			obj.fieldValue
//
ConfigurationAPI.getFieldValuesForRecord = function(subsetBasePath,recordArr,fieldObjArr,
		responseHandler,modifiedTables)
{	
	var modifiedTablesListStr = "";
	for(var i=0;modifiedTables && i<modifiedTables.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTables[i].tableName + "," +
				modifiedTables[i].tableVersion;
	}

	var recordListStr = "";
	for(var i=0;i<recordArr.length;++i)
	{
		if(i) recordListStr += ",";
		recordListStr += recordArr[i];
	}
	
	var fieldListStr = "";
	for(var i=0;i<fieldObjArr.length;++i)
	{
		if(i) fieldListStr += ",";
		fieldListStr += fieldObjArr[i].fieldRelativePath + 
				fieldObjArr[i].fieldColumnName;
	}
	
	DesktopContent.XMLHttpRequest("Request?RequestType=getTreeNodeFieldValues" + 
			"&configGroup=" +
			"&configGroupKey=-1", //end get data 
			"startPath=/" + subsetBasePath + 
			"&recordList=" + recordListStr +
			"&fieldList=" + fieldListStr + 
			"&modifiedTables=" + modifiedTablesListStr, //end post data
			function(req)
			{
		var recFieldValues = [];
		var err = DesktopContent.getXMLValue(req,"Error");
		if(err) 
		{
			Debug.log(err,Debug.HIGH_PRIORITY);
			responseHandler(recFieldValues);
			return;
		}
		
		var fieldValues = req.responseXML.getElementsByTagName("fieldValues");

		for(var f=0;f<fieldValues.length;++f)
		{
			var FieldPaths = fieldValues[f].getElementsByTagName("FieldPath");
			var FieldValues = fieldValues[f].getElementsByTagName("FieldValue");
			for(var i=0;i<FieldPaths.length;++i)
			{
				var obj = {};
				obj.fieldUID = DesktopContent.getXMLValue(fieldValues[f]);
				obj.fieldPath = DesktopContent.getXMLValue(FieldPaths[i]);
				obj.fieldValue = DesktopContent.getXMLValue(FieldValues[i]);
				recFieldValues.push(obj);
			}
		}
		
		responseHandler(recFieldValues);

			}, //handler
			0, //handler param
			0,0,true); //progressHandler, callHandlerOnErr, showLoadingOverlay
}

//=====================================================================================
//setFieldValuesForRecords ~~
//	takes as input a base path where the records are, 
//	  and an array of records.
// <recordArr> is an array or record UIDs (as returned from 
//		ConfigurationAPI.getSubsetRecords)
// <fieldObjArr> is an array of field objects (as returned from 
//		ConfigurationAPI.getFieldsOfRecords). This
//		is converted internally to a CSV list of tree paths relative to <subsetBasePath> 
//	 	to the fields to be written.
// <valueArr> is an array of values, with index corresponding to the associated 
//	 	field in the <fieldObjArr>.
//
// <modifiedTables> is an array of Table objects (as returned from 
//		ConfigurationAPI.setFieldValuesForRecords)
//	
//	when complete, the responseHandler is called with an array parameter.
//		on failure, the array will be empty.
//		on success, the array will be an array of Table objects	
//		Table := {}
//			obj.tableName   
//			obj.tableVersion
//			obj.tableComment
//
//
ConfigurationAPI.setFieldValuesForRecords = function(subsetBasePath,recordArr,fieldObjArr,
		valueArr,responseHandler,modifiedTables)
{	
	var modifiedTablesListStr = "";
	for(var i=0;modifiedTables && i<modifiedTables.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTables[i].tableName + "," +
				modifiedTables[i].tableVersion;
	}
	
	var fieldListStr = "";
	for(var i=0;i<fieldObjArr.length;++i)
	{
		if(i) fieldListStr += ",";
		fieldListStr += fieldObjArr[i].fieldRelativePath + 
				fieldObjArr[i].fieldColumnName;
	}
	
	var valueListStr = "";
	for(var i=0;i<valueArr.length;++i)
	{
		if(i) valueListStr += ",";
		valueListStr += valueArr[i];
	}
	
	var recordListStr = "";
	for(var i=0;i<recordArr.length;++i)
	{
		if(i) recordListStr += ",";
		recordListStr += recordArr[i];
	}
	
	DesktopContent.XMLHttpRequest("Request?RequestType=setTreeNodeFieldValues" + 
			"&configGroup=" +
			"&configGroupKey=-1", //end get data 
			"startPath=/" + subsetBasePath +  
			"&recordList=" + recordListStr +
			"&valueList=" + valueListStr +
			"&fieldList=" + fieldListStr + 
			"&modifiedTables=" + modifiedTablesListStr, //end post data
			function(req)
			{
		
		var modifiedTables = [];
		
		var err = DesktopContent.getXMLValue(req,"Error");
		if(err) 
		{
			Debug.log(err,Debug.HIGH_PRIORITY);
			if(responseHandler) responseHandler(modifiedTables);
			return;
		}		
		//modifiedTables
		var tableNames = req.responseXML.getElementsByTagName("NewActiveTableName");
		var tableVersions = req.responseXML.getElementsByTagName("NewActiveTableVersion");
		var tableComments = req.responseXML.getElementsByTagName("NewActiveTableComment");
		var tableVersion;
		
		//add only temporary version
		for(var i=0;i<tableNames.length;++i)
		{
			tableVersion = DesktopContent.getXMLValue(tableVersions[i])|0; //force integer
			if(tableVersion >= -1) continue; //skip unless temporary
			var obj = {};
			obj.tableName = DesktopContent.getXMLValue(tableNames[i]);
			obj.tableVersion = DesktopContent.getXMLValue(tableVersions[i]);
			obj.tableComment = DesktopContent.getXMLValue(tableComments[i]);
			modifiedTables.push(obj);
		}
		
		if(responseHandler) responseHandler(modifiedTables);

			}, //handler
			0, //handler param
			0,0,true); //progressHandler, callHandlerOnErr, showLoadingOverlay
}

//=====================================================================================
//popUpSaveModifiedTablesForm ~~
//	presents the user with the form to choose the options for ConfigurationAPI.saveModifiedTables
//	
//	When ConfigurationAPI.saveModifiedTables is called,
//		it will generate popup messages indicating progress.
//
// <modifiedTables> is an array of Table objects (as returned from 
//		ConfigurationAPI.setFieldValuesForRecords)
//
//	when complete, the responseHandler is called with 3 array parameters.
//		on failure, the arrays will be empty.
//		on success, the arrays will be an array of Saved Table objects	
//		SavedTable := {}
//			obj.tableName   
//			obj.tableVersion
//			obj.tableComment
//
//			...and array of Saved Group objects	
//		SavedGroup := {}
//			obj.groupName   
//			obj.groupKey
//			obj.groupComment
//
//			...and array of Saved Alias objects	
//		SavedAlias := {}
//			obj.groupName   
//			obj.groupKey
//			obj.groupAlias
//		
ConfigurationAPI.popUpSaveModifiedTablesForm = function(modifiedTables,responseHandler)
{	
	//mimic ConfigurationGUI::popUpSaveTreeForm()
	
	Debug.log("ConfigurationAPI popUpSaveModifiedTablesForm");	

	var str = "";

	var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
	if(!el)
	{
		el = document.createElement("div");			
		el.setAttribute("id", ConfigurationAPI._POP_UP_DIALOG_ID);
	}
	el.style.display = "none";
	
	var gh = 50;
	var w = 380;
	var h = 330;
	ConfigurationAPI.setPopUpPosition(el,w /*w*/,h-gh*2 /*h*/);

	//set position and size
//	var w = 380;
//	var h = 330;
//	var gh = 50;
//	var ww = DesktopContent.getWindowWidth();
//	var wh = DesktopContent.getWindowHeight();
//	el.style.top = (DesktopContent.getWindowScrollTop() + ((wh-h-2)/2)- gh*2) + "px"; //allow for 2xgh growth for each affected group
//	el.style.left = (DesktopContent.getWindowScrollLeft() + ((ww-w-2)/2)) + "px";
//	el.style.width = w + "px";
//	el.style.height = h + "px";

	//always
	//	- save modified tables (show list of modified tables)
	//		(and which active group they are in)
	//
	//optionally
	//	- checkbox to bump version of modified active groups
	//	- checkbox to assign system alias to bumped active group 


	var modTblCount = 0;
	var modTblStr = "";
	var modifiedTablesListStr = ""; //csv table, temporay version,...
	
	for(var j=0;j<modifiedTables.length;++j)
		if((modifiedTables[j].tableVersion|0) < -1)
		{
			if(modTblCount++)
				modTblStr += ",";
			modTblStr += modifiedTables[j].tableName;

			if(modifiedTablesListStr.length)
				modifiedTablesListStr += ",";
			modifiedTablesListStr += modifiedTables[j].tableName;
			modifiedTablesListStr += ",";
			modifiedTablesListStr += modifiedTables[j].tableVersion;
		}

	var str = "<a id='" + 
			ConfigurationAPI._POP_UP_DIALOG_ID + 
			"-cancel' href='#'>Cancel</a><br><br>";

	str += "<div id='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-div'>";
	str += "Saving will create new persistent versions of each modified table." + 
			"<br><br>" + 
			"Here is the list of modified tables (count=" + modTblCount + 
			"):" +					
			"<br>";


	//display modified tables
	str += "<div style='white-space:nowrap; width:" + w + "px; height:40px; " + 
			"overflow:auto; font-weight: bold;'>";
	str += modTblStr;
	str += "</div>";			

	//get affected groups
	//	and save member map to hidden div for Save action			
	///////////////////////////////////////////////////////////
	DesktopContent.XMLHttpRequest("Request?RequestType=getAffectedActiveGroups" +	
			"&groupName=" + 
			"&groupKey=-1", //end get params
			"&modifiedTables=" + modifiedTablesListStr, //end post params
			function(req) 
			{
		var err = DesktopContent.getXMLValue(req,"Error");
		if(err) 
		{					
			Debug.log(err,Debug.HIGH_PRIORITY);
			el.innerHTML = str;
			return;
		}

		//for each affected group
		//	 put csv: name,key,memberName,memberVersion...
		var groups = req.responseXML.getElementsByTagName("AffectedActiveGroup");				
		var memberNames, memberVersions;
		var xmlGroupName;
		modTblStr = ""; //re-use
		for(var i=0;i<groups.length;++i)
		{
			xmlGroupName = DesktopContent.getXMLValue(groups[i],"GroupName");
			str += "<div style='display:none' class='" + ConfigurationAPI._POP_UP_DIALOG_ID + 
					"-affectedGroups' >";
			str += xmlGroupName;
			str += "," + DesktopContent.getXMLValue(groups[i],"GroupKey");

			memberNames = groups[i].getElementsByTagName("MemberName");
			memberVersions = groups[i].getElementsByTagName("MemberVersion");
			Debug.log("memberNames.length " + memberNames.length);
			for(var j=0;j<memberNames.length;++j)
				str += "," + DesktopContent.getXMLValue(memberNames[j]) + 
				"," + DesktopContent.getXMLValue(memberVersions[j]);
			str += "</div>"; //close div " + ConfigurationAPI._POP_UP_DIALOG_ID + "-affectedGroups


			if(modTblStr.length)
				modTblStr += ",";


			modTblStr += "<a style='color:black' href='#' onclick='javascript:" +								
					"var forFirefox = ConfigurationAPI.handleGroupCommentToggle(\"" + 
					xmlGroupName + "\");" +								
					" ConfigurationAPI.handlePopUpHeightToggle(" + h + "," + gh + ");'>";
			modTblStr += xmlGroupName;
			modTblStr += "</a>";

			//store cached group comment in hidden html
			modTblStr += "<div id='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment-" + 
					xmlGroupName + "' " +
					"class='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment-cache' " + 
					"style='display:none'>" + 
					decodeURIComponent(DesktopContent.getXMLValue(groups[i],"GroupComment")) +
					"</div>";
		}

		str += "Please choose the options you want and click 'Save':" +
				"<br>";

		//add checkbox to save affected groups
		str += "<input type='checkbox' id='" + ConfigurationAPI._POP_UP_DIALOG_ID + 
				"-bumpGroupVersions' checked " +
				"onclick='ConfigurationAPI.handlePopUpHeightToggle(" + h + "," + gh + ");'>";
		//add link so text toggles checkbox
		str += "<a href='#' onclick='javascript:" +
				"var el = document.getElementById(\"" + ConfigurationAPI._POP_UP_DIALOG_ID + 
				"-bumpGroupVersions\");" +
				"var forFirefox = (el.checked = !el.checked);" +
				" ConfigurationAPI.handlePopUpHeightToggle(" + h + "," + gh + "); return false;'>";
		str += "Save Affected Groups as New Keys";
		str += "</a>";
		str +=	"</input><br>";

		//add checkbox to activate saved affected groups
		str += "<input type='checkbox' id='" + ConfigurationAPI._POP_UP_DIALOG_ID + 
				"-activateBumpedGroupVersions' checked " +
				">";
		//add link so text toggles checkbox
		str += "<a href='#' onclick='javascript:" +
				"var el = document.getElementById(\"" + ConfigurationAPI._POP_UP_DIALOG_ID + 
				"-activateBumpedGroupVersions\");" +
				"if(el.disabled) return false; " +
				"var forFirefox = (el.checked = !el.checked);" +
				"return false;'>";
		str += "Also Activate New Groups";
		str += "</a>";
		str +=	"</input><br>";

		str += "Here is the list of affected groups (count=" + groups.length + 
				"):" +					
				"<br>";

		//display affected groups
		str += "<div style='white-space:nowrap; width:" + w + "px; margin-bottom:20px; " + 
				"overflow:auto; font-weight: bold;'>";
		str += modTblStr;
		str += "<div id='clearDiv'></div>";
		str += "<center>";			

		str += "<div id='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment-header'></div>";

		str += "<div id='clearDiv'></div>";

		str += "<textarea id='" + ConfigurationAPI._POP_UP_DIALOG_ID + 
				"-groupComment' rows='4' cols='50' " + 
				"style='width:417px;height:68px;display:none;margin:0;'>";					 
		str += ConfigurationAPI._DEFAULT_COMMENT;
		str += "</textarea>";
		str += "</center>";

		str += "</div>"; //end affected groups div		

		str += "<div id='" + ConfigurationAPI._POP_UP_DIALOG_ID + 
				"-groupAliasArea' ><center>";

		//get existing group aliases	
		///////////////////////////////////////////////////////////
		DesktopContent.XMLHttpRequest("Request?RequestType=getGroupAliases" +	
				"",
				"",
				function(req) 
				{
			var err = DesktopContent.getXMLValue(req,"Error");
			if(err) 
			{					
				Debug.log(err,Debug.HIGH_PRIORITY);
				el.innerHTML = str;
				return;
			}

			var aliases = req.responseXML.getElementsByTagName("GroupAlias");
			var aliasGroupNames = req.responseXML.getElementsByTagName("GroupName");
			var aliasGroupKeys = req.responseXML.getElementsByTagName("GroupKey");

			//for each affected group
			//	-Show checkbox for setting alias and dropdown for alias
			//	and a pencil to change dropdown to text box to free-form alias.
			//	-Also, identify if already aliased and choose that as default option
			//	in dropwdown.					
			var alias, aliasGroupName, aliasGroupKey;
			var groupName, groupKey;					
			var groupOptionIndex = []; //keep distance and index of option for each group, or -1 if none
			for(var i=0;i<groups.length;++i)
			{				
				groupOptionIndex.push([-1,0]); //index and distance

				groupName = DesktopContent.getXMLValue(groups[i],"GroupName");
				groupKey = DesktopContent.getXMLValue(groups[i],"GroupKey");

				//find alias
				modTblStr = ""; //re-use
				for(var j=0;j<aliasGroupNames.length;++j)
				{
					alias = DesktopContent.getXMLValue(aliases[j]);
					aliasGroupName = DesktopContent.getXMLValue(aliasGroupNames[j]);
					aliasGroupKey = DesktopContent.getXMLValue(aliasGroupKeys[j]);	

					//Debug.log("compare " + aliasGroupName + ":" +
					//		aliasGroupKey);

					//also build drop down
					modTblStr += "<option value='" + alias + "' ";

					//consider any alias with same groupName
					if(aliasGroupName == groupName)
					{
						if(groupOptionIndex[i][0] == -1 ||	//take best match
								Math.abs(groupKey - aliasGroupKey) < groupOptionIndex[i][1])
						{
							Debug.log("found alias");
							groupOptionIndex[i][0] = j; //index
							groupOptionIndex[i][1] = Math.abs(groupKey - aliasGroupKey); //distance
						}
					}
					modTblStr += ">";
					modTblStr += alias;	//can display however
					modTblStr += "</option>";
				}

				str += "<input type='checkbox' class='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-setGroupAlias' " +
						(groupOptionIndex[i][0] >= 0?"checked":"") + //check if has an alias already
						">";
				//add link so text toggles checkbox
				str += "<a href='#' onclick='javascript:" +
						"var el = document.getElementsByClassName(\"" + ConfigurationAPI._POP_UP_DIALOG_ID + "-setGroupAlias\");" +
						"var forFirefox = (el[" + i + "].checked = !el[" + i + "].checked);" +
						" return false;'>";
				str += "Set '<b style='font-size:16px'>" + groupName + "</b>' to System Alias:";
				str += "</a><br>";

				str += "<table cellpadding='0' cellspacing='0' border='0'><tr><td>";
				str += "<select " +
						"id='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editAliasSelect-" + (i) + "' " +
						"style='margin:2px; height:" + (25) + "px'>";						
				str += modTblStr;
				str += "</select>";						

				str += "<input type='text' " +
						"id='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editAliasTextBox-" + (i) + "' " +
						"style='display:none; margin:2px; width:150px; height:" + 
						(19) + "px'>";						
				str += "";
				str += "</input>";	
				str += "</td><td>";

				str += "<div style='display:block' " + 
						"class='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editIcon' id='" + ConfigurationAPI._POP_UP_DIALOG_ID + 
						"-editIcon-" +
						(i) + "' " +
						"onclick='ConfigurationAPI.handlePopUpAliasEditToggle(" +							 
						i + 
						");' " +
						"title='Toggle free-form system alias editing' " +
						"></div>";
				
				str += "<div class='" + ConfigurationAPI._POP_UP_DIALOG_ID + 
						"-preloadImage' id='" + ConfigurationAPI._POP_UP_DIALOG_ID + 
						"-preloadImage-editIconHover'></div>";

				str += "</td></tr></table>";

				str +=	"</input>";

				//increase height each time a group check is added
				h += gh;
				el.style.height = h + "px";						
			}

			str += "</center></div>"; //close id='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupAliasArea'


			// done with system alias handling
			// continue with pop-up prompt

			str += "</div><br>"; //close main popup div
//
//			var onmouseupJS = "";
//			onmouseupJS += "document.getElementById(\"" + ConfigurationAPI._POP_UP_DIALOG_ID + "-submitButton\").disabled = true;";
//			onmouseupJS += "ConfigurationAPI.handleGroupCommentToggle(0,1);"; //force cache of group comment
//			onmouseupJS += "ConfigurationAPI.handlePopUpHeightToggle(" + h + "," + gh + ");";
//			onmouseupJS += "ConfigurationAPI.saveModifiedTables();";					

			str += "<input id='" + ConfigurationAPI._POP_UP_DIALOG_ID + 
					"-submitButton' type='button' " + //onmouseup='" + 
					//onmouseupJS + "' " +
					"value='Save' title='" +
					"Save new versions of every modified table\n" +
					"(Optionally, save new active groups and assign system aliases)" +
					"'/>";
			el.innerHTML = str;
			
			//create submit onmouseup handler
			document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID + 
					"-submitButton").onmouseup = function() {
				Debug.log("Submit mouseup");
				this.disabled = true;
				ConfigurationAPI.handleGroupCommentToggle(0,1); //force cache of group comment
				ConfigurationAPI.handlePopUpHeightToggle(h,gh);

				var savingGroups = 
						document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + 
								"-bumpGroupVersions").checked;
				var activatingSavedGroups = 
						document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + 
								"-activateBumpedGroupVersions").checked;

				ConfigurationAPI.saveModifiedTables(modifiedTables,responseHandler,
						true); //doNotIgnoreWarnings							

			}; //end submit onmouseup handler	

			//create cancel onclick handler
			document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID + 
					"-cancel").onclick = function(event) {
				Debug.log("Cancel click");
				var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
				if(el) el.parentNode.removeChild(el); //close popup											
				responseHandler([],[],[]); //empty array indicates nothing done
				return false;
			}; //end submit onmouseup handler	


			//handle default dropdown selections for group alias
			for(var i=0;i<groups.length;++i)
				if(groupOptionIndex[i][0] != -1) //have a default
					document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editAliasSelect-" + 
							i).selectedIndex = groupOptionIndex[i][0];

				},0,0,0,true //reqParam, progressHandler, callHandlerOnErr, showLoadingOverlay
		); //end of getGroupAliases handler

			},0,0,0,true //reqParam, progressHandler, callHandlerOnErr, showLoadingOverlay
	); //end of getActiveConfigGroups handler			


	document.body.appendChild(el); //add element to display div
	el.style.display = "block";

}


//=====================================================================================
//handleGroupCommentToggle ~~		
// toggles affected group comment box and handles details
ConfigurationAPI.handleGroupCommentToggle =  function(groupName,setHideVal)
{
	var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment");			
	var hel = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment-header");
	var cel;
	
	var doHide = el.style.display != "none";
	if(setHideVal !== undefined)
		doHide = setHideVal;

	if(doHide) //cache (possibly modified) group comment
	{
		if(hel.textContent == "") return; //assume was a force hide when already hidden

		//get current groupName so we know where to cache comment
		var gn = hel.textContent.split("'")[1];
		Debug.log("gn " + gn);
		cel = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment-" + 
				gn);				
		cel.innerHTML = "";
		cel.appendChild(document.createTextNode(el.value));

		//setup group comment header properly
		hel.innerHTML = "";
		el.style.display = "none";

		//if for sure hiding, then done
		if(gn == groupName || setHideVal !== undefined) 
			return;
		//else show immediately the new selection
	}

	//show groupName comment
	{
		cel = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment-" + 
				groupName);
		el.value = cel.textContent;
		el.style.display = "block"; //show display before set caret (for Firefox)
		ConfigurationAPI.setCaretPosition(el,0,cel.textContent.length);

		hel.innerHTML = ("&apos;" + groupName + "&apos; group comment:");				
	}
}

//=====================================================================================
//handlePopUpHeightToggle ~~
//	checkbox was already set before this function call
//	this responds to current value
//
//	pass height and group height
ConfigurationAPI.handlePopUpHeightToggle = function(h,gh)
{
	var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-bumpGroupVersions");			
	Debug.log("ConfigurationAPI.handlePopUpHeightToggle " + el.checked);

	var ael = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-activateBumpedGroupVersions");	

	var groupCommentEl = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment");
	var groupCommentHeight = 0;

	if(groupCommentEl && groupCommentEl.style.display != "none")
		groupCommentHeight += 100;

	var popEl = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "");			
	if(!el.checked)
	{
		//hide alias area and subtract the height

		document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupAliasArea").style.display = "none";								
		popEl.style.height = (h + groupCommentHeight) + "px";		
		ael.disabled = true;
	}
	else
	{
		//show alias area and add the height

		//count if grps is 1 or 2
		var grps = document.getElementsByClassName("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-affectedGroups");				
		popEl.style.height = (h + grps.length*gh + groupCommentHeight) + "px";
		document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupAliasArea").style.display = "block";
		ael.disabled = false;
	}			
}

//=====================================================================================
//handlePopUpAliasEditToggle ~~
ConfigurationAPI.handlePopUpAliasEditToggle = function(i) 
{	
	Debug.log("handlePopUpAliasEditToggle " + i);

	var sel = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editAliasSelect-"+i);
	var tel = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editAliasTextBox-"+i);
	Debug.log("sel.style.display  " + sel.style.display);
	if(sel.style.display == "none")
	{
		sel.style.display = "block";
		tel.style.display = "none";
	}
	else
	{
		tel.style.width = (sel.offsetWidth-2) + "px";
		sel.style.display = "none";
		tel.style.display = "block";
		ConfigurationAPI.setCaretPosition(tel,0,tel.value.length);
	}
}

//=====================================================================================
//saveModifiedTables ~~
//	Takes as input an array of modified tables and saves
//		those table temporary versions to persistent versions.
//		Optionally, save/activate affected groups and setup associated aliases.
//
//	By default, it will ignore warnings, save affected groups, and save 
//		the system aliases for affected groups (most similar system alias)
//
//	It will also generate popup messages indicating progress.
//
// <modifiedTables> is an array of Table objects (as returned from 
//		ConfigurationAPI.setFieldValuesForRecords)
//	
//	Note: when called from popup, uses info from popup.
//
//	when complete, the responseHandler is called with 3 array parameters.
//		on failure, the arrays will be empty.
//		on success, the arrays will be an array of Saved Table objects	
//		SavedTable := {}
//			obj.tableName   
//			obj.tableVersion
//			obj.tableComment
//
//			...and array of Saved Group objects	
//		SavedGroup := {}
//			obj.groupName   
//			obj.groupKey
//			obj.groupComment
//
//			...and array of Saved Alias objects	
//		SavedAlias := {}
//			obj.groupName   
//			obj.groupKey
//			obj.groupAlias
//
//
ConfigurationAPI.saveModifiedTables = function(modifiedTables,responseHandler,
		doNotIgnoreWarnings,doNotSaveAffectedGroups,
		doNotActivateAffectedGroups,doNotSaveAliases)
{	
	//copy from ConfigurationGUI::saveModifiedTree

	var savedTables = [];	
	var savedGroups = [];	
	var savedAliases = [];	
	
	if(!modifiedTables.length)
	{
		Debug.log("No tables were modified. Nothing to do.", Debug.WARN_PRIORITY);
		responseHandler(savedTables,savedGroups,savedAliases);
		return;
	}
	
	//for each modified table
	//	save new version
	//	update tree member table version based on result
	//if saving groups
	//	for each affected group
	//		save member list but with tree table versions
	//		modify root group name if changed
	//if saving aliases
	//	for each alias
	//		set alias for new group
	
	
	var numberOfRequests = 0;
	var numberOfReturns = 0;
	var allRequestsSent = false;		

	//localHandleAffectedGroups ~~
	function localHandleAffectedGroups()
	{
		Debug.log("Done with table saving.");

		//check if saving groups
		var savingGroups;
		var activatingSavedGroups;
		var doRequestAffectedGroups = false;
		try
		{
			savingGroups =
				document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-bumpGroupVersions").checked;
		
			activatingSavedGroups = 
				document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-activateBumpedGroupVersions").checked;
		}
		catch(err)
		{
			savingGroups = !doNotSaveAffectedGroups;
			activatingSavedGroups = !doNotActivateAffectedGroups;
			doRequestAffectedGroups = true; //popup doesn't exist, so need to do the work on own
		}

		if(!savingGroups) //then no need to proceed. exit!
		{
			//kill popup dialog
			var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + ""); 
			if(el) el.parentNode.removeChild(el);	
			responseHandler(savedTables,savedGroups,savedAliases);
			return;
		}

		//identify root group name/key
		//var rootGroupEl = document.getElementById("treeView-ConfigGroupLink");
		//var rootGroupName = rootGroupEl.childNodes[0].textContent;
		//var rootGroupKey = rootGroupEl.childNodes[1].textContent;

		//Debug.log("rootGroup = " + rootGroupName + "(" + rootGroupKey + ")");
		Debug.log("On to saving groups");

		numberOfRequests = 0;		//re-use
		numberOfReturns = 0;		//re-use
		allRequestsSent = false; 	//re-use

		var affectedGroupNames = []; //to be populated for use by alias setting
		var affectedGroupComments = []; //to be populated for use by alias setting
		var affectedGroupConfigMap = []; //to be populated for use by alias setting
		
		var affectedGroupKeys = []; //to be populated after group save for use by alias setting
		
		if(doRequestAffectedGroups)
		{
			Debug.log("FIXME -- Need to replace temporary versions with new persistent versions",Debug.HIGH_PRIORITY);
			var modifiedTablesListStr = ""; //csv table, temporay version,...

			for(var j=0;j<modifiedTables.length;++j)
				if((modifiedTables[j].tableVersion|0) < -1)
				{
					if(modTblCount++)
						modTblStr += ",";
					modTblStr += modifiedTables[j].tableName;

					if(modifiedTablesListStr.length)
						modifiedTablesListStr += ",";
					modifiedTablesListStr += modifiedTables[j].tableName;
					modifiedTablesListStr += ",";
					modifiedTablesListStr += modifiedTables[j].tableVersion;
				}
			
			//get affected groups
			//	and save member map to hidden div for Save action			
			///////////////////////////////////////////////////////////
			DesktopContent.XMLHttpRequest("Request?RequestType=getAffectedActiveGroups" +	
					"&groupName=" + 
					"&groupKey=-1", //end get params
					"&modifiedTables=" + modifiedTablesListStr, //end post params
					function(req) 
					{
				var err = DesktopContent.getXMLValue(req,"Error");
				if(err) 
				{					
					Debug.log(err,Debug.HIGH_PRIORITY);
					el.innerHTML = str;
					responseHandler(savedTables,savedGroups,savedAliases);
					return;
				}
				//for each affected group
				//	 put csv: name,key,memberName,memberVersion...
				var groups = req.responseXML.getElementsByTagName("AffectedActiveGroup");				
				var memberNames, memberVersions;
				var xmlGroupName;
				modTblStr = ""; //re-use
				for(var i=0;i<groups.length;++i)
				{					
					affectedGroupNames.push( DesktopContent.getXMLValue(groups[i],"GroupName"));
					affectedGroupComments.push(decodeURIComponent(DesktopContent.getXMLValue(groups[i],"GroupComment")));

					memberNames = groups[i].getElementsByTagName("MemberName");
					memberVersions = groups[i].getElementsByTagName("MemberVersion");

					Debug.log("memberNames.length " + memberNames.length);

					//build member config map
					affectedGroupConfigMap[i] = "configList=";
					var memberVersion, memberName;
					for(var j=0;j<memberNames.length;++j)		
					{
						memberVersion = DesktopContent.getXMLValue(memberVersions[j])|0; //force integer
						memberName = DesktopContent.getXMLValue(memberNames[j]);
						if(memberVersion < -1) //there should be a new modified version
						{
							Debug.log("affectedArr " + memberName + "-v" + memberVersion);
							//find version
							for(var k=0;k<savedTables.length;++k)
								if(memberName == savedTables[k].tableName)
								{
									Debug.log("found " + savedTables[k].tableName + "-v" +
											savedTables[k].tableVersion);
									affectedGroupConfigMap[i] += memberName + "," + 
											savedTables[k].tableVersion + ",";
									break;
								}
						}
						else
							affectedGroupConfigMap[i] += memberName + 
								"," + memberVersion + ",";
					}
				}
					},0,0,0,true //reqParam, progressHandler, callHandlerOnErr, showLoadingOverlay
			); //end of getAffectedActiveGroups req
		}
		else
		{
			var affectedGroupEls = 
					document.getElementsByClassName(ConfigurationAPI._POP_UP_DIALOG_ID + 
							"-affectedGroups");
			var affectedGroupCommentEls = 
					document.getElementsByClassName(ConfigurationAPI._POP_UP_DIALOG_ID + 
							"-groupComment-cache");						

			//	for each affected group element
			for(var i=0;i<affectedGroupEls.length;++i)
			{
				Debug.log(affectedGroupEls[i].textContent);
				Debug.log("group comment: " + affectedGroupCommentEls[i].textContent);
				
				var affectedArr = affectedGroupEls[i].textContent.split(','); 
				
				affectedGroupComments.push(affectedGroupCommentEls[i].textContent);
				affectedGroupNames.push(affectedArr[0]);	
				
				//build member config map
				affectedGroupConfigMap[i] = "configList=";
				//member map starts after group name/key (i.e. [2])
				for(var a=2;a<affectedArr.length;a+=2)								
					if((affectedArr[a+1]|0) < -1) //there should be a new modified version
					{
						Debug.log("affectedArr " + affectedArr[a] + "-v" + affectedArr[a+1]);
						//find version
						for(var k=0;k<savedTables.length;++k)
							if(affectedArr[a] == savedTables[k].tableName)
							{
								Debug.log("found " + savedTables[k].tableName + "-v" +
										savedTables[k].tableVersion);
								affectedGroupConfigMap[i] += affectedArr[a] + "," + 
										savedTables[k].tableVersion + ",";
								break;
							}
					}
					else //use existing version
						affectedGroupConfigMap[i] += affectedArr[a] + "," + affectedArr[a+1] + ",";
			}
			
		}
			
		
		//	for each affected group
		for(var i=0;i<affectedGroupNames.length;++i)
		{	
			reqStr = ""; //reuse
			reqStr = "Request?RequestType=saveNewConfigurationGroup" +
					"&groupName=" + affectedGroupNames[i] +
					"&allowDuplicates=1" +
					"&ignoreWarnings=" + (doNotIgnoreWarnings?0:1) + 
					"&groupComment=" + encodeURIComponent(affectedGroupComments[i]);
			Debug.log(reqStr);
			Debug.log(affectedGroupConfigMap[i]);

			++numberOfRequests;
			///////////////////////////////////////////////////////////
			DesktopContent.XMLHttpRequest(reqStr, affectedGroupConfigMap[i], 
					function(req,affectedGroupIndex) 
					{

				var attemptedNewGroupName = DesktopContent.getXMLValue(req,"AttemptedNewGroupName");
				var treeErr = DesktopContent.getXMLValue(req,"TreeErrors");
				if(treeErr) 
				{	
					Debug.log(treeErr,Debug.HIGH_PRIORITY);
					Debug.log("There were problems identified in the tree view of the " +
							"attempted new group '" +
							attemptedNewGroupName +
							"'.\nThe new group was not created.\n" +
							"(Note: Other tables and groups may have been successfully created, " +
							"and would have success indications below this error info)\n\n" +
							"You can save the group anyway (if you think it is a good idea) by clicking " +
							"the button in the pop-up dialog " +
							"'<u>Save Groups with Warnings Ignored</u>.' " +
							"\n\nOtherwise, you can hit '<u>Cancel</u>.' and fix the tree. " +
							"Below you will find the description of the problem:",																		
							Debug.HIGH_PRIORITY);

					//change dialog save button
					var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-submitButton");
					if(el)
					{
						el.onmouseup = function() {
							Debug.log("Submit mouseup");
							this.disabled = true;
							ConfigurationAPI.handleGroupCommentToggle(0,1); //force cache of group comment
							ConfigurationAPI.handlePopUpHeightToggle(h,gh);

							var savingGroups = 
									document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + 
											"-bumpGroupVersions").checked;
							var activatingSavedGroups = 
									document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + 
											"-activateBumpedGroupVersions").checked;

							ConfigurationAPI.saveModifiedTables(modifiedTables,responseHandler,
									false, //doNotIgnoreWarnings
									doNotSaveAffectedGroups,
									doNotActivateAffectedGroups,doNotSaveAliases
							);							
						};
						el.value = "Save Groups with Warnings Ignored";
						el.disabled = false;
					}
					return;
				}

				var err = DesktopContent.getXMLValue(req,"Error");
				if(err) 
				{					
					Debug.log(err,Debug.HIGH_PRIORITY);

					//kill popup dialog
					var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + ""); 
					if(el) el.parentNode.removeChild(el);	
					responseHandler(savedTables,savedGroups,savedAliases);
					return;
				}			

				++numberOfReturns;

				var newGroupKey = DesktopContent.getXMLValue(req,"ConfigurationGroupKey");									
				affectedGroupKeys.push(newGroupKey);
				
				{
					var obj = {};
					obj.groupName = attemptedNewGroupName;
					obj.groupKey = newGroupKey;
					obj.groupComment = affectedGroupComments[affectedGroupIndex];
					savedGroups.push(obj);
				}

				//need to modify root group name if changed
				Debug.log("Successfully created new group '" + attemptedNewGroupName + 
						" (" + newGroupKey + ")'", Debug.INFO_PRIORITY);

				//activate if option was selected
				if(activatingSavedGroups)
					ConfigurationAPI.activateGroup(attemptedNewGroupName,newGroupKey,
							false /* ignoreWarnings */);
				

				if(allRequestsSent && 
						numberOfReturns == numberOfRequests)
				{
					Debug.log("Done with group saving.");

					Debug.log("Moving on to Alias creation...");										

					//check each alias checkbox
					//	for each alias that is checked
					//		set alias for new group
					//if any aliases modified, save and activate backbone

					//get checkboxes
					var setAliasCheckboxes;
					try
					{
						setAliasCheckboxes = 
							document.getElementsByClassName("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-setGroupAlias");
					}
					catch(err)
					{
						//no popup, so take from input and set for all affected groups
						setAliasCheckboxes = [];
						for(var i in affectedGroupNames)
							setAliasCheckboxes.push({"checked" : ((!doNotSaveAliases)?1:0) });
					}

					var groupAlias, groupName, groupKey;
					var setAliasCheckboxIndex = -1;
					var groupAliasName, groupAliasVersion;

					//in order to set alias, we need:
					//	groupAlias
					//	groupName
					//	groupKey				

					//for each set alias checkbox that is checked
					//	modify the active group alias table one after the other

					//localNextAliasHandler
					//	uses setAliasCheckboxIndex to iterate through setAliasCheckboxes
					//	and send the next request to modify the activegroupAlias table
					//	sequentially
					function localNextAliasHandler(retParams) 
					{
						//first time there is no setAliasCheckboxIndex == -1
						if(setAliasCheckboxIndex >= 0) 
						{	
							if(retParams)
							{
								if(retParams.newBackbone)
								{
									Debug.log("Successfully modified the active Backbone group " +
											" to set the System Alias '" + groupAlias + "' to " +
											" refer to the current group '" + groupName + 
											" (" + groupKey + ").'" +
											"\n\n" +
											"Backbone group '" + retParams.groupName + " (" + 
											retParams.groupKey + ")' was created and activated.",
											Debug.INFO_PRIORITY);
									
									{
										var obj = {};
										obj.groupName = groupName;
										obj.groupKey = groupKey;
										obj.groupAlias = groupAlias;
										savedAliases.push(obj);
									}
								}
								else
									Debug.log("Success, but no need to create a new Backbone group. " +
											"An existing Backbone group " +
											" already has the System Alias '" + groupAlias + "' " +
											" referring to the current group '" + groupName + 
											" (" + groupKey + ").'" +
											"\n\n" +
											"Backbone group '" + retParams.groupName + " (" + 
											retParams.groupKey + ")' was activated.",
											Debug.INFO_PRIORITY);
							}
							else
							{										
								Debug.log("Process interrupted. Failed to modify the currently active Backbone!",Debug.HIGH_PRIORITY);

								//kill popup dialog
								var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + ""); 
								if(el) el.parentNode.removeChild(el);	
								responseHandler(savedTables,savedGroups,savedAliases);
								return;
							}	

							++setAliasCheckboxIndex; //req back, so ready for next index
						}
						else
							setAliasCheckboxIndex = 0; //ready for first checkbox

						//get next affected group index			
						while(setAliasCheckboxIndex < setAliasCheckboxes.length &&
								!setAliasCheckboxes[setAliasCheckboxIndex].checked)
							Debug.log("Skipping checkbox " + (++setAliasCheckboxIndex));

						if(setAliasCheckboxIndex >= setAliasCheckboxes.length)
						{
							Debug.log("Done with alias checkboxes ");

							if(!retParams)//req) 
							{
								Debug.log("No System Aliases were changed, so Backbone was not modified. Done.");

								//kill popup dialog
								var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + ""); 
								if(el) el.parentNode.removeChild(el);
								responseHandler(savedTables,savedGroups,savedAliases);
								return;
							}

							Debug.log("Saving and activating Backbone done.");

							//kill popup dialog
							var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + ""); 
							if(el) el.parentNode.removeChild(el);	
							responseHandler(savedTables,savedGroups,savedAliases);
							return;	
						}	

						//get next alias
						{
							var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editAliasSelect-" +
									setAliasCheckboxIndex);
							if(el.style.display == "none")
							{
								//get value from text box
								el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editAliasTextBox-" + 
										setAliasCheckboxIndex);					
							}
							groupAlias = el.value;
						}

						groupName = affectedGroupNames[setAliasCheckboxIndex];
						groupKey = affectedGroupKeys[setAliasCheckboxIndex];

						Debug.log("groupAlias = " + groupAlias);
						Debug.log("groupName = " + groupName);
						Debug.log("groupKey = " + groupKey);

						ConfigurationAPI.setGroupAliasInActiveBackbone(groupAlias,groupName,groupKey,
								"SaveWiz",
								localNextAliasHandler,										
								true); //request return parameters		
					}

					localNextAliasHandler();

					Debug.log("Aliases set in motion");
				}

					},i,0,0,true  //reqParam, progressHandler, callHandlerOnErr, showLoadingOverlay
			); //end save new group request								
		} //end affected group for loop

		allRequestsSent = true;
		if(numberOfRequests == 0) //no groups to save
		{
			//this could happen if editing tables with no current active groups
			Debug.log("There were no groups to save!", Debug.INFO_PRIORITY);

			//kill popup dialog
			var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + ""); 
			if(el) el.parentNode.removeChild(el);
		}
	}	//end localHandleAffectedGroups


	//go through each modified table
	//	if modified table
	//		save new version
	//		update return object based on result
	for(var j=0;j<modifiedTables.length;++j)
		if((modifiedTables[j].tableVersion|0) < -1) //for each modified table
		{
			var reqStr = "Request?RequestType=saveSpecificConfiguration" + 
					"&dataOffset=0&chunkSize=0" +  
					"&configName=" + modifiedTables[j].tableName + 
					"&version="+modifiedTables[j].tableVersion +	
					"&temporary=0" +
					"&tableComment=" + 
					encodeURIComponent(modifiedTables[j].tableComment?modifiedTables[j].tableComment:"") +
					"&sourceTableAsIs=1"; 
			Debug.log(reqStr);

			++numberOfRequests;

			//	save new version
			///////////////////////////////////////////////////////////
			DesktopContent.XMLHttpRequest(reqStr, "", 
					function(req,modifiedTableIndex) 
					{
				var err = DesktopContent.getXMLValue(req,"Error");
				if(err) 
				{					
					Debug.log(err,Debug.HIGH_PRIORITY);

					//kill popup dialog
					var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID); 
					if(el) el.parentNode.removeChild(el);
					responseHandler(savedTables,savedGroups,savedAliases);
					return;
				}						

				var configName = DesktopContent.getXMLValue(req,"savedName");
				var version = DesktopContent.getXMLValue(req,"savedVersion");

				Debug.log("Successfully created new table '" + configName + "-v" + 
						version + "'",Debug.INFO_PRIORITY);
				
				//update saved table version based on result
				{
					var obj = {};
					obj.tableName = configName;
					obj.tableVersion = version;
					obj.tableComment = modifiedTables[modifiedTableIndex].tableComment;
					savedTables.push(obj);
				}				

				++numberOfReturns;

				if(allRequestsSent && 
						numberOfReturns == numberOfRequests)
				{
					if(!doNotSaveAffectedGroups)
						localHandleAffectedGroups();							
				}
					},j,0,0,true  //reqParam, progressHandler, callHandlerOnErr, showLoadingOverlay
			);	//end save new table request
		}	//end modified table for loop

	allRequestsSent = true;
	if(numberOfRequests == 0) //no requests were sent, so go on to affected groups
	{
		//localHandleAffectedGroups();
		Debug.log("No tables were modified. Should be impossible to get here.", Debug.HIGH_PRIORITY);
	}
}


//=====================================================================================
//activateGroup ~~
ConfigurationAPI.activateGroup = function(groupName, groupKey, 
		ignoreWarnings)
{
	DesktopContent.XMLHttpRequest("Request?RequestType=activateConfigGroup&groupName=" + 
			groupName + "&groupKey=" + groupKey +
			(ignoreWarnings?("&ignoreWarnings=" + ignoreWarnings):""),
			"",
			function(req) 
			{
		
		var err = DesktopContent.getXMLValue(req,"Error");
		if(err) 
		{
			Debug.log(err,Debug.HIGH_PRIORITY);				

			//Debug.log(_OTS_RELAUNCH_STR,Debug.INFO_PRIORITY);

			//show activate with warnings link
			var str = "";			

				//add ignore warnings Activate link
			str += " <a href='#' onclick='javascript:ConfigurationAPI.activateGroup(\"" + 
					groupName +
					"\",\"" + groupKey + "\",true); return false;'>"; //ignore warnings
			str += "Activate " + 
					groupName + "(" + groupKey + ") w/warnings ignored</a>";
			
			Debug.log("If you are are sure it is a good idea you can try to " +
					"activate the group with warnings ignored: " +
					str,Debug.HIGH_PRIORITY);
		}
			},
			true, 0 ,0, //reqIndex, progressHandler, callHandlerOnErr
			true); //showLoadingOverlay
}

//=====================================================================================
//setGroupAliasInActiveBackbone ~~
//	Used to set a group alias.
//	This function will activate the resulting backbone group and 
//		call a done handler	
//
//      if doReturnParms
//          then the handler is called with an object 
//          describing the new backbone group object:
//                 retParams.newBackbone //true if successfully activated
//                 retParams.groupName   //backbone group name 
//                 retParams.groupKey    //backbone group key
//               
ConfigurationAPI.setGroupAliasInActiveBackbone = function(groupAlias,groupName,groupKey,
		newBackboneNameAdd,doneHandler,doReturnParams)
{
	Debug.log("setGroupAliasInActiveBackbone groupAlias=" + groupAlias);
	Debug.log("setGroupAliasInActiveBackbone groupName=" + groupName);
	Debug.log("setGroupAliasInActiveBackbone groupKey=" + groupKey);

	if(!groupName || groupName == "" || !groupKey || groupKey == "")
	{
		Debug.log("Process interrupted. Invalid group name and key given!",Debug.HIGH_PRIORITY);
		doneHandler(); //error so call done handler
		return;
	}

	if(!newBackboneNameAdd || newBackboneNameAdd == "")
		newBackboneNameAdd = "Wiz";
	newBackboneNameAdd += "Backbone";
	Debug.log("setGroupAliasInActiveBackbone newBackboneNameAdd=" + newBackboneNameAdd);

	DesktopContent.XMLHttpRequest("Request?RequestType=setGroupAliasInActiveBackbone" +
			"&groupAlias=" + groupAlias + 
			"&groupName=" + groupName +
			"&groupKey=" + groupKey, "", 
			ConfigurationAPI.newWizBackboneMemberHandler,
			[("GroupAlias" + newBackboneNameAdd),doneHandler,doReturnParams],
			0,0,true  //progressHandler, callHandlerOnErr, showLoadingOverlay
	);					
}

//=====================================================================================
//newWizBackboneMemberHandler
//	Used to handle the response from modifying a member of the backbone.
//	This handler will activate the resulting backbone group and
//		call a done handler.
//
//	params = [newBackboneGroupName, doneHandler, doReturnParams]
ConfigurationAPI.newWizBackboneMemberHandler = function(req,params)
{
	var err = DesktopContent.getXMLValue(req,"Error");
	if(err) 
	{
		Debug.log(err,Debug.HIGH_PRIORITY);
		Debug.log("Process interrupted. Failed to modify the currently active Backbone!",Debug.HIGH_PRIORITY);

		if(params[1])
			params[1](); //error so call done handler
		return;
	}		

	var groupAliasName = DesktopContent.getXMLValue(req,"savedName");
	var groupAliasVersion = DesktopContent.getXMLValue(req,"savedVersion");

	Debug.log("groupAliasName=" + groupAliasName);
	Debug.log("groupAliasVersion=" + groupAliasVersion);

	var configNames = req.responseXML.getElementsByTagName("oldBackboneName");
	var configVersions = req.responseXML.getElementsByTagName("oldBackboneVersion");

	//make a new backbone with old versions of everything except Group Alias 
	var configMap = "configList=";
	var name;
	for(var i=0;i<configNames.length;++i)
	{		
		name = configNames[i].getAttribute("value");

		if(name == groupAliasName)
		{
			configMap += name + "," + 
					groupAliasVersion + ",";
			continue;
		}
		//else use old member
		configMap += name + "," + 
				configVersions[i].getAttribute("value") + ",";							
	}

	ConfigurationAPI.saveGroupAndActivate(params[0],configMap,params[1],params[2]);			
}

//=====================================================================================
//saveGroupAndActivate
ConfigurationAPI.saveGroupAndActivate = function(groupName,configMap,doneHandler,doReturnParams)
{
	DesktopContent.XMLHttpRequest("Request?RequestType=saveNewConfigurationGroup&groupName=" +
			groupName, configMap, 
			function(req)
			{
		var err = DesktopContent.getXMLValue(req,"Error");
		var name = DesktopContent.getXMLValue(req,"ConfigurationGroupName");
		var key = DesktopContent.getXMLValue(req,"ConfigurationGroupKey");
		var newBackbone = true;
		if(err) 
		{
			if(!name || !key)
			{
				Debug.log(err,Debug.HIGH_PRIORITY);
				Debug.log("Process interrupted. Failed to create a new Backbone group!" +
						" Please see details below.",
						Debug.HIGH_PRIORITY);

				if(doneHandler)
					doneHandler(); //error so call done handler
				return;
			}
			else
			{
				Debug.log(err,Debug.WARN_PRIORITY);
				Debug.log("Process interrupted. Failed to create a new Backbone group!" +
						" (Likely the currently active Backbone already represents what is being requested)\n\n" +
						"Going on with existing backbone group, name=" + name + " & key=" + key,
						Debug.WARN_PRIORITY);
				newBackbone = false;
			}					
		}

		//now activate the new backbone group

		DesktopContent.XMLHttpRequest("Request?RequestType=activateConfigGroup" +
				"&groupName=" + name +
				"&groupKey=" + key, "", 
				function(req)
				{
			var err = DesktopContent.getXMLValue(req,"Error");
			if(err) 
			{
				Debug.log(err,Debug.HIGH_PRIORITY);
				return;
			}

			try
			{
				activateSystemConfigHandler(req);
			}
			catch(err) {} //ignore error, this is only used by ConfigurationGUI (or anyone implementing this extra handler)

			if(doneHandler)
			{
				//done so call done handler (and indicate success)
				if(!doReturnParams)
					doneHandler(); //done so call done handler
				else
				{
					var retParams = {
							"groupName" : name,
							"groupKey" : key,
							"newBackbone" : newBackbone									
					}
					doneHandler(retParams); 	 //(and indicate success)
				}
			}

				},0,0,0,true  //reqParam, progressHandler, callHandlerOnErr, showLoadingOverlay
		);	//end of activate new backbone handler

			},0,0,0,true  //reqParam, progressHandler, callHandlerOnErr, showLoadingOverlay
	); //end of backbone saveNewConfigurationGroup handler
}

//=====================================================================================
//bitMapDialog ~~
//	shows bitmap dialog at full window size (minus margins)
//	on ok, calls <okHandler> with finalBitMapValue parameter
//
//	<bitMapParams> is an array of size 6:
//		rows,cols,cellFieldSize,minColor,midColor,maxColor
ConfigurationAPI.bitMapDialog = function(fieldName,bitMapParams,initBitMapValue,okHandler,cancelHandler)
{
	var bmpData = this.bmpData;
	
	Debug.log("ConfigurationAPI bitMapDialog");	

	var str = "";

	var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
	if(!el)
	{
		el = document.createElement("div");			
		el.setAttribute("id", ConfigurationAPI._POP_UP_DIALOG_ID);
	}
	el.style.display = "none";
	el.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmapDialog");

	var padding = 10;
	var popSz = ConfigurationAPI.setPopUpPosition(el,undefined,undefined,padding,undefined,30 /*margin*/);
		
	//create bit map dialog
	// 	- header at top with field name and parameters
	//	- bitMap, w/mouseover and click and drag (same as windows sw)
	//		- center vertically
	//  - OK, CANCEL buttons at top right
	//	- also upload download buttons

	//	var _bitMapFieldsArr = ["Number of Rows",
	//							"Number of Columns",
	//							"Cell Bit-field Size",
	//							"Min-value Allowed",
	//							"Max-value Allowed",
	//							"Value step-size Allowed",
	//							"Display Aspect H:W",
	//							"Min-value Cell Color",
	//							"Mid-value Cell Color",
	//							"Max-value Cell Color",
	//							"Absolute Min-value Cell Color",
	//							"Absolute Max-value Cell Color"];
	
	var rows = 2; //bitMapParams[0];
	var cols = 8;
	var bitFieldSize = 4;//bitMapParams[2];
	var bitMask = (1<<bitFieldSize) - 1;
		
	var minValue = 4;//bitMapParams[3] == "DEFAULT" || bitMapParams[3] == ""?0:(bitMapParams[3]|0);
	var maxValue = 8;//bitMapParams[4] == "DEFAULT" || bitMapParams[4] == ""?bitMask:(bitMapParams[4]|0);
	if(maxValue < minValue)
		maxValue = bitMask;
	var stepValue = 2;//bitMapParams[5] == "DEFAULT" || bitMapParams[5] == ""?1:(bitMapParams[5]|0);
				
	var hdrX = padding; 
	var hdrY = padding;
	var hdrW = popSz.w;
	var hdrH = 150;

	var bmpX = padding; 
	var bmpY = hdrY+hdrH+padding;	
	var bmpW = popSz.w;
	var bmpH = popSz.h - hdrH - padding;

	var cellW = bmpW/cols;
	var cellH = bmpH/rows;
	
	//optimize aspect ratio for viewing window
	function localOptimizeAspectRatio()
	{
		var cellSkew = (cellW>cellH)?cellW/cellH:cellH/cellW;
		var MAX_SKEW = 3;

		var forcedAspectH = 100;
		var forcedAspectW = 150;
		
		if(forcedAspectH !== undefined)
		{
			var offAspectH = forcedAspectH/cellH;
			var offAspectW = forcedAspectW/cellW;
			
			Debug.log("Adjusting skew factor = " + forcedAspectH + "-" + forcedAspectW);
			
			if(offAspectH < offAspectW) //height is too big
				bmpH = bmpW/cols*forcedAspectH/forcedAspectW*rows;
			else //width is too big
				bmpW = bmpH/rows*forcedAspectW/forcedAspectH*cols;
		}
		else if(cellSkew > MAX_SKEW) //re-adjust bitmap
		{
			var adj = cellSkew/MAX_SKEW;
			//to much skew in cell shape.. so let's adjust
			Debug.log("Adjusting skew factor = " + adj);
			if(cellW > cellH)
			{
				bmpW /= adj;
			}
			else
				bmpH /= adj;
		}
		//recalculate new cells
		cellW = bmpW/cols;
		cellH = bmpH/rows;

		//center bitmap
		bmpX = padding + (popSz.w-bmpW)/2; 
		bmpY = bmpY + (popSz.h-bmpY-bmpH)/2;	
		hdrY = bmpY - padding - hdrH;
	}	localOptimizeAspectRatio();
			
	//create header
	function localCreateHeader()
	{
		var hdr = document.createElement("div");
		hdr.setAttribute("id", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-header");

		var str = "";
		
		str += "<div style='float:left;'>";
		str += fieldName;
		str += "</div>";

		str += "<div style='float:left;'>";
		str += "Number of [Rows,Cols]:" + "[" + rows + "," + cols + "]";
		str += "</div>";
		
		str += "<div style='float:right;'>";
		str += "<a id='" + 
				ConfigurationAPI._POP_UP_DIALOG_ID + 
				"-cancel' href='#'>Cancel</a>";
		str += "</div>";
		
		str += "<div id='clearDiv'></div>";
		

		str += "<div style='float:left;'>";
		str += "Left-Click Value:";
		str += "<input class='bitmap-scrollbar' type='range' min='" + minValue + 
				"' max='" + maxValue + "' value='" + minValue + 
				"' step='" + stepValue + 
				"' oninput='ConfigurationAPI.bitMapDialog.localUpdateScroll(0)' />";
		str += "<input class='bitmap-textInput' type='text' value='" + minValue + 
				"' />";
		str += "<img class='bitmap-colorSample' ondragstart='return false;'" + //ondragstart for firefox
				" draggable='false' style='" +	//draggable for chrome
				"width:40px; height:40px;" +
				"'/>";
		str += "</div>";
		
		str += "<div id='clearDiv'></div>";

		str += "<div style='float:left;'>";
		str += "Left-Click Value:";
		str += "<input class='bitmap-scrollbar' type='range' min='" + minValue + 
				"' max='" + maxValue + "' value='" + maxValue + 
				"' step='" + stepValue + 
				"' oninput='ConfigurationAPI.bitMapDialog.localUpdateScroll(1)' />";
		str += "<input class='bitmap-textInput' type='text' value='" + maxValue + 
				"' />";
		str += "<img class='bitmap-colorSample' ondragstart='return false;'" + //ondragstart for firefox
				" draggable='false' style='" +	//draggable for chrome
				"width:40px; height:40px;" +
				"'/>";
		str += "</div>";
		
//		str += "<table width='100%' cellpadding=0 cellspacing=0><tr>";
//		str += "<td colspan=2 align='left'>";
//		str += fieldName;
//		str += "</td>";
//		
//		str += "<td align='right'>";
//		str += "</td>";
//		
//		str += "</tr>";
//		str += "<tr>";
//		str += "<td align='right'>";
//		str += "Number of [Rows,Cols]:";
//		str += "</td>";
//		str += "<td align='left'>";
//		str += "[" + rows + "," + cols + "]";
//		str += "</td>";
//		str += "<td>";
//		str += "</td>";
//		str += "</tr>";
//		str += "</table>";
						
		
		hdr.innerHTML = str;
		hdr.style.overflowY = "auto";
		hdr.style.position = "absolute";
		hdr.style.left = hdrX + "px";
		hdr.style.top = hdrY + "px";
		hdr.style.width = hdrW + "px";
		hdr.style.height = hdrH + "px";
		
		var scrollEls = hdr.getElementsByClassName("bitmap-scrollbar");	
		var textInputEls = hdr.getElementsByClassName("bitmap-textInput");	
		var colorSampleEls = hdr.getElementsByClassName("bitmap-colorSample");
		ConfigurationAPI.bitMapDialog.localUpdateScroll = function(i)		
		{
			textInputEls[i].value = scrollEls[i].value;
			colorSampleEls[i].src = ConfigurationAPI.getOneBitPngData(0,0,
					((scrollEls[i].value|0)*100)%255,255);
		}; 
		
		el.appendChild(hdr);

		ConfigurationAPI.bitMapDialog.localUpdateScroll(0);
		ConfigurationAPI.bitMapDialog.localUpdateScroll(1);
		
	} localCreateHeader();
	
	//done with header
	
	var bmp =  document.createElement("img");
	bmp.setAttribute("id", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap");
	
	{
		var canvas=document.createElement("canvas");
		canvas.width = cols;
		canvas.height = rows;
		var ctx = canvas.getContext("2d");		
		
		if(bmpData) delete bmpData;
		bmpData = ctx.createImageData(cols,rows);
		for(var i=0;i<rows;++i)
			for(var j=0;j<cols;++j)
			{
				bmpData.data[(i*cols + j)*4+0]=(i*100)%255;
				bmpData.data[(i*cols + j)*4+1]=(j*100)%255;
				bmpData.data[(i*cols + j)*4+2]=0;
				bmpData.data[(i*cols + j)*4+3]=255;
			}
		ctx.putImageData(bmpData,0,0);
		bmp.src = canvas.toDataURL();
	}	
	
	bmp.style.position = "absolute";
	bmp.style.left = bmpX + "px";
	bmp.style.top = bmpY + "px";
	bmp.style.width = bmpW + "px";
	bmp.style.height = bmpH + "px";
	bmp.draggable = false; //prevent dragging
	
	el.appendChild(bmp);
	document.body.appendChild(el); //add element to body
	el.style.display = "block";
	
	//create cancel onclick handler
	function localCreateCancelClickHandler()
	{
		document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID + 
				"-cancel").onclick = function(event) {
			Debug.log("Cancel click");
			var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
			if(el) el.parentNode.removeChild(el); //close popup											
			cancelHandler(); //empty array indicates nothing done
			return false;
		}; //end submit onmouseup handler				
	} localCreateCancelClickHandler();
	
	//create mouseover handler
	function localCreateMouseHandler()
	{
		var stopProp = false; //used to stop contextmenu propagation
		var rLast = -1, cLast = -1; //to stop redoing calculations in mouse over
		var buttonDown = -1; //0 - left, 1 - middle, 2 - right
		
		var bmpOverlay =  document.createElement("img");
		bmpOverlay.setAttribute("id", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-overlay");
		el.appendChild(bmpOverlay);		
		
		el.onmousemove = function(event) {
			var x = event.pageX - popSz.x - bmpX;
			var y = event.pageY - popSz.y - bmpY;
			var r = (y/cellH)|0;
			var c = (x/cellW)|0;
			if(rLast == r && cLast == c)
				return; //already done for this cell, so prevent excessive work 
			rLast = r; cLast = c;
				
			if(x < 0 || y < 0 || r >= rows || c >= cols)
			{
				//mouse off bitmap
				bmpOverlay.style.display = "none";
				return;				
			}
			Debug.log("x,y " + x + "," + y);
			Debug.log("r,c " + r + "," + c);			
			
			//have mouse over bitmap			
			{
				Debug.log("r,g,b " + bmpData.data[r*cols+c+1] + "," + 
						bmpData.data[r*cols+c+2] + "," + bmpData.data[r*cols+c+3]);
				
				var canvas=document.createElement("canvas");
				canvas.width = 1;
				canvas.height = 1;
				var ctx = canvas.getContext("2d");		

				var bmpOverlayData = ctx.createImageData(1,1);
				bmpOverlayData.data[0]=255;
				bmpOverlayData.data[1]=255;
				bmpOverlayData.data[2]=0;
				bmpOverlayData.data[3]=255;
				ctx.putImageData(bmpOverlayData,0,0);
				bmpOverlay.src = canvas.toDataURL();
				
				bmpOverlay.style.position = "absolute";
				bmpOverlay.style.left = (bmpX + c*cellW) + "px";
				bmpOverlay.style.top = (bmpY + r*cellH) + "px";
				bmpOverlay.style.width = (cellW) + "px";
				bmpOverlay.style.height = (cellH) + "px";
				bmpOverlay.style.display = "block";

				bmpOverlay.draggable = false; //prevent dragging				
			}	
			
			if(buttonDown >= 0)
			{
				stopProp = true;			
				localSetBitMap(r,c); //set bitmap data
			}
			
		} //end mouse move
		
		el.onmousedown = function(event) {
			
			var x = event.pageX - popSz.x - bmpX;
			var y = event.pageY - popSz.y - bmpY;
			var r = (y/cellH)|0;
			var c = (x/cellW)|0;
			
			Debug.log("click which " + event.which);
			Debug.log("click button " + event.button);
			buttonDown = event.button;
			
			
			if(x < 0 || y < 0 || r >= rows || c >= cols)
			{
				rLast = -1; cLast = -1; //reset for mouse move
				stopProp = false;
				return;				
			}
			
			rLast = r; cLast = c;			
			localSetBitMap(r,c); //set bitmap data

			stopProp = true;
			event.stopPropagation();
			
		} //end mouse down

		el.onmouseup = function(event) {
			Debug.log("click up ");
			buttonDown = -1;
		} //end mouse up

		el.oncontextmenu = function(event) {
			Debug.log("click stopProp " + stopProp);
			
			if(stopProp)
			{
				stopProp = false;
				event.stopPropagation();			
				return false;
			}
		} //end oncontextmenu
		
		function localSetBitMap(r,c) {
			Debug.log("set r,c " + buttonDown + " @ " + r + "," + c );
			
			var leftColor = [255,255,255,255];
			var otherColor = [0,0,0,255];
			
			bmpData.data[(r*cols + c)*4 + 0] = buttonDown?otherColor[0]:leftColor[0];
			bmpData.data[(r*cols + c)*4 + 1] = buttonDown?otherColor[1]:leftColor[1];
			bmpData.data[(r*cols + c)*4 + 2] = buttonDown?otherColor[2]:leftColor[2];
			bmpData.data[(r*cols + c)*4 + 3] = buttonDown?otherColor[3]:leftColor[3];
			
			ctx.putImageData(bmpData,0,0);
			bmp.src = canvas.toDataURL();
		}
		
	} localCreateMouseHandler();
		
}
	

//=====================================================================================
//getDateString ~~
//	Example call from linux timestamp:
//		groupCreationTime = ConfigurationAPI.getDateString(new Date((groupCreationTime|0)*1000));
ConfigurationAPI.getDateString;
{
var dayArr_ = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
var monthArr_ = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
ConfigurationAPI.getDateString = function(date)
{
	var dateStr = "";

	dateStr += dayArr_[date.getDay()];
	dateStr += " ";
	dateStr += monthArr_[date.getMonth()];
	dateStr += " ";
	dateStr += date.getDate();
	dateStr += " ";
	dateStr += date.getHours();
	dateStr += ":";
	dateStr += ((date.getMinutes()<10)?"0":"") + date.getMinutes();
	dateStr += ":";
	dateStr += ((date.getSeconds()<10)?"0":"") + date.getSeconds();
	dateStr += " ";
	dateStr += date.getFullYear();
	dateStr += " ";
	dateStr += date.toLocaleTimeString([],{timeZoneName: "short"}).split(" ")[2];
	return dateStr;
}
}

//=====================================================================================
//setCaretPosition ~~
ConfigurationAPI.setCaretPosition = function(elem, caretPos, endPos) 
{
	elem.focus();
	elem.setSelectionRange(caretPos, endPos);
}


//=====================================================================================
//setPopUpPosition ~~
//	centers element based on width and height constraint
//	
//	Note: assumes a padding and border size if not specified
//  Note: if w,h not specified then fills screen (minus margin)
ConfigurationAPI.setPopUpPosition = function(el,w,h,padding,border,margin)
{
	if(padding === undefined) padding = 10;
	if(border === undefined) border = 1;	
	if(margin === undefined) margin = 0;	

	var x,y;
	//set position and size
	{		
		var ww = DesktopContent.getWindowWidth()-(padding+border)*2;
		var wh = DesktopContent.getWindowHeight()-(padding+border)*2;
		
		//ww & wh are max window size at this point
		
		if(w === undefined || h === undefined)
		{
			w = ww-(margin)*2;
			h = wh-(margin)*2;
		}
		//else w,h are inputs and margin is ignored
		
		x = (DesktopContent.getWindowScrollLeft() + ((ww-w)/2));
		y = (DesktopContent.getWindowScrollTop() + ((wh-h)/2));

		el.style.left = x + "px";
		el.style.top = y + "px"; 
		el.style.width = w + "px";
		el.style.height = h + "px";
	}
	
	return {"w" : w, "h" : h, "x" : x, "y" : y};
}


//=====================================================================================
//setPopUpPosition ~~
//	centers element based on width and height constraint
//	
//	Note: assumes a padding and border size if not specified
//  Note: if w,h not specified then fills screen (minus margin)
ConfigurationAPI.getOneBitPngData = function(r,g,b,a)
{
	var canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	var ctx = canvas.getContext("2d");		

	var bmpOverlayData = ctx.createImageData(1,1);
	bmpOverlayData.data[0]=r;
	bmpOverlayData.data[1]=g;
	bmpOverlayData.data[2]=b;
	bmpOverlayData.data[3]=a;
	ctx.putImageData(bmpOverlayData,0,0);
	return canvas.toDataURL();
}














