'use strict';
var Response = require('./response');
var Document = require('./document');
var Promise = require('bluebird');
var net = require('https');

class Transporter {

	constructor(settings) {
		var that = settings.that;
		var options = settings.options;
		var data = settings.data;

		var returnAsDocument = false;
		if (typeof(settings.returnAsDocument) !== 'undefined') returnAsDocument = settings.returnAsDocument;

		return new Promise(function (resolve, reject) {

			var req = net.request(options, function (res) {

				var rawResponse = '';

				res.on('data', function (chunk) {
					rawResponse += chunk;
				});


				res.on('end', function () {

					var networkSecondsEnd = new Date();

					rawResponse = rawResponse.toString();

					var response = JSON.parse(rawResponse);

					response.query = data;
					response.rawResponse = rawResponse;
					response.networkSeconds = (networkSecondsEnd.getTime() - networkSecondsStart.getTime()) / 1000;

					let resolveResponse = new Response(response, {
						options : options,
						datetime: new Date().toLocaleString()
					});

					if (that._debug) {
						that._debugData.push(resolveResponse.getDebug());
					}
					// console.log(resolveResponse.getDebug());

					if (res.statusCode == "200") {

						// we want response to be iterable
						if (resolveResponse.results().length > 0) {
							if (returnAsDocument !== false) { // from find(), should return Document
								resolveResponse = new Document(that, resolveResponse.results()[0]);
							}
							else {
								// standard response
								resolveResponse.length = resolveResponse.results().length;
								resolveResponse[Symbol.iterator] = function () {
									let index = 0;
									return {
										next: () => {
											let value = this._results[index];
											let done = index >= this.length;
											index++;
											return {value, done};
										}
									};
								};
							}
						}
						else {
							// no results: response should be iterator even when empty - to not throw an error!
							resolveResponse.length = 0;
							resolveResponse[Symbol.iterator] = function () {
								return {
									next: () => {
										let done = true;
										return {undefined, done};
									}
								};
							};
						}

						resolve(resolveResponse);

					} else {
						reject({
							statusCode: res.statusCode,
							err       : response.error,
							data      : data,
							options   : options,
							response  : resolveResponse
						});
					}
				});
			}).on('error', function (e) {
				reject({
					err    : e,
					data   : data,
					options: options
				});
			});

			var networkSecondsStart = new Date();
			req.write(data);
			req.end();

		});
	}
}

module.exports = Transporter;