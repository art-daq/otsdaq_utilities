/// @file JSRoot.more.js
/// Part of JavaScript ROOT graphics with more classes like TEllipse, TLine, ...
/// Such classes are rarely used and therefore loaded only on demand

JSROOT.define(['d3', 'painter', 'math', 'gpad'], (d3, jsrp) => {

   "use strict";

   function drawText() {
      let text = this.GetObject(),
          w = this.pad_width(), h = this.pad_height(),
          pos_x = text.fX, pos_y = text.fY,
          tcolor = this.get_color(text.fTextColor),
          use_frame = false,
          fact = 1., textsize = text.fTextSize || 0.05,
          main = this.frame_painter();

      if (text.TestBit(JSROOT.BIT(14))) {
         // NDC coordinates
         this.isndc = true;
      } else if (main && !main.mode3d) {
         // frame coordiantes
         w = this.frame_width();
         h = this.frame_height();
         use_frame = "upper_layer";
      } else if (this.root_pad() !== null) {
         // force pad coordiantes
      } else {
         // place in the middle
         this.isndc = true;
         pos_x = pos_y = 0.5;
         text.fTextAlign = 22;
         if (!tcolor) tcolor = 'black';
      }

      this.CreateG(use_frame);

      this.draw_g.attr("transform",null); // remove transofrm from interactive changes

      this.pos_x = this.AxisToSvg("x", pos_x, this.isndc);
      this.pos_y = this.AxisToSvg("y", pos_y, this.isndc);

      let arg = { align: text.fTextAlign, x: this.pos_x, y: this.pos_y, text: text.fTitle, color: tcolor, latex: 0 };

      if (text.fTextAngle) arg.rotate = -text.fTextAngle;

      if (text._typename == 'TLatex') { arg.latex = 1; fact = 0.9; } else
      if (text._typename == 'TMathText') { arg.latex = 2; fact = 0.8; }

      this.StartTextDrawing(text.fTextFont, Math.round((textsize>1) ? textsize : textsize*Math.min(w,h)*fact));

      this.DrawText(arg);

      this.FinishTextDrawing(undefined, () => this.DrawingReady());

      if (!JSROOT.BatchMode)
         JSROOT.require(['interactive']).then(inter => {
            this.pos_dx = this.pos_dy = 0;

            if (!this.moveDrag)
               this.moveDrag = function(dx,dy) {
                  this.pos_dx += dx;
                  this.pos_dy += dy;
                  this.draw_g.attr("transform", "translate(" + this.pos_dx + "," + this.pos_dy + ")");
              }

            if (!this.moveEnd)
               this.moveEnd = function(not_changed) {
                  if (not_changed) return;
                  let text = this.GetObject();
                  text.fX = this.SvgToAxis("x", this.pos_x + this.pos_dx, this.isndc),
                  text.fY = this.SvgToAxis("y", this.pos_y + this.pos_dy, this.isndc);
                  this.WebCanvasExec("SetX(" + text.fX + ");;SetY(" + text.fY + ");;");
               }

            inter.DragMoveHandler.AddMove(this);
         });

      return this.Promise();
   }

   // =====================================================================================

   function drawLine() {

      let line = this.GetObject(),
          lineatt = new JSROOT.TAttLineHandler(line),
          kLineNDC = JSROOT.BIT(14),
          isndc = line.TestBit(kLineNDC);

      // create svg:g container for line drawing
      this.CreateG();

      this.draw_g
          .append("svg:line")
          .attr("x1", this.AxisToSvg("x", line.fX1, isndc))
          .attr("y1", this.AxisToSvg("y", line.fY1, isndc))
          .attr("x2", this.AxisToSvg("x", line.fX2, isndc))
          .attr("y2", this.AxisToSvg("y", line.fY2, isndc))
          .call(lineatt.func);
   }

   // =============================================================================

   function drawPolyLine() {

      // create svg:g container for polyline drawing
      this.CreateG();

      let polyline = this.GetObject(),
          lineatt = new JSROOT.TAttLineHandler(polyline),
          fillatt = this.createAttFill(polyline),
          kPolyLineNDC = JSROOT.BIT(14),
          isndc = polyline.TestBit(kPolyLineNDC),
          cmd = "", func = this.AxisToSvgFunc(isndc);

      for (let n=0;n<=polyline.fLastPoint;++n)
         cmd += ((n>0) ? "L" : "M") + func.x(polyline.fX[n]) + "," + func.y(polyline.fY[n]);

      if (polyline._typename != "TPolyLine") fillatt.SetSolidColor("none");

      if (!fillatt.empty()) cmd+="Z";

      this.draw_g
          .append("svg:path")
          .attr("d", cmd)
          .call(lineatt.func)
          .call(fillatt.func);
   }

   // ==============================================================================

   function drawEllipse() {

      let ellipse = this.GetObject();

      this.createAttLine({ attr: ellipse });
      this.createAttFill({ attr: ellipse });

      // create svg:g container for ellipse drawing
      this.CreateG();

      let x = this.AxisToSvg("x", ellipse.fX1),
          y = this.AxisToSvg("y", ellipse.fY1),
          rx = this.AxisToSvg("x", ellipse.fX1 + ellipse.fR1) - x,
          ry = y - this.AxisToSvg("y", ellipse.fY1 + ellipse.fR2);

      if (ellipse._typename == "TCrown") {
         if (ellipse.fR1 <= 0) {
            // handle same as ellipse with equal radius
            rx = this.AxisToSvg("x", ellipse.fX1 + ellipse.fR2) - x;
         } else {
            let rx1 = rx, ry2 = ry,
                ry1 = y - this.AxisToSvg("y", ellipse.fY1 + ellipse.fR1),
                rx2 = this.AxisToSvg("x", ellipse.fX1 + ellipse.fR2) - x;

            let elem = this.draw_g
                          .attr("transform","translate("+x+","+y+")")
                          .append("svg:path")
                          .call(this.lineatt.func)
                          .call(this.fillatt.func);

            if ((ellipse.fPhimin == 0) && (ellipse.fPhimax == 360)) {
               elem.attr("d", "M-"+rx1+",0" +
                              "A"+rx1+","+ry1+",0,1,0,"+rx1+",0" +
                              "A"+rx1+","+ry1+",0,1,0,-"+rx1+",0" +
                              "M-"+rx2+",0" +
                              "A"+rx2+","+ry2+",0,1,0,"+rx2+",0" +
                              "A"+rx2+","+ry2+",0,1,0,-"+rx2+",0");

            } else {
               let large_arc = (ellipse.fPhimax-ellipse.fPhimin>=180) ? 1 : 0;

               let a1 = ellipse.fPhimin*Math.PI/180, a2 = ellipse.fPhimax*Math.PI/180,
                   dx1 = Math.round(rx1*Math.cos(a1)), dy1 = Math.round(ry1*Math.sin(a1)),
                   dx2 = Math.round(rx1*Math.cos(a2)), dy2 = Math.round(ry1*Math.sin(a2)),
                   dx3 = Math.round(rx2*Math.cos(a1)), dy3 = Math.round(ry2*Math.sin(a1)),
                   dx4 = Math.round(rx2*Math.cos(a2)), dy4 = Math.round(ry2*Math.sin(a2));

               elem.attr("d", "M"+dx2+","+dy2+
                              "A"+rx1+","+ry1+",0,"+large_arc+",0,"+dx1+","+dy1+
                              "L"+dx3+","+dy3 +
                              "A"+rx2+","+ry2+",0,"+large_arc+",1,"+dx4+","+dy4+"Z");
            }

            return;
         }
      }

      if ((ellipse.fPhimin == 0) && (ellipse.fPhimax == 360) && (ellipse.fTheta == 0)) {
            // this is simple case, which could be drawn with svg:ellipse
         this.draw_g.append("svg:ellipse")
                    .attr("cx", x).attr("cy", y)
                    .attr("rx", rx).attr("ry", ry)
                    .call(this.lineatt.func).call(this.fillatt.func);
         return;
      }

      // here svg:path is used to draw more complex figure

      let ct = Math.cos(ellipse.fTheta*Math.PI/180),
          st = Math.sin(ellipse.fTheta*Math.PI/180),
          dx1 = rx * Math.cos(ellipse.fPhimin*Math.PI/180),
          dy1 = ry * Math.sin(ellipse.fPhimin*Math.PI/180),
          x1 =  dx1*ct - dy1*st,
          y1 = -dx1*st - dy1*ct,
          dx2 = rx * Math.cos(ellipse.fPhimax*Math.PI/180),
          dy2 = ry * Math.sin(ellipse.fPhimax*Math.PI/180),
          x2 =  dx2*ct - dy2*st,
          y2 = -dx2*st - dy2*ct;

      this.draw_g
         .attr("transform","translate("+x+","+y+")")
         .append("svg:path")
         .attr("d", "M0,0" +
                    "L" + Math.round(x1) + "," + Math.round(y1) +
                    "A"+rx+ ","+ry + "," + Math.round(-ellipse.fTheta) + ",1,0," + Math.round(x2) + "," + Math.round(y2) +
                    "Z")
         .call(this.lineatt.func).call(this.fillatt.func);
   }

   // ==============================================================================

   function drawPie() {
      let pie = this.GetObject();

      // create svg:g container for ellipse drawing
      this.CreateG();

      let xc = this.AxisToSvg("x", pie.fX),
          yc = this.AxisToSvg("y", pie.fY),
          rx = this.AxisToSvg("x", pie.fX + pie.fRadius) - xc,
          ry = this.AxisToSvg("y", pie.fY + pie.fRadius) - yc;

      this.draw_g.attr("transform","translate("+xc+","+yc+")");

      // Draw the slices
      let nb = pie.fPieSlices.length, total = 0,
          af = (pie.fAngularOffset*Math.PI)/180,
          x1 = Math.round(rx*Math.cos(af)), y1 = Math.round(ry*Math.sin(af));

      for (let n=0; n < nb; n++)
         total += pie.fPieSlices[n].fValue;

      for (let n=0; n<nb; n++) {
         let slice = pie.fPieSlices[n],
             lineatt = new JSROOT.TAttLineHandler({attr: slice}),
             fillatt = this.createAttFill(slice);

         af += slice.fValue/total*2*Math.PI;
         let x2 = Math.round(rx*Math.cos(af)), y2 = Math.round(ry*Math.sin(af));

         this.draw_g
             .append("svg:path")
             .attr("d", "M0,0L"+x1+","+y1+"A"+rx+","+ry+",0,0,0,"+x2+","+y2+"z")
             .call(lineatt.func)
             .call(fillatt.func);
         x1 = x2; y1 = y2;
      }
   }

   // =============================================================================

   function drawBox() {

      let box = this.GetObject(),
          opt = this.OptionsAsString(),
          draw_line = (opt.toUpperCase().indexOf("L")>=0),
          lineatt = this.createAttLine(box),
          fillatt = this.createAttFill(box);

      // create svg:g container for box drawing
      this.CreateG();

      let x1 = this.AxisToSvg("x", box.fX1),
          x2 = this.AxisToSvg("x", box.fX2),
          y1 = this.AxisToSvg("y", box.fY1),
          y2 = this.AxisToSvg("y", box.fY2),
          xx = Math.min(x1,x2), yy = Math.min(y1,y2),
          ww = Math.abs(x2-x1), hh = Math.abs(y1-y2);

      // if box filled, contour line drawn only with "L" draw option:
      if (!fillatt.empty() && !draw_line) lineatt.color = "none";

      this.draw_g
          .append("svg:rect")
          .attr("x", xx).attr("y", yy)
          .attr("width", ww)
          .attr("height", hh)
          .call(lineatt.func)
          .call(fillatt.func);

      if (box.fBorderMode && box.fBorderSize && (fillatt.color!=='none')) {
         let pww = box.fBorderSize, phh = box.fBorderSize,
             side1 = "M"+xx+","+yy + "h"+ww + "l"+(-pww)+","+phh + "h"+(2*pww-ww) +
                     "v"+(hh-2*phh)+ "l"+(-pww)+","+phh + "z",
             side2 = "M"+(xx+ww)+","+(yy+hh) + "v"+(-hh) + "l"+(-pww)+","+phh + "v"+(hh-2*phh)+
                     "h"+(2*pww-ww) + "l"+(-pww)+","+phh + "z";

         if (box.fBorderMode<0) { let s = side1; side1 = side2; side2 = s; }

         this.draw_g.append("svg:path")
                    .attr("d", side1)
                    .style("stroke","none")
                    .call(fillatt.func)
                    .style("fill", d3.rgb(fillatt.color).brighter(0.5).toString());

         this.draw_g.append("svg:path")
             .attr("d", side2)
             .style("stroke","none")
             .call(fillatt.func)
             .style("fill", d3.rgb(fillatt.color).darker(0.5).toString());
      }
   }

   // =============================================================================

   function drawMarker() {
      let marker = this.GetObject(),
          att = new JSROOT.TAttMarkerHandler(marker),
          kMarkerNDC = JSROOT.BIT(14),
          isndc = marker.TestBit(kMarkerNDC);

      // create svg:g container for box drawing
      this.CreateG();

      let x = this.AxisToSvg("x", marker.fX, isndc),
          y = this.AxisToSvg("y", marker.fY, isndc),
          path = att.create(x,y);

      if (path)
         this.draw_g.append("svg:path")
             .attr("d", path)
             .call(att.func);
   }

   // =============================================================================

   function drawPolyMarker() {

      // create svg:g container for box drawing
      this.CreateG();

      let poly = this.GetObject(),
          att = new JSROOT.TAttMarkerHandler(poly),
          path = "",
          func = this.AxisToSvgFunc();

      for (let n=0;n<poly.fN;++n)
         path += att.create(func.x(poly.fX[n]), func.y(poly.fY[n]));

      if (path)
         this.draw_g.append("svg:path")
             .attr("d", path)
             .call(att.func);
   }

   // ======================================================================================

   function drawArrow() {
      let arrow = this.GetObject(), kLineNDC = JSROOT.BIT(14), oo = arrow.fOption;

      this.wsize = Math.max(3, Math.round(Math.max(this.pad_width(), this.pad_height()) * arrow.fArrowSize*0.8));
      this.isndc = arrow.TestBit(kLineNDC);
      this.angle2 = arrow.fAngle/2/180 * Math.PI;
      this.beg = this.mid = this.end = 0;

      if (oo.indexOf("<")==0)
         this.beg = (oo.indexOf("<|") == 0) ? 12 : 2;
      if (oo.indexOf("->-")>=0)  this.mid = 1; else
      if (oo.indexOf("-|>-")>=0) this.mid = 11; else
      if (oo.indexOf("-<-")>=0) this.mid = 2; else
      if (oo.indexOf("-<|-")>=0) this.mid = 12;
      if (oo.lastIndexOf(">") == oo.length-1)
         this.end = ((oo.lastIndexOf("|>") == oo.length-2) && (oo.length>1)) ? 11 : 1;

      this.createAttLine({ attr: arrow });

      this.CreateG();

      this.x1 = this.AxisToSvg("x", arrow.fX1, this.isndc, true);
      this.y1 = this.AxisToSvg("y", arrow.fY1, this.isndc, true);
      this.x2 = this.AxisToSvg("x", arrow.fX2, this.isndc, true);
      this.y2 = this.AxisToSvg("y", arrow.fY2, this.isndc, true);

      this.rotate = function(angle, x0, y0) {
         let dx = this.wsize * Math.cos(angle), dy = this.wsize * Math.sin(angle), res = "";
         if ((x0 !== undefined) && (y0 !== undefined)) {
            res =  "M" + Math.round(x0-dx) + "," + Math.round(y0-dy);
         } else {
            dx = -dx; dy = -dy;
         }
         res += "l"+Math.round(dx)+","+Math.round(dy);
         if (x0 && (y0===undefined)) res+="z";
         return res;
      }

      this.createPath = function() {
         let angle = Math.atan2(this.y2 - this.y1, this.x2 - this.x1),
             dlen = this.wsize * Math.cos(this.angle2),
             dx = dlen*Math.cos(angle), dy = dlen*Math.sin(angle),
             path = "";

         if (this.beg)
            path += this.rotate(angle - Math.PI - this.angle2, this.x1, this.y1) +
                    this.rotate(angle - Math.PI + this.angle2, this.beg > 10);

         if (this.mid % 10 == 2)
            path += this.rotate(angle - Math.PI - this.angle2, (this.x1+this.x2-dx)/2, (this.y1+this.y2-dy)/2) +
                    this.rotate(angle - Math.PI + this.angle2, this.mid > 10);

         if (this.mid % 10 == 1)
            path += this.rotate(angle - this.angle2, (this.x1+this.x2+dx)/2, (this.y1+this.y2+dy)/2) +
                    this.rotate(angle + this.angle2, this.mid > 10);

         if (this.end)
            path += this.rotate(angle - this.angle2, this.x2, this.y2) +
                    this.rotate(angle + this.angle2, this.end > 10);

         return "M" + Math.round(this.x1 + (this.beg > 10 ? dx : 0)) + "," +
                      Math.round(this.y1 + (this.beg > 10 ? dy : 0)) +
                "L" + Math.round(this.x2 - (this.end > 10 ? dx : 0)) + "," +
                      Math.round(this.y2 - (this.end > 10 ? dy : 0)) +
                path;
      }

      let elem = this.draw_g.append("svg:path")
                     .attr("d", this.createPath())
                     .call(this.lineatt.func);

      if ((this.beg > 10) || (this.end > 10)) {
         this.createAttFill({ attr: arrow });
         elem.call(this.fillatt.func);
      } else {
         elem.style('fill','none');
      }

      if (!JSROOT.BatchMode)
         JSROOT.require(['interactive']).then(inter => {

            if (!this.moveStart)
               this.moveStart = function(x,y) {
                  let fullsize = Math.sqrt(Math.pow(this.x1-this.x2,2) + Math.pow(this.y1-this.y2,2)),
                      sz1 = Math.sqrt(Math.pow(x-this.x1,2) + Math.pow(y-this.y1,2))/fullsize,
                      sz2 = Math.sqrt(Math.pow(x-this.x2,2) + Math.pow(y-this.y2,2))/fullsize;
                  if (sz1>0.9) this.side = 1; else if (sz2>0.9) this.side = -1; else this.side = 0;
               }

            if (!this.moveDrag)
               this.moveDrag = function(dx,dy) {
                  if (this.side != 1) { this.x1 += dx; this.y1 += dy; }
                  if (this.side != -1) { this.x2 += dx; this.y2 += dy; }
                  this.draw_g.select('path').attr("d", this.createPath());
               }

            if (!this.moveEnd)
               this.moveEnd = function(not_changed) {
                  if (not_changed) return;
                  let arrow = this.GetObject(), exec = "";
                  arrow.fX1 = this.SvgToAxis("x", this.x1, this.isndc);
                  arrow.fX2 = this.SvgToAxis("x", this.x2, this.isndc);
                  arrow.fY1 = this.SvgToAxis("y", this.y1, this.isndc);
                  arrow.fY2 = this.SvgToAxis("y", this.y2, this.isndc);
                  if (this.side != 1) exec += "SetX1(" + arrow.fX1 + ");;SetY1(" + arrow.fY1 + ");;";
                  if (this.side != -1) exec += "SetX2(" + arrow.fX2 + ");;SetY2(" + arrow.fY2 + ");;";
                  this.WebCanvasExec(exec + "Notify();;");
               }

            inter.DragMoveHandler.AddMove(this);
         });
   }

   // =================================================================================

   function drawRooPlot(divid, plot) {

      return new Promise((resolve) => {

         let cnt = -1, hpainter = null;

         function DrawNextItem(p) {
            if (!hpainter) hpainter = p;
            if (++cnt >= plot._items.arr.length) return resolve(hpainter);
            JSROOT.draw(divid, plot._items.arr[cnt], plot._items.opt[cnt]).then(DrawNextItem);
         }

         JSROOT.draw(divid, plot._hist, "hist").then(DrawNextItem);
      });
   }

   // ===================================================================================

   /** @clas
    * @memberof JSROOT
    * @extends JSROOT.ObjectPainter
    * @summary Painter for TF1 object.
    * @param {object} tf1 - TF1 object to draw
    * @private
    */

   function TF1Painter(tf1) {
      JSROOT.ObjectPainter.call(this, tf1);
      this.bins = null;
   }

   TF1Painter.prototype = Object.create(JSROOT.ObjectPainter.prototype);

   TF1Painter.prototype.Eval = function(x) {
      return this.GetObject().evalPar(x);
   }

   //TF1Painter.prototype.UpdateObject = function(obj, opt) {
   //   if (!this.MatchObjectType(obj)) return false;
   //   let tf1 = this.GetObject();
   //   tf1.fSave = obj.fSave;
   //   return true;
   //}

   TF1Painter.prototype.CreateBins = function(ignore_zoom) {
      let main = this.frame_painter(),
          gxmin = 0, gxmax = 0, tf1 = this.GetObject();

      if (main && !ignore_zoom)  {
         if (main.zoom_xmin !== main.zoom_xmax) {
            gxmin = main.zoom_xmin;
            gxmax = main.zoom_xmax;
         } else {
            gxmin = main.xmin;
            gxmax = main.xmax;
         }
      }

      if ((tf1.fSave.length > 0) && !this.nosave) {
         // in the case where the points have been saved, useful for example
         // if we don't have the user's function
         let np = tf1.fSave.length - 2,
             xmin = tf1.fSave[np],
             xmax = tf1.fSave[np+1],
             dx = (xmax - xmin) / (np-1),
             res = [];

         for (let n=0; n < np; ++n) {
            let xx = xmin + dx*n;
            // check if points need to be displayed at all, keep at least 4-5 points for Bezier curves
            if ((gxmin !== gxmax) && ((xx + 2*dx < gxmin) || (xx - 2*dx > gxmax))) continue;
            let yy = tf1.fSave[n];

            if (!isNaN(yy)) res.push({ x : xx, y : yy });
         }
         return res;
      }

      let xmin = tf1.fXmin, xmax = tf1.fXmax, logx = false;

      if (gxmin !== gxmax) {
         if (gxmin > xmin) xmin = gxmin;
         if (gxmax < xmax) xmax = gxmax;
      }

      if (main && main.logx && (xmin>0) && (xmax>0)) {
         logx = true;
         xmin = Math.log(xmin);
         xmax = Math.log(xmax);
      }

      let np = Math.max(tf1.fNpx, 101),
         dx = (xmax - xmin) / (np - 1),
         res = [];

      for (let n=0; n < np; n++) {
         let xx = xmin + n*dx;
         if (logx) xx = Math.exp(xx);
         let yy = this.Eval(xx);
         if (!isNaN(yy)) res.push({ x: xx, y: yy });
      }
      return res;
   }

   TF1Painter.prototype.CreateDummyHisto = function() {

      let xmin = 0, xmax = 1, ymin = 0, ymax = 1,
          bins = this.CreateBins(true);

      if (bins && (bins.length > 0)) {

         xmin = xmax = bins[0].x;
         ymin = ymax = bins[0].y;

         bins.forEach(bin => {
            xmin = Math.min(bin.x, xmin);
            xmax = Math.max(bin.x, xmax);
            ymin = Math.min(bin.y, ymin);
            ymax = Math.max(bin.y, ymax);
         });

         if (ymax > 0.0) ymax *= 1.05;
         if (ymin < 0.0) ymin *= 1.05;
      }

      let histo = JSROOT.Create("TH1I"),
          tf1 = this.GetObject();

      histo.fName = tf1.fName + "_hist";
      histo.fTitle = tf1.fTitle;

      histo.fXaxis.fXmin = xmin;
      histo.fXaxis.fXmax = xmax;
      histo.fYaxis.fXmin = ymin;
      histo.fYaxis.fXmax = ymax;

      return histo;
   }

   TF1Painter.prototype.ProcessTooltip = function(pnt) {
      let cleanup = false;

      if ((pnt === null) || (this.bins === null)) {
         cleanup = true;
      } else
      if ((this.bins.length==0) || (pnt.x < this.bins[0].grx) || (pnt.x > this.bins[this.bins.length-1].grx)) {
         cleanup = true;
      }

      if (cleanup) {
         if (this.draw_g !== null)
            this.draw_g.select(".tooltip_bin").remove();
         return null;
      }

      let min = 100000, best = -1, bin;

      for(let n=0; n<this.bins.length; ++n) {
         bin = this.bins[n];
         let dist = Math.abs(bin.grx - pnt.x);
         if (dist < min) { min = dist; best = n; }
      }

      bin = this.bins[best];

      let gbin = this.draw_g.select(".tooltip_bin"),
          radius = this.lineatt.width + 3;

      if (gbin.empty())
         gbin = this.draw_g.append("svg:circle")
                           .attr("class","tooltip_bin")
                           .style("pointer-events","none")
                           .attr("r", radius)
                           .call(this.lineatt.func)
                           .call(this.fillatt.func);

      let res = { name: this.GetObject().fName,
                  title: this.GetObject().fTitle,
                  x: bin.grx,
                  y: bin.gry,
                  color1: this.lineatt.color,
                  color2: this.fillatt.fillcolor(),
                  lines: [],
                  exact: (Math.abs(bin.grx - pnt.x) < radius) && (Math.abs(bin.gry - pnt.y) < radius) };

      res.changed = gbin.property("current_bin") !== best;
      res.menu = res.exact;
      res.menu_dist = Math.sqrt((bin.grx-pnt.x)*(bin.grx-pnt.x) + (bin.gry-pnt.y)*(bin.gry-pnt.y));

      if (res.changed)
         gbin.attr("cx", bin.grx)
             .attr("cy", bin.gry)
             .property("current_bin", best);

      let name = this.GetTipName();
      if (name.length > 0) res.lines.push(name);

      let pmain = this.frame_painter();
      if (pmain)
         res.lines.push("x = " + pmain.AxisAsText("x",bin.x) + " y = " + pmain.AxisAsText("y",bin.y));

      return res;
   }

   TF1Painter.prototype.Redraw = function() {

      let h = this.frame_height(),
          tf1 = this.GetObject(),
          fp = this.frame_painter(),
          pmain = this.main_painter();

      this.CreateG(true);

      // recalculate drawing bins when necessary
      this.bins = this.CreateBins(false);

      this.createAttLine({ attr: tf1 });
      this.lineatt.used = false;

      this.createAttFill({ attr: tf1, kind: 1 });
      this.fillatt.used = false;

      // first calculate graphical coordinates
      for(let n=0; n<this.bins.length; ++n) {
         let bin = this.bins[n];
         bin.grx = fp.grx(bin.x);
         bin.gry = fp.gry(bin.y);
      }

      if (this.bins.length > 2) {

         let h0 = h;  // use maximal frame height for filling
         if ((pmain.hmin!==undefined) && (pmain.hmin>=0)) {
            h0 = Math.round(fp.gry(0));
            if ((h0 > h) || (h0 < 0)) h0 = h;
         }

         let path = jsrp.BuildSvgPath("bezier", this.bins, h0, 2);

         if (this.lineatt.color != "none")
            this.draw_g.append("svg:path")
               .attr("class", "line")
               .attr("d", path.path)
               .style("fill", "none")
               .call(this.lineatt.func);

         if (!this.fillatt.empty())
            this.draw_g.append("svg:path")
               .attr("class", "area")
               .attr("d", path.path + path.close)
               .style("stroke", "none")
               .call(this.fillatt.func);
      }
   }

   TF1Painter.prototype.CanZoomIn = function(axis,min,max) {
      if (axis!=="x") return false;

      let tf1 = this.GetObject();

      if (tf1.fSave.length > 0) {
         // in the case where the points have been saved, useful for example
         // if we don't have the user's function
         let nb_points = tf1.fNpx;

         let xmin = tf1.fSave[nb_points + 1];
         let xmax = tf1.fSave[nb_points + 2];

         return Math.abs(xmin - xmax) / nb_points < Math.abs(min - max);
      }

      // if function calculated, one always could zoom inside
      return true;
   }

   TF1Painter.prototype.PerformDraw = function() {
      if (this.main_painter() === null) {
         let histo = this.CreateDummyHisto();
         return JSROOT.draw(this.divid, histo, "AXIS").then(() => {
            this.SetDivId(this.divid);
            this.Redraw();
            return this.DrawingReady();
         });
      }

      this.SetDivId(this.divid);
      this.Redraw();
      return Promise.resolve(this.DrawingReady());
   }

   function drawFunction(divid, tf1, opt) {

      let painter = new TF1Painter(tf1);

      painter.SetDivId(divid, -1);
      let d = new JSROOT.DrawOptions(opt);
      painter.nosave = d.check('NOSAVE');

      if (JSROOT.Math !== undefined)
         return painter.PerformDraw();

      return JSROOT.require("math").then(() => painter.PerformDraw());
   }

   // =======================================================================

   /**
    * @summary Painter for TGraph object.
    *
    * @class
    * @memberof JSROOT
    * @extends JSROOT.ObjectPainter
    * @param {object} graph - TGraph object to draw
    * @private
    */

   function TGraphPainter(graph) {
      JSROOT.ObjectPainter.call(this, graph);
      this.axes_draw = false; // indicate if graph histogram was drawn for axes
      this.bins = null;
      this.xmin = this.ymin = this.xmax = this.ymax = 0;
      this.wheel_zoomy = true;
      this.is_bent = (graph._typename == 'TGraphBentErrors');
      this.has_errors = (graph._typename == 'TGraphErrors') ||
                        (graph._typename == 'TGraphAsymmErrors') ||
                         this.is_bent || graph._typename.match(/^RooHist/);
   }

   TGraphPainter.prototype = Object.create(JSROOT.ObjectPainter.prototype);

   TGraphPainter.prototype.Redraw = function() {
      this.DrawBins();
   }

   TGraphPainter.prototype.Cleanup = function() {
      delete this.interactive_bin; // break mouse handling
      delete this.bins;
      JSROOT.ObjectPainter.prototype.Cleanup.call(this);
   }

   TGraphPainter.prototype.DecodeOptions = function(opt) {

      if (!opt) opt = this.main_painter() ? "lp" : "alp";

      if ((typeof opt == "string") && (opt.indexOf("same ")==0))
         opt = opt.substr(5);

      let graph = this.GetObject(),
          d = new JSROOT.DrawOptions(opt);

      if (!this.options) this.options = {};

      JSROOT.extend(this.options, {
         Line: 0, Curve: 0, Rect: 0, Mark: 0, Bar: 0, OutRange: 0,  EF:0, Fill: 0, NoOpt: 0,
         MainError: 1, Ends: 1, Axis: "", PadStats: false, PadTitle: false, original: opt
       });

      let res = this.options;

      res.PadStats = d.check("USE_PAD_STATS");
      res.PadTitle = d.check("USE_PAD_TITLE");

      res._pfc = d.check("PFC");
      res._plc = d.check("PLC");
      res._pmc = d.check("PMC");

      if (d.check('NOOPT')) res.NoOpt = 1;
      if (d.check('L')) res.Line = 1;
      if (d.check('F')) res.Fill = 1;
      if (d.check('A')) res.Axis = d.check("I") ? "A" : "AXIS"; // I means invisible axis
      if (d.check('X+')) res.Axis += "X+";
      if (d.check('Y+')) res.Axis += "Y+";
      if (d.check('RX')) res.Axis += "RX";
      if (d.check('RY')) res.Axis += "RY";
      if (d.check('C')) res.Curve = res.Line = 1;
      if (d.check('*')) res.Mark = 103;
      if (d.check('P0')) res.Mark = 104;
      if (d.check('P')) res.Mark = 1;
      if (d.check('B')) { res.Bar = 1; res.Errors = 0; }
      if (d.check('Z')) { res.Errors = 1; res.Ends = 0; }
      if (d.check('||')) { res.Errors = 1; res.MainError = 0; res.Ends = 1; }
      if (d.check('[]')) { res.Errors = 1; res.MainError = 0; res.Ends = 2; }
      if (d.check('|>')) { res.Errors = 1; res.Ends = 3; }
      if (d.check('>')) { res.Errors = 1; res.Ends = 4; }
      if (d.check('0')) { res.Mark = 1; res.Errors = 1; res.OutRange = 1; }
      if (d.check('1')) { if (res.Bar == 1) res.Bar = 2; }
      if (d.check('2')) { res.Rect = 1; res.Errors = 0; }
      if (d.check('3')) { res.EF = 1; res.Errors = 0;  }
      if (d.check('4')) { res.EF = 2; res.Errors = 0; }
      if (d.check('5')) { res.Rect = 2; res.Errors = 0; }
      if (d.check('X')) res.Errors = 0;
      // if (d.check('E')) res.Errors = 1; // E option only defined for TGraphPolar

      if (res.Errors === undefined)
         res.Errors = this.has_errors ? 1 : 0;

      // special case - one could use svg:path to draw many pixels (
      if ((res.Mark == 1) && (graph.fMarkerStyle==1)) res.Mark = 101;

      // if no drawing option is selected and if opt=='' nothing is done.
      if (res.Line + res.Fill + res.Mark + res.Bar + res.EF + res.Rect + res.Errors == 0) {
         if (d.empty()) res.Line = 1;
      }

      if (graph._typename == 'TGraphErrors') {
         if (d3.max(graph.fEX) < 1.0e-300 && d3.max(graph.fEY) < 1.0e-300)
            res.Errors = 0;
      }

      if (!res.Axis) {
         // check if axis should be drawn
         // either graph drawn directly or
         // graph is first object in list of primitives
         let pad = this.root_pad();
         if (!pad || (pad.fPrimitives && (pad.fPrimitives.arr[0] === graph))) res.Axis = "AXIS";
      } else if (res.Axis.indexOf("A")<0) {
         res.Axis = "AXIS," + res.Axis;
      }

      if (res.PadTitle) res.Axis += ";USE_PAD_TITLE";

      res.HOptions = res.Axis;
   }

   TGraphPainter.prototype.CreateBins = function() {
      let gr = this.GetObject();
      if (!gr) return;

      let kind = 0, npoints = gr.fNpoints;
      if ((gr._typename==="TCutG") && (npoints>3)) npoints--;

      if (gr._typename == 'TGraphErrors') kind = 1; else
      if (gr._typename == 'TGraphAsymmErrors' || gr._typename == 'TGraphBentErrors'
          || gr._typename.match(/^RooHist/)) kind = 2;

      this.bins = new Array(npoints);

      for (let p = 0; p < npoints; ++p) {
         let bin = this.bins[p] = { x: gr.fX[p], y: gr.fY[p], indx: p };
         switch(kind) {
            case 1:
               bin.exlow = bin.exhigh = gr.fEX[p];
               bin.eylow = bin.eyhigh = gr.fEY[p];
               break;
            case 2:
               bin.exlow  = gr.fEXlow[p];
               bin.exhigh = gr.fEXhigh[p];
               bin.eylow  = gr.fEYlow[p];
               bin.eyhigh = gr.fEYhigh[p];
               break;
         }

         if (p===0) {
            this.xmin = this.xmax = bin.x;
            this.ymin = this.ymax = bin.y;
         }

         if (kind > 0) {
            this.xmin = Math.min(this.xmin, bin.x - bin.exlow, bin.x + bin.exhigh);
            this.xmax = Math.max(this.xmax, bin.x - bin.exlow, bin.x + bin.exhigh);
            this.ymin = Math.min(this.ymin, bin.y - bin.eylow, bin.y + bin.eyhigh);
            this.ymax = Math.max(this.ymax, bin.y - bin.eylow, bin.y + bin.eyhigh);
         } else {
            this.xmin = Math.min(this.xmin, bin.x);
            this.xmax = Math.max(this.xmax, bin.x);
            this.ymin = Math.min(this.ymin, bin.y);
            this.ymax = Math.max(this.ymax, bin.y);
         }
      }
   }

   TGraphPainter.prototype.CreateHistogram = function(only_set_ranges) {
      // bins should be created when calling this function

      let xmin = this.xmin, xmax = this.xmax, ymin = this.ymin, ymax = this.ymax, set_x = true, set_y = true;

      if (xmin >= xmax) xmax = xmin+1;
      if (ymin >= ymax) ymax = ymin+1;
      let dx = (xmax-xmin)*0.1, dy = (ymax-ymin)*0.1,
          uxmin = xmin - dx, uxmax = xmax + dx,
          minimum = ymin - dy, maximum = ymax + dy;

      // this is draw options with maximal axis range which could be unzoomed
      this.options.HOptions = this.options.Axis + ";ymin:" + minimum + ";ymax:" + maximum;

      if ((uxmin<0) && (xmin>=0)) uxmin = xmin*0.9;
      if ((uxmax>0) && (xmax<=0)) uxmax = 0;

      let graph = this.GetObject();

      if (graph.fMinimum != -1111) minimum = ymin = graph.fMinimum;
      if (graph.fMaximum != -1111) maximum = ymax = graph.fMaximum;
      if ((minimum < 0) && (ymin >=0)) minimum = 0.9*ymin;

      let kResetHisto = JSROOT.BIT(17);   ///< fHistogram must be reset in GetHistogram

      let histo = graph.fHistogram;

      if (only_set_ranges) {
         set_x = only_set_ranges.indexOf("x") >= 0;
         set_y = only_set_ranges.indexOf("y") >= 0;
      } else if (histo) {
         // make logic like in the TGraph::GetHistogram
         if (!graph.TestBit(kResetHisto)) return histo;
         graph.InvertBit(kResetHisto);
      } else {
         graph.fHistogram = histo = JSROOT.CreateHistogram("TH1F", 100);
         histo.fName = graph.fName + "_h";
         histo.fTitle = graph.fTitle;
         let kNoStats = JSROOT.BIT(9);
         histo.fBits = histo.fBits | kNoStats;
         this._own_histogram = true;
      }

      if (set_x) {
         histo.fXaxis.fXmin = uxmin;
         histo.fXaxis.fXmax = uxmax;
      }
      if (set_y) {
         histo.fYaxis.fXmin = minimum;
         histo.fYaxis.fXmax = maximum;
         histo.fMinimum = minimum;
         histo.fMaximum = maximum;
      }

      return histo;
   }

   /** @summary Check if user range can be unzommed
    * @desc Used when graph points covers larger range than provided histogram */
   TGraphPainter.prototype.UnzoomUserRange = function(dox, doy /*, doz*/) {
      let graph = this.GetObject();
      if (this._own_histogram || !graph) return false;

      let histo = graph.fHistogram;
      if (!histo) return false;

      let arg = "";
      if (dox && (histo.fXaxis.fXmin > this.xmin) || (histo.fXaxis.fXmax < this.xmax)) arg += "x";
      if (doy && (histo.fYaxis.fXmin > this.ymin) || (histo.fYaxis.fXmax < this.ymax)) arg += "y";
      if (!arg) return false;

      this.CreateHistogram(arg);
      let hpainter = this.main_painter();
      if (hpainter) hpainter.CreateAxisFuncs(false);

      return true;
   }

   /** @summary Returns true if graph drawing can be optimize */
   TGraphPainter.prototype.CanOptimize = function() {
      return (JSROOT.settings.OptimizeDraw > 0) && !this.options.NoOpt;
   }

   /** Returns optimized bins - if optimization enabled */
   TGraphPainter.prototype.OptimizeBins = function(maxpnt, filter_func) {
      if ((this.bins.length < 30) && !filter_func) return this.bins;

      let selbins = null;
      if (typeof filter_func == 'function') {
         for (let n = 0; n < this.bins.length; ++n) {
            if (filter_func(this.bins[n],n)) {
               if (!selbins) selbins = (n==0) ? [] : this.bins.slice(0, n);
            } else {
               if (selbins) selbins.push(this.bins[n]);
            }
         }
      }
      if (!selbins) selbins = this.bins;

      if (!maxpnt) maxpnt = 500000;

      if ((selbins.length < maxpnt) || !this.CanOptimize()) return selbins;
      let step = Math.floor(selbins.length / maxpnt);
      if (step < 2) step = 2;
      let optbins = [];
      for (let n = 0; n < selbins.length; n+=step)
         optbins.push(selbins[n]);

      return optbins;
   }

   TGraphPainter.prototype.TooltipText = function(d) {
      let pmain = this.frame_painter(), lines = [];

      lines.push(this.GetTipName());

      if (d && pmain) {
         lines.push("x = " + pmain.AxisAsText("x", d.x));
         lines.push("y = " + pmain.AxisAsText("y", d.y));

         if (this.options.Errors && (pmain.x_kind=='normal') && ('exlow' in d) && ((d.exlow!=0) || (d.exhigh!=0)))
            lines.push("error x = -" + pmain.AxisAsText("x", d.exlow) + "/+" + pmain.AxisAsText("x", d.exhigh));

         if ((this.options.Errors || (this.options.EF > 0)) && (pmain.y_kind=='normal') && ('eylow' in d) && ((d.eylow!=0) || (d.eyhigh!=0)))
            lines.push("error y = -" + pmain.AxisAsText("y", d.eylow) + "/+" + pmain.AxisAsText("y", d.eyhigh));
      }
      return lines;
   }

   TGraphPainter.prototype.get_main = function() {
      let pmain = this.frame_painter();

      if (pmain && pmain.grx && pmain.gry) return pmain;

      pmain = {
          pad_layer: true,
          pad: this.root_pad(),
          pw: this.pad_width(),
          ph: this.pad_height(),
          grx: function(value) {
             if (this.pad.fLogx)
                value = (value>0) ? Math.log10(value) : this.pad.fUxmin;
             else
                value = (value - this.pad.fX1) / (this.pad.fX2 - this.pad.fX1);
             return value*this.pw;
          },
          gry: function(value) {
             if (this.pad.fLogy)
                value = (value>0) ? Math.log10(value) : this.pad.fUymin;
             else
                value = (value - this.pad.fY1) / (this.pad.fY2 - this.pad.fY1);
             return (1-value)*this.ph;
          }
      }

      return pmain.pad ? pmain : null;
   }

   TGraphPainter.prototype.DrawBins = function() {

      let pmain = this.get_main(),
          w = this.frame_width(),
          h = this.frame_height(),
          graph = this.GetObject(),
          excl_width = 0,
          pp = this.pad_painter();

      if (!pmain) return;

      this.CreateG(!pmain.pad_layer);

      if (pp && (this.options._pfc || this.options._plc || this.options._pmc)) {
         let icolor = pp.CreateAutoColor(this);

         if (this.options._pfc) { graph.fFillColor = icolor; delete this.fillatt; }
         if (this.options._plc) { graph.fLineColor = icolor; delete this.lineatt; }
         if (this.options._pmc) { graph.fMarkerColor = icolor; delete this.markeratt; }

         this.options._pfc = this.options._plc = this.options._pmc = false;
      }

      this.createAttLine({ attr: graph, can_excl: true });

      this.createAttFill({ attr: graph, kind: 1 });
      this.fillatt.used = false; // mark used only when really used

      this.draw_kind = "none"; // indicate if special svg:g were created for each bin
      this.marker_size = 0; // indicate if markers are drawn

      if (this.lineatt.excl_side != 0) {
         excl_width = this.lineatt.excl_width;
         if (this.lineatt.width > 0) this.options.Line = 1;
      }

      let drawbins = null;

      if (this.options.EF) {

         drawbins = this.OptimizeBins((this.options.EF > 1) ? 5000 : 0);

         // build lower part
         for (let n=0;n<drawbins.length;++n) {
            let bin = drawbins[n];
            bin.grx = pmain.grx(bin.x);
            bin.gry = pmain.gry(bin.y - bin.eylow);
         }

         let path1 = jsrp.BuildSvgPath((this.options.EF > 1) ? "bezier" : "line", drawbins),
             bins2 = [];

         for (let n=drawbins.length-1;n>=0;--n) {
            let bin = drawbins[n];
            bin.gry = pmain.gry(bin.y + bin.eyhigh);
            bins2.push(bin);
         }

         // build upper part (in reverse direction)
         let path2 = jsrp.BuildSvgPath((this.options.EF > 1) ? "Lbezier" : "Lline", bins2);

         this.draw_g.append("svg:path")
                    .attr("d", path1.path + path2.path + "Z")
                    .style("stroke", "none")
                    .call(this.fillatt.func);
         this.draw_kind = "lines";
      }

      if (this.options.Line == 1 || this.options.Fill == 1 || (excl_width!==0)) {

         let close_symbol = "";
         if (graph._typename=="TCutG") this.options.Fill = 1;

         if (this.options.Fill == 1) {
            close_symbol = "Z"; // always close area if we want to fill it
            excl_width = 0;
         }

         if (!drawbins) drawbins = this.OptimizeBins(this.options.Curve ? 5000 : 0);

         for (let n=0;n<drawbins.length;++n) {
            let bin = drawbins[n];
            bin.grx = pmain.grx(bin.x);
            bin.gry = pmain.gry(bin.y);
         }

         let kind = "line"; // simple line
         if (this.options.Curve === 1) kind = "bezier"; else
         if (excl_width!==0) kind+="calc"; // we need to calculated deltas to build exclusion points

         let path = jsrp.BuildSvgPath(kind, drawbins);

         if (excl_width!==0) {
            let extrabins = [];
            for (let n=drawbins.length-1;n>=0;--n) {
               let bin = drawbins[n];
               let dlen = Math.sqrt(bin.dgrx*bin.dgrx + bin.dgry*bin.dgry);
               // shift point, using
               bin.grx += excl_width*bin.dgry/dlen;
               bin.gry -= excl_width*bin.dgrx/dlen;
               extrabins.push(bin);
            }

            let path2 = jsrp.BuildSvgPath("L" + ((this.options.Curve === 1) ? "bezier" : "line"), extrabins);

            this.draw_g.append("svg:path")
                       .attr("d", path.path + path2.path + "Z")
                       .style("stroke", "none")
                       .call(this.fillatt.func)
                       .style('opacity', 0.75);
         }

         if (this.options.Line || this.options.Fill) {
            let elem = this.draw_g.append("svg:path")
                           .attr("d", path.path + close_symbol);
            if (this.options.Line)
               elem.call(this.lineatt.func);
            else
               elem.style('stroke','none');

            if (this.options.Fill)
               elem.call(this.fillatt.func);
            else
               elem.style('fill','none');
         }

         this.draw_kind = "lines";
      }

      let nodes = null;

      if (this.options.Errors || this.options.Rect || this.options.Bar) {

         drawbins = this.OptimizeBins(5000, (pnt,i) => {

            let grx = pmain.grx(pnt.x);

            // when drawing bars, take all points
            if (!this.options.Bar && ((grx<0) || (grx>w))) return true;

            let gry = pmain.gry(pnt.y);

            if (!this.options.Bar && !this.options.OutRange && ((gry<0) || (gry>h))) return true;

            pnt.grx1 = Math.round(grx);
            pnt.gry1 = Math.round(gry);

            if (this.has_errors) {
               pnt.grx0 = Math.round(pmain.grx(pnt.x - pnt.exlow) - grx);
               pnt.grx2 = Math.round(pmain.grx(pnt.x + pnt.exhigh) - grx);
               pnt.gry0 = Math.round(pmain.gry(pnt.y - pnt.eylow) - gry);
               pnt.gry2 = Math.round(pmain.gry(pnt.y + pnt.eyhigh) - gry);

               if (this.is_bent) {
                  pnt.grdx0 = Math.round(pmain.gry(pnt.y + graph.fEXlowd[i]) - gry);
                  pnt.grdx2 = Math.round(pmain.gry(pnt.y + graph.fEXhighd[i]) - gry);
                  pnt.grdy0 = Math.round(pmain.grx(pnt.x + graph.fEYlowd[i]) - grx);
                  pnt.grdy2 = Math.round(pmain.grx(pnt.x + graph.fEYhighd[i]) - grx);
               } else {
                  pnt.grdx0 = pnt.grdx2 = pnt.grdy0 = pnt.grdy2 = 0;
               }
            }

            return false;
         });

         this.draw_kind = "nodes";

         // here are up to five elements are collected, try to group them
         nodes = this.draw_g.selectAll(".grpoint")
                     .data(drawbins)
                     .enter()
                     .append("svg:g")
                     .attr("class", "grpoint")
                     .attr("transform", function(d) { return "translate(" + d.grx1 + "," + d.gry1 + ")"; });
      }

      if (this.options.Bar) {
         // calculate bar width
         for (let i=1;i<drawbins.length-1;++i)
            drawbins[i].width = Math.max(2, (drawbins[i+1].grx1 - drawbins[i-1].grx1) / 2 - 2);

         // first and last bins
         switch (drawbins.length) {
            case 0: break;
            case 1: drawbins[0].width = w/4; break; // pathologic case of single bin
            case 2: drawbins[0].width = drawbins[1].width = (drawbins[1].grx1-drawbins[0].grx1)/2; break;
            default:
               drawbins[0].width = drawbins[1].width;
               drawbins[drawbins.length-1].width = drawbins[drawbins.length-2].width;
         }

         let yy0 = Math.round(pmain.gry(0));

         nodes.append("svg:rect")
            .attr("x", d => Math.round(-d.width/2))
            .attr("y", d => {
                d.bar = true; // element drawn as bar
                if (this.options.Bar!==1) return 0;
                return (d.gry1 > yy0) ? yy0-d.gry1 : 0;
             })
            .attr("width", d => Math.round(d.width))
            .attr("height", d => {
                if (this.options.Bar!==1) return h > d.gry1 ? h - d.gry1 : 0;
                return Math.abs(yy0 - d.gry1);
             })
            .call(this.fillatt.func);
      }

      if (this.options.Rect) {
         nodes.filter(function(d) { return (d.exlow > 0) && (d.exhigh > 0) && (d.eylow > 0) && (d.eyhigh > 0); })
           .append("svg:rect")
           .attr("x", function(d) { d.rect = true; return d.grx0; })
           .attr("y", function(d) { return d.gry2; })
           .attr("width", function(d) { return d.grx2 - d.grx0; })
           .attr("height", function(d) { return d.gry0 - d.gry2; })
           .call(this.fillatt.func)
           .call(this.options.Rect === 2 ? this.lineatt.func : function() {});
      }

      this.error_size = 0;

      if (this.options.Errors) {
         // to show end of error markers, use line width attribute
         let lw = this.lineatt.width + JSROOT.gStyle.fEndErrorSize, bb = 0,
             vv = this.options.Ends ? "m0," + lw + "v-" + 2*lw : "",
             hh = this.options.Ends ? "m" + lw + ",0h-" + 2*lw : "",
             vleft = vv, vright = vv, htop = hh, hbottom = hh,
             mm = this.options.MainError ? "M0,0L" : "M"; // command to draw main errors

         switch (this.options.Ends) {
            case 2:  // option []
               bb = Math.max(this.lineatt.width+1, Math.round(lw*0.66));
               vleft = "m"+bb+","+lw + "h-"+bb + "v-"+2*lw + "h"+bb;
               vright = "m-"+bb+","+lw + "h"+bb + "v-"+2*lw + "h-"+bb;
               htop = "m-"+lw+","+bb + "v-"+bb + "h"+2*lw + "v"+bb;
               hbottom = "m-"+lw+",-"+bb + "v"+bb + "h"+2*lw + "v-"+bb;
               break;
            case 3: // option |>
               lw = Math.max(lw, Math.round(graph.fMarkerSize*8*0.66));
               bb = Math.max(this.lineatt.width+1, Math.round(lw*0.66));
               vleft = "l"+bb+","+lw + "v-"+2*lw + "l-"+bb+","+lw;
               vright = "l-"+bb+","+lw + "v-"+2*lw + "l"+bb+","+lw;
               htop = "l-"+lw+","+bb + "h"+2*lw + "l-"+lw+",-"+bb;
               hbottom = "l-"+lw+",-"+bb + "h"+2*lw + "l-"+lw+","+bb;
               break;
            case 4: // option >
               lw = Math.max(lw, Math.round(graph.fMarkerSize*8*0.66));
               bb = Math.max(this.lineatt.width+1, Math.round(lw*0.66));
               vleft = "l"+bb+","+lw + "m0,-"+2*lw + "l-"+bb+","+lw;
               vright = "l-"+bb+","+lw + "m0,-"+2*lw + "l"+bb+","+lw;
               htop = "l-"+lw+","+bb + "m"+2*lw + ",0l-"+lw+",-"+bb;
               hbottom = "l-"+lw+",-"+bb + "m"+2*lw + ",0l-"+lw+","+bb;
               break;
         }

         this.error_size = lw;

         lw = Math.floor((this.lineatt.width-1)/2); // one should take into account half of end-cup line width

         let visible = nodes.filter(function(d) { return (d.exlow > 0) || (d.exhigh > 0) || (d.eylow > 0) || (d.eyhigh > 0); });
         if (!JSROOT.BatchMode && JSROOT.settings.Tooltip)
            visible.append("svg:path")
                   .style("stroke", "none")
                   .style("fill", "none")
                   .style("pointer-events", "visibleFill")
                   .attr("d", function(d) { return "M"+d.grx0+","+d.gry0+"h"+(d.grx2-d.grx0)+"v"+(d.gry2-d.gry0)+"h"+(d.grx0-d.grx2)+"z"; });

         visible.append("svg:path")
             .call(this.lineatt.func)
             .style("fill", "none")
             .attr("d", function(d) {
                d.error = true;
                return ((d.exlow > 0)  ? mm + (d.grx0+lw) + "," + d.grdx0 + vleft : "") +
                       ((d.exhigh > 0) ? mm + (d.grx2-lw) + "," + d.grdx2 + vright : "") +
                       ((d.eylow > 0)  ? mm + d.grdy0 + "," + (d.gry0-lw) + hbottom : "") +
                       ((d.eyhigh > 0) ? mm + d.grdy2 + "," + (d.gry2+lw) + htop : "");
              });
      }

      if (this.options.Mark) {
         // for tooltips use markers only if nodes where not created
         let path = "", pnt, grx, gry;

         this.createAttMarker({ attr: graph, style: this.options.Mark - 100 });

         this.marker_size = this.markeratt.GetFullSize();

         this.markeratt.reset_pos();

         // let produce SVG at maximum 1MB
         let maxnummarker = 1000000 / (this.markeratt.MarkerLength() + 7), step = 1;

         if (!drawbins) drawbins = this.OptimizeBins(maxnummarker); else
            if (this.CanOptimize() && (drawbins.length > 1.5*maxnummarker))
               step = Math.min(2, Math.round(drawbins.length/maxnummarker));

         for (let n=0;n<drawbins.length;n+=step) {
            pnt = drawbins[n];
            grx = pmain.grx(pnt.x);
            if ((grx > -this.marker_size) && (grx < w + this.marker_size)) {
               gry = pmain.gry(pnt.y);
               if ((gry > -this.marker_size) && (gry < h + this.marker_size))
                  path += this.markeratt.create(grx, gry);
            }
         }

         if (path.length>0) {
            this.draw_g.append("svg:path")
                       .attr("d", path)
                       .call(this.markeratt.func);
            if ((nodes===null) && (this.draw_kind=="none"))
               this.draw_kind = (this.options.Mark==101) ? "path" : "mark";

         }
      }
   }

   TGraphPainter.prototype.ExtractTooltip = function(pnt) {
      if (!pnt) return null;

      if ((this.draw_kind=="lines") || (this.draw_kind=="path") || (this.draw_kind=="mark"))
         return this.ExtractTooltipForPath(pnt);

      if (this.draw_kind!="nodes") return null;

      let height = this.frame_height(),
          pmain = this.frame_painter(),
          esz = this.error_size,
          isbar1 = (this.options.Bar===1),
          findbin = null, best_dist2 = 1e10, best = null,
          msize = this.marker_size ? Math.round(this.marker_size/2 + 1.5) : 0;

      this.draw_g.selectAll('.grpoint').each(() => {
         let d = d3.select(this).datum();
         if (d===undefined) return;
         let dist2 = Math.pow(pnt.x - d.grx1, 2);
         if (pnt.nproc===1) dist2 += Math.pow(pnt.y - d.gry1, 2);
         if (dist2 >= best_dist2) return;

         let rect;

         if (d.error || d.rect || d.marker) {
            rect = { x1: Math.min(-esz, d.grx0, -msize),
                     x2: Math.max(esz, d.grx2, msize),
                     y1: Math.min(-esz, d.gry2, -msize),
                     y2: Math.max(esz, d.gry0, msize) };
         } else if (d.bar) {
             rect = { x1: -d.width/2, x2: d.width/2, y1: 0, y2: height - d.gry1 };

             if (isbar1) {
                let yy0 = pmain.gry(0);
                rect.y1 = (d.gry1 > yy0) ? yy0-d.gry1 : 0;
                rect.y2 = (d.gry1 > yy0) ? 0 : yy0-d.gry1;
             }
          } else {
             rect = { x1: -5, x2: 5, y1: -5, y2: 5 };
          }
          let matchx = (pnt.x >= d.grx1 + rect.x1) && (pnt.x <= d.grx1 + rect.x2),
              matchy = (pnt.y >= d.gry1 + rect.y1) && (pnt.y <= d.gry1 + rect.y2);

          if (matchx && (matchy || (pnt.nproc > 1))) {
             best_dist2 = dist2;
             findbin = this;
             best = rect;
             best.exact = matchx && matchy;
          }
       });

      if (findbin === null) return null;

      let d = d3.select(findbin).datum();

      let res = { name: this.GetObject().fName, title: this.GetObject().fTitle,
                  x: d.grx1, y: d.gry1,
                  color1: this.lineatt.color,
                  lines: this.TooltipText(d),
                  rect: best, d3bin: findbin  };

      if (this.fillatt && this.fillatt.used && !this.fillatt.empty()) res.color2 = this.fillatt.fillcolor();

      if (best.exact) res.exact = true;
      res.menu = res.exact; // activate menu only when exactly locate bin
      res.menu_dist = 3; // distance always fixed
      res.bin = d;
      res.binindx = d.indx;

      return res;
   }

   TGraphPainter.prototype.ShowTooltip = function(hint) {

      if (!hint) {
         if (this.draw_g) this.draw_g.select(".tooltip_bin").remove();
         return;
      }

      if (hint.usepath) return this.ShowTooltipForPath(hint);

      let d = d3.select(hint.d3bin).datum();

      let ttrect = this.draw_g.select(".tooltip_bin");

      if (ttrect.empty())
         ttrect = this.draw_g.append("svg:rect")
                             .attr("class","tooltip_bin h1bin")
                             .style("pointer-events","none");

      hint.changed = ttrect.property("current_bin") !== hint.d3bin;

      if (hint.changed)
         ttrect.attr("x", d.grx1 + hint.rect.x1)
               .attr("width", hint.rect.x2 - hint.rect.x1)
               .attr("y", d.gry1 + hint.rect.y1)
               .attr("height", hint.rect.y2 - hint.rect.y1)
               .style("opacity", "0.3")
               .property("current_bin", hint.d3bin);
   }

   TGraphPainter.prototype.ProcessTooltip = function(pnt) {
      let hint = this.ExtractTooltip(pnt);
      if (!pnt || !pnt.disabled) this.ShowTooltip(hint);
      return hint;
   }

   TGraphPainter.prototype.FindBestBin = function(pnt) {
      if (!this.bins) return null;

      let islines = (this.draw_kind=="lines"),
          bestindx = -1,
          bestbin = null,
          bestdist = 1e10,
          pmain = this.frame_painter(),
          dist, grx, gry, n, bin;

      for (n=0;n<this.bins.length;++n) {
         bin = this.bins[n];

         grx = pmain.grx(bin.x);
         gry = pmain.gry(bin.y);

         dist = (pnt.x-grx)*(pnt.x-grx) + (pnt.y-gry)*(pnt.y-gry);

         if (dist < bestdist) {
            bestdist = dist;
            bestbin = bin;
            bestindx = n;
         }
      }

      // check last point
      if ((bestdist > 100) && islines) bestbin = null;

      let radius = Math.max(this.lineatt.width + 3, 4);

      if (this.marker_size > 0) radius = Math.max(this.marker_size, radius);

      if (bestbin)
         bestdist = Math.sqrt(Math.pow(pnt.x-pmain.grx(bestbin.x),2) + Math.pow(pnt.y-pmain.gry(bestbin.y),2));

      if (!islines && (bestdist > radius)) bestbin = null;

      if (!bestbin) bestindx = -1;

      let res = { bin: bestbin, indx: bestindx, dist: bestdist, radius: Math.round(radius) };

      if (!bestbin && islines) {

         bestdist = 10000;

         function IsInside(x, x1, x2) {
            return ((x1>=x) && (x>=x2)) || ((x1<=x) && (x<=x2));
         }

         let bin0 = this.bins[0], grx0 = pmain.grx(bin0.x), gry0, posy = 0;
         for (n=1;n<this.bins.length;++n) {
            bin = this.bins[n];
            grx = pmain.grx(bin.x);

            if (IsInside(pnt.x, grx0, grx)) {
               // if inside interval, check Y distance
               gry0 = pmain.gry(bin0.y)
               gry = pmain.gry(bin.y);

               if (Math.abs(grx - grx0) < 1) {
                  // very close x - check only y
                  posy = pnt.y;
                  dist = IsInside(pnt.y, gry0, gry) ? 0 : Math.min(Math.abs(pnt.y-gry0), Math.abs(pnt.y-gry));
               } else {
                  posy = gry0 + (pnt.x - grx0) / (grx - grx0) * (gry - gry0);
                  dist = Math.abs(posy - pnt.y);
               }

               if (dist < bestdist) {
                  bestdist = dist;
                  res.linex = pnt.x;
                  res.liney = posy;
               }
            }

            bin0 = bin;
            grx0 = grx;
         }

         if (bestdist < radius*0.5) {
            res.linedist = bestdist;
            res.closeline = true;
         }
      }

      return res;
   }

   TGraphPainter.prototype.TestEditable = function(toggle) {
      let obj = this.GetObject(),
          kNotEditable = JSROOT.BIT(18);   // bit set if graph is non editable

      if (!obj) return false;
      if (toggle) obj.InvertBit(kNotEditable);
      return !obj.TestBit(kNotEditable);
   }

   TGraphPainter.prototype.ExtractTooltipForPath = function(pnt) {

      if (this.bins === null) return null;

      let best = this.FindBestBin(pnt);

      if (!best || (!best.bin && !best.closeline)) return null;

      let islines = (this.draw_kind=="lines"),
          ismark = (this.draw_kind=="mark"),
          pmain = this.frame_painter(),
          gr = this.GetObject(),
          res = { name: gr.fName, title: gr.fTitle,
                  x: best.bin ? pmain.grx(best.bin.x) : best.linex,
                  y: best.bin ? pmain.gry(best.bin.y) : best.liney,
                  color1: this.lineatt.color,
                  lines: this.TooltipText(best.bin),
                  usepath: true };

      res.ismark = ismark;
      res.islines = islines;

      if (best.closeline) {
         res.menu = res.exact = true;
         res.menu_dist = best.linedist;
      } else if (best.bin) {
         if (this.options.EF && islines) {
            res.gry1 = pmain.gry(best.bin.y - best.bin.eylow);
            res.gry2 = pmain.gry(best.bin.y + best.bin.eyhigh);
         } else {
            res.gry1 = res.gry2 = pmain.gry(best.bin.y);
         }

         res.binindx = best.indx;
         res.bin = best.bin;
         res.radius = best.radius;

         res.exact = (Math.abs(pnt.x - res.x) <= best.radius) &&
            ((Math.abs(pnt.y - res.gry1) <= best.radius) || (Math.abs(pnt.y - res.gry2) <= best.radius));

         res.menu = res.exact;
         res.menu_dist = Math.sqrt((pnt.x-res.x)*(pnt.x-res.x) + Math.pow(Math.min(Math.abs(pnt.y-res.gry1),Math.abs(pnt.y-res.gry2)),2));
      }

      if (this.fillatt && this.fillatt.used && !this.fillatt.empty()) res.color2 = this.fillatt.fillcolor();

      if (!islines) {
         res.color1 = this.get_color(gr.fMarkerColor);
         if (!res.color2) res.color2 = res.color1;
      }

      return res;
   }

   TGraphPainter.prototype.ShowTooltipForPath = function(hint) {

      let ttbin = this.draw_g.select(".tooltip_bin");

      if (!hint || !hint.bin) {
         ttbin.remove();
         return;
      }

      if (ttbin.empty())
         ttbin = this.draw_g.append("svg:g")
                             .attr("class","tooltip_bin");

      hint.changed = ttbin.property("current_bin") !== hint.bin;

      if (hint.changed) {
         ttbin.selectAll("*").remove(); // first delete all children
         ttbin.property("current_bin", hint.bin);

         if (hint.ismark) {
            ttbin.append("svg:rect")
                 .attr("class","h1bin")
                 .style("pointer-events","none")
                 .style("opacity", "0.3")
                 .attr("x", Math.round(hint.x - hint.radius))
                 .attr("y", Math.round(hint.y - hint.radius))
                 .attr("width", 2*hint.radius)
                 .attr("height", 2*hint.radius);
         } else {
            ttbin.append("svg:circle").attr("cy", Math.round(hint.gry1))
            if (Math.abs(hint.gry1-hint.gry2) > 1)
               ttbin.append("svg:circle").attr("cy", Math.round(hint.gry2));

            let elem = ttbin.selectAll("circle")
                            .attr("r", hint.radius)
                            .attr("cx", Math.round(hint.x));

            if (!hint.islines) {
               elem.style('stroke', hint.color1 == 'black' ? 'green' : 'black').style('fill','none');
            } else {
               if (this.options.Line)
                  elem.call(this.lineatt.func);
               else
                  elem.style('stroke','black');
               if (this.options.Fill)
                  elem.call(this.fillatt.func);
               else
                  elem.style('fill','none');
            }
         }
      }
   }

   /** Start moving of TGraph */
   TGraphPainter.prototype.moveStart = function(x,y) {
      this.pos_dx = this.pos_dy = 0;
      let hint = this.ExtractTooltip({x:x, y:y});
      if (hint && hint.exact && (hint.binindx !== undefined)) {
         this.move_binindx = hint.binindx;
         this.move_bin = hint.bin;
         let main = this.frame_painter();
         this.move_x0 = main ? main.grx(this.move_bin.x) : x;
         this.move_y0 = main ? main.gry(this.move_bin.y) : y;
      } else {
         delete this.move_binindx;
      }
   }

   /** Perform moving */
   TGraphPainter.prototype.moveDrag = function(dx,dy) {
      this.pos_dx += dx;
      this.pos_dy += dy;

      if (this.move_binindx === undefined) {
         this.draw_g.attr("transform", "translate(" + this.pos_dx + "," + this.pos_dy + ")");
      } else {
         let main = this.frame_painter();
         if (main && this.move_bin) {
            this.move_bin.x = main.RevertX(this.move_x0 + this.pos_dx);
            this.move_bin.y = main.RevertY(this.move_y0 + this.pos_dy);
            this.DrawBins();
         }
      }
   }

   /** Complete moving */
   TGraphPainter.prototype.moveEnd = function(not_changed) {
      let exec = "";

      if (this.move_binindx === undefined) {

         this.draw_g.attr("transform", null);

         let main = this.frame_painter();
         if (main && this.bins && !not_changed) {
            for (let k=0;k<this.bins.length;++k) {
               let bin = this.bins[k];
               bin.x = main.RevertX(main.grx(bin.x) + this.pos_dx);
               bin.y = main.RevertY(main.gry(bin.y) + this.pos_dy);
               exec += "SetPoint(" + bin.indx + "," + bin.x + "," + bin.y + ");;";
               if ((bin.indx == 0) && this.MatchObjectType('TCutG'))
                  exec += "SetPoint(" + (this.GetObject().fNpoints-1) + "," + bin.x + "," + bin.y + ");;";
            }
            this.DrawBins();
         }
      } else {
         exec = "SetPoint(" + this.move_bin.indx + "," + this.move_bin.x + "," + this.move_bin.y + ")";
         if ((this.move_bin.indx == 0) && this.MatchObjectType('TCutG'))
            exec += ";;SetPoint(" + (this.GetObject().fNpoints-1) + "," + this.move_bin.x + "," + this.move_bin.y + ")";
         delete this.move_binindx;
      }

      if (exec && !not_changed)
         this.WebCanvasExec(exec);
   }

   TGraphPainter.prototype.FillContextMenu = function(menu) {
      JSROOT.ObjectPainter.prototype.FillContextMenu.call(this, menu);

      if (!this.snapid)
         menu.addchk(this.TestEditable(), "Editable", this.TestEditable.bind(this, true));

      return menu.size() > 0;
   }

   TGraphPainter.prototype.ExecuteMenuCommand = function(method, args) {
      if (JSROOT.ObjectPainter.prototype.ExecuteMenuCommand.call(this,method,args)) return true;

      let canp = this.canv_painter(), fp = this.frame_painter();

      if ((method.fName == 'RemovePoint') || (method.fName == 'InsertPoint')) {
         let pnt = fp ? fp.GetLastEventPos() : null;

         if (!canp || canp._readonly || !fp || !pnt) return true; // ignore function

         let hint = this.ExtractTooltip(pnt);

         if (method.fName == 'InsertPoint') {
            let main = this.frame_painter(),
                userx = main && main.RevertX ? main.RevertX(pnt.x) : 0,
                usery = main && main.RevertY ? main.RevertY(pnt.y) : 0;
            canp.ShowMessage('InsertPoint(' + userx.toFixed(3) + ',' + usery.toFixed(3) + ') not yet implemented');
         } else if (this.args_menu_id && hint && (hint.binindx !== undefined)) {
            this.WebCanvasExec("RemovePoint(" + hint.binindx + ")", this.args_menu_id);
         }

         return true; // call is processed
      }

      return false;
   }

   TGraphPainter.prototype.UpdateObject = function(obj, opt) {
      if (!this.MatchObjectType(obj)) return false;

      if ((opt !== undefined) && (opt != this.options.original))
         this.DecodeOptions(opt);

      let graph = this.GetObject();
      // TODO: make real update of TGraph object content
      graph.fBits = obj.fBits;
      graph.fTitle = obj.fTitle;
      graph.fX = obj.fX;
      graph.fY = obj.fY;
      graph.fNpoints = obj.fNpoints;
      this.CreateBins();

      // if our own histogram was used as axis drawing, we need update histogram as well
      if (this.axes_draw) {
         let main = this.main_painter(),
             fp = this.frame_painter();

         // if zoom was changed - do not update histogram
         if (!fp.zoom_changed_interactive)
            main.UpdateObject(obj.fHistogram || this.CreateHistogram());

         main.GetObject().fTitle = graph.fTitle; // copy title
      }

      return true;
   }

   TGraphPainter.prototype.CanZoomIn = function(axis,min,max) {
      // allow to zoom TGraph only when at least one point in the range

      let gr = this.GetObject();
      if ((gr===null) || (axis!=="x")) return false;

      for (let n=0; n < gr.fNpoints; ++n)
         if ((min < gr.fX[n]) && (gr.fX[n] < max)) return true;

      return false;
   }

   TGraphPainter.prototype.ButtonClick = function(funcname) {

      if (funcname !== "ToggleZoom") return false;

      let main = this.frame_painter();
      if (!main) return false;

      if ((this.xmin===this.xmax) && (this.ymin===this.ymax)) return false;

      main.Zoom(this.xmin, this.xmax, this.ymin, this.ymax);

      return true;
   }

   TGraphPainter.prototype.FindFunc = function() {
      let gr = this.GetObject();
      if (gr && gr.fFunctions)
         for (let i = 0; i < gr.fFunctions.arr.length; ++i) {
            let func = gr.fFunctions.arr[i];
            if ((func._typename == 'TF1') || (func._typename == 'TF2')) return func;
         }
      return null;
   }

   TGraphPainter.prototype.FindStat = function() {
      let gr = this.GetObject();
      if (gr && gr.fFunctions)
         for (let i = 0; i < gr.fFunctions.arr.length; ++i) {
            let func = gr.fFunctions.arr[i];
            if ((func._typename == 'TPaveStats') && (func.fName == 'stats')) return func;
         }

      return null;
   }

   TGraphPainter.prototype.CreateStat = function() {
      let func = this.FindFunc();
      if (!func) return null;

      let stats = this.FindStat();
      if (stats) return stats;

      // do not create stats box when drawing canvas
      let pp = this.canv_painter();
      if (pp && pp.normal_canvas) return null;

      if (this.options.PadStats) return null;

      this.create_stats = true;

      let st = JSROOT.gStyle;

      stats = JSROOT.Create('TPaveStats');
      JSROOT.extend(stats, { fName : 'stats',
                             fOptStat: 0,
                             fOptFit: st.fOptFit || 111,
                             fBorderSize : 1} );

      stats.fX1NDC = st.fStatX - st.fStatW;
      stats.fY1NDC = st.fStatY - st.fStatH;
      stats.fX2NDC = st.fStatX;
      stats.fY2NDC = st.fStatY;

      stats.fFillColor = st.fStatColor;
      stats.fFillStyle = st.fStatStyle;

      stats.fTextAngle = 0;
      stats.fTextSize = st.fStatFontSize; // 9 ??
      stats.fTextAlign = 12;
      stats.fTextColor = st.fStatTextColor;
      stats.fTextFont = st.fStatFont;

      stats.AddText(func.fName);

      // while TF1 was found, one can be sure that stats is existing
      this.GetObject().fFunctions.Add(stats);

      return stats;
   }

   TGraphPainter.prototype.FillStatistic = function(stat, dostat, dofit) {

      // cannot fill stats without func
      let func = this.FindFunc();

      if (!func || !dofit || !this.create_stats) return false;

      stat.ClearPave();

      stat.FillFunctionStat(func, dofit);

      return true;
   }

   TGraphPainter.prototype.DrawNextFunction = function(indx, callback) {
      // method draws next function from the functions list

      let graph = this.GetObject();

      if (!graph.fFunctions || (indx >= graph.fFunctions.arr.length))
         return JSROOT.CallBack(callback);

      let func = graph.fFunctions.arr[indx], opt = graph.fFunctions.opt[indx];

      //  required for stats filling
      // TODO: use weak reference (via pad list of painters and any kind of string)
      func.$main_painter = this;

      JSROOT.draw(this.divid, func, opt).then(this.DrawNextFunction.bind(this, indx+1, callback));
   }

   TGraphPainter.prototype.PerformDrawing = function(divid, hpainter) {
      if (hpainter) {
         this.axes_draw = true;
         if (!this._own_histogram) this.$primary = true;
         hpainter.$secondary = true;
      }
      this.SetDivId(divid);
      this.DrawBins();
      if (this.TestEditable() && !JSROOT.BatchMode)
         JSROOT.require(['interactive'])
               .then(inter => inter.DragMoveHandler.AddMove(this));
      this.DrawNextFunction(0, this.DrawingReady.bind(this));
      return this;
   }

   function drawGraph(divid, graph, opt) {

      let painter = new TGraphPainter(graph);

      painter.SetDivId(divid, -1); // just to get access to existing elements

      painter.DecodeOptions(opt);

      painter.CreateBins();

      painter.CreateStat();

      if (!painter.main_painter() && painter.options.HOptions) {
         JSROOT.draw(divid, painter.CreateHistogram(), painter.options.HOptions).then(painter.PerformDrawing.bind(painter, divid));
      } else {
         painter.PerformDrawing(divid);
      }

      return painter;
   }

   // ==============================================================

   function TGraphPolargramPainter(polargram) {
      JSROOT.ObjectPainter.call(this, polargram);
      this.$polargram = true; // indicate that this is polargram
      this.zoom_rmin = this.zoom_rmax = 0;
   }

   TGraphPolargramPainter.prototype = Object.create(JSROOT.ObjectPainter.prototype);

   TGraphPolargramPainter.prototype.translate = function(angle, radius, keep_float) {
      let _rx = this.r(radius), _ry = _rx/this.szx*this.szy,
          pos = {
            x: _rx * Math.cos(-angle - this.angle),
            y: _ry * Math.sin(-angle - this.angle),
            rx: _rx,
            ry: _ry
         };

      if (!keep_float) {
         pos.x = Math.round(pos.x);
         pos.y = Math.round(pos.y);
         pos.rx =  Math.round(pos.rx);
         pos.ry =  Math.round(pos.ry);
      }
      return pos;
   }

   TGraphPolargramPainter.prototype.format = function(radius) {
      // used to format label for radius ticks

      if (radius === Math.round(radius)) return radius.toString();
      if (this.ndig>10) return radius.toExponential(4);

      return radius.toFixed((this.ndig > 0) ? this.ndig : 0);
   }

   TGraphPolargramPainter.prototype.AxisAsText = function(axis, value) {

      if (axis == "r") {
         if (value === Math.round(value)) return value.toString();
         if (this.ndig>10) return value.toExponential(4);
         return value.toFixed(this.ndig+2);
      }

      value *= 180/Math.PI;
      return (value === Math.round(value)) ? value.toString() : value.toFixed(1);
   }

   TGraphPolargramPainter.prototype.MouseEvent = function(kind, evnt) {
      let layer = this.svg_layer("primitives_layer"),
          interactive = layer.select(".interactive_ellipse");
      if (interactive.empty()) return;

      let pnt = null;

      if (kind !== 'leave') {
         let pos = d3.pointer(evnt, interactive.node());
         pnt = { x: pos[0], y: pos[1], touch: false };
      }

      this.ProcessTooltipEvent(pnt);
   }

   TGraphPolargramPainter.prototype.GetFrameRect = function() {
      let pad = this.root_pad(),
          w = this.pad_width(),
          h = this.pad_height(),
          rect = {};

      rect.szx = Math.round(Math.max(0.1, 0.5 - Math.max(pad.fLeftMargin, pad.fRightMargin))*w);
      rect.szy = Math.round(Math.max(0.1, 0.5 - Math.max(pad.fBottomMargin, pad.fTopMargin))*h);

      rect.width = 2*rect.szx;
      rect.height = 2*rect.szy;
      rect.midx = Math.round(w/2);
      rect.midy = Math.round(h/2);
      rect.x = rect.midx - rect.szx;
      rect.y = rect.midy - rect.szy;

      rect.hint_delta_x = rect.szx;
      rect.hint_delta_y = rect.szy;

      rect.transform = "translate(" + rect.x + "," + rect.y + ")";

      return rect;
   }

   TGraphPolargramPainter.prototype.MouseWheel = function(evnt) {
      evnt.stopPropagation();
      evnt.preventDefault();

      this.ProcessTooltipEvent(null); // remove all tooltips

      let polar = this.GetObject();

      if (!polar) return;

      let delta = evnt.wheelDelta ? -evnt.wheelDelta : (evnt.deltaY || evnt.detail);
      if (!delta) return;

      delta = (delta<0) ? -0.2 : 0.2;

      let rmin = this.scale_rmin, rmax = this.scale_rmax, range = rmax - rmin;

      // rmin -= delta*range;
      rmax += delta*range;

      if ((rmin<polar.fRwrmin) || (rmax>polar.fRwrmax)) rmin = rmax = 0;

      if ((this.zoom_rmin != rmin) || (this.zoom_rmax != rmax)) {
         this.zoom_rmin = rmin;
         this.zoom_rmax = rmax;
         this.RedrawPad();
      }
   }

   TGraphPolargramPainter.prototype.Redraw = function() {
      if (!this.is_main_painter()) return;

      let polar = this.GetObject(),
          rect = this.GetFrameRect();

      this.CreateG();

      this.draw_g.attr("transform", "translate(" + rect.midx + "," + rect.midy + ")");
      this.szx = rect.szx;
      this.szy = rect.szy;

      this.scale_rmin = polar.fRwrmin;
      this.scale_rmax = polar.fRwrmax;
      if (this.zoom_rmin != this.zoom_rmax) {
         this.scale_rmin = this.zoom_rmin;
         this.scale_rmax = this.zoom_rmax;
      }

      this.r = d3.scaleLinear().domain([this.scale_rmin, this.scale_rmax]).range([ 0, this.szx ]);
      this.angle = polar.fAxisAngle || 0;

      let ticks = this.r.ticks(5),
          nminor = Math.floor((polar.fNdivRad % 10000) / 100);

      this.createAttLine({ attr: polar });
      if (!this.gridatt) this.gridatt = new JSROOT.TAttLineHandler({ color: polar.fLineColor, style: 2, width: 1 });

      let range = Math.abs(polar.fRwrmax - polar.fRwrmin);
      this.ndig = (range <= 0) ? -3 : Math.round(Math.log10(ticks.length / range));

      // verify that all radius labels are unique
      let lbls = [], indx = 0;
      while (indx<ticks.length) {
         let lbl = this.format(ticks[indx]);
         if (lbls.indexOf(lbl)>=0) {
            if (++this.ndig>10) break;
            lbls = []; indx = 0; continue;
          }
         lbls.push(lbl);
         indx++;
      }

      let exclude_last = false;

      if ((ticks[ticks.length-1] < polar.fRwrmax) && (this.zoom_rmin == this.zoom_rmax)) {
         ticks.push(polar.fRwrmax);
         exclude_last = true;
      }

      this.StartTextDrawing(polar.fRadialLabelFont, Math.round(polar.fRadialTextSize * this.szy * 2));

      for (let n=0;n<ticks.length;++n) {
         let rx = this.r(ticks[n]), ry = rx/this.szx*this.szy;
         this.draw_g.append("ellipse")
             .attr("cx",0)
             .attr("cy",0)
             .attr("rx",Math.round(rx))
             .attr("ry",Math.round(ry))
             .style("fill", "none")
             .call(this.lineatt.func);

         if ((n < ticks.length-1) || !exclude_last)
            this.DrawText({ align: 23, x: Math.round(rx), y: Math.round(polar.fRadialTextSize * this.szy * 0.5),
                            text: this.format(ticks[n]), color: this.get_color[polar.fRadialLabelColor], latex: 0 });

         if ((nminor>1) && ((n < ticks.length-1) || !exclude_last)) {
            let dr = (ticks[1] - ticks[0]) / nminor;
            for (let nn=1;nn<nminor;++nn) {
               let gridr = ticks[n] + dr*nn;
               if (gridr > this.scale_rmax) break;
               rx = this.r(gridr); ry = rx/this.szx*this.szy;
               this.draw_g.append("ellipse")
                   .attr("cx",0)
                   .attr("cy",0)
                   .attr("rx",Math.round(rx))
                   .attr("ry",Math.round(ry))
                   .style("fill", "none")
                   .call(this.gridatt.func);
            }
         }
      }

      this.FinishTextDrawing();

      let fontsize = Math.round(polar.fPolarTextSize * this.szy * 2);
      this.StartTextDrawing(polar.fPolarLabelFont, fontsize);

      let nmajor = polar.fNdivPol % 100;
      if ((nmajor !== 8) && (nmajor !== 3)) nmajor = 8;

      lbls = (nmajor==8) ? ["0", "#frac{#pi}{4}", "#frac{#pi}{2}", "#frac{3#pi}{4}", "#pi", "#frac{5#pi}{4}", "#frac{3#pi}{2}", "#frac{7#pi}{4}"] : ["0", "#frac{2#pi}{3}", "#frac{4#pi}{3}"];
      let aligns = [12, 11, 21, 31, 32, 33, 23, 13];

      for (let n=0;n<nmajor;++n) {
         let angle = -n*2*Math.PI/nmajor - this.angle;
         this.draw_g.append("line")
             .attr("x1",0)
             .attr("y1",0)
             .attr("x2", Math.round(this.szx*Math.cos(angle)))
             .attr("y2", Math.round(this.szy*Math.sin(angle)))
             .call(this.lineatt.func);

         let aindx = Math.round(16 -angle/Math.PI*4) % 8; // index in align table, here absolute angle is important

         this.DrawText({ align: aligns[aindx],
                         x: Math.round((this.szx+fontsize)*Math.cos(angle)),
                         y: Math.round((this.szy + fontsize/this.szx*this.szy)*(Math.sin(angle))),
                         text: lbls[n],
                         color: this.get_color[polar.fPolarLabelColor], latex: 1 });
      }

      this.FinishTextDrawing();

      nminor = Math.floor((polar.fNdivPol % 10000) / 100);

      if (nminor > 1)
         for (let n=0;n<nmajor*nminor;++n) {
            if (n % nminor === 0) continue;
            let angle = -n*2*Math.PI/nmajor/nminor - this.angle;
            this.draw_g.append("line")
                .attr("x1",0)
                .attr("y1",0)
                .attr("x2", Math.round(this.szx*Math.cos(angle)))
                .attr("y2", Math.round(this.szy*Math.sin(angle)))
                .call(this.gridatt.func);
         }

      if (JSROOT.BatchMode) return;

      JSROOT.require(['interactive']).then(inter => {
         inter.TooltipHandler.assign(this);

         let layer = this.svg_layer("primitives_layer"),
             interactive = layer.select(".interactive_ellipse");

         if (interactive.empty())
            interactive = layer.append("g")
                               .classed("most_upper_primitives", true)
                               .append("ellipse")
                               .classed("interactive_ellipse", true)
                               .attr("cx",0)
                               .attr("cy",0)
                               .style("fill", "none")
                               .style("pointer-events","visibleFill")
                               .on('mouseenter', () => this.MouseEvent('enter'))
                               .on('mousemove', () => this.MouseEvent('move'))
                               .on('mouseleave', () => this.MouseEvent('leave'));

         interactive.attr("rx", this.szx).attr("ry", this.szy);

         d3.select(interactive.node().parentNode).attr("transform", this.draw_g.attr("transform"));

         if (JSROOT.settings.Zooming && JSROOT.settings.ZoomWheel)
            interactive.on("wheel", () => this.MouseWheel());
      });
   }

   function drawGraphPolargram(divid, polargram /*, opt*/) {

      let painter = new TGraphPolargramPainter(polargram);

      painter.SetDivId(divid, -1); // just to get access to existing elements

      let main = painter.main_painter();

      if (main) {
         if (main.GetObject() === polargram) return main;
          console.error('Cannot superimpose TGraphPolargram with any other drawings');
          return null;
      }

      painter.SetDivId(divid, 4); // main object without need of frame
      painter.Redraw();
      return painter.DrawingReady();
   }

   // ==============================================================

   function TGraphPolarPainter(graph) {
      JSROOT.ObjectPainter.call(this, graph);
   }

   TGraphPolarPainter.prototype = Object.create(JSROOT.ObjectPainter.prototype);

   TGraphPolarPainter.prototype.Redraw = function() {
      this.DrawBins();
   }

   TGraphPolarPainter.prototype.DecodeOptions = function(opt) {

      let d = new JSROOT.DrawOptions(opt || "L");

      if (!this.options) this.options = {};

      JSROOT.extend(this.options, {
          mark: d.check("P"),
          err: d.check("E"),
          fill: d.check("F"),
          line: d.check("L"),
          curve: d.check("C")
      });

      this.OptionsStore(opt);
   }

   TGraphPolarPainter.prototype.DrawBins = function() {
      let graph = this.GetObject(),
          main = this.main_painter();

      if (!graph || !main || !main.$polargram) return;

      if (this.options.mark) this.createAttMarker({ attr: graph });
      if (this.options.err || this.options.line || this.options.curve) this.createAttLine({ attr: graph });
      if (this.options.fill) this.createAttFill({ attr: graph });

      this.CreateG();

      this.draw_g.attr("transform", main.draw_g.attr("transform"));

      let mpath = "", epath = "", lpath = "", bins = [];

      for (let n=0;n<graph.fNpoints;++n) {

         if (graph.fY[n] > main.scale_rmax) continue;

         if (this.options.err) {
            let pos1 = main.translate(graph.fX[n], graph.fY[n] - graph.fEY[n]),
                pos2 = main.translate(graph.fX[n], graph.fY[n] + graph.fEY[n]);
            epath += "M" + pos1.x + "," + pos1.y + "L" + pos2.x + "," + pos2.y;

            pos1 = main.translate(graph.fX[n] + graph.fEX[n], graph.fY[n]);
            pos2 = main.translate(graph.fX[n] - graph.fEX[n], graph.fY[n]);

            epath += "M" + pos1.x + "," + pos1.y + "A" + pos2.rx + "," + pos2.ry+ ",0,0,1," + pos2.x + "," + pos2.y;
         }

         let pos = main.translate(graph.fX[n], graph.fY[n]);

         if (this.options.mark) {
            mpath += this.markeratt.create(pos.x, pos.y);
         }

         if (this.options.line || this.options.fill) {
            lpath += (lpath ? "L" : "M") + pos.x + "," + pos.y;
         }

         if (this.options.curve) {
            pos.grx = pos.x;
            pos.gry = pos.y;
            bins.push(pos);
         }
      }

      if (this.options.fill && lpath)
         this.draw_g.append("svg:path")
             .attr("d",lpath + "Z")
             .style("stroke","none")
             .call(this.fillatt.func);

      if (this.options.line && lpath)
         this.draw_g.append("svg:path")
             .attr("d", lpath)
             .style("fill", "none")
             .call(this.lineatt.func);

      if (this.options.curve && bins.length)
         this.draw_g.append("svg:path")
                 .attr("d", jsrp.BuildSvgPath("bezier", bins).path)
                 .style("fill", "none")
                 .call(this.lineatt.func);

      if (epath)
         this.draw_g.append("svg:path")
             .attr("d",epath)
             .style("fill","none")
             .call(this.lineatt.func);

      if (mpath)
         this.draw_g.append("svg:path")
               .attr("d",mpath)
               .call(this.markeratt.func);

   }

   TGraphPolarPainter.prototype.CreatePolargram = function() {
      let polargram = JSROOT.Create("TGraphPolargram"),
          gr = this.GetObject();

      let rmin = gr.fY[0] || 0, rmax = rmin;
      for (let n=0;n<gr.fNpoints;++n) {
         rmin = Math.min(rmin, gr.fY[n] - gr.fEY[n]);
         rmax = Math.max(rmax, gr.fY[n] + gr.fEY[n]);
      }

      polargram.fRwrmin = rmin - (rmax-rmin)*0.1;
      polargram.fRwrmax = rmax + (rmax-rmin)*0.1;

      return polargram;
   }

   TGraphPolarPainter.prototype.ExtractTooltip = function(pnt) {
      if (!pnt) return null;

      let graph = this.GetObject(),
          main = this.main_painter(),
          best_dist2 = 1e10, bestindx = -1, bestpos = null;

      for (let n=0;n<graph.fNpoints;++n) {
         let pos = main.translate(graph.fX[n], graph.fY[n]);

         let dist2 = (pos.x-pnt.x)*(pos.x-pnt.x) + (pos.y-pnt.y)*(pos.y-pnt.y);
         if (dist2<best_dist2) { best_dist2 = dist2; bestindx = n; bestpos = pos; }
      }

      let match_distance = 5;
      if (this.markeratt && this.markeratt.used) match_distance = this.markeratt.GetFullSize();

      if (Math.sqrt(best_dist2) > match_distance) return null;

      let res = { name: this.GetObject().fName, title: this.GetObject().fTitle,
                  x: bestpos.x, y: bestpos.y,
                  color1: this.markeratt && this.markeratt.used ? this.markeratt.color : this.lineatt.color,
                  exact: Math.sqrt(best_dist2) < 4,
                  lines: [ this.GetTipName() ],
                  binindx: bestindx,
                  menu_dist: match_distance,
                  radius: match_distance
                };

      res.lines.push("r = " + main.AxisAsText("r", graph.fY[bestindx]));
      res.lines.push("phi = " + main.AxisAsText("phi",graph.fX[bestindx]));

      if (graph.fEY && graph.fEY[bestindx])
         res.lines.push("error r = " + main.AxisAsText("r", graph.fEY[bestindx]));

      if (graph.fEX && graph.fEX[bestindx])
         res.lines.push("error phi = " + main.AxisAsText("phi", graph.fEX[bestindx]));

      return res;
   }

   TGraphPolarPainter.prototype.ShowTooltip = function(hint) {

      if (!this.draw_g) return;

      let ttcircle = this.draw_g.select(".tooltip_bin");

      if (!hint) {
         ttcircle.remove();
         return;
      }

      if (ttcircle.empty())
         ttcircle = this.draw_g.append("svg:ellipse")
                             .attr("class","tooltip_bin")
                             .style("pointer-events","none");

      hint.changed = ttcircle.property("current_bin") !== hint.binindx;

      if (hint.changed)
         ttcircle.attr("cx", hint.x)
               .attr("cy", hint.y)
               .attr("rx", Math.round(hint.radius))
               .attr("ry", Math.round(hint.radius))
               .style("fill", "none")
               .style("stroke", hint.color1)
               .property("current_bin", hint.binindx);
   }

   TGraphPolarPainter.prototype.ProcessTooltip = function(pnt) {
      let hint = this.ExtractTooltip(pnt);
      if (!pnt || !pnt.disabled) this.ShowTooltip(hint);
      return hint;
   }

   TGraphPolarPainter.prototype.PerformDrawing = function(divid) {
      this.SetDivId(divid);
      this.DrawBins();
      this.DrawingReady();
      return this; // will be value resolved by Promise and getting painter
   }

   function drawGraphPolar(divid, graph, opt) {

      let painter = new TGraphPolarPainter(graph);

      painter.DecodeOptions(opt);

      painter.SetDivId(divid, -1); // just to get access to existing elements

      let main = painter.main_painter();
      if (main) {
         if (!main.$polargram) {
            console.error('Cannot superimpose TGraphPolar with plain histograms');
            return null;
         }
         painter.PerformDrawing(divid);

         return painter;
      }

      if (!graph.fPolargram) graph.fPolargram = painter.CreatePolargram();

      return JSROOT.draw(divid, graph.fPolargram, "").then(painter.PerformDrawing.bind(painter, divid));
   }

   // ==============================================================

   function TSplinePainter(spline) {
      JSROOT.ObjectPainter.call(this, spline);
      this.bins = null;
   }

   TSplinePainter.prototype = Object.create(JSROOT.ObjectPainter.prototype);

   TSplinePainter.prototype.UpdateObject = function(obj, opt) {
      let spline = this.GetObject();

      if (spline._typename != obj._typename) return false;

      if (spline !== obj) JSROOT.extend(spline, obj);

      if (opt !== undefined) this.DecodeOptions(opt);

      return true;
   }

   TSplinePainter.prototype.Eval = function(knot, x) {
      let dx = x - knot.fX;

      if (knot._typename == "TSplinePoly3")
         return knot.fY + dx*(knot.fB + dx*(knot.fC + dx*knot.fD));

      if (knot._typename == "TSplinePoly5")
         return knot.fY + dx*(knot.fB + dx*(knot.fC + dx*(knot.fD + dx*(knot.fE + dx*knot.fF))));

      return knot.fY + dx;
   }

   TSplinePainter.prototype.FindX = function(x) {
      let spline = this.GetObject(),
          klow = 0, khig = spline.fNp - 1;

      if (x <= spline.fXmin) return 0;
      if (x >= spline.fXmax) return khig;

      if(spline.fKstep) {
         // Equidistant knots, use histogramming
         klow = Math.round((x - spline.fXmin)/spline.fDelta);
         // Correction for rounding errors
         if (x < spline.fPoly[klow].fX) {
            klow = Math.max(klow-1,0);
         } else if (klow < khig) {
            if (x > spline.fPoly[klow+1].fX) ++klow;
         }
      } else {
         // Non equidistant knots, binary search
         while(khig-klow>1) {
            let khalf = Math.round((klow+khig)/2);
            if(x > spline.fPoly[khalf].fX) klow = khalf;
                                      else khig = khalf;
         }
      }
      return klow;
   }

   TSplinePainter.prototype.CreateDummyHisto = function() {

      let xmin = 0, xmax = 1, ymin = 0, ymax = 1,
          spline = this.GetObject();

      if (spline && spline.fPoly) {

         xmin = xmax = spline.fPoly[0].fX;
         ymin = ymax = spline.fPoly[0].fY;

         spline.fPoly.forEach(knot => {
            xmin = Math.min(knot.fX, xmin);
            xmax = Math.max(knot.fX, xmax);
            ymin = Math.min(knot.fY, ymin);
            ymax = Math.max(knot.fY, ymax);
         });

         if (ymax > 0.0) ymax *= 1.05;
         if (ymin < 0.0) ymin *= 1.05;
      }

      let histo = JSROOT.Create("TH1I");

      histo.fName = spline.fName + "_hist";
      histo.fTitle = spline.fTitle;

      histo.fXaxis.fXmin = xmin;
      histo.fXaxis.fXmax = xmax;
      histo.fYaxis.fXmin = ymin;
      histo.fYaxis.fXmax = ymax;

      return histo;
   }

   TSplinePainter.prototype.ProcessTooltip = function(pnt) {

      let cleanup = false,
          spline = this.GetObject(),
          main = this.frame_painter(),
          xx, yy, knot = null, indx = 0;

      if ((pnt === null) || !spline || !main) {
         cleanup = true;
      } else {
         xx = main.RevertX(pnt.x);
         indx = this.FindX(xx);
         knot = spline.fPoly[indx];
         yy = this.Eval(knot, xx);

         if ((indx < spline.fN-1) && (Math.abs(spline.fPoly[indx+1].fX-xx) < Math.abs(xx-knot.fX))) knot = spline.fPoly[++indx];

         if (Math.abs(main.grx(knot.fX) - pnt.x) < 0.5*this.knot_size) {
            xx = knot.fX; yy = knot.fY;
         } else {
            knot = null;
            if ((xx < spline.fXmin) || (xx > spline.fXmax)) cleanup = true;
         }
      }

      if (cleanup) {
         if (this.draw_g !== null)
            this.draw_g.select(".tooltip_bin").remove();
         return null;
      }

      let gbin = this.draw_g.select(".tooltip_bin"),
          radius = this.lineatt.width + 3;

      if (gbin.empty())
         gbin = this.draw_g.append("svg:circle")
                           .attr("class", "tooltip_bin")
                           .style("pointer-events","none")
                           .attr("r", radius)
                           .style("fill", "none")
                           .call(this.lineatt.func);

      let res = { name: this.GetObject().fName,
                  title: this.GetObject().fTitle,
                  x: main.grx(xx),
                  y: main.gry(yy),
                  color1: this.lineatt.color,
                  lines: [],
                  exact: (knot !== null) || (Math.abs(main.gry(yy) - pnt.y) < radius) };

      res.changed = gbin.property("current_xx") !== xx;
      res.menu = res.exact;
      res.menu_dist = Math.sqrt((res.x-pnt.x)*(res.x-pnt.x) + (res.y-pnt.y)*(res.y-pnt.y));

      if (res.changed)
         gbin.attr("cx", Math.round(res.x))
             .attr("cy", Math.round(res.y))
             .property("current_xx", xx);

      let name = this.GetTipName();
      if (name.length > 0) res.lines.push(name);
      res.lines.push("x = " + main.AxisAsText("x", xx))
      res.lines.push("y = " + main.AxisAsText("y", yy));
      if (knot !== null) {
         res.lines.push("knot = " + indx);
         res.lines.push("B = " + JSROOT.FFormat(knot.fB, JSROOT.gStyle.fStatFormat));
         res.lines.push("C = " + JSROOT.FFormat(knot.fC, JSROOT.gStyle.fStatFormat));
         res.lines.push("D = " + JSROOT.FFormat(knot.fD, JSROOT.gStyle.fStatFormat));
         if ((knot.fE!==undefined) && (knot.fF!==undefined)) {
            res.lines.push("E = " + JSROOT.FFormat(knot.fE, JSROOT.gStyle.fStatFormat));
            res.lines.push("F = " + JSROOT.FFormat(knot.fF, JSROOT.gStyle.fStatFormat));
         }
      }

      return res;
   }

   TSplinePainter.prototype.Redraw = function() {

      let w = this.frame_width(),
          h = this.frame_height(),
          spline = this.GetObject(),
          pmain = this.frame_painter();

      this.CreateG(true);

      this.knot_size = 5; // used in tooltip handling

      this.createAttLine({ attr: spline });

      if (this.options.Line || this.options.Curve) {

         let npx = Math.max(10, spline.fNpx);

         let xmin = Math.max(pmain.scale_xmin, spline.fXmin),
             xmax = Math.min(pmain.scale_xmax, spline.fXmax),
             indx = this.FindX(xmin),
             bins = []; // index of current knot

         if (pmain.logx) {
            xmin = Math.log(xmin);
            xmax = Math.log(xmax);
         }

         for (let n=0;n<npx;++n) {
            let xx = xmin + (xmax-xmin)/npx*(n-1);
            if (pmain.logx) xx = Math.exp(xx);

            while ((indx < spline.fNp-1) && (xx > spline.fPoly[indx+1].fX)) ++indx;

            let yy = this.Eval(spline.fPoly[indx], xx);

            bins.push({ x: xx, y: yy, grx: pmain.grx(xx), gry: pmain.gry(yy) });
         }

         let h0 = h;  // use maximal frame height for filling
         if ((pmain.hmin!==undefined) && (pmain.hmin>=0)) {
            h0 = Math.round(pmain.gry(0));
            if ((h0 > h) || (h0 < 0)) h0 = h;
         }

         let path = jsrp.BuildSvgPath("bezier", bins, h0, 2);

         this.draw_g.append("svg:path")
             .attr("class", "line")
             .attr("d", path.path)
             .style("fill", "none")
             .call(this.lineatt.func);
      }

      if (this.options.Mark) {

         // for tooltips use markers only if nodes where not created
         let path = "";

         this.createAttMarker({ attr: spline })

         this.markeratt.reset_pos();

         this.knot_size = this.markeratt.GetFullSize();

         for (let n=0; n<spline.fPoly.length; n++) {
            let knot = spline.fPoly[n],
                grx = pmain.grx(knot.fX);
            if ((grx > -this.knot_size) && (grx < w + this.knot_size)) {
               let gry = pmain.gry(knot.fY);
               if ((gry > -this.knot_size) && (gry < h + this.knot_size)) {
                  path += this.markeratt.create(grx, gry);
               }
            }
         }

         if (path)
            this.draw_g.append("svg:path")
                       .attr("d", path)
                       .call(this.markeratt.func);
      }

   }

   TSplinePainter.prototype.CanZoomIn = function(axis/*,min,max*/) {
      if (axis!=="x") return false;

      let spline = this.GetObject();
      if (!spline) return false;

      // if function calculated, one always could zoom inside
      return true;
   }

   TSplinePainter.prototype.DecodeOptions = function(opt) {
      let d = new JSROOT.DrawOptions(opt);

      if (!this.options) this.options = {};

      JSROOT.extend(this.options, {
         Same: d.check('SAME'),
         Line: d.check('L'),
         Curve: d.check('C'),
         Mark: d.check('P')
      });

      this.OptionsStore(opt);
   }

   TSplinePainter.prototype.FirstDraw = function() {
      this.SetDivId(this.divid);
      this.Redraw();
      return this.DrawingReady();
   }

   jsrp.drawSpline = function(divid, spline, opt) {
      let painter = new TSplinePainter(spline);

      painter.SetDivId(divid, -1);
      painter.DecodeOptions(opt);

      if (!painter.main_painter()) {
         if (painter.options.Same) {
            console.warn('TSpline painter requires histogram to be drawn');
            return null;
         }
         let histo = painter.CreateDummyHisto();
         return JSROOT.draw(divid, histo, "AXIS").then(painter.FirstDraw.bind(painter));
      }

      return painter.FirstDraw();
   }

   // =============================================================

   function TGraphTimePainter(gr) {
      JSROOT.ObjectPainter.call(this, gr);
   }

   TGraphTimePainter.prototype = Object.create(JSROOT.ObjectPainter.prototype);

   TGraphTimePainter.prototype.Redraw = function() {
      if (this.step === undefined) this.StartDrawing(false);
   }

   TGraphTimePainter.prototype.DecodeOptions = function(opt) {

      let d = new JSROOT.DrawOptions(opt || "REPEAT");

      if (!this.options) this.options = {};

      JSROOT.extend(this.options, {
          once: d.check("ONCE"),
          repeat: d.check("REPEAT"),
          first: d.check("FIRST")
      });

      this.OptionsStore(opt);
   }

   TGraphTimePainter.prototype.DrawPrimitives = function(indx, callback, ppainter) {

      if (indx===0)
         this._doing_primitives = true;

      let lst = this.GetObject().fSteps.arr[this.step];

      if (ppainter) ppainter.$grtimeid = this.selfid; // indicator that painter created by ourself

      if (!lst || (indx >= lst.arr.length)) {
         delete this._doing_primitives;
         return JSROOT.CallBack(callback);
      }

      // handle use to invoke callback only when necessary
      let handle_func = this.DrawPrimitives.bind(this, indx+1, callback);

      JSROOT.draw(this.divid, lst.arr[indx], lst.opt[indx]).then(handle_func);
   }

   TGraphTimePainter.prototype.Selector = function(p) {
      return p && (p.$grtimeid === this.selfid);
   }

   TGraphTimePainter.prototype.ContineDrawing = function() {
      if (!this.options) return;

      let gr = this.GetObject();

      if (!this.ready_called) {
         this.ready_called = true;
         this.DrawingReady(); // do it already here, animation will continue in background
      }

      if (this.options.first) {
         // draw only single frame, cancel all others
         delete this.step;
         return;
      }

      if (this.wait_animation_frame) {
         delete this.wait_animation_frame;

         // clear pad
         let pp = this.pad_painter();
         if (!pp) {
            // most probably, pad is cleared
            delete this.step;
            return;
         }

         // clear primitives produced by the TGraphTime
         pp.CleanPrimitives(this.Selector.bind(this));

         // draw ptrimitives again
         this.DrawPrimitives(0, this.ContineDrawing.bind(this));
      } else if (this.running_timeout) {
         clearTimeout(this.running_timeout);
         delete this.running_timeout;

         this.wait_animation_frame = true;
         // use animation frame to disable update in inactive form
         requestAnimationFrame(this.ContineDrawing.bind(this));
      } else {

         let sleeptime = gr.fSleepTime;
         if (!sleeptime || (sleeptime<100)) sleeptime = 10;

         if (++this.step > gr.fSteps.arr.length) {
            if (this.options.repeat) {
               this.step = 0; // start again
               sleeptime = Math.max(5000, 5*sleeptime); // increase sleep time
            } else {
               delete this.step;    // clear indicator that animation running
               return;
            }
         }

         this.running_timeout = setTimeout(this.ContineDrawing.bind(this), sleeptime);
      }
   }

   TGraphTimePainter.prototype.StartDrawing = function(once_again) {
      if (once_again!==false) this.SetDivId(this.divid);

      this.step = 0;

      this.DrawPrimitives(0, this.ContineDrawing.bind(this));

      return this; // used in promise
   }

   let drawGraphTime = (divid, gr, opt) => {

      let painter = new TGraphTimePainter(gr);
      painter.SetDivId(divid,-1);

      if (painter.main_painter()) {
         console.error('Cannot draw graph time on top of other histograms');
         return null;
      }

      if (!gr.fFrame) {
         console.error('Frame histogram not exists');
         return null;
      }

      painter.DecodeOptions(opt);

      if (!gr.fFrame.fTitle && gr.fTitle) gr.fFrame.fTitle = gr.fTitle;

      painter.selfid = "grtime" + JSROOT._.id_counter++; // use to identify primitives which should be clean

      JSROOT.draw(divid, gr.fFrame, "AXIS").then(painter.StartDrawing.bind(painter));

      return painter; // first drawing down via tmout, therefore return painter
   }

   // =============================================================

   function TEfficiencyPainter(eff) {
      JSROOT.ObjectPainter.call(this, eff);
      this.fBoundary = 'Normal';
   }

   TEfficiencyPainter.prototype = Object.create(JSROOT.ObjectPainter.prototype);

   TEfficiencyPainter.prototype.GetEfficiency = function(bin) {
      let obj = this.GetObject(),
          total = obj.fTotalHistogram.getBinContent(bin),
          passed = obj.fPassedHistogram.getBinContent(bin);

      return total ? passed/total : 0;
   }

/**  implementing of  beta_quantile requires huge number of functions in JSRoot.math.js

   TEfficiencyPainter.prototype.ClopperPearson = function(total,passed,level,bUpper) {
      let alpha = (1.0 - level) / 2;
      if(bUpper)
         return ((passed == total) ? 1.0 : JSROOT.Math.beta_quantile(1 - alpha,passed + 1,total-passed));
      else
         return ((passed == 0) ? 0.0 : JSROOT.Math.beta_quantile(alpha,passed,total-passed+1.0));
   }
*/

   TEfficiencyPainter.prototype.Normal = function(total,passed,level,bUpper) {
      if (total == 0) return bUpper ? 1 : 0;

      let alpha = (1.0 - level)/2,
          average = passed / total,
          sigma = Math.sqrt(average * (1 - average) / total),
         delta = JSROOT.Math.normal_quantile(1 - alpha,sigma);

      if(bUpper)
         return ((average + delta) > 1) ? 1.0 : (average + delta);

      return ((average - delta) < 0) ? 0.0 : (average - delta);
   }

   TEfficiencyPainter.prototype.GetEfficiencyErrorLow = function(bin) {
      let obj = this.GetObject(),
          total = obj.fTotalHistogram.getBinContent(bin),
          passed = obj.fPassedHistogram.getBinContent(bin),
          eff = this.GetEfficiency(bin);

      return eff - this[this.fBoundary](total,passed, obj.fConfLevel, false);
   }

   TEfficiencyPainter.prototype.GetEfficiencyErrorUp = function(bin) {
      let obj = this.GetObject(),
          total = obj.fTotalHistogram.getBinContent(bin),
          passed = obj.fPassedHistogram.getBinContent(bin),
          eff = this.GetEfficiency(bin);

      return this[this.fBoundary]( total, passed, obj.fConfLevel, true) - eff;
   }

   TEfficiencyPainter.prototype.CreateGraph = function() {
      let gr = JSROOT.Create('TGraphAsymmErrors');
      gr.fName = "eff_graph";
      return gr;
   }

   TEfficiencyPainter.prototype.FillGraph = function(gr, opt) {
      let eff = this.GetObject(),
          npoints = eff.fTotalHistogram.fXaxis.fNbins,
          option = opt.toLowerCase(),
          plot0Bins = false, j = 0;
      if (option.indexOf("e0")>=0) plot0Bins = true;
      for (let n=0;n<npoints;++n) {
         if (!plot0Bins && eff.fTotalHistogram.getBinContent(n+1) === 0) continue;
         gr.fX[j] = eff.fTotalHistogram.fXaxis.GetBinCenter(n+1);
         gr.fY[j] = this.GetEfficiency(n+1);
         gr.fEXlow[j] = eff.fTotalHistogram.fXaxis.GetBinCenter(n+1) - eff.fTotalHistogram.fXaxis.GetBinLowEdge(n+1);
         gr.fEXhigh[j] = eff.fTotalHistogram.fXaxis.GetBinLowEdge(n+2) - eff.fTotalHistogram.fXaxis.GetBinCenter(n+1);
         gr.fEYlow[j] = this.GetEfficiencyErrorLow(n+1);
         gr.fEYhigh[j] = this.GetEfficiencyErrorUp(n+1);
         ++j;
      }
      gr.fNpoints = j;
   }

   let drawEfficiency = (divid, eff, opt) => {

      if (!eff || !eff.fTotalHistogram || (eff.fTotalHistogram._typename.indexOf("TH1")!=0)) return null;

      let painter = new TEfficiencyPainter(eff);
      painter.options = opt;

      let gr = painter.CreateGraph();
      painter.FillGraph(gr, opt);

      return JSROOT.draw(divid, gr, opt)
                   .then(() => {
                       painter.SetDivId(divid);
                       painter.DrawingReady();
                       return painter;
                    });
   }

   // =============================================================

   function TMultiGraphPainter(mgraph) {
      JSROOT.ObjectPainter.call(this, mgraph);
      this.firstpainter = null;
      this.autorange = false;
      this.painters = []; // keep painters to be able update objects
   }

   TMultiGraphPainter.prototype = Object.create(JSROOT.ObjectPainter.prototype);

   TMultiGraphPainter.prototype.Cleanup = function() {
      this.painters = [];
      JSROOT.ObjectPainter.prototype.Cleanup.call(this);
   }

   TMultiGraphPainter.prototype.UpdateObject = function(obj) {
      if (!this.MatchObjectType(obj)) return false;

      let mgraph = this.GetObject(),
          graphs = obj.fGraphs;

      mgraph.fTitle = obj.fTitle;

      let isany = false;
      if (this.firstpainter) {
         let histo = obj.fHistogram;
         if (this.autorange && !histo)
            histo = this.ScanGraphsRange(graphs);

         if (this.firstpainter.UpdateObject(histo)) isany = true;
      }

      for (let i = 0; i < graphs.arr.length; ++i) {
         if (i<this.painters.length)
            if (this.painters[i].UpdateObject(graphs.arr[i])) isany = true;
      }

      if (obj.fFunctions)
         for (let i = 0; i < obj.fFunctions.arr.length; ++i) {
            let func = obj.fFunctions.arr[i];
            if (!func || !func._typename || !func.fName) continue;
            let funcpainter = this.FindPainterFor(null, func.fName, func._typename);
            if (funcpainter) funcpainter.UpdateObject(func);
         }

      return isany;
   }

   TMultiGraphPainter.prototype.ComputeGraphRange = function(res, gr) {
      // Compute the x/y range of the points in this graph
      if (gr.fNpoints == 0) return;
      if (res.first) {
         res.xmin = res.xmax = gr.fX[0];
         res.ymin = res.ymax = gr.fY[0];
         res.first = false;
      }
      for (let i=0; i < gr.fNpoints; ++i) {
         res.xmin = Math.min(res.xmin, gr.fX[i]);
         res.xmax = Math.max(res.xmax, gr.fX[i]);
         res.ymin = Math.min(res.ymin, gr.fY[i]);
         res.ymax = Math.max(res.ymax, gr.fY[i]);
      }
      return res;
   }

   TMultiGraphPainter.prototype.padtoX = function(pad, x) {
      // Convert x from pad to X.
      if (pad.fLogx && (x < 50))
         return Math.exp(2.302585092994 * x);
      return x;
   }

   TMultiGraphPainter.prototype.ScanGraphsRange = function(graphs, histo, pad) {
      let mgraph = this.GetObject(),
          maximum, minimum, dx, dy, uxmin = 0, uxmax = 0, logx = false, logy = false,
          time_display = false, time_format = "",
          rw = {  xmin: 0, xmax: 0, ymin: 0, ymax: 0, first: true };

      if (pad) {
         logx = pad.fLogx;
         logy = pad.fLogy;
         rw.xmin = pad.fUxmin;
         rw.xmax = pad.fUxmax;
         rw.ymin = pad.fUymin;
         rw.ymax = pad.fUymax;
         rw.first = false;
      }
      if (histo) {
         minimum = histo.fYaxis.fXmin;
         maximum = histo.fYaxis.fXmax;
         if (pad) {
            uxmin = this.padtoX(pad, rw.xmin);
            uxmax = this.padtoX(pad, rw.xmax);
         }
      } else {
         this.autorange = true;

         for (let i = 0; i < graphs.arr.length; ++i)
            this.ComputeGraphRange(rw, graphs.arr[i]);

         if (graphs.arr[0] && graphs.arr[0].fHistogram && graphs.arr[0].fHistogram.fXaxis.fTimeDisplay) {
            time_display = true;
            time_format = graphs.arr[0].fHistogram.fXaxis.fTimeFormat;
         }

         if (rw.xmin == rw.xmax) rw.xmax += 1.;
         if (rw.ymin == rw.ymax) rw.ymax += 1.;
         dx = 0.05 * (rw.xmax - rw.xmin);
         dy = 0.05 * (rw.ymax - rw.ymin);
         uxmin = rw.xmin - dx;
         uxmax = rw.xmax + dx;
         if (logy) {
            if (rw.ymin <= 0) rw.ymin = 0.001 * rw.ymax;
            minimum = rw.ymin / (1 + 0.5 * Math.log10(rw.ymax / rw.ymin));
            maximum = rw.ymax * (1 + 0.2 * Math.log10(rw.ymax / rw.ymin));
         } else {
            minimum = rw.ymin - dy;
            maximum = rw.ymax + dy;
         }
         if (minimum < 0 && rw.ymin >= 0)
            minimum = 0;
         if (maximum > 0 && rw.ymax <= 0)
            maximum = 0;
      }

      if (uxmin < 0 && rw.xmin >= 0)
         uxmin = logx ? 0.9 * rw.xmin : 0;
      if (uxmax > 0 && rw.xmax <= 0)
         uxmax = logx? 1.1 * rw.xmax : 0;

      if (mgraph.fMinimum != -1111)
         rw.ymin = minimum = mgraph.fMinimum;
      if (mgraph.fMaximum != -1111)
         rw.ymax = maximum = mgraph.fMaximum;

      if (minimum < 0 && rw.ymin >= 0 && logy) minimum = 0.9 * rw.ymin;
      if (maximum > 0 && rw.ymax <= 0 && logy) maximum = 1.1 * rw.ymax;
      if (minimum <= 0 && logy) minimum = 0.001 * maximum;
      if (!logy && minimum > 0 && minimum < 0.05*maximum) minimum = 0;
      if (uxmin <= 0 && logx)
         uxmin = (uxmax > 1000) ? 1 : 0.001 * uxmax;

      // Create a temporary histogram to draw the axis (if necessary)
      if (!histo) {
         histo = JSROOT.Create("TH1I");
         histo.fTitle = mgraph.fTitle;
         histo.fXaxis.fXmin = uxmin;
         histo.fXaxis.fXmax = uxmax;
         histo.fXaxis.fTimeDisplay = time_display;
         if (time_display) histo.fXaxis.fTimeFormat = time_format;
     }

      histo.fYaxis.fXmin = minimum;
      histo.fYaxis.fXmax = maximum;

      return histo;
   }

   TMultiGraphPainter.prototype.DrawAxis = function(callback) {
      // draw special histogram

      let mgraph = this.GetObject(),
          histo = this.ScanGraphsRange(mgraph.fGraphs, mgraph.fHistogram, this.root_pad());

      // histogram painter will be first in the pad, will define axis and
      // interactive actions
      JSROOT.draw(this.divid, histo, "AXIS").then(callback);
   }

   TMultiGraphPainter.prototype.DrawNextFunction = function(indx, callback) {
      // method draws next function from the functions list

      let mgraph = this.GetObject();

      if (!mgraph.fFunctions || (indx >= mgraph.fFunctions.arr.length))
         return JSROOT.CallBack(callback);

      JSROOT.draw(this.divid, mgraph.fFunctions.arr[indx], mgraph.fFunctions.opt[indx])
            .then(this.DrawNextFunction.bind(this, indx+1, callback));
   }

   TMultiGraphPainter.prototype.DrawNextGraph = function(indx, opt, subp, used_timeout) {
      if (subp) this.painters.push(subp);

      let graphs = this.GetObject().fGraphs;

      // at the end of graphs drawing draw functions (if any)
      if (indx >= graphs.arr.length) {
         this._pfc = this._plc = this._pmc = false; // disable auto coloring at the end
         return this.DrawNextFunction(0, this.DrawingReady.bind(this));
      }

      // when too many graphs are drawn, avoid deep stack with timeout
      if ((indx % 500 === 499) && !used_timeout)
         return setTimeout(this.DrawNextGraph.bind(this,indx,opt,null,true),0);

      // if there is auto colors assignment, try to provide it
      if (this._pfc || this._plc || this._pmc) {
         if (!this.palette && jsrp.GetColorPalette)
            this.palette = jsrp.GetColorPalette();
         if (this.palette) {
            let color = this.palette.calcColor(indx, graphs.arr.length+1);
            let icolor = this.add_color(color);

            if (this._pfc) graphs.arr[indx].fFillColor = icolor;
            if (this._plc) graphs.arr[indx].fLineColor = icolor;
            if (this._pmc) graphs.arr[indx].fMarkerColor = icolor;
         }
      }

      JSROOT.draw(this.divid, graphs.arr[indx], graphs.opt[indx] || opt).then(this.DrawNextGraph.bind(this, indx+1, opt));
   }

   jsrp.drawMultiGraph = function(divid, mgraph, opt) {

      let painter = new TMultiGraphPainter(mgraph);

      painter.SetDivId(divid, -1); // it may be no element to set divid

      let d = new JSROOT.DrawOptions(opt);
      d.check("3D"); d.check("FB"); // no 3D supported, FB not clear

      painter._pfc = d.check("PFC");
      painter._plc = d.check("PLC");
      painter._pmc = d.check("PMC");

      if (d.check("A") || !painter.main_painter()) {
         painter.DrawAxis(function(hpainter) {
            painter.firstpainter = hpainter;
            painter.SetDivId(divid);
            painter.DrawNextGraph(0, d.remain());
         });
      } else {
         painter.SetDivId(divid);
         painter.DrawNextGraph(0, d.remain());
      }

      return painter;
   }

   // =========================================================================================

   function drawWebPainting(divid, obj, opt) {

      let painter = new JSROOT.ObjectPainter(obj, opt);

      painter.UpdateObject = function(obj) {
         if (!this.MatchObjectType(obj)) return false;
         this.draw_object = obj;
         return true;
      }

      painter.ReadAttr = function(str, names) {
         let lastp = 0, obj = { _typename: "any" };
         for (let k=0;k<names.length;++k) {
            let p = str.indexOf(":", lastp+1);
            obj[names[k]] = parseInt(str.substr(lastp+1, (p>lastp) ? p-lastp-1 : undefined));
            lastp = p;
         }
         return obj;
      }

      painter.Redraw = function() {

         let obj = this.GetObject(), func = this.AxisToSvgFunc();

         if (!obj || !obj.fOper || !func) return;

         let indx = 0, attr = {}, lastpath = null, lastkind = "none", d = "",
             oper, k, npoints, n, arr = obj.fOper.split(";");

         function check_attributes(painter, kind) {
            if (kind == lastkind) return;

            if (lastpath) {
               lastpath.attr("d", d); // flush previous
               d = ""; lastpath = null; lastkind = "none";
            }

            if (!kind) return;

            lastkind = kind;
            lastpath = painter.draw_g.append("svg:path");
            switch (kind) {
               case "f": lastpath.call(painter.fillatt.func).attr('stroke', 'none'); break;
               case "l": lastpath.call(painter.lineatt.func).attr('fill', 'none'); break;
               case "m": lastpath.call(painter.markeratt.func); break;
            }
         }

         this.CreateG();

         for (k=0;k<arr.length;++k) {
            oper = arr[k][0];
            switch (oper) {
               case "z":
                  this.createAttLine({ attr: this.ReadAttr(arr[k], ["fLineColor", "fLineStyle", "fLineWidth"]), force: true });
                  check_attributes();
                  continue;
               case "y":
                  this.createAttFill({ attr: this.ReadAttr(arr[k], ["fFillColor", "fFillStyle"]), force: true });
                  check_attributes();
                  continue;
               case "x":
                  this.createAttMarker({ attr: this.ReadAttr(arr[k], ["fMarkerColor", "fMarkerStyle", "fMarkerSize"]), force: true })
                  check_attributes();
                  continue;
               case "o":
                  attr = this.ReadAttr(arr[k], ["fTextColor", "fTextFont", "fTextSize", "fTextAlign", "fTextAngle" ]);
                  if (attr.fTextSize < 0) attr.fTextSize *= -0.001;
                  check_attributes();
                  continue;
               case "r":
               case "b": {

                  check_attributes(this, (oper == "b") ? "f" : "l");

                  let x1 = func.x(obj.fBuf[indx++]),
                      y1 = func.y(obj.fBuf[indx++]),
                      x2 = func.x(obj.fBuf[indx++]),
                      y2 = func.y(obj.fBuf[indx++]);

                  d += "M"+x1+","+y1+"h"+(x2-x1)+"v"+(y2-y1)+"h"+(x1-x2)+"z";

                  continue;
               }
               case "l":
               case "f": {

                  check_attributes(this, oper);

                  npoints = parseInt(arr[k].substr(1));

                  for (n=0;n<npoints;++n)
                     d += ((n>0) ? "L" : "M") +
                           func.x(obj.fBuf[indx++]) + "," + func.y(obj.fBuf[indx++]);

                  if (oper == "f") d+="Z";

                  continue;
               }

               case "m": {

                  check_attributes(this, oper);

                  npoints = parseInt(arr[k].substr(1));

                  this.markeratt.reset_pos();
                  for (n=0;n<npoints;++n)
                     d += this.markeratt.create(func.x(obj.fBuf[indx++]), func.y(obj.fBuf[indx++]));

                  continue;
               }

               case "h":
               case "t": {
                  if (attr.fTextSize) {

                     check_attributes();

                     let height = (attr.fTextSize > 1) ? attr.fTextSize : this.pad_height() * attr.fTextSize;

                     let group = this.draw_g.append("svg:g");

                     this.StartTextDrawing(attr.fTextFont, height, group);

                     let angle = attr.fTextAngle;
                     if (angle >= 360) angle -= Math.floor(angle/360) * 360;

                     let txt = arr[k].substr(1);

                     if (oper == "h") {
                        let res = "";
                        for (n=0;n<txt.length;n+=2)
                           res += String.fromCharCode(parseInt(txt.substr(n,2), 16));
                        txt = res;
                     }

                     // todo - correct support of angle
                     this.DrawText({ align: attr.fTextAlign,
                                     x: func.x(obj.fBuf[indx++]),
                                     y: func.y(obj.fBuf[indx++]),
                                     rotate: -angle,
                                     text: txt,
                                     color: jsrp.root_colors[attr.fTextColor], latex: 0, draw_g: group });

                     this.FinishTextDrawing(group);
                  }
                  continue;
               }

               default:
                  console.log('unsupported operation ' + oper);
            }
         }

         check_attributes();
      }

      painter.SetDivId(divid);

      painter.Redraw();

      return painter.DrawingReady();
   }


   // ===================================================================================

   /**
    * @summary Painter for TASImage object.
    *
    * @class
    * @memberof JSROOT
    * @extends JSROOT.ObjectPainter
    * @param {object} obj - TASImage object to draw
    * @param {string} opt - string draw options
    * @private
    */

   function TASImagePainter(obj, opt) {
      JSROOT.ObjectPainter.call(this, obj, opt);
      this.wheel_zoomy = true;
   }

   TASImagePainter.prototype = Object.create(JSROOT.ObjectPainter.prototype);

   TASImagePainter.prototype.DecodeOptions = function(opt) {
      this.options = { Zscale: false };

      if (opt && (opt.indexOf("z") >=0)) this.options.Zscale = true;
   }

   TASImagePainter.prototype.CreateRGBA = function(nlevels) {
      let obj = this.GetObject();

      if (!obj || !obj.fPalette) return null;

      let rgba = new Array((nlevels+1) * 4), indx = 1, pal = obj.fPalette; // precaclucated colors

      for(let lvl=0;lvl<=nlevels;++lvl) {
         let l = 1.*lvl/nlevels;
         while ((pal.fPoints[indx] < l) && (indx < pal.fPoints.length-1)) indx++;

         let r1 = (pal.fPoints[indx] - l) / (pal.fPoints[indx] - pal.fPoints[indx-1]);
         let r2 = (l - pal.fPoints[indx-1]) / (pal.fPoints[indx] - pal.fPoints[indx-1]);

         rgba[lvl*4]   = Math.min(255, Math.round((pal.fColorRed[indx-1] * r1 + pal.fColorRed[indx] * r2) / 256));
         rgba[lvl*4+1] = Math.min(255, Math.round((pal.fColorGreen[indx-1] * r1 + pal.fColorGreen[indx] * r2) / 256));
         rgba[lvl*4+2] = Math.min(255, Math.round((pal.fColorBlue[indx-1] * r1 + pal.fColorBlue[indx] * r2) / 256));
         rgba[lvl*4+3] = Math.min(255, Math.round((pal.fColorAlpha[indx-1] * r1 + pal.fColorAlpha[indx] * r2) / 256));
      }

      return rgba;
   }

   TASImagePainter.prototype.getContourColor = function(zval) {
      if (!this.fContour || !this.rgba) return "white";
      let indx = Math.round((zval - this.fContour[0]) / (this.fContour[this.fContour.length-1] - this.fContour[0]) * (this.rgba.length-4)/4) * 4;
      return "rgba(" + this.rgba[indx] + "," + this.rgba[indx+1] + "," + this.rgba[indx+2] + "," + this.rgba[indx+3] + ")";
   }

   TASImagePainter.prototype.CreateImage = function() {
      let obj = this.GetObject(), is_buf = false, fp = this.frame_painter();

      if (obj._blob) {
         // try to process blob data due to custom streamer
         if ((obj._blob.length == 15) && !obj._blob[0]) {
            obj.fImageQuality = obj._blob[1];
            obj.fImageCompression = obj._blob[2];
            obj.fConstRatio = obj._blob[3];
            obj.fPalette = {
                _typename: "TImagePalette",
                fUniqueID: obj._blob[4],
                fBits: obj._blob[5],
                fNumPoints: obj._blob[6],
                fPoints: obj._blob[7],
                fColorRed: obj._blob[8],
                fColorGreen: obj._blob[9],
                fColorBlue: obj._blob[10],
                fColorAlpha: obj._blob[11]
            }

            obj.fWidth = obj._blob[12];
            obj.fHeight = obj._blob[13];
            obj.fImgBuf = obj._blob[14];

            if ((obj.fWidth * obj.fHeight != obj.fImgBuf.length) ||
                  (obj.fPalette.fNumPoints != obj.fPalette.fPoints.length)) {
               console.error('TASImage _blob decoding error', obj.fWidth * obj.fHeight, '!=', obj.fImgBuf.length, obj.fPalette.fNumPoints, "!=", obj.fPalette.fPoints.length);
               delete obj.fImgBuf;
               delete obj.fPalette;
            }

         } else if ((obj._blob.length == 3) && obj._blob[0]) {
            obj.fPngBuf = obj._blob[2];
            if (!obj.fPngBuf || (obj.fPngBuf.length != obj._blob[1])) {
               console.error('TASImage with png buffer _blob error', obj._blob[1], '!=', (obj.fPngBuf ? obj.fPngBuf.length : -1));
               delete obj.fPngBuf;
            }
         } else {
            console.error('TASImage _blob len', obj._blob.length, 'not recognized');
         }

         delete obj._blob;
      }

      let url, constRatio = true;

      if (obj.fImgBuf && obj.fPalette) {

         is_buf = true;

         let nlevels = 1000;
         this.rgba = this.CreateRGBA(nlevels); // precaclucated colors

         let min = obj.fImgBuf[0], max = obj.fImgBuf[0];
         for (let k=1;k<obj.fImgBuf.length;++k) {
            let v = obj.fImgBuf[k];
            min = Math.min(v, min);
            max = Math.max(v, max);
         }

         // does not work properly in Node.js, causes "Maximum call stack size exceeded" error
         // min = Math.min.apply(null, obj.fImgBuf),
         // max = Math.max.apply(null, obj.fImgBuf);

         // create countor like in hist painter to allow palette drawing
         this.fContour = new Array(200);
         for (let k=0;k<200;k++)
            this.fContour[k] = min + (max-min)/(200-1)*k;

         if (min >= max) max = min + 1;

         let xmin = 0, xmax = obj.fWidth, ymin = 0, ymax = obj.fHeight; // dimension in pixels

         if (fp && (fp.zoom_xmin != fp.zoom_xmax)) {
            xmin = Math.round(fp.zoom_xmin * obj.fWidth);
            xmax = Math.round(fp.zoom_xmax * obj.fWidth);
         }

         if (fp && (fp.zoom_ymin != fp.zoom_ymax)) {
            ymin = Math.round(fp.zoom_ymin * obj.fHeight);
            ymax = Math.round(fp.zoom_ymax * obj.fHeight);
         }

         let canvas;

         if (JSROOT.nodejs) {
            try {
               const { createCanvas } = require('canvas');
               canvas = createCanvas(xmax - xmin, ymax - ymin);
            } catch (err) {
               console.log('canvas is not installed');
            }

         } else {
            canvas = document.createElement('canvas');
            canvas.width = xmax - xmin;
            canvas.height = ymax - ymin;
         }

         if (!canvas) return;

         let context = canvas.getContext('2d'),
             imageData = context.getImageData(0, 0, canvas.width, canvas.height),
             arr = imageData.data;

         for(let i = ymin; i < ymax; ++i) {
            let dst = (ymax - i - 1) * (xmax - xmin) * 4,
                row = i * obj.fWidth;
            for(let j = xmin; j < xmax; ++j) {
               let iii = Math.round((obj.fImgBuf[row + j] - min) / (max - min) * nlevels) * 4;
               // copy rgba value for specified point
               arr[dst++] = this.rgba[iii++];
               arr[dst++] = this.rgba[iii++];
               arr[dst++] = this.rgba[iii++];
               arr[dst++] = this.rgba[iii++];
            }
         }

         context.putImageData(imageData, 0, 0);

         url = canvas.toDataURL(); // create data url to insert into image

         constRatio = obj.fConstRatio;

         // console.log('url', url.length, url.substr(0,100), url.substr(url.length-20, 20));

      } else if (obj.fPngBuf) {
         let pngbuf = "", btoa_func;
         if (typeof obj.fPngBuf == "string") {
            pngbuf = obj.fPngBuf;
         } else {
            for (let k=0;k<obj.fPngBuf.length;++k)
               pngbuf += String.fromCharCode(obj.fPngBuf[k] < 0 ? 256 + obj.fPngBuf[k] : obj.fPngBuf[k]);
         }

         if (JSROOT.nodejs)
            btoa_func = require("btoa");
         else
            btoa_func = window.btoa;

         url = "data:image/png;base64," + btoa_func(pngbuf);
      }

      if (url)
         this.CreateG(true)
             .append("image")
             .attr("href", url)
             .attr("width", this.frame_width())
             .attr("height", this.frame_height())
             .attr("preserveAspectRatio", constRatio ? null : "none");

      if (url && this.is_main_painter() && is_buf && fp) {

         this.DrawColorPalette(this.options.Zscale, true);

         fp.SetAxesRanges(JSROOT.Create("TAxis"), 0, 1, JSROOT.Create("TAxis"), 0, 1, null, 0, 0);
         fp.CreateXY({ ndim: 2,
                       check_pad_range: false,
                       create_canvas: false });
         fp.AddInteractive();
      }
   }

   TASImagePainter.prototype.CanZoomIn = function(axis,min,max) {
      let obj = this.GetObject();

      if (!obj || !obj.fImgBuf)
         return false;

      if ((axis == "x") && ((max - min) * obj.fWidth > 3)) return true;

      if ((axis == "y") && ((max - min) * obj.fHeight > 3)) return true;

      return false;
   }

   TASImagePainter.prototype.DrawColorPalette = function(enabled, can_move) {
      // only when create new palette, one could change frame size

      if (!this.is_main_painter()) return null;

      if (!this.draw_palette) {
         let pal = JSROOT.Create('TPave');

         JSROOT.extend(pal, { _typename: "TPaletteAxis", fName: "TPave", fH: null, fAxis: JSROOT.Create('TGaxis'),
                               fX1NDC: 0.91, fX2NDC: 0.95, fY1NDC: 0.1, fY2NDC: 0.9, fInit: 1 } );

         pal.fAxis.fChopt = "+";

         this.draw_palette = pal;
      }

      let pal_painter = this.FindPainterFor(this.draw_palette);

      if (!enabled) {
         if (pal_painter) {
            pal_painter.Enabled = false;
            pal_painter.RemoveDrawG(); // completely remove drawing without need to redraw complete pad
         }
         return;
      }

      let frame_painter = this.frame_painter();

      // keep palette width
      if (can_move && frame_painter) {
         let pal = this.draw_palette;
         pal.fX2NDC = frame_painter.fX2NDC + 0.01 + (pal.fX2NDC - pal.fX1NDC);
         pal.fX1NDC = frame_painter.fX2NDC + 0.01;
         pal.fY1NDC = frame_painter.fY1NDC;
         pal.fY2NDC = frame_painter.fY2NDC;
      }

      if (!pal_painter) {
         JSROOT.draw(this.divid, this.draw_palette, "onpad:" + this.pad_name).then(function(p) {
            // mark painter as secondary - not in list of TCanvas primitives
            p.$secondary = true;

            // make dummy redraw, palette will be updated only from histogram painter
            p.Redraw = function() {};
         });
      } else {
         pal_painter.Enabled = true;
         pal_painter.DrawPave("");
      }
   }

   TASImagePainter.prototype.ToggleColz = function() {
      let obj = this.GetObject(),
          can_toggle = obj && obj.fPalette;

      if (can_toggle) {
         this.options.Zscale = !this.options.Zscale;
         this.DrawColorPalette(this.options.Zscale, true);
      }
   }

   TASImagePainter.prototype.Redraw = function(reason) {
      let img = this.draw_g ? this.draw_g.select("image") : null;

      if (img && !img.empty() && (reason !== "zoom")) {
         let fw = this.frame_width(), fh = this.frame_height();
         img.attr("width", fw).attr("height", fh);
      } else {
         this.CreateImage();
      }
   }

   TASImagePainter.prototype.ButtonClick = function(funcname) {
      if (this !== this.main_painter()) return false;

      switch(funcname) {
         case "ToggleColorZ": this.ToggleColz(); break;
         default: return false;
      }

      return true;
   }

   TASImagePainter.prototype.FillToolbar = function() {
      let pp = this.pad_painter(), obj = this.GetObject();
      if (pp && obj && obj.fPalette) {
         pp.AddButton("th2colorz", "Toggle color palette", "ToggleColorZ");
         pp.ShowButtons();
      }
   }

   function drawASImage(divid, obj, opt) {
      let painter = new TASImagePainter(obj, opt);

      painter.DecodeOptions(opt);

      painter.SetDivId(divid, 1);

      painter.CreateImage();

      painter.FillToolbar();

      return painter.DrawingReady();
   }

   // ===================================================================================


   jsrp.drawJSImage = function(divid, obj, opt) {
      let painter = new JSROOT.BasePainter();
      painter.SetDivId(divid, -1);

      let main = painter.select_main();

      // this is example how external image can be inserted
      let img = main.append("img").attr("src", obj.fName).attr("title", obj.fTitle || obj.fName);

      if (opt && opt.indexOf("scale")>=0) {
         img.style("width","100%").style("height","100%");
      } else if (opt && opt.indexOf("center")>=0) {
         main.style("position", "relative");
         img.attr("style", "margin: 0; position: absolute;  top: 50%; left: 50%; transform: translate(-50%, -50%);");
      }

      painter.SetDivId(divid);

      return painter.DrawingReady();
   }


   // ==================================================================================================


   jsrp.drawText = drawText;
   jsrp.drawLine = drawLine;
   jsrp.drawPolyLine = drawPolyLine;
   jsrp.drawArrow = drawArrow;
   jsrp.drawEllipse = drawEllipse;
   jsrp.drawPie = drawPie;
   jsrp.drawBox = drawBox;
   jsrp.drawMarker = drawMarker;
   jsrp.drawPolyMarker = drawPolyMarker;
   jsrp.drawWebPainting = drawWebPainting;
   jsrp.drawRooPlot = drawRooPlot;
   jsrp.drawGraph = drawGraph;
   jsrp.drawFunction = drawFunction;
   jsrp.drawGraphTime = drawGraphTime;
   jsrp.drawGraphPolar = drawGraphPolar;
   jsrp.drawEfficiency = drawEfficiency;
   jsrp.drawGraphPolargram = drawGraphPolargram;
   jsrp.drawASImage = drawASImage;


   JSROOT.TF1Painter = TF1Painter;
   JSROOT.TGraphPainter = TGraphPainter;
   JSROOT.TGraphPolarPainter = TGraphPolarPainter;
   JSROOT.TMultiGraphPainter = TMultiGraphPainter;
   JSROOT.TSplinePainter = TSplinePainter;
   JSROOT.TASImagePainter = TASImagePainter;

   return JSROOT;

});
