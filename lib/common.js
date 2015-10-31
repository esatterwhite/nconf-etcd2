/*jshint laxcomma: true, smarttabs: true, node:true, mocha: true*/
'use strict';
/**
 * common helper functions
 * @module nconf-etcd2/lib/common
 * @author Eric Satterwhite
 * @since 1.0.0
 */

var SEPARATOR = ':'

/**
 * @method nconf-etcd2/lib/common#path
 * @return {String[]} DESCRIPTION
 **/
exports.path = function( key, separator ){
	separator = separator || SEPARATOR ;
	return key == null ? [] : key.split(separator);
};

/**
 * @method nconf-etcd2/lib/common#key
 * @return {String}
 **/
exports.key = function(){
	return Array.prototype.slice.call(arguments).join(SEPARATOR);
};

/**
 * @method nconf-etcd2/lib/common#keyed
 * @return {String}
 **/
exports.keyed = function () {
  return Array.prototype.slice.call(arguments, 1).join(arguments[0]);
};
