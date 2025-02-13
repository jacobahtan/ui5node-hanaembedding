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
    "sap/ui/core/Fragment",
    "sap/ui/core/dnd/DragInfo",
    "sap/ui/core/dnd/DropInfo",
    "sap/f/dnd/GridDropInfo",
    "sap/ui/core/library",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/controls/common/feeds/FeedItem"],
  function (Log, BaseController, tntLib, Device, JSONModel, MessageToast, require, FlexibleColumnLayout, Fragment, DragInfo, DropInfo, GridDropInfo, coreLibrary, Filter, FilterOperator, FlattenedDataset, FeedItem) {

    /**
     * ENVIRONMENT VARIABLE MANAGEMENT
     * - Here in NodeJS, we manage the environment variables from SAPUI5 Component.js.
     * - Basically the endpoints are fetched then store in the UI model of endpoint.
     * - Then we parse it to each GLOBAL variables to be consumed.
     */
    var ALL_PROJECTS_EP, PROJECT_DETAILS_EP, HANA_EMB_SEARCH_EP, ALL_CLUSTERS_EP;

    const oConfigModel = sap.ui.getCore().getModel("endpoint");
    if (oConfigModel) {
      const pyEndpoint = oConfigModel.getProperty("/pyEndpoint");
      // console.log("in controller");
      // console.log(pyEndpoint);
      ALL_PROJECTS_EP = pyEndpoint + "/get_all_projects";
      PROJECT_DETAILS_EP = pyEndpoint + "/get_project_details";
      HANA_EMB_SEARCH_EP = pyEndpoint + "/compare_text_to_existing";
    }

    /** URL ENDPOINTS FOR ADVISORY USE CASE NAVIGATION */
    const COINSTAR_URL = "https://partner-innovation-labs.launchpad.cfapps.eu10.hana.ondemand.com/site?siteId=ad630cb6-3c21-4c62-a834-779557ea8f48#managePSR-display?sap-ui-app-id-hint=saas_approuter_coil.coinstar.partnerservicerequests&/PartnerServiceRequest(ID=4b78084a-29c2-43b7-953d-51d642b2d68a,IsActiveEntity=true)?layout=TwoColumnsMidExpanded&sap-iapp-state=TASBVMT2FMXN8WWBL0QC6087UBCHISY6HFTT654E2";
    const HANA_EMB_SEARCH_SCHEMANAME = "DBUSER";
    const HANA_EMB_SEARCH_TABLENAME = "TCM_AUTOMATIC";


    // shortcut for sap.ui.core.dnd.DropLayout
    var DropLayout = coreLibrary.dnd.DropLayout;

    // shortcut for sap.ui.core.dnd.DropPosition
    var DropPosition = coreLibrary.dnd.DropPosition;

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

    function transformDataForCategoryPieGlobal(apiData) {
      const categoryCounts = {};

      // Iterate through the project_categories array
      for (const project of apiData.project_categories) {
        const category = project.category_label;

        // Increment the count for the current category, or initialize it to 1
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }

      // Transform the categoryCounts object into the desired array format
      const transformedData = {
        Categories: Object.entries(categoryCounts).map(([Category, ProjectsCount]) => ({
          Category,
          ProjectsCount,
        })),
      };

      return transformedData;
    }

    return BaseController.extend("chat.controller.App", {
      onJoule: function () {
        if (document.getElementById("cai-webclient-main").style.display == "block") {
          document.getElementById("cai-webclient-main").style.display = "none";
        } else {
          document.getElementById("cai-webclient-main").style.display = "block";
        }
      },
      onGridListItemPressForProjectDetails: async function (oEvent) {
        /** Logic for Project Details
         * - Retrieve Project ID
         * - GET request to get Project Details
         * - Parse response into JSON into fragment
         */

        // console.log(oEvent.getSource());
        // console.log(oEvent.getSource().oBindingContexts);
        // console.log(oEvent.getSource().oBindingContexts.search);
        // console.log(oEvent.getSource().oBindingContexts.search.sPath);
        var oModel = this.getView().getModel("search");
        // var gridlistitemcontextdata = oModel.getProperty(oEvent.getSource().getParent().oPropagatedProperties.oBindingContexts.search.sPath);
        // console.log(gridlistitemcontextdata);
        // MessageToast.show("Opening Coinstar of Project #" + gridlistitemcontextdata.project_number);
        var gridlistitemcontextdata = oModel.getProperty(oEvent.getSource().oBindingContexts.search.sPath);
        var projID = gridlistitemcontextdata.project_number;

        // console.log(projID);

        // MessageToast.show("Pressed item with ID " + oEvent.getSource().getId());

        // const getprojdeturl = 'https://indb-embedding.cfapps.eu12.hana.ondemand.com/get_project_details?project_number=' + projID;
        const getprojdeturl = PROJECT_DETAILS_EP + '?project_number=' + projID;
        const getprojdetoptions = { method: 'GET' };

        try {
          const response = await fetch(getprojdeturl, getprojdetoptions);
          const data = await response.json();
          // console.log(data);
          // console.log(data.project_details[0].architect);

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
            COINSTAR_URL,
            "sap-icon://travel-request",
            elements1
          );

          // console.log(JSON.stringify(json1));
          // var x = { "pages": [ { "pageId": "genericPageId", "header": "Process", "title": "Inventarisation", "titleUrl": "http://de.wikipedia.org/wiki/Inventarisation", "icon": "sap-icon://camera", "groups": [ { "elements": [ { "label": "Start Date", "value": "01/01/2015" }, { "label": "End Date", "value": "31/12/2015" }, { "label": "Occurrence", "value": "Weekly" } ] } ] } ] };
          // var oModel = new JSONModel(sap.ui.require.toUrl("chat/mockdata/ta.json"));
          var oModel = new JSONModel(json1);
          this.getView().setModel(oModel, "pages");

          var oModel = this.getView().getModel("pages");
          this.openQuickView(oEvent, oModel);

        } catch (error) {
          console.error("In onGridListItemPressForProjectDetails:");
          console.error(error);
          MessageToast.show("Sorry, unable to retrieve project details. Click on Show More...");
        }

      },
      onEmbedHANASimilaritySearch: async function (evt) {
        this.setAppBusy(true);

        const searchValue = evt.getParameter("value");
        const cleanValue = searchValue.replace(/\r\n|\r|\n/g, '');

        var self = this;
        self.getView().byId("gridList").setHeaderText("Top 5 Similar Requests: " + cleanValue);

        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        // const url = 'https://indb-embedding.cfapps.eu12.hana.ondemand.com/compare_text_to_existing';
        const options = {
          headers: myHeaders,
          method: 'POST',
          body: '{"schema_name": "' + HANA_EMB_SEARCH_SCHEMANAME + '", "table_name": "' + HANA_EMB_SEARCH_TABLENAME + '","query_text":"' + cleanValue + '"}'
        };

        try {
          const response = await fetch(HANA_EMB_SEARCH_EP, options);
          const data = await response.json();
          // console.log(data);
          this.addResultsToSearch(data);
        } catch (error) {
          console.error("In onEmbedHANASimilaritySearch:");
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

        window.open(COINSTAR_URL, "_blank");
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
        MessageToast.show("Text copied successfully to clipboard.");

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

      initData: function () {
        this.byId("list1").setModel(new JSONModel([
          { title: "Multitenancy", rows: 1, columns: 1 },
          { title: "Business AI", rows: 1, columns: 1 },
          { title: "Integration Suite", rows: 1, columns: 1 }
        ]), "grid");

        this.byId("grid1").setModel(new JSONModel([
          { title: "CAP", rows: 1, columns: 1 },
          { title: "SAPUI5", rows: 1, columns: 1 },
          { title: "Java", rows: 1, columns: 1 }
        ]), "grid");
      },

      attachDragAndDrop: function () {
        var oList = this.byId("list1");
        oList.addDragDropConfig(new DragInfo({
          sourceAggregation: "items"
        }));

        oList.addDragDropConfig(new DropInfo({
          targetAggregation: "items",
          dropPosition: DropPosition.Between,
          dropLayout: DropLayout.Vertical,
          drop: this.onDrop.bind(this)
        }));

        var oGrid = this.byId("grid1");
        oGrid.addDragDropConfig(new DragInfo({
          sourceAggregation: "items"
        }));

        oGrid.addDragDropConfig(new GridDropInfo({
          targetAggregation: "items",
          dropPosition: DropPosition.Between,
          dropLayout: DropLayout.Horizontal,
          dropIndicatorSize: this.onDropIndicatorSize.bind(this),
          drop: this.onDrop.bind(this)
        }));
      },

      onDropIndicatorSize: function (oDraggedControl) {
        var oBindingContext = oDraggedControl.getBindingContext(),
          oData = oBindingContext.getModel("grid").getProperty(oBindingContext.getPath());

        if (oDraggedControl.isA("sap.m.StandardListItem")) {
          return {
            rows: oData.rows,
            columns: oData.columns
          };
        }
      },

      onDrop: function (oInfo) {
        var oDragged = oInfo.getParameter("draggedControl"),
          oDropped = oInfo.getParameter("droppedControl"),
          sInsertPosition = oInfo.getParameter("dropPosition"),

          oDragContainer = oDragged.getParent(),
          oDropContainer = oInfo.getSource().getParent(),

          oDragModel = oDragContainer.getModel("grid"),
          oDropModel = oDropContainer.getModel("grid"),
          oDragModelData = oDragModel.getData(),
          oDropModelData = oDropModel.getData(),

          iDragPosition = oDragContainer.indexOfItem(oDragged),
          iDropPosition = oDropContainer.indexOfItem(oDropped);

        // remove the item
        var oItem = oDragModelData[iDragPosition];
        oDragModelData.splice(iDragPosition, 1);

        if (oDragModel === oDropModel && iDragPosition < iDropPosition) {
          iDropPosition--;
        }

        if (sInsertPosition === "After") {
          iDropPosition++;
        }

        // insert the control in target aggregation
        oDropModelData.splice(iDropPosition, 0, oItem);

        if (oDragModel !== oDropModel) {
          oDragModel.setData(oDragModelData);
          oDropModel.setData(oDropModelData);
        } else {
          oDropModel.setData(oDropModelData);
        }

        this.byId("grid1").focusItem(iDropPosition);
      },

      onListItemPress: function (oEvent) {
        // MessageToast.show("Pressed : " + oEvent.getSource().getTitle());
        const oListItem = oEvent.getSource(),
          oView = this.getView();
        // const oListItem = oEvent.getSource(); // Get the pressed list item
        console.log(oListItem);

        //Get the ObjectAttribute control using the idForLabel
        const oObjectAttribute = oListItem.getAggregation("attributes")[0];
        console.log(oObjectAttribute);

        const oText = oObjectAttribute.getAggregation("_textControl");
        console.log(oText);
        console.log(oText.getDomRef());
        oText.getDomRef().classList.remove("sapMTextNoWrap");
        // oText.removeAllStyleClasses();
        // oText.setProperty("class", "sapMText sapUiSelectable sapMTextWrap sapMTextMaxWidth");

        // oText.removeStyleClass("sapMTextNoWrap");
        // oText.addStyleClass("sapMTextWrap");

        console.log(oListItem.oBindingContexts.projects.sPath);

        /**
         * [TODO]
         * Popover
         */
        // create popover

        // var oModel = this.getView().getModel("projects");

        // if (!this._pPopover) {
        //   this._pPopover = Fragment.load({
        //     id: oView.getId(),
        //     name: "chat.view.ProjectPopover",
        //     controller: this
        //   }).then(function(oPopover) {
        //     oView.addDependent(oPopover);
        //     oPopover.bindElement(oListItem.oBindingContexts.projects.sPath);
        //     return oPopover;
        //   });
        // }
        // this._pPopover.then(function(oPopover) {
        //   oPopover.setModel(oModel);
        //   oPopover.openBy(oListItem);
        // });
      },

      onSearch: function (oEvent) {
        // add filter for search
        var aFilters = [];
        var sQuery = oEvent.getSource().getValue();
        console.log(sQuery);
        if (sQuery && sQuery.length > 0) {
          var filter = new Filter("project_number", FilterOperator.EQ, sQuery);
          // var filter = new Filter("topic", FilterOperator.Contains, sQuery);
          aFilters.push(filter);
        }

        // update list binding
        var oList = this.byId("idList");
        var oBinding = oList.getBinding("items");
        oBinding.filter(aFilters, "Application");
      },

      handleSelectionChange: async function (oEvent) {
        var oItem = oEvent.getParameter("selectedItem");
        // console.log(oItem.getKey());
        const url = 'https://indb-embedding.cfapps.eu12.hana.ondemand.com/get_advisories_by_expert_and_category?expert=' + oItem.getKey();

        var vizFrame = this.getView().byId(this._constants.vizFrame.id);
        // console.log(vizFrame);

        const options = { method: 'GET' };

        try {
          const response = await fetch(url, options);
          const data = await response.json();
          var oModel = new JSONModel(data);
          vizFrame.setModel(oModel);
          vizFrame.vizUpdate();
        } catch (error) {
          console.error(error);
        }
      },

      onSelectionChange: function (oEvent) {
        var oList = oEvent.getSource();
        var oLabel = this.byId("idFilterLabel");
        var oInfoToolbar = this.byId("idInfoToolbar");

        // With the 'getSelectedContexts' function you can access the context paths
        // of all list items that have been selected, regardless of any current
        // filter on the aggregation binding.
        var aContexts = oList.getSelectedContexts(true);

        // update UI
        var bSelected = (aContexts && aContexts.length > 0);
        var sText = (bSelected) ? aContexts.length + " selected" : null;
        oInfoToolbar.setVisible(bSelected);
        oLabel.setText(sText);
      },

      _constants: {
        sampleName: "chat",
        vizFrame: {
          id: "chartContainerVizFrame",
          dataset: {
            dimensions: [{
              name: 'Category',
              value: "{CATEGORY}"
            }],
            measures: [{
              group: 1,
              name: 'Profit',
              value: '{Revenue2}'
            }, {
              group: 1,
              name: 'Target',
              value: '{Target}'
            }, {
              group: 1,
              name: "Forcast",
              value: "{Forcast}"
            }, {
              group: 1,
              name: "No of Projects",
              value: "{PROJECTS}"
            },
            {
              group: 1,
              name: 'Revenue2',
              value: '{Revenue2}'
            }, {
              group: 1,
              name: "Revenue3",
              value: "{Revenue3}"
            }],
            data: {
              path: "/advisories_by_category"
            }
          },
          // modulePath: "/mockdata/ProductsByCategory.json",
          type: "column",
          properties: {
            title: {
              visible: false,
              text: "Trending Topics by Categories"
            },
            legend: {
              visible: false
            },
            plotArea: {
              showGap: true
            },
          },
          feedItems: [{
            'uid': "primaryValues",
            'type': "Measure",
            'values': ["No of Projects"]
          }, {
            'uid': "axisLabels",
            'type': "Dimension",
            'values': ["Category"]
          }, {
            'uid': "targetValues",
            'type': "Measure",
            'values': ["Target"]
          }]
        }
      },

      _pieconstants: {
        sampleName: "chat",
        vizFrame: {
          id: "piechartContainerVizFrame",
          dataset: {
            dimensions: [{
              name: 'Category',
              value: "{Category}"
            }],
            measures: [{
              group: 1,
              name: 'Profit',
              value: '{Revenue2}'
            }, {
              group: 1,
              name: 'Target',
              value: '{Target}'
            }, {
              group: 1,
              name: "Forcast",
              value: "{Forcast}"
            }, {
              group: 1,
              name: "ProjectsCount",
              value: "{ProjectsCount}"
            },
            {
              group: 1,
              name: 'Revenue2',
              value: '{Revenue2}'
            }, {
              group: 1,
              name: "Revenue3",
              value: "{Revenue3}"
            }],
            data: {
              path: "/Categories"
            }
          },
          // modulePath: "/mockdata/ChartContainerData.json",
          type: "pie",
          properties: {
            legend: {
              visible: false
            },
            title: {
              visible: false,
              text: "Trending Topics by Categories"
            },
            plotArea: {
              showGap: true,
              dataLabel: {
                visible: true
              }
            }
          },
          feedItems: [{
            'uid': "size",
            'type': "Measure",
            'values': ["ProjectsCount"]
          }, {
            'uid': "color",
            'type': "Dimension",
            'values': ["Category"]
          }, {
            'uid': "targetValues",
            'type': "Measure",
            'values': ["Target"]
          }]
        }
      },

      onInit: async function () {
        // getEnvAPI();

        // const url = '/getenvironmentvariables';
        // const options = { method: 'GET' };

        // try {
        //   const response = await fetch(url, options);
        //   const data = await response.json();
        //   ALL_PROJECTS_EP = data + "/get_all_projects";
        //   PROJECT_DETAILS_EP = data + "/get_project_details";

        //   console.log(data);
        // } catch (error) {
        //   console.error(error);
        // }

        const that = this; // Important for using 'this' inside the fetch callback



        this.initData();
        this.attachDragAndDrop();

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

        this.byId("sideNavigation").setSelectedKey("page1");

        var oVizFrame = this.getView().byId(this._constants.vizFrame.id);
        this._updateVizFrame(oVizFrame);

        var oPieVizFrame = this.getView().byId(this._pieconstants.vizFrame.id);
        this._updatePieVizFrame(oPieVizFrame);


      },

      /* ============================================================ */
      /* Helper Methods                                               */
      /* ============================================================ */
      /**
       * Updated the Viz Frame in the view.
       *
       * @private
       * @param {sap.viz.ui5.controls.VizFrame} vizFrame Viz Frame that needs to be updated
       */
      _updateVizFrame: async function (vizFrame) {
        var oVizFrame = this._constants.vizFrame;
        console.log(PROJECT_DETAILS_EP);

        const url = 'https://indb-embedding.cfapps.eu12.hana.ondemand.com/get_advisories_by_expert_and_category?expert=Jules';
        const options = { method: 'GET' };

        try {
          const response = await fetch(url, options);
          const data = await response.json();
          // var xx = transformDataForCategoryPieGlobal(data);
          // console.log(xx);
          console.log(data);
          // var catJson = { "Products": [{ "Country": "Cloud Architecture", "Profit": 100, "Forcast": 200, "Target": 20, "Revenue": 20, "Revenue2": 20, "Revenue3": 512 }, { "Country": "Data to Value", "Profit": 159, "Forcast": 140, "Target": 150, "Revenue": 30, "Revenue2": 100, "Revenue3": 303 }, { "Country": "Security", "Profit": 129, "Forcast": 120, "Target": 100, "Revenue": 200, "Revenue2": 222, "Revenue3": 263 }, { "Country": "Application development and UI", "Profit": 58, "Forcast": 60, "Target": 80, "Revenue": 116, "Revenue2": 152, "Revenue3": 113 }, { "Country": "Multitenancy", "Profit": 149, "Forcast": 120, "Target": 150, "Revenue": 249, "Revenue2": 292, "Revenue3": 443 }, { "Country": "Integration", "Profit": 49, "Forcast": 60, "Target": 55, "Revenue": 1449, "Revenue2": 242, "Revenue3": 243 }] };
          var oModel = new JSONModel(data);
          var oDataset = new FlattenedDataset(oVizFrame.dataset);

          vizFrame.setVizProperties(oVizFrame.properties);
          vizFrame.setDataset(oDataset);
          vizFrame.setModel(oModel);
          this._addFeedItems(vizFrame, oVizFrame.feedItems);
          vizFrame.setVizType(oVizFrame.type);
        } catch (error) {
          console.error(error);
        }


        // var oVizFrame = this._constants.vizFrame;
        // var oVizFramePath = sap.ui.require.toUrl(this._constants.sampleName + oVizFrame.modulePath);
        // var oModel = new JSONModel(oVizFramePath);
        // var oDataset = new FlattenedDataset(oVizFrame.dataset);


      },
      /**
       * Adds the passed feed items to the passed Viz Frame.
       *
       * @private
       * @param {sap.viz.ui5.controls.VizFrame} vizFrame Viz Frame to add feed items to
       * @param {Object[]} feedItems Feed items to add
       */
      _addFeedItems: function (vizFrame, feedItems) {
        for (var i = 0; i < feedItems.length; i++) {
          vizFrame.addFeed(new FeedItem(feedItems[i]));
        }
      },

      _updatePieVizFrame: async function (vizFrame) {
        var oVizFrame = this._pieconstants.vizFrame;

        const url = 'https://indb-embedding.cfapps.eu12.hana.ondemand.com/get_all_project_categories';
        const options = { method: 'GET' };

        try {
          const response = await fetch(url, options);
          const data = await response.json();
          var xx = transformDataForCategoryPieGlobal(data);
          // console.log(xx);
          // console.log(data);
          // var catJson = { "Products": [{ "Country": "Cloud Architecture", "Profit": 100, "Forcast": 200, "Target": 20, "Revenue": 20, "Revenue2": 20, "Revenue3": 512 }, { "Country": "Data to Value", "Profit": 159, "Forcast": 140, "Target": 150, "Revenue": 30, "Revenue2": 100, "Revenue3": 303 }, { "Country": "Security", "Profit": 129, "Forcast": 120, "Target": 100, "Revenue": 200, "Revenue2": 222, "Revenue3": 263 }, { "Country": "Application development and UI", "Profit": 58, "Forcast": 60, "Target": 80, "Revenue": 116, "Revenue2": 152, "Revenue3": 113 }, { "Country": "Multitenancy", "Profit": 149, "Forcast": 120, "Target": 150, "Revenue": 249, "Revenue2": 292, "Revenue3": 443 }, { "Country": "Integration", "Profit": 49, "Forcast": 60, "Target": 55, "Revenue": 1449, "Revenue2": 242, "Revenue3": 243 }] };
          var oModel = new JSONModel(xx);
          var oDataset = new FlattenedDataset(oVizFrame.dataset);

          vizFrame.setVizProperties(oVizFrame.properties);
          vizFrame.setDataset(oDataset);
          vizFrame.setModel(oModel);
          this._addPieFeedItems(vizFrame, oVizFrame.feedItems);
          vizFrame.setVizType(oVizFrame.type);
        } catch (error) {
          console.error(error);
        }
      },
      /**
       * Adds the passed feed items to the passed Viz Frame.
       *
       * @private
       * @param {sap.viz.ui5.controls.VizFrame} vizFrame Viz Frame to add feed items to
       * @param {Object[]} feedItems Feed items to add
       */
      _addPieFeedItems: function (vizFrame, feedItems) {
        for (var i = 0; i < feedItems.length; i++) {
          vizFrame.addFeed(new FeedItem(feedItems[i]));
        }
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
        // MessageToast.show(projID);
      },

      isNavigated: function (sNavigatedItemId, sItemId) {
        // MessageToast.show(sItemId);
        return sNavigatedItemId === sItemId;
      },

      onBeforeRendering: async function () {


      },

      onAfterRendering: async function () {

        console.log(ALL_PROJECTS_EP);

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

          /**
           * [TODO]
           * Method to access DOM of the control to remove No Wrap style of the text control
           * Issue: DOM is not loaded yet.
           */
          // const oListItem = sap.ui.getCore().byId("container-chat---App--idList");
          // const aItems = oListItem.getItems(); // Get an array of items
          // aItems.forEach(function (oItem) { // Use forEach
          //   const oObjectAttribute = oItem.getAggregation("attributes")[0];
          //   console.log(oObjectAttribute);

          //   const oText = oObjectAttribute.getAggregation("_textControl");
          //   console.log(oText);
          //   console.log(oText.getDomRef());
          //   oText.getDomRef().classList.remove("sapMTextNoWrap");
          // });
        } catch (error) {
          console.error(error);
        }

        var catVizFrame = sap.ui.getCore().byId("container-chat---App--piechartContainerVizFrame");
        // console.log(catVizFrame);
        // catVizFrame.setModel(catJsonModel, "cat");

        // var FIORI_LABEL_FORMAT_2 = "__UI5__FloatMaxFraction2";
        var oPopOverPie = sap.ui.getCore().byId("container-chat---App--idPopOverPie");
        console.log(oPopOverPie);
        oPopOverPie.connect(catVizFrame.getVizUid());

        var colVizFrame = sap.ui.getCore().byId("container-chat---App--chartContainerVizFrame");
        // console.log(catVizFrame);
        // catVizFrame.setModel(catJsonModel, "cat");

        // var FIORI_LABEL_FORMAT_2 = "__UI5__FloatMaxFraction2";
        var oPopOverCol = sap.ui.getCore().byId("container-chat---App--idPopOverCol");
        console.log(oPopOverCol);
        oPopOverCol.connect(colVizFrame.getVizUid());
      },

      onSearchPress: function (oEvent) {
        this.byId("pageContainer").to(this.getView().createId("page2"));
        this.byId("sideNavigation").setSelectedKey("page2");
      },
      onKBPress: function (oEvent) {
        this.byId("pageContainer").to(this.getView().createId("page6"));
        this.byId("sideNavigation").setSelectedKey("page6");
      },
      onCockpitPress: function (oEvent) {
        this.byId("pageContainer").to(this.getView().createId("page3"));
        this.byId("sideNavigation").setSelectedKey("page3");
      },

      onItemSelect: function (oEvent) {
        var oItem = oEvent.getParameter("item");
        this.byId("pageContainer").to(this.getView().createId(oItem.getKey()));

        /** Phone ONLY */
        var rangeName = Device.media.getCurrentRange("StdExt").name;
        if (rangeName == "Phone") {
          var oToolPage = this.byId("toolPage");
          var bSideExpanded = oToolPage.getSideExpanded();

          this._setToggleButtonTooltip(bSideExpanded);

          oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
        }
        console.log(rangeName);

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
        // return parseSimilarityToPercentage(value);
        return Math.round(value * 10000) / 10000;

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


      formatPercentValue: function (value) {
        // return parseSimilarityToPercentage(value);
        return Math.round(value * 100);

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

      formatDisplayValue: function (value) {
        // return parseSimilarityToPercentage(value);
        return Math.round(value * 100) + "%";

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
            // MessageToast.show("Screen width is corresponding to Large Desktop");
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
            // MessageToast.show("Screen width is corresponding to Desktop");
            break;

          // Tablet - Portrait
          case "Tablet":
            this.byId("productName").setVisible(true);
            this.byId("secondTitle").setVisible(true);
            // this.byId("searchButton").setVisible(true);
            // this.byId("searchField").setVisible(false);
            this.byId("spacer").setVisible(false);
            // MessageToast.show("Screen width is corresponding to Tablet");
            break;

          case "Phone":
            // this.byId("searchButton").setVisible(true);
            this.byId("sideNavigationToggleButton").setVisible(true);
            this.byId("sideNavigation").setVisible(true);
            // this.byId("searchField").setVisible(false);
            this.byId("spacer").setVisible(false);
            this.byId("productName").setVisible(true);
            // this.byId("productName").setTitleStyle("{ fontSize: '0.2em'}");
            console.log(this.byId("productName").getTitleStyle());
            // this.byId("productName").setStyle("fontSize", "20px");
            this.byId("productName").setTitleStyle("H6");
            this.byId("secondTitle").setVisible(false);
            this.byId("profile").setVisible(false);
            // MessageToast.show("Screen width is corresponding to Phone");
            console.log(document.getElementById("container-chat---App--demoGrid-item-container-chat---App--pieCard"));
            // document.getElementById("container-chat---App--demoGrid-item-container-chat---App--pieCard").style.gridArea="span 7 / span 5";
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
