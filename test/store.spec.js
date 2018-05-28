'use strict';

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

  describe('namespaces', function(){
    describe('sync', function( ){
      it('should allow for a nested name spaces', function( done ){
        var namestore;
        namestore = new Store({namespace:'foo/bar'});
        namestore.set('a:b:c', 3);
        namestore.saveSync();

        namestore = new Store({namespace:'foo/bar'});
        namestore.loadSync();
        assert.equal( namestore.get('a:b:c'), 3);
        done();
      });

      it('should support the default separator when not specified', function(){
        var namestore;
        namestore = new Store({namespace:'foo:bar'});
        namestore.set('a:b:c', 10 );
        namestore.saveSync();

        namestore = new Store({namespace:'foo:bar'});
        namestore.loadSync();
        assert.equal( namestore.get('a:b:c'), 10);
      })

      it('shyould support custom separators', function( ){
        var namestore;

        namestore = new Store({namespace:'foo-bar', logicalSeparator:'-'});
        namestore.set('a-b-c', 3);
        namestore.saveSync();

        namestore = new Store({namespace:'foo-bar', logicalSeparator:'-'});
        namestore.loadSync();
        assert.equal( namestore.get('a-b-c'), 3);
      });
    });

    describe('async', function(){
      it('should allow for a nested name spaces', function( done ){
        var namestore;

        namestore = new Store({namespace:'foo/bar'});
        namestore.store = {};

        namestore.load(function(){
          assert.equal( namestore.get('a:b:c'), 3);
          namestore.set('a:b:c', 5)
          namestore.save(function( err ){
            namestore.store = {};
            namestore.load(function(){
              assert.equal( namestore.get('a:b:c'),5);
              done();
            });
          })
        })
      });

      it('should allow for customer separators', function( done ){
        var namestore;

        namestore = new Store({namespace:'foo-bar', logicalSeparator:'-'});
        namestore.store = {};

        namestore.load(function(){
          assert.equal( namestore.get('a-b-c'), 5);
          namestore.set('a-b-c', 3)
          namestore.save(function( err ){
            namestore.store = {};
            namestore.load(function(){
              assert.equal( namestore.get('a-b-c'),3);
              done();
            });
          })
        })
      });
    });
  });
  describe('#load', function(){
    it('should load a value', function( done ){
      var s = new Store({namespace:'test'});
      s.load( function(err, data ){
        assert.equal( s.store.a.b.c.d, 1)
        done();
      })
    })

  })

  describe('#save', function( ){
    it('should write values to etcd', function( done ){
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

      var s = new Store({namespace:'test'});
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
