(function() {
	// default zoom, center
	var zoom = 15;
	var center = [4950899.64, 6222898.53];

	if (window.location.hash !== '') {
		// try to restore center, zoom-level from the URL
		var hash = window.location.hash.replace('#map=', '');
		var parts = hash.split('/');
		if (parts.length === 3) {
			zoom = parseInt(parts[0], 10);
			center = [
				parseFloat(parts[1]),
				parseFloat(parts[2])
			];
		}
	}

	var map = new ol.Map({
		layers: [
			new ol.layer.Tile({
				source: new ol.source.OSM()
			})
		],
		controls: ol.control.defaults({
			attributionOptions: {
				collapsible: false
			}
		}),
		target: 'map',
		view: new ol.View({
			center: center,
			zoom: zoom
		})
	});

	var shouldUpdate = true;
	var view = map.getView();
	var updatePermalink = function() {
		if (!shouldUpdate) {
			// do not update the URL when the view was changed in the 'popstate' handler
			shouldUpdate = true;
			return;
		}

		var center = view.getCenter();
		var hash = '#map=' +
			view.getZoom() + '/' +
			Math.round(center[0] * 100) / 100 + '/' +
			Math.round(center[1] * 100) / 100;

		var state = {
			zoom: view.getZoom(),
			center: view.getCenter()
		};
		window.history.pushState(state, 'map', hash);
	};

	map.on('moveend', updatePermalink);

	// restore the view state when navigating through the history, see
	// https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
	window.addEventListener('popstate', function(event) {
		if (event.state === null) {
			return;
		}
		map.getView().setCenter(event.state.center);
		map.getView().setZoom(event.state.zoom);
		shouldUpdate = false;
	});

	var roadsLayer;
	var shortPathLayer;
	var __graphData = null;

	function OlLayer(map) {
		this.source = new ol.source.Vector({
			features: []
		});

		this.layer = new ol.layer.Vector({
			source: this.source
		});

		this.layer.setMap(map);
	};
	OlLayer.prototype.clear = function() {
		this.source.clear({ fast: true });
	};
	OlLayer.prototype.draw = function(features) {
		this.clear();
		this.source.addFeatures(features);
	};

	// Roads class extends olLayer.
	function Roads(map) {
		Roads.superclass.constructor.call(this, map);
	};
	utils.extendClass(Roads, OlLayer);

	Roads.prototype.draw = function(graph, options) {
		if (!options) { options = {}; }
		var features = [];
		graph.data.forEach(function(node, index) {
			node.edges.map(function(edge) {
				var feature = Roads.edgeToFeature(edge, options);

				if (options.style && Roads.styles[options.style]) {
					feature.setStyle(Roads.styles[options.style]);
				}

				feature.set('nodeIndex', index, true);
				features.push(feature);
			});
		});

		Roads.superclass.draw.call(this, features);
	};

	// Roads static methods.
	Roads.edgeToFeature = function(edge, options) {
		if (!options) { options = {}; }
		var r0 = geo.degrees2meters(edge.relation[0].y, edge.relation[0].x);
		var r1 = geo.degrees2meters(edge.relation[1].y, edge.relation[1].x);

		return new ol.Feature({
			geometry: new ol.geom.LineString([
				[r0.x, r0.y],
				[r1.x, r1.y]
			]),
			name: 'road',
			type: options.type || ""
		});
	};

	Roads.styles = {
		SPSingle: new ol.style.Style({
			fill: new ol.style.Fill({
				color: 'rgb(0, 255, 0)'
			}),
			stroke: new ol.style.Stroke({
				color: 'rgb(0, 255, 0)'
			}),
			zIndex: 101
		}),
		SPMatrix: new ol.style.Style({
			fill: new ol.style.Fill({
				color: 'rgba(255, 0, 0, 0.5)'
			}),
			stroke: new ol.style.Stroke({
				color: 'rgba(255, 0, 0, 0.5)'
			})
		})
	};

	// Nodes class extends olLayer.
	function Nodes(map) {
		Nodes.superclass.constructor.call(this, map);
	};
	utils.extendClass(Nodes, OlLayer);

	Nodes.prototype.draw = function(graph, options) {
		if (!options) { options = {}; }
		var features = graph.data.map(function(node, index) {
			var feature = Nodes.nodeToFeature(node, options);

			if (options.style && Nodes.styles[options.style]) {
				feature.setStyle(Nodes.styles[options.style]);
			} else {
				feature.setStyle(Nodes.styles["defaut"]);
			}

			var _index = index;
			if (graph.indexMap) {
				_index = graph.indexMap[_index];
			}

			feature.set('nodeIndex', _index, true);
			return feature;
		});

		Nodes.superclass.draw.call(this, features);
	};

	// Nodes static methods.
	Nodes.nodeToFeature = function(node, options) {
		if (!options) { options = {}; }
		var center = geo.degrees2meters(node.y, node.x);
		var radius = options.radius || 4;

		return new ol.Feature({
			geometry: new ol.geom.Circle([center.x, center.y], radius),
			name: 'node',
			type: options.type || ""
		});
	};

	Nodes.styles = {
		defaut: new ol.style.Style({
			fill: new ol.style.Fill({
				color: '#fff'
			}),
			stroke: new ol.style.Stroke({
				color: '#00f'
			}),
			zIndex: 101
		}),
		leaf: new ol.style.Style({
			fill: new ol.style.Fill({
				color: '#f00'
			}),
			stroke: new ol.style.Stroke({
				color: '#f00'
			}),
			zIndex: 102
		}),
		best: new ol.style.Style({
			fill: new ol.style.Fill({
				color: '#0f0'
			}),
			stroke: new ol.style.Stroke({
				color: '#00f'
			}),
			zIndex: 102
		})
	};

	var roads = new Roads(map);
	var SPMRoads = new Roads(map);
	var SPRoads = new Roads(map);

	var nodes = new Nodes(map);
	var leafNodes = new Nodes(map);
	var bestNodes = new Nodes(map);

	map.drawRoads = function(graphData) {
		__graphData = graphData;
		__graphData.bestNodeIndex = graphData.graph.data.indexOf(graphData.nodeWithMinimalRelations);
		
		SPRoads.clear();

		roads.draw(graphData.graph);
		nodes.draw(graphData.graph);

		SPMRoads.draw({ data: graphData.SPNodes }, {
			style: 'SPMatrix',
			type: 'SPM'
		});

		leafNodes.draw({
			data: graphData.leafNodes,
			indexMap: graphData.leafNodes.map(function(leafNode) {
				return graphData.graph.data.indexOf(leafNode);
			})
		}, {
			style: 'leaf',
			type: 'leaf',
			radius: 10
		});

		bestNodes.draw({ data: [graphData.nodeWithMinimalRelations] }, {
			style: 'best',
			type: 'best',
			radius: 15
		});
	};

	map.on("singleclick", function(e) {
		if(__graphData){
			var processed = false;
			map.forEachFeatureAtPixel(e.pixel, function(feature, layer) {
				if(processed){ return false; }
				if (feature.get('name') === 'node' && feature.get('type') === 'leaf') {
					var leafIndex = feature.get('nodeIndex');
					var bestNodeIndex = __graphData.bestNodeIndex;
					if(__graphData.SPM[leafIndex] && __graphData.SPM[leafIndex][bestNodeIndex]){
						SPRoads.draw({ data: [{edges: __graphData.SPM[leafIndex][bestNodeIndex]}] }, {
							style: 'SPSingle',
							type: 'SP'
						});

						processed = 'short-path';
						olBalloon.hide();
					}
				} else if (feature.get('name') === 'node' && feature.get('type') === ""){
					var nodeIndex = feature.get('nodeIndex');
					var MCP = __graphData.MCP.find(function(datum){
						return datum.nodeIndex == nodeIndex;
					});
					var ACP = __graphData.ACP.find(function(datum){
						return datum.nodeIndex == nodeIndex;
					});

					if(MCP && ACP){
						var info = "Node index: " + nodeIndex + "<br>" +
						"Max curvature: " + MCP.value + "<br>" +
						"Average curvature: " + ACP.value + "<br>";

						olBalloon.show(info, e.coordinate);
						processed = 'balloon';
					}
					
				}
			}, { hitTolerance: 10 });

			if(!processed || processed !== 'balloon'){
				olBalloon.hide();
			}
		}else{
			olBalloon.hide();
		}
	});

	window.olMap = map;
})()
