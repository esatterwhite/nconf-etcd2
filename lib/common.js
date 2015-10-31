

exports.path = function( key, sep ){
	separator = separator || ':';
	return key == null ? [] : key.split(separator);
};

exports.key = function(){
	return Array.prototype.slice.call(arguments).join(':');
};

exports.keyed = function () {
  return Array.prototype.slice.call(arguments, 1).join(arguments[0]);
};
