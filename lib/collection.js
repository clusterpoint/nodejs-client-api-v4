'use strict';

var Promise = require('bluebird');
var Response = require('./response');
var Document = require('./document');
var http = require('http');
var https = require('https');

/**
 * @name string Collection name
 */
class Collection {

	constructor(db, collectionName) {
		this.db = db; // parent DB object
		this.name = collectionName;
		this._method = '';
		this._action = '';

		this._debug = this.db._debug;
		this._debugData = [];

		this.resetQuery();

		this._transactionID = null;
	}

	beginTransaction() {
		var that = this;

		this._method = 'POST';
		this._action = '/_query';

		return Promise.resolve(that._execute('BEGIN_TRANSACTION'))
			.then(response => {
				that._transactionID = response.transactionId();
				return that;
			});
	}

	commit() {
		var that = this;

		this._method = 'POST';
		this._action = '/_query';

		return Promise.resolve(that._execute('COMMIT'))
			.then(response => {
				that._transactionID = null;
				return that;
			});
	}

	rollback() {
		var that = this;

		this._method = 'POST';
		this._action = '/_query';

		return Promise.resolve(that._execute('ROLLBACK'))
			.then(response => {
				that._transactionID = null;
				return that;
			});
	}


	resetQuery() {
		this._queryPieces = {};
		this._queryPieces.prepend = '';
		this._queryPieces.select = ' * ';
		this._queryPieces.where = '';
		this._queryPieces.orderBy = [];
		this._queryPieces.groupBy = [];
		this._queryPieces.offset = 0;
		this._queryPieces.limit = 20;

		return this;
	}

	get() {
		var where = '';
		if (this._queryPieces.where.length > 0) {
			where = ' WHERE ' + this._queryPieces.where;
		}

		var groupBy = '';
		if (this._queryPieces.orderBy.length > 0) {
			groupBy = ' GROUP BY ' + this._queryPieces.groupBy.join(', ');
		}

		var orderBy = '';
		if (this._queryPieces.orderBy.length > 0) {
			orderBy = ' ORDER BY ' + this._queryPieces.orderBy.join(', ');
		}

		var sql = (this._queryPieces.prepend.length > 0 ? this._queryPieces.prepend + ' ' : '') + 'SELECT ' + this._queryPieces.select.trim() + ' FROM ' + this.name + where + groupBy + orderBy + ' LIMIT ' + (this._queryPieces.offset > 0 ? this._queryPieces.offset + ', ' : '') + this._queryPieces.limit;

		this._method = 'POST';
		this._action = '/_query';
		return this._execute(sql);
	}

	first() {
		this._method = 'POST';
		this._action = '/_query';
		this.limit(1);
		this.offset(0);
		return this.get('');
	}

	/**
	 * @param data {string}
	 * @returns {Collection}
	 */
	prepend(data) {
		this._queryPieces.prepend += data;
		return this;
	}

	/**
	 * @param data {string}
	 * @returns {Collection}
	 */
	select(data) {

		if (typeof data === 'string') {
			this._queryPieces.select = data;
		}

		if (Array.isArray(data)) {
			this._queryPieces.select = data.join(', ');
			return this; // array is an object in JS, we need to return now!
		}

		if (typeof data === 'object') {
			var tmp = [];
			for (var i = 0, k = Object.keys(data), l = k.length; i < l; i++) {
				tmp.push(k[i] + ' AS ' + data[k[i]]);
			}
			this._queryPieces.select = tmp.join(', ');
		}

		return this;
	}

	/**
	 *
	 * @param field {string}
	 * @param operator {string}
	 * @param value {string}
	 * @param logical {string}
	 * @returns {Collection}
	 */
	where(field, operator, value, logical) {
		if (typeof(logical) === 'undefined') logical = '&&';

		if (this._queryPieces.where.length > 0) {
			this._queryPieces.where += ' ' + logical + ' ';
		}

		if (typeof operator === 'undefined' && typeof value === 'undefined') {
			// raw
			this._queryPieces.where += field;
			return this;
		}

		if (typeof value === 'undefined') {
			// default operator
			this._queryPieces.where += field + ' == ' + this.db.cp.escape(operator);
			return this;
		}

		this._queryPieces.where += field + ' ' + operator + ' ' + this.db.cp.escape(value);

		return this;
	}

	/**
	 *
	 * @param field {string}
	 * @param operator {string}
	 * @param value {string}
	 * @returns {Collection}
	 */
	orWhere(field, operator, value) {
		return this.where(field, operator, value, '||');
	}

	/**
	 *
	 * @param field {string}
	 * @param [order=ASC] {string}
	 * @returns {Collection}
	 */
	orderBy(field, order) {
		if(typeof(order)==='undefined') order = 'ASC';
		this._queryPieces.orderBy.push(field + ' ' + order);
		return this;
	}

	/**
	 *
	 * @param field {string}
	 * @returns {Collection}
	 */
	groupBy(field) {
		this._queryPieces.groupBy.push(field);
		return this;
	}

	/**
	 *
	 * @param limit {integer}
	 * @returns {Collection}
	 */
	limit(limit) {
		this._queryPieces.limit = limit;
		return this;
	}

	/**
	 *
	 * @param offset {integer}
	 * @returns {Collection}
	 */
	offset(offset) {
		this._queryPieces.offset = offset;
		return this;
	}

	/**
	 *
	 * @param doc mixed
	 * @returns {Response}
	 */
	insertOne(doc) {
		this._method = 'POST';
		this._action = '';
		return this._execute(doc);
	}

	/**
	 *
	 * @param docsArr {array}
	 * @returns {Response}
	 */
	insertMany(docsArr) {
		this._method = 'POST';
		this._action = '';
		return this._execute(docsArr);
	}

	/**
	 *
	 * @param id {string}
	 * @returns {Response}
	 */
	deleteOne(id) {
		return this.deleteMany([id]);
	}

	/**
	 *
	 * @param ids {array}
	 * @returns {Response}
	 */
	deleteMany(ids) {
		this._action = '';
		this._method = 'DELETE';

		// force strings! REST hates DELETE with integers for now...
		for (var i = 0, l = ids.length; i < l; i++) {
			ids[i] = ids[i] + '';
		}
		return this._execute(ids);
	}

	/**
	 *
	 * @param id {string}
	 * @returns {Document}
	 */
	find(id) {
		this._method = 'GET';
		this._action = '[' + encodeURIComponent(id) + ']';
		return this._execute('', true);
	}

	/**
	 * Replace single document
	 * @param id {string}
	 * @param doc {mixed}
	 * @returns {Response}
	 */
	replace(id, doc) {
		this._method = 'PUT';
		this._action = '[' + encodeURIComponent(id) + ']';
		return this._execute(doc);
	}

	/**
	 * Update single document
	 * @param id {string}
	 * @param data {mixed}
	 * @returns {Response}
	 */
	update(id, data) {
		this._method = 'POST';
		this._action = '/_query';
		var query = 'UPDATE ' + this.name + '["' + encodeURIComponent(id) + '"] SET ';
		if (typeof data === 'string') {
			query += data;
		}
		else {
			// object
			query += this._prepareDeepFieldUpdate(data, '').join(', ');
		}

		return this._execute(query);
	}

	/**
	 * Execute raw query
	 * @param query {string}
	 * @returns {Response}
	 */
	raw(query) {
		this._method = 'POST';
		this._action = '/_query';
		return this._execute(query);
	}

	/**
	 * Get status about collection
	 * @returns {Response}
	 */
	getStatus() {
		this._method = 'GET';
		this._action = '/_status';
		return this._execute('');
	}

	/**
	 * Enable/disable debug data collecting
	 * @param [debug=true] {boolean}
	 */
	setDebug(debug) {
		if (typeof(debug) === 'undefined') debug = true;
		this._debug = debug;
	}

	getDebug() {
		return this._debugData;
	}

	_prepareDeepFieldUpdate(obj, stack) {
		var output = [];
		for (var property in obj) {
			if (obj.hasOwnProperty(property)) {
				switch (typeof obj[property]) {
					case 'object':
						if (!obj[property]) { // check for null which is object
							output.push((stack == '' ? '' : stack + '.') + property + ' = null');
						}
						else {
							output = output.concat(this._prepareDeepFieldUpdate(obj[property], (stack == '' ? '' : stack + '.') + property));
						}
						break;
					default:
						output.push((stack == '' ? '' : stack + '.') + property + ' = ' + this.db.cp.escape(obj[property]));
						break;
				}
			}
		}

		return output;
	}


	_execute(data, returnAsDocument) {
		if (typeof(returnAsDocument) === 'undefined') returnAsDocument = false;

		var that = this;

		if (typeof data !== 'string') {
			data = JSON.stringify(data);
		}


		var tmpConfig = this.db.cp._config;

		var net = (tmpConfig.http) ? http : https;

		var options = {
			hostname: tmpConfig.host,
			port:     tmpConfig.port ? tmpConfig.port : 443,
			path:     '/v4/' + tmpConfig.account_id + '/' + this.db.name + '.' + this.name + this._action + (this._transactionID !== null ? '?transaction_id=' + this._transactionID : ''),
			method:   this._method,
			auth:     tmpConfig.username + ':' + tmpConfig.password
		};

		//Nodejs adds Transfer-Encoding: chunked header to such DELETE request. And this header was causing "data not received on the REST side"
		if (this._method === 'DELETE') {
			options.headers = {
				'Content-Type':   'application/x-www-form-urlencoded',
				'Content-Length': data.length
			}
		}

		this.resetQuery();

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

					let resolveResponse = new Response(response, {options: options, datetime: new Date().toLocaleString()});

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
							err:        response.error,
							data:       data,
							options:    options,
							response:   resolveResponse
						});
					}
				});
			}).on('error', function (e) {
				reject({
					err:     e,
					data:    data,
					options: options
				});
			});

			var networkSecondsStart = new Date();
			req.write(data);
			req.end();

		});
	}

}

module.exports = Collection;