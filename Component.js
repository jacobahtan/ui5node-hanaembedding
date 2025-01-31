"use strict";

sap.ui.define(["sap/ui/core/UIComponent", "sap/ui/model/json/JSONModel", "sap/f/library", "sap/f/FlexibleColumnLayoutSemanticHelper"], function (UIComponent, JSONModel, library, FlexibleColumnLayoutSemanticHelper) {

  var LayoutType = library.LayoutType;

  return UIComponent.extend("chat.Component", {
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"],
    },

    /**
     * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
     * @public
     * @override
     */
    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      this.getRouter().initialize();
      this.getModel("ui").setProperty("/", {
        sessionId: window.crypto.randomUUID(),
        enabled: true,
        busy: false,
      });
      this.getModel("chat").setProperty("/", []);
      var oProductsModel = new JSONModel(sap.ui.require.toUrl("chat/mockdata/products.json"));
      oProductsModel.setSizeLimit(1000);
      this.setModel(oProductsModel, "products");
    },

    /**
     * Returns an instance of the semantic helper
     * @returns {sap.f.FlexibleColumnLayoutSemanticHelper} An instance of the semantic helper
     */
    getHelper: function () {
      var oFCL = this.getRootControl().byId("fcl"),
        oParams = new URLSearchParams(window.location.search),
        oSettings = {
          defaultTwoColumnLayoutType: LayoutType.TwoColumnsMidExpanded,
          initialColumnsCount: oParams.get("initial"),
          maxColumnsCount: oParams.get("max")
        };

      return FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings);
    }
  });
});
