/*jshint laxcomma: true, smarttabs: true, node:true, mocha: true*/
'use strict';
/**
 * Etcd2 storage backend for nconf
 * @module nonf-etcd2
 * @author Eric Satterwhite 
 * @since 1.0.0
 * @requires util
 * @requires async
 * @requires flat
 * @requires node-etcd
 * @requires mout/objec/merge
 * @requires mout/objec/set
 * @requires mout/objec/toArray
 * @requires nconf-etcd/lib/common
 */

var util      = require('util')
  , Etcd      = require('node-etcd')
  , merge     = require('mout/object/merge')
  , set       = require('mout/object/set')
  , get       = require('mout/object/get')
  , toArray   = require('mout/lang/toArray')
  , async     = require('async')
  , flat      = require('flat')
  , common    = require('./common')
  , unflatten = flat.unflatten
  , NOOP      =  new Function()
  , SAVE_KEY  = '/%s/%s'
  , defaults
  ;


try{
	var conf = require('nconf');
	conf.Etcd = Store;
} catch( e ) {}

defaults = {
	hosts:null,
	readOnly:false,
	namespace:'nconf',
	logicalSeparator:':',
	etcd: null
};

function rebuild( d , root ){
	var x, len;
	root = root || {};
	if(!d.dir){
		set( root, d.key.replace(/^\//,'').replace(/\//g,'.'), d.value);
		return root;
	}

	len = d.nodes ? d.nodes.length : 0;
	
	for(x=0; x<len; x++){
		rebuild( d.nodes[x], root );
	}
	return root;
}

/**
 * @constructor
 * @alias nconf-etcd2 
 * @param {Object} [options] store and etcd client options
 * @param {Boolean} [options.readOnly=false] set to true, all write command will be ignored
 * @param {String} [options.namespace='nconf'] the namespace to store data in etcd
 * @param {String} [options.logicalSeparator=":"] The separator that is used to interperet nested values
 * @param {String[]} [options.hosts=127.0.0.1:4001] a list of etcd2 hosts
 * @param {?Object} [options.etcd] options for the node-etcd client
 * @param {String} [options.etcd.ca] path to a ssl ca file
 * @param {String} [options.etcd.cert] path to ssl certificate file
 * @param {String} [options.etcd.key] path to matching ssl key file
 **/
function Store( options ){
	options               = merge({},defaults, options);
	this.options          = options;
	this.store            = {};
	this.readOnly         = options.readOnly;
	this.type             = 'etcd';
	this.logicalSeparator = options.logicalSeparator;
	this.namespace        = options.namespace.replace(/^\//,'').replace(new RegExp(this.logicalSeparator,'g'),'/'); 
	this.client           = new Etcd( toArray( options.hosts || '127.0.0.1:4001' ), options.etcd );
}

/**
 * Get a value from the internal store
 * @method module:nconf-etcd2#get
 * @param {String} key Key to retrieve for this instance.
 * @return {String|Object} value
 **/
Store.prototype.get = function get(key){
	var target = this.store
	  , path   = common.path(key, this.logicalSeparator)
	  ;

	while (path.length > 0) {
		key = path.shift();
		if (target && target.hasOwnProperty(key)) {
			target = target[key];
			continue;
		}
		return undefined;
	}

	return target;
};

/**
 * Sets a value or nested values at a given key
 * This method does not save to etcd. use the {@link module:nconf-etcd2#save|save}
 * @method module:nconf-etcd2#set
 * @param {String} key The key at which to set a value
 * @param {String|Object} value the value to set. 
 * @return {String|Object}
 **/
Store.prototype.set = function set(key, value){
	if (this.readOnly) {
	  return false;
	}

	var target = this.store,
		path   = common.path(key, this.logicalSeparator);

	if (path.length === 0) {
	  if (!value || typeof value !== 'object') {
		return false;
	  }
	  else {
		this.reset();
		this.store = value;
		return true;
	  }
	}

	while (path.length > 1) {
	  key = path.shift();
	  if (!target[key] || typeof target[key] !== 'object') {
		target[key] = {};
	  }

	  target = target[key];
	}

	// Set the specified value in the nested JSON structure
	key = path.shift();
	target[key] = value;
	return true;
};

/**
 * DESCRIPTION
 * @method module:nconf-etcd2#clear
 * @param {String} key deletes a specific key from the structure
 **/
Store.prototype.clear = function clear(key){
	if (this.readOnly) {
	  return false;
	}

	var target = this.store,
		value  = target,
		path   = common.path(key, this.logicalSeparator);

	//
	// Scope into the object to get the appropriate nested context
	//
	for (var i = 0; i < path.length - 1; i++) {
	  key = path[i];
	  value = target[key];
	  if (typeof value !== 'function' && typeof value !== 'object') {
		return false;
	  }
	  target = value;
	}

	// Delete the key from the nested JSON structure
	key = path[i];
	delete target[key];
	return true;
};


/**
 * Clears the internal store
 * @method module:nconf-etcd2#reset
 * @return {Boolean} success
 **/
Store.prototype.reset = function reset(){
	if (this.readOnly) {
	  return false;
	}

	this.store  = {};
	return true;
};

/**
 * Loads data from the namespace in ectd and caches it locally
 * @method module:nconf-etcd2#load
 * @param {Function} callback node style callback. passed the result of the data load if succeeds
 **/
Store.prototype.load = function load( cb ){
	this.client.mkdir('/' + this.namespace,function(){
		this.client.get('/' + this.namespace, {recursive:true}, function(err, data ){
			var keypath = this.namespace.replace(/\//g , '.');
			(cb||NOOP)(err, err ? null : this.store = get( rebuild( data.node ), keypath) );
		}.bind( this ));
	}.bind(this))
};

/**
 * Loads data from the namespace in ectd and caches it locally 
 * @method module:nconf-etcd2#load
 * @param {Function} callback node style callback. passed the result of the data load if succeeds
 **/
Store.prototype.loadSync = function load( cb ){
	var response = this.client.getSync('/' + this.namespace, {recursive:true})
	  , keypath
	  ;

	keypath = this.namespace.replace(/\//g , '.');

	if(response.err){
		if( response.err.errorCode == 100){
			this.client.mkdirSync('/' + this.namespace)
			return this.store = {};
		} else {
			throw response.err;
		}
	} 
	return this.store = get( rebuild( response.body.node ), keypath);
};

/**
 * Merges the properties in `value` into the existing object value
 * at `key`. If the existing value `key` is not an Object, it will be
 * completely overwritten.
 * @method module:nconf-etcd2#merge
 * @param {String} key the key of the value to to merge
 * @param {Object} value The object to merge into the current value
 * @return {Boolean} success
 **/
Store.prototype.merge = function( key, value ) {
	if (this.readOnly) {
	  return false;
	}

	//
	// If the key is not an `Object` or is an `Array`,
	// then simply set it. Merging is for Objects.
	//
	if (typeof value !== 'object' || Array.isArray(value) || value === null) {
	  return this.set(key, value);
	}

	var self    = this,
		target  = this.store,
		path    = common.path(key, this.logicalSeparator),
		fullKey = key;

	//
	// Scope into the object to get the appropriate nested context
	//
	while (path.length > 1) {
	  key = path.shift();
	  if (!target[key]) {
		target[key] = {};
	  }

	  target = target[key];
	}

	// Set the specified value in the nested JSON structure
	key = path.shift();

	//
	// If the current value at the key target is not an `Object`,
	// or is an `Array` then simply override it because the new value
	// is an Object.
	//
	if (typeof target[key] !== 'object' || Array.isArray(target[key])) {
	  target[key] = value;
	  return true;
	}

	return Object.keys(value).every(function (nested) {
	  return self.merge(common.keyed(self.logicalSeparator, fullKey, nested), value[nested]);
	});
};
/**
 * Saves the current data cache to the etcd backend 
 * error 102 dir -> value
 * error 104 value -> dir
 * @method module:nconf-etcd2#save
 * @param {Function} callback node style callback
 **/
Store.prototype.save = function save( cb ){
	var tmp = flat( this.store, {delimiter:'/'});
	async.each(
		Object.keys( tmp ).sort()
		,function( key, callback ){
			var fullkey = util.format(SAVE_KEY, this.namespace, key);
			this.client.set( 
				fullkey
				, tmp[key]
				, function( err ){
					var code = err ? err.errorCode : 0;
					switch(code){
						case 102:
							dirToValue.call(this,fullkey,tmp[key],callback);
							break;
						case 104:
							valueToDir.call(this,err.error.cause,fullkey,tmp[key],callback);
							break;
						default:
							callback( err );
					}
				}.bind( this )
			);
		}.bind( this )
		,(cb || NOOP)
	);
};

/**
 * Saves the current data cache to the etcd backend 
 * @method module:nconf-etcd2#saveSync
 * @param {Function} callback node style callback
 **/
Store.prototype.saveSync = function save( cb ){
	var tmp = flat( this.store, {delimiter:'/'})
	  , keys = Object.keys( tmp ).sort()
	  , fullkey
	  , response
	  , code
	  , key
	  ;

	for(var idx=0, len=keys.length; idx<len; idx++ ){
		key      = keys[idx];
		fullkey  = util.format(SAVE_KEY, this.namespace, key); 
		response = this.client.setSync( fullkey, tmp[key]);
		code     = response.err ? response.err.error.errorCode : 0;

		switch(code){
			case 102:
				this.client.rmdirSync( fullkey, {recursive:true} );
				this.client.setSync(fullkey, tmp[key]);
				break;
			case 104:
				this.client.delSync(response.err.error.cause);
				this.client.setSync(fullkey, tmp[key]);
				break;
			default:
				return;
		}
		
	}
	// cleanup;
	tmp = keys = response = code = null;
	return this.store;
};

function dirToValue( key, value, callback ){
	this.client.rmdir( 
		  key
		, {recursive:true}
		, function( ){
			this.client.set(key, value, callback);
		}.bind( this )
	)
};
function valueToDir(dir, key, value, callback ){
	this.client.del( 
		  dir
		, function( ){
			this.client.set(key, value, callback);
		}.bind( this )
	)
};

module.exports = Store;
