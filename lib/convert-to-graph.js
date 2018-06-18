"use strict";
(function(root, factory) {
	// Configuration
	var exportName = 'convertToGraph';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(exportName, ['/lib/graph', '/lib/geo'], factory);
	} else if (typeof exports === 'object') {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		var resolvedDependencies = ['./graph', './geo'].map(function(name) {
			return require(name);
		});
		module.exports = factory.apply(root, resolvedDependencies);
	} else {
		// Browser globals (root is window)
		var resolvedDependencies = ['Graph', 'geo'].map(function(name) {
			return root[name];
		});
		root[exportName] = factory.apply(root, resolvedDependencies);
	}

	// Dependencies passed as arguments
}(this, function(Graph, geo) {
	function fromOSM(OSM, callback) {
		var graph = new Graph();

		if (!OSM.elements) {
			OSM.elements = [];
		}

		OSM.elements.reverse(); // Reverse array with data, in forward direction array starts from ways(edges).

		// Initialize progress bar.
		callback && callback.init && callback.init(OSM.elements.length);

		var idIndexMap = {};
		OSM.elements.forEach(function(element, elementIndex) {
			if (element.type === "node") {
				idIndexMap[element.id] = graph.addNode({ // Create new node. All nodes in asm format is unique because of this we can skip cheking for same nodes.
					x: element.lon,
					y: element.lat,
				});
			} else if (element.type === "way" && element.nodes.length > 1) {
				for (var nodeIndex = 1; nodeIndex < element.nodes.length; nodeIndex += 1) {
					var indexOfNodeA = idIndexMap[element.nodes[nodeIndex - 1]];
					var indexOfNodeB = idIndexMap[element.nodes[nodeIndex]];

					graph.addEdge( // New edge in graph.
						indexOfNodeA, // Index of first node.
						indexOfNodeB, // Index of second node.
						geo.getDistanceBetweenNodes( // Destance in meters between nodes.
							graph.data[indexOfNodeA], // First node.
							graph.data[indexOfNodeB] // Second node.
						)
					);
				}
			}

			// Progress bar tic.
			callback && callback.tic && callback.tic(elementIndex + 1);
		});

		// Progress bar end.
		callback && callback.end && callback.end();
		return graph;
	};

	function fromGeojson(geojson, callback) {
		var graph = new Graph();
		// Initialize progress bar.
		callback && callback.init && callback.init((geojson.features || []).length);

		(geojson.features || []).forEach(function(feature, featureIndex) {
			if (feature.properties['@id'].indexOf('way') === -1) { //skip not road nodes
				return false;
			}

			var roadNodeIndexes = [];
			var relations = [];
			((feature.geometry || {}).coordinates || []).forEach(function(point, pointIndex) {
				// Data for new graph node.
				var nodeIndex;
				var newNodeData = {
					x: point[1],
					y: point[0]
				};

				// Search of existing node with same coordinates.
				var existingIndex = graph.data.findIndex(function(node, nodeIndex) {
					if (roadNodeIndexes.indexOf(nodeIndex) === -1) { // Not node from current road.
						if (node.x === newNodeData.x && node.y === newNodeData.y) {
							return nodeIndex;
						}
					}
				});

				if (existingIndex !== -1) { // Use existin node if found.
					nodeIndex = existingIndex;
				} else { // Create new node if not found.
					nodeIndex = graph.addNode(newNodeData);
				}

				if (roadNodeIndexes[pointIndex - 1] !== undefined) { // Add relation for next processing.
					relations.push([roadNodeIndexes[pointIndex - 1], nodeIndex]);
				}

				roadNodeIndexes.push(nodeIndex);
			});

			// Add relations to graph.
			relations.forEach(function(relation) {
				graph.addEdge( // New edge in graph.
					relation[0], // Index of first node.
					relation[1], // Index of second node.
					geo.getDistanceBetweenNodes( // Destance in meters between nodes.
						graph.data[relation[0]], // First node.
						graph.data[relation[1]] // Second node.
					)
				);
			});

			// Progress bar tic.
			callback && callback.tic && callback.tic(featureIndex + 1);
		});

		// Progress bar end.
		callback && callback.end && callback.end();
		return graph;
	};

	return {
		fromOSM: fromOSM,
		fromGeojson: fromGeojson
	}
}));
