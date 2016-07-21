# Node.JS API for Clusterpoint 4.*

Clusterpoint is a NoSQL document database known for its innovative Cloud-based distributed architecture, fast processing speed, and a flexible "pay as you use" pricing model. The database also features a developer-friendly API suitable for many popular modern programming languages, including Node.JS -- the specific API which is the focus of this document. Its full support for ACID-compliant transactions is a rarity among NoSQL databases, making the product useful for situations where data integrity is a must.

The recently introduced fourth edition of Clusterpoint added a unique JavaScript/SQL query language with computational capabilities, allowing you to create powerful queries to store, retrieve, and transform data. The Node.JS API is flexible enough to allow you to use either interface methods or raw JS/SQL queries to accomplish your database tasks. The decision to use either approach ultimately depends on programmer preference and the individual development scenario.

## Node.JS API for Clusterpoint 4.*
* [Official Documentation](#documentation)
* [Getting Started](#start)
* [Quick Example](#usage)
* [Support, Feature Requests & Bug Reports](#bugs)
* [License](#license)

<a name="documentation"></a>
## Official Documentation

Documentation for the API can be found on the [Clusterpoint website](https://www.clusterpoint.com/docs/api/4/php/389).

<a name="start"></a>
## Getting Started

1. **Sign up for Clusterpoint** – Before you begin, you need to
   sign up for a Clusterpoint account and retrieve your [Clusterpoint credentials](https://clusterpoint.com/docs/4.0/21/cloud-account-setup).
1. **Install the Node.JS API**
``npm install clusterpoint``

<a name="usage"></a>
## Quick Example
```JavaScript
'use strict';

//include Clusterpoint Library
var Clusterpoint = require('clusterpoint-api-v4');
var co = require('co');


//Note, replace 'api-eu' with 'api-us', if you use US Cloud server
var config = {
	host:       'api-eu.clusterpoint.com',
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
```


<a name="bugs"></a>
## Support, Feature Requests & Bug Reports

* [GitHub issues](https://github.com/clusterpoint/nodejs-client-api-v4/issues) for bug reports and feature requests
* [StackOverflow](https://stackoverflow.com) to ask questions (please make sure to use the [clusterpoint](http://stackoverflow.com/questions/tagged/clusterpoint) tag)
* You can also send an e-mail to our support team at support@clusterpoint.com

<a name="license"></a>
## License

 Node.JS API for Clusterpoint 4.* is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT)