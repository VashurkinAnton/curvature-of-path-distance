(function(){
	function Grid(options){
		if(!options){
			options = {};
		}

		if(!options.step){
			options.step = [50, 50];
		}

		this.stepX = options.step[0];
		this.stepY = options.step[1];
		this.container = options.container;

		this.el = document.createElement('div');
		this.el.classList.add('grid');
		this.el.classList.add('step-' + options.step.join('x'));
		this.el.style.position = 'relative';
		this.el.style.width = '100%';
		this.el.style.height = '100%';
		
		this.render();
		this.container.appendChild(this.el);
	};

	Grid.prototype.addLine = function(options){
		var line = document.createElement('div');
		line.classList.add('grid--line');
		line.style.position = 'absolute';
		line.style.top = options.x;
		line.style.left = options.y;
		line.style.width = options.width || 1;
		line.style.height = options.height || 1;
		line.style.backgroundColor = options.color || "#ddf";

		if(options.legend){
			var legend = document.createElement('div');
			legend.classList.add('grid--legend');
			legend.style.position = 'absolute';
			legend.style.top = options.x;
			legend.style.left = options.y;
			legend.style.color = options.color || "#bbf";
			legend.innerHTML = options.legend;
			legend.style.fontSize = "10px";

			this.el.appendChild(legend);
		}

		this.el.appendChild(line);
	};

	Grid.prototype.render = function(){
		this.el.innerHTML = '';

		var bodyStyles = window.getComputedStyle(this.container);
		var availableWidth = parseInt(bodyStyles.width, 10);
		var availableHeight = parseInt(bodyStyles.height, 10);

		for(var x = 0; x <= availableHeight; x += this.stepX){
			this.addLine({width: availableWidth, x: x - 1, legend: x});
		}

		for(var y = 0; y <= availableWidth; y += this.stepY){
			this.addLine({height: availableHeight, y: y - 1, legend: y});
		}
	};

	window.Grid = Grid;
})();