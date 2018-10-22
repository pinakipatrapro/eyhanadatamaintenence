sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"ey/util/pinaki/DataImport/util/Constant",
	"ey/util/pinaki/DataImport/util/xlsxfullmin",
	"ey/util/pinaki/DataImport/util/JSONToTable",
	"ey/util/pinaki/DataImport/util/RawDataValidator",
	'sap/m/MessageBox'
], function (Controller, constant, XLLIB, JSONToTable, RawDataValidator, MessageBox) {
	"use strict";

	return Controller.extend("ey.util.pinaki.DataImport.controller.TableCreator", {
		navToRoute: function (route) {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo(route);
		},
		nav2DataUploadMapping: function () {
			this.createTable().then(function (e) {
				this.getView().getModel().setProperty('/UploadedData', this.getView().getModel().getData());
				this.getView().getModel().setProperty('/selectedTableTechnicalName', this.getView().getModel().getProperty('/selectedTable'));
				this.navToRoute('DataUploadMapping');
			}.bind(this));
		},
		onAfterRendering: function () {
			this.getDatatypesCurrentlyInUse().then(function (e) {
				this.getView().getModel().setProperty('/tableDataTypes', e);
				this.createDataForTableMetadata();
			}.bind(this));

		},
		createTableMetadataTable: function () {
			if (sap.ui.getCore().byId('idCreateTablePreview') !== undefined) {
				sap.ui.getCore().byId('idCreateTablePreview').destroy();
			}
			var oTable = new JSONToTable('idCreateTablePreview', this.getView().getModel().getProperty('/currentSheetData'), true);
			this.getView().byId('idCreateTable').addContent(oTable.getTable());
		},
		createDataForTableMetadata: function () {
			var sampleData = this.getView().getModel().getProperty('/currentSheetData')[0];
			var aColumns = [];
			Object.keys(sampleData).forEach(function (e) {
				aColumns.push({
					colName: e,
					dataType: 'VARCHAR',
					dimension: '100',
					key: false,
					notNull: false,
					comment: ''
				})
			});
			this.getView().getModel().setProperty('/tableMetadata', aColumns);
		},
		getDatatypesCurrentlyInUse: function () {
			return new Promise(function (resolve, reject) {
				var oModel = this.getView().getModel('viewModel');
				oModel.read('/Artifacts', {
					urlParameters: {
						$select: 'DATA_TYPE_NAME',
						$format: 'json'
					},
					success: function (data) {
						resolve(data.results)
					}.bind(this)
				});
			}.bind(this))
		},
		createTable: function () {
			return new Promise(function (resolve, reject) {
				var tableData = this.getView().getModel().getProperty('/tableMetadata');
				var tableSettings = this.getView().getModel().getProperty('/initialSettings');
				$.ajax({
					type: "POST",
					url: "/eyhcp/Pinaki/DataMaintenance/Scripts/TableCreator.xsjs",
					data: JSON.stringify({
						data: tableData,
						settings: tableSettings 
					}),
					success: function (data) {
						resolve(data);
					},
					error: function (e) {
						reject(e);
					},
				});
			}.bind(this))
		}
	});

});