'use strict';

var Collection = require('./collection');

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
		for(var i = 0, l = this._collections.length; i < l; i++) {
			tmp.push(this._collections[i].getDebug());
		}
		return tmp;
	}
}

module.exports = Database;