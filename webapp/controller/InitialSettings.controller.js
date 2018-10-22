sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"ey/util/pinaki/DataImport/util/Constant",
	"ey/util/pinaki/DataImport/util/xlsxfullmin",
	"ey/util/pinaki/DataImport/util/JSONToTable",
	"ey/util/pinaki/DataImport/util/RawDataValidator",
	'sap/m/MessageBox'
], function (Controller,constant,XLLIB,JSONToTable,RawDataValidator,MessageBox) {
	"use strict";

	return Controller.extend("ey.util.pinaki.DataImport.controller.InitialSettings", {
		onBeforeRendering : function(){
			this.getView().getModel().setProperty('/initialSettings',constant.intialSettings);
			var odataModel = this.getView().getModel('viewModel');
			odataModel.setSizeLimit(999999);
			odataModel.attachBatchRequestSent(function(){
				this.getView().setBusy(true);
			}.bind(this));
			odataModel.attachBatchRequestCompleted(function(){
				this.getView().setBusy(false);
			}.bind(this))
		},
		onAfterRendering: function () {
			var fileUploader = this.getView().byId("fileUploader").getId();
			this.attachEventOnFileUpload(fileUploader);
		},
		navToRoute: function (route) {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo(route);
		},
		nav2DataUploadMapping : function(){
			this.getView().getModel().setProperty('/UploadedData',this.getView().getModel().getData());
			this.getView().getModel().setProperty('/selectedTableTechnicalName',this.getView().getModel().getProperty('/selectedTable'));
			this.navToRoute('DataUploadMapping');
		},
		nav2TableCreation : function(){
			this.navToRoute('TableCreator');
		},
		attachEventOnFileUpload: function (fileUploader) {
			$('#' + fileUploader).change(function (event) {
				if (event.target.value.length > 0) {   //Ensure Selection
					this.getView().setBusyIndicatorDelay(0).setBusy(true);
				}
				setTimeout(function () {
					var input = event.target;
					var reader = new FileReader();
					reader.onload = function () {
						var fileData = reader.result;
						var wb = XLSX.read(fileData, {
							type: 'binary'
						});
						if(!wb.Workbook){
							MessageBox.error('Please upload data in xls format only');
							this.getView().setBusyIndicatorDelay(0).setBusy(false);
							return;
						}
						var jsonData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
						this.getView().getModel().setProperty('/uploadedFileSheets', wb.Workbook.Sheets);
						this.getView().getModel().setProperty('/workbook', wb);
						this.getView().getModel().setProperty('/currentSheetData', jsonData);
						this.getView().getModel().setProperty('/uploadedRawDataQuality', new RawDataValidator(jsonData).validateData());

						// this.getView().byId('idSelectSheetUploadData').setVisible(true);
						// this.getView().byId('rawDataQualityHeader').setVisible(true);
						this.openTableViewer();
						this.getView().setBusy(false);
					}.bind(this);
					reader.readAsBinaryString(input.files[0]);
				}.bind(this), 100);
			}.bind(this));
		},
		openTableViewer: function () {
			if (sap.ui.getCore().byId('idUploadDataPreview') !== undefined) {
				sap.ui.getCore().byId('idUploadDataPreview').destroy();
			}
			var oTable = new JSONToTable('idUploadDataPreview', this.getView().getModel().getProperty('/currentSheetData'),true);
			this.getView().byId('idUploadExcelData').addContent(oTable.getTable());
		},
		onSheetSelectionChange: function (oEvent) {
			var selectedKey = oEvent.getParameter('selectedItem').getKey();
			var oModel = this.getView().getModel();
			var wb = oModel.getProperty('/workbook', wb);
			var jsonData = XLSX.utils.sheet_to_json(wb.Sheets[selectedKey]);
			this.getView().getModel().setProperty('/currentSheetData', jsonData);
			this.getView().getModel().setProperty('/uploadedRawDataQuality', new RawDataValidator(jsonData).validateData());
			this.openTableViewer();
		},
		onSchemaSelectionChange : function(){
			var tableSelector = this.getView().byId('idTableSelect');
			var selectedKey = this.getView().getModel().getProperty('/initialSettings/schemaName');
			tableSelector.bindAggregation('items',
				{
					path : 'viewModel>/Artifacts',
					template : new sap.ui.core.Item({text:'{viewModel>TABLE_NAME}',key:'{viewModel>TABLE_NAME}'}),
					filters : [
						new sap.ui.model.Filter('SCHEMA_NAME','EQ',selectedKey)	
					],
					parameters : {
						select : 'TABLE_NAME'
					}
				}
			);
			tableSelector.setModel(this.getView().getModel('viewModel'));
			tableSelector.setModel(this.getView().getModel());
		}
	});

});