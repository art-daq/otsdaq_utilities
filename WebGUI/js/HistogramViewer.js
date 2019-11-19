/*===============================================================================*
 * HistogramViewer.js: the javascript code to instantiate a root objects         *
 *                     navigator in the otsdaq framework                         *
 *                                                                               *
 * Copyright (C) 2019                                                            *
 *                                                                               *
 * Authors: Dario Menasce                                                        *
 *                                                                               *
 * INFN: Piazza della Scienza 3, Edificio U2, Milano, Italy 20126                *
 *                                                                               *
 * This program is free software: you can redistribute it and/or modify          *
 * it under the terms of the GNU General Public License as published by          *
 * the Free Software Foundation, either version 3 of the License, or             *
 * (at your option) any later version.                                           *
 *                                                                               *
 * This program is distributed in the hope that it will be useful,               *
 * but WITHOUT ANY WARRANTY; without even the implied warranty of                *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the                 *
 * GNU General Public License for more details.                                  *
 *                                                                               *
 * You should have received a copy of the GNU General Public License             *
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.         *
 ================================================================================*/
   
//----------------------------- Pre requisites --------------------------------
Ext.require(
            [
    	     'Ext.tab.*'    ,
    	     'Ext.window.*' ,
    	     'Ext.tip.*'    ,
    	     'Ext.ux.*',
    	     'Ext.layout.container.Border'
            ]
	   );

//------------------------- General utility function ---------------------------
// Retrieves the local URN number
var getLocalURN = function(index,name) 
{      
 var params = (window.location.search.substr(1)).split('&');
 var splitted, vs;
 if(name)
 {
  for(index=0;index<params.length;++index)
  {
   splitted = params[index].indexOf('=');
   if(splitted < 0) continue; 
   vs = [params[index].substr(0,splitted),params[index].substr(splitted+1)];
   if(decodeURIComponent(vs[0]) == name) return decodeURIComponent(vs[1]);
  }
  return; 
 }

 if(index >= params.length) return; 

 splitted = params[index].indexOf('=');
 if(splitted < 0) return;     
 vs = [params[index].substr(0,splitted),params[index].substr(splitted+1)];
 return decodeURIComponent(vs[1]);
}

//------------------------- General utility function ---------------------------
// Creates the different <div> placeholders for the main components of the page
function generateDIVPlaceholder(id,top,left)	   
{
 var div = document.createElement("div");
 div.id             = id ;
 div.style.position = "absolute";
 div.style.top      = top  + "px";
 div.style.left     = left + "px";

 document.getElementsByTagName("BODY")[0].appendChild(div);
}
//-----------------------------------------------------------------------------
// Reposition the div signed by id to top/left positions
// If either top or left is blank, it is ginred in the movement
function repositionDiv(id,top,left)	   
{
 var div = document.getElementById(id);
 if( top  != "" ) div.style.top  = top  + "px";
 if( left != "" ) div.style.left = left + "px";
}
//==============================================================================
Ext.onReady(function()
{

 var currentDirectory_  = ""                                                                      ;  
 var currentRootObject_ = ""                                                                      ;  
 var currentTree_       = ""                                                                      ;
 var grid_              = ""                                                                      ;
 var selectedItem_      = "getDirectories";                                                       ;
 var theStore_          = ""                                                                      ;
 var theCanvas_         = ""                                                                      ;
 var headOfSources_     = ""                                                                      ;
 var theSources_        = ""                                                                      ;
 var theControls_       = ""                                                                      ;
 var thetheSourcesCB__  = ""                                                                      ;
 var dataModel_         = ""                                                                      ;
 var displayPlot_       = ""                                                                      ;
 var periodicPlotID_    = ""                                                                      ;
 var mdi_               = ""                                                                      ;
 var doReset_           = true                                                                    ;
 var _cookieCodeMailbox = self.parent.document.getElementById("DesktopContent-cookieCodeMailbox") ;
 var _cookieCode        = _cookieCodeMailbox.innerHTML                                            ;
 var _theWindow         = self                                                                    ;
 var _requestURL        = self.parent.window.location.origin                                     +
                          "/urn:xdaq-application:lid="                                           +
                          getLocalURN(0,"urn")                                                   +
                          "/Request?"                                                             ; 
 var viewportW          = window.innerWidth                                                       ;
 var viewportH          = window.innerHeight                                                      ;

 var topMargin_         = 28
 var bottomMargin_      = 5                                                                       ;
 var decorationH        = 0                                                                       ;
 var sourceT            = 0                                                                       ;
 var sourceL            = 0                                                                       ;
 var sourceW            = 380                                                                     ;
 var sourceH            = 25                                                                      ;
 var navigatorT         = topMargin_                                                              ;
 var navigatorL         =   0                                                                     ;
 var navigatorW         = 200                                                                     ;
 var navigatorH         = viewportH  - (topMargin_ + bottomMargin_) - decorationH                 ;
 var controlsT          = 460               ;
 var controlsL          = navigatorW + 5                                                          ;
 var controlsW          = viewportW  - navigatorW - 20                                            ;
 var controlsH          = 80                                                                      ;
 var canvasT            = navigatorT                                                              ;
 var canvasL            = navigatorW + 5                                                          ;
 var canvasW            = viewportW  - navigatorW - 20                                            ;
 var canvasH            = viewportH  - (topMargin_ + bottomMargin_) - decorationH - controlsH     ;
 
 generateDIVPlaceholder("sourceDiv"   , 0         , 0         )                                   ;
 generateDIVPlaceholder("navigatorDiv", navigatorT, navigatorL)                                   ;
 generateDIVPlaceholder("histogramDiv", canvasT   , canvasL   )                                   ;
 generateDIVPlaceholder("controlsDiv" , controlsT , controlsL )                                   ;

 //-----------------------------------------------------------------------------
 function STDLINE(str) 
 {
   const e = new Error()            ;
   const a = e.stack.split("\n")[1] ;
   const w = a.split("/")           ;
   const s = w.length -1            ;
   const l = w[s].split(":")[1]     ;
   const n = w[s].split(":")[0]     ;
   const m = l+"] ["+n+"] "+str     ;
   console.log(m)                   ;
 }
 //-----------------------------------------------------------------------------
 getXMLValue          = function(req, name) 
                        {
                         if(!name) return req.getAttribute("value");       
                         return getXMLAttributeValue(req,name,"value");
                        }

 //-----------------------------------------------------------------------------
 getXMLAttributeValue = function(req, name, attribute) 
                        {
                         var el;
                         if(el = getXMLNode(req,name)) return el.getAttribute(attribute);
                         else if((name == "Error" )&& (!req || !req.responseXML)) 
                          return "Unknown error occured "               + 
                                 "(XML response may have been illegal)!";
                         else
                          return undefined;
                        }

 //-----------------------------------------------------------------------------
 getXMLNode           = function(req, name) 
                        {
                         var els;
                         if(req && req.responseXML) 
                                 req = req.responseXML;
                         if(req)
                         {
                          var i;
                          els = req.getElementsByTagName(name);
                          if(els.length) return els[0];
                         }

                         return undefined;       
                        }
              
 //-----------------------------------------------------------------------------
 getXMLNodes          = function(req, name) 
                        {
                         var els;
                         if(req && req.responseXML) 
                                 req = req.responseXML;
                         if(req)
                         {
                          return req.getElementsByTagName(name);
                         }

                         return undefined;       
                        }
              
 //-----------------------------------------------------------------------------
 dataModel_ = Ext.define(
                         'DirectoriesDataModel',
                         {
                             extend: 'Ext.data.Model',
                             fields: [
                                      {name: 'dirName'    , type: 'string', convert: null},
                                      {name: 'fullPath'   , type: 'string', convert: null},
                                      {name: 'nChilds'    , type: 'int'   , convert: null},
                                      {name: 'foldersPath', type: 'string', convert: null}
                                     ]
                         }
                        );
 //-----------------------------------------------------------------------------
 // This panel represents the canvas to contain ROOT objects
 theCanvas_ = Ext.create(
                         'Ext.panel.Panel', 
                         {
                          renderTo  : 'histogramDiv',
                          fullscreen: true          ,
                          height    : canvasH       ,
                          width     : canvasW       ,
                          draggable : true          ,
                          defaults  : {
                                       styleHtmlContent: true
                                      },
                          items     : [
                                       {
                                        style : 'background-color: #5E99CC'                              ,
                                        id    : 'histogram1'                                             ,
                                        itemId: 'canvas'                                                 ,
                                        html  : '<p><p><center><h1>Canvas to display plots</h1></center>',
                                        height: canvasH                                                  ,
                                        width : canvasW          
                                       }
                                      ]
                         }
                        ).setPosition(0,0) ;
 //-----------------------------------------------------------------------------
 function createSources(dirs)
 {
  theSources_ = Ext.create  (
                             'Ext.data.Store', 
                             {
                              fields: ['abbr', 'dir'],
                              data  : dirs
                             }
                            );
  theSourcesCB_ = Ext.create(
                             'Ext.form.ComboBox', 
                             {
                              id          : 'source'   ,    
                              fieldLabel  : 'Source:'  ,
                              labelWidth  : 45         ,
                              height      : sourceH    ,
                              width       : sourceW    ,
                              store       : theSources_,
                              queryMode   : 'local'    ,
                              displayField: 'dir'      ,
                              valueField  : 'abbr'     ,
                              renderTo    : 'sourceDiv',
                              listeners   : {
                                             select    : function(thisCombo, record, eOpts)
                                                         {
                                                          headOfSources_    = record.data.dir                   ;
                                                          currentDirectory_ = "/" + headOfSources_              ;
                                                          STDLINE("currentDirectory_: "+currentDirectory_)      ;
                                                          makeStore(currentDirectory_, 'RequestType=getMeDirs') ;
                                                          makeGrid (currentDirectory_, 'Directories and files') ;
                                                         },
                                             focusleave: function (thisCombo) 
                                                         {
                                                          STDLINE('remove  selection listener') ;
                                                          thisCombo.suspendEvent('select')      ;
                                                          STDLINE('removed selection listener') ;
                                                         },
                                             focusenter: function (thisCombo) 
                                                         {
                                                          STDLINE('reinstate  selection listener') ;
                                                          thisCombo.resumeEvent('select')          ;
                                                          STDLINE('reinstated selection listener') ;
                                                         }
                                            }
                             }
                            ).setPosition(sourceT,sourceL);
  theSourcesCB_.setRawValue(dirs[0].dir) ; // Set default value
 }

 //-----------------------------------------------------------------------------
 var resetCanvasB = Ext.create (
                                'Ext.Button', 
                                {
                                 cls     : 'controlButtons',
                                 text    : 'Reset'         ,
                                 renderTo: 'controlsDiv'   ,
                                 margin  : 2               ,
                                 border  : 1               ,
                                 style   : {
                                            borderColor: 'blue',
                                            borderStyle: 'solid'
                                           },
                                 handler : function() 
                                           {
                                            JSROOT.cleanup('histogram1');
                                           }
                                }
                               ); 
 var clearCanvasB = Ext.create (
                                'Ext.Button', 
                                {
                                 text    : 'Clear'         ,
                                 renderTo: 'controlsDiv'   ,
                                 margin  : 2               ,
                                 border  : 1               ,
                                 style   : {
                                            borderColor: 'blue',
                                            borderStyle: 'solid'
                                           },
                                 handler : function() 
                                           {
                                            //theCanvas_.items.item[0].initialConfig.html = 'Display cleared' ;
                                            //theCanvas_.update() ;
                                            clearInterval(periodicPlotID_) ;
                                            JSROOT.cleanup('histogram1');
                                           }
                                }
                               ); 
 var freezeCanvasB = Ext.create(
                               'Ext.Button', 
                               {
                                text    : 'Freeze'        ,
                                renderTo: 'controlsDiv'   ,
                                margin  : 2               ,
                                border  : 1               ,
                                style   : {
                                           borderColor: 'blue',
                                           borderStyle: 'solid'
                                          },
                                handler : function() 
                                          {
                                           clearInterval(periodicPlotID_) ;
                                          }
                               }
                              ); 
 theControls_ = Ext.create    (
                               'Ext.panel.Panel', 
                               {
                                title    : 'Canvas controls',
                                width    : controlsW        ,
                                height   : controlsH        ,
                                renderTo : 'controlsDiv'    ,
                                draggable: true             ,
                                items    : [
                                            resetCanvasB    ,
                                            clearCanvasB    ,
                                            freezeCanvasB
                                           ]
                               }
                              ).setPosition(0,0); 
 //-----------------------------------------------------------------------------
 function makeGrid(where,what)
 { 
  if( grid_ ) grid_.destroy()   ;
  theStore_.sort('dirName', 'ASC');

  grid_ = Ext.create(
                     'Ext.tree.Panel', 
                     {
                      title      : what          ,
                      id         : 'navigator'   ,
                      store      : theStore_     ,
                      draggable  : true          ,
                      resizable  : true          ,
                      border     : true          ,
                      renderTo   : "navigatorDiv",
                      rootVisible: false         ,
                      useArrows  : true          ,
                      width      : navigatorW    ,
                      height     : navigatorH    ,
                      buttons    : [
                                    {
                                     xtype    : 'button'             ,
                                     text     : '<<'                 ,
                                     margin   : 2                    ,
                                     style    : {
                                                 borderColor: 'blue' ,
                                                 borderStyle: 'solid'
                                                }                    ,
                                     minWidth : 10                   ,
                                     height   : 25                   ,
                                     width    : 30                   ,
                                     listeners: {
                                                 click: function()
                                                        {
                                                         if( currentTree_ = 'fileContent' )
                                                         {
                                                          selectedItem_ = "getDirectories"                  ;
                                                          makeStore(headOfSources_, 'RequestType=getMeDirs') ; 
                                                          makeGrid (headOfSources_, 'Directories and files') ;
                                                         }
                                                        }
                                                }
                                    }
                                   ],
                      columns    : [
                                    {
                                     xtype    : 'treecolumn' ,
                                     id       : 'provenance' ,
                                     text     : where        ,
                                     flex     : 1            ,
                                     dataIndex: 'dirName'
                                    },
                                    {
                                     xtype    : 'treecolumn' ,
                                     hidden   : false        ,
                                     text     : 'type'       ,
                                     width    : 1            ,
                                     dataIndex: 'leaf'                
                                    },
                                    {
                                     xtype    : 'treecolumn' ,
                                     hidden   : false        ,
                                     text     : 'fullPath'   ,
                                     width    : 1            ,
                                     dataIndex: 'fullPath'                
                                    },
                                    {
                                     xtype    : 'treecolumn' ,
                                     hidden   : false        ,
                                     text     : 'foldersPath',
                                     width    : 1            ,
                                     dataIndex: 'foldersPath'                
                                    }
                                   ],
                      listeners  : {
                                    itemclick : function(thisItem, record, item, index, e, eOpts)
                                                {
                                                 var itemSplit   = item.innerText.split("\n\t\n")                 ;
                                                 var objectName  = itemSplit[0]                                   ;
                                                 var isLeaf      = itemSplit[1].replace("\n","").replace("\t","") ;
                                                 var provenance  = itemSplit[2]                                   ;
                                                 var foldersPath = itemSplit[3]                                   ;
                                                 if( typeof foldersPath === "undefined" ) foldersPath = ""        ;
                                                 STDLINE('item.innerText   = |'+item.innerText   +'|')            ;
                                                 STDLINE('objectName       = |'+objectName       +'|')            ;
                                                 STDLINE('isLeaf           = |'+isLeaf           +'|')            ;
                                                 STDLINE('provenance       = |'+provenance       +'|')            ;
                                                 STDLINE('currentDirectory_= |'+currentDirectory_+'|')            ;
                                                 STDLINE('foldersPath      = |'+foldersPath      +'|')            ;
                                                 STDLINE('selectedItem_    = |'+selectedItem_    +'|')            ;
                                                 if( isLeaf == "true" ) 
                                                 {
                                                  if( selectedItem_ == "getDirectories" )
                                                  {
                                                   selectedItem_      = "getRootObject"                    ;
                                                   currentTree_       = 'fileContent'                      ;
                                                   currentDirectory_ = theSourcesCB_.getValue()           +
                                                                       '/'                                +
                                                                       foldersPath                        +
                                                                       "/"                                +
                                                                       objectName  ;
                                                   STDLINE('RequestType      : getMeRootFile'     )        ;
                                                   STDLINE('currentDirectory_: '+currentDirectory_)        ;
                                                   makeStore(currentDirectory_,'RequestType=getMeRootFile');
                                                   makeGrid (currentDirectory_,'ROOT file content'        );
                                                  }
                                                  else if( selectedItem_ == "getRootObject" )
                                                  { 
                                                   currentRootObject_ = "/"                               + 
                                                                       currentDirectory_                  +
                                                                       ":/"                               +
                                                                       foldersPath                        +
                                                                       "/"                                +
                                                                       objectName                          ; 
                                                   STDLINE('RequestType       : getRoot'            )      ;
                                                   STDLINE('provenanceB       : '+provenance        )      ;
                                                   STDLINE('objectName        : '+objectName        )      ;
                                                   STDLINE('currentDirectory_ : '+currentDirectory_ )      ;
                                                   STDLINE('currentRootObject_: '+currentRootObject_)      ;
                                                   theAjaxRequest(
                                                                  _requestURL+"RequestType=getRoot",
                                                                  {                                                           
                                                                   CookieCode: _cookieCode,                                  
                                                                   RootPath  : currentRootObject_                                     
                                                                  }, 
                                                                  ""
                                                                 ) ;                                                         
                                                  }
                                                 }
                                                },
                                    headerclick: function(ct, column, e, t, eOpts)
                                                 {
                                                  var a = column ;
                                                 }
                                   }
                     }
                    ).setPosition(0,0);
                   
  var objectProvenance = Ext.create(
                                    'Ext.tip.ToolTip', 
                                    {
                                     target: 'provenance',
                                     html  : 'Object provenance: ' + where
                                    }
                                   );
 }
 //-----------------------------------------------------------------------------
 function makeStore(path, reqType)
 { 
  theStore_ = Ext.create(
                         'Ext.data.TreeStore', 
                         {
                          model    : 'DirectoriesDataModel',
                          id       : 'theStore',
                          autoLoad : false,
                          root     : {
                                      expanded     : true
                                     },
                          proxy    : {
                                      type         : 'ajax',
                                      actionMethods: {
                                                      read         : 'POST'
                                                     },
                                      extraParams  : {
                                                      "CookieCode" : _cookieCode,
                                                      "Path"       : path
                                                     },
                                      url          : _requestURL + reqType,
                                      reader       : {
                                                      type         : 'xml',
                                                      root         : 'nodes',
                                                      record       : '> node'
                                                     },
                                     },
                          listeners: {
                                      beforeload : function(thisStore, operation, eOpts) 
                                                   {
                                                    STDLINE("Request: "+_requestURL + reqType) ;
                                                   }
                                     }
                         }
                        );
  theStore_.load() ;
 }
 
 //-----------------------------------------------------------------------------
 // This function serves two different purposes:
 // 1 - retrieve the heads of the filesystem directories where ROOT files reside
 // 2 - retrieve a specific ROOT file object to display on an Extjs canvas
 
 function theAjaxRequest(theRequestURL,theParams,theRawData)                                                                   
 {                                                                                                                                        
  Ext.Ajax.request(                                                                                                                       
                   {                                                                                                                      
                    url    : theRequestURL,                                                                                               
                    method : 'POST',                                                                                                      
                    headers: {                                                                                                            
                              'Content-Type': 'text/plain;charset=UTF-8'                                                                  
                             },                                                                                                           
                    params : theParams,                                                                                                          
                    rawData: theRawData,                                                                                                  
                    timeout: 20000,                                                                                                       
                    success: function(response, request)                                                                                  
                             { 
                              STDLINE("Successful") ;
                              if(getXMLValue(response,"headOfSearch") == 'located')                                                                      
                              { // Get list of head-points
                               var dirs     = [] ;
                               var theNodes = getXMLNodes(response,'dir') ;
                               for(var i=0; i<theNodes.length; ++i)
                               {
                                var theDir = theNodes[i].getAttribute("value")
                                dirs.push({"abbr":  theDir, "dir": theDir}) ;
                               }

                               createSources(dirs) ;
                               var a = 0 ;                                                    
                              }                                                                                                         
                              else if(!(typeof getXMLValue(response,"rootType") == 'undefined'))                                                                      
                              { // get specific ROOT Object and display
                               if( periodicPlotID_ != "" ) 
                               {
                                clearInterval(periodicPlotID_) ;
                                doReset_ = true ;
                               }
                               var rootName  = getXMLValue (response,"path"    );                                       
                               var rootJSON  = getXMLValue (response,"rootJSON");                                   
                               var object    = JSROOT.parse(rootJSON           );                                              
                               displayPlot_(object) ; // This is to get an immediate response
                               periodicPlotID_ = setInterval(
                                                             function()
                                                             {
                                                              displayPlot_(object) ; // This is delayed
                                                             }, 
                                                             2000
                                                            );
                              }
                             },                                                                                                           
                    failure: function(response, options)                                                                                  
                             {                                                                                                            
                              var a = response ;                                                                                          
                              Ext.MessageBox.alert(                                                                                       
                                                   'Something went wrong:',                                                               
                                                   'Response: ' + response.responseText                                                   
                                                  );                                                                                      
                             }                                                                                                            
                   }                                                                                                                      
           );                                                                                                                             
 } ;                                                                                                                                      
 //-----------------------------------------------------------------------------
 displayPlot_ = function(object)
                {
//mdi_ = new JSROOT.GridDisplay('drawing', layout);

                 var rootTitle = object.fTitle     ;                                                                     
                 if( doReset_ )
                 {
                  STDLINE("Resetting " + rootTitle);
                  JSROOT.redraw (
                                 'histogram1'      ,                                                                  
                                 object            ,
                                 ""
                                );
                  doReset_ = false ;                                                                                
                 }
                 else
                 {
                  STDLINE("Updating " + rootTitle) ;
                  JSROOT.draw (
                               'histogram1'        ,                                                                  
                               object              ,
                               ""
                              );                                                                                
                 }
                }
 //-----------------------------------------------------------------------------
 self.onresize = function()
                 {
                  var w = window.innerWidth;
                  var h = window.innerHeight;
                  theCanvas_.setSize(w,h) ;
                  theCanvas_.width                 = w - navigatorW - 20 ;
                  theCanvas_.height                = h - (topMargin_ + bottomMargin_) - decorationH - controlsH ;
                  theCanvas_.items.items[0].width  = theCanvas_.width  ;
                  theCanvas_.items.items[0].height = theCanvas_.height ;
                  repositionDiv(
                                "controlsDiv",  
                                theCanvas_.height + topMargin_, 
                                "" // No horizontal repositioning
                               ) ;
                  theCanvas_.update() ; 
                  if( currentRootObject_ == "" ) return ;
                  theAjaxRequest(
                                 _requestURL+"RequestType=getRoot",
                                 {                                                            
                                  CookieCode: _cookieCode,                                   
                                  RootPath  : "/"              + 
                                              currentRootObject_                               
                                 }, 
                                 ""
                                ) ;                                                          
                 };
 //=================================== Begin operations ==================================================

 currentTree_ = 'files' ;

 theAjaxRequest(
                _requestURL+"RequestType=getDirectoryContents",
                {                                                            
                 CookieCode: _cookieCode,                                   
                 Path      : "/"                                 
                }, 
                ""
               ) ;                                                          

});

