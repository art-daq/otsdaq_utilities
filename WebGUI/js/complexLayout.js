/*---------------------------------------------------------------------------------------------------
 Author : D. Menasce
 Purpose: Code to instantiate and manipulate the histogram navigator component
-------------------------------------------------------------------------------------------------- */

Ext.require(['*']);
Ext.QuickTips.init();

Ext.state.Manager.setProvider(Ext.create('Ext.state.CookieProvider'));


//---------------------------- Execute noly once head has been fully loaded -------------------------
Ext.onReady(
function() 
{
 var buttonStyle_         = 'margin-left  : 2px;' +
                            'margin-right : 2px;' + 
                            'margin-top   : 2px;' +
                            'margin-bottom: 2px;' +
                            'padding      : 2px;'                                                   ;
 var canvasTabs_          = []                                                                      ;
 var clearCanvas_         = true                                                                    ;     
 var currentCanvas_       = 0                                                                       ;
// var currentPad_          = 0                                                                       ;
 var dataModel_           = ""                                                                      ;
 var enableDebug_         = true                                                                    ;
 var globalCanvas_        = 0                                                                       ;
 var gridDivision_        = "grid1x1"                                                               ;
 var doReset_             = true                                                                    ;
 var grid_                = ""                                                                      ;
 var mdi_                 = ""                                                                      ;
 var nxPlots_             = 1                                                                       ;
 var nyPlots_             = 1                                                                       ;
 var periodicPlotID_      = 0                                                                       ;
 var ROOTControlsPanel_   = 0                                                                       ;
 var selectedItem_        = "getDirectories";                                                       ;
 var superimposeFlag_     = false                                                                   ;
 var theInformationPanel_ = 0                                                                       ;
 var theNavigatorPanel_   = 0                                                                       ;
 var theStore_            = 0                                                                       ;
 var theViewPort_         = 0                                                                       ;
 var timeoutInterval_     = 2                                                                       ;
 var treeDisplayField_    = "fDisplayName"                                                          ;

 var _cookieCodeMailbox   = self.parent.document.getElementById("DesktopContent-cookieCodeMailbox") ;
 var _cookieCode          = _cookieCodeMailbox.innerHTML                                            ;
 var _theWindow           = self                                                                    ;
 var _requestURL          = self.parent.window.location.origin                                     +
                            "/urn:xdaq-application:lid="                                           +
                            getLocalURN(0,"urn")                                                   +
                            "/Request?"                                                             ;


 enableSTDLINE(enableDebug_) ;

 generateDIVPlaceholderSize('canvas0',350,440) ;	   
 generateDIVPlaceholderSize('canvas1',350,440) ;	   

 //--------------------------------------------------------------------------------------------------
 getCanvasDiv_ = function(number)
                 {
                  return 'canvas' + number ;
                 }
 
 //--------------------------------------------------------------------------------------------------
 /* Hash elements are addressed by an index of type canvasx_y where x is the currentCanvas_ and y is currentPad_

    A provenance record has the following structure:
    
    {
     fSystemPath_   : {},                                                 
     fRootPath_     : {},                                                 
     fFoldersPath_  : {},                                                 
     fRFoldersPath_ : {},                                                 
     fFileName_     : {},                                                 
     fHistName_     : {}
    }                                                 
 */
 
 var theProvenance_ = {
                       fSystemPath_   : [],                                                 
                       fRootPath_     : [],                                                 
                       fFoldersPath_  : [],                                                 
                       fRFoldersPath_ : [],
                       fFileName_     : [],                                                 
                       fHistName_     : [],                                                 
                       fRequestURL_   : [],
                       fParams_       : [],                                                               
                       setSystemPath  : function(SystemPath  , theCanvas, thePad)                                
                                        {  
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         if( typeof SystemPath   === "undefined" ) this.fSystemPath_  [addr]=""
                                         else                                      this.fSystemPath_  [addr]=SystemPath  ;
                                         STDLINE("addr : "         + 
                                                 addr              + 
                                                 " fSystemPath_: " +
                                                 this.fSystemPath_[addr]) ;               
                                        },                                                   
                       setRootPath    : function(RootPath    , theCanvas, thePad)                                     
                                        {                                                    
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; STDLINE("RootPath: "+RootPath);
                                         if( typeof RootPath     === "undefined" ) this.fRootPath_    [addr]="" 
                                         else                                      this.fRootPath_    [addr]=RootPath    ; 
                                         STDLINE("addr : "         + 
                                                 addr              + 
                                                 " fRootPath_: "   +
                                                 this.fRootPath_[addr]) ;               
                                        },                                                   
                       setFoldersPath : function(FoldersPath , theCanvas, thePad)                                
                                        {                                                    
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         if( typeof FoldersPath  === "undefined" ) this.fFoldersPath_ [addr]="" 
                                         else                                      this.fFoldersPath_ [addr]=FoldersPath ;                   
                                        },                                                   
                       setRFoldersPath: function(RFoldersPath, theCanvas, thePad)                              
                                        {                                                    
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         if( typeof RFoldersPath === "undefined" ) this.fRFoldersPath_[addr]="" 
                                         else                                      this.fRFoldersPath_[addr]=RFoldersPath;                   
                                        },                                                  
                       setFileName    : function(FileName    , theCanvas, thePad)                                    
                                        {                                                    
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         if( typeof FileName     === "undefined" ) this.fFileName_    [addr]=""           
                                         else                                      this.fFileName_    [addr]=FileName    ;             
                                        },                                                   
                       setHistName    : function(HistName    , theCanvas, thePad)                                    
                                        {                                                    
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         if( typeof HistName     === "undefined" ) this.fHistName_    [addr]="" 
                                         else                                      this.fHistName_    [addr]=HistName    ;             
                                        },                                                   
                       setRequestURL  : function(requestURL, theCanvas, thePad) 
                                        {
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         if( typeof requestURL   === "undefined" ) this.fRequestURL_  [addr]="" 
                                         else                                      this.fRequestURL_  [addr]=requestURL   ;             
                                        },
                       setParams      : function(params, theCanvas, thePad) 
                                        {
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         if( typeof params       === "undefined" ) this.fParams_      [addr]="" 
                                         else                                      this.fParams_      [addr]=params   ;         
                                        },
                       getPathsNumber : function()
                                        {
                                         return Object.keys(this.fSystemPath_).length ;
                                        },
                       getSystemPath  : function(theCanvas, thePad)                              
                                        {  
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         return this.fSystemPath_  [addr] ;                    
                                        },                                            
                       getRootPath    : function(theCanvas, thePad)                          
                                        {                                             
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         return this.fRootPath_    [addr] ;                    
                                        },                                            
                       getFoldersPath : function(theCanvas, thePad)                       
                                        {                                             
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         return this.fFoldersPath_ [addr] ;                     
                                        },                                             
                       getRFoldersPath: function(theCanvas, thePad)                       
                                        {                                             
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         return this.fRFoldersPath_[addr] ;                      
                                        },                                                  
                       getFileName    : function(theCanvas, thePad)                           
                                        {                                             
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         return this.fFileName_    [addr] ;                     
                                        },                                            
                       getHistName    : function(theCanvas, thePad)                           
                                        {                                             
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         return this.fHistName_    [addr] ;                     
                                        },                                            
                       getRequestURL  : function(theCanvas, thePad) 
                                        {
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         return this.fRequestURL_  [addr] ;                     
                                        },
                       getParams      : function(theCanvas, thePad) 
                                        {
                                         var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                         return this.fParams_      [addr] ;                     
                                        },
                       dumpAll        : function(fromWhere)                                 
                                        { 
                                         STDLINE("<<=========== From: "+fromWhere+" ===========<<"           );                                  
                                         for(var j in this.fSystemPath_)
                                         {
                                          this.dump(fromWhere, j                                             );
                                         }
                                         STDLINE(">>===================================>>"                   );
                                        },                                                   
                       dump           : function(fromWhere, i)                                 
                                        {                                                   
                                         STDLINE("   ------------------------------------------------------" );
                                         STDLINE("   From: '"+fromWhere+"' ("+i+ ")"                         );
                                         STDLINE("   --> fSystemPath_     : "+this.fSystemPath_  [i]         );
                                         STDLINE("   --> fRootPath_       : "+this.fRootPath_    [i]         );
                                         STDLINE("   --> fFoldersPath_    : "+this.fFoldersPath_ [i]         );
                                         STDLINE("   --> fFileName_       : "+this.fFileName_    [i]         );
                                         STDLINE("   --> fRFoldersPath_   : "+this.fRFoldersPath_[i]         );
                                         STDLINE("   --> fHistName_       : "+this.fHistName_    [i]         );
                                         STDLINE("   --> fRequestURL_     : "+this.fRequestURL_  [i]         );
                                         if( typeof this.fParams_[i] !== "undefined" ) 
                                         {
                                          STDLINE("   --> fParams_.RootPath: "+this.fParams_     [i].RootPath); 
                                         }
                                         STDLINE("   ------------------------------------------------------" );
                                          
                                        }                                                   
                      } ;                                                                   

 //--------------------------------------------------------------------------------------------------
 /* This is a class to handle the canvases displayed on the GUI as distinct tabs.
    A canvasModel record structure is the following:

    {
     canvasName : 'canvasX'       ,
     nDivX      : 1               ,
     nDivY      : 1               ,
     currentDivX: 0               ,
     currentDivY: 0               ,
     currentPad : 0               ,
     objects    : [
                   {
                    pad       : p            ,
                    object    : theObject    ,
                    provenance: theProvenance
                   }                                              
                  ]                   
    }                              
 */
 var theCanvasModel_ = {
                        currentCanvas  : 0  ,
                        currentWidth   : 350,
                        currentHeight  : 440,
                        canvases       : [
                                          {
                                           canvasName : 'canvas0'       ,
                                           nDivX      : 1               ,
                                           nDivY      : 1               ,
                                           currentDivX: 0               ,
                                           currentDivY: 0               ,
                                           currentPad : 0               ,
                                           objects    : []                // objects[i] = {       
                                          },                              //               pad       : x
                                          {                               //               object    : y
                                           canvasName : 'canvas1'       , //               provenance: z
                                           nDivX      : 1               , //              }
                                           nDivY      : 1               ,
                                           currentDivX: 0               ,
                                           currentDivY: 0               ,
                                           currentPad : 0               ,
                                           objects    : []         
                                          }
                                         ],
                        addCanvas      : function()
                                         {
                                          var l = this.canvases.length - 1;
                                          this.canvases[l] = {
                                                              canvasName : 'canvas' + l    ,
                                                              nDivX      : 1               ,
                                                              nDivY      : 1               ,
                                                              currentDivX: 0               ,
                                                              currentDivY: 0               ,
                                                              currentPad : 0               ,
                                                              objects    : []         
                                                             }
                                         },  
                        addROOTObject  : function(canvasNumber, theObject, theProvenance)
                                         {
                                          if( canvasNumber > this.canvases.length-1 ) return        ;
                                          var t = this.canvases[canvasNumber]                       ;
                                          var p = this.canvases[canvasNumber].objects.length        ;
                                          STDLINE("currentPad: "                                   +
                                                  p                                                +
                                                  " on canvasNumber: "                             +
                                                  canvasNumber                                     );
                                          var obj = {
                                                     pad       : p                                 ,
                                                     object    : theObject                         ,
                                                     provenance: theProvenance
                                                    }                                               ;
                                          this.canvases[canvasNumber].objects.push(obj)             ;      
//                                          this.dumpContent("Added new ROOT object")                 ;
                                         },
                        nextPad        : function(canvasNumber)
                                         {
                                          if( canvasNumber > this.canvases.length-1 ) return        ;
                                          var currentPad = this.canvases[canvasNumber].currentPad   ;
                                          this.canvases[canvasNumber].currentPad = currentPad + 1   ;
                                          STDLINE("New pad  : "+this.canvases[canvasNumber].currentPad) ;
                                         },
                        populate       : function(canvasNumber, theRequestURL,theParams,object)
                                         {
                                          if( canvasNumber > this.canvases.length-1 ) return        ;
                                          var thePad = this.canvases[canvasNumber].currentPad       ;
                                          var rowcol = this.getDivXDivY(canvasNumber,thePad)        ;
                                         },
                        resetCurrentPad: function(canvasNumber)
                                         {
                                          if(canvasNumber< 0 || canvasNumber>this.canvases.length-1) 
                                            return                                                  ;
                                          this.canvases[canvasNumber].currentPad = 0                ;  
                                          STDLINE("pad reset: "+this.canvases[canvasNumber].currentPad) ;
                                         },
                        getCurrentPad  : function(canvasNumber)
                                         {
                                          if(canvasNumber< 0 || canvasNumber>this.canvases.length-1) 
                                            return                                                  ;
                                          var t = this.canvases[canvasNumber]                       ;
                                          if( t.currentPad >= t.nDivX * t.nDivY ) 
                                              this.canvases[canvasNumber].currentPad = 0            ;
                                          STDLINE("currentPad: "+
                                                  t.currentPad  +
                                                  " on canvas: "+
                                                  canvasNumber)                                     ;
                                          return t.currentPad                                       ;
                                         },                
                        getCurrentPadC : function(canvasNumber)
                                         {
                                          var thePad ="canvas"      +
                                                       canvasNumber +
                                                       "_"          +
                                                       this.getCurrentPad(canvasNumber)             ;
                                          return thePad                                             ;
                                         },                
                        getDivXDivY    : function(canvasNumber, thePad)
                                         {
                                          if( canvasNumber > this.canvases.length-1 ) return        ;
                                          var divX = this.canvases[canvasNumber].nDivX              ;
                                          var divY = this.canvases[canvasNumber].nDivY              ;
                                          var row  = Math.floor(thePad / divX)                      ;
                                          var col  = thePad % divX                                  ;
                                          STDLINE("currentCanvas: " + canvasNumber +
                                                  " pad: "          + thePad       +
                                                  " row: "          + row          +
                                                  " col: "          + col          ) ;
                                          return [row,col]                                          ;
                                         },
                        getROOTObjects : function(canvasNumber)
                                         {
                                          if( canvasNumber > this.canvases.length-1      ) return   ;
                                          return this.canvases[canvasNumber].objects                ;
                                         },
                        getROOTObject:   function(canvasNumber,padNumber)
                                         {
                                          if( canvasNumber > this.canvases.length-1      ) return   ;
                                          return this.canvases[canvasNumber].objects[padNumber]     ;
                                         },
                        clearCanvas    : function(canvasNumber)
                                         {
                                          if( canvasNumber > this.canvases.length-1      ) return   ;
                                          var l = canvasNumber                                      ;
                                          var divX = this.canvases[canvasNumber].nDivX              ;
                                          var divY = this.canvases[canvasNumber].nDivY              ;
                                          this.canvases[canvasNumber] = {
                                                                         canvasName : 'canvas' + l ,
                                                                         nDivX      : divX         ,
                                                                         nDivY      : divY         ,
                                                                         currentDivX: 0            ,
                                                                         currentDivY: 0            ,
                                                                         currentPad : 0            ,
                                                                         objects    : []         
                                                                        }
                                          STDLINE("Remaining: " +  this.canvases[canvasNumber].objects.length) ;                            
                                         },  
                        removeCanvas   : function(canvasNumber)
                                         {
                                          var index = this.canvases.indexOf(canvasNumber)           ;
                                          this.canvases.splice(index,1)                             ;
                                         },  
                        changenDivX    : function(canvasNumber, newnDivX)
                                         {
                                          if( canvasNumber > this.canvases.length-1      ) return   ;
                                          this.canvases[canvasNumber].nDivX = newnDivX              ;
                                         },
                        changenDivY    : function(canvasNumber, newnDivY)
                                         {
                                          if( canvasNumber > this.canvases.length-1      ) return   ;
                                          this.canvases[canvasNumber].nDivY = newnDivY              ;
                                         },
                        setnDivX       : function(canvasNumber, newValue)
                                         {
                                          if( canvasNumber > this.canvases.length-1      ) return   ;
                                          STDLINE("setting divX: "+newValue)                        ;
                                          this.canvases[canvasNumber].nDivX   = newValue            ;
                                          this.canvases[canvasNumber].objects = []                  ;
                                         },                
                        getnDivX       : function(canvasNumber)
                                         {
                                          if( canvasNumber > this.canvases.length-1      ) return   ;
                                          STDLINE("divX: "+this.canvases[canvasNumber].nDivX)       ;
                                          return this.canvases[canvasNumber].nDivX                  ;
                                         },                
                        setnDivY       : function(canvasNumber, newValue)
                                         {
                                          if( canvasNumber > this.canvases.length-1      ) return   ;
                                          STDLINE("setting divY: "+newValue)                        ;
                                          this.canvases[canvasNumber].nDivY   = newValue            ;
                                          this.canvases[canvasNumber].objects = []                  ;
                                         },                
                        getnDivY       : function(canvasNumber)
                                         {
                                          if( canvasNumber > this.canvases.length-1      ) return   ;
                                          STDLINE("divY: "+this.canvases[canvasNumber].nDivY)       ;
                                          return this.canvases[canvasNumber].nDivY                  ;
                                         },                
                        setDivPosition : function(canvasNumber, posX, posY)
                                         {
                                          if( canvasNumber > this.canvases.length-1      ) return   ;
                                          var nx   = this.canvases[canvasNumber].nDivX              ;
                                          var ny   = this.canvases[canvasNumber].nDivY              ;
                                          if( posX > nx || posY > ny ) return                       ;
                                          var modY = posY%nx                                        ;
                                          var pos  = modY * nx + posX                               ;
                                          this.canvases[canvasNumber].currentPad = pos              ;
                                         },
                        dump           : function(theCanvas, what)
                                         {
                                          var theC = this.canvases[theCanvas] ;
                                          STDLINE(" <<______ "     + what             + " _______________<<" ) ;
                                          STDLINE(" -------- "     + theC.canvasName  + " ---------"         ) ;
                                          STDLINE(" name      : "  + theC.canvasName                         ) ;
                                          STDLINE(" divs      : "  + theC.nDivX + "x" + theC.nDivY           ) ;
                                          STDLINE(" nDivX     : "  + theC.nDivX                              ) ;
                                          STDLINE(" nDivY     : "  + theC.nDivY                              ) ;
                                          STDLINE(" currentPad: "  + theC.currentPad                         ) ;
                                          STDLINE(" objects   : "  + Object.keys(theC.objects).length        ) ;
                                          for( var j in theC.objects)
                                          {
                                           var o      = theC.objects[j]                                        ;
                                           var pad    = o.pad                                                  ;
                                           var obj    = o.object                                               ;
                                           var fTitle = obj.fTitle                                             ;
                                           var fName  = obj.fName                                              ;
                                           var pad    = 'canvas' + theCanvas + '_' + j                         ;
                                           STDLINE("   object #  : " + j                                     ) ;
                                           STDLINE("   fTitle    : " + fTitle                                ) ;
                                           STDLINE("   fName     : " + fName                                 ) ;
                                           STDLINE("   pad       : " + pad                                   ) ;
                                           theC.objects[j].provenance.dump("provenance: "+fTitle ,pad        ) ;
//                                            this.getDivXDivY(currentCanvas_,theC.currentPad                   ) ;
                                          }
                                          STDLINE(" >>______ "     + what             + " _______________>>" ) ;
                                         }, 
                        dumpContent    : function(where)
                                         {
                                          STDLINE(">>================== " + where + " =====================>>") ;
                                          STDLINE("Size: " + this.currentWidth + "x" + this.currentHeight     ) ;
                                          STDLINE("Number of canvases: "+this.canvases.length                 ) ;
                                          for(var i=0; i<this.canvases.length; i++)
                                          {
                                           this.dump(i, where) ;
                                          }
                                          STDLINE("<<======================================================<<") ;
                                         }
                       } ;

 //-----------------------------------------------------------------------------
 // Resize the div signed by id to width/height sizes
 function changeHistogramPanelSize(thisPanel, width, height, from)      
 {
  var ROOTObjects = theCanvasModel_.getROOTObjects(currentCanvas_);
  STDLINE("New canvas size: "                                    +
          width                                                  +
          "x"                                                    +
          height                                                 +
          " for "                                                +
          Object.keys(ROOTObjects).length                        +
          " objects on canvas "                                  +
          currentCanvas_                                         );
  var div = document.getElementById(getCanvasDiv_(currentCanvas_));
  div.style.width  = width  - 20                                  ;
  div.style.height = height - 30                                  ;
  for(var i in ROOTObjects)
  {
   var object = ROOTObjects[i]                                    ;
   theCanvasModel_.addROOTObject(currentCanvas_                  ,
                                 object                          ,
                                 theProvenance_                ) ;
   displayPlot_(object)                                          ;
  }
 } 
             
 //-----------------------------------------------------------------------------------------------
 function createCanvasTab(tabNumber)
 {
  STDLINE("Creating canvas tab number "+tabNumber) ;
  var closable = false ;
  if(tabNumber>0) closable = true ;
  canvasTabs_.push(Ext.create(
                              'Ext.panel.Panel',
                              {
                               contentEl : 'canvas' +tabNumber,
                               title     : 'Canvas '+tabNumber,
                               closable  : closable           ,
                               border    : true               ,
                               autoScroll: true
                              }
                             ) 
                  );
  STDLINE("New tab created") ;
 }

 createCanvasTab(0) ;
 createCanvasTab(1) ;

 //-----------------------------------------------------------------------------------------------
 var nDivXCB = Ext.create(
                          'Ext.form.field.Number',
                          {
                           xtype     : 'numberfield'       ,  
                           name      : 'hzon'              ,
                           labelWidth: 50                  ,
                           flex      : 0                   ,
                           width     : 100                 ,
                           height    : 18                  ,
                           fieldLabel: 'PlotsX'            ,  
                           value     : 1                   ,  
                           minValue  : 1                   ,  
                           maxValue  : 20                  ,
                           style     : buttonStyle_        ,
                           listeners : {
                                        change: function( thisSpinner, newValue, oldValue, eOpts )
                                                {
                                                 theCanvasModel_.setnDivX(currentCanvas_, newValue) ;
                                                }
                                       }
                          }
                         ) ;
 //-----------------------------------------------------------------------------------------------
 var nDivYCB = Ext.create(
                          'Ext.form.field.Number',
                          {
                           xtype     : 'numberfield'       ,  
                           name      : 'vzon'              ,
                           labelWidth: 50                  ,
                           flex      : 0                   ,
                           width     : 100                 ,
                           height    : 18                  ,
                           fieldLabel: 'PlotsY'            ,  
                           value     : 1                   ,  
                           minValue  : 1                   ,  
                           maxValue  : 20                  ,
                           style     : buttonStyle_        ,      
                           listeners : {
                                        change: function( thisSpinner, newValue, oldValue, eOpts )
                                                {
                                                 theCanvasModel_.setnDivY(currentCanvas_, newValue);
                                                }
                                       }
                          }
                         ) ;
 //-----------------------------------------------------------------------------------------------
 var refreshIntervalSpinbox = Ext.create(
                                         'Ext.form.field.Number',
                                         {
                                          xtype           : 'numberfield'     ,
                                          width           : 100               ,
                                          height          : 10                ,
                                          fieldLabel      : 'Interval'        ,
                                          labelWidth      : 45                ,
                                          name            : 'updateInterval'  ,
                                          value           : 1.000             ,
                                          minValue        : 1.00              ,
                                          maxValue        : 30.000            ,
                                          allowDecimals   : true              ,
                                          tooltip         : 'Refresh interval',
                                          decimalPrecision: 2
                                         }
                                        );                                                         
 //-----------------------------------------------------------------------------------------------
 function makeROOTControlsPanel()
 {
  if( ROOTControlsPanel_ ) ROOTControlsPanel_.destroy() ;
  ROOTControlsPanel_ = Ext.create(
                                  'Ext.panel.Panel',
                                  {
                                   region      : 'east'              ,
                                   id          : 'east-panel'        ,
                                   title       : 'ROOT Controls'     ,
                                   split       : true                ,
                                   width       : 110                 ,
                                   minWidth    : 100                 ,
                                   maxWidth    : 400                 ,
                                   collapsible : true                ,
                                   collapsed   : true                ,
                                   animCollapse: true                ,
                                   margins     : '0 0 0 5'           ,
                                   layout      : 'accordion'         ,
                                   items       : [
                                                  {
                                                   title     : 'Canvas'                                      ,
                                                   autoScroll: true                                          ,
                                                   layout    : 'vbox'                                        ,
                                                   tooltip   : 'Canvas controls'                             ,
                                                   tools     : [
                                                                {
                                                                 type      : 'next'                          ,  
                                                                 tooltip   : 'Maximize canvas size'          ,
                                                                 handler   : function()
                                                                             {
                                                                              STDLINE("Collapsing") ;
                                                                              theNavigatorPanel_  .collapse() ; 
                                                                              ROOTControlsPanel_  .collapse() ; 
                                                                              theInformationPanel_.collapse() ; 
                                                                             }
                                                                }
                                                               ],
                                                   items     : [
                                                                {
                                                                 xtype     : 'button'                        ,
                                                                 text      : 'Add canvas'                    ,
                                                                 tooltip   : 'Add a new canvas'              ,
                                                                 width     : 100                             ,
                                                                 height    : 20                              ,
                                                                 pressed   : true                            ,
                                                                 border    : true                            ,
                                                                 style     : buttonStyle_                    , 
                                                                 handler   : function()
                                                                             {
                                                                              var addIndex   = globalCanvas_.items.length                      ;
                                                                              currentCanvas_ = addIndex  + 1                                   ;
                                                                              theCanvasModel_.addCanvas()                                      ;
                                                                              generateDIVPlaceholderSize(getCanvasDiv_(currentCanvas_),350,440);          
                                                                              changeHistogramPanelSize(
                                                                                                       'canvas'+currentCanvas_      , 
                                                                                                       theCanvasModel_.currentWidth , 
                                                                                                       theCanvasModel_.currentHeight, 
                                                                                                       "resized"
                                                                                                      ) ;
                                                                              globalCanvas_.insert(
                                                                                                   addIndex,
                                                                                                   {
                                                                                                    contentEl : getCanvasDiv_(currentCanvas_),
                                                                                                    title     : 'Canvas ' +  currentCanvas_  ,
                                                                                                    closable  : true                         ,
                                                                                                    border    : true                         ,
                                                                                                    autoScroll: true
                                                                                                   }
                                                                                                  );
                                                                              globalCanvas_.setActiveTab(addIndex)                            ;
                                                                              STDLINE("Adding new canvas tab")                                ;
                                                                             }
                                                                }, {
                                                                 xtype     : 'button'                                     ,
                                                                 text      : 'Clear canvas'                               ,
                                                                 pressed   : true                                         ,
                                                                 width     : 100                                          ,
                                                                 height    : 20                                           ,
                                                                 tooltip   : 'Clear the current canvas content but do not'+
                                                                             ' reset the list of displayed plots'         ,
                                                                 border    : true                                         ,
                                                                 style     : buttonStyle_                                 ,   
                                                                 handler   : function()  
                                                                             {
                                                                              JSROOT.cleanup(getCanvasDiv_(currentCanvas_));
//                                                                              theCanvasModel_.clearCanvas (currentCanvas_) ;
                                                                              theCanvasModel_.dumpContent ("Clear canvas") ;
                                                                             }
                                                                }, {
                                                                 xtype     : 'button'                                     ,
                                                                 text      : 'Reset canvas'                               ,
                                                                 pressed   : true                                         ,
                                                                 width     : 100                                          ,
                                                                 height    : 20                                           ,
                                                                 tooltip   : 'Clear the canvas container in memory AND '  +
                                                                             'the canvas display'                         ,
                                                                 border    : true                                         ,
                                                                 style     : buttonStyle_                                 ,   
                                                                 handler   : function()  
                                                                             {
                                                                              JSROOT.cleanup(getCanvasDiv_(currentCanvas_));
                                                                              theCanvasModel_.clearCanvas (currentCanvas_) ;
                                                                              theCanvasModel_.dumpContent ("Reset canvas") ;
                                                                             }
                                                                }, {
                                                                 xtype     : 'button'                                     ,
                                                                 text      : 'Redraw canvas'                               ,
                                                                 pressed   : true                                         ,
                                                                 width     : 100                                          ,
                                                                 height    : 20                                           ,
                                                                 tooltip   : 'Clear the canvas container in memory but '  +
                                                                             'not the canvas display'                     ,
                                                                 border    : true                                         ,
                                                                 style     : buttonStyle_                                 ,   
                                                                 handler   : function()  
                                                                             {
                                                                              redrawCanvas() ;
                                                                             }
                                                                }, {
                                                                 xtype     : 'button'                                     ,
                                                                 text      : 'Dump canvas'                                ,
                                                                 pressed   : true                                         ,
                                                                 width     : 100                                          ,
                                                                 height    : 20                                           ,
                                                                 tooltip   : 'Clear the current canvas content'           ,
                                                                 border    : true                                         ,
                                                                 style     : buttonStyle_                                 ,   
                                                                 handler   : function()  
                                                                             {
                                                                              theCanvasModel_.dump(currentCanvas_         ,
                                                                                                   "Dump canvas"         ) ;
                                                                             }
                                                                },                             
                                                                nDivXCB,
                                                                nDivYCB,
                                                                {
                                                                 defaultType: 'checkbox'                                   ,
                                                                 border     : false                                        ,
                                                                 style      : buttonStyle_                                 ,   
                                                                 items      : [
                                                                               {
                                                                                boxLabel  : 'Superimpose'                  ,
                                                                                name      : 'superimpose'                  ,
                                                                                inputValue: superimposeFlag_               ,
                                                                                id        : 'superimpose'                  ,
                                                                                checked   : superimposeFlag_               ,
                                                                                handler   : function(thisCheckbox,status)
                                                                                            {
                                                                                             superimposeFlag_ = status      ;
                                                                                             STDLINE("Superimpose: "+
                                                                                                     superimposeFlag_)      ;
                                                                                            } 
                                                                               }
                                                                              ]
                                                                },{
                                                                 xtype     : 'button'                                     ,
                                                                 text      : 'Normalize'                                  ,
                                                                 pressed   : true                                         ,
                                                                 width     : 100                                          ,
                                                                 height    : 20                                           ,
                                                                 tooltip   : 'Set Y axis to highest number of entires '   +
                                                                             '(+10%) of selected histograms'              ,
                                                                 border    : true                                         ,
                                                                 style     : buttonStyle_                                 ,   
                                                                 handler   : function()  
                                                                             {
                                                                              STDLINE("Going to normalize")               ;
                                                                              theCanvasModel_.dumpContent ("Normalize")   ;
//                                                                               theAjaxRequest(
//                                                                                              _requestURL+"RequestType=getNormalized",
//                                                                                              {                                          
//                                                                                               CookieCode: _cookieCode,                  
//                                                                                               RootPath  : currentRootObject_            
//                                                                                              }, 
//                                                                                              ""
//                                                                                             )                                                                              
                                                                             }
                                                                }
                                                               ]
                                                  }, {
                                                   title     : 'Timing'                                                   ,
                                                   html      : '<p>Controls to drive the filesystem drill down.</p>'      ,
                                                   autoScroll: true                                                       ,
                                                   padding   : '5 5 5 5'                                                  ,
                                                   iconCls   : 'info'                                                     ,
                                                   items     : [
                                                                refreshIntervalSpinbox                                    ,
                                                                {
                                                                 xtype       : 'button'                                   ,
                                                                 text        : 'Stop'                                     ,
                                                                 pressed     : true                                       ,
                                                                 style       : buttonStyle_                               ,
                                                                 tooltip     : 'Stop refreshing of histograms'            ,
                                                                 border      : true                                       ,
                                                                 handler     : function()
                                                                               {
                                                                                var v = refreshIntervalSpinbox.getValue()  ;
                                                                                STDLINE("Clearing timeout: "+v) ;
                                                                                clearInterval(periodicPlotID_) ;
                                                                               }
                                                                }
                                                               ]
                                                  }, {
                                                   title     : 'Navigator'                                                ,
                                                   autoScroll: true                                                       ,
                                                   padding   : '5 5 5 5'                                                  ,
                                                   iconCls   : 'info'                                                     ,
                                                   items     : [
                                                                {
                                                                 defaultType: 'checkbox'                                  ,
                                                                 border     : false                                       ,
                                                                 style      : buttonStyle_                                ,   
                                                                 items      : [
                                                                               {
                                                                                boxLabel  : 'Debugger'                    ,
                                                                                name      : 'debugger'                    ,
                                                                                inputValue: enableDebug_                  ,
                                                                                id        : 'debugger'                    ,
                                                                                checked   : enableDebug_                  ,
                                                                                handler   : function(thisCheckbox,status)
                                                                                            {
                                                                                             enableDebug_ = status         ;
                                                                                             enableSTDLINE(enableDebug_)   ;
                                                                                            } 
                                                                               }
                                                                              ]
                                                                }
                                                               ]
                                                  }
                                                 ]
                                  }
                                 );
//                                  );               

 } ; 
 
 makeROOTControlsPanel() ;
 
 //-----------------------------------------------------------------------------------------------
 function makeGlobalCanvas()
 {
  STDLINE("Creating central panel (with canvas tabs)" ) ;
  if( globalCanvas_ ) globalCanvas_.destroy() ;
  globalCanvas_ = Ext.create(
                             'Ext.tab.Panel', 
                             {
                              id            : 'globalCanvas',
                              region        : 'center'      ,
                              deferredRender: false         ,
                              activeTab     : 0             ,
                              items         : canvasTabs_   ,
                              listeners     : {
                                               tabchange : function( thisPanel, newCard, oldCard, eOpts ) 
                                                           {
                                                            clearCanvas_   = false                                     ;
                                                            var regex      = /\d+/g                                    ;
                                                            var str        = newCard.title                             ;
                                                            var matches    = str.match(regex)                          ;
                                                            currentCanvas_ = matches[0]                                ;
                                                            STDLINE("Changed tab to " + getCanvasDiv_(currentCanvas_)) ;
                                                            nDivXCB.setValue(theCanvasModel_.getnDivX(currentCanvas_)) ;
                                                            nDivYCB.setValue(theCanvasModel_.getnDivY(currentCanvas_)) ;
                                                            width  = theCanvasModel_.currentWidth                      ;
                                                            height = theCanvasModel_.currentHeight                     ;
                                                            changeHistogramPanelSize(
                                                                                     thisPanel                        ,
                                                                                     width                            ,
                                                                                     height                           ,
                                                                                     "resized"
                                                                                    ) ;
                                                           },
                                               resize    : function(thisPanel, width, height, oldWidth, oldHeight, eOpt)
                                                           {                                                           ;
                                                            STDLINE("Resizing "+getCanvasDiv_(currentCanvas_))         ;
                                                            theCanvasModel_.currentWidth  = width                      ;
                                                            theCanvasModel_.currentHeight = height                     ;
//                                                            currentPad_ = 0                                            ;             
                                                            changeHistogramPanelSize(
                                                                                     thisPanel                        ,
                                                                                     width                            ,
                                                                                     height                           ,
                                                                                     "resized"
                                                                                    ) ;
                                                           }
                                              }
                             }
                            )
 }
 
 makeGlobalCanvas() ;

 //-----------------------------------------------------------------------------------------------
 function makeNavigatorPanel()
 {
  if( theNavigatorPanel_ ) theNavigatorPanel_.destroy() ;
  theNavigatorPanel_ = Ext.create(
                                  'Ext.panel.Panel',
                                  {
                                   region      : 'west'            ,
                                   stateId     : 'navigation-panel',
                                   id          : 'west-panel'      ,
                                   title       : 'The navigator'   ,
                                   split       : true              ,
                                   width       : 200               ,
                                   minWidth    : 175               ,
                                   maxWidth    : 1000              ,
                                   collapsible : true              ,
                                   animCollapse: true              ,
                                   multi       : true              ,
                                   margins     : '0 0 0 5'         ,
                                   layout      : 'accordion'       ,
                                   items       : [
                                                  {
                                                   title     : 'FileSystem navigation'                                                  ,
                                                   id        : 'navigatorDiv'                                                           ,
                                                   autoScroll: true                                                                     ,
                                                   tools     : [
                                                                {
                                                                 type   : 'left'                                                        ,
                                                                 tooltip: 'Go back to list of folders and files'                        ,
                                                                 handler: function()
                                                                          {
                                                                           if( currentTree_ = 'fileContent' )
                                                                           {
                                                                            selectedItem_ = "getDirectories"                               ;
                                                                            var thePad    = theCanvasModel_.getCurrentPadC(currentCanvas_) ;
                                                                            makeStore(theProvenance_.getRootPath(currentCanvas_         ,
                                                                                                                 thePad)                , 
                                                                                      'RequestType=getMeDirs'                            ) ;
                                                                            makeGrid (theProvenance_.getRootPath(currentCanvas_         ,
                                                                                                                 thePad)                , 
                                                                                       'Directories and files'                           ) ;
                                                                           }
                                                                          }
                                                                },
                                                                {
                                                                 type   : 'prev'                                  ,
                                                                 tooltip: 'Maximize canvas size'                  ,
                                                                 handler: function()
                                                                          {
                                                                           STDLINE("Collapsing")                   ;
                                                                           theNavigatorPanel_  .collapse()         ;
                                                                           ROOTControlsPanel_  .collapse()         ;
                                                                           theInformationPanel_.collapse()         ;
                                                                          }
                                                                }
                                                               ]
                                                  }, {
                                                   title     : 'ROOT file navigation'                                  ,
                                                   html      : '<p>ROOT files with subfolders, plots and canvases.</p>',
                                                   autoScroll: true                                                    ,
                                                   iconCls   : 'settings'
                                                  }, {
                                                   title     : 'Navigation Controls'                                   ,
                                                   html      : '<p>Controls to drive the filesystem drill down.</p>'   ,
                                                   autoScroll: true                                                    ,
                                                   iconCls   : 'info'
                                                  }
                                                 ],
                                   listeners   : {
                                                  collapse   : function() 
                                                               {
                                                                STDLINE("Collapse!!!");
                                                               },
                                                  expand     : function() 
                                                               {
                                                                STDLINE("Expand!!!"  );
                                                               }
                                                 }
                                  },
                                  
                                 ) ;
 }
 
 makeNavigatorPanel() ;
 
 //-----------------------------------------------------------------------------------------------
 var theStatusBar_ = Ext.create(
                                'Ext.ux.StatusBar', 
                                {
                                 id            : 'my-status'   ,
                                 defaultText   : 'Ready'       ,
                                 defaultIconCls: 'default-icon',
                                 text          : 'Ready'       ,
                                 iconCls       : 'ready-icon'  
//                                  items         : [
//                                                   {
//                                                     text: 'A Button'
//                                                   }, 
//                                                   '-', 
//                                                   'Current canvas'
//                                                  ]
                                }
                               );
 //-----------------------------------------------------------------------------------------------
 function makeInformationPanel()
 {
  if( theInformationPanel_ ) theInformationPanel_.destroy() ;
  theInformationPanel_ = Ext.create(
                                    'Ext.panel.Panel',
                                    {
                                     region      : 'south'              ,
                                     contentEl   : 'south'              ,
                                     split       : true                 ,
                                     height      : 50                   ,
                                     minSize     : 20                   ,
                                     maxSize     : 200                  ,
                                     collapsible : true                 ,
                                     collapsed   : false                ,
                                     bbar        : theStatusBar_        ,
                                     html        : 'Panel initialized'  ,
                                     title       : 'Status bar'         ,
                                     margins     : '0 0 0 0'
                                    },
                                   ) ;
 }
 //-----------------------------------------------------------------------------------------------
 function displayStatus(message) 
 {
  theStatusBar_.showBusy() ;
  theStatusBar_.setStatus(
                          {
                           text   : message  ,
                           iconCls: 'ok-icon',
                           clear  : true      // auto-clear after a set interval
                          }
                         );
 }

 makeInformationPanel() ;

 //-----------------------------------------------------------------------------------------------
 function makeViewPort() 
 {
  if( theViewPort_ ) theViewPort_.destroy() ;
  var fName = arguments.callee.toString().match(/function ([^\(]+)/)[1];
  STDLINE("Creating viewport for "+fName) ;
  theViewPort_ = Ext.create(
                            'Ext.Viewport'                            , 
                            {
                             id    : 'border-example'                 ,
                             layout: 'border'                         ,
                             items : [
                                      Ext.create(
                                                 'Ext.Component'      , 
                                                 {
                                                  region: 'north'     ,
                                                  height: 32          ,
                                                  id    : 'sourcesDiv'
                                                 }
                                                ), 
                                      theInformationPanel_            ,
                                      ROOTControlsPanel_              ,
                                      theNavigatorPanel_              ,
                                      globalCanvas_ 
                                     ]
                            }
                           );
  STDLINE("Viewport created") ;
 } ;
 
 //-----------------------------------------------------------------------------
 function createSources(dirs)
 {
  STDLINE("Creating sources") ;
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
                              height      : 25         ,
                              width       : 200        ,
                              store       : theSources_,
                              queryMode   : 'local'    ,
                              displayField: 'dir'      ,
                              valueField  : 'abbr'     ,
                              renderTo    : 'sourcesDiv',
                              listeners   : {
                                             select    : function(thisCombo, record, eOpts)
                                                         {
                                                          var thisRootPath = record.data.dir              ;
                                                          var thePad       = theCanvasModel_.getCurrentPadC(currentCanvas_) ;
                                                          STDLINE("thisRootPath: "+thisRootPath          );
                                                          theProvenance_.setRootPath(thisRootPath,
                                                                                     currentCanvas_      ,
                                                                                     thePad              );
                                                          STDLINE("fRootPath_: "+thisRootPath            );
                                                          if(thisRootPath == "LIVE_DQM.root")
                                                          {
                                                           selectedItem_ = "getMeLIVE-DQMFile"            ;
                                                           makeStore(thisRootPath, 
                                                                     'RequestType=getMeLIVE-DQMFile'     );
                                                          }
                                                          else
                                                          {
                                                           selectedItem_ = "getDirectories"               ;
                                                           makeStore(thisRootPath, 
                                                                     'RequestType=getMeDirs'             );
                                                          }
                                                          STDLINE("selectedItem_: "+selectedItem_        );
                                                          makeGrid (thisRootPath,              
                                                                    'Directories and files'              );
                                                         },
                                             focusleave: function (thisCombo) 
                                                         {
                                                          STDLINE('remove  selection listener'           );
                                                          theSourcesCB_.suspendEvent('select'            );
                                                          STDLINE('removed selection listener'           );
                                                         },
                                             focusenter: function (thisCombo) 
                                                         {
                                                          STDLINE('reinstate  selection listener'        );
                                                          thisCombo.resumeEvent('select'                 );
                                                          theSourcesCB_.resumeEvent('select'             );
                                                          STDLINE('reinstated selection listener'        );
                                                         }
                                            }
                             }
                            );
 
  theSourcesCB_.setRawValue(dirs[0].dir) ; // Set default value

 }
 //-----------------------------------------------------------------------------
 function makeGrid(where,what)
 { 
  STDLINE("makeGrid("+where+","+what+")") ;
  if( grid_ ) grid_.destroy()     ;
  theStore_.sort(treeDisplayField_, 'ASC');

  STDLINE("Creating grid") ;
  grid_ = Ext.create(
                     'Ext.tree.Panel', 
                     {
                      title      : what                  ,
                      width      : 1200                  ,
                      header     : false                 ,
                      id         : 'navigator'           ,
                      store      : theStore_             ,
                      resizable  : true                  ,
                      border     : true                  ,
                      renderTo   : "navigatorDiv-innerCt",
                      rootVisible: false                 ,
                      useArrows  : true                  ,
                      scrollable : true                  ,
                      selModel   : {
                                    mode : 'MULTI' // SIMPLE or MULTI
                                   },
                      plugins    : [
                                    {
                                     ptype: 'bufferedrenderer'
                                    }
                                   ],
                      columns    : [
                                    {
                                     xtype    : 'treecolumn'    ,
                                     id       : 'provenance'    ,
                                     text     : where           ,
                                     flex     : 1               ,
                                     dataIndex: 'fDisplayName' 
                                    }, 
                                    { 
                                     xtype    : 'treecolumn'    ,
                                     hidden   : false           ,
                                     text     : 'type'          ,
                                     width    : 1               ,
                                     dataIndex: 'leaf'                 
                                    }, 
                                    { 
                                     xtype    : 'treecolumn'    ,
                                     hidden   : false           ,
                                     text     : 'fSystemPath'   ,
                                     width    : 1               ,
                                     dataIndex: 'fSystemPath'                 
                                    }, 
                                    { 
                                     xtype    : 'treecolumn'    ,
                                     hidden   : false           ,
                                     text     : 'fRootPath'     ,
                                     width    : 1               ,
                                     dataIndex: 'fRootPath'                
                                    }, 
                                    { 
                                     xtype    : 'treecolumn'    ,
                                     hidden   : false           ,
                                     text     : 'fFoldersPath'  ,
                                     width    : 1               ,
                                     dataIndex: 'fFoldersPath'                
                                    }, 
                                    { 
                                      xtype    : 'treecolumn'   ,
                                      hidden   : false          ,
                                      text     : 'fFileName'    ,
                                      width    : 1              ,
                                      dataIndex: 'fFileName'                
                                     }, 
                                     { 
                                      xtype    : 'treecolumn'   ,
                                      hidden   : false          ,
                                      text     : 'fRFoldersPath',
                                      width    : 1              ,
                                      dataIndex: 'fRFoldersPath'                
                                     }, 
                                    { 
                                      xtype    : 'treecolumn'  ,
                                      hidden   : false         ,
                                      text     : 'fHistName'   ,
                                      width    : 1             ,
                                      dataIndex: 'fHistName'                
                                     }
                                   ],
                      listeners  : {
                                    expand    : function(expandedItem, options) 
                                                {
                                                 STDLINE("expanded") ;
                                                },                                   
                                    itemclick : function(thisItem, record, item, index, e, eOpts)
                                                {
                                                 var selection = this.getSelection()                                    ;
                                                 STDLINE("Selected "+selection.length+" items")                         ;
                                                 var thePad = theCanvasModel_.getCurrentPad(currentCanvas_)             ;
                                                 STDLINE("thePad       : "+thePad                   )                   ;      
                                                 STDLINE("selectedItem_: "+selectedItem_            )                   ;      
                                                 STDLINE("Selected     : "+selection.length+" items")                   ;
                                                 for(var i=0; i<selection.length; i++)  
                                                 {  
                                                  theProvenance_.setSystemPath  (selection[i].data.fSystemPath        ,
                                                                                 currentCanvas_                       ,
                                                                                 thePad                                );
                                                  theProvenance_.setRootPath    (selection[i].data.fRootPath          ,
                                                                                 currentCanvas_                       ,
                                                                                 thePad                                );
                                                  theProvenance_.setFoldersPath (selection[i].data.fFoldersPath       ,
                                                                                 currentCanvas_                       ,
                                                                                 thePad                                );
                                                  theProvenance_.setFileName    (selection[i].data.fFileName          ,
                                                                                 currentCanvas_                       ,
                                                                                 thePad                                );
                                                  theProvenance_.setRFoldersPath(selection[i].data.fRFoldersPath      ,
                                                                                 currentCanvas_                       ,
                                                                                 thePad                                );
                                                  theProvenance_.setHistName    (selection[i].data.fHistName          ,
                                                                                 currentCanvas_                       ,
                                                                                 thePad                                );
                                                  theProvenance_.dump           ("Item selected",thePad                );      
                                                 } 
                                                 theProvenance_.dumpAll("Selected plot to display") ; 
//                                                 theCanvasModel_.dumpContent("Clicked on item "+selectedItem_)                                          ;
                                                 //clearInterval(periodicPlotID_)                                       ;      
                                                 var itemSplit     = item.innerText.split("\n\t\n")                     ;      
                                                 var isLeaf        = itemSplit[1].replace("\n","").replace("\t","")     ;      
                                                 if( isLeaf == "true" ) 
                                                 {
                                                  if( selectedItem_ == "getDirectories" )
                                                  {
                                                   treeDisplayField_  = 'fDisplayName'                                  ;       
                                                   selectedItem_      = "getRootObject"                                 ;       
                                                   currentTree_       = 'fileContent'                                   ;       
//                                                   STDLINE("Paths: "+  theProvenance_.getPathsNumber(thePad))           ;       
                                                   currentDirectory_ = theProvenance_.getSystemPath (currentCanvas_,
                                                                                                     thePad)           +        
                                                                       '/'                                             +        
                                                                       theProvenance_.getRootPath   (currentCanvas_,
                                                                                                     thePad)           +        
                                                                       "/"                                             +        
                                                                       theProvenance_.getFoldersPath(currentCanvas_,
                                                                                                     thePad)           +        
                                                                       "/"                                             +        
                                                                       theProvenance_.getFileName   (currentCanvas_,
                                                                                                     thePad)            ;       
//                                                   STDLINE('RequestType      : getMeRootFile'     )                     ;       
//                                                   STDLINE('currentDirectory_: '+currentDirectory_)                     ;       
                                                   makeStore(currentDirectory_,'RequestType=getMeRootFile')             ;       
                                                   makeGrid (currentDirectory_,'ROOT file content'        )             ;       
                                                  }
                                                  else if( selectedItem_ == "getRootObject" || 
                                                           selectedItem_ == "getMeLIVE-DQMFile" )
                                                  { 
//                                                   theProvenance_.dumpAll("getRootObject")                              ;
//                                                   STDLINE("Request for thePad: " + thePad)                             ;      
                                                   currentRootObject_  = "/"                                           +        
                                                                         theProvenance_.getRootPath    (currentCanvas_,
                                                                                                        thePad)        +    
                                                                         "/"                                           +        
                                                                         theProvenance_.getFoldersPath (currentCanvas_,
                                                                                                        thePad)        +    
                                                                         theProvenance_.getFileName    (currentCanvas_,
                                                                                                        thePad)        +    
                                                                         "/"                                           +        
                                                                         theProvenance_.getRFoldersPath(currentCanvas_,
                                                                                                        thePad)        +    
                                                                         "/"                                           +        
                                                                         theProvenance_.getHistName    (currentCanvas_,
                                                                                                        thePad)         ;    
                                                   STDLINE('RequestType       : getRootObject'      )                   ;        
                                                   STDLINE('currentRootObject_: '+currentRootObject_)                   ;        
                                                   STDLINE('_requestURL       : '+_requestURL       )                   ;        
                                                   theAjaxRequest(
                                                                  _requestURL+"RequestType=getRoot",
                                                                  {                                                           
                                                                   CookieCode: _cookieCode         ,                                  
                                                                   RootPath  : currentRootObject_                                     
                                                                  }                                , 
                                                                  ""
                                                                 ) ;
//                                                    if(theProvenance_.getRootPath(thePad) == "LIVE_DQM.root" )
//                                                    {
//                                                     var refreshTime = refreshIntervalSpinbox.getValue() * 1000 ;
//                                                     periodicPlotID_ = setInterval(
//                                                                                   function()
//                                                                                   {
//                                                                                    STDLINE("Launching Ajax Request with refresh time: "+refreshTime) ;
//                                                                                    theAjaxRequest(
//                                                                                                   _requestURL+"RequestType=getRoot",
//                                                                                                   {                                                        
//                                                                                                    CookieCode: _cookieCode,                               
//                                                                                                    RootPath  : currentRootObject_                                  
//                                                                                                   }, 
//                                                                                                   ""
//                                                                                                  )
//                                                                                   },
//                                                                                   refreshTime 
//                                                                                  ) ;
//                                                    }                                                         
                                                  }
                                                 }
                                                },
                                    headerclick: function(ct, column, e, t, eOpts)
                                                 {
                                                  var a = column ;
                                                  STDLINE("header clicked") ;
                                                 }
                                   }
                     }
                    ).setPosition(0,0);

 //-----------------------------------------------------------------------------
  var objectProvenance = Ext.create(
                                    'Ext.tip.ToolTip', 
                                    {
                                     target: 'provenance',
                                     html  : 'Object provenance: ' + where
                                    }
                                   );
 }
 //-----------------------------------------------------------------------------
 dataModel_ = Ext.define(
                         'DirectoriesDataModel',
                         {
                          extend: 'Ext.data.Model',
                          fields: [
                                   {name: 'nChilds'      , type: 'int'   , convert: null},
                                   {name: 'fSystemPath'  , type: 'string', convert: null},
                                   {name: 'fRootPath'    , type: 'string', convert: null},
                                   {name: 'fFoldersPath' , type: 'string', convert: null},
                                   {name: 'fFileName'    , type: 'string', convert: null},
                                   {name: 'fHistName'    , type: 'string', convert: null},
                                   {name: 'fRFoldersPath', type: 'string', convert: null},
                                   {name: 'fDisplayName' , type: 'string', convert: null}
                                  ]
                         }
                        );
 //-----------------------------------------------------------------------------
 function makeStore(path, reqType)
 { 
//  theProvenance_.dump("makeStore", 0   ) ;
  theProvenance_.dumpAll("makeStore"   ) ;
  STDLINE("path       : " + path       ) ;
  STDLINE("reqType    : " + reqType    ) ;
  STDLINE("_requestURL: " + _requestURL) ;
  var thePad = theCanvasModel_.getCurrentPad(currentCanvas_);
  theStore_ = Ext.create(
                         'Ext.data.TreeStore', 
                         {
                          model    : 'DirectoriesDataModel',
                          id       : 'theStore'            ,
                          autoLoad : false                 ,
                          root     : {
                                      expanded     : true
                                     },
                          proxy    : {
                                      type         : 'ajax',
                                      actionMethods: {
                                                      read          : 'POST'
                                                     }, 
                                      extraParams  : { 
                                                      "CookieCode"  : _cookieCode                                          ,
                                                      "Path"        : path                                                 ,
                                                      "fRootPath"   : theProvenance_.getRootPath   (currentCanvas_, thePad),
                                                      "fFoldersPath": theProvenance_.getFoldersPath(currentCanvas_, thePad),
                                                      "fHistName"   : theProvenance_.getHistName   (currentCanvas_, thePad),
                                                      "fFileName"   : theProvenance_.getFileName   (currentCanvas_, thePad)
                                                     },
                                      url          : _requestURL + reqType,
                                      reader       : {
                                                      type          : 'xml'   ,
                                                      root          : 'nodes' ,
                                                      record        : '> node'
                                                     },
                                     },
                          listeners: {
                                      beforeload   : function(thisStore, operation, eOpts) 
                                                     {
                                                      STDLINE("Request: "+_requestURL + reqType) ;
                                                     },
                                      load         : function( thisStore, records, successful, operation, node, eOpts )
                                                     {
                                                      STDLINE("Load was succesful? "+successful) ;
                                                     }
                                     }
                         }
                        );
  STDLINE("Going to load...") ;
  theStore_.load() ;
  STDLINE("...loaded!") ;
 }
 
 //-----------------------------------------------------------------------------
 function theAjaxRequest(theRequestURL,theParams,theRawData)                                                                   
 { 
  var today = new Date();
  var time = today.getHours() + ":" + today.getMinutes() + ": "   + today.getSeconds();
  STDLINE("Ajax request issued to " + theRequestURL      + " at " + time             );                                                                                                                         
  STDLINE("theParams.RootPath: " + theParams.RootPath                                );                                                                                                                         
  Ext.Ajax.request(                                                                                                                       
                   {                                                                                                                      
                    url    : theRequestURL,                                                                                               
                    method : 'POST'       ,                                                                                                      
                    headers: {                                                                                                            
                              'Content-Type': 'text/plain;charset=UTF-8'                                                                  
                             }            ,                                                                                                           
                    params : theParams    ,                                                                                                          
                    rawData: theRawData   ,                                                                                                  
                    timeout: 50000        ,                                                                                                       
                    success: function(response, request)                                                                                  
                             { 
                              STDLINE("Got answer") ;
                              if(getXMLValue(response,"headOfSearch") == 'located') // Returns the list of available fRooPaths                                                                     
                              { // Get list of head-points
                               STDLINE("headOfSearch") ;
                               var dirs     = [] ;
                               var theNodes = getXMLNodes(response,'dir') ;
                               for(var i=0; i<theNodes.length; ++i)
                               {
                                var theDir = theNodes[i].getAttribute("value")
                                dirs.push({"abbr":  theDir, "dir": theDir}) ;
                               }

                               createSources(dirs) ;
                              }                                                                                                         
                              else if(!(typeof getXMLValue(response,"rootType") === 'undefined')) // Returns the plot to display                                                                     
                              { // get specific ROOT Object and display
                               var rootName  = getXMLValue (response,"path"          );               
                               var rootJSON  = getXMLValue (response,"rootJSON"      );           
                               var object    = JSROOT.parse(rootJSON                 );
                               STDLINE("Cuccato " + object.fTitle                    );
                               var pad = theCanvasModel_.getCurrentPad(currentCanvas_);
                               theProvenance_.setRequestURL(theRequestURL            ,
                                                            currentCanvas_           ,
                                                            pad                      );
                               theProvenance_.setParams(theParams                    ,
                                                            currentCanvas_           ,
                                                            pad                      );
                               theCanvasModel_.addROOTObject(currentCanvas_          ,
                                                             object                  ,
                                                             theProvenance_          );
                               displayPlot_                (object                   );
                               theCanvasModel_.nextPad(currentCanvas_                );
                              }
                              STDLINE("None of the above...") ;
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
  STDLINE("Ajax request formed") ;                                                                                                
 } ; 
 
 //-----------------------------------------------------------------------------
 displayPlot_ = function(object)
                {
                 if( ! object ) return ;
                 var nx        = theCanvasModel_.getnDivX     (currentCanvas_);
                 var ny        = theCanvasModel_.getnDivY     (currentCanvas_);
                 currentPad    = theCanvasModel_.getCurrentPad(currentCanvas_);
                 STDLINE(      "Plot: "      + 
                               object.fTitle + 
                               ' on pad: '   +
                               currentPad    ) ;
                 displayStatus("Plot: "      + 
                               object.fTitle + 
                               ' on pad: '   +
                               currentPad    ) ;

                 gridDivision_ = "gridi" + nx + "x" + ny ;
                 mdi_ = new JSROOT.GridDisplay(getCanvasDiv_(currentCanvas_), 
                                                             gridDivision_ ) ;
                 if (mdi_!=null) theFrame = mdi_.FindFrame  (currentPad     , 
                                                             false         ) ;
                 if( nx == 1 & ny == 1 ) 
                 {
                  theFrame = 'canvas' + currentCanvas_                       ;
                 } else {
                  theFrame = 'canvas' + currentCanvas_ + '_' + currentPad    ;
                 }
                 STDLINE("Plotting "      +
                         object._typename +
                         ": "             +
                         object.fTitle    +
                         " on: "          +
                         theFrame        );
                 if( superimposeFlag_ )
                 {
                  STDLINE("Superimpose on "+theFrame+"...") ;
                  JSROOT.draw  (
                                theFrame,
                                object  ,
                                ""
                               ); 
                 } else {
                  STDLINE("Do NOT superimpose on "+theFrame+"...") ;
                  if( nx == 1 && ny == 1 ) JSROOT.cleanup(getCanvasDiv_(currentCanvas_))    ;
                  JSROOT.redraw(
                                theFrame,
                                object  ,
                                ""
                               ); 
//                   currentPad_++ ; 
//                   if( currentPad_ > nx * ny - 1) {currentPad_=0;}
                 } 
//                  theCanvasModel_.nextPad(currentCanvas_) ;
                }
 //-----------------------------------------------------------------------------
 function redrawCanvas()
 {
  theCanvasModel_.clearCanvas(currentCanvas_) ;
//  theCanvasModel_.resetCurrentPad(          currentCanvas_)       ;
  theCanvasModel_.dumpContent("Redrawing canvas"          )       ;
  var objs = theCanvasModel_.getROOTObjects(currentCanvas_)       ;
  STDLINE("") ;
  STDLINE("^^^^^^^^^^^^^^^^^^^^^^^^^^^ Redrawing canvas") ;
  for(var i=0; i<objs.length; ++i)
  {
   var obj = objs[i].object                                                        ;
   var pro = objs[i].provenance                                                    ;
   var pad = 'canvas'                                                            + 
             currentCanvas_                                                      + 
             '_'                                                                 + 
             theCanvasModel_.getCurrentPad( currentCanvas_                        );
//   pro.dumpAll("Redraw canvas")                                                   ;
   STDLINE("  Object "+i                                                          );
   STDLINE("  pad: "+pad+" fSystemPath_       : "+pro.fSystemPath_[pad]           );                             
   STDLINE("  pad: "+pad+" fRootPath_         : "+pro.fRootPath_  [pad]           );
   STDLINE("  pad: "+pad+" fRequestURL_       : "+pro.fRequestURL_[pad]           );
   STDLINE("  pad: "+pad+" fParams_.CookieCode: "+pro.fParams_    [pad].CookieCode); 
   STDLINE("  pad: "+pad+" fParams_.RootPath  : "+pro.fParams_    [pad].RootPath  ); 
   if( pro.fRootPath_[pad] == 'LIVE_DQM.root') 
   {
    STDLINE("************************* -> requesting again!!!!"                   );
    theAjaxRequest(pro.fRequestURL_[pad],pro.fParams_[pad],""                     );
   }
   else
   {                                           
     displayPlot_(obj) ;
   }
   theCanvasModel_.nextPad(currentCanvas_) ;
  } 
 }
 
  //-----------------------------------------------------------------------------
 //
 //    H e r e   b e g i n s  t h e  a c t i o n
 //
 //-----------------------------------------------------------------------------
 theAjaxRequest(
                _requestURL+"RequestType=getDirectoryContents",
                {                                                            
                 CookieCode: _cookieCode,                                   
                 Path      : "/"                                 
                }, 
                ""
               ) ;                                                          

 makeStore("where","what") ;

 STDLINE("Calling makeViewPort") ;
 makeViewPort() ;
});
