'use strict';

var Collection = require('./collection');
var Transporter = require('./transporter');

class Database {

	/**
	 *
	 * @param cp object Clusterpoint
	 * @param database string name
	 */
	constructor(cp, database) {
		this.cp = cp;
		this.name = database;
		this._debug = this.cp._debug;
		this._collections = [];
	}

	collection(collectionName) {
		var tmp = new Collection(this, collectionName);
		this._collections.push(tmp);
		return tmp;
	}

	/**
	 * enable/disable debug info collecting on all collections under this database
	 * @param [debug=true] {boolean}
	 */
	setDebug(debug) {
		if (typeof(debug) === 'undefined') debug = true;
		this._debug = debug;
		for (var i = 0, k = Object.keys(this._collections), l = k.length; i < l; i++) {
			this._collections[k[i]].setDebug(debug);
		}
	}

	getDebug() {
		var tmp = [];
		for (var i = 0, l = this._collections.length; i < l; i++) {
			tmp.push(this._collections[i].getDebug());
		}
		return tmp;
	}

	createCollection(collectionName, options) {
		if (typeof(options) === 'undefined') options = {};

		var data = 'CREATE COLLECTION ' + this.name + '.' + collectionName;

		if (typeof options.shards !== 'undefined') {
			data += ' WITH ' + parseInt(options.shards, 10) + ' SHARDS ';
		}
		if (typeof options.replicas !== 'undefined') {
			data += ' WITH ' + parseInt(options.replicas, 10) + ' REPLICAS ';
		}

		if (options.hyperreplication === true) {
			data += ' WITH HYPERREPLICATION ';
		}

		if (options.dataModel) {
			data += ' WITH DATA MODEL ' + JSON.stringify(options.dataModel);
		}
		if (options.config) {
			data += ' WITH CONFIG ' + JSON.stringify(options.config);
		}

		var tmpConfig = this.cp._config;

		var options = {
			hostname: tmpConfig.host,
			port    : tmpConfig.port ? tmpConfig.port : 443,
			path    : '/v4/' + tmpConfig.account_id,
			method  : 'POST',
			auth    : tmpConfig.username + ':' + tmpConfig.password
		};

		return new Transporter({
			'that'   : this,
			'options': options,
			'data'   : data
		});
	}

	dropCollection(collectionName) {

		var data = 'DROP COLLECTION ' + this.name + '.' + collectionName;

		var tmpConfig = this.cp._config;

		var options = {
			hostname: tmpConfig.host,
			port    : tmpConfig.port ? tmpConfig.port : 443,
			path    : '/v4/' + tmpConfig.account_id,
			method  : 'POST',
			auth    : tmpConfig.username + ':' + tmpConfig.password
		};

		return new Transporter({
			'that'   : this,
			'options': options,
			'data'   : data
		});
	}

	editCollection(collectionName, options) {
		if (typeof(options) === 'undefined') options = {};

		var data = 'EDIT COLLECTION ' + this.name + '.' + collectionName;

		data += ' SET DATA MODEL ' + JSON.stringify(options);

		var tmpConfig = this.cp._config;

		var options = {
			hostname: tmpConfig.host,
			port    : tmpConfig.port ? tmpConfig.port : 443,
			path    : '/v4/' + tmpConfig.account_id,
			method  : 'POST',
			auth    : tmpConfig.username + ':' + tmpConfig.password
		};

		return new Transporter({
			'that'   : this,
			'options': options,
			'data'   : data
		});
	}
}

module.exports = Database;