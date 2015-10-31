var Store = require('../')
var assert = require('assert')
describe('nconf-etcd2', function(){
	var store

	before(function( done ){
		store = new Store({namespace:'test'});

		store.set('a',{
			b:{
				c:{
					d:1
				}
			}
		});

		store.save( done )
	})

	describe('#load', function(){
		it('should set a value', function( done ){
			var s = new Store({namespace:'test'});
			s.load( function(err, data ){
				assert.equal( s.store.a.b.c.d, 1)
				done();
			})
		})

	})

	describe('#save', function( ){
		it('should write persistanve values', function( done ){
			var s = new Store({namespace:'test'});

			s.load(function(err,data){
				assert.equal( err, null )
				s.set('a:b:c:d',2);
				s.save(function( err ){
					s.store = {};

					s.load( function(e,d){
						assert.equal( 2,~~s.get('a:b:c:d') );
						done();
					})
				})
			})
		})

		it('should deal with structural changes', function( done ){

			s = new Store({namespace:'test'});
			s.load(function( err, data ){
				s.set('a:b', 4);
				s.save( function( ){
					s.clear();
					s.load( function(e,d){
						assert.equal( 4, ~~s.get('a:b') );
						done();
					})
				})
			})
		})
	})
})