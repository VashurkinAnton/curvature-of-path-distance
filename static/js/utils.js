(function(){
	var utils = {};
	
	utils.extendClass = function extend(Child, Parent) {
		var F = function() { };
		F.prototype = Parent.prototype;
		Child.prototype = new F();
		Child.prototype.constructor = Child;
		Child.superclass = Parent.prototype;
	};

	window.utils = utils;
})();