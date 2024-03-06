//=====================================================================================
//
//	Created Dec, 2012
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	DesktopDashboard.js
//
//	This is the desktop code for the user interface for ots. ots is the DAQ
// 		and control software for the Fermi Strips Telescope.
//
//	The desktop consists of a dashboard and an arbitrary amount of windows
//
//=====================================================================================


if (typeof Debug == 'undefined') 
	console.log('ERROR: Debug is undefined! Must include Debug.js before Desktop.js');
	
if (typeof Desktop == 'undefined') 
	console.log('ERROR: Desktop is undefined! Must include Desktop.js before DesktopDashboard.js');
else 
{

		
	////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////
	//define Desktop.createDashboard to return dashboard class	
	////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////
	Desktop.createDashboard = function(z)
	{
		if(false === (this instanceof Desktop.createDashboard)) 
		{
			//here to correct if called as "var v = Desktop.createDesktop();"
			//	instead of "var v = new Desktop.createDesktop();"
	        return new Desktop.createDashboard(z);
	    }
        
        

    	//------------------------------------------------------------------
    	//list of members functions ----------------------
    	//------------------------------------------------------------------
    	//private:
    	//public:
        	//displayConnectionStatus(connected) //bool connected
        
        
        
        
        
        
        //------------------------------------------------------------------
		//create private members variables ----------------------
		//------------------------------------------------------------------
        var _defaultDashboardColor = "rgb(0,40,85)";
		
		
		
		//all units in pixels unless otherwise specified
		
		var _defaultDashboardHeight = 38;
		var _defaultWindowDashboardWidth = 200;
		var _defaultWindowDashboardMinWidth = 50;

        Debug.log("Setup Dashboard based on window.parent.window.location.hash=" + 
        		window.parent.window.location.hash,
        		Debug.MED_PRIORITY);
        
        var _urlHashVal = (window.parent.window.location.hash && window.parent.window.location.hash.length>1)?
        		(window.parent.window.location.hash.substr(1)|0):
				undefined;
        var _windowDashboardWidth = ((_urlHashVal|0) > 1)? 
				((_urlHashVal | 0)*_defaultWindowDashboardWidth/1000):
				_defaultWindowDashboardWidth;        
        var _displayWindowDashboard = //default window dashboard view
        		(_urlHashVal === undefined)?1:(_urlHashVal?1:0); 
        
        var _windowDashboard,_topBar,_showDesktopBtn,_fullScreenBtn,_fullScreenRefreshBtn;
        
        var _windowDashboardWindowCSSRule;  //e.g. _var.style.width = "100px"
        
        var _layoutDropDownDisplayed = false;
		var _layoutMenuItems = [];
		var numOfUserLayouts = 5;
		var numOfSystemLayouts = 5;
		for(var i=0;i<numOfSystemLayouts;++i)
			_layoutMenuItems.push("System Preset-" + (i+1));
		_layoutMenuItems.push("---");
		for(var i=0;i<numOfUserLayouts;++i)
			_layoutMenuItems.push("User Preset-" + (i+1));
        
        var _dashboardElement, _dashboardColorPostbox;
        
        var _deepClickTimer = 0;
		//------------------------------------------------------------------
		//create public members variables ----------------------
		//------------------------------------------------------------------
		this.dashboardElement;
        

		
		//------------------------------------------------------------------
		//create PRIVATE members functions ----------------------
		//------------------------------------------------------------------

      	//=====================================================================================
		var _toggleWindowDashboard = function(event,setValue) 
		{        	
        	
        	if(setValue !== undefined)
        		_displayWindowDashboard = setValue;
        	else //toggle
        		_displayWindowDashboard = !_displayWindowDashboard;

        	_setDashboardWidth(); //undefined to keep width and save status to URL
        	
			// var newURL = window.parent.window.location.pathname +
			// 						window.parent.window.location.search +
			// 						"#"+
			// 						(_displayWindowDashboard?"1":"0"); 
			
			// //update browser url so refresh will give same desktop experience
			// if(!Desktop.isWizardMode()) 
			// 	window.parent.window.history.replaceState('ots', 'ots', newURL);    
			// else
			// 	window.parent.window.history.replaceState('ots wiz', 'ots wiz', newURL);
			
            _windowDashboard.style.display = _displayWindowDashboard?"inline":"none";
            Desktop.desktop.redrawDesktop();
        } //end _toggleWindowDashboard()
        
      	//=====================================================================================
        // w undefined will leave width unchanged
        var _setDashboardWidth = function(w) 
        { 
			Debug.logv({w});
			Debug.logv({_windowDashboardWidth});
        	// console.log("_setDashboardWidth",w);       
        	// console.log("_setDashboardWidth _windowDashboardWidth",_windowDashboardWidth);  	
        	if(w !== undefined)
        	{
        		_windowDashboardWidth = w|0;         	
        	}
        	//else dont change, but always keep min
        	
    		if(_windowDashboardWidth < _defaultWindowDashboardMinWidth)
    			_windowDashboardWidth = _defaultWindowDashboardMinWidth;   
        	
        	//save as integer fraction of 1000 into URL
        	var newURL = window.parent.window.location.pathname +
        			window.parent.window.location.search +
					"#"+
					(_displayWindowDashboard?
						((_windowDashboardWidth*1000/_defaultWindowDashboardWidth)|0):
						"0"); 

        	//update browser url so refresh will give same desktop experience
        	if(!Desktop.isWizardMode()) 
        		window.parent.window.history.replaceState('ots', 'ots', newURL);    
        	else
        		window.parent.window.history.replaceState('ots wiz', 'ots wiz', newURL); 
        	
        	Desktop.desktop.redrawDesktop();
        	
        } //end setDashboardWidth()

      	//=====================================================================================
		//_refreshTitle() ~~~
		//	private function to refresh title name based on dashboard size
		// 	clip text if too long
		var _refreshTitle = function() 
		{
		
			var el,winIndex;
			var hdrW = _windowDashboardWidth - 14; //2*7px padding
			for(var i=0;i<Desktop.desktop.getNumberOfWindows();++i) {
				el = document.getElementById('DesktopDashboard-windowDashboard-win'+i);
				winIndex = document.getElementById('DesktopDashboard-windowDashboard-winIndex'+i).innerHTML;
				el.innerHTML = Desktop.desktop.getWindowNameByIndex(winIndex) + 
					(Desktop.desktop.getWindowSubNameByIndex(winIndex)==""?"":" - ") +
                    Desktop.desktop.getWindowSubNameByIndex(winIndex);
				while(el.scrollWidth > hdrW && el.innerHTML.length > 4)
					el.innerHTML = el.innerHTML.substr(0,el.innerHTML.length-4)+"...";
				
				el.innerHTML += "<div class='hiddenDiv' " +  //add hidden window index back in for future use
                    "id='DesktopDashboard-windowDashboard-winIndex"+i+"'>"+ winIndex + "</div>";
            }
		} //end _refreshTitle()

      	//=====================================================================================
        var _redrawDashboard = function() 
        {            
            
            _topBar.style.left = Desktop.desktop.getDesktopX()+"px";
            _topBar.style.top = Desktop.desktop.getDesktopY()+"px";
            _topBar.style.width = Desktop.desktop.getDesktopWidth()+"px";
            _topBar.style.height = _defaultDashboardHeight+"px";
            
            _windowDashboard.style.left = Desktop.desktop.getDesktopX()+"px";
            _windowDashboard.style.top = Desktop.desktop.getDesktopY()+_defaultDashboardHeight+"px";
            _windowDashboard.style.width = _windowDashboardWidth+"px";
            _windowDashboardWindowCSSRule.style.width = (_windowDashboardWidth-34)+"px"; //2*7px padding, 2*10px margin
            _refreshTitle();
            _windowDashboard.style.height = Desktop.desktop.getDesktopHeight()-(Desktop.desktop.getDesktopY()+_defaultDashboardHeight)+"px";
            
        } //end _redrawDashboard()

      	//=====================================================================================
        //get CSS style rule fpr dasboard window boxes
        var _getDashboardWindowWidthCSSRule = function() 
        {
            
	        var i,j;
	        for(i=0;i<document.styleSheets.length;++i) {
	        	Debug.log(document.styleSheets[i].href);
	        	if(document.styleSheets[i].href && document.styleSheets[i].href.split('/').pop() == 
	        			"Desktop.css") {
	        		for(j=0;j<document.styleSheets[i].cssRules.length;++j) {
	        			if(document.styleSheets[i].cssRules[j].selectorText ==
	        					"#Desktop .DesktopDashboard-windowDashboard-win")
	        				return document.styleSheets[i].cssRules[j]; //success!!
	        		}
	        		break; //failed
	        	}	        		
	        }
	        if(i == document.styleSheets.length) Debug.log("FAIL -- Could not locate CSS Rule for Dashboard Window.",Debug.HIGH_PRIORITY);
	        return 0;
		} //end _getDashboardWindowWidthCSSRule()
		
				
		//==============================================================================
		//tile the desktop windows in various ways
        var _windowOrganizeMode = -1;
        var _windowOrganizeModeTimeout = 0;
		var _windowDashboardOrganize = function() 
		{
		
			//reset mode after 10 seconds
			clearTimeout(_windowOrganizeModeTimeout);
			_windowOrganizeModeTimeout = setTimeout(function() {_windowOrganizeMode = -1; Debug.log("Reseting _windowOrganizeMode.");},10000);

			
			var win;
			
			var dx = Desktop.desktop.getDesktopContentX(), dy = Desktop.desktop.getDesktopContentY(),
				dw = Desktop.desktop.getDesktopContentWidth(), dh = Desktop.desktop.getDesktopContentHeight();
			var xx, yy;

			var numOfWindows = Desktop.desktop.getNumberOfWindows();
			
			//cycle through different modes where the various windows get a bigger spot
			if(++_windowOrganizeMode < 0 || _windowOrganizeMode > numOfWindows)
				_windowOrganizeMode = 0; //wrap-around
			
			//for all modes, except 0, add a spot
			// and allow that window to use the first two spots
			if(_windowOrganizeMode && numOfWindows > 1)
				++numOfWindows;
			
			if(1) //tile code
			{
				var rows = 1;
				var ww = Math.floor(dw/numOfWindows);
				var wh = dh;
				
				while(ww*2 < wh) 
				{				
					//Debug.log("Desktop Dashboard Organize " + ww + " , " + wh,Debug.LOW_PRIORITY);
					ww = Math.floor(dw/Math.ceil(numOfWindows/++rows)); wh = Math.floor(dh/rows);				
				}  //have too much height, so add row
				xx = dx; yy = dy;
				//Debug.log("Desktop Dashboard Organize " + ww + " , " + wh,Debug.LOW_PRIORITY);
				var cols = Math.ceil(numOfWindows/rows);
				Debug.log("Desktop Dashboard Organize r" + rows + " , c" + cols,Debug.LOW_PRIORITY);
						
				
				//we know size, now place windows

				
				Desktop.desktop.lastTileWinPositions = {}; //reset, if windows are tiled, this map will be updated with wid => x,y,w,h of each window
				

				//first the bigger one
				var ic = 0; //counter for new row
				if(_windowOrganizeMode && numOfWindows > 1)
				{
					var i = _windowOrganizeMode-1; //target window index
					
					win = Desktop.desktop.getWindowByIndex(i);
							//document.getElementById('DesktopDashboard-windowDashboard-winIndex'+i).innerHTML);

					if(win.isMinimized()) win.unminimize();
					if(win.isMaximized()) win.unmaximize();
					
					//make double wide
					win.setWindowSizeAndPosition(xx,yy,ww*2,wh);	
					Desktop.desktop.lastTileWinPositions[win.getWindowId()] = [xx,yy,ww*2,wh];					

					xx += ww*2;
					ic+=2;
					if((ic)%cols==0){xx = dx; yy += wh;} //start new row	
					//					Debug.log("Desktop Dashboard Organize i:" + i + " - " + (ic)%cols + " -  " 
					//							+ xx + " , " + yy + " :: "
					//							+ ww*2 + " , " + wh,Debug.LOW_PRIORITY);
				}
				
				//now the other windows
				for(var i=0;i<Desktop.desktop.getNumberOfWindows();++i) 
				{							
					if(_windowOrganizeMode && numOfWindows > 1 && i == _windowOrganizeMode-1) 
						continue; //skip the window already placed
										
					win = Desktop.desktop.getWindowByIndex(i);
						//document.getElementById('DesktopDashboard-windowDashboard-winIndex'+i).innerHTML);

					if(win.isMinimized()) win.unminimize();
					if(win.isMaximized()) win.unmaximize();

					//if last window fill remaining space rows*cols > numOfWindows
					if(i == Desktop.desktop.getNumberOfWindows()-1) 
					{
						win.setWindowSizeAndPosition(xx,yy,ww*(1 + (rows*cols - numOfWindows)),wh);
						Desktop.desktop.lastTileWinPositions[win.getWindowId()] = [xx,yy,ww*(1 + (rows*cols - numOfWindows)),wh];	
					}
					else
					{
						win.setWindowSizeAndPosition(xx,yy,ww,wh);
						Desktop.desktop.lastTileWinPositions[win.getWindowId()] = [xx,yy,ww,wh];	
					}
										
					xx += ww;
					if((++ic)%cols==0){xx = dx; yy += wh;} //start new row			
					//					Debug.log("Desktop Dashboard Organize i:" + i + " - " + (ic)%cols + " -  " 
					//							+ xx + " , " + yy + " :: "
					//							+ ww + " , " + wh,Debug.LOW_PRIORITY);	
				}
				Desktop.desktop.redrawDashboardWindowButtons();				
			}
			
			Debug.log("Desktop Dashboard Organize Mode: ",
				_windowOrganizeMode,
				Desktop.desktop.lastTileWinPositions);
		} //end _windowDashboardOrganize()
		
		//==============================================================================
		var _windowDashboardMinimizeAll = function() 
		{
				var win;
				for(var i=0;i<Desktop.desktop.getNumberOfWindows();++i) 
				{
					win = Desktop.desktop.getWindowByIndex(i);
					win.minimize();	if(!win.isMinimized()) win.minimize(); //minimize twice, in case was mazimized
				     
				}
		} //end _windowDashboardMinimizeAll()

		//==============================================================================
		var _windowDashboardRestoreAll = function() 
		{
				var win;
				for(var i=0;i<Desktop.desktop.getNumberOfWindows();++i) 
				{
					win = Desktop.desktop.getWindowByIndex(i);
					win.unminimize();
					if (win.isMaximized())
					    Desktop.desktop.setForeWindow(win);

				}
				//Desktop.desktop.setForeWindow(Desktop.desktop.getWindowByIndex(0));
		} //end _windowDashboardRestoreAll()


		//==============================================================================
		var _windowDashboardToggleWindows = function () 
		{
		   
		    
		    // if (Desktop.desktop.getForeWindow() &&
		    //	Desktop.desktop.getForeWindow().isMinimized())
		    //		_windowDashboardRestoreAll();
		    //else
		    //	_windowDashboardMinimizeAll();

		    if(_showDesktopBtn.innerHTML.indexOf(">Show Desktop</a>") !== -1)
				_windowDashboardMinimizeAll();
		    else
				_windowDashboardRestoreAll();

		    Desktop.desktop.redrawDashboardWindowButtons();
		    
		    // _showDesktopBtn.innerHTML = "<a href='#' title='Click to toggle minimize/restore all windows'>" +
			// 	((Desktop.desktop.getForeWindow() &&
			// 	  Desktop.desktop.getForeWindow().isMinimized())?"Restore Windows":"Show Desktop") + "</a>";
		} //end _windowDashboardToggleWindows()
		
		//==============================================================================
		var _windowDashboardRefresh = function() 
		{	        
		    updateWindows();
		    Debug.log("Window refreshed.");
		} //end _windowDashboardRefresh()

		//==============================================================================
		//_windowDashboardLayoutsDropDown ~
		//	toggles default layout drop down menu
		var _windowDashboardLayoutsDropDown = function()
		{		
			_layoutDropDownDisplayed = !_layoutDropDownDisplayed;
			Debug.log("Desktop _windowDashboardDefaultsDropDown " + 
					_layoutDropDownDisplayed,Debug.LOW_PRIORITY);
			
			var el;
			//remove drop down if already present
			el = document.getElementById("DesktopDashboard-defaults-dropdown");
			if(el) { //should not be any DesktopDashboard-defaults-dropdown div so delete 
			
				Debug.log("found DesktopDashboard-defaults-dropdown div and deleted",Debug.LOW_PRIORITY);
				el.parentNode.removeChild(el);
			}
			if(!_layoutDropDownDisplayed) return; //do not create if closing
			
			//create default dropdown menu element
	        el = document.createElement("div");	        
			el.setAttribute("id", "DesktopDashboard-defaults-dropdown");
        	el.style.backgroundColor = _defaultDashboardColor;
        	var str = "";
        	for(var i=0;i<_layoutMenuItems.length;++i) 
        		if(_layoutMenuItems[i] == "---") //horizontal line
        			str += "<center><hr width='75%' style='border:1px solid; margin-top:5px'/></center>";
	        	else {
	        		str += "<a href='#' onmouseup='Desktop.desktop.dashboard.windowDashboardLayoutsDropDown(); "
	        			+ "Desktop.desktop.defaultLayoutSelect("+i+"); return false;'>"
	        			+ _layoutMenuItems[i] + "</a>";
	        		
	        		str += "<a onclick='Desktop.openNewBrowserTab(" +
										"\"Desktop.openLayout(" + i + ")\",\"\"," + 
										"\"\",0 /*unique*/);' " + //end onclick
										"title='Click to open the layout in a new tab' " +
										">"
	        		str += "<img style='width:11px;margin-left:10px;' " +
							"src='/WebPath/images/dashboardImages/icon-New-Tab.png'>";
	        		str += "</a>";
	        	   
	        	   	if(i<_layoutMenuItems.length-1) 
	        	   		str += "<br/>";        		
        		}
        	
        	el.innerHTML = str;
			_dashboardElement.appendChild(el);
		} //end _windowDashboardLayoutsDropDown()
		
		//------------------------------------------------------------------
		//create PUBLIC members functions ----------------------
		//------------------------------------------------------------------
        this.getDashboardHeight = function() { return _defaultDashboardHeight;}
        this.getDashboardWidth = function() { return _displayWindowDashboard?_windowDashboardWidth:0;}
        
        
        this.setDashboardWidth 					= _setDashboardWidth;
        this.toggleWindowDashboard 				= _toggleWindowDashboard; 
        this.redrawDashboard 					= _redrawDashboard;        
        this.windowDashboardLayoutsDropDown 	= _windowDashboardLayoutsDropDown;
        this.windowDashboardOrganize 			= _windowDashboardOrganize;

      	//=====================================================================================
        this.updateWindows = function() 
        {
            
            _windowDashboard.innerHTML = "";
            
            var mySortArrId = [];
            var mySortArrIndex = [];
            for(var i=0;i<Desktop.desktop.getNumberOfWindows();++i) {
                mySortArrId.push(Desktop.desktop.getWindowByIndex(i).getWindowId());
                mySortArrIndex.push(i);
            }
            
            //sort by id
            for(var i=0;i<mySortArrId.length-1;++i) {
                var min = i;
                for(var j=i+1;j<mySortArrId.length;++j)
                    if(mySortArrId[j] < mySortArrId[min])
                        min = j;
                
                //have min, swap to i
                var tmp;
                tmp = mySortArrId[i];
                mySortArrId[i] = mySortArrId[min];
                mySortArrId[min] = tmp;
                tmp = mySortArrIndex[i];
                mySortArrIndex[i] = mySortArrIndex[min];
                mySortArrIndex[min] = tmp;
            }
            
            //have sorted by id, create window buttons for dashboard
            var tmpClassStr, defClassStr = "DesktopDashboard-windowDashboard-win";
            
            for(var i=0;i<Desktop.desktop.getNumberOfWindows();++i) {
                
                tmpClassStr = defClassStr +  //if foreground window, append class
                	((mySortArrIndex[i] == Desktop.desktop.getNumberOfWindows()-1)?
                			" DesktopDashboard-windowDashboard-foreWin":"");
                _windowDashboard.innerHTML += 
                		"<div " +
						"onmouseup='Desktop.desktop.dashboard.handleDashboardWinMouseUp(event," +
						//"onmouseup='Desktop.desktop.clickedWindowDashboard(" +
						mySortArrId[i] + ");' " + 
						"onmousedown='Desktop.desktop.dashboard.handleDashboardWinMouseDown(event," +
						//"onmouseup='Desktop.desktop.clickedWindowDashboard(" +
						mySortArrId[i] + ");' " + 
						//"onmousedown='Desktop.handleWindowButtonDown(event);' " +   //eat window button down event
						"class='" + tmpClassStr + "' " +
						"id='DesktopDashboard-windowDashboard-win"+i+"'>" +
						Desktop.desktop.getWindowNameByIndex(mySortArrIndex[i]) + " - " +
						Desktop.desktop.getWindowSubNameByIndex(mySortArrIndex[i]) +
						"<div class='hiddenDiv' " +
						"id='DesktopDashboard-windowDashboard-winIndex"+i+"'>"+ mySortArrIndex[i] + 
						"</div>" +
						"</div>\n";
            }      
            
		   	_refreshTitle();
        } //end updateWindows()        

      	//=====================================================================================
        this.redrawFullScreenButton = function() 
        {
        	_fullScreenBtn.innerHTML = "<a href='#' title='Click to toggle full screen mode for current window'>" +
        			((Desktop.desktop.getForeWindow() &&
        					Desktop.desktop.getForeWindow().isMaximized())? 
									"Exit Full Screen":"Full Screen") + "</a>"; 

        } //end redrawFullScreenButton()

      	//=====================================================================================
        this.redrawRefreshButton = function() 
        {
        	if(Debug.BROWSER_TYPE == Debug.BROWSER_TYPE_FIREFOX &&
        			Debug.OS_TYPE == Debug.OS_TYPE_LINUX) //Linux firefox
			{
				//firefox on Linux shows circle-arrow character slightly bigger than other firefox
				_fullScreenRefreshBtn.innerHTML = 
						"<div style='font-size:30px;margin-top:-9px;' title='Click to reload the desktop and all windows'>↻</div>";        	
				_fullScreenRefreshBtn.style.height = "16px";
				_fullScreenRefreshBtn.style.padding = "3px 10px 7px 10px";
			}
        	else if(Debug.BROWSER_TYPE == Debug.BROWSER_TYPE_CHROME &&
        			Debug.OS_TYPE == Debug.OS_TYPE_MAC) //Mac chrome
			{
				//chrome on Mac shows circle-arrow smaller than Windows and Linux
				_fullScreenRefreshBtn.innerHTML = 
						"<div style='font-size: 23px; margin: -5px 0 0 2px;' title='Click to reload the desktop and all windows'>↻</div>";        	
				_fullScreenRefreshBtn.style.height = "16px";
				_fullScreenRefreshBtn.style.padding = "3px 10px 7px 10px";
			}
    		else if(Debug.BROWSER_TYPE == Debug.BROWSER_TYPE_FIREFOX) //&&
    				//Debug.OS_TYPE == Debug.OS_TYPE_WINDOWS) //Windows firefox
			//As of Sept 2021: Mac firefox now shows circle-arrow bigger like windows 
    		{
    			//windows shows circle-arrow bigger
				_fullScreenRefreshBtn.innerHTML = 
						"<div style='font-size:25px;margin-top:-10px;' title='Click to reload the desktop and all windows'>↻</div>";        	
				_fullScreenRefreshBtn.style.height = "16px";
				_fullScreenRefreshBtn.style.padding = "3px 10px 7px 10px";
    		}
        	// else if(Debug.BROWSER_TYPE == Debug.BROWSER_TYPE_FIREFOX) //firefox
        	// {
        	// 	//firefox shows circle-arrow character smaller
			// 	_fullScreenRefreshBtn.innerHTML = 
			// 			"<div style='font-size:32px;margin-top:-12px;' title='Click to reload the desktop and all windows'>↻</div>";        	
			// 	_fullScreenRefreshBtn.style.height = "16px";
			// 	_fullScreenRefreshBtn.style.padding = "3px 10px 7px 10px";
        	// }
        	else //chrome
        	{
				_fullScreenRefreshBtn.innerHTML = 
						"<div style='font-size: 22px; margin: -2px 0 0 2px;' title='Click to reload the desktop and all windows'>↻</div>";        	
				_fullScreenRefreshBtn.style.height = "16px";
				_fullScreenRefreshBtn.style.padding = "3px 10px 7px 10px";
        	}
        } //end redrawRefreshButton()

      	//=====================================================================================
        this.redrawShowDesktopButton = function()
        {
        	_showDesktopBtn.innerHTML = "<a href='#' title='Click to toggle minimize/restore all windows'>" +
        			((Desktop.desktop.getForeWindow() &&
        					Desktop.desktop.getForeWindow().isMinimized())?
        							"Restore Windows":"Show Desktop") + "</a>"; 
        	//Debug.log("Desktop.desktop.getForeWindow().isMinimized() " + Desktop.desktop.getForeWindow().isMinimized());	
        }

      	//=====================================================================================
        this.getDefaultDashboardColor = function() { return _defaultDashboardColor; }

      	//=====================================================================================
        this.setDefaultDashboardColor = function(color) {
        	_defaultDashboardColor = color;
            _dashboardColorPostbox.innerHTML = _defaultDashboardColor; //set to color string
            
        	_topBar.style.backgroundColor = _defaultDashboardColor;
        	_windowDashboard.style.backgroundColor = _defaultDashboardColor;
        } //end setDefaultDashboardColor()

        var _oldUserNameWithLock = "";
        //=====================================================================================
        this.doSetUserWithLock = function() 
		{ 
        	Debug.log("doSetUserWithLock()");
        	var user = Desktop.desktop.login.getUsername();
        	var data = "";
        	data += "lock=" + ((!_oldUserNameWithLock || _oldUserNameWithLock == "")?"1":"0") + "&";
        	data += "username=" + user;
        	
        	Desktop.XMLHttpRequest(
        			"Request?RequestType=setUserWithLock&accounts=1",        			
        			data,
					Desktop.desktop.dashboard.handleSetUserWithLock);

		} //end doSetUserWithLock()
      	//=====================================================================================
        this.displayUserLock = function(usernameWithLock, el) 
        {      
        	if(!el)
        		el = document.getElementById("DesktopDashboard-userWithLock");
        	
        	var user = Desktop.desktop.login.getUsername();
        	var data = "";
        	data += "lock=" + ((!usernameWithLock || usernameWithLock == "")?"1":"0") + "&";
        	data += "username=" + user;

        	var jsReq = "Desktop.desktop.dashboard.doSetUserWithLock();";  			
       			// "Desktop.XMLHttpRequest(\"" +
				// 	"Request?RequestType=setUserWithLock&accounts=1\"," +
				// 	"\"" + data + "\",Desktop.desktop.dashboard.handleSetUserWithLock)";

       		
       		if(_oldUserNameWithLock == usernameWithLock && 
       				el.style.display == "block")
       			return; //no need to re-write element

       		
       		var str = "";       
       		
       		if(!usernameWithLock || usernameWithLock == "") 
       		{		
       			//nobody has lock      			
       			str += "<a href='javascript:" + jsReq + "'" +
       					"title='Click to lockout the system and take the ots Lock'>";
       			str += "<img " +
       					"src='/WebPath/images/dashboardImages/icon-Settings-Unlock.png'>";
       			str += "</a>";
       			el.innerHTML = str; 
       			_oldUserNameWithLock = "";    
       			el.style.display = "block";   			
       			return; 
       		}  	
       		
       		if(usernameWithLock != user) //not user so cant unlock
       			str = "<img src='/WebPath/images/dashboardImages/icon-Settings-LockDisabled.png' " +
       					"title='User " + 
       					usernameWithLock + " has the ots Lock'>"; 
       		else //this is user so can unlock
       		{
				str += "<a href='javascript:" + jsReq + "' " +
						"title='Click to unlock the system and release the ots Lock'>";
				str += "<img " +	
						"src='/WebPath/images/dashboardImages/icon-Settings-Lock.png'>";
				str += "</a>";
       		}
       		
   			el.innerHTML = str; 
   			el.style.display = "block";
   			
       		_oldUserNameWithLock = usernameWithLock; 
        } //end displayUserLock()

      	//=====================================================================================
        this.handleSetUserWithLock = function(req) 
        {
        	Debug.log(req);
			//extract alert from server
			var serverAlert = Desktop.getXMLValue(req,"server_alert");
			if(serverAlert) Debug.log("Message from Server: " + serverAlert, Debug.HIGH_PRIORITY);

        	Desktop.desktop.dashboard.displayUserLock(
        			Desktop.getXMLValue(req,"username_with_lock"));        	

        	Desktop.desktop.resetDesktop(); //soft reset attempt
        } //end handleSetUserWithLock()
        
      	//=====================================================================================
        //displayConnectionStatus ~~
        //	bool connected
		this.displayConnectionStatus = function(connected) 
		{    
       		var el = document.getElementById("DesktopDashboard-serverConnectionStatus");
       		
       		if(connected) 
       		{		
       			el.style.display = "none";
       			el.innerHTML = "";
       		}  	
       		else
       		{
       			el.innerHTML = "*** <a onclick='Desktop.desktop.resetDesktop();//soft reset attempt' " + 
       					"style='cursor:pointer; color:rgb(255,150,0);'>Disconnected</a> ***";
       			el.style.display = "block";       	
       			
       			//hide user with lock icon (because it usually looks bad when disconnected)
       			document.getElementById("DesktopDashboard-userWithLock").style.display = "none";
       		}
        } //end displayConnectionStatus()
        
      	//=====================================================================================
        //handleDashboardWinMouseUp ~~
		this.handleDashboardWinMouseUp = function(event, winId)
		{  
			if(_deepClickTimer)
			{
				window.clearTimeout(_deepClickTimer);
				_deepClickTimer = 0;
			}
        	Desktop.desktop.clickedWindowDashboard(winId);
        } //end handleDashboardWinMouseUp()
        
      	//=====================================================================================
        //handleDashboardWinMouseDown ~~
		this.handleDashboardWinMouseDown = function(event, winId) 
		{
			event.cancelBubble = true; //prevent default behavior 
			event.preventDefault();
			_deepClickTimer = window.setTimeout(function() {

				var targetWin = Desktop.desktop.getWindowById(winId);
				Debug.log("Create Dashboard Window Menu " +
						targetWin.isMaximized() + "-" + targetWin.isMinimized());				
				
				var menuItems = [
								 targetWin.isMaximized()?
										"Restore Window":"Maximize Window",
								targetWin.isMinimized()?
										"Restore Window":"Minimize Window",
								 "Close Window"
								 ];
				var menuItemHandlers = [
										"Desktop.desktop.maximizeWindowById("+ winId + ")",
										"Desktop.desktop.minimizeWindowById("+ winId + ")",
										"Desktop.desktop.closeWindowById("+ winId + ")",					 
										];
				Debug.log("createEditTableMenu()");
				SimpleContextMenu.createMenu(
						menuItems,
						menuItemHandlers,
						"DesktopIconContextMenu",		//element ID
						event.pageX-1,event.pageY-1, 	//top left position
						Desktop.desktop.dashboard.getDefaultDashboardColor(), 	//primary color
						"white"				//secondary color
				);

			},500); //end timeout handler
        } //end handleDashboardWinMouseDown()
        
		//------------------------------------------------------------------
		//handle class construction ----------------------
		//------------------------------------------------------------------
        
        this.dashboardElement = _dashboardElement = document.createElement("div");
		this.dashboardElement.setAttribute("class", "DesktopDashboard");
		this.dashboardElement.setAttribute("id", "DesktopDashboard");
        
        //create top bar
        _topBar = document.createElement("div");
		_topBar.setAttribute("class", "DesktopDashboard-topBar");
	   	_topBar.style.position = "absolute";
	   	_topBar.style.zIndex = z;
        _topBar.style.backgroundColor = _defaultDashboardColor;

        var tmpBtn = document.createElement("div");
		tmpBtn.setAttribute("class", "DesktopDashboard-button DesktopDashboard-button-left");
        tmpBtn.innerHTML = "<a href='#' title='Click to toggle side Window Bar'>" + 
        	"<img id='dashboard_bi_arrow' src='/WebPath/images/dashboardImages/icon-Bi-arrow-gray.png'></a>";
        tmpBtn.onmouseup = _toggleWindowDashboard;
        _topBar.appendChild(tmpBtn);
        
        tmpBtn = document.createElement("div");
		tmpBtn.setAttribute("class", "DesktopDashboard-button DesktopDashboard-button-left");
        tmpBtn.innerHTML = "<a href='#' title='Click to open default window layouts'>Layouts</a>";
        tmpBtn.onmouseup = _windowDashboardLayoutsDropDown;
        _topBar.appendChild(tmpBtn);
        
        tmpBtn = document.createElement("div");
		tmpBtn.setAttribute("class", "DesktopDashboard-button DesktopDashboard-button-left");
        tmpBtn.innerHTML = "<a href='#' title='Click to automatically arrange and tile windows'>Tile</a>";
        tmpBtn.onmouseup = _windowDashboardOrganize;
        _topBar.appendChild(tmpBtn);
        
        _showDesktopBtn = document.createElement("div");
		_showDesktopBtn.setAttribute("class", "DesktopDashboard-button DesktopDashboard-button-left");
        _showDesktopBtn.innerHTML = "<a href='#' title='Click to toggle minimize/restore all windows'>Show Desktop</a>";
        _showDesktopBtn.onmouseup = _windowDashboardToggleWindows;
        _topBar.appendChild(_showDesktopBtn);

        _fullScreenBtn = document.createElement("div");
		_fullScreenBtn.setAttribute("class", "DesktopDashboard-button DesktopDashboard-button-left");
        this.redrawFullScreenButton();
        _fullScreenBtn.onmouseup = Desktop.desktop.toggleFullScreen;
        _topBar.appendChild(_fullScreenBtn);

        _fullScreenRefreshBtn = document.createElement("div");
		_fullScreenRefreshBtn.setAttribute("class", "DesktopDashboard-button DesktopDashboard-button-left");
        this.redrawRefreshButton();
        _fullScreenRefreshBtn.onmouseup = Desktop.handleFullScreenWindowRefresh;
        _topBar.appendChild(_fullScreenRefreshBtn);
        
        //user with lock on far right.. because it is the highest priority for user to see
		tmpBtn = document.createElement("div");
		tmpBtn.setAttribute("class", "DesktopDashboard-button-right");
		tmpBtn.setAttribute("id", "DesktopDashboard-serverConnectionStatus");
		tmpBtn.setAttribute("title", "Click to attempt to reconnect the server. You could also try refreshing the page, or if the problem persists contact the ots admins.");
		tmpBtn.style.display = "none";
		tmpBtn.style.color = "rgb(255,150,0)";
		_topBar.appendChild(tmpBtn);
        		
        //user with lock on far right.. because it is the highest priority for user to see
        tmpBtn = document.createElement("div");
		tmpBtn.setAttribute("class", "DesktopDashboard-button-right");
		tmpBtn.setAttribute("id", "DesktopDashboard-userWithLock");
		tmpBtn.style.display = "none";
		tmpBtn.style.marginTop = "4px";
		_topBar.appendChild(tmpBtn);
                
        tmpBtn = document.createElement("div");
		tmpBtn.setAttribute("class", "DesktopDashboard-button-right");
    	tmpBtn.innerHTML = "<a  href='" + 
        	"#'" +
        	" 'title='Click to open ots documentation in a new tab' ><img src='/WebPath/images/dashboardImages/icon-Help.png'></a>";
		tmpBtn.onmouseup = Desktop.handleDashboardHelp;
		tmpBtn.onmousedown = Desktop.handleDashboardHelp;
    
        _topBar.appendChild(tmpBtn);
               
        if(Desktop.desktop.security == Desktop.SECURITY_TYPE_DIGEST_ACCESS || 
        		Desktop.desktop.security == Desktop.SECURITY_TYPE_NONE) //dont show features if in wizard mode
        {   
			tmpBtn = document.createElement("div");
			tmpBtn.setAttribute("class", "DesktopDashboard-button-right DesktopDashboard-user-account DesktopDashboard-user-logout");
			tmpBtn.innerHTML = "<a href='#' title='Click to sign out of your account'>Sign out</a>";
			tmpBtn.onmouseup = Desktop.logout;
			_topBar.appendChild(tmpBtn);
			
			tmpBtn = document.createElement("div");
			tmpBtn.setAttribute("class", "DesktopDashboard-button-right");
			tmpBtn.setAttribute("id", "DesktopDashboard-settings-icon");
			tmpBtn.innerHTML = "<a href='Javascript:var win = Desktop.desktop.addWindow(\"Settings\",Desktop.desktop.login.getUsername()," +
				"\"/WebPath/html/UserSettings.html\",true);'  title='Click to open settings window'><img src='/WebPath/images/dashboardImages/icon-Settings.png'></a>";
			_topBar.appendChild(tmpBtn);
					
			tmpBtn = document.createElement("div");
			tmpBtn.setAttribute("class", "DesktopDashboard-user-account");
			tmpBtn.setAttribute("id", "DesktopDashboard-user-displayName");
			tmpBtn.innerHTML = "";
			_topBar.appendChild(tmpBtn);
        }    
        else
        	Debug.log("Desktop Dashboard is in Wizard mode",Debug.LOW_PRIORITY);
        
        this.dashboardElement.appendChild(_topBar);
        Debug.log("Desktop Dashboard Top Bar created",Debug.LOW_PRIORITY);
        
        //create window dashboard
        _windowDashboard = document.createElement("div");
        _windowDashboard.setAttribute("id", "DesktopDashboard-windowDashboard");
        _windowDashboard.style.position = "absolute";
        _windowDashboard.style.zIndex = z;        
        _windowDashboard.style.backgroundColor = _defaultDashboardColor;
        _toggleWindowDashboard(0,_displayWindowDashboard); //set initial value
        this.updateWindows();
        this.dashboardElement.appendChild(_windowDashboard);
        

        _dashboardColorPostbox = document.createElement("div");
        _dashboardColorPostbox.setAttribute("id", "DesktopContent-dashboardColorPostbox");
        _dashboardColorPostbox.style.display = "none";
        _dashboardColorPostbox.innerHTML = _defaultDashboardColor; //init to color string
        this.dashboardElement.appendChild(_dashboardColorPostbox);
        
        
	   		//add mouse handlers
	   	_windowDashboard.onmousemove = Desktop.handleWindowMouseMove;
	   	_windowDashboard.onmousedown = Desktop.handleWindowMouseDown;
	   	_windowDashboard.onmouseup = Desktop.handleWindowMouseUp;

	   	_windowDashboardWindowCSSRule = _getDashboardWindowWidthCSSRule(); //get CSS rule for the dashboard window divs
	   	        	   	
        Debug.log("Desktop Window Dashboard created",Debug.LOW_PRIORITY);

        Debug.log("Desktop Dashboard created",Debug.LOW_PRIORITY);
    } //end createDashboard object

} //end library define










