(function() {
	function getRandomColor() {
		var letters = '0123456789ABCDEF';
		var color = '#';
		for (var i = 0; i < 6; i++) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
	}
	var randomColors = new Array(100).fill(null).map(function(){
		return getRandomColor();
	});

	function handleError(err) {
		if (err instanceof Error) {
			console.log(err);
		}
	}

	function getPath(e) {
		var path = [];
		if (e.path) {
			//google chrome only
			path = e.path;
		} else if (e.composedPath) {
			//edge, ff, safari
			if (e.composedPath instanceof Function) {
				path = e.composedPath();
			} else {
				path = e.composedPath;
			}
			//IE, ff < 52, chrome < 53, safary < 9
		} else if (e.target) {
			path = [e.target];
			var target = e.target;
			while (target.parentNode && target !== document.body) {
				target = target.parentNode;
				path.push(target);
			}
		}

		return path;
	}

	function distance(points) {
		return Math.sqrt(Math.pow(points[1].x - points[0].x, 2) + Math.pow(points[1].y - points[0].y, 2));
	}

	window.elm = function(tag, attrs, data, elms, removeElms) {
		if (tag === 'text') return document.createTextNode(data);

		if (typeof tag === 'string') {
			if (tag.indexOf('ns:') !== -1) {
				tag = tag.split('ns:')[1];
				var elm = document.createElementNS("http://www.w3.org/2000/svg", tag);
			} else {
				var elm = document.createElement(tag);
			}
		} else {
			var elm = tag;
		}
		if (removeElms) {
			elm.innerHTML = '';
		}
		if (attrs) {
			for (var attr in attrs) {
				if (typeof attrs[attr] === 'string') {
					elm.setAttribute(attr, attrs[attr]);
				} else {
					if (attr === 'style') {
						var styles = attrs[attr];
						for (var styleName in styles) {
							elm.style[styleName] = styles[styleName];
						}
					} else {
						elm[attr] = attrs[attr];
					}
				}
			}
		}
		if (data) {
			if (tag === 'input' || tag === 'textarea') {
				elm.value = data;
			} else {
				elm.innerHTML = data;
			}
		}
		if (elms) {
			if(Array.isArray(elms)){
				for (var id = 0; id < elms.length; id++) {
					if (elms[id]) {
						elm.appendChild(elms[id]);
					}
				}
			}else{
				elm.appendChild(elms);
			}
		}
		return elm;
	}

	function NodeView(options) {
		if (!options) {
			options = {};
		}

		var nodeView = elm('div', {
			class: "graph graph-node",
			graphNode: options
		});
		options.view = nodeView;

		var setPosition = function(position) {
			nodeView.position = { x: position.x, y: position.y };
			elm(nodeView, {
				style: {
					left: (position.x - 5) + 'px',
					top: (position.y - 5) + 'px',
				}
			})
		};

		var getPosition = function() {
			return { x: nodeView.position.x, y: nodeView.position.y };
		}

		nodeView.setPosition = setPosition;
		nodeView.getPosition = getPosition;
		setPosition(options);
		return nodeView;
	}

	function EdgeView(options) {
		if (!options) {
			options = {};
		}

		var edgeView = elm('div', {
			class: "graph graph-edge",
			graphEdge: options
		}, options.weight);
		options.view = edgeView;

		var setPosition = function(points) {
			var x1 = points[0].x;
			var x2 = points[1].x;

			var y1 = points[0].y;
			var y2 = points[1].y;

			var length = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
			var angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

			elm(edgeView, {
				style: {
					transform: 'rotate(' + angle + 'deg)',
					width: length + 'px',
					left: (x1 + 1) + 'px',
					top: y1 + 'px',

				}
			})
		};

		edgeView.setPosition = setPosition;
		setPosition(options.relation);
		return edgeView;
	}

	document.body.appendChild(elm('style', null, `
		.graph-node{
			z-index: 2;
			height: 10px;
			width: 10px;
			background-color: #1d4dff;
			position: absolute;
			border-radius: 50%;
		}
		.graph-edge{
			z-index: 1;
			height: 2px;
			background-color: #539da9;
			position: absolute;
			transform-origin: 0 0;
			text-align: center;
			color: #444;
			line-height: 0;
		}
		.graph-edge.active,
		.graph-node.active{
			background-color: #f14141;
		}
		.graph-edge.active-green,
		.graph-node.active-green{
			background-color: #28a745;
		}
		.distance,
		.graph-edge.active-orange,
		.graph-node.active-orange{
			background-color: #ffc107;
		}
		.graph-editor{
			position: absolute;
			width: 100%;
			height: 100%;
			top: 0px;
			left: 0px;
		}
		.graph-edge:hover,
		.graph-node:hover{
			opacity: 0.6;
		}
		.graph-editor_controls{
			position: absolute;
			bottom: 20px;
			left: 20px;
		}
		.graph-editor_controls > *{
			margin-left: 20px;
		}
		.graph-editor_matrixes{
			position: fixed;
			right: 20px;
			top: 20px;
		}
		.graph-editor_matrix{
			background-color: #fff;
		    width: auto !important;
		}
		.graph-editor_matrix td{
			padding: 5px 8px !important;
		}
		.graph-editor_matrix td.active{
			background-color: #343a40 !important;
			color: #fff !important;
		}
		.graph-editor_matrix .table-title{
			color: #fff !important;
			font-weight: bold;
			text-align: center;
			font-size: 14px;
		}
		.SPM, .DM{
			float: left;
		}
		.DM{
			margin-left: 16px;
		}
		.clearfix{
			overflow: auto;
		}
		.clearfix:after {
		    content: "";
		    clear: both;
		    display: table;
		}
		.best-node{
			font-size: 18px;
			font-weight: bold;
		}
	`));

	function Editor(options) {
		if (!options) {
			options = {};
		}

		this.container = options.container || document.body;

		this.clearfix = elm('div', {class: 'clearfix'}, null, this.clearfix);
		this.matrixes = elm('div', {class: 'graph-editor_matrixes'}, null, this.clearfix);
		this.el = elm('div', { class: 'graph-editor' }, null, this.matrixes);
		this.container.appendChild(this.el);

		this.graph = new Graph([]);
		this.graph.on('change', function() {
			this.drawGraph();
		}.bind(this));
		this.drawGraph();

		this.GUI();
	};
	Editor.prototype.load = function(graph) {
		this.graph = new Graph(graph);
		this.graph.on('change', function() {
			this.drawGraph();
		}.bind(this));
		this.drawGraph();
	};
	Editor.prototype.drawGraph = function(graph) {
		if(!graph){
			[].forEach.call(this.el.querySelectorAll('.graph'), function(graphElement) {
				if (graphElement.parentNode) {
					graphElement.parentNode.removeChild(graphElement);
				}
			});

			var drawnEdges = [];
			this.graph.data.forEach(function(node, index) {
				//draw node
				var nodeView = NodeView(node);
				nodeView.setAttribute('data-index', index);
				var hammer = new Hammer(nodeView);

				//move nodes
				var edgeViews = [];
				hammer.on('tap', function(event) {
					nodeView.classList.toggle('active');

					var activeNodes = this.el.querySelectorAll('.graph-node.active');
					if (activeNodes.length === 2) {

						handleError(this.graph.addEdge(
							activeNodes[0].getAttribute('data-index'),
							activeNodes[1].getAttribute('data-index'),
							Math.round(distance([activeNodes[0].getPosition(), activeNodes[1].getPosition()]))
						));

						[].forEach.call(activeNodes, function(activeNode) {
							activeNode.classList.remove('active');
						});
					}

					//remove nodes
					if (event.tapCount === 2) {
						handleError(this.graph.removeNode(index));
					}

				}.bind(this));
				hammer.on('panstart', function(event) {
					edgeViews = [].filter.call(this.el.querySelectorAll('.graph-edge'), function(egdeView) {
						return node.edges.indexOf(egdeView.graphEdge) !== -1;
					});
				}.bind(this));
				hammer.on('pan', function(event) {
					nodeView.setPosition(event.center);
					edgeViews.forEach(function(edgeView) {
						var edge = edgeView.graphEdge;
						if (edge.relation[0] === node) {
							edgeView.setPosition([event.center, edge.relation[1]]);
							edgeView.innerHTML = Math.round(distance([event.center, edge.relation[1]]));
						} else {
							edgeView.setPosition([edge.relation[0], event.center]);
							edgeView.innerHTML = Math.round(distance([edge.relation[0], event.center]));
						}
					});
				});
				hammer.on('panend', function(event) {
					node.edges.forEach(function(edge) {
						var relationNode = edge.relation[0] === node ? edge.relation[1] : edge.relation[0];
						edge.weight = Math.round(distance([event.center, relationNode]));
					});
					handleError(this.graph.updateNode(index, event.center));
					edgeViews = [];
				}.bind(this));


				//add node to container
				this.el.appendChild(nodeView);

				//draw and add edges
				node.edges.forEach(function(edge) {
					if (drawnEdges.indexOf(edge) === -1) {
						var edgeView = EdgeView(edge);
						this.el.appendChild(edgeView);
						drawnEdges.push(edge);

						//remove edges
						var hammer = new Hammer(edgeView);
						hammer.on('tap', function(event) {
							if (event.tapCount === 2) {
								this.graph.removeEdge(edgeView.graphEdge.relation[0], edgeView.graphEdge.relation[1]);
							}
						}.bind(this));
					}
				}.bind(this));
			}.bind(this));
			drawnEdges = null;
		}

		var SPM = this.showShortestPathsMatrix(graph);
		/*var CSPM = [];
		for(var i = 0; i < this.graph.data.length; i++){
			for(var j = 0; j < this.graph.data.length; j++){
				if(!CSPM[i]){ CSPM[i] = []; }
				CSPM[i][j] = -1;
				if(i === j){
					CSPM[i][j] = 0;
				}
			}
		}

		Object.keys(SPM).forEach(function(leafIndex){
			Object.keys(SPM[leafIndex]).forEach(function(nodeIndex){
				CSPM[leafIndex][nodeIndex] = SPM[leafIndex][nodeIndex];
				CSPM[nodeIndex][leafIndex] = SPM[leafIndex][nodeIndex];
			});
		});
		console.log('CSPM', CSPM);*/
		var DM = this.showDisnaceMatrix(graph);
		this.showIssueResults(SPM, DM);
	};
	Editor.prototype.showMST = function(MSTOneByOne) {
		var mark = function(MST, color){
			[].forEach.call(this.el.querySelectorAll('.graph'), function(graphElement){
				var contains;
				if(graphElement.classList.contains('graph-node')){
					contains = MST.some(function(MSTNode){
						return MSTNode.node === graphElement.graphNode;
					});
				}else if(graphElement.classList.contains('graph-edge')){
					contains = MST.some(function(MSTNode){
						return MSTNode.edges.indexOf(graphElement.graphEdge) !== -1;
					});
				}

				if(contains){
					graphElement.classList.add('active');
					if(color){
						graphElement.style.backgroundColor = color;
					}
				}
			});
		}.bind(this);

		var MST = this.graph.MST(null, MSTOneByOne);
		if(MSTOneByOne){
			MST.forEach(function(MSTPart, index){
				mark(MSTPart, randomColors[index]);
			});
		}else{
			mark(MST);
			return MST;
		}
	};
	Editor.prototype.showShortestPathsMatrix = function(graph){
		var table = null;

		var removeHighlight = function(){
			[].forEach.call(this.el.querySelectorAll('.graph.active-green'), function(node){
				node.classList.remove('active-green');
			});
			[].forEach.call(this.matrixes.querySelectorAll('.table .active'), function(node){
				node.classList.remove('active');
			});
		}.bind(this);
		var highlightNodes = function(options){
			if(!options){ options = {}; }
			//removeHighlight();
			
			var leafIndexTd = table.querySelector('.leaf-index[data-leaf="'+ options.leafIndex +'"]');
			var nodeIndexTd = table.querySelector('.node-index[data-node="'+ options.nodeIndex +'"]');
			var pathTd = table.querySelector('[data-leaf="'+ options.leafIndex +'"][data-node="'+ options.nodeIndex +'"]');

			[leafIndexTd, nodeIndexTd, pathTd].forEach(function(td){
				if(td){
					td.classList.add('active');
				}
			});

			if(options.path){
				[].forEach.call(this.el.querySelectorAll('.graph'), function(graphElement){
					var contains;
					if(graphElement.classList.contains('graph-node')){
						contains = options.path.some(function(edge){
							return edge.relation[0] === graphElement.graphNode || edge.relation[1] === graphElement.graphNode;
						});
					}else if(graphElement.classList.contains('graph-edge')){
						contains = options.path.indexOf(graphElement.graphEdge) !== -1;
					}

					if(contains){
						graphElement.classList.add('active-green');
					}
				});
			}

			if(options.node){
				[].forEach.call(this.el.querySelectorAll('.graph'), function(graphElement){
					if(graphElement.classList.contains('graph-node') && options.node === graphElement.graphNode){
						graphElement.classList.add('active-green');
					}
				});
			}
		}.bind(this);
		var matrix = this.graph.getShortestPathsMatrix(graph);
		var tableData = {
			color: "bg-success",
			title: "Shortest paths matrix",
			head: [{content: "#"}].concat(Object.keys(matrix).map(function(leafIndex){
				return {
					content: leafIndex,
					attrs: {
						onmouseenter: highlightNodes.bind(this, {
							leafIndex: leafIndex, 
							node: this.graph.data[leafIndex]
						}),
						onmouseleave: removeHighlight,
						"data-leaf": leafIndex, 
						class: "leaf-index"
					}
				};
			}.bind(this))),
			body: []
		};

		Object.keys(matrix).forEach(function(leafIndex, colIndex){
			Object.keys(matrix[leafIndex]).forEach(function(nodeIndex, rowIndex){
				if(!tableData.body[rowIndex]){ 
					tableData.body[rowIndex] = [{
						content: nodeIndex,
						attrs: {
							onmouseenter: highlightNodes.bind(this, {nodeIndex: nodeIndex, node: this.graph.data[nodeIndex]}),
							onmouseleave: removeHighlight,
							class: "node-index",
							"data-node": nodeIndex
						}	
					}]; 
				}
				tableData.body[rowIndex][colIndex + 1] = {
					content: matrix[leafIndex][nodeIndex] ? matrix[leafIndex][nodeIndex].reduce(function(length, edge){
						return length + edge.weight;
					}, 0) : Infinity,
					attrs: {
						onmouseenter: highlightNodes.bind(this, {leafIndex: leafIndex, nodeIndex: nodeIndex, path: matrix[leafIndex][nodeIndex]}),
						onmouseleave: removeHighlight,
						"data-leaf": leafIndex,
						"data-node": nodeIndex
					}
				}
			}.bind(this));
		}.bind(this));

		table = Editor.Table(tableData);
		table.classList.add('SPM');

		var existingTable = this.matrixes.querySelector('.graph-editor_matrix.SPM');
		if(existingTable){
			existingTable.parentNode.removeChild(existingTable);
		}

		this.clearfix.appendChild(table);

		return matrix;
	};

	Editor.prototype.showDisnaceMatrix = function(graph){
		var table = null;

		var removeHighlight = function(){
			[].forEach.call(this.el.querySelectorAll('.graph.active-orange'), function(node){
				node.classList.remove('active-orange');
			});
			[].forEach.call(this.matrixes.querySelectorAll('.table .active'), function(node){
				node.classList.remove('active');
			});
			[].forEach.call(this.el.querySelectorAll('.graph.distance'), function(node){
				node.parentNode.removeChild(node);
			});
		}.bind(this);
		var highlightNodes = function(options){
			if(!options){ options = {}; }
			//removeHighlight();
			
			var leafIndexTd = table.querySelector('.leaf-index[data-leaf="'+ options.leafIndex +'"]');
			var nodeIndexTd = table.querySelector('.node-index[data-node="'+ options.nodeIndex +'"]');
			var distanceTd = table.querySelector('[data-leaf="'+ options.leafIndex +'"][data-node="'+ options.nodeIndex +'"]');

			[leafIndexTd, nodeIndexTd, distanceTd].forEach(function(td){
				if(td){
					td.classList.add('active');
				}
			});

			if(options.nodes){
				elm(this.el, null, null, [
					elm(EdgeView({relation: options.nodes}), {class: "graph graph-edge distance"})
				]);
			}

			if(options.node){
				[].forEach.call(this.el.querySelectorAll('.graph'), function(graphElement){
					if(graphElement.classList.contains('graph-node') && options.node === graphElement.graphNode){
						graphElement.classList.add('active-orange');
					}
				});
			}
		}.bind(this);

		var matrix = this.graph.getDistanceMatrix(graph);
		var tableData = {
			color: "bg-warning",
			title: "Distance matrix",
			head: [{content: "#"}].concat(Object.keys(matrix).map(function(leafIndex){
				return {
					content: leafIndex,
					attrs: {
						onmouseenter: highlightNodes.bind(this, {
							leafIndex: leafIndex, 
							node: this.graph.data[leafIndex]
						}),
						onmouseleave: removeHighlight,
						"data-leaf": leafIndex, 
						class: "leaf-index"
					}
				};
			}.bind(this))),
			body: []
		};

		Object.keys(matrix).forEach(function(leafIndex, colIndex){
			Object.keys(matrix[leafIndex]).forEach(function(nodeIndex, rowIndex){
				if(!tableData.body[rowIndex]){ 
					tableData.body[rowIndex] = [{
						content: nodeIndex,
						attrs: {
							onmouseenter: highlightNodes.bind(this, {nodeIndex: nodeIndex, node: this.graph.data[nodeIndex]}),
							onmouseleave: removeHighlight,
							class: "node-index",
							"data-node": nodeIndex
						}	
					}]; 
				}

				tableData.body[rowIndex][colIndex + 1] = {
					content: Math.round(matrix[leafIndex][nodeIndex]),
					attrs: {
						onmouseenter: highlightNodes.bind(this, {
							leafIndex: leafIndex, 
							nodeIndex: nodeIndex, 
							nodes: [
								this.graph.data[nodeIndex], 
								this.graph.data[leafIndex] 
							] 
						}),
						onmouseleave: removeHighlight,
						"data-leaf": leafIndex,
						"data-node": nodeIndex
					}
				}
			}.bind(this));
		}.bind(this));
		
		table = Editor.Table(tableData);
		table.classList.add('DM');

		var existingTable = this.matrixes.querySelector('.graph-editor_matrix.DM');
		if(existingTable){
			existingTable.parentNode.removeChild(existingTable);
		}

		this.clearfix.appendChild(table);

		return matrix;
	};
	Editor.Table = function(data){
		var table = elm('table', {
				class: 'graph-editor_matrix table table-striped table-bordered'
			}, 
			null,
			[elm('thead', null, null, [
				elm('tr', {class:"table-title " + data.color}, null, elm('td', {colspan: "" + (data.head.length + 1)}, data.title)),
				elm('tr', null, null, 
					data.head.map(function(headItem){
						return elm('td', headItem.attrs, headItem.content);
					}.bind(this))
				)
			]),
			elm('tbody', null, null, data.body.map(function(row){
				return elm('tr', null, null, row.map(function(col){
					return elm('td', col.attrs, col.content);
				}))
			}))]
		);

		return table;
	}
	Editor.prototype.showIssueResults = function(SPM, DM){
		var issueRelationMatrix = Graph.issueRelationMatrix(SPM, DM);
		var maximumRelations = Graph.issueRelationMaximum(issueRelationMatrix);
		var sumRelations = Graph.issueRelationSum(issueRelationMatrix);
		var minimalRelationNode = Graph.issueMinimalRelationNode(maximumRelations, sumRelations);

		var removeHighlight = function(event){
			var nodeSelector = '[data-node="' + event.target.getAttribute('data-node') + '"]';

			[].forEach.call(this.matrixes.querySelectorAll('table .active' + nodeSelector), function(node){
				if(node.onmouseleave && node.onmouseleave !== removeHighlight){
					node.onmouseleave();
				}
			});

			[].forEach.call(this.matrixes.querySelectorAll('.relation .active' + nodeSelector), function(node){
				node.classList.remove('active');
			});
		}.bind(this);
		var highlightNodes = function(event){
			var nodeSelector = '[data-node="' + event.target.getAttribute('data-node') + '"]';
			
			[].forEach.call(this.matrixes.querySelectorAll('table ' + nodeSelector), function(node){
				if(node.onmouseenter && node.onmouseenter !== highlightNodes){
					node.onmouseenter();
				}
			});

			[].forEach.call(this.matrixes.querySelectorAll('.relation ' + nodeSelector), function(node){
				node.classList.add('active');
			});
		}.bind(this);
		[{
			data: maximumRelations, 
			title: "Maximum curvature"
		},{
			data: sumRelations, 
			title: "Average curvature"
		}].forEach(function(group){
			var table = Editor.Table({
				color: "bg-info",
				title: group.title,
				head: group.data.map(function(relation){
					return {
						content: relation.nodeIndex,
						attrs: {
							"data-node": relation.nodeIndex,
							onmouseenter: highlightNodes,
							onmouseleave: removeHighlight
						}
					};
				}),
				body: [group.data.map(function(relation){
					return {
						content: parseFloat(relation.value).toFixed(3),
						attrs: {
							"data-node": relation.nodeIndex,
							onmouseenter: highlightNodes,
							onmouseleave: removeHighlight
						}
					};
				})]
			});

			var _class = group.title.replace(/ /ig, '-').toLowerCase();
			table.classList.add('relation');
			table.classList.add(_class);

			var existingTable = this.matrixes.querySelector('.graph-editor_matrix.' + _class);
			if(existingTable){
				existingTable.parentNode.removeChild(existingTable);
			}
			this.matrixes.appendChild(table);

		}.bind(this));

		var bestNode = elm('div', {class: 'best-node'}, "Node with minimal max and average curvature: " + minimalRelationNode);
		var existingBestNode = this.matrixes.querySelector('.best-node');
		if(existingBestNode){
			existingBestNode.parentNode.removeChild(existingBestNode);
		}
		this.matrixes.appendChild(bestNode);
	};

	Editor.prototype.GUI = function() {
		var hammer = new Hammer(this.el);
		hammer.on('tap', function(event) {
			if (event.tapCount === 2 && event.target.classList.contains('graph-editor')) {
				this.graph.addNode(event.center);
			}
		}.bind(this));

		var selectButton = function(active) {
			[].forEach.call(this.el.querySelectorAll('.graph-editor_button'), function(button) {
				if (active === button) {
					button.classList.add('active');
				} else {
					button.classList.remove('active');
				}
			});
		}.bind(this);

		var MSTOneByOne = 0;
		elm(this.el, null, null, [
			elm('div', { class: "graph-editor_controls" }, null, [
				elm('button', {
					class: "graph-editor_button btn btn-primary",
					onclick: function(e) {
						MSTOneByOne = 0;
						//selectButton();
						this.drawGraph();
					}.bind(this)
				}, 'Graph'),
				elm('button', {
					class: "graph-editor_button btn btn-primary",
					onclick: function(e) {
						//selectButton(e.target);
						this.drawGraph(this.showMST());
					}.bind(this)
				}, 'Minimum spanning tree')/*,
				elm('button', {
					class: "graph-editor_button btn btn-primary",
					onclick: function(e) {
						if(MSTOneByOne === 0){
							this.drawGraph();
						}
						selectButton(e.target);
						MSTOneByOne += 1;
						this.showMST(MSTOneByOne);
					}.bind(this)
				}, 'MST one by one')*/
			])
		]);
	};
	window.GraphEditor = Editor;
})();
