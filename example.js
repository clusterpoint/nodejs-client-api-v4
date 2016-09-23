'use strict';

//include Clusterpoint Library
var Clusterpoint = require('clusterpoint');
var co = require('co');


//Note, replace 'api-eu' with 'api-us', if you use US Cloud server
var config = {
	host      : 'api-eu.clusterpoint.com',
	account_id: 'ACCOUNT_ID',
	username:   'USERNAME',
	password:   'PASSWORD',
	debug:      false
};

// In this example we will use a simple database named "bookshelf" which consists of books and book authors.

// create Clusterpoint main object
var cp = new Clusterpoint(config);

// connect to database
var bookshelfDB = cp.database('bookshelf');

// connect to collection using database connection
var authorsCollection = bookshelfDB.collection('authors');

// or one can connect straight to the collection like this
var booksCollection = cp.database('bookshelf').collection('books');

// Example using CO library
// CO = Generator based control flow goodness for nodejs and the browser, using promises, letting you write non-blocking code in a nice-ish way.
// install CO: npm install co
// https://github.com/tj/co
return co(function *() {

	// try to remove documents from both collections just for the purpose of this example
	console.log('select and delete all books');
	var response = yield booksCollection.limit(10000).get();
	var idsArr = [];
	for (let doc of response) {
		idsArr.push(doc._id);
	}

	if (idsArr.length > 0) {
		response = yield booksCollection.deleteMany(idsArr);
	}

	console.log('select and delete all authors');

	response = yield authorsCollection.limit(10000).get();
	idsArr = [];
	for (let doc of response) {
		idsArr.push(doc._id);
	}
	if (idsArr.length > 0) {
		response = yield authorsCollection.deleteMany(idsArr);
	}

	console.log('insert authors');

	// INSERT authors
	var documents = [
		{
			'_id' : 1,
			'name': 'John'
		},
		{
			'_id' : 2,
			'name': 'Fred'
		}
	];
	response = yield authorsCollection.insertMany(documents);

	console.log('insert books');

	documents = [
		{
			'_id'         : 1,
			'title'       : 'Book 1',
			'category'    : 'Science',
			'color'       : 'red',
			'availability': true,
			'author_id'   : 1,
			'price'       : 1,
			'deeper'      : {
				'foo': 1,
				'bar': 2
			}
		},
		{
			'_id'         : 2,
			'title'       : 'Book 2',
			'category'    : 'Fiction',
			'author_id'   : 2,
			'price'       : 2,
			'color'       : 'red',
			'availability': true
		}
	];
	response = yield booksCollection.insertMany(documents);


	// list books with authors using JOIN (currently you have to use raw() function for JOINS)
	response = yield booksCollection.raw('SELECT *, author.name ' +
		'FROM books ' +
		'LEFT JOIN authors AS author ON author._id == books.author_id');
	// console.log(response.getQuery());
	for (let book of response) {
		console.log(book.title + ' (' + book.author + ')');
	}

	// Another query builder example:
	response = yield booksCollection.select(['color', 'price', 'category'])
		.where('color', 'red')
		.where('availability', true)
		.groupBy('category')
		.orderBy('price')
		.limit(5)
		.get();

	console.log(response.getQuery());
	console.log(response.results());

})
	.catch(function (err) {
		console.log('error:', err);
	});


// Example using Promises

booksCollection.limit(10000).get()
	.then(response => {
		// try to remove documents from both collections just for the purpose of this example
		var idsArr = [];
		for (let doc of response) {
			idsArr.push(doc._id);
		}

		return booksCollection.deleteMany(idsArr);
	})
	.then(response => {
		var documents = [
			{
				'_id'         : 1,
				'title'       : 'Book 1',
				'category'    : 'Science',
				'color'       : 'red',
				'availability': true,
				'author_id'   : 1,
				'price'       : 1,
				'deeper'      : {
					'foo': 1,
					'bar': 2
				}
			},
			{
				'_id'         : 2,
				'title'       : 'Book 2',
				'category'    : 'Fiction',
				'author_id'   : 2,
				'price'       : 2,
				'color'       : 'red',
				'availability': true
			}
		];
		return booksCollection.insertMany(documents);
	})
	.then(response => {
		return booksCollection.raw('SELECT books.title AS title, author.name AS name ' +
			'FROM books ' +
			'LEFT JOIN authors AS author ON author._id == books.author_id');
	})
	.then(response => {
		// console.log(response.getQuery());
		for (let data of response) {
			console.log(data.title + ' (' + data.name + ')');
		}
	})
	.catch(err => {
		console.log(err);
	});