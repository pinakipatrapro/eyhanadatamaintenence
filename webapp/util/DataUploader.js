sap.ui.define([
	"sap/ui/base/Object"
], function (BaseObject) {
	"use strict";

	var dataUploader = function (jsonData, tableName,mode) {
		this._jsonData = jsonData;
		this._tableName = tableName;
		this._mode = mode;
		this._tempPersistance = '';
		this._aMessages = [];
		this._columnSequence = '';
		this._threadSize = 5000;

		this.execute = function () {
			var createPersistance = this._createPersistance();
			return new Promise(function (resolve, reject) {
				createPersistance.then(function (response) {
					this._tempPersistance = response;
					this._createComaSeperatedColumns();
					this._createSQL(resolve, reject);
				}.bind(this));
			}.bind(this));
		};
		this._createPersistance = function () {
			return new Promise(function (resolve, reject) {
				$.ajax({
					url: "/eyhcp/CIO/DataUploader/Scripts/PSAGenerator.xsjs?tableName=" + this._tableName,
					method: "GET",
					success: function (response) {
						resolve(response);
					},
					error: function (error) {
						this._aMessages.push({
							error: error,
							type: 'Error'
						});
						reject();
					}
				});
			}.bind(this));
		};

		this._createComaSeperatedColumns = function () {
				var aColumns = [];
				Object.keys(this._jsonData[0]).forEach(function (e) {
					aColumns.push('"' + e + '"');
				});
				this._columnSequence = ' (' + aColumns.join(',') + ') ';
			},

			this._createSQL = function (resolve, reject) {
				var aRequests = [];
				for (var i = 0; i < this._jsonData.length; i = i + this._threadSize) {
					var arrayBatchSql = [];
					var batchSize = i + this._threadSize;
					if (batchSize > this._jsonData.length) {
						batchSize = this._jsonData.length;
					}
					for (var j = i; j < batchSize; j++) {
						var aValues = [];
						Object.keys(this._jsonData[j]).forEach(function (e) {
							var value = this._jsonData[j][e];
							if (typeof (value) == "string") {
								value = "'" + value + "'";
							}
							if(!value){
								value = "\'\'";
							}
							aValues.push(value);
						}.bind(this));
						var sqlText = 'insert into "' + this._tempPersistance + '"  ' + this._columnSequence + 'values (' + aValues.join(',') + ' ) ';
						arrayBatchSql.push(sqlText);
					};
					//Trigger Batch Thread

					aRequests.push(this._pushData(arrayBatchSql));
				}
				Promise.all(aRequests).then(function (values) {
					this._activateUploadedData(resolve, reject);
				}.bind(this));
			},
			this._pushData = function (aSQL) {

				var settings = {
					"async": true,
					"url": "/eyhcp/CIO/DataUploader/Scripts/BatchUploader.xsjs",
					"method": "POST",
					"data": JSON.stringify(aSQL)
				};
				return new Promise(function (resolve, reject) {
					$.ajax(settings).done(function (response) {
						resolve(response);
					});
				}.bind(this));
			},
			this._activateUploadedData = function (resolve, reject) {
				var queryString = '?tableName=' + this._tableName + '&tempTableName="' + this._tempPersistance + '"&mode=' + this._mode;
				var settings = {
					"async": true,
					"url": "/eyhcp/CIO/DataUploader/Scripts/ActivateUpload.xsjs" + queryString,
					"method": "GET"
				};
				$.ajax(settings).done(function (response) {
					resolve({message : 'Successfully uploaded '+ this._jsonData.length + ' records',type:'Success'});
				}.bind(this));
			};

	};

	var dataUploader = BaseObject.extend("pinaki.ey.CIO.CIOControlPanel.api.DataUploader", {
		constructor: dataUploader
	});
	return dataUploader;
});