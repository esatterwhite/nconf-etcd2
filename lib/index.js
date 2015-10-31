'use strict';
var util      = require('util')
  , Etcd      = require('node-etcd')
  , merge     = require('mout/object/merge')
  , set       = require('mout/object/set')
  , async     = require('async')
  , flat      = require('flat')
  , common    = require('./common')
  , unflatten = flat.unflatten
  , defaults
  ;

const SAVE_KEY = '/%s/%s'
defaults = {
	hosts:['127.0.0.1:4001'],
	readOnly:false,
	namespace:'nconf',
	logicalSeparator:':'
};


function rebuild( d , root ){
	root = root || {};
	if(!d.dir){
		set( root, d.key.replace(/^\//,'').replace(/\//g,'.'), d.value);
		return root;
	}
	for(let x=0,len = d.nodes.length; x<len; x++){
		rebuild( d.nodes[x], root );
	}
	return root;
}

function Store( options ){
	options               = merge({},options || {}, defaults);
	this.store            = {};
	this.readOnly         = options.readOnly;
	this.type             = 'etcd';
	this.namespace        = options.namespace; 
	this.logicalSeparator = options.logicalSeparator ;
	this.client           = new Etcd( ['127.0.0.1:4001'] );
}

/**
 * DESCRIPTION
 * @method module:nconf-etcd2#get
 * @param {TYPE} NAME DESCRIPTION
 * @param {TYPE} NAME DESCRIPTION
 * @return {TYPE} DESCRIPTION
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
 * DESCRIPTION
 * @method module:nconf-etcd2#set
 * @param {TYPE} NAME DESCRIPTION
 * @param {TYPE} NAME DESCRIPTION
 * @return {TYPE} DESCRIPTION
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
 * @param {TYPE} NAME DESCRIPTION
 * @param {TYPE} NAME DESCRIPTION
 * @return {TYPE} DESCRIPTION
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
 * DESCRIPTION
 * @method module:nconf-etcd2#reset
 * @param {TYPE} NAME DESCRIPTION
 * @param {TYPE} NAME DESCRIPTION
 * @return {TYPE} DESCRIPTION
 **/
Store.prototype.reset = function reset(){
	if (this.readOnly) {
	  return false;
	}

	this.store  = {};
	return true;
};

/**
 * DESCRIPTION
 * @method module:nconf-etcd2#load
 * @param {TYPE} NAME DESCRIPTION
 * @param {TYPE} NAME DESCRIPTION
 * @return {TYPE} DESCRIPTION
 **/
Store.prototype.load = function load( cb ){
	this.client.get('/' + this.namespace, {recursive:true}, function(err, data ){
		cb(err, err ? null : this.store = rebuild( data.node )[this.namespace] );
	}.bind( this ));
};

/**
 * DESCRIPTION
 * @method module:nconf-etcd2#merge
 * @param {TYPE} NAME DESCRIPTION
 * @param {TYPE} NAME DESCRIPTION
 * @return {TYPE} DESCRIPTION
 **/
Store.prototype.merge = function(key, value ) {
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
	let tmp = flat( this.store, {delimiter:'/'});
	async.each(
		Object.keys( tmp ).sort()
		,function( key, callback ){
			var fullkey = util.format(SAVE_KEY, this.namespace, key) 
			this.client.set( 
				fullkey
				, tmp[key]
				, function( err ){
					let code = err ? err.errorCode : 0;
					switch(code){
						case 102:
							dirToValue.call(this,fullkey,tmp[key],callback);
							break;
						case 104:
							valueToDir.call(this,err.error.cause,fullkey,tmp[key],callback);
							break;
						default:
							callback( err )
					}
				}.bind( this )
			)
		}.bind( this )
		,cb 
	)
};


function dirToValue( key, value, callback ){
	this.client.rmdir( 
		  key
		, {recursive:true}
		, function( ){
			this.client.set(key, value, callback)
		}.bind( this )
	)
}
function valueToDir(dir, key, value, callback ){
	this.client.del( 
		  dir
		, function( ){
			this.client.set(key, value, callback)
		}.bind( this )
	)
}

module.exports = Store;