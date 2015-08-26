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
//	Debug.log() will print to console if Debug.mode = 1 and if num < Debug.level
//
//=====================================================================================

var Debug = Debug || {}; //define Debug namespace

Debug.mode = 1; 			//0 - debug off, 1 - debug on
Debug.level = 100;		//priority level, all logs with lower priority level are printed

//setup default priorities
Debug.HIGH_PRIORITY = 0;
Debug.MED_PRIORITY = 50;
Debug.LOW_PRIORITY = 100;

Debug.log = function(str,num) {

	if(num == undefined) num = 0; //make num optional and default to 0
	
	if(Debug.level < 0) Debug.level = 0; //check for crazies, 0 is min level

	//TODO - change this log code based on browser
	if(Debug.mode && num <= Debug.level) {
		console.log(str);
	}
	
}

Debug.log("Debug mode is on at level: " + Debug.level);
Debug.log("This is an example for posterity that is not printed due to debug priority",Debug.level+1);

