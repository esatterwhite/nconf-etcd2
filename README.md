# nconf-etcd2
An nconf bacckend store for [Etcd2](https://coreos.com/etcd/)

```
npm install nconf-etcd2 --savej
```

An ETCD2 backend for nconf


```javascript
Store = require('nconf-etcd2')
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
});
```

### Usage with nconf
```
var nconf = require('nconf');
var Etcd  = require('nconf-etcd2'); // tries to attach to the nconf instance

nconf.use('etcd', { /* options */ });
nconf.load(console.log);
```

### Support For Syncronous Methods
```
var nconf = require('nconf');
var Etcd  = require('nconf-etcd2'); // tries to attach to the nconf instance

nconf.use('etcd', { namespace:'test'});
nconf.load();
nconf.set( 'a:b:c', 1);
nconf.save(); // Saveed to etc!
```
