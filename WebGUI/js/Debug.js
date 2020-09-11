//=====================================================================================
//
//	Created Dec, 2012
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	Debug.js
//
//	Since different browser have different console print statements, all ots code
// 		should use Debug.log(str,num[optional, default=0]). Where str is the string to print to console and
// 		num is the priority number 0 being highest.
//
//	Debug.log(args) 		will print to console if Debug.mode = 1 and if num < Debug.level
//	Debug.logv({var}) 		will decorate a variable and print to console with Debug.log()
//
//	Debug.err(args) 		will colorize console and Error popup
//	Debug.warn(args) 		will colorize console and Warning popup
//	Debug.info(args) 		will colorize console and Info popup
//	Debug.med(args) 		will colorize console but no popup
//
//	Note: An error pop up box will occur so that users see Debug.HIGH_PRIORITY log messages.
//	Note: A warning pop up box will occur so that users see Debug.WARN_PRIORITY log messages.
//	Note: An info pop up box will occur so that users see Debug.INFO_PRIORITY log messages.
//
//=====================================================================================

var Debug = Debug || {}; //define Debug namespace

Debug.mode = 1; 		//0 - debug off, 1 - debug on
Debug.simple = 0; 		//0 - use priority (more detail in printout), 1 - simple, no priority
Debug.level = 100;		//priority level, (100 should be all, 0 only high priority)
							//all logs with lower priority level are printed

Debug.lastLog = "";
Debug.lastLogger = "";

Debug.prependMessage = ""; //use to have a message always show up before log messages

//setup default priorities
Debug.HIGH_PRIORITY = {"DEBUG_PRIORITY":0};
Debug.WARN_PRIORITY = {"DEBUG_PRIORITY":1}; //1;
Debug.INFO_PRIORITY = {"DEBUG_PRIORITY":2}; //2;
Debug.TIP_PRIORITY = {"DEBUG_PRIORITY":3}; //3;
Debug.MED_PRIORITY = {"DEBUG_PRIORITY":50};// 50;
Debug.LOW_PRIORITY = {"DEBUG_PRIORITY":100}; //100;


//determine if chrome or firefox or other
//	0:other, 1:chrome, 2:firefox
Debug.BROWSER_TYPE_OTHER 	= 0;
Debug.BROWSER_TYPE_CHROME 	= 1;
Debug.BROWSER_TYPE_FIREFOX 	= 2;
Debug.BROWSER_TYPE = Debug.BROWSER_TYPE_OTHER;
{
	var tmp = (new Error).stack; 
	if(tmp[0] == 'E')
		Debug.BROWSER_TYPE = Debug.BROWSER_TYPE_CHROME;
	else if(tmp[0] == '@')
		Debug.BROWSER_TYPE = Debug.BROWSER_TYPE_FIREFOX;
}
console.log("Browser type = ", Debug.BROWSER_TYPE);

//determine if Linux OS or other (Linux Firefox seems to be a bad combo)
//	0:other, 1:linux
Debug.OS_TYPE_OTHER 	= 0;
Debug.OS_TYPE_LINUX 	= 1;
Debug.OS_TYPE_WINDOWS 	= 2;
Debug.OS_TYPE = Debug.OS_TYPE_OTHER;
{
	var tmp = (navigator && navigator.userAgent)?
			navigator.userAgent:""; 
	if(tmp.indexOf("Linux") >= 0)
		Debug.OS_TYPE = Debug.OS_TYPE_LINUX;
	else if(tmp.indexOf("Windows") >= 0)
		Debug.OS_TYPE = Debug.OS_TYPE_WINDOWS;
}
console.log("OS type = ", Debug.OS_TYPE);


if (Debug.mode) //IF DEBUG MODE IS ON!
{
	//load dialog fonts
	try
	{
		Debug.FontInconsolata = new FontFace('Inconsolata', 'url(/WebPath/fonts/inconsolata/Inconsolata-Regular.ttf)');
		document.fonts.add(Debug.FontInconsolata);
	} catch(e){console.log("Ignoring font errors: " + e);}
	try
	{
		Debug.FontComfortaa = new FontFace('Comfortaa', 'url(/WebPath/fonts/comfortaa/Comfortaa-Regular.ttf)');
		document.fonts.add(Debug.FontComfortaa);
	} catch(e){console.log("Ignoring font errors: " + e);}
	try
	{
		Debug.FontInconsolataBold = new FontFace('Inconsolata-Bold', 'url(/WebPath/fonts/inconsolata/Inconsolata-Bold.ttf)');
		document.fonts.add(Debug.FontInconsolataBold);
	} catch(e){console.log("Ignoring font errors: " + e);}
	try
	{
		Debug.FontComfortaaBold = new FontFace('Comfortaa-Bold', 'url(/WebPath/fonts/comfortaa/Comfortaa-Bold.ttf)');
		document.fonts.add(Debug.FontComfortaaBold);
	} catch(e){console.log("Ignoring font errors: " + e);}
	try
	{
		Debug.FontComfortaaLight = new FontFace('Comfortaa-Light', 'url(/WebPath/fonts/comfortaa/Comfortaa-Light.ttf)');
		document.fonts.add(Debug.FontComfortaaLight);
	} catch(e){console.log("Ignoring font errors: " + e);}

	//========================
	//special quick decoration for a variable
	//	Note: must call with brackets e.g. Debug.logv({firstInit_});
	Debug.logv = varObj => 
		{
			var keys = Object.keys(varObj);
			Debug.log(keys[0] + " \t= ",varObj[keys[0]]);
		}; //end Debug.logv()
	//========================
	//special hot functions to priorities
	Debug.presetPriority = Debug.LOW_PRIORITY.DEBUG_PRIORITY; //pre-set input priority
	Debug.err = function() { //colorize console and popup
		Debug.presetPriority = Debug.HIGH_PRIORITY.DEBUG_PRIORITY;
		if(Debug.BROWSER_TYPE == 1) //chrome
		{
			Debug.lastLogger = (new Error).stack.split("\n")[2];						
			Debug.lastLog = Debug.lastLogger.slice(0,Debug.lastLogger.indexOf(' ('));
			Debug.lastLogger = Debug.lastLogger.slice(Debug.lastLog.length+2,
					Debug.lastLogger.length-1);
		}
		else if(Debug.BROWSER_TYPE == 2) //firefox
		{
			Debug.lastLogger = (new Error).stack.split("\n")[1];						
			Debug.lastLog = Debug.lastLogger.slice(0,Debug.lastLogger.indexOf('@'));
			Debug.lastLogger = Debug.lastLogger.slice(Debug.lastLog.length+1,
					Debug.lastLogger.length);
		}
		Debug.log.apply(null,arguments); //use apply to keep args consistent
	}
	Debug.warn = function() { //colorize console and popup
		Debug.presetPriority = Debug.WARN_PRIORITY.DEBUG_PRIORITY;
		if(Debug.BROWSER_TYPE == 1) //chrome
		{
			Debug.lastLogger = (new Error).stack.split("\n")[2];						
			Debug.lastLog = Debug.lastLogger.slice(0,Debug.lastLogger.indexOf(' ('));
			Debug.lastLogger = Debug.lastLogger.slice(Debug.lastLog.length+2,
					Debug.lastLogger.length-1);
		}
		else if(Debug.BROWSER_TYPE == 2) //firefox
		{
			Debug.lastLogger = (new Error).stack.split("\n")[1];						
			Debug.lastLog = Debug.lastLogger.slice(0,Debug.lastLogger.indexOf('@'));
			Debug.lastLogger = Debug.lastLogger.slice(Debug.lastLog.length+1,
					Debug.lastLogger.length);
		}
		Debug.log.apply(null,arguments); //use apply to keep args consistent
	}
	Debug.info = function() { //colorize console and popup
		Debug.presetPriority = Debug.INFO_PRIORITY.DEBUG_PRIORITY;
		if(Debug.BROWSER_TYPE == 1) //chrome
		{
			Debug.lastLogger = (new Error).stack.split("\n")[2];						
			Debug.lastLog = Debug.lastLogger.slice(0,Debug.lastLogger.indexOf(' ('));
			Debug.lastLogger = Debug.lastLogger.slice(Debug.lastLog.length+2,
					Debug.lastLogger.length-1);
		}
		else if(Debug.BROWSER_TYPE == 2) //firefox
		{
			Debug.lastLogger = (new Error).stack.split("\n")[1];						
			Debug.lastLog = Debug.lastLogger.slice(0,Debug.lastLogger.indexOf('@'));
			Debug.lastLogger = Debug.lastLogger.slice(Debug.lastLog.length+1,
					Debug.lastLogger.length);
		}
		Debug.log.apply(null,arguments); //use apply to keep args consistent
	} 
	Debug.med = function() { //colorize console but no popup
		Debug.presetPriority = Debug.MED_PRIORITY.DEBUG_PRIORITY;
		if(Debug.BROWSER_TYPE == 1) //chrome
		{
			Debug.lastLogger = (new Error).stack.split("\n")[2];						
			Debug.lastLog = Debug.lastLogger.slice(0,Debug.lastLogger.indexOf(' ('));
			Debug.lastLogger = Debug.lastLogger.slice(Debug.lastLog.length+2,
					Debug.lastLogger.length-1);
		}
		else if(Debug.BROWSER_TYPE == 2) //firefox
		{
			Debug.lastLogger = (new Error).stack.split("\n")[1];						
			Debug.lastLog = Debug.lastLogger.slice(0,Debug.lastLogger.indexOf('@'));
			Debug.lastLogger = Debug.lastLogger.slice(Debug.lastLog.length+1,
					Debug.lastLogger.length);
		}
		Debug.log.apply(null,arguments); //use apply to keep args consistent
	} //end special hot functions
	//========================
	
	
	if (Debug.simple)
	{
		//If want default console.log use this:
		Debug.log = console.log.bind(window.console);
	}
	else
	{
		
		//========================
		//For fancy priority management use this:
		Debug.log = function()//str,num) 
		{ 		
			//make num optional and default to lowest priority
			var num = Debug.presetPriority;
			var argsInStr = arguments.length;
			if(arguments.length > 1 && 
					arguments[arguments.length-1] !== undefined &&
					arguments[arguments.length-1].DEBUG_PRIORITY !== undefined)
			{
				num = arguments[arguments.length-1].DEBUG_PRIORITY;
				--argsInStr;
			}
			Debug.presetPriority = Debug.LOW_PRIORITY.DEBUG_PRIORITY; //reset preset
			
			var str = ""; //build from arguments
			var useStrOnly = false;
			//just do normal color if one argument string
			if(argsInStr == 1 && typeof(arguments[0]) == "string")
				useStrOnly = true;
			
			for(var i=0;i<argsInStr;++i)
				str += arguments[i] + ' ';

			//add call out labels to file [line] text blobs
			var returnStr;

			if(num < 4) //modify string for popup
				returnStr = localCallOutDebugLocales(str);
			if(returnStr)
				str = returnStr;


			if(Debug.level < 0) Debug.level = 0; //check for crazies, 0 is min level
			if(Debug.mode && num <= Debug.level)
			{				
				str = Debug.prependMessage + str; //add prepend message

				var type = num < 4?
						(num==0?"High":(num==1?"Warn":(num==2?"Info":"Tip")))
						:(num<99?"Med":"Low");
				
				//if not pre-poulated, get caller info
				if(!Debug.lastLogger || Debug.lastLogger.length == 0)
				{
					if(Debug.BROWSER_TYPE == 1) //chrome
					{
						Debug.lastLogger = (new Error).stack.split("\n")[2];						
						Debug.lastLog = Debug.lastLogger.slice(0,Debug.lastLogger.indexOf(' ('));
						Debug.lastLogger = Debug.lastLogger.slice(Debug.lastLog.length+2,
								Debug.lastLogger.length-1);
					}
					else if(Debug.BROWSER_TYPE == 2) //firefox
					{
						Debug.lastLogger = (new Error).stack.split("\n")[1];						
						Debug.lastLog = Debug.lastLogger.slice(0,Debug.lastLogger.indexOf('@'));
						Debug.lastLogger = Debug.lastLogger.slice(Debug.lastLog.length+1,
								Debug.lastLogger.length);
					}
				}

				var source = window.location.href;
				source = source.substr(source.lastIndexOf('/'));
				source = source.substr(0,source.indexOf('?'));
				
				if(useStrOnly)
                                {
 					console.log("%c" + type + "-Priority" +  
 							":\t " + Debug.lastLog + " from " + source + ":\n" +
 							Debug.lastLogger + "::\t" + str,							 
 							num == 0?"color:#F30;"	//chrome/firefox allow css styling
 									:(num == 1?"color:#F70" //warn
 											:(num < 99?"color:#092":"color:#333")));
                                }
				else
				{
					var consoleArguments = [];
					consoleArguments.push("%c" + type + "-Priority" +  
						":\t " + Debug.lastLog + " from " + source + ":\n" +
						Debug.lastLogger + "::\t");					
					consoleArguments.push(num == 0?"color:#F30;"	//chrome/firefox allow css styling
							:(num == 1?"color:#F70" //warn
									:(num < 99?"color:#092":"color:#333"))); 

					for(var i=0;i<argsInStr;++i)			 
						consoleArguments.push(arguments[i]);
					
					//pass arguments using special apply for arg consistency
					console.log.apply(null,consoleArguments);
				}
//					console.log("%c" + type + "-Priority" +  
//						":\t " + Debug.lastLog + " from " + source + ":\n" +
//						Debug.lastLogger + "::\t",							 
//						num == 0?"color:#F30;"	//chrome/firefox allow css styling
//								:(num == 1?"color:#F70" //warn
//										:(num < 99?"color:#092":"color:#333")),
//										 arguments); 
				Debug.lastLog = str;
				Debug.lastLogger = ""; //clear for next

				if(num < 4) //show all high priorities as popup!
					Debug.errorPop(str,num);
			}

			/////////////////////////////////
			//localCallOutDebugLocales ~~
			//	add call out labels to file [line] text blobs
			//	returns undefined if no change
			function localCallOutDebugLocales(str)
			{
				var i = 0;
				var j,k,l;
				var returnStr;
				try
				{
					while((j = str.indexOf('[',i)) > 0 && (k = str.indexOf(']',i)) > 0)
					{
						if(j < 4)
						{
							i = k+1;
							continue; //skip, too soon to be valid
						}

						//found new possible call out 
						//console.log(str.substr(j,k-j+1));

						if(!returnStr) //check if need to define for the first time
							returnStr = "";

						//look for icc, .cc and .h 
						if((str[j-3] == '.' && str[j-2] == 'h') || 
								((str[j-4] == '.' || str[j-4] == 'i') &&
										str[j-3] == 'c' && str[j-2] == 'c'))
						{
							//find beginning of blob (first non-file/c++ character)
							for(l = j-3; l >= i; --l)
								if(!((str[l] >= 'a' && str[l] <= 'z') ||  
										(str[l] >= 'A' && str[l] <= 'Z') ||
										(str[l] >= '0' && str[l] <= '9') ||
										(str[l] == '.') ||
										(str[l] == '_') ||
										(str[l] == '-') ||
										(str[l] == '/') ||
										(str[l] == ':')))								
									break; //found beginning (-1)

							++l; //increment to first character of blob


							//previous chunk								
							returnStr += str.substr(i,l-i);

							//add label
							returnStr += "<br><label class='" + 
									Debug._errBoxId + "-localCallOut'>";								

							//add callout
							returnStr += str.substr(l,k+1-l);

							//add end label
							returnStr += "</label><br>";

							//skip any tabs and new lines (so that the next content is right below line #)
							while(k+1 < str.length && 
									(str[k+1] == '\n' || str[k+1] == '\t')) ++k;								

						}
						else //not a call out so grab previous chunk
							returnStr += str.substr(i,k+1-i);

						i = k+1;						
					}
				}
				catch(e)
				{
					return undefined; //give up on errors
				}


				if(returnStr) //finish last chunk
					returnStr += str.substr(i);	


				return returnStr; //if untouched, undefined return
			}
		}; //end Debug.log()
	} //end Debug normal

}
else	//IF DEBUG MODE IS OFF!
{	//do nothing with log functions
	console.log = function(){};
	Debug.log 	= function(){};
	Debug.logv 	= function(){};
	Debug.err 	= function(){};
	Debug.warn 	= function(){};
	Debug.info 	= function(){};
	Debug.med 	= function(){};
}


// living and breathing examples:
Debug.log("Debug mode is on at level: " + Debug.level);
Debug.log("This is an example for posterity that is not printed due to debug priority.",Debug.level+1);



//=====================================================================================
//=====================================================================================
//Error pop up helpers

Debug._errBox = 0;
Debug._errBoxId = "Debug-error-box";
Debug._errBoxOffX = 0;
Debug._errBoxOffY = 0;
Debug._errBoxOffW = 0;
Debug._errBoxOffH = 0;


Debug._ERR_TRUNCATION_LENGTH = 10000;

//=====================================================================================
//Note: effectively doing this: str.replace(/\n/g , "<br>").replace(/\t/g,"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
//	...but str.replace() was really slowing down everything on big strings
Debug.errorPopConditionString = function(str) {
	var rstr = "";
	
	for(var i=0;i<str.length && i<Debug._ERR_TRUNCATION_LENGTH; ++i)
		if(str[i] == '\n')
			rstr += "<br>";
		else if(str[i] == '\t')
			rstr += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
		else
			rstr += str[i];
	if(str.length > Debug._ERR_TRUNCATION_LENGTH)
		rstr += "...&lt;&lt;&lt; MESSAGE TRUNCATED &gt;&gt;&gt;";
	
	return rstr; 
} //end errorPopConditionString()

//=====================================================================================
//Show the error string err in the error popup on the window
// create error div if not yet created
Debug.errorPop = function(err,severity) 
{
			
	var errBoxAlpha = "1.0";
	
	//check if Debug._errBox has been set
	if(!Debug._errBox)
	{	
		//check if there is already an error box with same id and share
		var el = document.getElementById(Debug._errBoxId);
		if(!el) //element doesn't already exist, so we need to create the element
		{
			var body = document.getElementsByTagName("BODY")[0];
			if(!body) //maybe page not loaded yet.. so wait to report
			{
				//try again in 1 second
				window.setTimeout(function() { Debug.errorPop(err,{"DEBUG_PRIORITY":severity})}, 1000);
				return;
			}
			
			//create the element
			el = document.createElement("div");			
			el.setAttribute("id", Debug._errBoxId);
			el.style.display = "none";
			var str = "<a class='" + 
				Debug._errBoxId + 
				"-header' onclick='javascript:Debug.closeErrorPop();event.stopPropagation();' onmousemove='event.stopPropagation();'  onmouseup='event.stopPropagation();' onmousedown='event.stopPropagation();'>Close Errors</a>";
			str = 
					"<div class='" + 
					Debug._errBoxId + 
					"-moveBar' style='" +
					"position:absolute;width:100%;height:15px;top:0;left:0;background-color:rgb(191, 191, 191);cursor:move;" +
					"outline: 				none; /* to stop firefox selection*/	-webkit-user-select: 	none; /* prevent selection*/				-moz-user-select: 		none;						user-select:			none;" +
					"' " +
					"onmousedown='javascript:Debug.handleErrorMoveStart(event);event.stopPropagation();' " +
					"title='Click and drag to reposition this popup window.' " +
					"></div>" + 
					"<br>"+
					str + "<br>" + 
				"<div style='color:white;font-size:16px;padding-bottom:5px;'>" +
				"Note: Newest messages are at the top." +
				"<label style='color:white;font-size:11px;'><br>(Press [ESC] to close and [SHIFT + ESC] to re-open)</font>" +
				"<div id='downloadIconDiv' onclick='Debug.downloadMessages()' onmouseup='event.stopPropagation();' onmousedown='event.stopPropagation();' title='Download messages to text file.' style='float: right; margin: -10px 30px -100px -100px; cursor: pointer'>" +
				//make download arrow
					"<div style='display: block; margin-left: 3px; height:7px; width: 6px; background-color: white;'></div>" +
					"<div style='display: block; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid white;'></div>" +
					"<div style='position: relative; top: 5px; width: 12px; height: 2px; display: block; background-color: white;'></div>" +				
				"</div>" +
				"</div>" +
				"<div id='" + 
				Debug._errBoxId +
				"-err' class='" + 
				Debug._errBoxId +
				"-err'></div>" + 
				"<br>" + str;

			str += "<div class='" + Debug._errBoxId + "-resizeBarLeft' " +
					"style='" +
					"background-color:rgb(191, 191, 191);position:absolute;width:15px;height:15px;top:-1000px;left:0;cursor:nesw-resize;" +
					"outline: 				none; /* to stop firefox selection*/	-webkit-user-select: 	none; /* prevent selection*/				-moz-user-select: 		none;						user-select:			none;" +
					"' " +
					"onmousedown='javascript:Debug.handleErrorResizeStart(event,1,1);event.stopPropagation();' " +
					"title='Click and drag to resize vertically this popup window.' " +
					"></div>";
			str += "<div class='" + Debug._errBoxId + "-resizeBar' " +
					"style='" +
					"background-color:transparent;position:absolute;width:100%;height:5px;top:-1000px;left:15px;cursor:ns-resize;" +
					"outline: 				none; /* to stop firefox selection*/	-webkit-user-select: 	none; /* prevent selection*/				-moz-user-select: 		none;						user-select:			none;" +
					"' " +
					"onmousedown='javascript:Debug.handleErrorResizeStart(event);event.stopPropagation();' " +
					"title='Click and drag to resize this popup window.' " +
					"></div>";
			str += "<div class='" + Debug._errBoxId + "-resizeBarRight' " +
					"style='" +
					"background-color:rgb(191, 191, 191);position:absolute;width:15px;height:15px;top:-1000px;left:0;cursor:nwse-resize;" +
					"outline: 				none; /* to stop firefox selection*/	-webkit-user-select: 	none; /* prevent selection*/				-moz-user-select: 		none;						user-select:			none;" +
					"' " +
					"onmousedown='javascript:Debug.handleErrorResizeStart(event,1);event.stopPropagation();' " +
					"title='Click and drag to resize this popup window.' " +
					"></div>";
			el.innerHTML = str;
			body.appendChild(el); //add element to body of page
			el.focus();
			el.onmousemove = function(){		
				//console.log("mm");
				DesktopContent.mouseMove(event,true /*onlyDesktopFunction*/); //allow only desktop movement functionality
				
				//if doing some resize or movement, then stop blocking event propagation
				if(Debug._errBoxOffResizeStartY == -1 && 
						Debug._errBoxOffMoveStartX == -1 && 
						Debug._errBoxOffResizeStartX == -1)
					event.stopPropagation();
			}
			el.onmousedown = function(){console.log("debug down"); event.stopPropagation();}
			el.onmouseup = function(){console.log("debug up"); event.stopPropagation();}
			
			/////////////
			function localDebugKeyDownListener(e)
			{
				//Debug.log("Debug keydown c=" + keyCode + " " + c + " shift=" + e.shiftKey + 
				//		" ctrl=" + e.ctrlKey + " command=" + _commandKeyDown);
				
				if(!e.shiftKey && e.keyCode == 27) //ESCAPE key, close popup
				{
					e.preventDefault();
					e.stopPropagation();
					Debug.closeErrorPop();										
				}
				else if(e.shiftKey && e.keyCode == 27) //SHIFT+ESCAPE key, bring back popup
				{
					e.preventDefault();
					e.stopPropagation();
					Debug.bringBackErrorPop();										
				}
			} //end localDebugKeyDownListener()
			
			document.body.removeEventListener("keydown",localDebugKeyDownListener);
			document.body.addEventListener("keydown",localDebugKeyDownListener);							
			
			
			//add style for error to page HEAD tag			
			var css = "";

			//give undefined things monopsace type
			css += "#" + Debug._errBoxId + " *" +
					"{font-family: 'Comfortaa', arial;" +//"{font-family: 'Inconsolata', monospace;" +
					"font-weight: 200;" +
					"font-size: 18px;" +
					"color: rgb(255,200,100);" +	
					"-webkit-user-select: 	text;" +
					"-moz-user-select: 		text;" +
					"user-select:			text;" +
					"}\n\n";

			
			//error close link style
			css += "#" + Debug._errBoxId + " a" +
					", #" + Debug._errBoxId + " center b" +
					"{color: white; text-decoration: none; font-weight: bold;" +
					"font-size: 18px; font-family: 'Comfortaa', arial;" +
					"}\n\n";
			css += "#" + Debug._errBoxId + " a:hover" +
					"{text-decoration: underline;" +
					"cursor:pointer;" +
					"}\n\n";
			
			//error italics, underline, bold
			css += "#" + Debug._errBoxId + " i" +
					", #" + Debug._errBoxId + " u" +
					"{" +
					"font-size: 18px; font-family: 'Comfortaa', arial;" +
					"}\n\n";
			css += "#" + Debug._errBoxId + " b" +
					"{" +
					"font-weight: bold;" +
					"color: rgb(255, 231, 187);" +
					"}\n\n";
			
			//error box style
			css += "#" + Debug._errBoxId +
					"{" +
					"position: absolute; display: none; border: 2px solid gray;" +
					"background-color: rgba(153,0,51, " + errBoxAlpha + "); overflow-y: hidden;" +
					"overflow-x: hidden;	padding: 5px; -moz-border-radius: 2px;" +
					"-webkit-border-radius: 2px;	border-radius: 2px;" +
					"font-size: 18px; z-index: 2147483647;" + //max 32 bit number z-index
					"font-family: 'Comfortaa', arial; text-align: center;" +
					"left: 8px; top: 8px; margin-right: 8px; " +
					"}\n\n";			

			//error box err text style
			css += "#" + Debug._errBoxId + "-err" +
					"{" +					
					"color: rgb(255,200,100); font-size: 18px;" +
					"font-family: 'Comfortaa', arial;" +
					"left: 8px; top: 8px; margin-right: 8px;" +
					"margin-bottom:-12px;" +
					"text-align: left;" +
					"overflow-y: scroll;" +
					"overflow-x: auto;" +
					"width: 100%;" +
					"-webkit-user-select: 	text;" +
					"-moz-user-select: 		text;" +
					"user-select:			text;" +
					"}\n\n";
			
			css += "#" + Debug._errBoxId + "-err i" +
					//",#" + Debug._errBoxId + "-err b" + 
					",#" + Debug._errBoxId + "-err u" + 
					//",#" + Debug._errBoxId + "-err div" + 
					"{" +					
					"color: rgb(255,200,100); font-size: 18px;" +
					"font-family: 'Comfortaa', arial;" +				
					"text-align: left;" +
					"-webkit-user-select: 	text;" +
					"-moz-user-select: 		text;" +
					"user-select:			text;" +
					"}\n\n";

			css += //"#" + Debug._errBoxId + "-err i" +
					//",#" + Debug._errBoxId + "-err b" + 
					//",#" + Debug._errBoxId + "-err u" + 
					"#" + Debug._errBoxId + "-err div" + 
					"{" +					
					"color: rgb(255,200,100); font-size: 18px;" +
					"font-family: 'Comfortaa', arial;" +
					"left: 8px, top: 8px; margin-right: 8px;" +
					"text-align: left;" +
					"-webkit-user-select: 	text;" +
					"-moz-user-select: 		text;" +
					"user-select:			text;" +
					"}\n\n";
			
			css += "#" + Debug._errBoxId + "-err b" +
					"{" +					
					"color: rgb(255,225,200); font-size: 18px;" +
					"font-family: 'Comfortaa', arial;" +
					"text-align: left;" +
					"-webkit-user-select: 	text;" +
					"-moz-user-select: 		text;" +
					"user-select:			text;" +
					"}\n\n";

			css += "#" + Debug._errBoxId + " ." + Debug._errBoxId + "-localCallOut" + 
					"{font-size: 10px;}\n\n";//color: rgb(191, 185, 193);}\n\n";

			//add style element to HEAD tag
			var style = document.createElement('style');

			if (style.styleSheet) {
			    style.styleSheet.cssText = css;
			} else {
			    style.appendChild(document.createTextNode(css));
			}

			document.getElementsByTagName('head')[0].appendChild(style);

			window.removeEventListener("resize",localResize);
			window.removeEventListener("scroll",localScroll);
			window.removeEventListener("mouseup",Debug.handleErrorMoveStop);
			window.removeEventListener("mousemove",Debug.handleErrorMove);
			window.addEventListener("resize",localResize);
			window.addEventListener("scroll",localScroll);
			window.addEventListener("mouseup",Debug.handleErrorMoveStop);
			window.addEventListener("mousemove",Debug.handleErrorMove);
		}
		Debug._errBox = el;	
	}	
	
	//have error popup element now, so fill it with new error
	
	var el = document.getElementById(Debug._errBoxId + "-err");
	var str = el.innerHTML; //keep currently displayed errors				
	var d = new Date();
	var wasAlreadyContent = false;
	
	//add new err to top of errors
	if(str.length)
		wasAlreadyContent = true;
	
	var tstr = d.toLocaleTimeString();
	tstr = tstr.substring(0,tstr.lastIndexOf(' ')) + //convert AM/PM to am/pm with no space
			(tstr[tstr.length-2]=='A'?"am":"pm");
	
	if(severity == Debug.TIP_PRIORITY.DEBUG_PRIORITY) //put oldest at top so it reads like a document
		str = str + 
			(wasAlreadyContent?"<br>...<br>":"") +
			"<label style='color:white;font-size:16px;'>" + 
			d.toLocaleDateString() +
			" " + tstr + " (Tip) :</label><br>" +
			Debug.errorPopConditionString(err);	
	else //normally put newest at top since likely highest priority
		str = "<label style='color:white;font-size:16px;'>" + 
		    d.toLocaleDateString() +
		    " " + tstr + " " +
		    (severity == Debug.INFO_PRIORITY.DEBUG_PRIORITY ? '(Info)':'')+
		    (severity == Debug.WARN_PRIORITY.DEBUG_PRIORITY ? '(Warning)':'') +
		    ":</label><br>" +
		    Debug.errorPopConditionString(err) + 
		    (wasAlreadyContent?"<br>...<br>":"") +
		    str;

	el.innerHTML = str;

	//show the error box whereever the current scroll is
	function localResize()
	{
		Debug._errBoxOffX = 0;
		Debug._errBoxOffY = 0;
		Debug._errBoxOffH = 0;
		Debug._errBoxOffW = 0;
		Debug.handleErrorResize();
	} 
	function localScroll()
	{
		Debug.handleErrorResize();
	}
	Debug.handleErrorResize(); //first size
	
	
	Debug._errBox.style.display = "block";
	
	//change color based on info
	
	var els = document.getElementsByClassName(Debug._errBoxId + "-header");
	el = els[0];
	switch(severity)
	{
	case Debug.TIP_PRIORITY.DEBUG_PRIORITY:
		//don't change color or header for info, if there are still errors displayed
	if(wasAlreadyContent && 
			(el.innerHTML == "Close Errors" ||
					el.innerHTML == "Close Warnings" ||
					el.innerHTML == "Close Info"))
			return;
		el.innerHTML = "Close Tooltip";		
		Debug._errBox.style.backgroundColor = "rgba(0, 49, 99, " + errBoxAlpha + ")";//"rgba(0, 79, 160, " + errBoxAlpha + ")";	
		break;
	case Debug.INFO_PRIORITY.DEBUG_PRIORITY:
		//don't change color or header for info, if there are still errors displayed
		if(wasAlreadyContent && 
				(el.innerHTML == "Close Errors" ||
						el.innerHTML == "Close Warnings"))
			return;
		el.innerHTML = "Close Info";		
		Debug._errBox.style.backgroundColor = "rgba(0,153,51, " + errBoxAlpha + ")";
		break;
	case Debug.WARN_PRIORITY.DEBUG_PRIORITY:
		//don't change color or header for info, if there are still errors displayed
		if(wasAlreadyContent && 
				el.innerHTML == "Close Errors")
			return;
		el.innerHTML = "Close Warnings";		
		Debug._errBox.style.backgroundColor = "rgba(160, 79, 0, " + errBoxAlpha + ")";	
		break;
	default: //Debug.HIGH_PRIORITY
		el.innerHTML = "Close Errors";
		Debug._errBox.style.backgroundColor = "rgba(153,0,51, " + errBoxAlpha + ")";
	}
	els[1].innerHTML = el.innerHTML;	
} //end errorPop()

Debug._errBoxLastContent = "";
//=====================================================================================
//Close the error popup on the window
Debug.closeErrorPop = function() 
{
	document.getElementById(Debug._errBoxId).style.display = "none";
	Debug._errBoxLastContent = document.getElementById(Debug._errBoxId + "-err").innerHTML;
	document.getElementById(Debug._errBoxId + "-err").innerHTML = ""; //clear string
}
//=====================================================================================
//Bring the error popup back
Debug.bringBackErrorPop = function() 
{
	document.getElementById(Debug._errBoxId + "-err").innerHTML = Debug._errBoxLastContent; //bring back string
	document.getElementById(Debug._errBoxId).style.display = "block";
}


Debug._errBoxOffMoveStartX = -1;
Debug._errBoxOffMoveStartY;
Debug._errBoxOffResizeStartX = -1;
Debug._errBoxOffResizeStartY = -1;
//=====================================================================================
Debug.handleErrorMoveStart = function(e) 
{
	Debug.log("Move Start");
	Debug._errBoxOffMoveStartX = e.screenX - Debug._errBoxOffX;
	Debug._errBoxOffMoveStartY = e.screenY - Debug._errBoxOffY;
}

//=====================================================================================
Debug.handleErrorResizeStart = function(e,resizeW,moveLeft) 
{
	Debug.log("Resize Start");
	Debug._errBoxOffResizeStartY = e.screenY - Debug._errBoxOffH;
	if(moveLeft)
	{
		Debug._errBoxOffMoveStartX = e.screenX - Debug._errBoxOffX;
		Debug._errBoxOffResizeStartX = e.screenX + Debug._errBoxOffW;
	}
	else if(resizeW)
		Debug._errBoxOffResizeStartX = e.screenX - Debug._errBoxOffW;
	
} //end handleErrorResizeStart()

//=====================================================================================
Debug.handleErrorMoveStop = function(e) 
{	
	if(Debug._errBoxOffResizeStartY != -1) //resize stop
	{
		Debug.log("Resize Stop");		
		Debug._errBoxOffH = e.screenY - Debug._errBoxOffResizeStartY;
		Debug._errBoxOffResizeStartY = -1; //done with resize

		if(Debug._errBoxOffMoveStartX != -1) //resize from left
		{
			Debug._errBoxOffX = e.screenX - Debug._errBoxOffMoveStartX;
			Debug._errBoxOffW = Debug._errBoxOffResizeStartX - e.screenX;
			Debug._errBoxOffMoveStartX = -1; //done with resize
			Debug._errBoxOffResizeStartX = -1; //done with resize
		}
		else if(Debug._errBoxOffResizeStartX != -1) //resize from right
		{
			Debug._errBoxOffW = e.screenX - Debug._errBoxOffResizeStartX;
			Debug._errBoxOffResizeStartX = -1; //done with resize
		}
		Debug.handleErrorResize();
	}	
	else if(Debug._errBoxOffMoveStartX != -1) //move stop
	{
		Debug.log("Move Stop");
		Debug._errBoxOffX = e.screenX - Debug._errBoxOffMoveStartX;
		Debug._errBoxOffY = e.screenY - Debug._errBoxOffMoveStartY;
		Debug._errBoxOffMoveStartX = -1; //done with move
		Debug.handleErrorResize();
	}		
		
} //end handleErrorMoveStop()

//=====================================================================================
Debug.handleErrorMove = function(e) {
	//console.log("moving",e);
	
	if(Debug._errBoxOffMoveStartX == -1 &&
			Debug._errBoxOffResizeStartY == -1) return; //do nothing, not moving
	
	if(e.buttons == 0) 
	{
		Debug._errBoxOffMoveStartX = -1; //done with move
		Debug._errBoxOffResizeStartY = -1; //done with resize
		Debug._errBoxOffResizeStartX = -1; //done with resize
		return;
	}

	if(Debug._errBoxOffResizeStartY != -1) //resizing
	{
		Debug.log("Resize " + e.buttons);
		Debug._errBoxOffH = e.screenY - Debug._errBoxOffResizeStartY;

		if(Debug._errBoxOffMoveStartX != -1) //resize from left
		{
			Debug._errBoxOffX = e.screenX - Debug._errBoxOffMoveStartX;
			Debug._errBoxOffW = Debug._errBoxOffResizeStartX - e.screenX;
		}
		else if(Debug._errBoxOffResizeStartX != -1) //resize from right
			Debug._errBoxOffW = e.screenX - Debug._errBoxOffResizeStartX;

		Debug.handleErrorResize();
	}
	else if(Debug._errBoxOffMoveStartX != -1) //moving
	{
		Debug.log("Move " + e.buttons);
		Debug._errBoxOffX = e.screenX - Debug._errBoxOffMoveStartX;
		Debug._errBoxOffY = e.screenY - Debug._errBoxOffMoveStartY;
		Debug.handleErrorResize();
	}
		
} //end handleErrorMove()

//=====================================================================================
Debug.handleErrorResize = function() 
{

	
	var offX = document.documentElement.scrollLeft || document.body.scrollLeft || 0;
	var offY = document.documentElement.scrollTop || document.body.scrollTop || 0;
	var w;
	var screenh;
	
	//and, set width properly so error box is scrollable for long winded errors
	if(typeof DesktopContent != 'undefined') //define width using DesktopContent
	{
		w = (DesktopContent.getWindowWidth()-16-14); //scroll width is 14px
		screenh = (DesktopContent.getWindowHeight()-16-14);
	}
	else if(typeof Desktop != 'undefined' && Desktop.desktop) //define width using Desktop
	{
		w = (Desktop.desktop.getDesktopWidth()-16-14); //scroll width is 14px
		screenh = (Desktop.desktop.getDesktopHeight()-16-14); 
	}
	
	var screenw = w;
	var minx = 0;
	
	if(w > 900) //clip to 850 and center (for looks)
	{
		offX += (w-850)/2;
		minx = -(w-850)/2;
		w = 850;
	}	
	
	if(w + Debug._errBoxOffW  < 200) //clip to minimum width
	{
		Debug._errBoxOffW = 200 - w;
	}
	w += Debug._errBoxOffW;
	
	var h = (screenh - 20) + Debug._errBoxOffH;
	if(h < 200) //clip to minimum height
	{
		Debug._errBoxOffH = -200;
		h = 200;
	}

	//keep window on screen
	if(Debug._errBoxOffX + w > screenw)
		Debug._errBoxOffX = screenw - w;	
	if(Debug._errBoxOffX < minx)
		Debug._errBoxOffX = minx;
	if(Debug._errBoxOffY + h > screenh)
		Debug._errBoxOffY = screenh - h;	
	if(Debug._errBoxOffY < 0)
		Debug._errBoxOffY = 0;
	
	Debug._errBox.style.width = (w) + "px";	
	Debug._errBox.style.height = (h) + "px";
	Debug._errBox.style.left = (Debug._errBoxOffX + offX + 8) + "px";
	Debug._errBox.style.top = (Debug._errBoxOffY + offY + 8) + "px";
	Debug._errBox.style.marginRight = -(w+10) + "px"; //more for border effects to avoid causing scroll
	Debug._errBox.style.marginBottom = -(h+80) + "px"; //more for border effects to avoid causing scroll

	
	var el = document.getElementsByClassName(Debug._errBoxId + "-resizeBar")[0];
	el.style.top = (h+6) + "px";	
	el = document.getElementsByClassName(Debug._errBoxId + "-resizeBarLeft")[0];	
	el.style.top = (h+6-10) + "px";
	el = document.getElementsByClassName(Debug._errBoxId + "-resizeBarRight")[0];	
	el.style.left = (w-5) + "px";
	el.style.top = (h+6-10) + "px";

	el = document.getElementsByClassName(Debug._errBoxId + "-err")[0];
	el.style.height = (h-115) + "px";
} //end handleErrorResize()


//=====================================================================================
Debug.downloadMessages = function() {
	
	console.log("downloading messages...");
	
	//create CSV data string from html table
	var dataStr = "data:text/txt;charset=utf-8,";
	
	var lines = Debug._errBox.innerText.split('\n');
	for(var i=2;i<lines.length-2;++i)
	{
		dataStr += encodeURIComponent(lines[i] + "\n"); //encoded \n
	}
	
	var link = document.createElement("a");
	link.setAttribute("href", dataStr); //double encode, so encoding remains in CSV
	link.setAttribute("style", "display:none");
	link.setAttribute("download", "otsdaq_Messages_download.txt");
	document.body.appendChild(link); // Required for FF

	link.click(); // This will download the data file named "otsdaq_Messages_download.txt"

	link.parentNode.removeChild(link);
	
} //end Debug.downloadMessages 

