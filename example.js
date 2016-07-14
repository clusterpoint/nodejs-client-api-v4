'use strict';

//include Clusterpoint Library
var Clusterpoint = require('clusterpoint-api-v4');
var co = require('co');


//Note, replace 'api-eu' with 'api-us', if you use US Cloud server
var config = {
	host:       'https://api-eu.clusterpoint.com/v4/',
	account_id: 'ACCOUNT_ID',
	username:   'USERNAME',
	password:   'PASSWORD',
	debug:      false
};

// var config = require('./test/config').config;
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
// https://github.com/tj/co
return co(function *() {

	console.log('select and delete all books');
	var response = yield booksCollection.limit(10000).get();
	var idsArr = [];
	for (let doc of response) {
		idsArr.push(doc._id);
	}

	if (idsArr.length > 0) {
		var response = yield booksCollection.deleteMany(idsArr);
	}

	console.log('select and delete all authors');

	var response = yield authorsCollection.limit(10000).get();
	var idsArr = [];
	for (let doc of response) {
		idsArr.push(doc._id);
	}
	if (idsArr.length > 0) {
		var response = yield authorsCollection.deleteMany(idsArr);
	}

	console.log('insert authors');

	// INSERT authors
	var documents = [
		{
			'_id':  1,
			'name': 'John'
		},
		{
			'_id':  2,
			'name': 'Fred'
		}
	];
	var response = yield authorsCollection.insertMany(documents);

	console.log('insert books');

	var documents = [
		{
			'_id':          1,
			'title':        'Book 1',
			'category':     'Science',
			'color':        'red',
			'availability': true,
			'author_id':    1,
			'price':        1,
			'deeper':       {
				'foo': 1,
				'bar': 2
			}
		},
		{
			'_id':          2,
			'title':        'Book 2',
			'category':     'Fiction',
			'author_id':    2,
			'price':        2,
			'color':        'red',
			'availability': true
		}
	];
	var response = yield booksCollection.insertMany(documents);


	// list books with authors using JOIN (currently you have to use raw() function for JOINS)
	var response = yield booksCollection.raw('SELECT *, author.name ' +
		'FROM books ' +
		'LEFT JOIN authors AS author ON author._id == books.author_id');
	// console.log(response.getQuery());
	for (let book of response) {
		console.log(book.title + ' (' + book.author + ')');
	}

	// Another query builder example:
	var response = yield booksCollection.select(['name', 'color', 'price', 'category'])
		.where('color', 'red')
		.where('availability', true)
		.groupBy('category')
		.orderBy('price')
		.limit(5)
		.get();

	console.log(response.getQuery());

})
	.catch(function (err) {
		console.log('error:', err);
	});


// Example with Promises
booksCollection.limit(10000).get()
	.then(response => {
		var idsArr = [];
		for (let doc of response) {
			idsArr.push(doc._id);
		}

		return booksCollection.deleteMany(idsArr);
	})
	.then(response => {
		var documents = [
			{
				'_id':          1,
				'title':        'Book 1',
				'category':     'Science',
				'color':        'red',
				'availability': true,
				'author_id':    1,
				'price':        1,
				'deeper':       {
					'foo': 1,
					'bar': 2
				}
			},
			{
				'_id':          2,
				'title':        'Book 2',
				'category':     'Fiction',
				'author_id':    2,
				'price':        2,
				'color':        'red',
				'availability': true
			}
		];
		return booksCollection.insertMany(documents);
	})
	.then(response => {
		return booksCollection.raw('SELECT *, author.name ' +
			'FROM books ' +
			'LEFT JOIN authors AS author ON author._id == books.author_id');
	})
	.then(response => {
		// console.log(response.getQuery());
		for (let book of response) {
			console.log(book.title + ' (' + book.author + ')');
		}
	})
	.catch(err => {
		console.log(err);
	});