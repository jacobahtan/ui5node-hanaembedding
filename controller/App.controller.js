"use strict";

sap.ui.define(
  ["sap/base/Log",
    "sap/ui/core/mvc/Controller",
    "sap/tnt/library",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "require",
    "sap/f/FlexibleColumnLayout",
    "sap/ui/core/Fragment",],
  function (Log, BaseController, tntLib, Device, JSONModel, MessageToast, require, FlexibleColumnLayout, Fragment) {
    const logger = Log.getLogger("ask-sa-gai-city-chat");

    function createPageJson(header, title, titleUrl, icon, elements) {
      const pageData = {
        pageId: "genericPageId", // You can make this dynamic if needed
        header: header,
        title: title,
        titleUrl: titleUrl,
        icon: icon,
        groups: [
          {
            elements: elements,
          },
        ],
      };

      return { pages: [pageData] }; // Return the complete JSON object
    }

    function parseSimilarityToPercentage(similarity) {
      if (similarity < -1 || similarity > 1) {
        return "Invalid similarity value. Must be between -1 and 1."; // Handle invalid input
      }

      // Scale the similarity from [-1, 1] to [0, 1]
      const scaledSimilarity = (similarity + 1) / 2;

      // Convert to percentage (0-100)
      const percentage = scaledSimilarity * 100;

      return Math.round(percentage) + "%"; // Return as a string with % and rounded value
    }

    function copyToClipboard(text) {
      if (!navigator.clipboard) {
        // Fallback for older browsers (using the deprecated execCommand)
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy"); // Deprecated, but still works in many cases
          console.log("Text copied to clipboard (fallback method)");
        } catch (err) {
          console.error("Unable to copy to clipboard (fallback method): ", err);
        }
        document.body.removeChild(textArea);
        return; // Exit early
      }

      // Modern approach using Clipboard API (preferred)
      navigator.clipboard.writeText(text)
        .then(() => {
          console.log("Text copied to clipboard (Clipboard API)");
        })
        .catch(err => {
          console.error("Unable to copy to clipboard (Clipboard API): ", err);
        });
    }

    function openMSTeams(meetingUrl) {
      if (meetingUrl) {
        const teamsProtocol = "msteams://l/meeting/join/?url=" + encodeURIComponent(meetingUrl);
        const fallbackUrl = meetingUrl; // Or your custom fallback URL

        // Open the Teams protocol in a new tab/window
        const newTab = window.open(teamsProtocol, '_blank'); // '_blank' opens in new tab

        if (!newTab) { // Check if pop-up was blocked
          alert('Pop-up blocked! Please allow pop-ups for this site to open the Teams meeting.');
          return; // Stop execution to prevent redirect
        }

        // Fallback (only if the new tab is still accessible - popup blocker check)
        setTimeout(() => {
          if (newTab && newTab.closed) { // Check if the new tab was closed (likely by popup blocker or user)
            window.open(fallbackUrl, '_blank'); // Open fallback in a new tab
          } else if (newTab && newTab.location.href.startsWith(window.location.origin)) { //Check if the opened new tab is still on the same origin
            newTab.location.href = fallbackUrl;
          }
        }, 2000); // Adjust timeout as needed
      } else {
        console.error("Meeting URL is required.");
      }
    }


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
        /** TEMP method to call app.js API call to env variable defined */
        // const url = '/getvar';
        // const options = {method: 'GET'};

        // try {
        //   const response = await fetch(url, options);
        //   const data = await response.json();
        //   console.log(data);
        // } catch (error) {
        //   console.error(error);
        // }


        /** Logic for Project Details
         * - Retrieve Project ID
         * - GET request to get Project Details
         * - Parse response into JSON into fragment
         */

        console.log(oEvent.getSource());
        console.log(oEvent.getSource().oBindingContexts);
        console.log(oEvent.getSource().oBindingContexts.search);
        console.log(oEvent.getSource().oBindingContexts.search.sPath);
        var oModel = this.getView().getModel("search");
        // var gridlistitemcontextdata = oModel.getProperty(oEvent.getSource().getParent().oPropagatedProperties.oBindingContexts.search.sPath);
        // console.log(gridlistitemcontextdata);
        // MessageToast.show("Opening Coinstar of Project #" + gridlistitemcontextdata.project_number);
        var gridlistitemcontextdata = oModel.getProperty(oEvent.getSource().oBindingContexts.search.sPath);
        var projID = gridlistitemcontextdata.project_number;

        console.log(projID);

        // MessageToast.show("Pressed item with ID " + oEvent.getSource().getId());

        const getprojdeturl = 'https://indb-embedding.cfapps.eu12.hana.ondemand.com/get_project_details?project_number=' + projID;
        const getprojdetoptions = { method: 'GET' };

        try {
          const response = await fetch(getprojdeturl, getprojdetoptions);
          const data = await response.json();
          console.log(data);
          console.log(data.project_details[0].architect);

          const project_number = data.project_details[0].project_number;
          const topic = data.project_details[0].topic;
          const architect = data.project_details[0].architect;
          const comment = data.project_details[0].comment;
          const comment_date = data.project_details[0].comment_date;
          const project_date = data.project_details[0].project_date;
          const solution = data.project_details[0].solution;


          const elements1 = [
            { label: "Request Date", value: project_date },
            { label: "Solution", value: solution },
            { label: "Architect", value: architect },
            { label: "Comments", value: comment },
            { label: "Comments Date", value: comment_date },
          ];

          const json1 = createPageJson(
            "Request #" + project_number,
            topic,
            "https://partner-innovation-labs.launchpad.cfapps.eu10.hana.ondemand.com/site?siteId=ad630cb6-3c21-4c62-a834-779557ea8f48#managePSR-display?sap-ui-app-id-hint=saas_approuter_coil.coinstar.partnerservicerequests&/PartnerServiceRequest(ID=4b78084a-29c2-43b7-953d-51d642b2d68a,IsActiveEntity=true)?layout=TwoColumnsMidExpanded&sap-iapp-state=TASBVMT2FMXN8WWBL0QC6087UBCHISY6HFTT654E2",
            "sap-icon://travel-request",
            elements1
          );

          console.log(JSON.stringify(json1)); // Pretty-print the JSON
          // var x = { "pages": [ { "pageId": "genericPageId", "header": "Process", "title": "Inventarisation", "titleUrl": "http://de.wikipedia.org/wiki/Inventarisation", "icon": "sap-icon://camera", "groups": [ { "elements": [ { "label": "Start Date", "value": "01/01/2015" }, { "label": "End Date", "value": "31/12/2015" }, { "label": "Occurrence", "value": "Weekly" } ] } ] } ] };
          // var oModel = new JSONModel(sap.ui.require.toUrl("chat/mockdata/ta.json"));
          var oModel = new JSONModel(json1);
          this.getView().setModel(oModel, "pages");

          var oModel = this.getView().getModel("pages");
          this.openQuickView(oEvent, oModel);

        } catch (error) {
          console.error(error);
        }



      },
      onEmbedHANASimilaritySearch: async function (evt) {
        this.setAppBusy(true);

        // const userMessage = this.addUserMessageToChat(
        //   evt.getParameter("value")
        // );

        const searchValue = evt.getParameter("value");

        var self = this;
        self.getView().byId("gridList").setHeaderText("Similar Requests from: " + searchValue);

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

      onCoinStar: function (oEvent) {
        // const aData = oEvent.getParameter("data");
        // console.log(aData);
        // console.log(oEvent.getSource());
        // console.log(oEvent.getSource().getParent());
        // console.log(oEvent.getSource().getParent().getParent());
        // console.log(oEvent.getSource().getParent().getParent().getParent());
        // console.log(oEvent.getSource().getParent().getParent().getParent().getBindingContext());
        // console.log(oEvent.getSource().getParent().oPropagatedProperties);
        // console.log(oEvent.getSource().getParent().oPropagatedProperties.oBindingContexts);
        // console.log(oEvent.getSource().getParent().oPropagatedProperties.oBindingContexts.toString());
        // console.log(oEvent.getSource().getParent().oPropagatedProperties.oBindingContexts.search.sPath);
        // var gridlistitem = oEvent.getSource().getParent().getParent().getParent();
        // console.log(gridlistitem);
        // var gridlistitemcontext = gridlistitem.getBindingContext();
        // console.log(gridlistitemcontext);
        // var gridlistitemcontextpath = gridlistitemcontext.getPath();
        // console.log(gridlistitemcontextpath);
        var oModel = this.getView().getModel("search");
        var gridlistitemcontextdata = oModel.getProperty(oEvent.getSource().getParent().oPropagatedProperties.oBindingContexts.search.sPath);
        console.log(gridlistitemcontextdata);
        MessageToast.show("Opening Coinstar of Project #" + gridlistitemcontextdata.project_number);
        // console.log(oEvent.getSource().getParent().oPropagatedProperties[0].oBindingContexts);
        // console.log(oEvent.getSource().getParent().oPropagatedProperties.oBindingContexts.sPath);
        // const oListItemBindingContext = oListItem.getBindingContext();
        // const sListItemPath = oListItemBindingContext.getPath();
        // const oListItemData = oModel.getProperty(sListItemPath);

        window.open("https://partner-innovation-labs.launchpad.cfapps.eu10.hana.ondemand.com/site?siteId=ad630cb6-3c21-4c62-a834-779557ea8f48#managePSR-display?sap-ui-app-id-hint=saas_approuter_coil.coinstar.partnerservicerequests&/PartnerServiceRequest(ID=4b78084a-29c2-43b7-953d-51d642b2d68a,IsActiveEntity=true)?layout=TwoColumnsMidExpanded&sap-iapp-state=TASBVMT2FMXN8WWBL0QC6087UBCHISY6HFTT654E2", "_blank");
      },

      onAddFav: function (oEvent) {
        var oModel = this.getView().getModel("search");
        var gridlistitemcontextdata = oModel.getProperty(oEvent.getSource().getParent().oPropagatedProperties.oBindingContexts.search.sPath);
        console.log(gridlistitemcontextdata);
        MessageToast.show("Added to favourites of Project #" + gridlistitemcontextdata.project_number);

      },

      onCopy: function (oEvent) {
        var oModel = this.getView().getModel("search");
        var gridlistitemcontextdata = oModel.getProperty(oEvent.getSource().getParent().oPropagatedProperties.oBindingContexts.search.sPath);
        console.log(gridlistitemcontextdata);
        MessageToast.show("Text copied" + gridlistitemcontextdata.TEXT);

        copyToClipboard(gridlistitemcontextdata.TEXT);
      },

      onCall: function (oEvent) {
        MessageToast.show("Opening MS Teams");

        const meetingLink = "https://teams.microsoft.com/l/meetup-join/group/SOME_LONG_ID"; // Replace with your actual Teams meeting link
        openMSTeams(meetingLink);
      },

      openQuickView: function (oEvent, oModel) {
        var oButton = oEvent.getSource(),
          oView = this.getView();

        var oModel = this.getView().getModel("pages");


        if (!this._pQuickView) {
          this._pQuickView = Fragment.load({
            id: oView.getId(),
            name: "chat.view.TAQuickView",
            controller: this
          }).then(function (oQuickView) {
            oView.addDependent(oQuickView);
            return oQuickView;
          });
        }
        this._pQuickView.then(function (oQuickView) {
          oQuickView.setModel(oModel);
          oQuickView.openBy(oButton);
        });
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

      onInit: async function () {
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

        // sap.ui.getCore().byId("container-chat---App--sideNavigation").setExpanded(false);
        // console.log(sap.ui.getCore().byId("container-chat---App--sideNavigation").getExpanded());
      },

      onProjectPress: function (oEvent) {
        var oItem = oEvent.getSource();
        var oBindingContext = oItem.getBindingContext();
        var oModel = this.getView().getModel('projects');
        var oSettingsModel = this.getView().getModel('settings');
        oSettingsModel.setProperty("/navigatedItem", oModel.getProperty("project_number", oBindingContext));

        console.log(oItem.oBindingContexts.projects.sPath);


        var gridlistitemcontextdata = oModel.getProperty(oItem.oBindingContexts.projects.sPath);
        var projID = gridlistitemcontextdata.project_number;
        console.log(projID);
        MessageToast.show(projID);
      },

      isNavigated: function(sNavigatedItemId, sItemId) {
        // MessageToast.show(sItemId);
        return sNavigatedItemId === sItemId;
      },

      onAfterRendering: async function () {
        // sap.ui.getCore().byId("container-chat---App--sideNavigation").setExpanded(false);
        const url = 'https://indb-embedding.cfapps.eu12.hana.ondemand.com/get_all_projects';
        const options = { method: 'GET' };

        try {
          const response = await fetch(url, options);
          const data = await response.json();

          var oProjects = new JSONModel(data);
          this.getView().setModel(oProjects, "projects");
          var oSettingsModel = new JSONModel({ navigatedItem: "" });
          this.getView().setModel(oSettingsModel, 'settings');

          console.log(data);
        } catch (error) {
          console.error(error);
        }
      },

      onItemSelect: function (oEvent) {
        var oItem = oEvent.getParameter("item");
        this.byId("pageContainer").to(this.getView().createId(oItem.getKey()));
        // sap.ui.getCore().byId("container-chat---App--sideNavigation").setExpanded(false);
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

      formatMatchingScoreColor: function (score) {
        if (score < 0.45) {
          return 4;
        } else {
          return 8;
        }
      },

      formatMatchingScore: function (value) {
        return parseSimilarityToPercentage(value);
        // return value*100
        // switch (sStatus) {
        //   case "Normal":
        //     return "sap-icon://message-success";
        //   case "Fault":
        //     return "sap-icon://alert";
        //   case "Maintenance":
        //     return "sap-icon://error";
        //   default:
        //     return "sap-icon://machine";
        // }
      },

      _handleMediaChange: function () {
        var rangeName = Device.media.getCurrentRange("StdExt").name;

        switch (rangeName) {
          // Shell Desktop
          case "LargeDesktop":
            this.byId("sideNavigationToggleButton").setVisible(true);
            this.byId("sideNavigation").setVisible(true);
            this.byId("sideNavigation").setExpanded(false);
            this.byId("productName").setVisible(true);
            this.byId("secondTitle").setVisible(true);
            // this.byId("searchField").setVisible(true);
            this.byId("spacer").setVisible(true);
            // this.byId("searchButton").setVisible(false);
            MessageToast.show("Screen width is corresponding to Large Desktop");
            break;

          // Tablet - Landscape
          case "Desktop":
            this.byId("sideNavigationToggleButton").setVisible(true);
            this.byId("sideNavigation").setVisible(true);
            this.byId("productName").setVisible(true);
            this.byId("secondTitle").setVisible(false);
            // this.byId("searchField").setVisible(true);
            this.byId("spacer").setVisible(true);
            // this.byId("searchButton").setVisible(false);
            MessageToast.show("Screen width is corresponding to Desktop");
            break;

          // Tablet - Portrait
          case "Tablet":
            this.byId("productName").setVisible(true);
            this.byId("secondTitle").setVisible(true);
            // this.byId("searchButton").setVisible(true);
            // this.byId("searchField").setVisible(false);
            this.byId("spacer").setVisible(false);
            MessageToast.show("Screen width is corresponding to Tablet");
            break;

          case "Phone":
            // this.byId("searchButton").setVisible(true);
            this.byId("sideNavigationToggleButton").setVisible(true);
            this.byId("sideNavigation").setVisible(true);
            // this.byId("searchField").setVisible(false);
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
