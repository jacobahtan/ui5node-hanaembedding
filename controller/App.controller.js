"use strict";

sap.ui.define(
  ["sap/base/Log", 
    "sap/ui/core/mvc/Controller", 
    "sap/tnt/library", 
    "sap/ui/Device", 
    "sap/ui/model/json/JSONModel", 
    "sap/m/MessageToast",
    "require",
    "sap/f/FlexibleColumnLayout"],
  function (Log, BaseController, tntLib, Device, JSONModel, MessageToast,require, FlexibleColumnLayout) {
    const logger = Log.getLogger("ask-sa-gai-city-chat");


    return BaseController.extend("chat.controller.App", {
      onChartLoad: function () {
        var self = this;
        // console.log(self.getView().byId("chartPage").getSrc());
        // console.log(document.getElementById("chartPage").src);
        // document.getElementById("chartPage").src = "http://localhost:5173/index.html";
        var oFrame = this.getView().byId("chartPage");
        var oFrameContent = oFrame.$()[0];
        // var srcContent = `<!DOCTYPE html> <html lang="en"> <meta charset="utf-8"> <!-- Load d3.js --> <script src="https://d3js.org/d3.v4.js"></script> <!-- Load color scale --> <script src="https://d3js.org/d3-scale-chromatic.v1.min.js"></script> <!-- Create a div where the graph will take place --> <div id="my_dataviz"></div> <!-- A bit of CSS: change stroke color of circle on hover (white -> black) --> <style> .bubbles { stroke-width: 1px; stroke: black; opacity: .8 } .bubbles:hover { stroke: black; } </style> <head> <style> *:not(:defined) { display: none; } html { forced-color-adjust: none; } </style> <style> *:not(:defined) { display: none; } html { forced-color-adjust: none; } </style> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <link rel="stylesheet" href="./main.css"> <title>Sample</title> </head> <body style="background-color: var(--sapBackgroundColor); height: fit-content;"> <script type="module" src="src/main.js"></script> <script> // set the dimensions and margins of the graph var margin = {top: 40, right: 150, bottom: 60, left: 30}, width = 500 - margin.left - margin.right, height = 420 - margin.top - margin.bottom; // append the svg object to the body of the page var svg = d3.select("#my_dataviz") .append("svg") .attr("width", width + margin.left + margin.right) .attr("height", height + margin.top + margin.bottom) .append("g") .attr("transform", "translate(" + margin.left + "," + margin.top + ")"); //Read the data d3.csv("https://raw.githubusercontent.com/holtzy/data_to_viz/master/Example_dataset/4_ThreeNum.csv", function(data) { // ---------------------------// //       AXIS  AND SCALE      // // ---------------------------// // Add X axis var x = d3.scaleLinear() .domain([0, 45000]) .range([ 0, width ]); svg.append("g") .attr("transform", "translate(0," + height + ")") .call(d3.axisBottom(x).ticks(3)); // Add X axis label: svg.append("text") .attr("text-anchor", "end") .attr("x", width) .attr("y", height+50 ) .text("Gdp per Capita"); // Add Y axis var y = d3.scaleLinear() .domain([35, 90]) .range([ height, 0]); svg.append("g") .call(d3.axisLeft(y)); // Add Y axis label: svg.append("text") .attr("text-anchor", "end") .attr("x", 0) .attr("y", -20 ) .text("Life expectancy") .attr("text-anchor", "start") // Add a scale for bubble size var z = d3.scaleSqrt() .domain([200000, 1310000000]) .range([ 2, 30]); // Add a scale for bubble color var myColor = d3.scaleOrdinal() .domain(["Asia", "Europe", "Americas", "Africa", "Oceania"]) .range(d3.schemeSet1); // ---------------------------// //      TOOLTIP               // // ---------------------------// // -1- Create a tooltip div that is hidden by default: var tooltip = d3.select("#my_dataviz") .append("div") .style("opacity", 0) .attr("class", "tooltip") .style("background-color", "black") .style("border-radius", "5px") .style("padding", "10px") .style("color", "white") // -2- Create 3 functions to show / update (when mouse move but stay on same circle) / hide the tooltip var showTooltip = function(d) { tooltip .transition() .duration(200) tooltip .style("opacity", 1) .html("Country: " + d.country) .style("left", (d3.mouse(this)[0]+30) + "px") .style("top", (d3.mouse(this)[1]+30) + "px") } var moveTooltip = function(d) { tooltip .style("left", (d3.mouse(this)[0]+30) + "px") .style("top", (d3.mouse(this)[1]+30) + "px") } var hideTooltip = function(d) { tooltip .transition() .duration(200) .style("opacity", 0) } // ---------------------------// //       HIGHLIGHT GROUP      // // ---------------------------// // What to do when one group is hovered var highlight = function(d){ // reduce opacity of all groups d3.selectAll(".bubbles").style("opacity", .05) // expect the one that is hovered d3.selectAll("."+d).style("opacity", 1) } // And when it is not hovered anymore var noHighlight = function(d){ d3.selectAll(".bubbles").style("opacity", 1) } // ---------------------------// //       CIRCLES              // // ---------------------------// // Add dots svg.append('g') .selectAll("dot") .data(data) .enter() .append("circle") .attr("class", function(d) { return "bubbles " + d.continent }) .attr("cx", function (d) { return x(d.gdpPercap); } ) .attr("cy", function (d) { return y(d.lifeExp); } ) .attr("r", function (d) { return z(d.pop); } ) .style("fill", function (d) { return myColor(d.continent); } ) // -3- Trigger the functions for hover .on("mouseover", showTooltip ) .on("mousemove", moveTooltip ) .on("mouseleave", hideTooltip ) // ---------------------------// //       LEGEND              // // ---------------------------// // Add legend: circles var valuesToShow = [10000000, 100000000, 1000000000] var xCircle = 390 var xLabel = 440 svg .selectAll("legend") .data(valuesToShow) .enter() .append("circle") .attr("cx", xCircle) .attr("cy", function(d){ return height - 100 - z(d) } ) .attr("r", function(d){ return z(d) }) .style("fill", "none") .attr("stroke", "black") // Add legend: segments svg .selectAll("legend") .data(valuesToShow) .enter() .append("line") .attr('x1', function(d){ return xCircle + z(d) } ) .attr('x2', xLabel) .attr('y1', function(d){ return height - 100 - z(d) } ) .attr('y2', function(d){ return height - 100 - z(d) } ) .attr('stroke', 'black') .style('stroke-dasharray', ('2,2')) // Add legend: labels svg .selectAll("legend") .data(valuesToShow) .enter() .append("text") .attr('x', xLabel) .attr('y', function(d){ return height - 100 - z(d) } ) .text( function(d){ return d/1000000 } ) .style("font-size", 10) .attr('alignment-baseline', 'middle') // Legend title svg.append("text") .attr('x', xCircle) .attr("y", height - 100 +30) .text("Population (M)") .attr("text-anchor", "middle") // Add one dot in the legend for each name. var size = 20 var allgroups = ["Asia", "Europe", "Americas", "Africa", "Oceania"] svg.selectAll("myrect") .data(allgroups) .enter() .append("circle") .attr("cx", 390) .attr("cy", function(d,i){ return 10 + i*(size+5)}) // 100 is where the first dot appears. 25 is the distance between dots .attr("r", 7) .style("fill", function(d){ return myColor(d)}) .on("mouseover", highlight) .on("mouseleave", noHighlight) // Add labels beside legend dots svg.selectAll("mylabels") .data(allgroups) .enter() .append("text") .attr("x", 390 + size*.8) .attr("y", function(d,i){ return i * (size + 5) + (size/2)}) // 100 is where the first dot appears. 25 is the distance between dots .style("fill", function(d){ return myColor(d)}) .text(function(d){ return d}) .attr("text-anchor", "left") .style("alignment-baseline", "middle") .on("mouseover", highlight) .on("mouseleave", noHighlight) }) </script> </body> </html>`;
        // oFrameContent.setAttribute("src", srcContent);
        oFrameContent.setAttribute("src", "http://localhost:5173/index.html");


      },
      onPress: async function (oEvent) {
        MessageToast.show("Pressed item with ID " + oEvent.getSource().getId());
        
        const url = '/getvar';
        const options = {method: 'GET'};

        try {
          const response = await fetch(url, options);
          const data = await response.json();
          console.log(data);
        } catch (error) {
          console.error(error);
        }

        console.log();
      },
      onEmbedHANASimilaritySearch: async function (evt) {
        this.setAppBusy(true);

        // const userMessage = this.addUserMessageToChat(
        //   evt.getParameter("value")
        // );

        const searchValue = evt.getParameter("value");

        var self = this;
        self.getView().byId("gridList").setHeaderText(searchValue);

        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const url = 'https://indb-embedding.cfapps.eu12.hana.ondemand.com/compare_text_to_existing';
        const options = {
          headers: myHeaders,
          method: 'POST',
          body: '{"schema_name": "DBUSER", "table_name": "TCM_AUTOMATIC","query_text":"' + searchValue + '"}'
        };

        try {
          const response = await fetch(url, options);
          const data = await response.json();
          console.log(data);
          this.addResultsToSearch(data);
        } catch (error) {
          console.error(error);
        }

        this.setAppBusy(false);
      },

      addResultsToSearch: function (content) {
        // const chatModel = this.getView().getModel("chat");
        console.log(content);

        console.log("STRING:");
        console.log(JSON.stringify(content));

        console.log("JSON:");
        console.log(JSON.parse(JSON.stringify(content)));

        var oModel = new JSONModel(JSON.parse(JSON.stringify(content)));
        this.getView().setModel(oModel, "search");

        // const userMessage = {
        //   timestamp: new Date().toJSON(),
        //   content: content,
        //   role: "user",
        //   icon: "sap-icon://person-placeholder",
        // };
        // chatModel.getProperty("/").push(content);
        // chatModel.updateBindings(true);
        // return userMessage;
      },

      onInit: function () {
        var oDeviceModel = new JSONModel(Device);
        this.getView().setModel(oDeviceModel, "device");

        var oModel = new JSONModel(sap.ui.require.toUrl("chat/model/data.json"));
        this.getView().setModel(oModel, "nav");
        this._setToggleButtonTooltip(!Device.system.desktop);

        Device.media.attachHandler(this._handleMediaChange, this);
        this._handleMediaChange();

        this.oRouter = this.getOwnerComponent().getRouter();
        this.oRouter.attachRouteMatched(this.onRouteMatched, this);
        this.oRouter.attachBeforeRouteMatched(this.onBeforeRouteMatched, this);
      },

      onItemSelect: function (oEvent) {
        var oItem = oEvent.getParameter("item");
        this.byId("pageContainer").to(this.getView().createId(oItem.getKey()));
      },

      onSideNavButtonPress: function () {
        var oToolPage = this.byId("toolPage");
        var bSideExpanded = oToolPage.getSideExpanded();

        this._setToggleButtonTooltip(bSideExpanded);

        oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
      },

      _setToggleButtonTooltip: function (bLarge) {
        var oToggleButton = this.byId('sideNavigationToggleButton');
        if (bLarge) {
          oToggleButton.setTooltip('Large Size Navigation');
        } else {
          oToggleButton.setTooltip('Small Size Navigation');
        }
      },

      _handleMediaChange: function () {
        var rangeName = Device.media.getCurrentRange("StdExt").name;

        switch (rangeName) {
          // Shell Desktop
          case "LargeDesktop":
            this.byId("productName").setVisible(true);
            this.byId("secondTitle").setVisible(true);
            this.byId("searchField").setVisible(true);
            this.byId("spacer").setVisible(true);
            this.byId("searchButton").setVisible(false);
            MessageToast.show("Screen width is corresponding to Large Desktop");
            break;

          // Tablet - Landscape
          case "Desktop":
            this.byId("productName").setVisible(true);
            this.byId("secondTitle").setVisible(false);
            this.byId("searchField").setVisible(true);
            this.byId("spacer").setVisible(true);
            this.byId("searchButton").setVisible(false);
            MessageToast.show("Screen width is corresponding to Desktop");
            break;

          // Tablet - Portrait
          case "Tablet":
            this.byId("productName").setVisible(true);
            this.byId("secondTitle").setVisible(true);
            this.byId("searchButton").setVisible(true);
            this.byId("searchField").setVisible(false);
            this.byId("spacer").setVisible(false);
            MessageToast.show("Screen width is corresponding to Tablet");
            break;

          case "Phone":
            this.byId("searchButton").setVisible(true);
            this.byId("searchField").setVisible(false);
            this.byId("spacer").setVisible(false);
            this.byId("productName").setVisible(false);
            this.byId("secondTitle").setVisible(false);
            MessageToast.show("Screen width is corresponding to Phone");
            break;
          default:
            break;
        }
      },

      onExit: function () {
        Device.media.detachHandler(this._handleMediaChange, this);
      },

      onTest: async function (evt) {
        alert();
      },

      onDeleteChat: async function (evt) {
        this.setAppBusy(true);
        const uiModel = this.getView().getModel("ui");
        const objectBinding = evt.getSource().getObjectBinding();
        objectBinding.setParameter(
          "sessionId",
          uiModel.getProperty("/sessionId")
        );
        await objectBinding.execute();
        this.getView().getModel("chat").setProperty("/", []);
        uiModel.setProperty("/sessionId", window.crypto.randomUUID());
        this.setAppBusy(false);
      },

      onSendMessage: async function (evt) {
        this.setAppBusy(true);
        const userMessage = this.addUserMessageToChat(
          evt.getParameter("value")
        );
        const payload = {
          sessionId: this.getView().getModel("ui").getProperty("/sessionId"),
          content: userMessage.content,
          timestamp: userMessage.timestamp,
        };

        try {
          const response = await this.askAiAssistent(payload);
          logger.info(JSON.stringify(response));
          this.addSystemMessageToChat(response);
        } catch (err) {
          this.addSystemMessageToChat({
            //content: "Error connecting to AI...",
            content: err.error?.message,
            timestamp: new Date().toJSON(),
          });
          logger.error(err);
        }
        this.setAppBusy(false);
      },

      setAppBusy: function (isBusy) {
        const uiModel = this.getView().getModel("ui");
        uiModel.setProperty("/enabled", !isBusy);
        uiModel.setProperty("/busy", isBusy);
      },

      askAiAssistent: async function (payload) {
        const url =
          this.getOwnerComponent().getManifestEntry("sap.app").dataSources
            .mainService.uri + "getAiResponse";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("fetch error...");
        }
      },

      addUserMessageToChat: function (content) {
        const chatModel = this.getView().getModel("chat");
        const userMessage = {
          timestamp: new Date().toJSON(),
          content: content,
          role: "user",
          icon: "sap-icon://person-placeholder",
        };
        chatModel.getProperty("/").push(userMessage);
        chatModel.updateBindings(true);
        return userMessage;
      },

      addSystemMessageToChat: function (payload) {
        const chatModel = this.getView().getModel("chat");
        const systemMessage = {
          timestamp: payload.timestamp,
          content: payload?.content,
          role: "system",
          icon: "sap-icon://ai",
        };
        chatModel.getProperty("/").push(systemMessage);
        chatModel.updateBindings(true);
        return systemMessage;
      },
    });
  }
);
