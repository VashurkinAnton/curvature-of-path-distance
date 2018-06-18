"use strict";
(function (root, factory) {
	// Configuration
	var exportName = 'Graph';
	var dependenciesNames = [];

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(exportName, dependencies, factory);
	} else if (typeof exports === 'object') {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		var resolvedDependencies = dependenciesNames.map(function (name) {
			return require(name);
		});
		module.exports = factory.apply(root, resolvedDependencies);
	} else {
		// Browser globals (root is window)
		var resolvedDependencies = dependenciesNames.map(function (name) {
			return root[name];
		});
		root[exportName] = factory.apply(root, resolvedDependencies);
	}

// Dependencies passed as arguments
}(this, function(){
	function Graph(data) {
		this.data = [];
		if(data){
			this.data = this.parse(data);
		}
		this.listeners = [];
	};
	Graph.prototype.on = function(event, handler) {
		this.listeners.push({
			event: event,
			handler: handler
		});

		return this.off.bind(this, event, handler);
	};
	Graph.prototype.off = function(event, handler) {
		for (var i = this.listeners.length - 1; i >= 0; i--) {
			if (this.listeners[i].event === event && this.listeners[i].handler === handler) {
				this.listeners.splice(i, 1);
			}
		}
	};
	Graph.prototype.emit = function(event) {
		var args = Array.prototype.slice.call(arguments, 1);
		this.listeners.forEach(function(listener) {
			if (listener.event === event) {
				listener.handler.apply(this, args);
			}
		});
	};
	Graph.prototype.createNode = function(data) {
		return {
			x: data.x || 0,
			y: data.y || 0,
			edges: [] //where edge is {node: <link>, weight: <number>} // in serialized view <link> will replaced to index in array.
		};
	};
	Graph.prototype.addNode = function(data) {
		var node = this.createNode(data);

		var index = this.data.push(node) - 1;
		this.emit('change');

		return index;
	};
	Graph.prototype.removeNode = function(index) {
		var nodeToRemove = this.data[index];
		if (!nodeToRemove) {
			return new Error('Node should be exist');
		}

		if (nodeToRemove.edges.length !== 0) {
			for (var i = nodeToRemove.edges.length - 1; i >= 0; i--) {
				var edge = nodeToRemove.edges[i];
				var relationNode = edge.relation[0] === nodeToRemove ? edge.relation[1] : edge.relation[0];
				this.removeEdge(nodeToRemove, relationNode);
			}
		}

		var removedNode = this.data.splice(index, 1);
		this.emit('change');
		return removedNode[0];
	};
	Graph.prototype.updateNode = function(index, data) {
		var node = this.data[index];
		if (!node) {
			return new Error('Node should be exist');
		}

		if (data.x) {
			node.x = data.x;
		}
		if (data.y) {
			node.y = data.y;
		}
		this.emit('change');
	};

	Graph.prototype.addEdge = function(indexA, indexB, weight, endNode) {
		var nodeA = this.data[indexA];
		var nodeB = this.data[indexB];
		var _direction = 0;

		/* possible directions: 
		 * 0 - without direction
		 * 1 - from a node to b node
		 * -1 - from b node to a node.
		 * a node have index 0 in relations array and b node have index 1.
		 */
		if (typeof endNode === 'number') {
			if (endNode !== indexA && endNode !== indexB) {
				return new Error('Direction should be indexA or indexB.');
			}

			if (endNode === indexA) {
				_direction = -1;
			} else if (endNode === indexB) {
				_direction = 1;
			}
		}

		if (!nodeA || !nodeB) {
			return new Error('Both nodes should be exist.');
		}

		var edgeExist = nodeA.edges.some(function(edge) {
			return edge.relation.indexOf(nodeB) !== -1;
		}) || nodeB.edges.some(function(edge) {
			return edge.relation.indexOf(nodeA) !== -1;
		});

		if (edgeExist) {
			return new Error('Nodes already have edge.');
		}

		var edge = {
			relation: [nodeA, nodeB],
			direction: _direction,
			weight: weight
		};

		nodeA.edges.push(edge);
		nodeB.edges.push(edge);
		this.emit('change');
	};
	Graph.prototype.editEdge = function(edge, data) {
		if (data.direction) {
			// do something			
		}

		if (data.weight) {
			edge.weight = data.weight;
		}
	};
	Graph.prototype.removeEdge = function(nodeA, nodeB) {
		if (!nodeA || !nodeB) {
			return new Error('Both nodes should be exist.');
		}

		var edgeIndex = nodeA.edges.findIndex(function(edge) {
			return edge.relation.indexOf(nodeB) !== -1;
		});

		if (edgeIndex === -1) {
			return new Error('Relation not found.');
		}

		var edge = nodeA.edges[edgeIndex];
		nodeA.edges.splice(edgeIndex, 1);
		nodeB.edges.splice(nodeB.edges.indexOf(edge), 1);

		this.emit('change');
		return edge;
	};
	Graph.prototype.parse = function(data) {
		data = typeof data === 'string' ? JSON.parse(data) : data

		data.forEach(function(node) {
			node.edges = node.edges.map(function(edgeData) {
				var nodeA = data[edgeData.relation[0]];
				var nodeB = data[edgeData.relation[1]];

				var targetNode;
				if (node === nodeA) {
					targetNode = nodeB;
				} else if (node === nodeB) {
					targetNode = nodeA;
				}

				var edge;
				targetNode.edges.some(function(targetEdge) {
					if (targetEdge.relation[0] === node || targetEdge.relation[1] === node) {
						edge = targetEdge;
					}

					return edge;
				});

				if (!edge) {
					edge = {
						relation: [data[edgeData.relation[0]], data[edgeData.relation[1]]],
						direction: edgeData.direction,
						weight: edgeData.weight
					};
				}

				return edge;
			});
		});

		return data;
	};
	Graph.prototype.stringify = function(graphData, pretty) {
		graphData = graphData || this.data;
		var data = graphData.map(function(node) {
			return {
				x: node.x,
				y: node.y,
				edges: node.edges.map(function(edge) {
					return {
						relation: [graphData.indexOf(edge.relation[0]), graphData.indexOf(edge.relation[1])],
						direction: edge.direction,
						weight: edge.weight
					}
				}.bind(this))
			};
		}.bind(this));

		return JSON.stringify(data, null, pretty ? 2 : null);
	};
	Graph.stringify = Graph.prototype.stringify;

	Graph.prototype.mostBiggestSubGraph = function(data){
		data = data || this.data;
		var subGraphs = [];

		data.forEach(function(node){
			var hasRelationFor = subGraphs.filter(function(subGraph){
				if(subGraph.relations.indexOf(node) !== -1){
					return true;
				}
			});

			if(hasRelationFor.length > 1){
				var mainSubGraph = hasRelationFor[0];
				hasRelationFor.slice(1).forEach(function(subGraph, index){
					['relations', 'nodes'].forEach(function(type){
						subGraph[type].forEach(function(node){
							if(mainSubGraph[type].indexOf(node) === -1){
								mainSubGraph[type].push(node);
							}
						});
					});
				});

				hasRelationFor.slice(1).map(function(subGraph){
					var subGraphIndex = subGraphs.indexOf(subGraph);
					if(subGraphIndex !== -1){
						subGraphs.splice(subGraphIndex, 1);
					}
				});

				hasRelationFor = [mainSubGraph];
			}

			if(hasRelationFor.length === 0){
				var subGraph = {
					relations: [],
					nodes: [node]
				};
				node.edges.forEach(function(edge){
					edge.relation.forEach(function(relationNode){
						if(subGraph.relations.indexOf(relationNode) === -1){
							subGraph.relations.push(relationNode);
						}
					})
				});
				subGraphs.push(subGraph);
			}else if(hasRelationFor.length === 1){
				var subGraph = hasRelationFor[0];
				node.edges.forEach(function(edge){
					edge.relation.forEach(function(relationNode){
						if(subGraph.relations.indexOf(relationNode) === -1){
							subGraph.relations.push(relationNode);
						}
					})
				});

				if(subGraph.nodes.indexOf(node) === -1){
					subGraph.nodes.push(node);
				}
			}
		});

		var biggestSubGraph = subGraphs.reduce(function(biggestSubGraph, nextSubGraph){
			if(!biggestSubGraph || biggestSubGraph.nodes.length < nextSubGraph.nodes.length){
				return nextSubGraph;
			}else{
				return biggestSubGraph;
			}
		}, null);

		return biggestSubGraph ? biggestSubGraph.nodes : [];
	};

	Graph.prototype.MST = function(data, edgesLimit) { //The Kraskal algorithm
		//extract and sort edges
		var edges = (data || this.data).reduce(function(edges, node) {
			node.edges.forEach(function(edge) {
				if (edges.indexOf(edge) === -1) {
					edges.push(edge);
				}
			});
			return edges;
		}, []).sort(function(a, b) {
			return a.weight - b.weight;
		});

		var unionFindForest = [];
		var limit = edgesLimit || edges.length;
		for (var edgeIndex = 0; edgeIndex < limit; edgeIndex++) {
			var edge = edges[edgeIndex];
			var unionA = null;
			var unionANode = null;
			var unionAIndex = null;

			var unionB = null;
			var unionBNode = null;
			var unionBIndex = null;

			//find unions with edge nodes
			if (unionFindForest.length !== 0) {
				var skip = false;
				for (var unionIndex = 0; unionIndex < unionFindForest.length; unionIndex++) {
					var union = unionFindForest[unionIndex];
					var matches = [];
					for(var i = 0; i < union.length; i++){
						var unionElement = union[i];
						if((unionElement.node === edge.relation[0]) || (unionElement.node === edge.relation[1])){							
							matches.push(unionElement);
						}
					}
					if(matches.length >= 2){
						skip = true;
						break;
					}else if(matches.length === 1){
						if(!unionA){
							unionA = union;
							unionANode = matches[0];
							unionAIndex = unionIndex;
						}else{
							unionB = union;
							unionBNode = matches[0];
							unionBIndex = unionIndex;
						}
					}
				}

				if (skip) { continue; }
			}

			if (!unionA && !unionB) { //create new union
				unionFindForest.push(edge.relation.map(function(node) {
					return {
						node: node,
						edges: [edge],
						x: node.x,
						y: node.y
					};
				}));
			} else if (unionA && unionB){ //concat existing unions
				unionANode.edges.push(edge);
				unionBNode.edges.push(edge);

				unionFindForest[unionAIndex] = unionA.concat(unionB);
				unionFindForest.splice(unionBIndex, 1);
			} else { //use existing unioun
				var targetUnioun = unionA || unionB;
				var targetUniounNode = unionANode || unionBNode;
				var node = targetUniounNode.node === edge.relation[0] ? edge.relation[1] : edge.relation[0];

				targetUniounNode.edges.push(edge);
				targetUnioun.push({
					node: node,
					edges: [edge],
					x: node.x,
					y: node.y
				});
			}

			if ((unionFindForest[0] && unionFindForest[0].length === this.data.length)) {
				break;
			}
		}

		if(!!edgesLimit && edgesLimit !== 0){
			return unionFindForest;
		}

		return unionFindForest[0];
	};
	Graph.prototype.getShortestPathsMatrix = function(MST) {
		var availableEdges = null;
		var leaves = [];
		var nodes = [];
		//get available edges from MST
		if(MST){
			availableEdges = [];
			MST.forEach(function(MSTNode){
				MSTNode.edges.forEach(function(edge){
					if(availableEdges.indexOf(edge) === -1){
						availableEdges.push(edge);
					}
				});
			});
		}
		//slipt nodes and leaves, skip standlone nodes
		(MST || this.data).forEach(function(node, index){
			if(node.edges.length === 1){
				leaves.push(node.node || node);
			}else if(node.edges.length >= 2){
				nodes.push(node.node || node);				
			}
		});

		var matrix = {};
		
		//calculate shortest path for each leaf-node pair
		leaves.forEach(function(leaf){
			var leafIndex = this.data.indexOf(leaf);
			if(!matrix[leafIndex]){
				matrix[leafIndex] = {};
			}

			nodes.forEach(function(node){
				var nodeIndex = this.data.indexOf(node);

				var shortestPath = this.getShortestPath(leaf, node, leaves, availableEdges);

				matrix[leafIndex][nodeIndex] = shortestPath;
			}.bind(this));
		}.bind(this));
		return matrix;
	};

	Graph.prototype.getShortestPath = function(fromNode, toNode, skip, availableEdges){//Dijkstra’s algorithm
		var nodesToCleanup = [];
		var heap = [fromNode];

		if(skip){
			skip.forEach(function(node){
				nodesToCleanup.push(node);
				node.checked = true;
			});
		}

		var loopCounter = 0;
		while(heap.length !== 0){
			var sourceIndex = null;
			var soruceNode = heap.reduce(function(sourceNode, heapNode, index){
				if(!sourceNode || !sourceNode.pathLength === undefined || (heapNode.pathLength !== undefined && sourceNode.pathLength > heapNode.pathLength)){
					sourceIndex = index;
					return heapNode;
				}

				return sourceNode;
			}, null);
			heap.splice(sourceIndex, 1);

			soruceNode.edges.forEach(function(edge){
				//skip edges by MST
				if(availableEdges && availableEdges.indexOf(edge) === -1){
					return;
				}

				var targetNode = soruceNode === edge.relation[0] ? edge.relation[1] : edge.relation[0];
				if(targetNode.checked){
					return;
				}

				if(!targetNode.path){
					targetNode.path = [];
				}

				var newPath = (soruceNode.path || []).concat([edge]);
				var newPathLength = newPath.reduce(function(pathLength, edge){
					return pathLength + edge.weight;
				}, 0);

				if(targetNode.pathLength === undefined || targetNode.pathLength > newPathLength){
					targetNode.path = newPath;
					targetNode.pathLength = newPathLength;
				}

				if(heap.indexOf(targetNode) === -1){
					heap.push(targetNode);
				}
			});

			soruceNode.checked = true;
			nodesToCleanup.push(soruceNode);
			loopCounter += 1;
		}

		var shortestPath = toNode.path;

		nodesToCleanup.forEach(function(node){
			delete node.checked;
			delete node.path;
			delete node.pathLength;
		});

		return shortestPath;
	};

	Graph.prototype.getDistanceMatrix = function(MST, getDistance){
		var leaves = [];
		var nodes = [];

		//slipt nodes and leaves, skip standlone nodes
		(MST || this.data).forEach(function(node){
			if(node.edges.length === 1){
				leaves.push(node.node || node);
			}else if(node.edges.length >= 2){
				nodes.push(node.node || node);				
			}
		});

		var matrix = {};
		
		//calculate distance for each leaf-node pair
		leaves.forEach(function(leaf){
			var leafIndex = this.data.indexOf(leaf);
			if(!matrix[leafIndex]){
				matrix[leafIndex] = {};
			}

			nodes.forEach(function(node){
				var nodeIndex = this.data.indexOf(node);
				var distance = 0;
				
				if(getDistance){
					distance = getDistance(node, leaf);
				}else{
					distance = Math.sqrt(Math.pow(node.x - leaf.x, 2) + Math.pow(node.y - leaf.y, 2));;
				}
				

				matrix[leafIndex][nodeIndex] = distance;
			}.bind(this));
		}.bind(this));

		return matrix;
	}

	Graph.issueRelationMatrix = function(shortestPathsMatrix, distanceMatrix){
		var relationMatrix = {};
		Object.keys(shortestPathsMatrix).forEach(function(leafIndex){
			Object.keys(shortestPathsMatrix[leafIndex]).forEach(function(nodeIndex){
				if(shortestPathsMatrix[leafIndex][nodeIndex]){
					if(!relationMatrix[nodeIndex]){ relationMatrix[nodeIndex] = {}; }
					relationMatrix[nodeIndex][leafIndex] = shortestPathsMatrix[leafIndex][nodeIndex].reduce(function(pathLength, edge){
						return pathLength + edge.weight;
					}, 0) / distanceMatrix[leafIndex][nodeIndex];
				}
			});
		});
		
		return relationMatrix;
	}

	Graph.issueRelationMaximum = function(relationMatrix){
		return Object.keys(relationMatrix).map(function(nodeIndex){
			return Object.keys(relationMatrix[nodeIndex]).map(function(leafIndex){
				return {value: relationMatrix[nodeIndex][leafIndex], nodeIndex: nodeIndex};
			}).reduce(function(LNR, nextLNR){//LNR - leaf-node relation
				if(nextLNR.value > LNR.value){
					return nextLNR 
				}
				return LNR;
			});
		});
	}

	Graph.issueRelationSum = function(relationMatrix){
		return Object.keys(relationMatrix).map(function(nodeIndex){
			var nodeKeys = Object.keys(relationMatrix[nodeIndex]);
			var LNR = nodeKeys.map(function(leafIndex){
				return {value: relationMatrix[nodeIndex][leafIndex], nodeIndex: nodeIndex};
			}).reduce(function(LNR, nextLNR){//LNR - leaf-node relation
				LNR.value = LNR.value + nextLNR.value;
				return LNR;
			});

			LNR.value = LNR.value / nodeKeys.length;
			return LNR;
		});
	}

	Graph.issueMinimalRelationNode = function(maximumRelations, sumRelations){
		var minimalNodeIndex;
		var minimalValue;
		for(var i = 0; i < maximumRelations.length; i++){
			var max = maximumRelations[i];
			var sum = sumRelations[i];
			if(!minimalValue || minimalValue > max.value + sum.value){
				minimalValue = max.value + sum.value;
				minimalNodeIndex = max.nodeIndex;
			}
		}

		return minimalNodeIndex;
	}

	return Graph;
}));