


	//	Description of Subsystem Launch Functionality/Behavior:
	//	
	//		Start Run button at top
	//		Checkboxes on left to select remote subsystems to enable/include
	//			- For each subsystem, there is...
	//				* a dropdown for "FSM Mode": 'Follow FSM,' 'Do not Halt' (artdaq),  or 'Only Configure' (DCS/DQM)
	//				* a button for "Transition Alone" (that pops up for which transition action to do)
	//				* a dropdown for "Configuration Alias"
	//		


//User note:
//	This is demonstrated in otsdaq_demo/UserWebGUI/html/SubsystemLaunch.html
//		
//	In short, subsystems comprise your configuration, and subsystem names map to
//		one or many context records that can be on/off as a group (activating/deactivating their segment of the full configuration).


//Subsystem Launch desktop icon from:
//	http://icons.iconarchive.com/icons/bokehlicia/captiva/256/rocket-icon.png


var SubsystemLaunch = SubsystemLaunch || {}; //define SubsystemLaunch namespace

if (typeof Debug == 'undefined')
	throw('ERROR: Debug is undefined! Must include Debug.js before SubsystemLaunch.js');
else if (typeof Globals == 'undefined')
    throw('ERROR: Globals is undefined! Must include Globals.js before SubsystemLaunch.js');

SubsystemLaunch.MENU_PRIMARY_COLOR = "rgb(220, 187, 165)";
SubsystemLaunch.MENU_SECONDARY_COLOR = "rgb(130, 51, 51)";
	
SubsystemLaunch.SUBSYSTEM_FIELDS = ["name","url","status","progress","detail","lastStatusTime","configAlias","configAliasChoices","fsmMode"];
SubsystemLaunch.SUBSYSTEM_FIELDS_NAME = SubsystemLaunch.SUBSYSTEM_FIELDS.indexOf("name");
SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS = ["name","url","status","progress","detail","lastStatusTime","configAlias","configAliasChoices","fsmMode","consoleErrCount","consoleWarnCount"];
SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS_STATUS = SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS.indexOf("status");
SubsystemLaunch.subsystems = [];
SubsystemLaunch.system = {};

SubsystemLaunch.SUBSYSTEM_FSM_MODES = ["Follow FSM", "Do Not Halt", "Only Configure"];

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//call create to create instance of a SubsystemLaunch
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
SubsystemLaunch.create = function() {


	//functions:			
	//
	//	init()
	//	SubsystemLaunch.initSubsystemRecords()
	//	SubsystemLaunch.extractSystemStatus(req)
	//

	

	//		'private' member functions: -------
	//	createElements()
	//	redrawWindow()

	//	getCurrentStatus()
	//		- localGetStatusHandler()
	//	displayStatus()
	//
	//		'public' member functions: -------
	//	this.handleSubsystemActionSelect()
	//	this.launch()
	//		- localLaunch()
	//		- localSetSequenceOfRecords()
	//	this.gatewayLaunchOts()
	//		- localDelayedLaunch()
	//			-- localCountDown()
	//	this.run()
	//		- localStop()	
	//		- localRun()
	//
	//	this.toggleCheckboxDiv(i)
	//	this.handleCheckbox(c)
	

	
	
	//for display
	var _CHECKBOX_H = 40;
	var _CHECKBOX_MIN_W = 240;
	var _CHECKBOX_MAX_W = 540;
	var _LAUNCH_MIN_W = 525;
	var _MARGIN = 20;


	var _needEventListeners = true;


	// var _systemStatusArray = [];
	// var _contextRecords = [];
	// var _configAliasesObj = {};	

	// //for run state
	// var _state = "";
	// var _inTransition = false;
	// var _wasInTransition = false;
	// var _timeInState = 0;
	// var _progress = 0;
	// var _runNumber;
	// var _transitionName = "";

	var _fsmName, _fsmWindowName;
	var _getStatusTimer = 0;
	
	var _dotDotDot = "..."; //to add growing ... feedback to user

	//////////////////////////////////////////////////
	//////////////////////////////////////////////////
	// end variable declaration
	

	//=====================================================================================
	//init ~~
	function init() 
	{	
		if(_needEventListeners) //only first time landing handling
		{			
			var windowTooltip = "Welcome to the <b>Subsystem Launch</b> user interface. " +
				"Select which subsystems you want to enable/include, and then press the <b>Start</b> button!" +
				"\n\n" +
				"Subsystems can be set to '<b>Follow FSM</b>,' '<b>Do not Halt</b>,' or '<b>Only Configure</b>.'" + 
				"\n\n" +
				"For example, for Slow Controls or Data Quality Monitoring subsystems, you may want to only configure and stay configured - in this case, choose '<b>Only Configure</b>.' Or if you have a subsystem (e.g. artdaq based) that takes a long time to configure, set to '<b>Do Not Halt</b>' and it will be left configured, until a user manually Halts.";	
			Debug.log("Subsystem Launch init ");
			DesktopContent.tooltip("Subsystem Launch", windowTooltip);
			DesktopContent.setWindowTooltip(windowTooltip);

			_fsmName = DesktopContent.getParameter(0,"fsm_name");
			if(_fsmName && _fsmName != "")
				Debug.log("_fsmName=" + _fsmName);
			else
				_fsmName = "";

			_fsmWindowName = DesktopContent.getDesktopWindowTitle();
			if(_fsmWindowName && _fsmWindowName != "")
				Debug.log("_fsmWindowName=" + _fsmWindowName);
			else
				_fsmWindowName = "";	
	
		} //end first time landing handling

		window.clearTimeout(_getStatusTimer);


		//get all needed info sequentially
		SubsystemLaunch.initSubsystemRecords(localHandleInitComplete);
		// localHandleInitComplete(); //for debugging position, skip initSubsystemRecords

		
		return;
		

		//////////////////////////////
		function localHandleInitComplete()
		{
			Debug.log("localHandleInitComplete()");

			//proceed with rest of init
			createElements();

			if(_needEventListeners)
			{
				window.addEventListener("resize",redrawWindow);
				_needEventListeners = false;

				 //define relogin handler
				DesktopContent._loginNotifyHandler = function()
				{    	
					Debug.log("Handling login notification...");
					Debug.closeErrorPop();

					window.setTimeout(init,5000); //in 5 sec (give some time for subsystem propagation)
				} //end login notify handler
			}

			//get run state always
			window.clearTimeout(_getStatusTimer);
			_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec

			redrawWindow();

		} //end localGetContextRecordsHandler()
				

	} //end init()

	//=====================================================================================
	//createElements ~~
	//	called initially to create checkbox and button elements
	function createElements()
	{
		Debug.log("createElements()");

		Debug.log("createElements() system", SubsystemLaunch.system);
		
		

		//		<!-- body content populated by javascript -->
		//		<div id='content'>		
		//			
		// 			<div id='runDiv'> <button>Start</button> <input>1</input> Run of <input>open-ended</input> duration</div> 
		//			<div id='systemStatusDiv'>Next anticipated run number is </div>
		//			<div id='subsystemDiv'>TABLE</div>
		//		
		//		</div>
		
		var cel,el,al,cl,il;
		var str = "";
		cel = document.getElementById("content");
		if(!cel)
		{
			cel = document.createElement("div");
			cel.setAttribute("id","content");
		}

		//clear all elements
		cel.innerHTML = "";
		
		
		{ //content div						
					
			{ //run launch div -------------------------
				el = document.createElement("div");
				el.setAttribute("id","runDiv");

				cl = document.createElement("div");
				cl.setAttribute("id","runDivContainer");
				el.appendChild(cl);	
				cel.appendChild(el);

				el = cl;

				al = document.createElement("a");
				al.setAttribute("id","startButtonLink");
				al.setAttribute("style","float: left;");
				al.onclick = function()
						{
					Debug.log("clicked start");
					SubsystemLaunch.launcher.start();
						};		
				
				il = document.createElement("div");
				il.setAttribute("id","startButtonDiv");
				il.innerHTML = "Start";
				al.appendChild(il);				
				el.appendChild(al);

				il = document.createElement("input");
				il.setAttribute("id","runCountInput");
				il.setAttribute("style","display: none; float: left; margin: 7px 0 0 10px;	width: 30px; text-align: center; padding: 4px; font-size: 14px;");
				il.value = "1";
				el.appendChild(il);		
				
				il = document.createElement("div");
				il.setAttribute("id","runCountInputUnits");
				il.setAttribute("style","float: left; margin: 10px 0 0 10px;");
				il.innerHTML = "Run of";
				el.appendChild(il);	
								
				il = document.createElement("input");
				il.setAttribute("id","runDurationInput");
				il.setAttribute("style","display: none; float: left; margin: 7px 0 0 10px; width: 30px; text-align: center; padding: 4px; font-size: 14px;");
				il.value = "1";
				el.appendChild(il);		

				il = document.createElement("div");
				il.setAttribute("id","runDurationDiv");
				il.setAttribute("style","float: left; margin: 7px 10px;");
				str = "<select id='runDurationSelect' style='padding: 4px; font-size: 14px;' "+ 
					"onchange='SubsystemLaunch.launcher.handleDurationSelect(this.value);'>";
				str += "<option selected>Open-ended</option>";
				str += "<option >Second(s)</option>";
				str += "<option >Minute(s)</option>";
				str += "<option >Hour(s)</option>";
				str += "</select>";
				il.innerHTML = str;
				el.appendChild(il);	
				
				il = document.createElement("div");
				il.setAttribute("id","runDurationText");
				il.setAttribute("style","float: left; margin-top: 10px;");
				il.innerHTML = "duration";
				el.appendChild(il);	
			} //end run launch div

			el = document.createElement("div");
			el.setAttribute("id","clearDiv");

			{ //debug manual update -------------------------
				al = document.createElement("a");
				al.setAttribute("id","debugGetStatusLink");
				al.setAttribute("style","float: left;");
				al.onclick = function()
						{
					Debug.log("clicked debug get status");
					// SubsystemLaunch.launcher.start();
					// getCurrentStatus();

					window.clearTimeout(_getStatusTimer);
						};	
				al.innerText = "Pause ";
				cel.appendChild(al);

				al = document.createElement("a");
				al.setAttribute("id","debugGetStatusLink");
				al.setAttribute("style","float: left;");
				al.onclick = function()
						{
					Debug.log("clicked debug get status");
					// SubsystemLaunch.launcher.start();
					getCurrentStatus();
						};	
				al.innerText = " Start ";
				cel.appendChild(al);

				el = document.createElement("div");
				el.setAttribute("id","clearDiv");
			} //end debug manual update

			{ //system status div -------------------------
				let numOfCols = 4;
				el = document.createElement("div");
				el.setAttribute("id","systemStatusDiv");
				str = "<table cellspacing='5px'>";
				str += "<tr><th colspan=" + numOfCols + ">System Status</th></tr>";
				str += "<tr><td id='systemStatusState'>";
				//add state
				str += SubsystemLaunch.system.state;
				str += "</td><td id='systemStatusTimeInState'>";
				str += "</td><td id='systemStatus_runNumber'>";
				str += "</td><td id='systemStatusActiveUsers'>";
				str += "</td></tr>";
				str += "<tr><td>";
				//add config alias select
				{					
					str += "Configure Alias:<br>";
					str += "<select id='systemConfigAliasSelect' style='padding: 4px; font-size: 14px;' "+ 
						"onchange='SubsystemLaunch.launcher.handleSystemConfigAliasSelect(this.value);'>";	
					if(SubsystemLaunch.system.systemAliases.length == 0)	
					{			
						str += "<option ></option>"; //empty option to start
						Debug.warn("No System Configure Aliases were found. Please make sure you have a Backbone Group activated with at least one valid Group Alias to a Configure-type group.");
					}
					let selc = -1;
					for(var c=0; c < SubsystemLaunch.system.systemAliases.length; ++c)	
					{				
						if(SubsystemLaunch.system.selectedSystemAlias == 
							SubsystemLaunch.system.systemAliases[c].name)
							selc = c;
						str += "<option " + (selc==c?"selected":"") + ">" +
							SubsystemLaunch.system.systemAliases[c].name +
							"</option>";
					}
					str += "</select>";
					str += "</td><td id='systemConfigAliasTranslation' colspan=" + (numOfCols-1) + ">";
					var aliasTranslation = ""; //set as innerText to handle special HTML chars
					if(selc >= 0)
					{
						str += "Configure Alias '" + SubsystemLaunch.system.systemAliases[selc].name + 
							"' translates to " + SubsystemLaunch.system.systemAliases[selc].translation;
						if(!SubsystemLaunch.system.systemAliases[selc].comment || SubsystemLaunch.system.systemAliases[selc].comment == "")
							str += " w/out a comment. <label id='systemConfigAliasTranslationNote' class='subtext'></label>"; //label will stay empty
						else 
						{
							str += " w/comment:<br><label id='systemConfigAliasTranslationNote' class='subtext'></label>";
							aliasTranslation += decodeURIComponent(SubsystemLaunch.system.systemAliases[selc].comment);
						}
					}
					else
						str += "&lt;=== Please select a valid System Configure Alias!";
					str += "</td></tr>";
				}
				if(SubsystemLaunch.system.lastRunLogEntry) //if not undefined
				{
					str += "<tr><td colspan=" + numOfCols + " style='text-align: left'>Last Run Type: <label id='systemStatus_lastRunLogEntry' class='subtext'></label>";
					str += "</td></tr>";
				}
				str += "<tr><td colspan=" + numOfCols + " style='text-align: left'>Last Logbook Entry: <label id='systemStatus_lastLogbookEntry' class='subtext'></label>";
				str += "</td></tr>";
				str += "<tr><td colspan=" + numOfCols + " style='text-align: left'>Last System Message: <label id='systemStatus_lastSystemMessage' class='subtext'></label>";
				str += "</td></tr>";

				//console err/warn count
				str += "<tr><td id='systemStatus_consoleInfoCount' style='text-align: right; padding-right: 5px; padding-left: 5px; white-space: nowrap;'>";
				str += SubsystemLaunch.system.consoleInfoCount;
				str += "</td><td colspan=" + (numOfCols-1) + " style='text-align: left'>Last Console Info: <label id='systemStatus_consoleInfoMessage' class='subtext'></label>";
				str += "</td></tr>";
				str += "<tr><td id='systemStatus_consoleWarnCount' style='text-align: right; padding-right: 5px; padding-left: 5px; white-space: nowrap;'>";
				str += SubsystemLaunch.system.consoleWarnCount;
				str += "</td><td colspan=" + (numOfCols-1) + " style='text-align: left'>Last Console Warning: <label id='systemStatus_consoleWarnMessage' class='subtext'></label>";
				str += "</td></tr>";
				str += "<tr><td id='systemStatus_consoleErrCount' style='text-align: right; padding-right: 5px; white-space: nowrap;'>";
				str += SubsystemLaunch.system.consoleErrCount;
				str += "</td><td colspan=" + (numOfCols-1) + " style='text-align: left'>Last Console Error: <label id='systemStatus_consoleErrMessage' class='subtext'></label>";
				str += "</td></tr>";


				str += "</table>";
				el.innerHTML = str;				
				cel.appendChild(el);
			} //end system status div

			el = document.createElement("div");
			el.setAttribute("id","clearDiv");

			{ //subsystem control div -------------------------

				var fields = ["Subsystem", "Configure Alias", "State", "Console", "Detail", "FSM Mode", "Manual FSM Action"];
				var fieldIds = ["name", "configAlias", "status", "console", "detail", "fsmMode", "action"];

				el = document.createElement("div");
				el.setAttribute("id","subsystemDiv");
				str = "<table cellspacing='5px'>";
				str += "<tr><th colspan=" + fields.length + ">Subsystem Status</th></tr>";
				//make field header row
				str += "<tr>";
				for(var i=0; i<fieldIds.length; ++i)
					str += "<th>" + fields[i] + "</th>";
				str += "</tr>";
				//make entry for each subsystem
				for(var s=0; s<SubsystemLaunch.subsystems.length; ++s)
				{
					str += "<tr>";
					for(var i=0; i<fieldIds.length; ++i)
					{
						str += "<td id='subsystem_" + s + "_" + fieldIds[i] +
							"' class='subsystem_" + fieldIds[i] + "'>";

						if(fieldIds[i] == "name")
							str += SubsystemLaunch.subsystems[s].name + " at " + SubsystemLaunch.subsystems[s].url;
						else if(fieldIds[i] == "action")
						{
							str += "<select id='subsystem_" + fieldIds[i] + 
								"_select_" + s + "' style='padding: 4px; font-size: 14px;' "+ 
								"onchange='SubsystemLaunch.launcher.handleSubsystemActionSelect(this, " + s + ");'>";
							str += "<option selected> </option>";
							str += "<option >Configure</option>";
							// str += "<option >Start</option>";
							// str += "<option >Stop</option>";
							str += "<option >Halt</option>";
							str += "</select>";
						}
						else if(fieldIds[i] == "configAlias")
						{
							str += "<select id='subsystem_" + fieldIds[i] + 
								"_select_" + s + "' style='padding: 4px; font-size: 14px;' "+ 
								"onchange='SubsystemLaunch.launcher.handleSubsystemConfigAliasSelect(this.value);'>";
							var csvSplit = SubsystemLaunch.subsystems[s].configAliasChoices.split(',');
							Debug.logv({csvSplit});
							str += "<option ></option>"; //empty option to start
							for(var c=0; c < csvSplit.length; ++c)							
								str += "<option " + (SubsystemLaunch.subsystems[s].configAlias == 
									csvSplit[c]?"selected":"") + ">" +
									csvSplit[c] +
									"</option>";
							str += "</select>";
						}
						else if(fieldIds[i] == "fsmMode")
						{
							str += "<select id='subsystem_" + fieldIds[i] + 
								"_select_" + s + "' style='padding: 4px; font-size: 14px;' "+ 
								"onchange='SubsystemLaunch.launcher.handleSubsystemFsmModeSelect(this.value);'>";							
							for(var c=0; c < SubsystemLaunch.SUBSYSTEM_FSM_MODES.length; ++c)							
								str += "<option " + (SubsystemLaunch.subsystems[s].fsmMode == 
									SubsystemLaunch.SUBSYSTEM_FSM_MODES[c]?"selected":"") + ">" +
									SubsystemLaunch.SUBSYSTEM_FSM_MODES[c] +
									"</option>";
							str += "</select>";
						}
						// else 
						// 	str += SubsystemLaunch.subsystems[s][fieldIds[i]];

						str += "</td>";
					}
					str += "</tr>";
				}

				str += "</table>";
				el.innerHTML = str;
				cel.appendChild(el);
			} //end subsystem control div
			
		} //end content div				
		
		document.body.appendChild(cel);		
		document.getElementById('systemConfigAliasTranslationNote').innerText = aliasTranslation;

		displayStatus(); //fill elements with data
	} //end createElements()

	//=====================================================================================
	//redrawWindow ~~
	//	called when page is resized
	function redrawWindow()
	{
		//adjust link divs to proper size
		//	use ratio of new-size/original-size to determine proper size

		var w = window.innerWidth | 0;
		var h = window.innerHeight | 0;	  

		if(w < _LAUNCH_MIN_W)
			w = _LAUNCH_MIN_W;
		if(h < _LAUNCH_MIN_W)
			h = _LAUNCH_MIN_W;

		Debug.log("redrawWindow to " + w + " - " + h);	
		

		var rdiv = document.getElementById("runDiv");
		var tdiv = document.getElementById("systemStatusDiv");
		var sdiv = document.getElementById("subsystemDiv");


		// sdiv.style.left = (sdivX-20) + "px";
		// sdiv.style.top = sdivY + "px";
		// sdiv.style.height = sdivH + "px";
		rdiv.style.width = (w-(2*_MARGIN)) + "px";		
		rdiv.style.display = "block"; 

		tdiv.style.width = (w-(2*_MARGIN)) + "px";		
		tdiv.style.display = "block"; 
	
		sdiv.style.display = "block"; 

		return;

		var runStatusDiv, runConfigAliasDiv;
		_runStatusDiv = runStatusDiv = document.getElementById("runStatusDiv");
		_runConfigAliasDiv = runConfigAliasDiv = document.getElementById("runConfigAliasDiv");

		var chkH = _CHECKBOX_H;
		var chkW = (w/3)|0; 
		if(chkW < _CHECKBOX_MIN_W) chkW = _CHECKBOX_MIN_W;
		if(chkW > _CHECKBOX_MAX_W) chkW = _CHECKBOX_MAX_W;
		
		var sdivH = 66 + chkH*SubsystemLaunch.subsystems.length; //header + chkboxes
		
		if(SubsystemLaunch.doShowContexts)
		{
			sdivH += 66 + chkH*_contextRecords.length;	//header + chkboxes 	
		}
		if(sdivH > 2/3*h)
			sdivH = 2/3*h; //clip height
		if(sdivH < 100)
			sdivH = 100; //clip min
		
		var sdivW = chkW;
		
		var sdivX = _MARGIN;
		var sdivY = (h-sdivH)/2;
		if(sdivY < _MARGIN)
			sdivY = _MARGIN;

//		var ldivX = _MARGIN + chkW;
//		var ldivSz = h;		
//		if(ldivSz > w - ldivX - _MARGIN*3) //pick min of w/h
//			ldivSz = w - ldivX - _MARGIN*3;
//		if(ldivSz < 120) //clip min
//			ldivSz = 120; 
//		var ldivY = (h-ldivSz)/2;
//		
//		var rdivX = _MARGIN + chkW;
//		var rdivSz = ldivSz;
//		var rdivY = ldivY + ldivSz;
//		var rratio = 180/300;

		var ldivX = _MARGIN + chkW;
		var ldivSz = h/2;		
		if(ldivSz > w - ldivX - _MARGIN*3) //pick min of w/h
			ldivSz = w - ldivX - _MARGIN*3;
		ldivSz *= 0.9;
		var ldivY = (h-ldivSz)/2 - ldivSz/2;
		var lratio = 180/300;

		var rdivX = _MARGIN + chkW;
		var rdivSz = ldivSz;
		var rdivY = ldivY + ldivSz;
		var rratio = 180/300;


		//draw checkboxes
		{			
			var str = "";
			var statusIndex = 0;
			
			var hideableSubsystems = SubsystemLaunch.subsystems.length && SubsystemLaunch.doShowContexts;
			var hideableContexts = SubsystemLaunch.subsystems.length;
			
			if(SubsystemLaunch.subsystems.length)
			{			
				if(hideableSubsystems)
					str += "<a onclick='SubsystemLaunch.launcher.toggleCheckboxDiv(0);' title='Hide/Show Subsystems'>";
				str += "<h3>Subsystems</h3>";
				if(hideableSubsystems)
					str += "</a>";
				
				str += "<div id='ssCheckboxDiv'>";
				for(var i=0;i<SubsystemLaunch.subsystems.length;++i,++statusIndex)
				{
					str += "<div class='ssCheckbox' style='height:" + chkH + "px;" +
							"' >";
					str += "<div class='pretty p-icon p-round p-smooth' onclick='SubsystemLaunch.launcher.handleCheckbox(" + 
							statusIndex + ");' >"; //p-smooth for slow transition
					str += " <input type='checkbox' class='subsystemCheckboxes' " +
							(_systemStatusArray[statusIndex]?"checked":"") +
							"/>";
					str += "<div class='state p-success'>";
					str += "<i class='icon mdi mdi-check'></i>";
					str += "<label>" + SubsystemLaunch.subsystems[i] + "</label>";
					str += "</div>";
					str += "</div>";
					str += "</div>";
					str += "<div id='clearDiv'></div>";
				}
				str += "</div>";
			}
			else if(!SubsystemLaunch.doShowContexts)
			{
				str += "No subsystem configuration definition found.";
			}
			

			if(SubsystemLaunch.doShowContexts)
			{
				if(hideableContexts)
					str += "<a onclick='SubsystemLaunch.launcher.toggleCheckboxDiv(1);' title='Hide/Show Contexts'>";
				str += "<h3>Individual Contexts</h3>";
				if(hideableContexts)
					str += "</a>";
				
				if(!_contextRecords.length)
					str += "No contexts found.";
					

				str += "<div id='ctxCheckboxDiv'>";
				for(var i=0; i<_contextRecords.length; ++i,++statusIndex)
				{
					str += "<div class='ssCheckbox' style='height:" + chkH + "px;" +
							"' >";
					str += "<div class='pretty p-icon p-round p-smooth' onclick='SubsystemLaunch.launcher.handleCheckbox(" + 
							statusIndex + ");' >"; //p-smooth for slow transition
					str += " <input type='checkbox' class='subsystemCheckboxes' " +
							(_systemStatusArray[statusIndex]?"checked":"") +
							"/>";
					str += "<div class='state p-success'>";
					str += "<i class='icon mdi mdi-check'></i>";
					str += "<label>" + _contextRecords[i] + "</label>";
					str += "</div>";
					str += "</div>";
					str += "</div>";
					str += "<div id='clearDiv'></div>";				
				}
				str += "</div>"
			}


			sdiv.style.left = (sdivX-20) + "px";
			sdiv.style.top = sdivY + "px";
			sdiv.style.height = sdivH + "px";
			sdiv.style.width = sdivW + "px";		
			sdiv.style.display = "block"; 
			

			sdiv = document.getElementById("subsystemDivContainer");
			sdiv.style.left = (sdivX-20) + "px";
			sdiv.style.top = sdivY + "px";
			sdiv.style.height = sdivH + "px";
			sdiv.style.width = sdivW + "px";
			sdiv.innerHTML = "";
			sdiv.innerHTML = str;	
			sdiv.style.display = "block"; 
		}		

		//draw launch button
		{			

//			ldiv.style.left = (ldivX + (w - ldivX - _MARGIN*2 - ldivSz)/2) + "px";
//			ldiv.style.top = (ldivY+((ldivSz-ldivSz*200/300)/2)) + "px";
//			
//			ldiv.style.width = ldivSz + "px";
//			var fontSize = ldivSz/10;
//			if(fontSize < 30) fontSize = 30;
//			ldiv.style.fontSize = (fontSize) + "px";
//			ldiv.style.paddingTop = (ldivSz*200/300/2 - (fontSize+6)/2) + "px"; //ratio of size minus font size
//			ldiv.style.paddingBottom = (ldivSz*200/300/2- (fontSize+6)/2) + "px";
//			ldiv.style.borderRadius = (ldivSz*300/100) + "px/" + (ldivSz*200/100) + "px";
//			
//			ldiv.style.display = "block";
			ldiv.style.left = (ldivX + (w - ldivX - _MARGIN*2 - ldivSz)/2) + "px";
			ldiv.style.top = (ldivY+((ldivSz-ldivSz*lratio)/2)) + "px";
			//ldiv.style.height = (ldivSz*200/300) + "px";
			ldiv.style.width = ldivSz + "px";
			ldiv.style.paddingTop = (ldivSz*lratio/2 - 36/2) + "px"; //ratio of size minus font size
			ldiv.style.paddingBottom = (ldivSz*lratio/2- 36/2) + "px";
			//ldiv.style.paddingLeft = (ldivSz/2) + "px";
			//ldiv.style.paddingRight = (ldivSz/2) + "px";

			ldiv.style.borderRadius = ldivSz + "px/" + (ldivSz*200/300) + "px";
			ldiv.style.fontSize = ldivSz/10 + "px";

			ldiv.style.display = "block"; 
		}


		//draw run button
		{			
			var rTop = (rdivY+((rdivSz-rdivSz*rratio)/2));
			rdiv.style.left = (rdivX + (w - rdivX - _MARGIN*2 - rdivSz)/2) + "px";
			rdiv.style.top = rTop + "px";
			//rdiv.style.height = (rdivSz*200/300) + "px";
			rdiv.style.width = rdivSz + "px";
			rdiv.style.paddingTop = (rdivSz*rratio/2 - 36/2) + "px"; //ratio of size minus font size
			rdiv.style.paddingBottom = (rdivSz*rratio/2- 36/2) + "px";
			//rdiv.style.paddingLeft = (rdivSz/2) + "px";
			//rdiv.style.paddingRight = (rdivSz/2) + "px";
			
			rdiv.style.borderRadius = rdivSz + "px/" + (rdivSz*200/300) + "px";
			rdiv.style.fontSize = rdivSz/10 + "px";
			
			rdiv.style.display = "block"; 
			//ldiv.innerHTML = str;		
			
			runStatusDiv.style.left = (rdivX + _MARGIN + (w - rdivX - _MARGIN*2 - rdivSz)/2) + "px";
			runStatusDiv.style.top = (h/2 - 50) + "px";
			runStatusDiv.style.width = (rdivSz + _MARGIN) + "px";
			runStatusDiv.style.fontSize = rdivSz/15 + "px";

			//draw config alias select box
			if(SubsystemLaunch.getConfigAliases)
			{
				runConfigAliasDiv.style.left = (rdivX + _MARGIN + (w - rdivX - _MARGIN*4 - rdivSz)/2) + "px";
				runConfigAliasDiv.style.top = (rTop + _MARGIN/2 + rdivSz*200/300) + "px";
				runConfigAliasDiv.style.width = (rdivSz + _MARGIN) + "px";
				runConfigAliasDiv.style.fontSize = rdivSz/15 + "px";

				var str = "";
				str += "Configuration Alias: <select id='runConfigAliasSelect' style='font-family: \"Comfortaa\", arial; padding: 2px; font-size: 16px;'>";
				
				for(alias in _configAliasesObj.aliasMap)
				{
					str += "<option value='" + alias + "' ";

					//otherwise, as priority, choose last alias (the first init)
					if(_configAliasesObj.lastUsedAlias == alias)
						str += "selected";
					
					str += ">" + alias + "</option>";
				} //end alias map loop
				runConfigAliasDiv.innerHTML = str;
				runConfigAliasDiv.style.display = "block";
			} //end draw config alias select box
		} //end draw run buton

		
	} //end redrawWindow()
	

	//=====================================================================================
	//getCurrentStatus ~~
	function getCurrentStatus() 
	{
		// Debug.log("getCurrentStatus()");
		window.clearTimeout(_getStatusTimer);

		DesktopContent.XMLHttpRequest("Request?RequestType=getRemoteSubsystemStatus" + 
				"&fsmName=" + _fsmName, 
				"", 
				localGetStatusHandler,/*returnHandler*/
				0 /*reqParam*/, 				
				0 /*progressHandler*/,
				0 /*callHandlerOnErr*/,
				true /*doNotShowLoadingOverlay*/, 
				true /*targetGatewaySupervisor*/);
			
		return;

		//===========
		function localGetStatusHandler(req)
		{				

			//subsystems --------------------
			{
				var fields = SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS;
				
				//get all subsystem fields from xml
				var subsystemArrs = {};
				for(var i=0; i<fields.length; ++i)
					subsystemArrs[fields[i]] = req.responseXML.getElementsByTagName("subsystem_" + fields[i]);
				
				// Debug.log("subsystemArr", subsystemArrs);

				var foundSubsystemChange = false;
				if(subsystemArrs[fields[0]].length != SubsystemLaunch.subsystems.length)
					foundSubsystemChange = true;

				//advance ... feedback
				if(_dotDotDot.length == 3)
					_dotDotDot = "";
				else 
					_dotDotDot += ".";

				//migrate xml values to subsystem struct
				for(var j=0; !foundSubsystemChange && j < subsystemArrs[fields[0]].length; ++j) 
				{               
					if( SubsystemLaunch.subsystems[j][fields[SubsystemLaunch.SUBSYSTEM_FIELDS_NAME]] !=
						subsystemArrs[fields[SubsystemLaunch.SUBSYSTEM_FIELDS_NAME]][j].getAttribute('value'))				
					{
						foundSubsystemChange = true; //name mismatch
						break;
					}
					for(var i=0; i<fields.length; ++i)
					{
						if(i == SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS_STATUS)
						{
							var status = subsystemArrs[fields[i]][j].getAttribute('value');
							if(status.indexOf("Launching") == 0)
							{
								//give user ... feedback							
								SubsystemLaunch.subsystems[j][fields[i]] = status + _dotDotDot;
								continue;
							}
							else if(SubsystemLaunch.subsystems[j][fields[i]] != status &&
									(status.indexOf("Fail") == 0 || status.indexOf("Error") == 0 || status.indexOf("Soft") == 0))
								Debug.err(status); //show error to user
							
							SubsystemLaunch.subsystems[j][fields[i]] = status;
							continue;
						}
						
						SubsystemLaunch.subsystems[j][fields[i]] = subsystemArrs[fields[i]][j].getAttribute('value');
					} //end field/value push loop
				} //end subsystem loop

				if(foundSubsystemChange)
				{
					Debug.warn("A change in Subsystem records was identified, reloading Subsystem Launch info!");
					init();
					return;
				}
				// Debug.log("subsystem obj", SubsystemLaunch.subsystems);	
			} //end subsystems ------
			
		
			//system state ------------------------
			{
				SubsystemLaunch.extractSystemStatus(req);
			} //end system state ----------
			
			displayStatus();
			
			
			//on success, get state again
			window.clearTimeout(_getStatusTimer);
			_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec
		}
	} //end getCurrentStatus()


	//=====================================================================================
	//displayStatus ~~
	function displayStatus() 
	{
		// Debug.log("displayStatus");
		var el;

		//Display System Status ---------
		el = document.getElementById("systemStatusState");
		localDisplayState(el, 
			SubsystemLaunch.system.state, 
			SubsystemLaunch.system.progress);

		el = document.getElementById("systemStatusTimeInState");
		//add time-in-state
		{
			//time in state display				
			let tstr = "";
			var hours = (SubsystemLaunch.system.timeInState/60.0/60.0)|0;
			var mins = ((SubsystemLaunch.system.timeInState%(60*60))/60.0)|0;
			var secs = SubsystemLaunch.system.timeInState%60;

			tstr += hours + ":";
			if(mins < 10)	tstr += "0"; //keep to 2 digits
			tstr += mins + ":";
			if(secs < 10)	tstr += "0"; //keep to 2 digits
			tstr += secs;
			el.innerText = "Time in state: " + tstr;
		}

		el = document.getElementById("systemStatusActiveUsers");
		el.innerText = 	"# of Active Users: " + SubsystemLaunch.system.activeUserCount;

		var fieldIds = ["runNumber", "lastRunLogEntry", "lastLogbookEntry", "lastSystemMessage", "consoleWarnCount", 
			"consoleWarnMessage", "consoleErrCount", "consoleErrMessage", "consoleInfoCount", "consoleInfoMessage"];		
		for(var i=0; i<fieldIds.length; ++i)
		{
			el = document.getElementById("systemStatus_" + fieldIds[i]);
			if(!el) continue; //some fields might not exist
			el.innerText = SubsystemLaunch.system[fieldIds[i]];
		}
		

		//Display Subystem Status ---------
		var fieldIds = ["configAlias", "status", "console", "detail", "fsmMode"];		
		for(var s=0; s<SubsystemLaunch.subsystems.length; ++s)
		{
			for(var i=0; i<fieldIds.length; ++i)
			{
				if(fieldIds[i] == "configAlias" || 
					fieldIds[i] == "fsmMode")
				{
					el = document.getElementById("subsystem_" + fieldIds[i] + 
						"_select_" + s);
					if(el.value != SubsystemLaunch.subsystems[s][fieldIds[i]])
					{						
						Debug.warn("The selected " + fieldIds[i] + " for Subsystem '" + 
							SubsystemLaunch.subsystems[s].name + "' has changed from '" +
							el.value + "' to '" + SubsystemLaunch.subsystems[s][fieldIds[i]] + ".'");

						//find selected index amd select!
						for(var f=0; f < el.options.length; ++f)
							if(el.options.value == SubsystemLaunch.subsystems[s][fieldIds[i]])
								el.selectedIndex = f;

						if(f == el.options.length)
						{
							Debug.err("Could not find '" + SubsystemLaunch.subsystems[s][fieldIds[i]] + 
								"' in the " + fieldIds[i] +" list of Subsystem '" + 
								SubsystemLaunch.subsystems[s].name + "!' Please fix the issue and refresh this page, or notify admins.");
							//stop updates, something is wrong!
							window.clearTimeout(_getStatusTimer);
							return;						
						}
					}
				} //end select box update
				else if(fieldIds[i] == "console")
				{
					el = document.getElementById("subsystem_" + s + "_" + fieldIds[i]);
					el.innerText = SubsystemLaunch.subsystems[s].consoleErrCount + " Errs / " +
						SubsystemLaunch.subsystems[s].consoleWarnCount + " Warns";
				}
				else
				{
					el = document.getElementById("subsystem_" + s + "_" + fieldIds[i]);

					if(fieldIds[i] == "detail" && SubsystemLaunch.subsystems[s].lastStatusTime &&
							SubsystemLaunch.subsystems[s].lastStatusTime != "0")
						el.innerText = SubsystemLaunch.subsystems[s][fieldIds[i]] + " ( " +
										SubsystemLaunch.subsystems[s].lastStatusTime + " )";
					else if(fieldIds[i] == "status")
						localDisplayState(el, 
							SubsystemLaunch.subsystems[s].status, 
							SubsystemLaunch.subsystems[s].progress);
					else
						el.innerText = SubsystemLaunch.subsystems[s][fieldIds[i]];

					
				}
				
			} //end field update loop
		} //end subsystem update loop

		//////////////////////////////
		function localDisplayState(cell, statusString, progressNum)
		{
			//copied from otsdaq-utilities/WebGUI/js/SystemStatus.js:551						
	
			try { //some states can provide error detail after ":::" marker (ignore extra detail for now)
				statusString = statusString.split(":::")[0];
			}
			catch (e) { //ignore split error
				; // Debug.log("What happened? " + e);
			}

			//copied from otsdaq-utilities/WebGUI/js/SystemStatus.js:667
			progressNum |= 0; //force int
			if (progressNum > 100)
				progressNum = 99; //attempting to figure out max (or variable steps)
			else if(progressNum == 0)
				progressNum = 100; //dont show progress bar for 0% or 100%

			// progressNum = (Math.random() * 200)|0; //for debugging
			// if (progressNum > 100) progressNum = 100;  //for debugging

			if (progressNum == 100) //show solid state color
			{							
				switch (statusString) 
				{
					case "Initial":
						cell.style.background = "radial-gradient(circle at 50% 120%, rgb(119, 208, 255), rgb(119, 208, 255) 10%, rgb(7, 105, 191) 80%, rgb(6, 39, 69) 100%)";
						break;
					case "Halted":
						cell.style.background = "radial-gradient(circle at 50% 120%, rgb(255, 207, 105), rgb(245, 218, 179) 10%, rgb(234, 131, 3) 80%, rgb(121, 68, 0) 100%)";
						break;
					case "Configured":
					case "Paused":
						cell.style.background = "radial-gradient(circle at 50% 120%, rgb(80, 236, 199), rgb(179, 204, 197) 10%, rgb(5, 148, 122) 80%, rgb(6, 39, 69) 100%)";
						break;
					case "Running":
						cell.style.background = "radial-gradient(circle at 50% 120%, rgb(0, 255, 67), rgb(142, 255, 172) 10%, rgb(5, 148, 42) 80%, rgb(6, 39, 69) 100%)";
						break;
					case "Shutting Down":
					case "Failed":
					case "Error":
					case "Soft-Error":
						cell.style.background = "radial-gradient(circle at 50% 120%, rgb(255, 124, 124), rgb(255, 159, 159) 10%, rgb(218, 0, 0) 80%, rgb(144, 1, 1) 100%)";

						cell.style.cursor = "pointer";
						cell.onclick =
							function () {
								Debug.log("Cell " + this.id);

								if(this.id == "systemStatusState")
								{			
									Debug.err(SubsystemLaunch.system.status);
									return;
								}
								//else subsystem div

								//id example: subsystem_0_status
								var s = this.id.split('_')[1] | 0;								
								Debug.err(SubsystemLaunch.subsystems[s].status);
							};
						break;
					default: cell.style.background = "";
				} // end of switch	
			}
			else  //scale progress bar to width of cell (66px)
			{
				cell.style.background = "";
				statusString += " " + progressNum + " %";
			}
			cell.innerHTML = "<div style='position:relative; z-index:2'>" + statusString + "</div>";
			
			// Debug.log("Status",progressNum, statusString, cell.offsetWidth, cell.offsetHeight);
				
			if(progressNum != 100)
			{
				cell.style.position = "relative"; //to enable absolute for progress bar
				cell.style.overflow = "hidden"; //to enable absolute for progress bar
				var pl = document.createElement("div");
				pl.setAttribute("class","progressBar");
				pl.style.width = (cell.offsetWidth * progressNum / 100) + "px";
				pl.style.height = (cell.offsetHeight) + "px";
				pl.style.top = "0px";
				pl.style.left = "0px";
				pl.style.zIndex = 1; //below text
				cell.appendChild(pl);									
			}
		} //end localDisplayState()
	}	//end displayStatus()
	

	//=====================================================================================     
	this.handleSubsystemActionSelect = function(el, subsystemIndex)
	{
		var command = el.value;
		Debug.log("handleSubsystemActionSelect()", command, subsystemIndex);
		if(command == "") return; //assume user is clearing
				
		if(subsystemIndex >= SubsystemLaunch.subsystems.length)
		{
			Debug.err("Illegal subsystem index:",subsystemIndex,"ouf of",
				SubsystemLaunch.subsystems.length);
			el.selectedIndex = 0; //reset command select box
			return;
		}

		var parameter;
		if(command == "Configure") //at config alias
		{
			parameter = document.getElementById("subsystem_" + "configAlias" + 
				"_select_" + subsystemIndex).value;
		}
		
		//at this point, ready to send command!
	
		window.clearTimeout(_getStatusTimer);

		SubsystemLaunch.system.error = ""; //clear error for next command response
		//force state display for user feedback
		SubsystemLaunch.subsystems[subsystemIndex].status = "Launching " + command;
		SubsystemLaunch.subsystems[subsystemIndex].progress = 0;
		displayStatus();

		DesktopContent.XMLHttpRequest("Request?RequestType=commandRemoteSubsystem" +
			"&fsmName=" + SubsystemLaunch.launcher.getFsmName() +
			"&command=" + command +
			(parameter?("&parameter=" + parameter):"") +
			"&targetSubsystem=" + SubsystemLaunch.subsystems[subsystemIndex].name
			, "", //post data 
			function(req,param,err) //request handler
			{
				Debug.log("getRemoteSubsystems handler()", command);

				var errs = DesktopContent.getXMLRequestErrors(req);
				if(!err) err = "";
				for(var e=0; e < errs.length; ++e)
					err += (err.length?"\n\n":"") + errs[e]; 

				if(err != "")			
					Debug.err("Error received launching '" + command + "' action: " + err);

				//resume statusing and clear action
				window.clearTimeout(_getStatusTimer);
				_getStatusTimer = window.setTimeout(
					function()
					{
						el.selectedIndex = 0; //reset command select box
						getCurrentStatus();
					},1000); //in 1 sec

			}, //end request handler
			0 /*reqParam*/, 0 /*progressHandler*/, true /*callHandlerOnErr*/, 
			true /*doNoShowLoadingOverlay*/,
			true /*targetGatewaySupervisor*/);

	} //end handleSubsystemActionSelect()

	//=====================================================================================
	//launch ~~
	this.launch = function()
	{
		Debug.log("launch");
		return;
		DesktopContent.popUpVerification( 
				"Are you sure you want to relaunch otsdaq?",
				localLaunch,
				0,"#efeaea",0,"#770000");

		//============
		function localLaunch()
		{
			Debug.log("localLaunch");

			var checkboxes = document.getElementsByClassName('subsystemCheckboxes'); 
			console.log("checkboxes",checkboxes);
			var checkedArray = [];
			for(var i=0;i<checkboxes.length;++i)
				checkedArray.push(checkboxes[i].checked);
			console.log("checkedArray",checkedArray);

			var recordsArray = [];
			var valuesArray = [];
			
			//assemble records array
			
			if(SubsystemLaunch.doShowContexts)
			{
				//just use context checkbox settings
				for(var i=0; i<_contextRecords.length; ++i)
				{					
					recordsArray.push(_contextRecords[i]);
					valuesArray.push(checkedArray[SubsystemLaunch.subsystems.length+i]?
							"1":"0");
				}
			}
			else
			{
				//extract context settings from system to context map
				for(var i=0; i<SubsystemLaunch.subsystems.length; ++i)
				{ 
					for(var j=0; j<SubsystemLaunch.systemToContextMap[SubsystemLaunch.subsystems[i]].length; ++j)
					{
						recordsArray.push(SubsystemLaunch.systemToContextMap[SubsystemLaunch.subsystems[i]][j]);
						valuesArray.push(checkedArray[i]?"1":"0");
	
					}
				}
			}
			console.log("recordsArray",recordsArray);
			console.log("valuesArray",valuesArray);

			var recordIndex = 0;
			var localModifiedTables = undefined;
			//sequentially send request for each record until done
			localSetSequenceOfRecords();

			//===========================
			function localSetSequenceOfRecords()
			{
				ConfigurationAPI.setFieldValuesForRecords(
						_subsetBasePath,
						recordsArray[recordIndex],
						"Status", //fieldArr
						valuesArray[recordIndex], //valueArr
						function(modifiedTables)
						{
					Debug.log("recordIndex = " + recordIndex);
					
					if(modifiedTables.length == 0)
					{
						Debug.log("Something went very wrong. Notify administrators.",
								Debug.HIGH_PRIORITY);
						return;					
					}
					
					++recordIndex;
					if(recordIndex == recordsArray.length)
					{
						Debug.log("Done with sequence.");

						//proceed to save (quietly) tables, groups, aliases
						ConfigurationAPI.saveModifiedTables(modifiedTables,
								/////////////////////
								function(savedTables, savedGroups, savedAliases)
								{
							if(!savedTables.length)
							{
								Debug.log("Something went very wrong. Notify administrators.",
										Debug.HIGH_PRIORITY);
								return;					
							}

							Debug.log("Successfully applied subsystem selections!", Debug.INFO_PRIORITY);


							//relaunch
							Debug.log("Relaunching ots...");
							SubsystemLaunch.launcher.gatewayLaunchOts();


								}); //end saveModifiedTables handler
						return;
					}

					console.log("setFieldValuesForRecords modifiedTables",modifiedTables);
					localModifiedTables = modifiedTables;
					localSetSequenceOfRecords();

						} //end setFieldValuesForRecords handler
				,localModifiedTables);
			} //end localSetSequenceOfRecords()
		}
	} // end launch()



	//=====================================================================================
	//handleDurationSelect ~~
	this.handleDurationSelect = function(val)
	{
		Debug.log("handleDurationSelect",val);
		if(val == "Open-ended") //then no input box
		{
			document.getElementById("runCountInput").style.display = "none";
			document.getElementById("runDurationInput").style.display = "none";
		}
		else
		{
			document.getElementById("runCountInput").style.display = "block";
			document.getElementById("runDurationInput").style.display = "block";
		}
	} //end handleDurationSelect()

	//=====================================================================================
	//start ~~
	this.start = function()
	{
		Debug.log("start");
		return;

		var timeoutCount = 0; //used to detect taking too long
		var operativeWord = "starting";
		var lastState = "";

		if(_running)
		{
			DesktopContent.popUpVerification( 
					"Are you sure you want to stop the run?",
					localStop,
					0,"#efeaea",0,"#770000");

			//===========
			function localStop()
			{
				Debug.log("localStop");
				//just change operative word and run (to stop)
				operativeWord = "stopping";
				localRun();
			}
			return;
		}

		DesktopContent.popUpVerification( 
				"Are you sure you want to start a run?",
				localRun,
				0,"#efeaea",0,"#770000");

		//===========
		function localRun()
		{
			Debug.log("localRun");

			window.clearTimeout(_runFSMTimer);

			++timeoutCount;			
			if(timeoutCount > 60) //if it has been one minute, too long
			{
				Debug.log("Timeout reached! Giving up on " + operativeWord + " the run. Check the App Status web app for more details.", Debug.HIGH_PRIORITY);
				return;
			}

			if(_inTransition) //wait
			{
				window.clearTimeout(_getStatusTimer);
				_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec

				window.clearTimeout(_runFSMTimer);
				_runFSMTimer = window.setTimeout(localRun,1000); //wait a sec
				return;
			}

			if(lastState == _state)
			{
				Debug.log("State machine is not progressing! Stuck in '" + 
						_state + ".' Giving up on " + operativeWord + " the run. Check the App Status web app for more details.", Debug.HIGH_PRIORITY);
				return;
			}

			lastState = _state; 

			let transitionPostData = "";
			//keep transitioning to Run state
			if(_state == "Initial")
			{
				_transitionName = "Initialize";
			}
			else if(_state == "Failed")
			{
				if(timeoutCount > 1)
				{
					//if localRun activity caused failure, give up
					Debug.log("Fault encountered! Giving up on " + operativeWord + " the run. Check the App Status web app for more details.", Debug.HIGH_PRIORITY);
					return;
				}
				_transitionName = "Halt";
			}
			else if(_state == "Halted")
			{
				_transitionName = "Configure";

				if(SubsystemLaunch.getConfigAliases)
				{
					var el = document.getElementById("runConfigAliasSelect");
					if(el)
						SubsystemLaunch.configurationAlias = el.value;
				}

				Debug.log(_transitionName,"SubsystemLaunch.getConfigAliases",SubsystemLaunch.getConfigAliases);
				Debug.log(_transitionName,"SubsystemLaunch.configurationAlias",SubsystemLaunch.configurationAlias);

				//Note: User level could get system alias from somewhere (e.g. dropdown box, first alias in list, or icon parameter)
				transitionPostData = "ConfigurationAlias=" + SubsystemLaunch.configurationAlias;					
			}			
			else if(_state == "Configured")
			{
				if(operativeWord == "stopping")
				{
					//done!
					Debug.log("<i>otsdaq</i> has now Stopped! " + 
							_runNumber + ".", Debug.INFO_PRIORITY);
					return;				
				}

				_transitionName = "Start";
			}
			else if(_state == "Paused")
			{
				_transitionName = "Start";	
			}
			else if(_state == "Running")
			{
				if(operativeWord == "stopping")
				{
					_transitionName = "Stop";					
				}
				else //starting
				{				
					//done!
					Debug.log("<i>otsdaq</i> is now Running! " + 
							_runNumber + ".", Debug.INFO_PRIORITY);
					return;
				}
			}
			else
			{
				Debug.log("Unknown action for current state '" + _state + "'..." + 
						"Giving up on " + operativeWord + " the run. Check the App Status web app for more details.", Debug.HIGH_PRIORITY);
				return;
			}

			_inTransition = true;
			_progress = 0;

			displayStatus();

			Debug.log("_transitionName = " + _transitionName + 
					" transitionPostData = " + transitionPostData);		

			DesktopContent.XMLHttpRequest("StateMachineXgiHandler?StateMachine=" + 
					_transitionName + 
					"&fsmName=" + _fsmName + 
					"&fsmWindowName=" + _fsmWindowName, 
					transitionPostData, 
					//===========
					function(req)
					{

				var success = DesktopContent.getXMLValue(req,"state_tranisition_attempted") == "1";
				if(!success) 
				{
					var err = DesktopContent.getXMLValue(req,"state_tranisition_attempted_err");
					if(err)
						Debug.log(err,Debug.HIGH_PRIORITY);
					Debug.log("Server indicated failure to attempt state transition. " + 
							"Giving up on " + operativeWord + " the run. Check the App Status web app for more details.",Debug.HIGH_PRIORITY);
					return;
				}

				//on success continue..
				window.clearTimeout(_runFSMTimer);
				_runFSMTimer = window.setTimeout(localRun,3000); //wait 3 seconds before doing anything
					},	 // end handler				
					0, //handler param				
					0,0,true, //progressHandler, callHandlerOnErr, doNotShowLoadingOverlay
					true /*targetGatewaySupervisor*/);

		}

	} //end run()

	//=====================================================================================
	//toggleCheckboxDiv(i) ~~
	this.toggleCheckboxDiv = function(i)
	{
		Debug.log("toggleCheckboxDiv(i) " + i);
		return;
		
		var el;
		if(i == 0) //toggle subsystems
		{
			el = document.getElementById("ssCheckboxDiv");
			el.style.display = (el.style.display == "none")?"block":"none";
		}
		else if(i == 1) //toggle contextx
		{
			el = document.getElementById("ctxCheckboxDiv");
			el.style.display = (el.style.display == "none")?"block":"none";
		}	
		else throw("Invalid index checkbox div " + i);
	} //end toggleCheckboxDiv()
	
	//=====================================================================================
	//handleCheckbox(i) ~~
	this.handleCheckbox = function(c)
	{
		Debug.log("handleCheckbox(c) " + c);
		return;

		var checkboxes = document.getElementsByClassName('subsystemCheckboxes'); 
		console.log("checkboxes",checkboxes);
		var checkedArray = [];
		for(var i=0;i<checkboxes.length;++i)
			checkedArray.push(checkboxes[i].checked);
		console.log("checkedArray",checkedArray);

		Debug.log("set to " + checkedArray[c]);
		
		//create a context map
		var contextEnabledMap = {}; //map to [enabled, index]
		for(var i=0; i<_contextRecords.length; ++i)
			contextEnabledMap[_contextRecords[i]] = [checkedArray[SubsystemLaunch.subsystems.length+i],
													 SubsystemLaunch.subsystems.length+i];
				
		//update for each context that was just affected
		if(c < SubsystemLaunch.subsystems.length)
		{
			//dealing with a subsystem
			for(var j=0; j<SubsystemLaunch.systemToContextMap[SubsystemLaunch.subsystems[c]].length; ++j)
			{
				//update map
				contextEnabledMap[ //context name
								  SubsystemLaunch.systemToContextMap[SubsystemLaunch.subsystems[c]][j]
																 ][0] = checkedArray[c]; //set to checked value
				//and set checkbox
				checkboxes[contextEnabledMap[ //context name
											  SubsystemLaunch.systemToContextMap[SubsystemLaunch.subsystems[c]][j]
																			 ][1]].checked = checkedArray[c];
			}
		}
		else
		{
			//dealing with a context
			
			//update map			
			contextEnabledMap[_contextRecords[c - SubsystemLaunch.subsystems.length]][0] = checkedArray[c]; //set to checked value			
														  
		}
		console.log("contextEnabledMap",contextEnabledMap);
		
		
		//update all subsystems based on this change
		for(var i=0;i<SubsystemLaunch.subsystems.length;++i)
		{
			if(i==c) continue; //skip box that was changed

			var enabled = true;
			//if any member contexts are disabled then disable subsystem
			for(var j=0; j<SubsystemLaunch.systemToContextMap[SubsystemLaunch.subsystems[i]].length; ++j)
			{
				if(!contextEnabledMap[
									 SubsystemLaunch.systemToContextMap[SubsystemLaunch.subsystems[i]][j]][0])
				{
					enabled = false;
					break;
				}
			}
			
			//set checkbox
			checkboxes[i].checked = enabled;			
		}
		
		
	} //end handleCheckbox()

	//=====================================================================================
	//getFsmName() ~~
	this.getFsmName = function() { Debug.logv({_fsmName}); return _fsmName; }

	
	//////////////////////////////////////////////////
	//////////////////////////////////////////////////
	// end 'member' function declaration

	SubsystemLaunch.launcher = this; 
	Debug.log("SubsystemLaunch.launcher constructed");

	init();
	Debug.log("SubsystemLaunch.launcher initialized");
} //end create() SubsystemLaunch instance

//=====================================================================================     
SubsystemLaunch.initSubsystemRecords = function(returnHandler)
{
	Debug.log("SubsystemLaunch.initSubsystemRecords()");

	SubsystemLaunch.subsystems = []; //clear
	DesktopContent.XMLHttpRequest("Request?RequestType=getRemoteSubsystems" +
		"&fsmName=" + SubsystemLaunch.launcher.getFsmName()
		, "", //post data 
		function(req) //request handler
		{
			Debug.log("getRemoteSubsystems handler()");
		
			//subsystems --------------------
			{
				var fields = SubsystemLaunch.SUBSYSTEM_FIELDS;
				
				//get all subsystem fields from xml
				var subsystemArrs = {};
				for(var i=0; i<fields.length; ++i)
					subsystemArrs[fields[i]] = req.responseXML.getElementsByTagName("subsystem_" + fields[i]);
				
				Debug.log("subsystemArr", subsystemArrs);

				//migrate xml values to subsystem struct
				for(var j=0; j < subsystemArrs[fields[0]].length; ++j) 
				{                            
					SubsystemLaunch.subsystems.push({}); //create empty structure for each subsystem
					for(var i=0; i<fields.length; ++i)
					{
						SubsystemLaunch.subsystems[j][fields[i]] = subsystemArrs[fields[i]][j].getAttribute('value');
					} //end field/value push loop
				} //end subsystem loop

				Debug.log("subsystem obj", SubsystemLaunch.subsystems);	
			} //end subsystems ------

			//system aliases --------------------
			{
				//get all system aliases and put in drop-down
				var aliasArr = req.responseXML.getElementsByTagName("config_alias"); 
				var aliasGroupArr = req.responseXML.getElementsByTagName("config_key");
				var aliasGroupCommentArr = req.responseXML.getElementsByTagName("config_comment");
				var aliasCommentArr = req.responseXML.getElementsByTagName("config_alias_comment");                    
				var aliasAuthorArr = req.responseXML.getElementsByTagName("config_author");
				var aliasCreateTimeArr = req.responseXML.getElementsByTagName("config_create_time");
				
				SubsystemLaunch.system.selectedSystemAlias = 
						DesktopContent.getXMLValue(req,"UserLastConfigAlias");
						
				//take last configured alias, if user has not selected anything yet
				if(!SubsystemLaunch.system.selectedSystemAlias) 
					SubsystemLaunch.system.selectedSystemAlias = "";
				
				SubsystemLaunch.system.systemAliases = [];
				var alias, aliasTraslation;
				for(var i=0;i<aliasArr.length;++i) 
				{                            
					alias = aliasArr[i].getAttribute('value');

					//require meta information for a 'good' alias
					if(!aliasCommentArr[i] || !aliasCreateTimeArr[i]) 
					{
						Debug.err("Configuration alias '" + alias + "' has an illegal group translation or is missing meta data information. Please delete the alias or fix the translation in your active Backbone group.");
						continue;
					}			
					SubsystemLaunch.system.systemAliases.push({
							name: alias,
							translation: aliasGroupArr[i].getAttribute('value'),
							comment: aliasGroupCommentArr[i].getAttribute('value')
						});
					
					
				} //end primary alias structure creation loop
				Debug.log("SubsystemLaunch.system.systemAliases",SubsystemLaunch.system.systemAliases);
					
			} //end system aliases -----

			//system state ------------------------
			{

				SubsystemLaunch.system.lastRunLogEntry = DesktopContent.getXMLValue(req,"last_run_log_entry");
				if(SubsystemLaunch.system.lastRunLogEntry == "")
					SubsystemLaunch.system.lastRunLogEntry = "No user entry found, please enter one when starting the the next run.";

				SubsystemLaunch.extractSystemStatus(req);	
			} //end system state ----------
			
			if(returnHandler)
				returnHandler();

		}, //end request handler
		0 /*reqParam*/, 0 /*progressHandler*/, false /*callHandlerOnErr*/, 
		false /*doNoShowLoadingOverlay*/,
		true /*targetGatewaySupervisor*/);


} //end SubsystemLaunch.initSubsystemRecords()

SubsystemLaunch.extractSystemStatus = function(req)
{
	SubsystemLaunch.system.state = DesktopContent.getXMLValue(req,"current_state");
	SubsystemLaunch.system.inTransition = DesktopContent.getXMLValue(req,"in_transition") == "1";
	SubsystemLaunch.system.timeInState = DesktopContent.getXMLValue(req,"time_in_state") | 0;
	SubsystemLaunch.system.runNumber = DesktopContent.getXMLValue(req,"run_number");			
	SubsystemLaunch.system.progress = DesktopContent.getXMLValue(req,"transition_progress") | 0; 

	var err = DesktopContent.getXMLValue(req,"system_error"); 
	if(err && err != "" && SubsystemLaunch.system.error != err)		
		Debug.err(err);

	SubsystemLaunch.system.error = err;		
	
	SubsystemLaunch.system.activeUserCount = DesktopContent.getXMLValue(req,"active_user_count") | 0;
				
	SubsystemLaunch.system.lastLogbookEntry = DesktopContent.getXMLValue(req,"last_logbook_entry");
	if(SubsystemLaunch.system.lastLogbookEntry == "")
		SubsystemLaunch.system.lastLogbookEntry = "No logbook entry found.";
	else
		SubsystemLaunch.system.lastLogbookEntry += " (" + DesktopContent.getXMLValue(req,"last_logbook_entry_time") + ")";  				
		
	SubsystemLaunch.system.lastSystemMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"last_system_message"));
	if(SubsystemLaunch.system.lastSystemMessage == "")
		SubsystemLaunch.system.lastSystemMessage = "No System Message found.";
	else
		SubsystemLaunch.system.lastSystemMessage += " (" + DesktopContent.getXMLValue(req,"last_system_message_time") + ")";
	
	SubsystemLaunch.system.consoleErrCount = "Console Err #: " + (DesktopContent.getXMLValue(req,"console_err_count") | 0); 
	SubsystemLaunch.system.consoleWarnCount = "Console Warn #: " + (DesktopContent.getXMLValue(req,"console_warn_count") | 0); 
	SubsystemLaunch.system.consoleInfoCount = "Console Info #: " + (DesktopContent.getXMLValue(req,"console_info_count") | 0); 

	SubsystemLaunch.system.consoleErrMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"last_console_err_msg"));
	if(SubsystemLaunch.system.consoleErrMessage == "")
		SubsystemLaunch.system.consoleErrMessage = "No console err message found.";
	else
		SubsystemLaunch.system.consoleErrMessage += " " + DesktopContent.getXMLValue(req,"last_console_err_msg_time") + "";  	

	SubsystemLaunch.system.consoleWarnMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"last_console_warn_msg"));
	if(SubsystemLaunch.system.consoleWarnMessage == "")
		SubsystemLaunch.system.consoleWarnMessage = "No console err message found.";
	else
		SubsystemLaunch.system.consoleWarnMessage += " " + DesktopContent.getXMLValue(req,"last_console_warn_msg_time") + "";  	

	SubsystemLaunch.system.consoleInfoMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"last_console_info_msg"));
	if(SubsystemLaunch.system.consoleInfoMessage == "")
		SubsystemLaunch.system.consoleInfoMessage = "No console err message found.";
	else
		SubsystemLaunch.system.consoleInfoMessage += " " + DesktopContent.getXMLValue(req,"last_console_info_msg_time") + "";  	
	
	// Debug.log("system obj", SubsystemLaunch.system);

} //end SubsystemLaunch.extractSystemStatus()




