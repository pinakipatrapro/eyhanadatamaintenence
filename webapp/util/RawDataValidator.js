sap.ui.define([
	"sap/ui/table/Table",
	"sap/ui/table/Column",
	"sap/ui/base/Object"
], function (Table, Column, BaseObject) {
	"use strict";

	var rawDataValidator = function (json) {
		this._json = json;
		this.dataMetrics = {
			numberOfRecords : this._json.length,
			totalColumns : Object.keys(this._json[0]).length,
			nullValuesCount : 0,
			totalCount : 0,
			nullPerc : 0
		};
		this.validateData = function () {
			this.checkNullValuesByColumn();
			return this.dataMetrics;
		};
		this.checkNullValuesByColumn = function () {
			var aObj = this._json;
			var aKeys = Object.keys(aObj[0]);
			var count = 0;
			var totalCount = 0;
			aObj.forEach(function(e){
				aKeys.forEach(function(f){
					totalCount++;
					if(!e[f])count++
					else if(e[f].length<0)count++
				})
			})
			this.dataMetrics.nullValuesCount = count;
			this.dataMetrics.totalCount = totalCount;
			this.dataMetrics.nullPerc = Math.round(count/totalCount*100);
		};
	};

	var oRawDataValidator = BaseObject.extend("pinaki.ey.CIO.CIOControlPanel.api.RawDataValidator", {
		constructor: rawDataValidator
	});
	return oRawDataValidator;

})