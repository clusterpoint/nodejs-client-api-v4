'use strict';

var Database = require('./database');

class Clusterpoint {
	constructor(config) {
		this._config = config;
		this._debug = this._config.debug;
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
		for(var i = 0, l = this._databases.length; i < l; i++) {
			this._databases[i].setDebug(debug)
		}
	}

	getDebug() {
		var tmp = [];
		for(var i = 0, l = this._databases.length; i < l; i++) {
			for(var i2 = 0, l2 = this._databases[i]._collections.length; i2 < l2; i2++) {
				tmp.push(this._databases[i]._collections[i2].getDebug());
			}
		}
		return tmp;
	}
}

module.exports = Clusterpoint;