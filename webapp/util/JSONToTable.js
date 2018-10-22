sap.ui.define([
	"sap/ui/table/Table",
	"sap/ui/table/Column",
	"sap/ui/base/Object",
	"ey/util/pinaki/DataImport/util/RawDataValidator"
], function (Table, Column, BaseObject, RawDataValidator) {
	"use strict";

	var tableConstructor = function (id, data,enabled) {
		this._table = new Table(id, {
			selectionMode : enabled ? 'Multi':'None',
			rows: "{/tableData}",
			threshold: 99999,
			showColumnVisibilityMenu: true,
			alternateRowColors: true,
			visibleRowCount: 20,
			enableColumnFreeze: true,
			enableCellFilter: true,
			toolbar: new sap.m.Toolbar({
				content: [
					new sap.m.Label({
						text: 'Data from uploaded sheet',
						design: 'Bold'
					}),
					new sap.m.ToolbarSpacer(),
					new sap.m.Button({
						visible : enabled,
						icon: 'sap-icon://add',
						press: function (oEvent) {
							var oTable = oEvent.getSource().getParent().getParent();
							var model = oTable.getModel();
							var path = sap.ui.getCore().byId('idUploadDataPreview').getBinding('rows').sPath;
							var data = model.getProperty(path);
							var blankObject = {};
							Object.keys(data[0]).forEach(function (e) {
								blankObject[e] = '';
							})
							data.push(blankObject);
							model.setProperty(path, data);
							this._getParentView(oTable).getModel('idUploadDataModel').setProperty('/uploadedRawDataQuality', new RawDataValidator(data).validateData());
						}.bind(this)
					}),
					new sap.m.Button({
						visible : enabled,
						icon: 'sap-icon://delete',
						press: function (oEvent) {
							var oTable = oEvent.getSource().getParent().getParent();
							var model = oTable.getModel();
							var path = sap.ui.getCore().byId('idUploadDataPreview').getBinding('rows').sPath;
							var aSelectedIndices = oTable.getSelectedIndices();
							var data = model.getProperty(path);
							aSelectedIndices.forEach(function (e) {
								if (e > -1) {
									data.splice(e, 1);
								}
							}) 
							model.setProperty(path, data);
							new RawDataValidator(data).validateData();
							oTable.removeSelectionInterval(0, 9999999);
							this._getParentView(oTable).getModel('idUploadDataModel').setProperty('/uploadedRawDataQuality', new RawDataValidator(data).validateData());
						}.bind(this)
					})
				]
			})
		});
		this._getObjectKeys = function (data) {
			return Object.keys(data[0]);
		};
		this._localModel = new sap.ui.model.json.JSONModel({
			tableData: data
		});
		this._getParentView = function (b) {
			while (b && b.getParent) {
				b = b.getParent();
				if (b instanceof sap.ui.core.mvc.View) {
					break;
				}
			}
			return b;
		};
		this.getTable = function () {
			this._table.addStyleClass('sapUiSizeCompact');
			this._table.setModel(this._localModel);
			this._table.removeAllColumns();
			var aKey = Object.keys(this._localModel.getProperty('/tableData')[0]);
			aKey.forEach(function (e) {
				var input = new sap.m.Input({
					value: "{" + e + "}",
					editable : enabled
				});
				var column = new Column({
					label: new sap.m.Label({
						text: e
					}),
					sortProperty: e,
					filterProperty: e,
					showFilterMenuEntry: true,
					showSortMenuEntry: true,
					template: input
				});
				this._table.addColumn(column);
			}.bind(this));
			return this._table;
		};

	};

	var oTable = BaseObject.extend("pinaki.ey.CIO.CIOControlPanel.api.JSONToTable", {
		constructor: tableConstructor
	});
	return oTable;
});