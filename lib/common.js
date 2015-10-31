
const SEPARATOR = ':'
exports.path = function( key, separator ){
	separator = separator || SEPARATOR ;
	return key == null ? [] : key.split(separator);
};

exports.key = function(){
	return Array.prototype.slice.call(arguments).join(SEPARATOR);
};

exports.keyed = function () {
  return Array.prototype.slice.call(arguments, 1).join(arguments[0]);
};
