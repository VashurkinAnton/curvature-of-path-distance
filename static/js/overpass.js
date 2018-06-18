(function() {
	var overpass = {

		domain: "https://overpass.kumi.systems",
		path: "/api/interpreter"
	};
	overpass.cutGraph = function(graph, bbox){
		graph = new Graph(graph.stringify());

		for (var nodeIndex = graph.data.length - 1; nodeIndex >= 0; nodeIndex--) {
			var behindTheLon = graph.data[nodeIndex].y > bbox[0].lat || graph.data[nodeIndex].y < bbox[1].lat;
			var behindTheLat = graph.data[nodeIndex].x > bbox[1].lon || graph.data[nodeIndex].x < bbox[0].lon;
			
			if(behindTheLon || behindTheLat){
				graph.removeNode(nodeIndex);
			}
		}

		return new Graph(Graph.stringify(graph.mostBiggestSubGraph()))
	};
	overpass.bbox = function(bbox, callback){
		overpass.query(bbox, function(osm){
			var graph = convertToGraph.fromOSM(osm);
			graph = overpass.cutGraph(graph, bbox);

			var message = "";
			if(graph.data.length > 300 && graph.data.length < 600){
				message = "Graph contains " + graph.data.length + " nodes. Matrinx of shortest paths calculation take less then 30s. Continue?";
			}else if(graph.data.length >= 600 && graph.data.length < 1000){
				message = "Graph contains " + graph.data.length + " nodes. Matrinx of shortest paths calculation take less then 2 mins. Continue?";
			}else if(graph.data.length >= 1000 && graph.data.length < 2000){
				message = "Graph contains " + graph.data.length + " nodes. Matrinx of shortest paths calculation take more then 10 mins. Continue?";
			}else if(graph.data.length >= 2000 && graph.data.length < 3000){
				message = "Graph contains " + graph.data.length + " nodes. Matrinx of shortest paths calculation take more then 1 hour. Do you realy want?";
			}else if(graph.data.length >= 3000){
				message = "Graph contains " + graph.data.length + " nodes. Matrinx of shortest paths calculation can take more then 1 day. Do you realy want?";
			}

			if(message){
				var confirmation = window.confirm(message);
			}

			if(!message || confirmation){
				if(!(graph.data.length >= 3000 && window.confirm('You mean not, right?'))){
					var SPM = graph.getShortestPathsMatrix();
					var DM = graph.getDistanceMatrix(null, geo.getDistanceBetweenNodes);
					var CPM = Graph.issueRelationMatrix(SPM, DM);
					var MCP = Graph.issueRelationMaximum(CPM);
					var ACP = Graph.issueRelationSum(CPM);
					var nodeIndexWithMinimalRelations = Graph.issueMinimalRelationNode(MCP, ACP);

					var SPNodes = []; // Nodes in sorted paths to leaf nodes.
					Object.keys(SPM).forEach(function(nodeIndex){
						var NodeSP = SPM[nodeIndex];

						(NodeSP[nodeIndexWithMinimalRelations] || []).forEach(function(pathNode){
							pathNode.relation.forEach(function(node){
								if(SPNodes.indexOf(node)){
									SPNodes.push(node);
								}
							});
						});
					});

					var leafNodes = Object.keys(DM).map(function(nodeIndex){
						return graph.data[nodeIndex];
					}); // Leaf nodes.
										
					return callback && callback(null, { 
						MCP: MCP,
						ACP: ACP,
						SPM: SPM,
						graph: graph, 
						SPNodes: SPNodes, 
						leafNodes: leafNodes,
						nodeWithMinimalRelations: graph.data[nodeIndexWithMinimalRelations ]
					});
				}
			}

			callback && callback("Canceled.");
		}, function(err){
			callback && callback(err.responseText);
		})	
	};

	overpass.query = function(bbox, success, error) {
		if (!bbox) {
			throw new Error('bbox should not be empty')
		}

		var _bbox = 's="' + bbox[1].lat + '" e="' + bbox[1].lon + '"' // Bottom-right point.
		+ ' n="' + bbox[0].lat + '" w="' + bbox[0].lon + '"'; // Top-left point.

		window.microAjax({
			type: 'POST',
			url: {
				domain: overpass.domain,
				path: overpass.path
			},
			contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
			success: success,
			error: error,
			data: {
				data: '<?xml version="1.0" encoding="UTF-8"?>' +
				'<osm-script output="json" timeout="60">\n' +
				'	<!-- gather results -->\n' +
				'	<union>\n' +
				'		<query type="way">\n' +
				'			<has-kv k="highway"/>\n' +
				'			<has-kv k="highway" modv="not" v="footway"/>\n' +
				'			<has-kv k="highway" modv="not" v="pedestrian"/>\n' +
				'			<has-kv k="-highway" modv="not" v="path"/>\n' +
				'			<bbox-query ' + _bbox + '/>\n' +
				'		</query>\n' +
				'	</union>\n' +
				'	<!-- print results -->\n' +
				'	<print mode="body"/>\n' +
				'	<recurse type="down"/>\n' +
				'	<print mode="skeleton" order="quadtile"/>\n' +
				'</osm-script>'
			}
		});
	};

	window.overpass = overpass;
})();
