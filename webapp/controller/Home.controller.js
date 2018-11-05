sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (Controller) {
	"use strict";

	return Controller.extend("ey.util.pinaki.DataImport.controller.Home", {
		toggleSidebar: function (oEvent) {
			var toolPage = oEvent.getSource().getParent().getParent().getParent();
			toolPage.setSideExpanded(!toolPage.getSideExpanded());
		},
		navToRoute: function (route) {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo(route);
		},
		nav2InitialSettings : function(){
			this.navToRoute('InitialSettings');
		},
		nav2DataExplorer : function(){
			this.navToRoute('DataExplorer');
		}
	});
});