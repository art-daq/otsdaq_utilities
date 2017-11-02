// Created by swu at fnal dot gov
//  February 2016
//

	//Function List:
		//init
		//initLite
	    //redrawWindow
		//FElistHandler
		//getPermissionHandler
		//listSelectionHandler
		//callWrite
		//callRead
		//writeHandler
		//readHandler
		//isArrayAllZero
		//convertToHex
		//convertFromHex
		//reverseLSB
		//LSBchecker
		//toggleDisplay
		//toggleMacroPublicity
		//addCommand
		//hideDeletex
		//showDeletex
		//getOrder
		//removeCommand
		//undoDelete
		//showPopupClearAllConfirm
		//showPopupClearHistoryConfirm
		//clearAll
		//clearHistory
		//clearHistoryHandler
		//hideSmallPopup
		//saveMacro
		//hidePopupSaveMacro
		//hidePopupEditMacro
		//saveAsMacro
		//createMacroHandler
		//runMacro
		//loadExistingMacros
		//loadUserHistory
		//loadingMacrosHandler
		//loadingHistHandler
		//histCmdWriteDivOnclick
		//histCmdReadDivOnclick
		//histCmdDelayDivOnclick
		//macroActionOnRightClick
		//exportMacroHandler
		//editCommands
		//deleteMacroHandler
		//saveChangedMacro
		//saveChangedMacroHandler
		//reloadMacroSequence
		//setFieldToVariable
		//dealWithVariables

	var ADMIN_PERMISSION_THRESHOLD = 255;
    var userPermission = 10;
	var CMDHISTDIVINDEX = 0;
	var SEQINDEX = 0;
	var MACROINDEX = 0;
	var FEELEMENTS = [];
	var macroString = [];
	var sortable;
	var stringOfAllMacros = [];
	var tempString = [];
	var readoutDictionary = [];
	var namesOfAllMacros = [];
	
	var theAddressStrForRead = ""; // for callread and its handler
	var isOnMacroMakerPage = false;
	var isOnPrivateMacros = false;
	var timeIntervalID;
	var isMacroRunning = false;
	var waitForCurrentCommandToComeBack = false;
	var putReadResultInBoxFlag = false;
	var runningMacroLSBF = 0; //0 = Don't care; 1 = no LSBF; 2 = yes LSBF
	var SEQFORMAT = "hex";
	
	var arrayOfCommandsForEdit = [];
	var oldMacroNameForEdit = "";
	var newMacroNameForEdit = "";
	var macroDateForEdit = "";
	var macroNotesForEdit = "";
	
	var lastDeletedMacro = "";
	var boxOfFreshVar = "";
	var barWidth = 0;
	var barIncrement = 0;
	

	function init() 
	{			
		Debug.log("init() was called");
		DesktopContent.XMLHttpRequest("MacroMakerRequest?RequestType=FElist","",FElistHandler);
		DesktopContent.XMLHttpRequest("MacroMakerRequest?RequestType=getPermission","",getPermissionHandler);
		block1El = document.getElementById('fecList');
		block2El = document.getElementById('macroLib');
		block3El = document.getElementById('main');
		block4El = document.getElementById('progressBarOuter');
		block5El = document.getElementById('history');
		block6El = document.getElementById('sequence');
		block7El = document.getElementById('maker');
		block8El = document.getElementById('popupEditMacro');
		historybox = document.getElementById('historyContent');
		sequencebox = document.getElementById('sequenceContent');
		privateMacroBox = document.getElementById('listOfPrivateMacros');
		publicMacroBox = document.getElementById('listOfPublicMacros');
		window.onresize = redrawWindow;
		redrawWindow(); //redraw window for the first time
		loadExistingMacros();
		loadUserHistory();
		toggleDisplay(0);
		toggleMacroPublicity(0);
	}
	
	//This is what refresh button and redrawWindow() calls
	function initLite() 
	{
		DesktopContent.XMLHttpRequest("MacroMakerRequest?RequestType=FElist","",
				FElistHandler);
		loadUserHistory();
	}
	
	//Handling window resizing
	function redrawWindow() 
	{
		Debug.log("Window redraw to " + window.innerWidth + " - " + window.innerHeight);
						
		var w = window.innerWidth;
		var h = window.innerHeight;
		if(w < 550){
			w = 550;
		}
		
		//square [x,y] [w,h]
		var _MARGIN = 5;
		
		var b1 = [_MARGIN, _MARGIN+4*_MARGIN, w/3, h/2-_MARGIN]; //left top
		var b2 = [_MARGIN, h/2+2*_MARGIN, w/3-_MARGIN, h/2-_MARGIN]; //left bottom
		var b3 = [w/3, _MARGIN+4*_MARGIN, w/3, h/2-_MARGIN]; //top middle 
		var b4 = [w/3, h/2+2*_MARGIN, w/3, h/2-_MARGIN]; //bottom middle 
		var b5 = [w*2/3,_MARGIN+4*_MARGIN,w/3-_MARGIN, h-2*_MARGIN]; //right 
		var b6 = [_MARGIN, _MARGIN+4*_MARGIN,w/3-2*_MARGIN, h-2*_MARGIN]; //left
		var b7 = [w/3, _MARGIN+4*_MARGIN, w/3, h/2-_MARGIN];//middle
		var b8 = [w/2-200,h/5,2*w/3,3*h/5+15];//popup
		
		block1El.style.left = b1[0] + "px";
		block1El.style.top =  b1[1] + "px";
		block1El.style.width =  b1[2] + "px";
		block1El.style.height =  b1[3] + "px";
		
		block2El.style.left = b2[0] + "px";
		block2El.style.top =  b2[1] + "px";
		block2El.style.width =  b2[2] + "px";
		block2El.style.height =  b2[3] + "px";
		
		block3El.style.left = b3[0] + "px";
		block3El.style.top =  b3[1] + "px";
		block3El.style.width =  b3[2] + "px";
		block3El.style.height =  b3[3] + "px";
		
		block4El.style.left = b4[0] + "px";
		block4El.style.top =  b4[1] + "px";
		block4El.style.width =  b4[2] + "px";
		block4El.style.height =  b4[3] + "px";
		
		block5El.style.left = b5[0] + "px";
		block5El.style.top =  b5[1] + "px";
		block5El.style.width =  b5[2] + "px";
		block5El.style.height =  b5[3] + "px";
		
		block6El.style.left = b6[0] + "px";
		block6El.style.top =  b6[1] + "px";
		block6El.style.width =  b6[2] + "px";
		block6El.style.height =  b6[3] + "px";
		
		block7El.style.left = b7[0] + "px";
		block7El.style.top =  b7[1] + "px";
		block7El.style.width =  b7[2] + "px";
		block7El.style.height =  b7[3] + "px";
		
		block8El.style.left = b8[0] + "px";
		block8El.style.top =  b8[1] + "px";
		block8El.style.height =  b8[3] + "px";
		
		historybox.style.height =  h*0.88 + "px";
		sequencebox.style.height =  h*0.88 + "px";
		privateMacroBox.style.height =  h*0.38 + "px";
		publicMacroBox.style.height =  h*0.38 + "px";
		
		initLite();
	}
			 
	function FElistHandler(req) 
	{
		Debug.log("FElistHandler() was called. ");//Req: " + req.responseText);
	    FEELEMENTS = req.responseXML.getElementsByTagName("FE");
	    var listoffecs = document.getElementById('list');  
	    if(FEELEMENTS.length === 0)
	    	listoffecs.innerHTML = "<p class='red'>" +
				"<br>No Front-End interfaces were found. <br><br>Once FE interfaces are " +
				"added, " +
				"click " +
				"<a href='#' onclick='initLite(); return false;' >refresh</a>" +
				" in the upper right of Macro Maker.</p>";
	    else
	    {
			var w = window.innerWidth;
			//Make search box for the list
			var noMultiSelect = false; 									
					
			var keys = [];
			var vals = [];
			var types = [];
			var fullnames = [];
			//Only displays the first 11 letters, mouse over display full name
			for(var i=0;i<FEELEMENTS.length;++i)
			{
				keys[i] = "one";
				fullnames[i] = FEELEMENTS[i].getAttribute("value");
				var sp = fullnames[i].split(":");
				if (sp[0].length < 11) 
					vals[i] = fullnames[i];
				else
				{
					var display;
					if (w < 680)
						display = sp[0].substr(0,4)+"...:"+sp[1]+":"+sp[2];
					else if (w < 810)
						display = sp[0].substr(0,8)+"...:"+sp[1]+":"+sp[2];
					else if (w < 1016)
						display = sp[0].substr(0,12)+"...:"+sp[1]+":"+sp[2];
					else
						display = sp[0]+":"+sp[1]+":"+sp[2];
					vals[i] = "<abbr title='" + fullnames[i] + "'>"+display+"</abbr>";
				}
				types[i] = "number";
				Debug.log(vals[i]);
			}
			listoffecs.innerHTML = "";
			MultiSelectBox.createSelectBox(listoffecs,
					"box1",
					"Please select from below:",
					vals,keys,types,"listSelectionHandler",noMultiSelect);            
			//End of making box
	    }
	    
	    MultiSelectBox.initMySelectBoxes();
	}

	function getPermissionHandler(req)
	{
		Debug.log("getPermissionHandler() was called. ");//Req: " + req.responseText);
		userPermission = DesktopContent.getXMLValue(req, "Permission");
		console.log("User Permission: " + userPermission);
	}
	
	function listSelectionHandler(listoffecs)
	{
	 	 var splits = listoffecs.id.split('_');
		 elementIndex = splits[splits.length-1] | 0;
		 MultiSelectBox.dbg("Chosen element index:",elementIndex);
	}
    
    function callWrite(address,data)
    {
    	var reminderEl = document.getElementById('reminder');
    	if(isArrayAllZero(selected))
			Debug.log("Please select at least one interface from the list",Debug.HIGH_PRIORITY);
		else 
		{ 
			var addressFormatStr = document.getElementById("addressFormat").value;
			var dataFormatStr = document.getElementById("dataFormat").value;
	    	if(isMacroRunning == true)
	    	{
	    		addressFormatStr = "hex";
	    		dataFormatStr = "hex";
	    	}
	    	
			if (typeof address === 'undefined') 
			{ 
				var addressStr = document.getElementById('addressInput').value.toString();
				var dataStr = document.getElementById('dataInput').value.toString();
				if(addressStr == "") 
				{
					reminderEl.innerHTML = "Please enter an address to write to";
					return;
				}
				else if(dataStr == "") 
				{
					reminderEl.innerHTML = "Please enter your data";
					return;
				}
			}
			else
			{
				var addressStr = address.toString();
				var dataStr = data.toString();
			}
			
			if (addressStr.substr(0,2)=="0x") addressStr = addressStr.substr(2);
			if (dataStr.substr(0,2)=="0x") dataStr = dataStr.substr(2);

			var selectionStrArray = [];
			var supervisorIndexArray = [];
			var interfaceIndexArray = [];
			for (var i = 0; i < selected.length; i++) 
			{
				if (selected[i]!==0) 
			    {
					var oneInterface = FEELEMENTS[i].getAttribute("value")
					selectionStrArray.push(oneInterface);
					supervisorIndexArray.push(oneInterface.split(":")[1]);
					interfaceIndexArray.push(oneInterface.split(":")[2]);
			    }
			}
			var contentEl = document.getElementById('historyContent');
			var innerClass = "class=\"innerClass1\"";
			if (CMDHISTDIVINDEX%2) innerClass = "class=\"innerClass2\"";
			
			var reverse = document.getElementById("lsbFirst").checked;
			if(runningMacroLSBF == 1) reverse = true; 
			if(runningMacroLSBF == 2) reverse = false; 
			
			var update = "<div " + innerClass + " id = \"" + CMDHISTDIVINDEX + "\"  title=\"" + "Entered: " 
					+ Date().toString() + "\nSelected interface: " + selectionStrArray 
					+ "\" onclick=\"histCmdWriteDivOnclick(" + "'" + addressStr + "','" + dataStr + "','" 
					+ addressFormatStr + "','" + dataFormatStr + "')\">Write [" + dataFormatStr + "]<b>"
					+ dataStr + LSBchecker(reverse) + "</b> into register [" + addressFormatStr + "]<b> " 
					+ addressStr + LSBchecker(reverse) + "</b></div>";
			
	    	
			var convertedAddress = reverseLSB(convertToHex(addressFormatStr,addressStr),reverse);
			var convertedData = reverseLSB(convertToHex(dataFormatStr,dataStr),reverse);
					
			DesktopContent.XMLHttpRequest("MacroMakerRequest?RequestType=writeData&Address="
					+convertedAddress+"&Data="+convertedData+"&supervisorIndex="+supervisorIndexArray
					+"&interfaceIndex="+interfaceIndexArray+"&time="+Date().toString()
					+"&interfaces="+selectionStrArray+"&addressFormatStr="+addressFormatStr
					+"&dataFormatStr="+dataFormatStr,"",writeHandler);
			contentEl.innerHTML += update;
			CMDHISTDIVINDEX++;
			contentEl.scrollTop = contentEl.scrollHeight;
			reminderEl.innerHTML = "Data successfully written!";
		}
    }
  
    function callRead(address)
    {
		var reminderEl = document.getElementById('reminder');
		if(isArrayAllZero(selected))
			Debug.log("Please select at least one interface from the list",Debug.HIGH_PRIORITY);
		else 
		{ 
			var addressFormatStr = document.getElementById("addressFormat").value;
			var dataFormatStr = document.getElementById("dataFormat").value;
		
			if (typeof address === 'undefined') 
			{
				theAddressStrForRead = document.getElementById('addressInput').value.toString();
				if(theAddressStrForRead === "") 
				{
					reminderEl.innerHTML = "Please enter an address to read from";
					return;
				}
			}
			else
				theAddressStrForRead = address.toString();
			
			if (theAddressStrForRead.substr(0,2)=="0x") theAddressStrForRead = theAddressStrForRead.substr(2);
			
			var selectionStrArray = [];
			var supervisorIndexArray = [];
			var interfaceIndexArray = [];
			for (var i = 0; i < selected.length; i++) 
			{
				if (selected[i]!==0) 
				{
					var oneInterface = FEELEMENTS[i].getAttribute("value");
					if (selected[i]!==0) selectionStrArray.push(FEELEMENTS[i].getAttribute("value"));
					supervisorIndexArray.push(oneInterface.split(":")[1]);
					interfaceIndexArray.push(oneInterface.split(":")[2]);
				}
			}
	    	var reverse = document.getElementById("lsbFirst").checked;
	    	if(runningMacroLSBF == 1) reverse = true; 
	    	if(runningMacroLSBF == 2) reverse = false; 
	    	
			var convertedAddress = reverseLSB(convertToHex(addressFormatStr,theAddressStrForRead),reverse);

			DesktopContent.XMLHttpRequest("MacroMakerRequest?RequestType=readData&Address="
					+convertedAddress+"&supervisorIndex="+supervisorIndexArray
					+"&interfaceIndex="+interfaceIndexArray+"&time="+Date().toString()
					+"&interfaces="+selectionStrArray+"&addressFormatStr="+addressFormatStr
					+"&dataFormatStr="+dataFormatStr,"",readHandler);
		}
    }
    
    function writeHandler(req)
	{
		Debug.log("writeHandler() was called.");// Req: ");//" + req.responseText);
		var runningPercentageEl = document.getElementById('macroRunningPercentage');
		var barEl = document.getElementById('macroRunningBar');
		barWidth += barIncrement;
		barEl.style.width = barWidth + '%'; 
		runningPercentageEl.innerHTML = Math.round(barWidth*10)/10 + '%';
		waitForCurrentCommandToComeBack = false;

    }
    
    function readHandler(req)
	{
		Debug.log("readHandler() was called.");// Req: " + req.responseText);
    	var addressFormatStr = document.getElementById("addressFormat").value;
    	var dataFormatStr = document.getElementById("dataFormat").value;
    	
    	if(isMacroRunning == true)
    	{
    		addressFormatStr = "hex";
    		dataFormatStr = "hex";
    	}
    	
    	var reminderEl = document.getElementById('reminder');
    	
		var dataOutput = DesktopContent.getXMLValue(req,"readData");
		if(putReadResultInBoxFlag) boxOfFreshVar = dataOutput;
		
		var convertedOutput;
		
    	var reverse = document.getElementById("lsbFirst").checked;
    	if(runningMacroLSBF == 1) reverse = true; 
        if(runningMacroLSBF == 2) reverse = false; 
        
		if (isNaN("0x"+dataOutput)) convertedOutput = "<span class='red'>" + dataOutput + "</span>";
		else convertedOutput = convertFromHex(dataFormatStr,reverseLSB(dataOutput,reverse));

		var selectionStrArray = [];
		for (var i = 0; i < selected.length; i++) 
		{
			if (selected[i]!==0) selectionStrArray.push(FEELEMENTS[i].getAttribute("value"));
		}
		var innerClass = "class=\"innerClass1\"";
		if (CMDHISTDIVINDEX%2) innerClass = "class=\"innerClass2\"";
		var contentEl = document.getElementById('historyContent');

		var update = "<div " + innerClass + " id = \"" + CMDHISTDIVINDEX + "\" title=\"" + "Entered: " + Date().toString()
				+ "\nSelected interface: " + selectionStrArray + "\" onclick=\"histCmdReadDivOnclick(" +"'" 
				+ theAddressStrForRead + "','" + addressFormatStr + "'" + ")\">Read [" + dataFormatStr + "]<b>" 
				+ convertedOutput + LSBchecker(reverse)
				+ "</b> from register [" + addressFormatStr + "]<b>" + theAddressStrForRead + LSBchecker(reverse) + "</b></div>";
		theAddressStrForRead = "";
		contentEl.innerHTML += update;
		CMDHISTDIVINDEX++; 
		contentEl.scrollTop = contentEl.scrollHeight;
		reminderEl.innerHTML = "Data read: " + convertedOutput;
		var runningPercentageEl = document.getElementById('macroRunningPercentage');
		var barEl = document.getElementById('macroRunningBar');
		barWidth += barIncrement;
		barEl.style.width = barWidth + '%'; 
		runningPercentageEl.innerHTML = Math.round(barWidth*10)/10 + '%';
		waitForCurrentCommandToComeBack = false;
	}
    
    function isArrayAllZero(arr)
    {
        for(var j = 0; j < arr.length; j++)
        {
          if (arr[j]!==0) return false;
        }
        return true;
    }
    
    function convertToHex(format,target)
    {
		switch (format) 
		{
			case "hex": 
				return target;
			case "dec": //dec
				return Number(target).toString(16);
			case "ascii": //ascii
				var output = [];
				for(var i = target.length-1; i>=0; i--)
					 output.push(target.charCodeAt(i).toString(16));
				return output.join('');
		}
    }
    
    function convertFromHex(format,target)
    {
		switch (format) 
		{
	      case "hex":
			return target;
		  case "dec":
			return parseInt(target,16).toString();
		  case "ascii":
			var str = '';
			for (var i = 0; i < target.length; i += 2)
			str += String.fromCharCode(parseInt(target.substr(i, 2), 16));
			return str;
		}
    }
    
    function reverseLSB(original, execute)
    {
    	if(execute)
		{
			var str = '';
			if(original.length%2) 
				original = "0"+original;
			for (var i = original.length-2; i > -2; i -= 2)
			  str += original.substr(i,2);
			return str;
		}
    	else return original;
    }
    
    function LSBchecker(LSBF)
    {
    	if(LSBF) return "*";
    	else return "";
    }
    
    function toggleDisplay(onMacro)
    {
    	 var fecListEl = document.getElementById("fecList");
    	 var macroLibEl = document.getElementById("macroLib");
    	 var sequenceEl = document.getElementById("sequence");
    	 var progressBarOuterEl = document.getElementById("progressBarOuter");
    	 var mainEl = document.getElementById("main");
    	 var makerEl = document.getElementById("maker");
    	 
    	 if (onMacro) {
    		 isOnMacroMakerPage = true;
    		 fecListEl.style.display = "none";
    		 macroLibEl.style.display = "none";
    		 sequenceEl.style.display = "block";
    		 progressBarOuterEl.style.display = "none";
    		 mainEl.style.display = "none";
    		 makerEl.style.display = "block";
    		 document.getElementById("page1tag").style.fontWeight = "400";
    		 document.getElementById("page2tag").style.fontWeight = "900";
    		 document.getElementById("page2tag").style.background = "#002a52";
    		 document.getElementById("page1tag").style.background = "#001626";

    	 } 
    	 else 
    	 {
    		 isOnMacroMakerPage = false;
    		 fecListEl.style.display = "block";
    		 macroLibEl.style.display = "block";
    		 sequenceEl.style.display = "none";
    		 progressBarOuterEl.style.display = "block";
    		 mainEl.style.display = "block";
    		 makerEl.style.display = "none";
    		 document.getElementById("page2tag").style.fontWeight = "400";
    		 document.getElementById("page1tag").style.fontWeight = "900";
    		 document.getElementById("page1tag").style.background = "#002a52";
    		 document.getElementById("page2tag").style.background = "#001626";


    	 }
    }
   
    function toggleMacroPublicity(onPublic)
    {
    	var privateEl = document.getElementById("listOfPrivateMacros");
    	var publicEl = document.getElementById("listOfPublicMacros");
    	if(onPublic) {
    		privateEl.style.display = "none";
    		publicEl.style.display = "block";
    		document.getElementById("publicTag").style.fontWeight = "900";
    		document.getElementById("privateTag").style.fontWeight = "400";
    		document.getElementById("publicTag").style.background = "#002a52";
    		document.getElementById("privateTag").style.background = "#001626";

    		isOnPrivateMacros = false;
    	}
    	else
    	{
    		privateEl.style.display = "block";
    		publicEl.style.display = "none";
    		document.getElementById("privateTag").style.fontWeight = "900";
     		document.getElementById("publicTag").style.fontWeight = "400";
    		document.getElementById("privateTag").style.background = "#002a52";
    		document.getElementById("publicTag").style.background = "#001626";

    		isOnPrivateMacros = true;
    	}
    }
	
    function addCommand(command,address,data)//either has address+data, or have no address/data. # of parameters = 1 or 3
    {
		var contentEl = document.getElementById('sequenceContent');
		var macroReminderEl = document.getElementById('macroReminder');
		macroReminderEl.innerHTML = "";
		var formatMarkerHead, formatMarkerTail = "";
		if(SEQFORMAT == "hex") formatMarkerHead = "0x";
		else if(SEQFORMAT == "ascii")
		{
			formatMarkerHead = "\"";
			formatMarkerTail = "\"";
		}
		else 
		{
			formatMarkerHead = "";
			formatMarkerTail = "";
		}
		switch(command)
		{
		case 'w':
	    	if (typeof address === 'undefined') 
			{ 
				var addressStrBefore = document.getElementById('macroAddressInput').value.toString();
				var dataStrBefore = document.getElementById('macroDataInput').value.toString();
	    		if(addressStrBefore === "") 
				{
					macroReminderEl.innerHTML = "Please enter an address to write to";
					return;
				} 
	    		else if(dataStrBefore === "") 
	    		{
					macroReminderEl.innerHTML = "Please enter your data";
					return;
				}
				var addressFormatStr = document.getElementById("macroAddressFormat").value;
				var dataFormatStr = document.getElementById("macroDataFormat").value;
		    	var reverse = document.getElementById("lsbFirst").checked;
				var addressStr = reverseLSB(convertToHex(addressFormatStr,addressStrBefore),reverse);
				var dataStr = reverseLSB(convertToHex(dataFormatStr,dataStrBefore),reverse);
			} 
	    	else 
			{
				var addressStr = address.toString();
				var dataStr = data.toString();
			}
			var update = "<div id = \"seq" + SEQINDEX + "\" data-id =" + SEQINDEX 
					+ " onmouseout=\"hideDeletex(" + SEQINDEX + ")\" onmouseover=\"showDeletex(" 
					+ SEQINDEX + ")\" ondragstart=\"hideDeletex(" + SEQINDEX 
					+ ")\" ondragend=\"getOrder()\"  class=\"seqDiv\"><p class=\"insideSEQ textSEQ\">Write <b>" 
					+ formatMarkerHead + convertFromHex(SEQFORMAT,dataStr) + formatMarkerTail + "</b> into <b>" 
					+ formatMarkerHead + convertFromHex(SEQFORMAT,addressStr) + formatMarkerTail 
					+ "</b></p><img src=\"/WebPath/images/windowContentImages/macromaker-delete.png\" id=\"deletex" 
					+ SEQINDEX + "\" class=\"insideSEQ deletex\" onclick=\"removeCommand(" 
					+ SEQINDEX + ")\"></></div>";
			var writeMacroString = SEQINDEX + ":w:" + addressStr + ":" + dataStr;
			macroString.push(writeMacroString);
			break;
		case 'r':
			if (typeof address === 'undefined') 
			{ 
				var addressStrBefore = document.getElementById('macroAddressInput').value.toString();
				if(addressStrBefore === "") 
				{
					macroReminderEl.innerHTML = "Please enter an address to read from";
					return;
				}
				var addressFormatStr = document.getElementById("macroAddressFormat").value;
				var reverse = document.getElementById("lsbFirst").checked;
				var addressStr = reverseLSB(convertToHex(addressFormatStr,addressStrBefore),reverse);
			} 
			else var addressStr = address.toString();
			var update = "<div id = \"seq" + SEQINDEX + "\" data-id =" + SEQINDEX 
					+ " onmouseout=\"hideDeletex(" + SEQINDEX + ")\" onmouseover=\"showDeletex(" 
					+ SEQINDEX + ")\" ondragstart=\"hideDeletex(" + SEQINDEX 
					+ ")\" ondragend=\"getOrder()\" class=\"seqDiv\"><p class=\"insideSEQ\">Read from <b>" 
					+ formatMarkerHead + convertFromHex(SEQFORMAT,addressStr) + formatMarkerTail 
					+ "</b></p><img src=\"/WebPath/images/windowContentImages/macromaker-delete.png\" id=\"deletex" 
					+ SEQINDEX + "\" class=\"insideSEQ deletex\" onclick=\"removeCommand(" 
					+ SEQINDEX + ")\"></></div>";
			var readMacroString = SEQINDEX+":r:"+addressStr+":";
			macroString.push(readMacroString);
			break;
		case 'd':
			if (typeof address === 'undefined') //adding from Sequence Maker
			{ 
				var delayStr = document.getElementById('delayInput').value.toString();
				if(delayStr === "") 
				{
					macroReminderEl.innerHTML = "Please enter a delay";
					return;
				}
				else if (isNaN(delayStr))
				{
					macroReminderEl.innerHTML = "Delay has to be a numerical number";
					return;
				}
				if(document.getElementById("delayUnit").value === "s") delayStr = Number(delayStr)*1000;

			}
			else // adding from Command History
				var delayStr = address.toString();
			var update = "<div id = \"seq" + SEQINDEX + "\" data-id =" + SEQINDEX 
					+ " onmouseout=\"hideDeletex(" + SEQINDEX + ")\" onmouseover=\"showDeletex(" 
					+ SEQINDEX + ")\" ondragstart=\"hideDeletex(" + SEQINDEX 
					+ ")\" ondragend=\"getOrder()\" class=\"seqDiv\"><p class=\"insideSEQ\">Delay <b>" 
					+ delayStr + "</b> ms</p><img src=\"/WebPath/images/windowContentImages/macromaker-delete.png\" id=\"deletex" 
					+ SEQINDEX + "\" class=\"insideSEQ deletex\" onclick=\"removeCommand(" + SEQINDEX 
					+ ")\"></></div>";
			var delayMacroString = SEQINDEX+":d:"+delayStr;
			macroString.push(delayMacroString);
			break;
		default: 
			Debug.log("So if it's not write, read, or delay, what is it??");
		}
		contentEl.innerHTML += update;
		SEQINDEX++;
		contentEl.scrollTop = contentEl.scrollHeight;
		sortable = Sortable.create(contentEl,{
				chosenClass: 'chosenClassInSequence',
				ghostClass:'ghostClassInSequence'
		});//Works like magic!
		getOrder();
    }
    
    function hideDeletex(seqIndex)
    {
    	var deleteID = "deletex"+seqIndex;
    	document.getElementById(deleteID).style.display = "none"; 
    }
    
    function showDeletex(seqIndex)
    {
    	var deleteID = "deletex"+seqIndex;
    	var deleteEl = document.getElementById(deleteID);
    	deleteEl.style.top = (deleteEl.parentNode.offsetTop + 1) + "px";
    	deleteEl.style.left = (deleteEl.parentNode.offsetLeft + 
    			deleteEl.parentNode.offsetWidth - 20) + "px";
    	deleteEl.style.display = "block";    	
    }
    
    function getOrder()
    {
    	tempString = [];
		var order = sortable.toArray();		
		//copy and sort indices 
		var sorting = order.slice(); 
		sorting.sort(function(a,b){ return a-b;}); //to sort in numeric-increasing order
		
		//get the possibly-reordered index out of macro string
		for(var i = 0; i < macroString.length; i++)
			tempString.push(macroString[sorting.indexOf(order[i])]);
    }
    
    function removeCommand(seqIndex)
    {
    	document.getElementById("undoDelete").disabled = false;
    	var child = document.getElementById("seq"+seqIndex);
		var parent = document.getElementById('sequenceContent');
		parent.removeChild(child);
		for (var i = 0; i < macroString.length; i++)
		{
		    if (seqIndex == macroString[i].split(":")[0])
		    {
		      lastDeletedMacro = macroString[i];
		      macroString.splice(i,1);
		    }	  
		}
		getOrder();
    }
    
    function undoDelete()
    {
    	addCommand(lastDeletedMacro.split(":")[1],lastDeletedMacro.split(":")[2],lastDeletedMacro.split(":")[3]);
    	document.getElementById("undoDelete").disabled = true;
    }
    
    function showPopupClearAllConfirm()
    {
		var popupClearAllConfirm = document.getElementById("popupClearAllConfirm");
		popupClearAllConfirm.style.display = "block";
    }
    
    function showPopupClearHistoryConfirm()
    {
		var popupClearAllConfirm = document.getElementById("popupClearHistoryConfirm");
		popupClearAllConfirm.style.display = "block";
    }
	
    function clearAll(el)
    {
		var contentEl = document.getElementById('sequenceContent');
		contentEl.innerHTML = "";
		macroString = [];
		hideSmallPopup(el);
    }
    
    function clearHistory(el)
    {
		DesktopContent.XMLHttpRequest("MacroMakerRequest?RequestType=clearHistory","",clearHistoryHandler);
		var contentEl = document.getElementById('historyContent');
		contentEl.innerHTML = "";
		hideSmallPopup(el);
    }
    
    function clearHistoryHandler(req)
	{
		Debug.log("clearHistoryHandler() was called.");// Req: " + req.responseText);
		loadUserHistory();
	}
    
    function hideSmallPopup(el)
    {
    	var wholeDiv = el.parentNode.parentNode.parentNode;
    	wholeDiv.style.display = "none";
    }
    
    function saveMacro()
    {	
    	if (macroString.length === 0) 
    		document.getElementById('macroReminder').innerHTML = "Macro sequence cannot be empty";
    	else
    	{
			document.getElementById("popupSaveMacro").style.display = "block";
			if (userPermission == ADMIN_PERMISSION_THRESHOLD)
				document.getElementById("makeMacroPublic").style.display = "block";
    	}
    }
    
    function hidePopupSaveMacro()
    {
    	var popupSaveMacro = document.getElementById("popupSaveMacro");
    	popupSaveMacro.style.display = "none";
        document.getElementById("macroName").value="";
        document.getElementById("macroNotes").value="";
		document.getElementById('macroReminder').innerHTML = "Macro successfully saved!";
    }

    function hidePopupEditMacro()
    {
    	var popupEditMacro = document.getElementById("popupEditMacro");
    	popupEditMacro.style.display = "none";
        arrayOfCommandsForEdit = [];        
    }
   
    function saveAsMacro()
    {
    	getOrder();
    	var macroName = document.getElementById("macroName").value;
    	//var Regex = /^[\w\s]+$/;
    	var Regex = /^[a-zA-Z0-9\_]+$/g;
    	if (!Regex.test(macroName)) 
			document.getElementById("popupIllegalNaming").style.display = "block";
    	else
    	{
    		var macroNotes = document.getElementById("macroNotes").value;
			if(macroNotes.indexOf("@") >= 0 || macroNotes.indexOf("#") >= 0 || macroNotes.indexOf("..") >= 0)
			{
				document.getElementById("popupIllegalNotes").style.display = "block";
				return;
			}
    		var macroLibEl = document.getElementById('listOfPrivateMacros');
    		stringOfAllMacros[MACROINDEX] = tempString;
    		var isMacroPublic = document.getElementById("isMacroPublic").checked;
    		var isMacroLSBF = document.getElementById("isMacroLSBF").checked;
    		
        	if(namesOfAllMacros.indexOf(macroName) !== -1) //duplicate name
        	{
        		document.getElementById("popupMacroAlreadyExists").style.display = "block";
        		document.getElementById("duplicateName").innerHTML = macroName;
    			document.getElementById("popupMacroAlreadyExistsCancel").onclick = function(){
    				hideSmallPopup(this);
    				return;
    			};
    			document.getElementById('popupMacroAlreadyExistsOverwrite').onclick = function(){ //call edit
    				DesktopContent.XMLHttpRequest("MacroMakerRequest?RequestType=editMacro&isPublic="
    								+isMacroPublic+"&isLSBF="+isMacroLSBF+"&oldMacroName="
    								+macroName+"&newMacroName="+macroName+"&Sequence="
    								+tempString+"&Time="+Date().toString()+"&Notes="
    								+macroNotes,"",saveChangedMacroHandler);
    				hideSmallPopup(this);
    				loadExistingMacros();
    				hidePopupSaveMacro();   
    				macroLibEl.scrollTop = macroLibEl.scrollHeight - macroLibEl.clientHeight; 
    				Debug.log("Your Macro '" + macroName + "' was succesfully saved!",Debug.INFO_PRIORITY);
    			};
        	}
        	else
        	{
				DesktopContent.XMLHttpRequest("MacroMakerRequest?RequestType=createMacro&isPublic="+isMacroPublic
						+"&isLSBF="+isMacroLSBF+"&Name="+macroName+"&Sequence="+tempString+"&Time="+Date().toString()+"&Notes="
						+macroNotes,"",createMacroHandler);		
				loadExistingMacros();
				hidePopupSaveMacro(); 
				macroLibEl.scrollTop = macroLibEl.scrollHeight - macroLibEl.clientHeight; 
				Debug.log("Your Macro '" + macroName + "' was succesfully saved!",Debug.INFO_PRIORITY);
        	}
    	}
    }
    
    function createMacroHandler(req)
	{
		Debug.log("createMacroHandler() was called.");// Req: " + req.responseText);
	}
    
    function runMacro(stringOfCommands,macroName)
    {
		var contentEl = document.getElementById('historyContent');
		var progressBarInnerEl = document.getElementById('progressBarInner');
		var start = "<p class=\"red\"><b><small>-- Start of Macro: " + macroName + " --</small></b></p>";
		contentEl.innerHTML += start;
		contentEl.scrollTop = contentEl.scrollHeight;
		
		progressBarInnerEl.style.display = "block";
		var barEl = document.getElementById('macroRunningBar');
		barEl.style.width = '0%';
		barIncrement = 100/stringOfCommands.length;
		var i = 0;
    	var copyOfStringOfCommands = stringOfCommands.slice();           //Needed because the variable assignments are temporary
		timeIntervalID = setInterval(function(){
			if(!waitForCurrentCommandToComeBack)
			{
				if(i == stringOfCommands.length)
				{
					var end = "<p class=\"red\"><b><small>-- End of Macro: " + macroName + " --</small></b></p>";
					contentEl.innerHTML += end;
					contentEl.scrollTop = contentEl.scrollHeight;
					isMacroRunning = false;
					setTimeout(function(){ 
						progressBarInnerEl.style.display = "none";
	                }, 150);
					barWidth = 0;
				    barIncrement = 0;
				    runningMacroLSBF = 0;
					clearInterval(timeIntervalID);
				}
				else
				{
					var Command = copyOfStringOfCommands[i].split(":")
					var commandType = Command[1];
					if(commandType=='w'){
						callWrite(Command[2],Command[3]);
						waitForCurrentCommandToComeBack = true;
					}else if(commandType=='r'){
						if(readoutDictionary.indexOf(Command[3].toString()) !== -1)  //check if Command[3] is a var!
						{
							if(boxOfFreshVar === "")								//box is empty ????? not enough
							{
								putReadResultInBoxFlag = true;
								callRead(Command[2])								//flag for readResult 
								waitForCurrentCommandToComeBack = true;
								i--;
							}
							else														//only come in here to replace. 
							{
								for(var j = i+1; j < copyOfStringOfCommands.length; j++)  //take whatever is in the box
								{
									if(copyOfStringOfCommands[j].split(":")[2] == Command[3]) //replace everything in copyOfStringOfCommands	
									{
										var newCommand = copyOfStringOfCommands[j].split(":");
										newCommand[2] = boxOfFreshVar;
										copyOfStringOfCommands[j] = newCommand.join(":");
									}
										
									if(copyOfStringOfCommands[j].split(":")[3] == Command[3])
									{
										var newCommand = copyOfStringOfCommands[j].split(":");
										newCommand[3] = boxOfFreshVar;
										copyOfStringOfCommands[j] = newCommand.join(":");
									}
								}
								boxOfFreshVar = "";									//dump the box empty
								putReadResultInBoxFlag = false;
								console.log("final command after 2nd replacement" + copyOfStringOfCommands);
							}	
						}
						else 
						{
							callRead(Command[2]);
							waitForCurrentCommandToComeBack = true;
						}
					}
					else if(commandType=='d'){
						waitForCurrentCommandToComeBack = true;
						setTimeout(function(){delay();},Number(Command[2]));
						function delay(){
							//delay handler here, does what read and write handlers do
							var contentEl = document.getElementById('historyContent');
							var innerClass = "class=\"innerClass1\"";
							if (CMDHISTDIVINDEX%2) innerClass = "class=\"innerClass2\"";
							var selectionStrArray = [];
							for (var i = 0; i < selected.length; i++) 
							{
								if (selected[i]!==0) selectionStrArray.push(FEELEMENTS[i].getAttribute("value"));
							}
							var update = "<div " + innerClass + " id = \"" + CMDHISTDIVINDEX + "\" title=\"" + "Entered: " + Date().toString()
											+ "\nSelected interface: " + selectionStrArray + "\" onclick=\"histCmdDelayDivOnclick(" + Command[2]
											+ ")\">Delay <b>" + Command[2] + "</b> ms</div>";
							contentEl.innerHTML += update;
							contentEl.scrollTop = contentEl.scrollHeight;
							CMDHISTDIVINDEX++;
							var runningPercentageEl = document.getElementById('macroRunningPercentage');
							var barEl = document.getElementById('macroRunningBar');
							barWidth += barIncrement;
							barEl.style.width = barWidth + '%'; 
							runningPercentageEl.innerHTML = Math.round(barWidth*10)/10 + '%';   
							waitForCurrentCommandToComeBack = false;
						}
					}else
						console.log("ERROR! Command type "+commandType+" not found");
					i++;
				}
			}
		},200);
    }
    
    function loadExistingMacros()
    {
    	DesktopContent.XMLHttpRequest("MacroMakerRequest?RequestType=loadMacros","",loadingMacrosHandler);
    }
    
    function loadUserHistory()
	{
		DesktopContent.XMLHttpRequest("MacroMakerRequest?RequestType=loadHistory","",loadingHistHandler);
	}
    
    function loadingMacrosHandler(req)
    {
    	Debug.log("loadingMacrosHandler() was called.");// Req: " + req.responseText);
    	var hugeStringOfMacros = DesktopContent.getXMLValue(req,"returnMacroStr");
    	var hugeStringOfPublicMacros = DesktopContent.getXMLValue(req,"returnPublicStr");
    	namesOfAllMacros = [];
    	if (hugeStringOfMacros && hugeStringOfMacros.length > 0)
    	{
			var macrosArray = hugeStringOfMacros.split("@");
			var out = "";
			var finalOutput = "";
			for(var i = 0; i < macrosArray.length; i++) 
			{
				var arr = JSON.parse(macrosArray[i]);
				namesOfAllMacros.push(arr.name);
				var macroString = arr.sequence.split(",");
				var forDisplay = []; //getting rid of the first element (macroIndex) for all and the last ";" of reads for display 
				for (var j = 0; j < macroString.length; j++) //because users don't need to see that
				    forDisplay.push(macroString[j].split(":").slice(1).filter(Boolean).join(":")); 
				
				stringOfAllMacros[MACROINDEX] = macroString;
				out += "<div title='Sequence: " + forDisplay.join(",") + "\nNotes: "
						+ arr.notes + "\nCreated: " + arr.time + "\nLSBF: " + arr.LSBF
						+ "\' class='macroDiv' data-id=\"" + arr.name + "\" data-sequence=\"" 
						+ macroString + "\" data-notes=\"" + arr.notes + "\" data-time=\"" 
						+ arr.time + "\" data-LSBF=\"" + arr.LSBF
						+ "\" onclick='dealWithVariables(stringOfAllMacros[" 
						+ MACROINDEX + "],\"" + arr.name + "\",\"" + arr.LSBF + "\")'><b>" + arr.name + "</b></br></div>"; 
				MACROINDEX++;
			}
			finalOutput = decodeURI(out);
			document.getElementById("listOfPrivateMacros").innerHTML = finalOutput;
    	}
    	else 
    		document.getElementById("listOfPrivateMacros").innerHTML = "";
    	if (hugeStringOfPublicMacros && hugeStringOfPublicMacros.length > 0)
		{
			var publicMacrosArray = hugeStringOfPublicMacros.split("@");
			var out = "";
			var finalOutput = "";
			for(var i = 0; i < publicMacrosArray.length; i++) 
			{
				var arr = JSON.parse(publicMacrosArray[i]);
				namesOfAllMacros.push(arr.name);
				var macroString = arr.sequence.split(",");
				var forDisplay = []; //getting rid of the first element (macroIndex) for display
				for (var j = 0; j < macroString.length; j++)
					forDisplay.push(macroString[j].split(":").slice(1).filter(Boolean).join(":"));
				
				stringOfAllMacros[MACROINDEX] = macroString;
				out += "<div title='Sequence: " + forDisplay.join(",") + "\nNotes: "
						+ arr.notes + "\nCreated: " + arr.time + "\nLSBF: " + arr.LSBF
						+ "\' class='macroDiv' data-id=\"" + arr.name + "\" data-sequence=\"" 
						+ macroString + "\" data-notes=\"" 
						+ arr.notes + "\" data-time=\"" + arr.time 
						+ "\" data-LSBF=\"" + arr.LSBF
						+ "\" onclick='dealWithVariables(stringOfAllMacros[" 
						+ MACROINDEX + "],\"" + arr.name + "\",\"" + arr.LSBF + "\")'><b>" + arr.name + "</b></br></div>"; 
				finalOutput = decodeURI(out);
				MACROINDEX++;
			}
			document.getElementById("listOfPublicMacros").innerHTML = finalOutput;
		}
		else 
			document.getElementById("listOfPublicMacros").innerHTML = "";
    	console.log(namesOfAllMacros);
    }
    
    function loadingHistHandler(req)
    {
    	Debug.log("loadingHistHandler() was called.");// Req: " + req.responseText);
		var hugeStringOfHistory = DesktopContent.getXMLValue(req,"returnHistStr");
		var contentEl = document.getElementById('historyContent');
		if ( !hugeStringOfHistory ) return; //this happens when history doesn't exist
		
		var commandHistArray = hugeStringOfHistory.split("#");
		var out = "";
		var finalOutPut = "";
		for(var i = 0; i < commandHistArray.length; i++) 
		{
			var innerClass = "class=\"innerClass1\"";
			if (CMDHISTDIVINDEX%2) innerClass = "class=\"innerClass2\"";

			var arr = JSON.parse(commandHistArray[i]);
			var oneCommand = arr.Command.split(":");
			var commandType = oneCommand[0];
			var addressFormat = arr.Format.split(":")[0];
			var dataFormat = arr.Format.split(":")[1];		
			var convertedAddress = convertFromHex(addressFormat,oneCommand[1]);
			var convertedData = convertFromHex(dataFormat,oneCommand[2]);
			if (isNaN('0x'+oneCommand[2])) convertedData = "<span class='red'>" + oneCommand[2] + "</span>";

			if(commandType=='w')
			{
				out = "<div " + innerClass + " id = \"" + CMDHISTDIVINDEX + "\"  title=\"" + "Entered: " 
						+ arr.Time + "\nSelected interface: " + arr.Interfaces
						+ "\" onclick=\"histCmdWriteDivOnclick(" + "'" + convertedAddress + "','" + convertedData + "','" 
						+ addressFormat + "','" + dataFormat + "')\">Write [" + dataFormat + "]<b>"
						+ convertedData + "</b> into register [" + addressFormat + "]<b> " 
						+ convertedAddress + "</b></div>";
				finalOutPut += decodeURI(out);
				CMDHISTDIVINDEX++;
			}
			else if(commandType=='r')
			{
				if (Number(convertedData)===0) convertedData = "<span class='red'>Time out Error</span>";
				out = "<div " + innerClass + " id = \"" + CMDHISTDIVINDEX + "\" title=\"" + "Entered: " 
						+ arr.Time + "\nSelected interface: " + arr.Interfaces + "\" onclick=\"histCmdReadDivOnclick(" 
						+ "'" + convertedAddress + "','" + addressFormat + "'" + ")\">Read [" + dataFormat + "]<b>" 
						+ convertedData + "</b> from register [" + addressFormat + "]<b>" + convertedAddress + "</b></div>";
				finalOutPut += decodeURI(out);
				CMDHISTDIVINDEX++;
			}
			else
				Debug.log("ERROR! Command type "+commandType+" not found", Debug.HIGH_PRIORITY);

		}

		contentEl.innerHTML = finalOutPut;
		contentEl.scrollTop = contentEl.scrollHeight;
    }
    
    function histCmdWriteDivOnclick(addressStr, dataStr, addressFormatStr, dataFormatStr)
    {
    	var reverse = document.getElementById("lsbFirst").checked;
		var convertedAddress = reverseLSB(convertToHex(addressFormatStr,addressStr),reverse);
		var convertedData = reverseLSB(convertToHex(dataFormatStr,dataStr),reverse);
    	if(isOnMacroMakerPage)
    	{
    		addCommand("w",convertedAddress,convertedData);
    	}
    	else callWrite(addressStr, dataStr);
    }
    
    function histCmdReadDivOnclick(addressStr, addressFormatStr)
	{
    	var reverse = document.getElementById("lsbFirst").checked;
    	var convertedAddress = reverseLSB(convertToHex(addressFormatStr,addressStr),reverse);
		if(isOnMacroMakerPage)
		{
			addCommand("r",convertedAddress)
		}
		else callRead(addressStr);
	}
    
    function histCmdDelayDivOnclick(delayStr)
	{
		if(isOnMacroMakerPage)
		{
			addCommand("d",delayStr);
		}
		else return;
	}
    
    function macroActionOnRightClick(macroName, macroAction, macroSequence, macroNotes, macroDate, macroLSBF)
    {
    	Debug.log("macroName" + macroName+ " macroAction" +macroAction + 
    			" macroSequence" + macroSequence+ " macroNotes" + macroNotes + 
				" macroDate" +macroDate);
    	var isMacroPublic = !isOnPrivateMacros;
    	switch(macroAction)
    	{
    	case "Delete":
    		if (userPermission != ADMIN_PERMISSION_THRESHOLD && isMacroPublic)
    			document.getElementById("popupNoDeletePermission").style.display = "block";
    		else
    		{
    			document.getElementById('popupDeleteMacroConfirm').style.display = "block";
    			document.getElementById('macroNameForDelete').innerHTML = macroName;
    			document.getElementById('popupDeleteMacroConfirmYes').onclick = function(){
    				DesktopContent.XMLHttpRequest("MacroMakerRequest?RequestType=deleteMacro&isPublic="+isMacroPublic+"&MacroName="
    						+macroName,"",deleteMacroHandler);
    				hideSmallPopup(this);
    			}; 
    			document.getElementById('popupDeleteMacroConfirmCancel').onclick = function(){hideSmallPopup(this)};
    		}
    		break;
    	case "Edit":
    		if (userPermission != ADMIN_PERMISSION_THRESHOLD && isMacroPublic)
				document.getElementById("popupNoEditPermission").style.display = "block";
			else
			{
				var popupEditMacro = document.getElementById("popupEditMacro");
				popupEditMacro.style.display = "block";
				
				oldMacroNameForEdit = macroName;
				macroNotesForEdit = macroNotes;
				macroDateForEdit = macroDate;
				var seqID = 0;
				
				var macroSequenceEditEl = document.getElementById("macroSequenceEdit");
				arrayOfCommandsForEdit = macroSequence.split(",");
				var output = "";
						
				for (var i = 0; i < arrayOfCommandsForEdit.length; i++)
				{
					var Command = arrayOfCommandsForEdit[i].split(":")
					var commandType = Command[1];
					var markColor = "1";
					var disable = "";
					var markColorData = "1";
					var disableData = "";
					var readResult = "...";
					if(commandType=='w'){
						if(isNaN('0x'+Command[2]))
						{
							markColor = "2";
							disable = "disabled";
						}
						if(isNaN('0x'+Command[3]))
						{
							markColorData = "2";
							disableData = "disabled";
						}
						var writeEdit = "<lable>Write <textarea  " + disableData + " class=\"JStextarea\" onchange=\"editCommands(this," + seqID + ",3)\">" + Command[3]
							+ "</textarea><div class='variableMark" + markColorData + "' title='Set field to variable' onclick='setFieldToVariable(this," + seqID 
							+ ",3)'>V</div> into address <textarea " + disable + " class=\"JStextarea\" onchange=\"editCommands(this," + seqID + ",2)\">" + Command[2] 
							+ "</textarea><div class='variableMark" + markColor + "' title='Set field to variable' onclick='setFieldToVariable(this," + seqID 
							+ ",2)'>V</div><br/></lable>";
						seqID++;
						output += writeEdit;
					}else if(commandType=='r'){
						if(isNaN('0x'+Command[2]))
						{
							markColor = "2";
							disable = "disabled";
						}
						if(Command[3] !== "")
						{
							markColorData = "2";
							readResult = Command[3];
						}
						var readEdit = "<lable>Read <textarea disabled class=\"JStextarea\" onchange=\"editCommands(this," + seqID + ",3)\">" + readResult 
							+ "</textarea><div class='variableMark" + markColorData + "' title='Set field to variable' onclick='setFieldToVariable(this," + seqID 
							+ ",3,1)'>V</div> from address <textarea " + disable + " class=\"JStextarea\" onchange=\"editCommands(this," + seqID + ",2)\">" + Command[2]
							+ "</textarea><div class='variableMark" + markColor + "' title='Set field to variable' onclick='setFieldToVariable(this," + seqID 
							+ ",2)'>V</div><br/></lable>";
						seqID++;
						output += readEdit;
					}else if(commandType=='d'){
						if(isNaN(Command[2]))
						{
							markColor = "2";
							disable = "disabled";
						}
						var delayEdit = "<lable>Delay <textarea " + disable + " class=\"JStextarea\" onchange=\"editCommands(this," + seqID + ",2)\">" + Command[2]
							+ "</textarea><div class='variableMark" + markColor + "' title='Set field to variable' onclick='setFieldToVariable(this," + seqID 
							+ ",2)'>V</div> milliseconds<br/></lable>";
						seqID++;
						output += delayEdit;
					}else
						console.log("ERROR! Command type "+commandType+" not found");
				}
				macroSequenceEditEl.innerHTML = output;
				if(macroLSBF == "true")
					document.getElementById("isMacroEditLSBF").checked = true;
				else 					
					document.getElementById("isMacroEditLSBF").checked = false;

				
				var macroNameEl = document.getElementById("macroNameEdit");
				macroNameEl.value = macroName;
				var macroNotesEl = document.getElementById("macroNotesEdit");
				var date = new Date();    		
				var minutes = "";
				if(date.getMinutes() < 10) 
					 minutes = "0"+date.getMinutes().toString();
				else  minutes = date.getMinutes();
				var time = date.getHours() + ":" + minutes + " " + date.toLocaleDateString();
				macroNotesForEdit = "[Modified " + time + "] " + macroNotes;
				macroNotesEl.value = macroNotesForEdit;
				document.getElementById("editFormat").selectedIndex = 0;
			}
    		break;
    	case "Start":
    		var sequenceContentEl = document.getElementById("sequenceContent");
    		var temp = sequenceContentEl.innerHTML;
    		sequenceContentEl.innerHTML = "";
    		var arrayOfCommands = macroSequence.split(",");
			for (var i = 0; i < arrayOfCommands.length; i++)
			{
				var Command = arrayOfCommands[i].split(":");
				addCommand(Command[1],Command[2],Command[3]);
			}
			sequenceContentEl.innerHTML += temp;
			getOrder();
			toggleDisplay(1);
    		break;
    	case "End":
    		var arrayOfCommands = macroSequence.split(",");
			for (var i = 0; i < arrayOfCommands.length; i++)
			{
				var Command = arrayOfCommands[i].split(":");
				addCommand(Command[1],Command[2],Command[3]);
			}
			toggleDisplay(1);
    		break;
    	case "Export":
    		DesktopContent.XMLHttpRequest("MacroMakerRequest?RequestType=exportMacro&MacroName="
    							+macroName+"&MacroSequence="+macroSequence,"",exportMacroHandler);
    		break;
    	}
    }
    
    function exportMacroHandler(req)
   	{
   		Debug.log("exportMacroHandler() was called. ");//Req: " + req.responseText);   		

		var exportFile = DesktopContent.getXMLValue(req,"ExportFile");
		if(exportFile)
			Debug.log("Your Macro was succesfully exported!" +
					" It was saved to...\n\n" + exportFile,Debug.INFO_PRIORITY);
   	}
       
    function editCommands(textarea, seqID, index)
    {	
    	var x = arrayOfCommandsForEdit[seqID].split(":");
		if(isNaN("0x" + textarea.value) && textarea.value !== "")
		{
			document.getElementById("popupIllegalEdit").style.display = "block";
			textarea.value = x[index];
		}
		else
    	{
			x[index] = textarea.value;
			arrayOfCommandsForEdit[seqID] = x.join(":");
    	}
    }
    
    function deleteMacroHandler(req)
	{
		Debug.log("deleteMacroHandler() was called. ");//Req: " + req.responseText);
		var deletedMacroName = DesktopContent.getXMLValue(req,"deletedMacroName");
		var reminderEl = document.getElementById('reminder');
		reminderEl.innerHTML = "Successfully deleted " + decodeURI(deletedMacroName);
		loadExistingMacros();  
	}
    
    function saveChangedMacro()
    {
    	newMacroNameForEdit = document.getElementById("macroNameEdit").value;
    	//var Regex = /^[\w\s]+$/;
    	var Regex = /^[a-zA-Z0-9\_]+$/g;
    	var Regex2 = /^[a-z0-9]+$/i;
		if (!Regex.test(newMacroNameForEdit)) 
			document.getElementById("popupIllegalNaming").style.display = "block";
		else
		{
			if(document.getElementById("editFormat").value == "dec")
			{
				var nodeListOfTextareas=document.getElementsByTagName('textarea');
				for(var i=1;i<nodeListOfTextareas.length-1;i++) //Loop through all fields in the numerical sequence
				{
					if(!isNaN('0x'+nodeListOfTextareas[i].value))
						nodeListOfTextareas[i].innerHTML = convertToHex("dec",nodeListOfTextareas[i].value);
				}
			}
			for(var i = 0; i < arrayOfCommandsForEdit.length; i++)
			{
				var eachCommand = arrayOfCommandsForEdit[i].split(":");
				for (var j = 1; j < eachCommand.length; j++)
				{
					if(!Regex2.test(eachCommand[j]) && eachCommand[j] !== '')
					{
						document.getElementById("popupIllegalInput").style.display = "block";
						document.getElementById("illegalInputValue").innerHTML = eachCommand[j];
					    return;
					}
					else if (eachCommand[j] === '') 
					{
						if(eachCommand[j-2] == 'r') continue;		//OK if readback result is empty!
						else
						{
							document.getElementById("popupEmptyInput").style.display = "block";
							return;
						}
					}
				}
			}

			macroNotesForEdit = document.getElementById('macroNotesEdit').value;
			if(macroNotesForEdit.indexOf("@") >= 0 || macroNotesForEdit.indexOf("#") >= 0 || macroNotesForEdit.indexOf("..") >= 0)
			{
				document.getElementById("popupIllegalNotes").style.display = "block";
				return;
			}
			var isMacroLSBF = document.getElementById('isMacroEditLSBF').checked;
			var isMacroPublic = !isOnPrivateMacros;
			DesktopContent.XMLHttpRequest("MacroMakerRequest?RequestType=editMacro&isPublic="
							+isMacroPublic+"&isLSBF="+isMacroLSBF+"&oldMacroName="
							+oldMacroNameForEdit+"&newMacroName="+newMacroNameForEdit+"&Sequence="
							+arrayOfCommandsForEdit+"&Time="+macroDateForEdit+"&Notes="
							+macroNotesForEdit,"",saveChangedMacroHandler);
			hidePopupEditMacro();
		}
    }
    
    function saveChangedMacroHandler()
    {
    	Debug.log("saveChangedMacroHandler() was called.");
		loadExistingMacros();  
    }
    
    function reloadMacroSequence()
	{
		var sequenceContentEl = document.getElementById("sequenceContent");
		sequenceContentEl.innerHTML = "";
		macroString = [];
    	SEQFORMAT = document.getElementById("sequenceFormat").value;
    	var macroStringForReload = tempString.slice();
    	for (var i = 0; i < macroStringForReload.length; i++)
    	{
			var Command = macroStringForReload[i].split(":");
			addCommand(Command[1],Command[2],Command[3]);
    	}
    }

    function reloadEditSequence()
	{
    	//FIXME: this function needs to know the old value before onchange!
		var nodeListOfTextareas=document.getElementsByTagName('textarea');
		if(document.getElementById("editFormat").value == "dec")
		{
			for(var i=1;i<nodeListOfTextareas.length-1;i++) //Loop through all fields in the numerical sequence
			{
				if(!isNaN('0x'+nodeListOfTextareas[i].value))
					nodeListOfTextareas[i].innerHTML = convertFromHex("dec",nodeListOfTextareas[i].value);
			}
		}
//		else if(document.getElementById("editFormat").value == "ascii")
//		{
//			for(var i=1;i<nodeListOfTextareas.length-1;i++) //Loop through all fields in the numerical sequence
//			{
//				if(!isNaN('0x'+nodeListOfTextareas[i].value))
//					nodeListOfTextareas[i].innerHTML = convertToHex("ascii",nodeListOfTextareas[i].value);
//			}
//		}
		else
		{
			for(var i=1;i<nodeListOfTextareas.length-1;i++) //Loop through all fields in the numerical sequence
			{
				if(!isNaN('0x'+nodeListOfTextareas[i].value))
					nodeListOfTextareas[i].innerHTML = convertToHex("dec",nodeListOfTextareas[i].value);
			}
		}
    }
    
    function setFieldToVariable(div, seqID, index,isReadResultField)
    {
    	var popupNameVariableEl = document.getElementById("popupNameVariable");
    	popupNameVariableEl.style.display = "block";
    	var nameVariablePromptEl = document.getElementById("nameVariablePrompt");
    	var textareaEl = div.previousSibling;
		document.getElementById('popupNameVariableCancelButton').onclick = function() {
			popupNameVariableEl.style.display = "none";
			document.getElementById("nameVariable").value = "";
			return;
		};
		if(textareaEl.value != "..." && isReadResultField) //read result field! handle with caution
		{
			document.getElementById('popupNameVariableSaveButton').style.display = "none";
			document.getElementById('popupNameVariableYesButton').style.display = "inline-block";
			document.getElementById('nameVariable').style.display = "none";
			nameVariablePromptEl.innerHTML = "Would you like to remove this field as a variable?";
			document.getElementById('popupNameVariableYesButton').onclick = function() {
				div.style.backgroundColor = "#002a52";
				textareaEl.value = "...";
				var x = arrayOfCommandsForEdit[seqID].split(":");
				x[index] = "";
				arrayOfCommandsForEdit[seqID] = x.join(":");
				document.getElementById('popupNameVariableSaveButton').style.display = "inline-block";
				document.getElementById('popupNameVariableYesButton').style.display = "none";
				document.getElementById('nameVariable').style.display = "inline-block";
				popupNameVariableEl.style.display = "none";
			};
		}
		else if(!isNaN("0x"+textareaEl.value) || isReadResultField)
		{
			nameVariablePromptEl.innerHTML = "Setting field to variable! How would you like to name it?";
			document.getElementById('popupNameVariableSaveButton').onclick = function() {
				var variableName = document.getElementById("nameVariable").value.toString();
				if(variableName === "")
				{
					nameVariablePromptEl.innerHTML = "<span class='red'>Name of the variable cannot be empty.</span>";
					return;
				}
				else if(!isNaN("0x"+variableName))
				{
					nameVariablePromptEl.innerHTML = "<span class='red'>Name of the variable cannot be a number.</span>";
					return;
				}
				div.style.backgroundColor = "#ff0101";
				textareaEl.value = variableName;
				textareaEl.disabled = true;
				var x = arrayOfCommandsForEdit[seqID].split(":");
				x[index] = variableName;
				arrayOfCommandsForEdit[seqID] = x.join(":");
				document.getElementById("nameVariable").value = "";
				popupNameVariableEl.style.display = "none";
			};
		}
		else 
    	{
    		nameVariablePromptEl.innerHTML = "Would you like a set value instead of a variable?";
    		document.getElementById('popupNameVariableSaveButton').onclick = function() {
				var variableName = document.getElementById("nameVariable").value.toString();
				if(variableName === "")
				{
					nameVariablePromptEl.innerHTML = "<span class='red'>Name of the variable cannot be empty.</span>";
					return;
				}
				else if(isNaN("0x"+variableName)) 
				{
					nameVariablePromptEl.innerHTML = "<span class='red'>The value has to be a hex number.</span>";
					return;
				}
				div.style.backgroundColor = "#002a52";
				textareaEl.value = variableName;
				textareaEl.disabled = false;
				var x = arrayOfCommandsForEdit[seqID].split(":");
				x[index] = variableName;
				arrayOfCommandsForEdit[seqID] = x.join(":");
				document.getElementById("nameVariable").value = "";
				popupNameVariableEl.style.display = "none";
			};
    	}
    }

    
    function dealWithVariables(stringOfCommands,macroName,LSBF)
    {
    	if (LSBF == "true") runningMacroLSBF = 1; 
    	if (LSBF == "false") runningMacroLSBF = 2;
    	
    	var reminderEl = document.getElementById('reminder');
    	var waitForUserInputFlag = 0;
    	var copyOfStringOfCommands = stringOfCommands.slice();           //Needed because the variable assignments are temporary
    	var i = 0;
    	var commandToChange = 0;
    	var newCommand = [];
    	var dictionary = {};
    	var globalIndex = 0;
    	var isAddressField = true;
    	if(isMacroRunning)
    		reminderEl.innerHTML = "Please wait till the current macro ends";
    	else if(isArrayAllZero(selected))
			Debug.log("Please select at least one interface from the list",Debug.HIGH_PRIORITY);
    	else
    	{
    		isMacroRunning = true;
    		var promptEl = document.getElementById('popupAskForVariableValue');
    		timeIntervalID = setInterval(function()
    		{
    			if(i < stringOfCommands.length && waitForUserInputFlag === 0)
    			{
    				var Command = stringOfCommands[i].split(":");
       				function setValue(index,isReadAddress)   //This function is called when encountering a variable name in the address(index=2)/data(index=3) field
					{							    		 //instead of a hex value, and prompt the user to set the temporary value of variable 
						globalIndex = index;
						if(isReadAddress && Command[index] !== "")
						{
							readoutDictionary.push(Command[index].toString());
						}
						else if (dictionary[Command[index].toString()] !== undefined)   //Look up name-value pair of the variable in the dictionary
						{					                      						
							newCommand = copyOfStringOfCommands[i].split(":");
							newCommand[index] = dictionary[Command[index].toString()];
							copyOfStringOfCommands[i] = newCommand.join(":");
						}
						else if (isNaN("0x"+Command[index]) && Command[index] !== "")		//If not found in the dictionary, prompt user for the value OR
						{
							if(readoutDictionary.indexOf(Command[index].toString()) !== -1) //is one of those variables we want to temporarily preserve
							{
								return;
							}
							else
							{
								waitForUserInputFlag = 1;
								newCommand = copyOfStringOfCommands[i].split(":");
								var variableNameAtRunTime = Command[index];
								commandToChange = i;
								if(waitForUserInputFlag === 0)						   //Keep looping after user enters value and clicks continue
									return;
								else
								{
									promptEl.style.display = "block";				   //Pop-up window prompting user for value of variable
									document.getElementById('assignValuePrompt').innerHTML 
											= "What value would you assign to variable <span id=\"variableNameAtRunTime\" class=\"red\"></span>?</h4>"
									document.getElementById('variableNameAtRunTime').innerHTML = variableNameAtRunTime;
								}
							}
						}
					}
    				if (Command[1] == "w")                               //A "write" command will go through this loop twice
					{
    					if(isAddressField)					             //Address goes first, and then data
    					{
    						setValue(2);
    						i--;						                 //Decrementing the count after checking address field
    						isAddressField = false;
    					}
    					else
    					{
    						setValue(3);
    						isAddressField = true;
    					}
    				}
    				else if (Command[1] == "r")
    				{
    					if(isAddressField)					             //Address goes first, and then data
						{
							setValue(2);
							i--;						                 //Decrementing the count after checking address field
							isAddressField = false;
						}
						else
						{
							setValue(3,1);
							isAddressField = true;
						}
    				}
    				else setValue(2);
    				i++;
    			}
    			else if(i == stringOfCommands.length && waitForUserInputFlag === 0)
    			{
    				clearInterval(timeIntervalID);
    				console.log("Final command to send to run: " + copyOfStringOfCommands);
    				runMacro(copyOfStringOfCommands, macroName);					//End of function: send new macro to run
    			}
    		},200);
    	}

    	document.getElementById('popupAskForVariableValueContinue').onclick = function() 
    	{
    		var variableValue = document.getElementById("valueAtRunTime").value.toString();
    		if(isNaN("0x"+variableValue))
    		{
    			document.getElementById("assignValuePrompt").innerHTML = 
    					"<span class='red'>The value has to be a hex number.</span>";
    			return;
    		}
    		else
    		{
     			dictionary[newCommand[globalIndex].toString()] = variableValue;     //Add new name-value pair to dictionary
    			newCommand[globalIndex] = variableValue;
    			promptEl.style.display = "none";
    			copyOfStringOfCommands[commandToChange] = newCommand.join(":");
    			document.getElementById("valueAtRunTime").value = "";
    			waitForUserInputFlag = 0;                                           
    			return;
    		}
    	};
    }