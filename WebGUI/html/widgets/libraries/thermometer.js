var Thermometer=function(t){
	"use strict";
	function i(t){
		this._config={},
		f(this._config,i.defaults),
		t&&f(this._config,t)
	}
	function s(){
		l.call(this),
		h.call(this),
		a.call(this),
		r.call(this),
		e.call(this)
	}
	function e(){
		var t=this._dim.bulbCy,
		i=this._axisData.scale(this._value.current);
		this._svg.select("."+_.call(this,"mercury","column")).attr("y",i).attr("height",t-i)
	}
	function a(){
		this._svg.select("."+_.call(this,"min","line")).attr("y1",this._axisData.scale(this._value.min)).attr("y2",this._axisData.scale(this._value.min)),
		this._svg.select("."+_.call(this,"min","label")).attr("y",this._axisData.scale(this._value.min)+4)
	}
	function r(){
		this._svg.select("."+_.call(this,"max","line")).attr("y1",this._axisData.scale(this._value.max)).attr("y2",this._axisData.scale(this._value.max)),
		this._svg.select("."+_.call(this,"max","label")).attr("y",this._axisData.scale(this._value.max)-4)
	}
	function l(){
		var i=[5*Math.floor(this._value.min/5),5*Math.ceil(this._value.max/5)];
		u(this._value.min,i[0],5)&&(i[0]-=5),g(this._value.max,i[1],5)&&(i[1]+=5);
		var s=t.range((i[1]-i[0])/25+1).map(
		function(t){return i[0]+25*t}),
		e=t.scaleLinear().range([this._dim.bulbCy-this._config.bulbRadius/2-8.5,this._dim.topCy]).domain(i);
		this._axisData={step:5,domain:i,tickValues:s,scale:e}
	}
	function h(){
		var i=_.call(this,"temperature","axis"),
		s=t.axisLeft(this._axisData.scale).tickSizeInner(7).tickSizeOuter(0).tickValues(this._axisData.tickValues);
		this._svg.select("."+i).remove();
		var e=this._svg.append("g").attr("class",i).attr("transform","translate("+(this._config.width/2-this._config.tubeWidth/2)+",0)").call(s);
		e.selectAll(".tick text").style("fill","#777777").style("font-size","10px"),
		e.select("path").style("stroke","none").style("fill","none"),
		e.selectAll(".tick line").style("stroke",this._config.borderColor).style("shape-rendering","crispEdges").style("stroke-width",this._config.borderWidth+"px")
	}
	function o(){[this._value.min,this._value.max].forEach(function(t){var i=t===this._value.max,s=i?"max":"min",e=i?"rgb(230, 0, 0)":"rgb(0, 0, 230)",a=i?-4:4;this._svg.append("line").attr("class",_.call(this,s,"line")).attr("x1",this._config.width/2-this._config.tubeWidth/2).attr("x2",this._config.width/2+this._config.tubeWidth/2+22).attr("y1",this._axisData.scale(t)).attr("y2",this._axisData.scale(t)).style("stroke",this._config.borderColor).style("stroke-width",this._config.borderWidth+"px").style("shape-rendering","crispEdges"),this._svg.append("text").attr("class",_.call(this,s,"label")).attr("x",this._config.width/2+this._config.tubeWidth/2+2).attr("y",this._axisData.scale(t)+a).attr("dy",i?null:"0.72em").text(s).style("fill",e).style("font-size","10px")},this)}function c(){var t=this._dim.bulbCy,s=this._axisData.scale(this._value.current);this._svg.append("rect").attr("class",_.call(this,"mercury","column")).attr("x",this._config.width/2-(this._config.tubeWidth-8)/2).attr("y",s).attr("width",this._config.tubeWidth-8).attr("height",t-s).style("shape-rendering","crispEdges").style("fill",this._config.mercuryColor),this._svg.append("circle").attr("r",this._config.bulbRadius-5).attr("cx",this._dim.bulbCx).attr("cy",this._dim.bulbCy).style("fill","url(#"+i.classPrefix+"-bulb-gradient)").style("stroke",this._config.mercuryColor).style("stroke-width","2px")}function n(){var t=this._svg.append("defs").append("radialGradient").attr("id",i.classPrefix+"-bulb-gradient").attr("cx","50%").attr("cy","50%").attr("r","50%").attr("fx","50%").attr("fy","50%");t.append("stop").attr("offset","0%").style("stop-color",this._config.bulbShineColor),t.append("stop").attr("offset","90%").style("stop-color",this._config.mercuryColor)}function d(){this._svg.append("circle").attr("r",this._config.tubeWidth/2).attr("cx",this._config.width/2).attr("cy",this._dim.topCy).style("fill",this._config.backgroundColor).style("stroke",this._config.borderColor).style("stroke-width",this._config.borderWidth+"px"),this._svg.append("rect").attr("x",this._config.width/2-this._config.tubeWidth/2).attr("y",this._dim.topCy).attr("height",this._dim.bulbCy-this._dim.topCy).attr("width",this._config.tubeWidth).style("shape-rendering","crispEdges").style("fill",this._config.backgroundColor).style("stroke",this._config.borderColor).style("stroke-width",this._config.borderWidth+"px"),this._svg.append("circle").attr("r",this._config.tubeWidth/2-this._config.borderWidth/2).attr("cx",this._config.width/2).attr("cy",this._dim.topCy).style("fill",this._config.backgroundColor).style("stroke","none"),this._svg.append("circle").attr("r",this._config.bulbRadius).attr("cx",this._dim.bulbCx).attr("cy",this._dim.bulbCy).style("fill",this._config.backgroundColor).style("stroke",this._config.borderColor).style("stroke-width",this._config.borderColor+"px"),this._svg.append("rect").attr("x",this._config.width/2-(this._config.tubeWidth-this._config.borderWidth)/2).attr("y",this._dim.topCy).attr("height",this._dim.bulbCy-this._dim.topCy).attr("width",this._config.tubeWidth-this._config.borderWidth).style("shape-rendering","crispEdges").style("fill",this._config.backgroundColor).style("stroke","none")}function _(){for(var t=i.classPrefix,s=arguments.length,e=0;e<s;)t+="-"+arguments[e++];return t}function u(t,i,s){return t-i<.66*s}function g(t,i,s){return i-t<.66*s}function f(t,i){Object.keys(i).forEach(function(s){t[s]=i[s]})}return i.defaults={width:80,height:160,mercuryColor:"rgb(230, 0, 0)",bulbShineColor:"rgb(230, 200, 200)",borderColor:"rgb(136, 136, 136)",borderWidth:1,backgroundColor:"rgb(255, 255, 255)",bulbRadius:18,tubeWidth:18.5},i.classPrefix="thermometer",i.prototype.render=function(i,s,e,a){var r=this._config.height-5;this._dim={bottomY:r,topCy:5+this._config.tubeWidth/2,topY:5+this._config.tubeWidth/2,bulbCx:this._config.width/2,bulbCy:r-this._config.bulbRadius},this._value={current:s,min:e,max:a},t.select(i).select("svg").remove(),this._svg=t.select(i).append("svg").attr("width",this._config.width).attr("height",this._config.height),n.call(this),d.call(this),l.call(this),o.call(this),c.call(this),h.call(this)},i.prototype.destroy=function(){var t=this._svg.node();t.parentNode.removeChild(t)},i.prototype.setMaxValue=function(t){this._value.max=t,s.call(this)},i.prototype.setMinValue=function(t){this._value.min=t,s.call(this)},i.prototype.setCurrentValue=function(t){this._value.current=t,t<this._value.min?this.setMinValue(t):t>this._value.max?this.setMaxValue(t):e.call(this)},i}(d3);
