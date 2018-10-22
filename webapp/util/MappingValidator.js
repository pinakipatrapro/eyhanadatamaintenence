sap.ui.define([
	"sap/ui/base/Object"
], function (BaseObject) {
	"use strict";

	var mapingsValidator = function (jsonData, columns) {
		this._jsonData = jsonData;
		this._columns = columns;
		this._messages = []; // Format {columnsName:'CC1',text:'Null Error',status : [{state:"Error",text:"ABC"}]}

		this.validateData = function () {
			//Reset Messages
			this._messages = [];

			this._columns.forEach(function (e) {
				this._validateColumn(e);
			}.bind(this))
			return this._messages;
		};
		this._validateColumn = function (column) {
			var aColumnsValues = [];
			this._jsonData.forEach(function (e) {
				aColumnsValues.push(e[column.COLUMN_NAME]);
			});
			if (column.IS_NULLABLE === "FALSE") {
				var errorResult = this._checkNullValues(aColumnsValues, column);
			};
			var errorResult = this._checkLength(aColumnsValues, column.LENGTH, column);
			var errorResult = this._checkDataType(aColumnsValues, column.DATA_TYPE_NAME, column);
		};

		//Implement Validators
		this._checkNullValues = function (aValues, column) {
			var aMessages = [];
			aValues.forEach(function (e, index) {
				if (!e) {
					this._messages.push({
						text: 'Null values in non nullable columns',
						description: 'Cannot have null values in a non-nullable column. Error row : ' + (index + 1),
						state: 'Error',
						group: column.COLUMN_NAME
					});
				}
			}.bind(this));
			return aMessages;
		};
		this._checkLength = function (aValues, length, column) {
			var aMessages = [];
			aValues.forEach(function (e, index) {
				if (e) {
					if (e.length > length) {
						this._messages.push({
							text: 'Exceeds maximum permitted length',
							description: 'Exceeds the maximum permitted length :' + e.length + ' / ' + length + ' . Error row : ' + (index + 1),
							state: 'Error',
							group: column.COLUMN_NAME
						});
					}
				}
			}.bind(this));
			return aMessages;
		};
		this._checkDataType = function (aValues, datatype, column) {
			var aMessages = [];
			aValues.forEach(function (e, index) {
				if (datatype == 'DECIMAL' || datatype == 'DOUBLE' || datatype == 'INTEGER' || datatype == 'FLOAT' || datatype == 'SMALLINT' ||
					datatype == 'TINYINT') {
					if (e.length > 0 && isNaN(parseFloat(e, 0))) {
						this._messages.push({
							text: 'Data type mismatch',
							description: 'Data type mismatch Expected :' + datatype + ' , Found  String/Charedter . Error row : ' + (index + 1),
							state: 'Error',
							group: column.COLUMN_NAME
						});
					}
				} else if (datatype == "DATE") {
					if (isNaN(Date.parse(new Date(e.substring(0, 4) + '-' + e.substring(4, 6) + '-' + e.substring(6, 8))) || Date.parse(e))) {
						this._messages.push({
							text: 'Data type mismatch',
							description: 'Data type mismatch Expected :' + datatype +
								' , Found  String/Charedter/Decimal.Apply transformation for a quick fix . Error row : ' + (index + 1),
							state: 'Error',
							group: column.COLUMN_NAME
						});
					}
				}
			}.bind(this));
			return aMessages;
		}
	};

	var mapingsValidator = BaseObject.extend("pinaki.ey.CIO.CIOControlPanel.api.MappingValidator", {
		constructor: mapingsValidator
	});
	return mapingsValidator;
});