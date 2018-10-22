sap.ui.define([
	"sap/ui/core/mvc/Controller",
	'sap/m/MessageBox',
	"ey/util/pinaki/DataImport/util/JSONToTable",
	"ey/util/pinaki/DataImport/util/MappingValidator",
	"ey/util/pinaki/DataImport/util/DataUploader"
], function (Controller, MessageBox, JSONToTable, MappingValidator, DataUploader) {
	"use strict";
	return Controller.extend("ey.util.pinaki.DataImport.controller.DataUploadMapping", {
		onInit: function () {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("DataUploadMapping").attachPatternMatched(this._onRouteMatched, this);
		},
		navToExcelUpload: function () {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("InitialSettings");
		},
		_onRouteMatched: function (oEvent) {
			var isValidContext = ' ';
			if (!!this.getView().getModel().getData().UploadedData) {
				if (!!this.getView().getModel().getData().UploadedData.currentSheetData)
					isValidContext = 'X';
			}
			if (isValidContext == ' ') {
				setTimeout(function () {
					MessageBox.error('Please upload excel data first', {
						onClose: function (oAction) {
							var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
							oRouter.navTo("InitialSettings");
						}.bind(this)
					});
				}.bind(this), 1000);
			} else {
				this.clearData();
				this.getView().getModel().setProperty('/UploadedTableData', this.getView().getModel().getData().UploadedData.currentSheetData);
				this.setDBTableColumns();
				this.setExcelTableColumns(this.getView().getModel().getProperty('/UploadedTableData')[0]);
				this.filterList();
			}
		},
		clearData: function () {
			this.getView().getModel().setProperty('/dbColumns', null);
			this.getView().getModel().setProperty('/uploadedExcelColumns', null);
			this.getView().getModel().setProperty('/mappedColumns', null);
			this.getView().getModel().setProperty('/UploadedTableData', null);
		},
		setExcelTableColumns: function (obj) {
			var aKeys = [];
			Object.keys(obj).forEach(function (e) {
				aKeys.push({
					name: e
				});
			});
			this.getView().getModel().setProperty('/uploadedExcelColumns', aKeys);
		},
		setDBTableColumns: function () {
			var oModel = this.getView().getModel('viewModel');
			var localModel = this.getView().getModel();
			oModel.read('/Artifacts', {
				filters: [
							new sap.ui.model.Filter("TABLE_NAME", sap.ui.model.FilterOperator.EQ, localModel.getProperty('/initialSettings/tableName')),
							new sap.ui.model.Filter("SCHEMA_NAME", sap.ui.model.FilterOperator.EQ, localModel.getProperty('/initialSettings/schemaName'))
						],
				success: function (data) {
					this.getView().getModel().setProperty('/dbColumns', data.results);
					this.createInitialPreviewTable(data.results);
				}.bind(this)
			});
		},
		filterList: function () {
			var list = this.getView().byId('idTableColumnList');
			var uploadList = this.getView().byId('idUploadedDataColumns');
			var mappingList = this.getView().byId('idTableMappingList');

			list.bindAggregation("items", {
				path: '/dbColumns',
				sorter: {
					path: 'POSITION'
				},
				template: this.creatStandardListItem('COLUMN_NAME', 'DATA_TYPE_NAME')
			});

			uploadList.bindAggregation("items", {
				path: '/uploadedExcelColumns',
				sorter: {
					path: 'POSITION'
				},
				template: this.creatStandardListItem('name', '')
			});
			mappingList.bindAggregation("items", {
				path: '/mappedColumns',
				template: this.createCustomListItem('from', 'to')
			});
		},
		creatStandardListItem: function (title, info) {
			var customListItem = new sap.m.StandardListItem({
				title: '{' + title + '}',
				info: info.length > 0 ? '{' + info + '}' : ''
			});
			return customListItem;
		},
		createCustomListItem: function (title, info) {
			var customListItem = new sap.m.CustomListItem({
				content: [
					new sap.ui.core.Icon({
						src: "sap-icon://syntax",
						color: '#1de202',
						press: [this.openTransformationDialog, this]
					}).addStyleClass('sapUiTinyMarginBeginEnd'),
					new sap.m.Label({
						text: '{from} ({datatype})'
					}).addStyleClass('sapUiTinyMarginBeginEnd'),
					new sap.ui.core.Icon({
						src: 'sap-icon://arrow-right'
					}).addStyleClass('sapUiTinyMarginBeginEnd'),
					new sap.m.Label({
						text: '{to}'
					}).addStyleClass('sapUiTinyMarginBeginEnd')
				]
			});
			return customListItem;
		},
		onDroppedMapping: function (oEvent) {
			var draggedControl = oEvent.getParameter('draggedControl');
			var droppedControl = oEvent.getParameter('droppedControl');

			draggedControl.setVisible(false);
			droppedControl.setVisible(false);

			var draged = draggedControl.getProperty('title');
			var fromDatatype = draggedControl.getProperty('info')
			var dropped = droppedControl.getProperty('title');

			var aExistingMappings = [];

			if (this.getView().getModel().getProperty('/mappedColumns')) {
				aExistingMappings = this.getView().getModel().getProperty('/mappedColumns');
			}
			aExistingMappings.push({
				from: draged,
				to: dropped,
				datatype: fromDatatype,
				fromControl: draggedControl,
				toControl: droppedControl
			});
			this.getView().getModel().setProperty('/mappedColumns', aExistingMappings);
			this.onMappingUpdate();
		},
		onMappingsDeleted: function (oEvent) {
			oEvent.getParameter('listItem').getBindingContext().getProperty('toControl').setVisible(true);
			oEvent.getParameter('listItem').getBindingContext().getProperty('fromControl').setVisible(true);
			var bindingPath = oEvent.getParameter('listItem').getBindingContext().sPath;
			var index = bindingPath[bindingPath.length - 1];
			//Clear Mapping Columns
			var aExistingMappings = [];

			if (this.getView().getModel().getProperty('/mappedColumns')) {
				aExistingMappings = this.getView().getModel().getProperty('/mappedColumns');
			}
			aExistingMappings.splice(index, 1);
			this.getView().getModel().setProperty('/mappedColumns', aExistingMappings);
			this.onMappingUpdate();
		},
		createInitialPreviewTable: function (columns) {
			var previewTable = [];
			var tableRow = {};
			columns.forEach(function (e) {
				tableRow[e.COLUMN_NAME] = '';
			});
			previewTable.push(tableRow);
			if (sap.ui.getCore().byId('idMappedDataPreview') !== undefined) {
				sap.ui.getCore().byId('idMappedDataPreview').destroy();
			}
			var oTable = new JSONToTable('idMappedDataPreview', previewTable, false);
			this.getView().byId('idDataPreviewTable').addContent(oTable.getTable());
			this.getView().getModel().setProperty('/mappingsPreviewTable', previewTable);
		},
		onMappingUpdate: function () {

			var mappings = this.getView().getModel().getProperty('/mappedColumns');
			var sourceData = this.getView().getModel().getProperty('/UploadedData/currentSheetData');
			var aPreviewTableData = this.getView().getModel().getProperty('/mappingsPreviewTable');
			var oPreviewTableData = aPreviewTableData[0];
			Object.keys(oPreviewTableData).forEach(function (v) {
				oPreviewTableData[v] = '';
			})
			var oPreviewTableDataCopy = oPreviewTableData;
			aPreviewTableData = [];

			sourceData.forEach(function (e) {
				oPreviewTableDataCopy = $.extend({}, oPreviewTableData);
				for (var i = 0; i < mappings.length; i++) {
					oPreviewTableDataCopy[mappings[i].from] = e[mappings[i].to];
				}
				aPreviewTableData.push(oPreviewTableDataCopy);
			});
			if (mappings.length < 0) {
				this.createInitialPreviewTable(this.getView().getModel().getProperty('/dbColumns'))
			} else {
				if (sap.ui.getCore().byId('idMappedDataPreview') !== undefined) {
					sap.ui.getCore().byId('idMappedDataPreview').destroy();
				}
				var oTable = new JSONToTable('idMappedDataPreview', aPreviewTableData, false);
				this.getView().byId('idDataPreviewTable').addContent(oTable.getTable());
			}
			this.getView().getModel().setProperty('/mappingsPreviewTable', aPreviewTableData);
			this.createDateTransformationLogic();
		},
		validateMappings: function () {
			var columns = this.getView().getModel().getProperty('/dbColumns');
			var mappingData = this.getView().getModel().getProperty('/mappingsPreviewTable')
			var validator = new MappingValidator(mappingData, columns);
			var validationMessages = validator.validateData();
			this.getView().getModel().setProperty('/uploadValidationMessages', validationMessages);
			if (validationMessages.length > 0) {
				this.openPopOverMessage();
			}
			return validationMessages;
		},
		openTransformationDialog: function (oEvent) {
			var sourceObject = oEvent.getSource().getBindingContext().getObject();
			var dialog = new sap.m.Dialog({
				title: 'Create transformation logic',
				content: [
					new sap.m.MessageStrip({
						text: 'Transformation actions are not reversible. \n To reset, please delete and re do the mappings',
						type: 'Warning'
					}),
					new sap.m.InputListItem({
						visible: (sourceObject.fromControl.getBindingContext().getObject().DATA_TYPE_NAME == 'DATE'),
						label: "Date format in sheets",
						content: new sap.m.ComboBox({
							placeholder: 'Ex. yyy-mm-dd',
							items: [
								new sap.ui.core.Item({
									text: 'mm-dd-yyyy'
								}),
								new sap.ui.core.Item({
									text: 'dd-mm-yyyy'
								}),
								new sap.ui.core.Item({
									text: 'mm/dd/yyyy'
								}),
								new sap.ui.core.Item({
									text: 'dd/mm/yyyy'
								})
							]
						})
					})
				],
				buttons: [
					new sap.m.Button({
						text: 'Ok',
						press: function (oEvent) {
							var dateFormat = oEvent.getSource().getParent().getContent()[1].getContent()[0].getValue();
							if (dateFormat.length > 0) {
								sourceObject['dateTransformationFormat'] = dateFormat;
							}
							oEvent.getSource().getParent().close();
							this.createDateTransformationLogic();
						}.bind(this)
					})
				]
			});
			dialog.open();
		},
		openPopOverMessage: function () {
			var messageAnchor = this.getView().byId('idMessageButton');
			var messageView = new sap.m.MessageView({
				groupItems: true,
				items: {
					path: '/uploadValidationMessages',
					template: new sap.m.MessageItem({
						title: '{description}',
						description: '{text}',
						type: '{state}',
						groupName: '{group}'
					})
				}
			});
			messageView.setModel(this.getView().getModel());
			var popover = new sap.m.Popover({
				placement: 'Top',
				resizable: true,
				title: 'Data Errors',
				content: messageView
			});

			popover.openBy(messageAnchor);
		},
		createDateTransformationLogic: function () {
			var aMappings = this.getView().getModel().getProperty('/mappedColumns');
			var data = this.getView().getModel().getProperty('/mappingsPreviewTable');
			for (var i = 0; i < aMappings.length; i++) {
				if (aMappings[i].dateTransformationFormat) {
					if (aMappings[i].dateTransformationFormat.length > 0) {
						var dateFormat = aMappings[i].dateTransformationFormat;
						if (dateFormat.indexOf('/') > 0) {
							var aDateElements = dateFormat.split('/');
						} else {
							var aDateElements = dateFormat.split('-');
						}
						data.forEach(function (e) {
							var inDate = e[aMappings[i].from];
							if (inDate.indexOf('/') > 0) {
								var aInDate = inDate.split('/');
							} else {
								var aInDate = inDate.split('-');
							}
							if (aInDate.length > 2) {
								for (var j = 0; j < aInDate.length; j++) {
									if (aDateElements[j].indexOf('y') > -1) {
										var y = aInDate[j].toLocaleLowerCase().padStart(4, "20");
									} else if (aDateElements[j].indexOf('m') > -1) {
										var m = aInDate[j].toLocaleLowerCase().padStart(2, "0");
									} else if (aDateElements[j].indexOf('d') > -1) {
										var d = aInDate[j].toLocaleLowerCase().padStart(2, "0");
									}
								}
								e[aMappings[i].from] = y + m + d;
							}
						})
					}
				}
			}
			sap.ui.getCore().byId('idMappedDataPreview').getModel().refresh();

		},
		mapByName: function () {
			var aParentControlListItems = this.getView().byId('idTableColumnList').getItems();
			var aChildControlListItems = this.getView().byId('idUploadedDataColumns').getItems();
			var aExistingMappings = [];
			for (var i = 0; i < aParentControlListItems.length; i++) {
				var from = aParentControlListItems[i].getProperty('title');
				for (var j = 0; j < aChildControlListItems.length; j++) {
					var to = aChildControlListItems[j].getProperty('title');
					if (from === to) {
						aExistingMappings.push({
							from: from,
							to: to,
							datatype: aParentControlListItems[i].getProperty('info'),
							fromControl: aParentControlListItems[i],
							toControl: aChildControlListItems[j]
						});
						aChildControlListItems[j].setVisible(false);
						aParentControlListItems[i].setVisible(false);
					}
				}
			}
			this.getView().getModel().setProperty('/mappedColumns', aExistingMappings);
			this.onMappingUpdate();
		},
		mapToConstant: function () {
			var data = this.getView().getModel().getProperty('/mappingsPreviewTable');
			var aParentControlListItem = this.getView().byId('idTableColumnList').getSelectedItem();
			if (!aParentControlListItem) {
				sap.m.MessageToast.show('Please select an item first');
				return;
			};
			var key = aParentControlListItem.getProperty('title');
			var dialog = new sap.m.Dialog({
				title: 'Enter constant value',
				content: [
					new sap.m.MessageStrip({
						text: 'Updating the mappings will reset the constants value.\n Please do this activity in the later stages once the mapping is done',
						type: 'Warning'
					}),
					new sap.m.Input({
						placeholder: 'Enter Value Here'
					})
				],
				buttons: [
					new sap.m.Button({
						text: 'Ok',
						press: function (oEvent) {
							data.forEach(function (e) {
								e[key] = oEvent.getSource().getParent().getContent()[1].getValue();
							});
							this.getView().getModel().setProperty('/mappingsPreviewTable', data);
							sap.ui.getCore().byId('idMappedDataPreview').getModel().refresh();
							oEvent.getSource().getParent().close();
							this.getView().byId('idTableColumnList').removeSelections();
						}.bind(this)
					})
				]
			});
			dialog.open();
		},
		uploadData: function () {
			var that = this;
			var isValid = this.validateMappings().length == 0;
			if (!isValid) {
				return;
			};
			var data = this.getView().getModel().getProperty('/mappingsPreviewTable');
			var tableName = "\""+this.getView().getModel().getProperty('/initialSettings/schemaName') + '"."'+
							this.getView().getModel().getProperty('/initialSettings/tableName')+"\"";

			//Ask Delta or Full Load
			sap.m.MessageBox.confirm(
				"How do you want to load the data", {
					actions: ["Full Load", "Delta Load"],
					onClose: function (sAction) {
						var mode = sAction == "Full Load" ? 'FL':'DL';
						var dataUploader = new DataUploader(data, tableName,mode);
						var uploadPromise = dataUploader.execute();
						that.getView().setBusy(true);
						uploadPromise.then(function (e) {
							sap.m.MessageToast.show(e.message);
							that.getView().setBusy(false);
							// this.navToDisplayTable(tableName);
						}.bind(that));
					}
				}
			);

		},
		navToDisplayTable: function (tableName) {
			var tableName = tableName;
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
			var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
				target: {
					semanticObject: "cioadmin",
					action: "Display&/tableViewer/" + btoa(tableName)
				}
			})) || "";
			oCrossAppNavigator.toExternal({
				target: {
					shellHash: hash
				}
			}); // navigate to Supplier application
		},

	});
});