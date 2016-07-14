'use strict';

class Document {

	constructor(collection, data) {
		this.save._collection = collection;
		for (var i = 0, k = Object.keys(data), l = k.length; i < l; i++) {
			// do not overwrite reserved
			if (['save', 'delete', '__collection'].indexOf(k[i]) == -1) {
				this[k[i]] = data[k[i]];
			}
		}
	}

	save() {
		return this.save._collection.replace(this._id, this);
	}

	delete() {
		return this.save._collection.deleteOne(this._id);
	}
}

module.exports = Document;

