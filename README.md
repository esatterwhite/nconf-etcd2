# nconf-etcd2
An nconf backend store for [Etcd2](https://coreos.com/etcd/)

```
npm install nconf-etcd2 --save
```

An ETCD2 backend for nconf


```javascript
var Store = require('nconf-etcd2')
var s = new Store({namespace:'test'});
var assert = require('assert')

s.load(function(err,data){
	assert.equal( err, null )
	s.set('a:b:c:d',2);
	s.save(function( err ){
		s.store = {};

		s.load( function(e,d){
			assert.equal( 2,~~s.get('a:b:c:d') );
			done();
		});
	});
});
```

### Usage with nconf
```javascript
var nconf = require('nconf');
var Etcd  = require('nconf-etcd2'); // tries to attach to the nconf instance

nconf.use('etcd', { /* options */ });
nconf.load(console.log);
```

### Support For Syncronous Methods
```javascript
var nconf = require('nconf');
var Etcd  = require('nconf-etcd2'); // tries to attach to the nconf instance

nconf.use('etcd', { namespace:'test', hosts:['192.168.0.1:4001', '10.50.5.1:4001']});
nconf.load();
nconf.set( 'a:b:c', 1);
nconf.save(); // Saved to etc!
```
