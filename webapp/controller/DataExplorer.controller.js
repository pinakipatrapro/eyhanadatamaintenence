sap.ui.define([
	"sap/ui/core/mvc/Controller",
	'sap/m/MessageBox',
	"ey/util/pinaki/DataImport/util/Constant",
	"ey/util/pinaki/DataImport/util/JSONToTable",
	"ey/util/pinaki/DataImport/util/MappingValidator",
	"ey/util/pinaki/DataImport/util/DataUploader",
	"sap/ui/export/Spreadsheet"
], function (Controller, MessageBox, constant, JSONToTable, MappingValidator, DataUploader,Spreadsheet) {
	"use strict";
	return Controller.extend("ey.util.pinaki.DataImport.controller.DataExplorer", {
		onBeforeRendering: function () {
			constant.intialSettings.existingTable = true;
			this.getView().getModel().setProperty('/initialSettings', constant.intialSettings);
			var odataModel = this.getView().getModel('viewModel');
			odataModel.setSizeLimit(999999);
			odataModel.attachBatchRequestSent(function () {
				this.getView().setBusy(true);
			}.bind(this));
			odataModel.attachBatchRequestCompleted(function () {
				this.getView().setBusy(false);
			}.bind(this))
		},
		onSchemaSelectionChange: function () {
			var tableSelector = this.getView().byId('idTableSelect');
			var selectedKey = this.getView().getModel().getProperty('/initialSettings/schemaName');
			tableSelector.bindAggregation('items', {
				path: 'viewModel>/Artifacts',
				template: new sap.ui.core.Item({
					text: '{viewModel>TABLE_NAME}',
					key: '{viewModel>TABLE_NAME}'
				}),
				filters: [
					new sap.ui.model.Filter('SCHEMA_NAME', 'EQ', selectedKey)
				],
				parameters: {
					select: 'TABLE_NAME'
				}
			});
			tableSelector.setModel(this.getView().getModel('viewModel'));
			tableSelector.setModel(this.getView().getModel());
		},
		onTableSelectionChange: function () {
			var schemaName = this.getView().getModel().getProperty('/initialSettings/schemaName');
			var tableName = this.getView().getModel().getProperty('/initialSettings/tableName');
			var totalTableName = '"' + schemaName + '"."' + tableName + '"';
			this.queryData(totalTableName);
		},
		queryData: function (tableName) {
			var that = this;
			that.getView().getModel().setData({
				tableData: null
			}, true);
			this.getView().setBusy(true);
			$.ajax({
				url: "/eyhcp/CIO/GenerateData/Scripts/TableDisplay.xsjs?tableName=" + tableName,
				cache: false,
				success: function (data) {
					that.getView().setBusy(false);
					that.getView().getModel().setData({
						tableData: data
					}, true);
					that.openTableViewer();
				}
			});
		},
		openTableViewer: function () {
			if (sap.ui.getCore().byId('idTableDataPreview') !== undefined) {
				sap.ui.getCore().byId('idTableDataPreview').destroy();
			}
			var oTable = new JSONToTable('idTableDataPreview', this.getView().getModel().getProperty('/tableData'), false,{
				title : 'Table Data'	
			});
			this.getView().byId('idDataExplorer').addContent(oTable.getTable());
		},
		createColumnConfig: function (aData) {
			var aColumns = [];
			Object.keys(aData[0]).forEach(function (e) {
				aColumns.push({
					label: e,
					property: e
				});
			});
			return aColumns;
		},
		onExport: function () {
			var aCols, aData, oSettings;
			aData = this.getView().getModel().getProperty("/tableData");
			aCols = this.createColumnConfig(aData);

			oSettings = {
				workbook: {
					columns: aCols
				},
				dataSource: aData,
				context : {
					sheetName: this.getView().getModel().getProperty("/initialSettings/tableName")
				},
				fileName: this.getView().getModel().getProperty("/initialSettings/tableName")
			};

			new Spreadsheet(oSettings)
				.build()
				.then(function () {
					MessageToast.show("Spreadsheet export has finished");
				});
		}
	});
});