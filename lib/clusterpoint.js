'use strict';

var Database = require('./database');
var Transporter = require('./transporter');

class Clusterpoint {
	constructor(config) {
		this._config = config;

		if (typeof this._config.debug === 'undefined') {
			this._config.debug = false;
		}
		if (typeof this._config.port === 'undefined') {
			this._config.port = 443; // default SSL port
		}

		this._debug = this._config.debug;
		this._debugData = [];
		this._databases = [];
	}

	/**
	 * @param databaseName
	 * @returns {Database}
	 */
	database(databaseName) {
		var tmp = new Database(this, databaseName);
		this._databases.push(tmp);
		return tmp;
	}

	/**
	 * Escapes string for special characters.
	 *
	 * @param  val string
	 * @return string
	 */
	escape(val) {
		if (val === null) {
			return 'null';
		}

		switch (typeof val) {
			case 'boolean':
				return val ? 'true' : 'false';
			case 'number':
				return val + '';
		}

		val = val.replace(/[\0\n\r\b\t\\"\x1a]/g, function (s) {
			switch (s) {
				case "\0":
					return "\\0";
				case "\n":
					return "\\n";
				case "\r":
					return "\\r";
				case "\b":
					return "\\b";
				case "\t":
					return "\\t";
				case "\x1a":
					return "\\Z";
				default:
					return "\\" + s;
			}
		});

		return '"' + val + '"';
	}

	/**
	 * enable/disable debug info collecting on all databases under this connection
	 * @param [isDebug=true]
	 */
	setDebug(debug) {
		if (typeof(debug) === 'undefined') debug = true;
		this._debug = debug;
		for (var i = 0, l = this._databases.length; i < l; i++) {
			this._databases[i].setDebug(debug)
		}
	}

	getDebug() {
		var tmp = this._debugData;
		for (var i = 0, l = this._databases.length; i < l; i++) {
			for (var i2 = 0, l2 = this._databases[i]._collections.length; i2 < l2; i2++) {
				tmp.push(this._databases[i]._collections[i2].getDebug());
			}
		}
		return tmp;
	}

	createDatabase(databaseName) {

		var data = 'CREATE DATABASE ' + databaseName;

		var tmpConfig = this._config;

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

	dropDatabase(databaseName) {

		var data = 'DROP DATABASE ' + databaseName;

		var tmpConfig = this._config;

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

	listDatabases() {

		var data = 'LIST DATABASES';

		var tmpConfig = this._config;

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

	listCollections(databaseName) {
		if(typeof(databaseName)==='undefined') databaseName = false;

		var data = 'LIST COLLECTIONS';

		if (databaseName !== false){
			data += ' FROM '+databaseName;
		}

		var tmpConfig = this._config;

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

module.exports = Clusterpoint;