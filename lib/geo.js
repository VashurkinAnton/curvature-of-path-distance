"use strict";
(function(root, factory) {
	// Configuration
	var exportName = 'geo';
	var dependenciesNames = [];

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(exportName, dependencies, factory);
	} else if (typeof exports === 'object') {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		var resolvedDependencies = dependenciesNames.map(function(name) {
			return require(name);
		});
		module.exports = factory.apply(root, resolvedDependencies);
	} else {
		// Browser globals (root is window)
		var resolvedDependencies = dependenciesNames.map(function(name) {
			return root[name];
		});
		root[exportName] = factory.apply(root, resolvedDependencies);
	}

	// Dependencies passed as arguments
}(this, function() {
	var geo = {
		EARTH_RADIUS_MAJOR: 6378137.0,
		EARTH_RADIUS_MINOR: 6356752.314245179
	};

	geo.getBounds = function(geoJSON) {
		var minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;
		(geoJSON.features || []).forEach(function(feature) {
			((feature.geometry || {}).coordinates || []).forEach(function(point) {
				if (minX > point[0]) {
					minX = point[0];
				}
				if (minY > point[1]) {
					minY = point[1];
				}
				if (maxX < point[0]) {
					maxX = point[0];
				}
				if (maxY < point[1]) {
					maxY = point[1];
				}
			});
		});

		return [
			[minX, minY],
			[maxX, maxY]
		];
	};

	geo.toRadians = function(coordinate) {
		return coordinate * Math.PI / 180;
	};

	geo.toDegrees = function(coordinate) {
		return coordinate * 180 / Math.PI;
	};

	// https://www.movable-type.co.uk/scripts/latlong.html
	// https://en.wikipedia.org/wiki/Haversine_formulas
	geo.getDistanceBetweenPoints = function(pointA, pointB) {
		var R = 6371e3; // metres
		var φ1 = geo.toRadians(pointA[0]); // latitude a
		var φ2 = geo.toRadians(pointB[0]); // latitude b
		var Δφ = geo.toRadians(pointB[0] - pointA[0]);
		var Δλ = geo.toRadians(pointB[1] - pointA[1]);

		var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
			Math.cos(φ1) * Math.cos(φ2) *
			Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return parseFloat((R * c).toFixed(2), 10);
	};

	geo.getDistanceBetweenNodes = function(nodeA, nodeB) {
		return geo.getDistanceBetweenPoints([nodeA.x, nodeA.y], [nodeB.x, nodeB.y]);
	};

	// Convert from long/lat to google mercator (or EPSG:4326 to EPSG:900913 (WGS84)).
	geo.degrees2meters = function(lat, lon) {
		var x = geo.toRadians(lon) * geo.EARTH_RADIUS_MAJOR;
		var y = Math.log(Math.tan(geo.toRadians(lat) / 2 + Math.PI / 4)) * geo.EARTH_RADIUS_MAJOR;

		return { x: x, y: y };
	};

	
	geo.meters2degrees = function(x, y) {
		var lon = geo.toDegrees(x / geo.EARTH_RADIUS_MAJOR);
		var lat = geo.toDegrees((Math.atan(Math.exp(y / geo.EARTH_RADIUS_MAJOR)) - Math.PI / 4) * 2)

		return { lat: lat, lon: lon };
	};

	return geo;
}));
