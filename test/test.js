var Clusterpoint = require('../lib/clusterpoint');
var chai = require('chai');
chai.use(require('chai-as-promised'));
var should = require('chai').should();
var expect = require('chai').expect;
var co = require('co');


// config for tests
var cfg = require('./config');
var config = cfg.config;

var cp = new Clusterpoint(config);
var bookshelfDB = cp.database('bookshelf');
var authorsColl = cp.database('bookshelf').collection('authors');
var booksColl = cp.database('bookshelf').collection('books');


describe('Clusterpoint', function () {


	before(function () {
		return co(function *() {

			console.log('delete books');
			var response = yield booksColl.limit(10000).get();
			var idsArr = [];
			for (let doc of response) {
				idsArr.push(doc._id);
			}

			if (idsArr.length > 0) {
				var response = yield booksColl.deleteMany(idsArr);
			}

			console.log('delete authors');
			var response = yield authorsColl.limit(0).get();
			for (let doc of response) {
				console.log(doc); // this is a "test" - iteration through empty resultset
			}

			var response = yield authorsColl.limit(10000).get();
			var idsArr = [];
			for (let doc of response) {
				idsArr.push(doc._id);
			}
			if (idsArr.length > 0) {
				var response = yield authorsColl.deleteMany(idsArr);
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
			var insertResponse = yield authorsColl.insertMany(documents);

			console.log('insert books');

			var documents = [
				{
					'_id'      : 1,
					'title'    : 'Book 1',
					'category' : 'Science',
					'author_id': 1,
					'price'    : 1,
					'deeper'   : {
						'foo': 1,
						'bar': 2
					}
				},
				{
					'_id'      : 2,
					'title'    : 'Book 2',
					'category' : 'Fiction',
					'author_id': 2,
					'price'    : 2
				}
			];
			var insertResponse = yield booksColl.insertMany(documents);

			console.log('DB data is set up. Now starting the tests...');
		})
			.catch(function (err) {
				console.log('error:', err);
			});
	});


	describe('Clusterpoint', function () {


		it('cp should be a object', function () {
			cp.should.be.a('object');
			cp.constructor.name.should.equal('Clusterpoint');
		});

		it('cp should have _config property with valid keys', function () {
			cp._config.should.be.a('object');
			cp.should.have.property('_config');
			cp._config.should.have.all.keys('host', 'account_id', 'username', 'password', 'debug');
			cp._config.debug.should.be.a('boolean');
		});

		it('cp.database(dbname) should return Database', function () {
			var bookshelfDB = cp.database('dbname');
			bookshelfDB.constructor.name.should.equal('Database');
			bookshelfDB.name.should.equal('dbname');
		});

		it('cp.escape()', function () {
			cp.escape('1').should.equal('"1"');
			cp.escape(1).should.equal('1');
			cp.escape('āžīķīš').should.equal('"āžīķīš"');
			cp.escape("O'Hara1").should.equal("\"O'Hara1\"");
			cp.escape('O"Hara').should.equal('"O\\"Hara"');
			cp.escape(null).should.equal('null');
			cp.escape(true).should.equal('true');
		});
	});

	describe('Database', function () {

		it('db.collection()', function () {
			var bookshelfDB = cp.database('mydbname');
			var coll = bookshelfDB.collection('collname');
			coll.constructor.name.should.equal('Collection');
			coll.name.should.equal('collname');
			coll.db.name.should.equal('mydbname');
		});

	});


	var booksColl = cp.database('bookshelf').collection('books');

	describe('Collection and Response', function () {

		it('coll._debug', function () {
			booksColl._debug.should.be.false;
			booksColl.setDebug(true);
			booksColl._debug.should.be.true;
			booksColl.setDebug(false);
			booksColl._debug.should.be.false;
		});

		it('coll.status()', function (done) {
			booksColl.getStatus()
				.then(response => {
					response.shards().should.exist;
					response.collectionStatus().should.exist;
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.get() returns Response object', function (done) {
			booksColl.get()
				.then(response => {
					response.constructor.name.should.equal('Response');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.select(string)', function (done) {
			authorsColl.select('_id, name').orderBy('_id', 'DESC').get()
				.then(response => {
					JSON.stringify(response.results()).should.equal('[{"_id":"2","name":"Fred"},{"_id":"1","name":"John"}]');
					response.getQuery().should.equal('SELECT _id, name FROM authors ORDER BY _id DESC LIMIT 20');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.select(array)', function (done) {
			authorsColl.select('spam').select(['name', '_id']).orderBy('_id', 'DESC').get()
				.then(response => {
					response.getQuery().should.equal('SELECT name, _id FROM authors ORDER BY _id DESC LIMIT 20');
					JSON.stringify(response.results()).should.equal('[{"name":"Fred","_id":"2"},{"name":"John","_id":"1"}]');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.select(object)', function (done) {
			var sel = {
				'name': 'authorName',
				'_id' : 'id'
			};
			authorsColl.select(sel).orderBy('_id', 'DESC').get()
				.then(response => {

					response.getQuery().should.equal('SELECT name AS authorName, _id AS id FROM authors ORDER BY _id DESC LIMIT 20');
					JSON.stringify(response.results()).should.equal('[{"authorName":"Fred","id":"2","_id":"2"},{"authorName":"John","id":"1","_id":"1"}]');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.get() right after select().get()', function (done) {
			authorsColl.select('abc').limit(22).where('a', '==', 'b').resetQuery().orderBy('_id', 'DESC').get()
				.then(response => {
					response.networkSeconds().should.exist;
					response.seconds().should.exist;
					response.hits().should.equal('2');
					response.found().should.equal('2');
					response.to().should.equal('2');
					response.from().should.equal('0');
					expect(response.error()).to.be.null;
					response.rawResponse().should.exist;
					response.results().should.exist;

					response.getQuery().should.equal('SELECT * FROM authors ORDER BY _id DESC LIMIT 20');
					JSON.stringify(response.results()).should.equal('[{"_id":2,"name":"Fred"},{"_id":1,"name":"John"}]');

					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.offset().limit().orderBy()', function (done) {
			booksColl.prepend('function myFunc(){ return "test";}').select('_id').limit('spam').limit(10000).offset(1).orderBy('_id', 'DESC').orderBy('_id', 'ASC').groupBy('_id').get()
				.then(response => {
					response.constructor.name.should.equal('Response');
					response.getQuery().should.equal('function myFunc(){ return "test";} SELECT _id FROM books GROUP BY _id ORDER BY _id DESC, _id ASC LIMIT 1, 10000');
					JSON.stringify(response.results()).should.equal('[{"_id":"1"}]');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.insertMany()', function (done) {
			var documents = [
				{
					'_id' : 3,
					'name': 'Foo'
				},
				{
					'_id' : 4,
					'name': 'Bar'
				}
			];
			booksColl.insertMany(documents)
				.then(response => {
					JSON.stringify(response.results()).should.equal('[{"_id":"3"},{"_id":"4"}]');
					response.constructor.name.should.equal('Response');
					response.getQuery().should.equal('[{"_id":3,"name":"Foo"},{"_id":4,"name":"Bar"}]');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.insertOne()', function (done) {
			var document = {
				'_id' : 5,
				'name': 'FooBar'
			};
			booksColl.insertOne(document)
				.then(response => {
					JSON.stringify(response.results()).should.equal('[{"_id":"5"}]');
					response.constructor.name.should.equal('Response');
					response.getQuery().should.equal('{"_id":5,"name":"FooBar"}');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.getAffectedIds() - with insertOne()', function (done) {
			var document = {
				'_id' : 6,
				'name': 'FooBar6'
			};

			booksColl.insertOne(document)
				.then(response => {
					JSON.stringify(response.getAffectedIds()).should.equal('["6"]');
					response.getQuery().should.equal('{"_id":6,"name":"FooBar6"}');
					done();
				})
				.catch(err => {
					done(err);
				});
		});
		it('coll.getAffectedIds() - with insertMany()', function (done) {

			var documents = [
				{
					'_id' : 7,
					'name': 'FooBar7'
				},
				{
					'_id' : 8,
					'name': 'BarFoo8'
				}
			];

			booksColl.insertMany(documents)
				.then(response => {
					JSON.stringify(response.getAffectedIds()).should.equal('["7","8"]');
					response.getQuery().should.equal('[{"_id":7,"name":"FooBar7"},{"_id":8,"name":"BarFoo8"}]');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.deleteOne()', function (done) {
			booksColl.deleteOne(8)
				.then(response => {
					JSON.stringify(response.getAffectedIds()).should.equal('["8"]');
					response.getQuery().should.equal('["8"]');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.deleteMany()', function (done) {
			booksColl.deleteMany([7, '6', 5, 4, 3])
				.then(response => {
					JSON.stringify(response.getAffectedIds()).should.equal('["7","6","5","4","3"]');
					response.getQuery().should.equal('["7","6","5","4","3"]');
					done();
				})
				.catch(err => {
					done(err);
				});
		});


		it('response.toJSON() and response.toArray()', function (done) {
			booksColl.orderBy('_id', 'DESC').get()
				.then(response => {
					response.toJSON().should.equal('[{"_id":2,"title":"Book 2","category":"Fiction","author_id":2,"price":2},{"_id":1,"title":"Book 1","category":"Science","author_id":1,"price":1,"deeper":{"foo":1,"bar":2}}]');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.update() 1', function (done) {
			booksColl.update('1', 'price = price + 5')
				.then(response => {
					response.getQuery().should.equal('UPDATE books["1"] SET { price = price + 5 }');
					done();
				})
				.catch(err => {
					done(err);
				});
		});


		it('coll.where()', function (done) {
			booksColl.select('title').where('_id', 1).first()
				.then(response => {
					response.getQuery().should.equal('SELECT title FROM books WHERE _id == 1 LIMIT 1');
					JSON.stringify(response.results()).should.equal('[{"title":"Book 1","_id":"1"}]');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.where().where()', function (done) {
			booksColl.where('price', '==', '6').where('_id', '==', 1).get()
				.then(response => {
					JSON.stringify(response.results()).should.equal('[{"_id":1,"title":"Book 1","category":"Science","author_id":1,"price":6,"deeper":{"foo":1,"bar":2}}]');
					response.getQuery().should.equal('SELECT * FROM books WHERE price == "6" && _id == 1 LIMIT 20');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.where() raw', function (done) {
			booksColl.where('title.split(" ").length > 1 && price * 5 > 10').get()
				.then(response => {
					JSON.stringify(response.results()).should.equal('[{"_id":1,"title":"Book 1","category":"Science","author_id":1,"price":6,"deeper":{"foo":1,"bar":2}}]');
					response.getQuery().should.equal('SELECT * FROM books WHERE title.split(" ").length > 1 && price * 5 > 10 LIMIT 20');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.where().orWhere()', function (done) {
			//->where('price', '>=' ,'200')->orWhere('title','red')->where('( price == 2 || price == 5 )')->orWhere('title','red2')
			booksColl.where('price', '>=', '1').orWhere('title', 'Book 1').get()
				.then(response => {
					JSON.stringify(response.results()).should.equal('[{"_id":1,"title":"Book 1","category":"Science","author_id":1,"price":6,"deeper":{"foo":1,"bar":2}},{"_id":2,"title":"Book 2","category":"Fiction","author_id":2,"price":2}]');
					response.getQuery().should.equal('SELECT * FROM books WHERE price >= "1" || title == "Book 1" LIMIT 20');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.replace()', function (done) {
			var dataForReplaceTest = {
				'title'    : 'Book 1 updated title',
				'new_price': 1,
				'new_other': false,
				'new_deep' : {
					'something': 'foo',
					'else'     : 'bar'
				}
			};
			booksColl.replace(1, dataForReplaceTest)
				.then(response => {
					response.getQuery().should.equal('{"title":"Book 1 updated title","new_price":1,"new_other":false,"new_deep":{"something":"foo","else":"bar"}}');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('check coll.replace() results', function (done) {
			booksColl.where('_id', '==', 1).first()
				.then(response => {
					response.getQuery().should.equal('SELECT * FROM books WHERE _id == 1 LIMIT 1');
					JSON.stringify(response.results()).should.equal('[{"title":"Book 1 updated title","new_price":1,"new_other":false,"new_deep":{"something":"foo","else":"bar"},"_id":"1"}]');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.update() 2', function (done) {
			var data = {
				'title'    : 'Book 1 ūpdātēdķžģīč "title\' again',
				'new_price': 5,
				'new_other': true,
				'new_deep' : {
					'something': null,
					'else'     : 'null'
				}
			};
			booksColl.update(1, data)
				.then(response => {
					response.getQuery().should.equal('UPDATE books["1"] SET { title = "Book 1 ūpdātēdķžģīč \\"title\' again", new_price = 5, new_other = true, new_deep.something = null, new_deep.else = "null" }');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('check coll.update() 2 results', function (done) {
			booksColl.where('_id', '==', 1).first()
				.then(response => {
					JSON.stringify(response.results()).should.equal('[{"title":"Book 1 ūpdātēdķžģīč \\"title\' again","new_price":5,"new_other":true,"new_deep":{"something":null,"else":"null"},"_id":"1"}]');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.raw()', function (done) {
			booksColl.raw('SELECT * FROM books WHERE _id == 1')
				.then(response => {
					JSON.stringify(response.results()).should.equal('[{"title":"Book 1 ūpdātēdķžģīč \\"title\' again","new_price":5,"new_other":true,"new_deep":{"something":null,"else":"null"},"_id":"1"}]');
					response.getQuery().should.equal('SELECT * FROM books WHERE _id == 1');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('coll.first(), response.error()', function (done) {
			authorsColl.select('name').where('_id', '==', 1).limit(10000).first()
				.then(response => {
					expect(response.error()).to.be.null;
					JSON.stringify(response.results()).should.equal('[{"name":"John","_id":"1"}]');
					response.getQuery().should.equal('SELECT name FROM authors WHERE _id == 1 LIMIT 1');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('response.error()', function (done) {
			booksColl.select('*name').limit(10000).first()
				.then(response => {
					done();
				})
				.catch(err => {
					JSON.stringify(err.response.results()).should.equal('[]');
					err.response.getQuery().should.equal('SELECT *name FROM books LIMIT 1');

					err.err[0].code.should.equal(2240);
					err.err[0].message.should.equal('SyntaxError: Unexpected token *');

					done();
				});
		});

	});


	describe('Document', function () {

		it('find doc, set value of a new field and save.', function (done) {
			booksColl.find(1)
				.then(doc => {
					doc.my_new_field = 'test';
					doc.save()
						.then(response => {
							response.constructor.name.should.equal('Response');
							done();
						})
						.catch(err => {
							done(err);
						});
				})
				.catch(err => {
					done(err);
				});
		});

		it('should have newly set field saved in DB', function (done) {
			booksColl.find(1)
				.then(doc => {
					doc.my_new_field.should.equal('test');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('find doc, delete() it', function (done) {
			booksColl.find(1)
				.then(doc => {
					doc.delete()
						.then(response => {
							response.constructor.name.should.equal('Response');
							done();
						})
						.catch(err => {
							done(err);
						});
				})
				.catch(err => {
					done(err);
				});
		});

		it('find() should respond with error if no doc found', function (done) {
			booksColl.find(1) // deleted in previous test
				.then(doc => {
					console.log(doc);
				})
				.catch(err => {
					done();
				});
		});

	});

	describe('Transactions', function () {

		it('get transaction, update document, commit', function (done) {
			booksColl.beginTransaction()
				.then(response => {
					return booksColl.update(2, 'price = price + 10');
				})
				.then(response => {
					// just to test two operations in one transaction
					booksColl._transactionID.should.not.be.null;
					return booksColl.update(2, 'price = price + 1');
				})
				.then(response => {
					return booksColl.commit();
				})
				.then(response => {
					expect(booksColl._transactionID).to.be.null;
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('get transaction, update document, commit and FAIL', function (done) {
			var booksColl2 = cp.database('bookshelf').collection('books');
			booksColl.beginTransaction()
				.then(response => {
					return booksColl.update(2, 'price = price + 100');
				})
				.then(response => {
					// try to fail transaction
					return booksColl2.beginTransaction();
				})
				.then(response => {
					// try to fail transaction
					return booksColl2.update(2, ' category = \'secondTransaction\'');
				})
				.catch(err => {
					booksColl.rollback()
						.then(response => {
							return booksColl2.rollback();
						})
						.then(response => {
							done();
						})
						.catch(err => {
							done();
						});
				});
		});

	});

	describe('DDL - CREATE/DROP DATABASE/COLLECTION', function () {

		var ddlTestDB = cp.database('ddl_test');

		it('createDatabase', function (done) {
			cp.createDatabase('ddl_test')
				.then(response => {
					return cp.listDatabases();
				})
				.then(response => {
					var shouldBe = [{name: 'bookshelf'}, {name: 'ddl_test'}];
					response.databases().should.eql(shouldBe);
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('creates two collections under database', function (done) {
			this.timeout(15000);
			ddlTestDB.createCollection('test_coll1')
				.then(response => {
					return ddlTestDB.createCollection('test_coll2');
				})
				.then(response => {
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('should create collection with custom settings', function (done) {
			this.timeout(15000);

			var options = {
				'dataModel'       : [
					{
						"path": "custom_id",
						"type": [
							"id"
						]
					},
					{
						"path"     : "body",
						"rank_from": 1,
						"rank_to"  : 10,
						"type"     : [
							"text",
							"string"
						]
					},
					{
						"path": "flag",
						"type": [
							"boolean"
						]
					},
					{
						"path": "nested.int_field",
						"type": [
							"integer"
						]
					},
					{
						"path": "nested.float_field",
						"type": [
							"float"
						]
					},
					{
						"path": "do_not_index",
						"type": []
					}],
				'hyperreplication': false,
				'shards'          : 3,
				'replicas'        : 3,
			};
			ddlTestDB.createCollection('test_coll3', options)
				.then(response => {
					var coll = ddlTestDB.collection('test_coll3');
					return coll.getStatus();
				})
				.then(response => {
					response.collectionStatus().should.equal('0');
					var coll = ddlTestDB.collection('test_coll3');
					return coll.describe();
				})
				.then(response => {
					var shouldBe = {
						_name          : 'ddl_test.test_coll3',
						_code_name     : 'ddl_test_test_coll3',
						_visual_name   : 'ddl_test.test_coll3',
						_shards        : '3',
						_replicas      : '3',
						_feature_v4    : 'yes',
						_support_access: 'no',
						_overrides     : {
							data_model: {
								field: [{
									path                   : 'custom_id',
									auto_index             : 'on',
									cardinality            : 'NONE',
									type                   : 'ID',
									statistics             : {
										text_field_count   : '0',
										number_field_count : '0',
										boolean_field_count: '0',
										null_field_count   : '0'
									},
									'cardinality@attribute': {override: 'off'},
									'type@attribute'       : {override: 'add'}
								},
									{
										path                   : 'body',
										auto_index             : 'on',
										cardinality            : 'NONE',
										rank_from              : '1',
										rank_to                : '10',
										type                   : ['STRING', 'TEXT'],
										statistics             : {
											text_field_count   : '0',
											number_field_count : '0',
											boolean_field_count: '0',
											null_field_count   : '0'
										},
										'cardinality@attribute': {override: 'off'},
										'type@attribute'       : {override: 'add'}
									},
									{
										path                   : 'flag',
										auto_index             : 'on',
										cardinality            : 'NONE',
										type                   : 'BOOLEAN',
										statistics             : {
											text_field_count   : '0',
											number_field_count : '0',
											boolean_field_count: '0',
											null_field_count   : '0'
										},
										'cardinality@attribute': {override: 'off'},
										'type@attribute'       : {override: 'add'}
									},
									{
										path                   : 'nested',
										auto_index             : 'on',
										cardinality            : 'NONE',
										statistics             : {
											text_field_count   : '0',
											number_field_count : '0',
											boolean_field_count: '0',
											null_field_count   : '0'
										},
										'cardinality@attribute': {override: 'off'}
									},
									{
										path                   : 'nested/int_field',
										auto_index             : 'on',
										cardinality            : 'NONE',
										type                   : 'INTEGER',
										statistics             : {
											text_field_count   : '0',
											number_field_count : '0',
											boolean_field_count: '0',
											null_field_count   : '0'
										},
										'cardinality@attribute': {override: 'off'},
										'type@attribute'       : {override: 'add'}
									},
									{
										path                   : 'nested/float_field',
										auto_index             : 'on',
										cardinality            : 'NONE',
										type                   : 'FLOAT',
										statistics             : {
											text_field_count   : '0',
											number_field_count : '0',
											boolean_field_count: '0',
											null_field_count   : '0'
										},
										'cardinality@attribute': {override: 'off'},
										'type@attribute'       : {override: 'add'}
									},
									{
										path                   : 'do_not_index',
										auto_index             : 'on',
										cardinality            : 'NONE',
										statistics             : {
											text_field_count   : '0',
											number_field_count : '0',
											boolean_field_count: '0',
											null_field_count   : '0'
										},
										'cardinality@attribute': {override: 'off'}
									}]
							}
						}
					};
					response.describe().should.eql(shouldBe);
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('should EDIT collection', function (done) {
			this.timeout(15000);

			var options = [{
				"path": "custom_idddd",
				"type": [
					"id"
				]
			}];
			ddlTestDB.editCollection('test_coll2', options)
				.then(response => {
					var coll = ddlTestDB.collection('test_coll2');
					return coll.describe();
				})
				.then(response => {
					var shouldBe = {
							_name          : 'ddl_test.test_coll2',
							_code_name     : 'ddl_test_test_coll2',
							_visual_name   : 'ddl_test.test_coll2',
							_shards        : '1',
							_replicas      : '1',
							_feature_v4    : 'yes',
							_support_access: 'no',
							_overrides     : {
								data_model: {
									field: {
										path                   : 'custom_idddd',
										auto_index             : 'on',
										cardinality            : 'NONE',
										type                   : 'ID',
										statistics             : {
											text_field_count   : '0',
											number_field_count : '0',
											boolean_field_count: '0',
											null_field_count   : '0'
										},
										'cardinality@attribute': {override: 'off'},
										'type@attribute'       : {override: 'add'}
									}
								}
							}
						}
						;
					// console.log(response.describe());
					// console.log(response.describe()._overrides.data_model.field);
					response.describe().should.eql(shouldBe);
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('should fail when creating a DB with invalid name', function (done) {
			cp.createDatabase(' ')
				.then(response => {
					done(response);
				})
				.catch(err => {
					done();
				});
		});

		it('should fail when creating a collection with invalid name', function (done) {
			ddlTestDB.createCollection(' ')
				.then(response => {
					done(response);
				})
				.catch(err => {
					done();
				});
		});

		it('listCollections 1 ', function (done) {
			cp.listCollections()
				.then(response => {
					var shouldBe = [{account: '52', name: 'pub3'},
						{name: 'request_statistics'},
						{account: '52', name: 'pub4.pub4'},
						{name: 'bookshelf.authors'},
						{name: 'bookshelf.books'},
						{name: 'ddl_test.test_coll1'},
						{name: 'ddl_test.test_coll2'},
						{name: 'ddl_test.test_coll3'}];
					response.databases().should.eql(shouldBe);
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('should drop collection', function (done) {
			this.timeout(15000);
			ddlTestDB.dropCollection('test_coll2')
				.then(response => {
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('listCollections 2 ', function (done) {
			cp.listCollections()
				.then(response => {
					var shouldBe = [{account: '52', name: 'pub3'},
						{name: 'request_statistics'},
						{account: '52', name: 'pub4.pub4'},
						{name: 'bookshelf.authors'},
						{name: 'bookshelf.books'},
						{name: 'ddl_test.test_coll1'},
						{name: 'ddl_test.test_coll3'}];
					response.databases().should.eql(shouldBe);
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('should drop DB with all collections in it', function (done) {
			cp.dropDatabase('ddl_test')
				.then(response => {
					return cp.listDatabases();
				})
				.then(response => {
					var shouldBe = {name: 'bookshelf'};
					response.databases().should.eql(shouldBe);
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('should reindex collection', function (done) {
			authorsColl.reindex()
				.then(response => {
					response.getQuery().should.equal('REINDEX COLLECTION bookshelf.authors');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('should reindex collection with custom options', function (done) {
			var options = {
				'inBackground': true,
				'shard'       : 1,
				'node'        : 5,
			};
			authorsColl.reindex(options)
				.then(response => {
					response.getQuery().should.equal('REINDEX COLLECTION bookshelf.authors IN BACKGROUND  SHARD 1 NODE 5');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('should clear collection', function (done) {
			authorsColl.clear()
				.then(response => {
					response.getQuery().should.equal('CLEAR COLLECTION bookshelf.authors');
					done();
				})
				.catch(err => {
					done(err);
				});
		});

	});

});
