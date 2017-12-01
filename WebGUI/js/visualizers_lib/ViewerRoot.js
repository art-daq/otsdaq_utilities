//=====================================================================================
//
//	Created Aug, 2013
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	ViewerRoot.js
//
//	requires an omni div, that will be made full window size (window.innerWidth and 
//		window.innerHeight) at position 0,0. 
//
//	Note: there are some variables declared outside of the namespace ViewerRoot
//		so take care to avoid naming collisions with:
//			- gFile
//			- source_dir
//			- obj_list
//			- ViewerRoot.objIndex
//			- last_index
//			- function_list
//			- func_list
//			- frame_id
//			- random_id
//
//	public function list:
//		ViewerRoot.launch()
//
//	from web: 	http://root.cern.ch/js/
//				http://root.cern.ch/drupal/content/trevolutionjs
//				currently using v3.5: https://root.cern.ch/js/3.5/demo/demo.htm
//					-- to change versions, hopefully just replace folder here:
//					-- WebGUI/js/visualizers_lib/ViewerRoot_lib/JsRoot/... tar.gz file unzipped inside JsRoot
//=====================================================================================


var ViewerRoot = ViewerRoot || {}; //define namespace

////////////////////////////////////////////////////////////
//public function definitions

//ViewerRoot ~~
//called to start Root viewer
ViewerRoot.launch = function() {

	Debug.log("ViewerRoot.launch");

	document.getElementById("omni").innerHTML = "<div id='omniHistogramViewer'></div>";
	ViewerRoot.omni = document.getElementById("omniHistogramViewer");	
	
	//initialize with loading message in center
    var w = ViewerRoot.w = window.innerWidth;
    var h = ViewerRoot.h = window.innerHeight;

    ViewerRoot.omni.style.position = "absolute";
    ViewerRoot.omni.style.left = 0  + "px";
    ViewerRoot.omni.style.top = 0  + "px";
    ViewerRoot.omni.style.width = w + "px";
    ViewerRoot.omni.style.height = h + "px";
    ViewerRoot.omni.style.backgroundColor = "rgb(30,30,30)";
	
	ViewerRoot.omni.innerHTML = "<center><div id='loaderStatus' style='margin-top:" + (h/2-8) + "px'>Loading Root Viewer...</div></center>";
	
	//load directories of histograms
	//and display selected histogram
	//allow window splitting and comparing and contrasting with transparent histos
	////////uncomment for initial ROOT example end//////////////////////
	
	loadScript(source_dir+'ViewerRootHud.js',function(){
	loadScript(source_dir+'JsRoot/scripts/JSRootCore.js',function(){
			JSROOT.AssertPrerequisites('2d;io;3d;',ViewerRoot.init);
		}); });
	

	///	Drawing Strategy
	//		- if rootCanvas not created, clear omni and create, full window
	//		- since root js library knows to draw in div with id='report' 
	//			each root object goes in its own div, which at time of creation is given
	//			id='report'. Maintain array of references to divs holding root object
	//			that does not depend on id. And use for removal and movement and sizing?
	//		- first histo always goes full screen within rootCanvas
	//		- next histo based on RADIO: Tile, Replace, Superimpose 
	//			- if TILE, tile it within rootCanvas
	//			- if REPLACE, replace previous object
	//			- if SUPERIMPOSE, place over previous object with alpha 0
	//
	//		- implementation
	//			- keep array of all root elements drawn
	//			- keep array of their corresponding locations
	//			- keep number of locations used in tile


}

//end public function definitions
////////////////////////////////////////////////////////////


var source_dir = "/WebPath/js/visualizers_lib/ViewerRoot_lib/";
//var gFile;
//var obj_list;
//var last_index;
//var function_list;
//var func_list;
//var frame_id;
//var random_id;

ViewerRoot.STREAMER_INFO_FILE_PATH = "/WebPath/js/visualizers_lib/ViewerRoot_lib/streamerInfo.root";

ViewerRoot.LOAD_STREAMER_INFO_CHECK_PERIOD = 100; //ms
ViewerRoot.DISPLAY_MIN_WIDTH = 450; //dont allow w or h to go less than this
ViewerRoot.DISPLAY_MIN_HEIGHT = 300; //dont allow w or h to go less than this
ViewerRoot.HUD_WIDTH = 300;
ViewerRoot.HUD_MARGIN_RIGHT = 0;
ViewerRoot.HUD_DROP_DOWN_SPEED = 40;
ViewerRoot.ROOT_CONTAINER_OFFY = 20;
ViewerRoot.ROOT_HEADER_HEIGHT = 20;

ViewerRoot.TILE_MODE = 0;
ViewerRoot.REPLACE_MODE = 1;
ViewerRoot.SUPERIMPOSE_MODE = 2;

ViewerRoot.ADMIN_PERMISSIONS_THRESHOLD = 100;
ViewerRoot.userPermissions = 0; //0 is min, 255 is max

ViewerRoot.omni;
ViewerRoot.rootContainer;

ViewerRoot.objIndex;

ViewerRoot.rootElArr;
ViewerRoot.rootPosArr;
ViewerRoot.rootObjArr;
ViewerRoot.rootObjIndexArr;
ViewerRoot.rootHeaderElArr;
ViewerRoot.rootObjNameArr;
ViewerRoot.rootIsTransparentArr;
ViewerRoot.rootIsAutoRefreshArr;

ViewerRoot.numPositionsTiled;
ViewerRoot.rootTargetIndex; //targeted object for replace or superimpose
ViewerRoot.w;
ViewerRoot.h;
ViewerRoot.sFile;

ViewerRoot.hudAutoHide = false;
ViewerRoot.nextObjectMode = 1;
ViewerRoot.clearEachRequest = true;
ViewerRoot.autoRefreshDefault = false;
ViewerRoot.autoRefreshPeriod = 1000;
ViewerRoot.pauseRefresh = false;
ViewerRoot.hardRefresh = true;

ViewerRoot.autoRefreshTimer = 0;


ViewerRoot.iterLoading = false;
ViewerRoot.iterNumberRemaining;
ViewerRoot.iterNumPositionsTiled;
ViewerRoot.iterRunWildcard;
ViewerRoot.iterRootObjNameArr;
ViewerRoot.iterRootPosArr;
ViewerRoot.iterRootIsTransparentArr;
ViewerRoot.iterRootIsAutoRefreshArr;
ViewerRoot.iterSaveNextObjectMode;
ViewerRoot.iterSaveAutoRefreshDefault;



//"private" function list
//ViewerRoot.init 
//ViewerRoot.autoRefreshTick
//ViewerRoot.prepareNextLocation
//ViewerRoot.removeAllAtPosition
//ViewerRoot.manageRootHeaders
//ViewerRoot.toggleAllAtPositionAutoRefresh
//ViewerRoot.handleRootPositionSelect
//ViewerRoot.clearAll
//ViewerRoot.handleWindowResize
//ViewerRoot.resizeRootObjects
//ViewerRoot.refreshTransparency
//ViewerRoot.checkStreamerInfoLoaded
//ViewerRoot.getDirectoryContents
//ViewerRoot.getDirContentsHandler 
//ViewerRoot.rootReq
//ViewerRoot.rootConfigReq
//ViewerRoot.getRootConfigHandler
//ViewerRoot.iterativeConfigLoader
//ViewerRoot.getRootDataHandler 
//ViewerRoot.interpretObjectBuffer

ViewerRoot.init = function() {
	Debug.log("ViewerRoot.init");
	//JSROOT.redraw('object_draw', histo, "colz");
	
	
	ViewerRoot.rootElArr = [];
	ViewerRoot.rootPosArr = [];
	ViewerRoot.rootObjArr = [];
	ViewerRoot.rootObjIndexArr = [];
	ViewerRoot.rootObjNameArr = [];
	ViewerRoot.rootObjTitleArr = [];
	ViewerRoot.rootHeaderElArr = [];
	ViewerRoot.rootIsTransparentArr = [];
	ViewerRoot.rootIsAutoRefreshArr = [];
	
	ViewerRoot.numPositionsTiled = 0;
	ViewerRoot.rootTargetIndex = -1;
	
	obj_list = new Array();
	ViewerRoot.objIndex = 0;
	last_index = 0;
	function_list = new Array();
	func_list = new Array();
	frame_id = 0;
	random_id = 0;

	//create and add report container
	ViewerRoot.rootContainer = document.createElement('div');  
	ViewerRoot.rootContainer.setAttribute("id","reportContainer");
	ViewerRoot.rootContainer.onmouseup = function(){
		Debug.log("Deselect all root containers");
		ViewerRoot.rootTargetIndex = -1;
		ViewerRoot.resizeRootObjects();
	};
	ViewerRoot.omni.appendChild(ViewerRoot.rootContainer);
	
	ViewerRoot.hud = new ViewerRoot.createHud();
	window.onresize = ViewerRoot.handleWindowResize;
	ViewerRoot.handleWindowResize();
	
	ViewerRoot.autoRefreshTimer = window.setInterval(ViewerRoot.autoRefreshTick,
			ViewerRoot.autoRefreshPeriod);
	
	document.getElementById("loaderStatus").innerHTML = "Root Viewer Loaded.<br>Use drop-down to make selections.";
	ViewerRoot.getDirectoryContents("/");
}

ViewerRoot.autoRefreshMatchArr = []; //use array to match request returns to index

// ViewerRoot.autoRefreshTick ~~
//	handle autorefreshes 
//	Strategy:
//		For each root object that is in refresh mode, push index,path to an array
//		and send req. When req returns match path to array and remove entry.
//		When array is empty auto refresh complete.
ViewerRoot.autoRefreshTick = function() {

	//Debug.log("ViewerRoot autoRefreshTick pause=" + ViewerRoot.pauseRefresh);
	if(ViewerRoot.pauseRefresh) return;
	
	if(ViewerRoot.autoRefreshMatchArr.length) //not done yet with previous refresh!
	{
		Debug.log("ViewerRoot autoRefreshTick not done yet! Refresh period too short.");
		return;
	}
	
	ViewerRoot.autoRefreshMatchArr = []; //insert [<index>, <path>] tuples
	for(var j=0;j<ViewerRoot.rootPosArr.length;++j)
		if(ViewerRoot.rootIsAutoRefreshArr[j])
		{
			//Debug.log("ViewerRoot autoRefreshTick " + j + " " + ViewerRoot.rootObjNameArr[j]);
			ViewerRoot.autoRefreshMatchArr.push([j, ViewerRoot.rootObjNameArr[j]]);
			ViewerRoot.rootReq(ViewerRoot.rootObjNameArr[j]);
		}	
}

// ViewerRoot.() ~~
//		Prepares next div location for root js library drawing
//		based on RADIO: Tile, Replace, Superimpose. The div id
//		will be "histogram"+ViewerRoot.objIndex.. this is the div
//		the root js library will draw to.
    ViewerRoot.prepareNextLocation = function(objName, objTitle) {
	Debug.log("ViewerRoot prepareNextLocation for ViewerRoot.objIndex " + "mode " + ViewerRoot.nextObjectMode +
			": " + ViewerRoot.objIndex + ": " + objName);
	
	//fix target just in case foul play occured
	if(ViewerRoot.rootTargetIndex > ViewerRoot.numPositionsTiled) ViewerRoot.rootTargetIndex = -1;
	
	//create and add new div 
	var ri = ViewerRoot.rootElArr.length;
	ViewerRoot.rootElArr.push(document.createElement('div')); //make container  
	ViewerRoot.rootElArr[ri].setAttribute("class","rootObjectContainer"); //set new report target
	
	var tmpdiv = document.createElement('div'); //make target div
	tmpdiv.setAttribute("id","histogram"+ViewerRoot.objIndex); //set new target for root object
	tmpdiv.setAttribute("class","rootObjectContainerTarget");
	ViewerRoot.rootElArr[ri].appendChild(tmpdiv);

	//add report to report container
	ViewerRoot.rootContainer.appendChild(ViewerRoot.rootElArr[ri]);
	
	var drawTransparently = false;
	if(!ViewerRoot.numPositionsTiled || ViewerRoot.nextObjectMode == ViewerRoot.TILE_MODE)
	{
		//next tile position (or first tile)
		ViewerRoot.rootPosArr.push(ViewerRoot.numPositionsTiled++);
	}
	else if(ViewerRoot.nextObjectMode == ViewerRoot.REPLACE_MODE)
	{
		//replace tile(s) at position ViewerRoot.rootTargetIndex, if -1 then replace last tile(s)		
		var repi = ViewerRoot.rootTargetIndex == -1? ViewerRoot.numPositionsTiled-1:ViewerRoot.rootTargetIndex;		
		ViewerRoot.removeAllAtPosition(repi);	//remove all tiles that match repi		
		
		ViewerRoot.rootPosArr.push(repi); //assign new report to position
	}
	else if(ViewerRoot.nextObjectMode == ViewerRoot.SUPERIMPOSE_MODE)
	{
		//add tile at position ViewerRoot.rootTargetIndex, if -1 then at last tile(s)
		var supi = ViewerRoot.rootTargetIndex == -1? ViewerRoot.numPositionsTiled-1:ViewerRoot.rootTargetIndex;
		
		ViewerRoot.rootPosArr.push(supi);	//assign new report to position
		drawTransparently = true;
	}
	
	ViewerRoot.rootIsTransparentArr.push(drawTransparently); //keep for transparent drawing
	ViewerRoot.rootIsAutoRefreshArr.push(ViewerRoot.autoRefreshDefault);
	ViewerRoot.rootObjNameArr.push(objName);	//assign new report to position
	ViewerRoot.rootObjTitleArr.push(objTitle);
	
	ViewerRoot.manageRootHeaders(); 	//manage headers for all positions	
	ViewerRoot.resizeRootObjects(true); 	//resize all root objects as a result of new element
}

// ViewerRoot.removeAllAtPosition ~~
//		Remove all histogram div elements and associated root object data structures
//		for the given position i.
//		If isClosingPosition then redraw after and update tiled positions and renumber all above 
//		position i.
ViewerRoot.removeAllAtPosition = function(posi, isClosingPosition) {
	Debug.log("ViewerRoot removeAllAtPosition " + posi);

	for(var i=0;i<ViewerRoot.rootPosArr.length;++i)		
		if(ViewerRoot.rootPosArr[i] == posi) //remove element 
		{
			ViewerRoot.rootElArr[i].parentNode.removeChild(ViewerRoot.rootElArr[i]);
			ViewerRoot.rootElArr.splice(i,1);
			ViewerRoot.rootPosArr.splice(i,1);
			delete ViewerRoot.rootObjArr[i]; ViewerRoot.rootObjArr[i] = null;
			ViewerRoot.rootObjArr.splice(i,1);
			ViewerRoot.rootObjIndexArr.splice(i,1);
			ViewerRoot.rootObjNameArr.splice(i,1);
			ViewerRoot.rootObjTitleArr.splice(i,1);
			ViewerRoot.rootIsTransparentArr.splice(i,1);
			ViewerRoot.rootIsAutoRefreshArr.splice(i,1);			
			
			--i; //rewind
		}
		else if(isClosingPosition && ViewerRoot.rootPosArr[i] > posi) //renumber position
			--ViewerRoot.rootPosArr[i];

	if(isClosingPosition)
	{
		--ViewerRoot.numPositionsTiled;
		ViewerRoot.manageRootHeaders();		
		if(ViewerRoot.rootTargetIndex > posi) --ViewerRoot.rootTargetIndex;
		else if(ViewerRoot.rootTargetIndex >= ViewerRoot.numPositionsTiled) ViewerRoot.rootTargetIndex = -1;
		ViewerRoot.resizeRootObjects(true); 	//resize all root objects as a result of new element
	}
}

// ViewerRoot.manageRootHeaders ~~
//	handle adding/removing/drawing of root object headers
ViewerRoot.manageRootHeaders = function() {
	Debug.log("ViewerRoot manageRootHeaders");
	
	var tmpdiv;
	while(ViewerRoot.numPositionsTiled > ViewerRoot.rootHeaderElArr.length) //add header elements
	{
		tmpdiv = document.createElement('div'); //make target div
		tmpdiv.setAttribute("id","rootContainerHeader-"+ViewerRoot.rootHeaderElArr.length);
		tmpdiv.setAttribute("class","rootContainerHeader");
		tmpdiv.onmouseup = ViewerRoot.handleRootPositionSelect;
		ViewerRoot.rootContainer.appendChild(tmpdiv);
		ViewerRoot.rootHeaderElArr.push(tmpdiv);
	}

	while(ViewerRoot.numPositionsTiled < ViewerRoot.rootHeaderElArr.length) //remove header elements
	{
		tmpdiv = ViewerRoot.rootHeaderElArr[ViewerRoot.rootHeaderElArr.length-1];
		tmpdiv.parentNode.removeChild(tmpdiv);
		ViewerRoot.rootHeaderElArr.splice(ViewerRoot.rootHeaderElArr.length-1,1);
	}
	
	//give name to headers by position
	var found;
	var name, fullPath;
	var str;
	var isAtLeastOneRefreshing;
	for(var i=0;i<ViewerRoot.rootHeaderElArr.length;++i)
	{
		found = 0;
		isAtLeastOneRefreshing = false;
		for(var j=0;j<ViewerRoot.rootPosArr.length;++j)
			if(ViewerRoot.rootPosArr[j] == i) { ++found; fullPath = ViewerRoot.rootObjNameArr[j];
			    //name = (fullPath.length > 20)?("..." + fullPath.substr(fullPath.length-18)):fullPath;
			    name=ViewerRoot.rootObjTitleArr[j];	
				if(ViewerRoot.rootIsAutoRefreshArr[j]) isAtLeastOneRefreshing = true; //this root object is set to autorefresh
			}
		
		str = "";
		
		//add title
		str += "<div title='" + fullPath + "' class='rootContainerHeader-name'>" + (found == 1?name:"Multiple Files...") + "</div>";
		
		//add close button
		str += "<a title='Close' href='Javascript:ViewerRoot.removeAllAtPosition("+i+",true);' onmouseup='event.cancelBubble=true;' " +
			"class='rootContainerHeader-closeBtn'>X</a>";
		
		//add auto refresh icon
		//if at least one root object is refreshing show icon as on
		
		//Below is original
		str += "<a title='Close' href='Javascript:ViewerRoot.toggleAllAtPositionAutoRefresh(" + i + 
			");' onmouseup='event.cancelBubble=true;' " +
			"class='rootContainerHeader-refreshBtn'><img id='rootContainerHeaderRefreshImg" + i +
			"'src='/WebPath/images/iconImages/icon-rootAutoRefresh" + (isAtLeastOneRefreshing?"On":"Off") + ".png'></a>";
			
			
		//Making the refresh button do the same thing as respective histograph name
//		str += "<a title='Refresh' href='Javascript:ViewerRoot.rootReq(\"" + fullPath + 
//			"\");' onmouseup='event.cancelBubble=true;' " +
//			"class='rootContainerHeader-refreshBtn'><img id='rootContainerHeaderRefreshImg" + i +
//			"'src='/WebPath/images/iconImages/icon-rootAutoRefresh" + (isAtLeastOneRefreshing?"On":"Off") + ".png'></a>";
//		
		ViewerRoot.rootHeaderElArr[i].innerHTML = str;
	}
}

// ViewerRoot.toggleAllAtPositionAutoRefresh ~~
//	toggle auto refresh for position i
//	Superimposed position is a special case
//		if any of superimposed are true, then all should go false
//		else all go true
ViewerRoot.toggleAllAtPositionAutoRefresh = function(i)
{	
	Debug.log("ViewerRoot toggleAllAtPositionAutoRefresh " + i);
	var found = 0;
	var v = true, lastv;
	var doover = false;
	do
	{
		for(var j=0;j<ViewerRoot.rootPosArr.length;++j)
			if(ViewerRoot.rootPosArr[j] == i) 
			{
				if(!doover && ViewerRoot.rootIsAutoRefreshArr[j]) v = false;
				ViewerRoot.rootIsAutoRefreshArr[j] = v;                       //---------------------------------------->This is all this function does!

				Debug.log("ViewerRoot toggleAllAtPositionAutoRefresh rootObj " + j + " to " + v);
				
				var tmp = document.getElementById("rootContainerHeaderRefreshImg" + i );
				tmp.src = "/WebPath/images/iconImages/icon-rootAutoRefresh" + (v?"On":"Off") + ".png";
				if(lastv != v ){++found; lastv = v;}
			}
		if(!doover && found>1) doover = true;
		else doover = false;
	} while(doover) //may need to do it over again, because values of superimposed root objects could be wrong
		
}

// ViewerRoot.handleRootPositionSelect ~~
ViewerRoot.handleRootPositionSelect = function(event) {
	event.cancelBubble = true;
	var i = parseInt(this.id.substr(this.id.indexOf("-")+1))
	Debug.log("ViewerRoot handleRootPositionSelect " + i);
	ViewerRoot.rootTargetIndex = i;
	ViewerRoot.resizeRootObjects();
}

// ViewerRoot.clearAll ~~
//		remove all root objects
ViewerRoot.clearAll = function() {
	Debug.log("ViewerRoot clearAll");
	
	ViewerRoot.rootTargetIndex = -1;
	//ViewerRoot.numPositionsTiled will be 0 at end 
	for(ViewerRoot.numPositionsTiled; ViewerRoot.numPositionsTiled>0; --ViewerRoot.numPositionsTiled)
		ViewerRoot.removeAllAtPosition(ViewerRoot.numPositionsTiled-1);
	ViewerRoot.manageRootHeaders();
	ViewerRoot.resizeRootObjects();
}

// ViewerRoot.handleWindowResize ~~
ViewerRoot.handleWindowResize = function() {
	
	var w = ViewerRoot.w = window.innerWidth < ViewerRoot.DISPLAY_MIN_WIDTH? ViewerRoot.DISPLAY_MIN_WIDTH:window.innerWidth;
	var h = ViewerRoot.h = window.innerHeight < ViewerRoot.DISPLAY_MIN_HEIGHT? ViewerRoot.DISPLAY_MIN_HEIGHT:window.innerHeight;

	if(!ViewerRoot.hudAutoHide) //force w smaller
		ViewerRoot.w = w -= ViewerRoot.HUD_WIDTH + ViewerRoot.HUD_MARGIN_RIGHT + (5*2); //5 is padding of mouseover region in css
	
	Debug.log("ViewerRoot handleWindowResize " + w + "-" + h);
	
	ViewerRoot.omni.style.width = w + "px";
	ViewerRoot.omni.style.height = h + "px";
	
	ViewerRoot.hud.handleWindowResize();	
	ViewerRoot.resizeRootObjects(true);
}

// ViewerRoot.resizeRootObjects ~~
//		Resize all root objects based on positions and tile arrangement
//		if isForNewObject = true, then redraw all reports except last(new) report
//		OLD: do not need to redraw for normal window resize, because obj's handler handles
//		NEW: now on window resize the object is not redrawn.. the <svg class=root_canvas> size
//			does not get updated.. So just redraw for normal window resize case.
ViewerRoot.resizeRootObjects = function(needToRedraw) {
	
	ViewerRoot.rootContainer.style.width = ViewerRoot.w + "px";
	ViewerRoot.rootContainer.style.height = ViewerRoot.h + "px";	

	if(ViewerRoot.numPositionsTiled < 1) 
	{ 	//if no rootObjects, invisible container
		ViewerRoot.rootContainer.style.backgroundColor = "rgba(0,0,0,0)";
		return;
	}
	ViewerRoot.rootContainer.style.backgroundColor = "white";
	

	var w = ViewerRoot.w;
	var h = ViewerRoot.h - ViewerRoot.ROOT_CONTAINER_OFFY;
			
	var aspect = 3/4; //3/4, 9/16 , 1
	var r = Math.round(Math.sqrt(h*ViewerRoot.numPositionsTiled/aspect/w)); //Math.ceil(Math.sqrt(ViewerRoot.numPositionsTiled));
	if(r<1) r = 1;
	var c = Math.ceil(ViewerRoot.numPositionsTiled/r);
	
	Debug.log("ViewerRoot resizeRootObjects " + r  + "-" + c + " for " + ViewerRoot.numPositionsTiled);
	
	//calc individual position size
	w = Math.floor(w/c);
	h = Math.floor(h/r);	
	
	Debug.log("ViewerRoot resizeRootObjects size " + w  + "-" + h );
	
	//re-calc root object width based on aspect
	var rootAspect = 3/4;
	var rootw = h/w < rootAspect?h/rootAspect:w;
	
	//position all reports properly
	for(var i=0;i<ViewerRoot.rootElArr.length;++i)
	{
		ViewerRoot.rootElArr[i].style.width = rootw + "px";
		ViewerRoot.rootElArr[i].style.height = (h - ViewerRoot.ROOT_HEADER_HEIGHT) + "px";
		ViewerRoot.rootElArr[i].style.left = w*(ViewerRoot.rootPosArr[i]%c) + (w-rootw)/2 + "px";
		ViewerRoot.rootElArr[i].style.top = ViewerRoot.ROOT_CONTAINER_OFFY + ViewerRoot.ROOT_HEADER_HEIGHT + 
			h*Math.floor(ViewerRoot.rootPosArr[i]/c) + "px";
		
		//		Debug.log("ViewerRoot resizeRootObjects x y " + i + " at pos " + ViewerRoot.rootPosArr[i] +
		//				":" + ViewerRoot.rootElArr[i].style.left  + "-" + ViewerRoot.rootElArr[i].style.top );
		
		if(needToRedraw && ViewerRoot.rootObjArr[i]) //redraw for new size, when new added rootobj not defined at this point
		{
			//Debug.log("ViewerRoot resizeRootObjects redraw " + i  + "-" + ViewerRoot.rootObjIndexArr[i] );
			//JSROOTPainter.drawObject(ViewerRoot.rootObjArr[i], ViewerRoot.rootObjIndexArr[i]);
			JSROOT.redraw('histogram'+
					ViewerRoot.rootObjIndexArr[i],
					ViewerRoot.rootObjArr[i], "colz"); //last arg, root draw option
			ViewerRoot.refreshTransparency(i);
		}			
	}
	
	//position headers
	for(var i=0;i<ViewerRoot.rootHeaderElArr.length;++i)
	{
		ViewerRoot.rootHeaderElArr[i].style.width = w-2 + "px";
		ViewerRoot.rootHeaderElArr[i].style.height = ViewerRoot.ROOT_HEADER_HEIGHT  + "px";
		ViewerRoot.rootHeaderElArr[i].style.left = w*(i%c)  + "px";
		ViewerRoot.rootHeaderElArr[i].style.top = ViewerRoot.ROOT_CONTAINER_OFFY + h*Math.floor(i/c) + "px";

		ViewerRoot.rootHeaderElArr[i].style.borderColor = 
			ViewerRoot.rootTargetIndex==i?'rgb(68,156,44)':'black';
		ViewerRoot.rootHeaderElArr[i].style.backgroundColor =
			ViewerRoot.rootTargetIndex==i?'rgb(178,222,166)':'rgba(0,0,0,0)';
	}
}

// ViewerRoot.refreshTransparency ~~
//		refresh the transparency state of histogram i and svg components
ViewerRoot.refreshTransparency = function(i) {
	//if need be, make transparent
	if(ViewerRoot.rootIsTransparentArr[i])
	{
		//Debug.log("superimpose draw " + i);		
		//histogram div bgColor
		ViewerRoot.rootElArr[i].children[0].style.backgroundColor = "rgba(0,0,0,0)";
		//svg bgColor
		var svg = ViewerRoot.rootElArr[i].children[0].getElementsByTagName('svg')[0];
		svg.style.backgroundColor = "rgba(0,0,0,0)";
		//rect fill		
		if(svg.getElementsByTagName('rect')[0])
			svg.getElementsByTagName('rect')[0].style.fill = "rgba(0,0,0,0)";
		
		//structure:
			//<div id='histogram#'><svg><g>
			//<rect x="0" y="0" width="461.48" height="281.70663849600004" fill="rgba(0,0,0,0)" style="stroke: #000000; stroke-width: 1px;"></rect>
			//<svg>..root drawing..</svg>
			//</g>
			//</svg>
	}
}

// ViewerRoot.checkStreamerInfoLoaded ~~
//	periodically check to usee if the streamer info, giving information on root types has completely loaded
//	this is a critical step before attempting to draw any root objects
ViewerRoot.checkStreamerInfoLoaded = function() {
	if(ViewerRoot.sFile && 
			ViewerRoot.sFile.fStreamerInfo &&
			gFile.fStreamerInfo.fClassMap &&
			gFile.fStreamerInfo.fClassMap.length > 0) //done
	{
		document.getElementById("loaderStatus").innerHTML = "Root Viewer Loaded.<br>Use drop-down to make selections.";
		ViewerRoot.getDirectoryContents("/");
	}
	else //not done, wait longer
		window.setTimeout(ViewerRoot.checkStreamerInfoLoaded,ViewerRoot.LOAD_STREAMER_INFO_CHECK_PERIOD);		
}

// ViewerRoot.getDirectoryContents ~~
//	request directory contents from server for path
ViewerRoot.getDirectoryContents = function(path) {
	
	Debug.log("ViewerRoot getDirectoryContents " + path);
	
	if(path.indexOf(".root/") >=0)
		DesktopContent.XMLHttpRequest("request?RequestType=getRoot", "RootPath="+path, ViewerRoot.getDirContentsHandler);
	else
		DesktopContent.XMLHttpRequest("request?RequestType=getDirectoryContents", "Path="+path, ViewerRoot.getDirContentsHandler);
}

// ViewerRoot.getDirContentsHandler ~~
ViewerRoot.getDirContentsHandler = function(req) {
	Debug.log("ViewerRoot getDirContentsHandler " + req.responseText);
	
	var permissions = DesktopContent.getXMLValue(req,'permissions');
	if(!permissions) 
		Debug.log("ViewerRoot getDirContentsHandler permissions missing");
	else if(ViewerRoot.userPermissions != permissions)
	{
		Debug.log("ViewerRoot getDirContentsHandler user permissions = " + permissions);
		ViewerRoot.userPermissions = permissions;
		ViewerRoot.hud.handleWindowResize();
	}
	
	ViewerRoot.hud.handleDirContents(req);
}

// ViewerRoot.rootReq ~~
//	if refreshIndex, then request is meant to replace root object at index
ViewerRoot.rootReq = function(rootPath) {
	
	Debug.log("ViewerRoot.rootReq " + rootPath );
	DesktopContent.XMLHttpRequest("request?RequestType=getRoot", "RootPath="+rootPath, 
			//ViewerRoot.tmpRootDataHandler);
			ViewerRoot.getRootDataHandler);
}

//ViewerRoot.rootConfigReq ~~
ViewerRoot.rootConfigReq = function(rootConfigPath) {	
	//Debug.log("ViewerRoot.rootReq");
	DesktopContent.XMLHttpRequest("request?RequestType=getRootConfig", "RootConfigPath="+rootConfigPath, 
			ViewerRoot.getRootConfigHandler);
}

//ViewerRoot.getRootConfigHandler ~~
//	receives saved configuration and rebuilds the view based on the configuration
ViewerRoot.getRootConfigHandler = function(req) {
	Debug.log("ViewerRoot getRootConfigHandler " + req.responseText );

	var status = DesktopContent.getXMLValue(req,"status");
	if(status != "1")
	{ alert("Loading Root Pre-Made Configuration Failed: " + status); return }
	
	ViewerRoot.iterNumPositionsTiled = DesktopContent.getXMLValue(req,"numPositionsTiled");
	ViewerRoot.iterRunWildcard = DesktopContent.getXMLValue(req,"runNumWildcard");  //TODO replace obj names with current run number!
	
	//copy NodeList to just normal arrays
	
	var tmp = req.responseXML.getElementsByTagName("rootObjName");
	ViewerRoot.iterRootObjNameArr = [];
	for(var i=0;i<tmp.length;++i) ViewerRoot.iterRootObjNameArr[i] = tmp[i].getAttribute("value");
	
	tmp = req.responseXML.getElementsByTagName("rootPos");
	ViewerRoot.iterRootPosArr = [];
	for(var i=0;i<tmp.length;++i) ViewerRoot.iterRootPosArr[i] = tmp[i].getAttribute("value") | 0; //parse as int
	
	tmp = req.responseXML.getElementsByTagName("rootIsTransparent");
	ViewerRoot.iterRootIsTransparentArr = [];
	for(var i=0;i<tmp.length;++i) ViewerRoot.iterRootIsTransparentArr[i] = tmp[i].getAttribute("value") | 0; //parse as int
	
	tmp = req.responseXML.getElementsByTagName("rootIsAutoRefresh");
	ViewerRoot.iterRootIsAutoRefreshArr = [];
	for(var i=0;i<tmp.length;++i) ViewerRoot.iterRootIsAutoRefreshArr[i] = tmp[i].getAttribute("value") | 0; //parse as int
		
	ViewerRoot.clearAll();		

	ViewerRoot.iterLoading = true;
	ViewerRoot.iterNumberRemaining = ViewerRoot.iterRootObjNameArr.length;
	ViewerRoot.iterSaveNextObjectMode = ViewerRoot.nextObjectMode;
	ViewerRoot.iterSaveAutoRefreshDefault = ViewerRoot.autoRefreshDefault;
	
	ViewerRoot.iterativeConfigLoader();
}

//ViewerRoot.iterativeConfigLoader ~~
//	goes through every iterRootObj and loads sequentially to display
ViewerRoot.iterativeConfigLoader = function() {
	//Debug.log("ViewerRoot iterativeConfigLoader " + ViewerRoot.iterNumberRemaining);
	if(!ViewerRoot.iterNumberRemaining)  //done
	{	
		ViewerRoot.autoRefreshDefault = ViewerRoot.iterSaveAutoRefreshDefault;
		ViewerRoot.nextObjectMode = ViewerRoot.iterSaveNextObjectMode;
		ViewerRoot.iterLoading = false; 
		return;
	}
	
	--ViewerRoot.iterNumberRemaining; 
	
	//next is always the lowest position left
	var min = -1;
	for(var i=0;i<ViewerRoot.iterRootPosArr.length;++i)
		if(min == -1 || ViewerRoot.iterRootPosArr[i] < ViewerRoot.iterRootPosArr[min]) min = i;
	
	ViewerRoot.nextObjectMode = ViewerRoot.iterRootIsTransparentArr[min]?ViewerRoot.SUPERIMPOSE_MODE:ViewerRoot.TILE_MODE;
	ViewerRoot.autoRefreshDefault = ViewerRoot.iterRootIsAutoRefreshArr[min];
	
	ViewerRoot.rootReq(ViewerRoot.iterRootObjNameArr[min]);	
	
	//remove from iter array
	ViewerRoot.iterRootObjNameArr.splice(min,1);
	ViewerRoot.iterRootPosArr.splice(min,1);
	ViewerRoot.iterRootIsTransparentArr.splice(min,1);
	ViewerRoot.iterRootIsAutoRefreshArr.splice(min,1);
	
}


// ViewerRoot.getRootDataHandler ~~
//	receives streamed root object from server and prepares it for js structures
ViewerRoot.getRootDataHandler = function(req) {

	//Debug.log("ViewerRoot getRootDataHandler " + req.responseText );
	
	var rootType = DesktopContent.getXMLValue(req,"rootType");
	var rootStr = DesktopContent.getXMLValue(req,"rootData");
	var rootName = DesktopContent.getXMLValue(req,"path");//
	//"my" + rootType + ViewerRoot.objIndex;// DesktopContent.getXMLValue(req,"path");// + ViewerRoot.objIndex;
	//if(rootName.length > 20) rootName = "..." + rootName.substr(rootName.length-18);
	
	var rootJSON = DesktopContent.getXMLValue(req,"rootJSON");
		
	//Debug.log("ViewerRoot tmpRootDataHandler JSON \n\n" + rootJSON );
		
	var ojbect = JSROOT.parse(rootJSON);
	var rootTitle = ojbect.fTitle;
		
	if(!ojbect || !rootType || !rootName)
	{ 
		Debug.log("Pausing auto-refresh! \n\nPlease resolve the erros before resuming refreshes.", Debug.HIGH_PRIORITY);

		var chk = document.getElementById("hudCheckbox" + 2); //pause refresh checkbox
		chk.checked = true;
		ViewerRoot.pauseRefresh = true;
		
	  	Debug.log("Error reading Root object from server - Name: " + rootName, Debug.HIGH_PRIORITY);
	    ViewerRoot.autoRefreshMatchArr = [];	//clearing the array so that future refreshes work
	    return;
	}
	

	var refreshIndex = -1; //default to -1 if no auto refresh needed
	if(ViewerRoot.autoRefreshMatchArr.length) //check if request matches auto refresh entry
	{
		for(var i=0;i<ViewerRoot.autoRefreshMatchArr.length;++i)
		{
			if(rootName == ViewerRoot.autoRefreshMatchArr[i][1])
			{
				refreshIndex = ViewerRoot.autoRefreshMatchArr[i][0];	
								
				//remove from auto refresh array
				ViewerRoot.autoRefreshMatchArr[i] = 0;
				ViewerRoot.autoRefreshMatchArr.splice(i,1);

				//if name in js structures has changed,
				//	assume it is users fault and throw out this refreshed object
				if(refreshIndex >= ViewerRoot.rootObjNameArr.length ||
					ViewerRoot.rootObjNameArr[refreshIndex] != rootName)
				{
					Debug.log("ViewerRoot getRootDataHandler weird unmatch!?#$@%");
					return; //throw out object, since incomplete match
				}				
				break;
			}
		}				
		//if not found, assume it is a new object
	}
	
	console.log("refreshIndex=" + refreshIndex + " ViewerRoot.rootTargetIndex=" + ViewerRoot.rootTargetIndex);
	
	if(refreshIndex < 0) ViewerRoot.prepareNextLocation(rootName, rootTitle);
	else
	{
		//refreshIndex is the location to target
		//prepare a new location as though it is replace with auto-refresh on
		//
		// e.g.
		//	 globalset = replace/on
		//	ViewerRoot.prepareNextLocation(rootName);
		//   globalset = gui settings
		
		// tmpHLI = HIGHLIGHT_INDEX;
		// HIGHLIGHT_INDEX = refreshIndex
		//refreshIndex = -1;
		//	do it
		//	HIGHLIGHT_INDEX = tmpHLI;
		
		
		
//		var tmpRootTargetIndex = ViewerRoot.rootTargetIndex;
//		ViewerRoot.rootTargetIndex = refreshIndex; 
//
//		var tmpRefreshIndex = refreshIndex;
//		refreshIndex = -1;
//		
//		var tmpNextObjectMode = ViewerRoot.nextObjectMode;
//		var tmpAutoRefreshDefault = ViewerRoot.autoRefreshDefault;
//		
//		ViewerRoot.nextObjectMode = ViewerRoot.REPLACE_MODE; 
//		ViewerRoot.autoRefreshDefault = true;
//		
//		
//		ViewerRoot.prepareNextLocation(rootName);
//		
//		
//		ViewerRoot.rootTargetIndex = tmpRootTargetIndex;
//		ViewerRoot.nextObjectMode = tmpNextObjectMode;
//		ViewerRoot.autoRefreshDefault = tmpAutoRefreshDefault;
	}
	
	ViewerRoot.interpretObjectJSON(ojbect,rootType,rootName,refreshIndex);
	if(ViewerRoot.iterLoading) ViewerRoot.iterativeConfigLoader();
}


// ViewerRoot.interpretObjectJSON ~~
//	interpret and draw
ViewerRoot.interpretObjectJSON = function(object,rootType,objName,refreshIndex) {

	if(refreshIndex == undefined) refreshIndex = -1;

	
	if(ViewerRoot.hardRefresh) //"Hard" refresh, reloads axes for example
	{
		if(refreshIndex < 0)
		{
			ViewerRoot.rootObjArr.push(object);
			ViewerRoot.rootObjIndexArr.push(ViewerRoot.objIndex);		
		}
		else //use refresh index
		{
			delete ViewerRoot.rootObjArr[refreshIndex]; ViewerRoot.rootObjArr[refreshIndex] = null;
			ViewerRoot.rootObjArr[refreshIndex] = object;
			ViewerRoot.rootObjTitleArr[refreshIndex] = object.fTitle;
			ViewerRoot.rootObjIndexArr[refreshIndex] = ViewerRoot.objIndex;
			
			
			ViewerRoot.rootElArr[refreshIndex].innerHTML = ""; //cleare rootObjectContainer
			var tmpdiv = document.createElement('div'); //make target div
			tmpdiv.setAttribute("id","histogram"+ViewerRoot.objIndex); //set new target for root object
			tmpdiv.setAttribute("class","rootObjectContainerTarget");
			ViewerRoot.rootElArr[refreshIndex].appendChild(tmpdiv);
		}
		
		//draw based on refresh index
		JSROOT.redraw('histogram'+
				(ViewerRoot.objIndex),
				object, "colz"); //last arg, root draw option
		
		ViewerRoot.objIndex++;
	}	
	else		//"Soft" refresh, doesn't reload axes for example
	{
		//draw based on refresh index
		JSROOT.draw('histogram'+
				(refreshIndex<0?ViewerRoot.objIndex:
				ViewerRoot.rootObjIndexArr[refreshIndex]),
				object, "colz"); //last arg, root draw option
		
		if(refreshIndex < 0)
		{
			ViewerRoot.rootObjArr.push(object);
			ViewerRoot.rootObjIndexArr.push(ViewerRoot.objIndex);				
			ViewerRoot.objIndex++;
		}
		else //use refresh index
		{
			delete ViewerRoot.rootObjArr[refreshIndex]; ViewerRoot.rootObjArr[refreshIndex] = null;
			ViewerRoot.rootObjArr[refreshIndex] = object;
			ViewerRoot.rootObjTitleArr[refreshIndex] = object.fTitle;
		}
	}
	
	ViewerRoot.refreshTransparency(refreshIndex<0?(ViewerRoot.rootObjArr.length-1):refreshIndex);
	ViewerRoot.manageRootHeaders(); 	//manage headers for all positions	

}


function loadScript(url, callback) {
   // dynamic script loader using callback
   // (as loading scripts may be asynchronous)
   var script = document.createElement("script")
   script.type = "text/javascript";
   if (script.readyState) { // Internet Explorer specific
      script.onreadystatechange = function() {
         if (script.readyState == "loaded" ||
             script.readyState == "complete") {
            script.onreadystatechange = null;
            callback();
         }
      };
   } else { // Other browsers
      script.onload = function(){
         callback();
      };
   }
   var rnd = Math.floor(Math.random()*80000);
   script.src = url;//+ "?r=" + rnd;
   document.getElementsByTagName("head")[0].appendChild(script);
};
