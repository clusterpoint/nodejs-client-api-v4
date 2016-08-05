'use strict';

class Response {

	constructor(data, debugData) {
		for (var i = 0, k = Object.keys(data), l = k.length; i < l; i++) {
			this['_' + k[i]] = data[k[i]];
		}

		this._debugData = debugData;

		return this;
	}

	transactionId() {
		return this._transaction_id;
	}

	error() {
		return this._error;
	}

	/**
	 * @returns {array}
	 */
	results() {
		if (typeof this._results === 'undefined') {
			return [];
		}
		return this._results;
	}

	/**
	 * available only in listDatabases() Response
	 */
	databases() {
		return this._databases || this._database;
	}

	/**
	 * available only in status Response
	 */
	shards() {
		return this._shards;
	}

	/**
	 * available only in status Response
	 */
	collectionStatus() {
		return this._collection_status;
	}

	/**
	 * available after collection->describe()
	 */
	describe() {
		var descriptionFields = ['_name',
			'_code_name',
			'_visual_name',
			'_shards',
			'_replicas',
			'_feature_v4',
			'_feature_hyperreplicated',
			'_support_access',
			'_overrides'];
		var result = {};
		for (var i = 0, l = descriptionFields.length; i < l; i++) {
			if (typeof this[descriptionFields[i]] !== 'undefined') {
				result[descriptionFields[i]] = this[descriptionFields[i]];
			}
		}

		return result;
	}

	/**
	 * query execution time
	 */
	seconds() {
		return this._seconds;
	}

	/**
	 * network time, including query execution time
	 */
	networkSeconds() {
		return this._networkSeconds;
	}

	hits() {
		return this._hits;
	}

	from() {
		return this._from;
	}

	to() {
		return this._to;
	}

	found() {
		return this._found;
	}

	rawResponse() {
		return this._rawResponse;
	}

	/**
	 * Get executed query for this response
	 * @returns {string}
	 */
	getQuery() {
		return this._query;
	}

	/**
	 * Returns affected IDs for insert, delete, update
	 * @returns {Array}
	 */
	getAffectedIds() {
		var idsArr = [];
		var results = this.results();
		for (var i = 0, l = results.length; i < l; i++) {
			// because we do not know primary key name, maybe it is not named as default "_id"
			idsArr.push(Object.keys(results[i]).map(key => results[i][key])[0]);

		}
		return idsArr;
	}

	/**
	 * Convert results to JSON string
	 * @param [pretty=false] {boolean}
	 */
	toJSON(pretty) {
		if (typeof(pretty) === 'undefined') pretty = false;
		if (pretty) {
			return JSON.stringify(this.results(), null, 2);
		}
		return JSON.stringify(this.results());
	}

	/**
	 * @returns {string} debugging info for this request/response
	 */
	getDebug() {
		this._debugData.query = this.getQuery();
		this._debugData.rawResponse = this.rawResponse();
		return this._debugData;
	}
}

module.exports = Response;