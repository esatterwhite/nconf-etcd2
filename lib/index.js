var Etcd = require('node-etcd')
  , merge = require('mout/object/merge')
  , defaults
  ;

defaults = {
	hosts:['127.0.0.1:4001'],
	readOnly:false,
	namespace:'nconf'
	logicalSeparator:':'
}

function Store( options ){
	options               = merge({},options, defaults);
	this.store            = {};
	this.readOnly         = options.readOnly;
	this.type             = 'etcd'
	this.namespace        = options.namespace 
	this.logicalSeparator = options.logicalSeparator ;
	this.client           = new Etcd( options.hosts, options );
}

/**
 * DESCRIPTION
 * @method index.js#<METHODNAME>
 * @param {TYPE} NAME DESCRIPTION
 * @param {TYPE} NAME DESCRIPTION
 * @return {TYPE} DESCRIPTION
 **/
Store.prototype.get = function get(key){
	var target = this.store,
		path   = common.path(key, this.logicalSeparator);

	//
	// Scope into the object to get the appropriate nested context
	//
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
 * @method index.js#<METHODNAME>
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
	  //
	  // Root must be an object
	  //
	  if (!value || typeof value !== 'object') {
		return false;
	  }
	  else {
		this.reset();
		this.store = value;
		return true;
	  }
	}



	//
	// Scope into the object to get the appropriate nested context
	//
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
}

/**
 * DESCRIPTION
 * @method index.js#<METHODNAME>
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
}


/**
 * DESCRIPTION
 * @method index.js#<METHODNAME>
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
}

/**
 * DESCRIPTION
 * @method index.js#<METHODNAME>
 * @param {TYPE} NAME DESCRIPTION
 * @param {TYPE} NAME DESCRIPTION
 * @return {TYPE} DESCRIPTION
 **/
Store.prototype.load = function load( cb ){
	this.client.get('/conf', function( data ){
		data = data ? JSON.parse( data ) : {}
		this.store = data;
		cb(data)
	}.bind( this ))
}

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
 * DESCRIPTION
 * @method index.js#<METHODNAME>
 * @param {TYPE} NAME DESCRIPTION
 * @param {TYPE} NAME DESCRIPTION
 * @return {TYPE} DESCRIPTION
 **/
Store.prototype.save = function save( cb ){
	this.client.set('/conf', JSON.stringify( this.store ), cb )
};

module.exports = Store;