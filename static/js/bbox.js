(function() {
	var bboxControl = document.createElement('div');
	bboxControl.innerHTML = '<div class="ol-unselectable ol-control overpass">' +
	'	<button class="open-bbox" type="button" title="Select bbox">' +
	'		<i class="fa fa-square"></i>' +
	'	</button>' +
	'	<button class="run-overpass hidden" type="button" title="Get overpass layer and graph relations.">' +
	'		<i class="fa fa-play"></i>' +
	'	</button>' +
	'</div>';

	bboxControl = bboxControl.children[0];

	var bboxButton = bboxControl.querySelector('.open-bbox');
	var runOverpass = bboxControl.querySelector('.run-overpass');
	var icon = bboxControl.querySelector('.open-bbox i');

	var bbox = document.createElement('div');
	bbox.innerHTML = '<div class="bbox hidden">' +
	'	<div class="bbox-layout bbox-top"></div>' +
	'	<div class="bbox-layout bbox-right"></div>' +
	'	<div class="bbox-layout bbox-bottom"></div>' +
	'	<div class="bbox-layout bbox-left"></div>' +
	'	<div class="bbox-actions hidden">' +
	'		<div class="bbox-move fa fa-th"></div>' +
	'		<div class="bbox-resize bbox-top-left"></div>' +
	'		<div class="bbox-resize bbox-top-right"></div>' +
	'		<div class="bbox-resize bbox-bottom-right"></div>' +
	'		<div class="bbox-resize bbox-bottom-left"></div>' +
	'	</div>' +
	'</div>';
	bbox = bbox.children[0];

	// Dark layout.
	var topEdge = bbox.querySelector('.bbox-layout.bbox-top');
	var rightEdge = bbox.querySelector('.bbox-layout.bbox-right');
	var bottomEdge = bbox.querySelector('.bbox-layout.bbox-bottom');
	var leftEdge = bbox.querySelector('.bbox-layout.bbox-left');

	// Layout controls.
	var actionsContainer = bbox.querySelector('.bbox-actions');
	var moveButton = bbox.querySelector('.bbox-move');
	var resizeTopLeft = bbox.querySelector('.bbox-resize.bbox-top-left');
	var resizeTopRight = bbox.querySelector('.bbox-resize.bbox-top-right');
	var resizeBottomRight = bbox.querySelector('.bbox-resize.bbox-bottom-left');
	var resizeBottomLeft = bbox.querySelector('.bbox-resize.bbox-bottom-right');

	bboxButton.onclick = function() {
		icon.classList.toggle('fa-square');
		icon.classList.toggle('fa-sticky-note');
		runOverpass.classList.toggle('hidden');
		bbox.classList.toggle('hidden');
		actionsContainer.classList.toggle('hidden');
	};

	var bboxData = { top: 20, bottom: 20, left: 30, right: 30 };

	var renderBbox = function() {
		var bboxWidth = 100 - bboxData.left - bboxData.right;
		var bboxHeight = 100 - bboxData.top - bboxData.bottom;
		// Move button styles.
		moveButton.style.top = "calc(" + bboxData.top + "% + 15px)";
		moveButton.style.left = "calc(" + bboxData.left + "% + 15px)";

		// Resize buttons styles.
		resizeTopLeft.style.top = "calc(" + bboxData.top + "% - 5px)";
		resizeTopLeft.style.left = "calc(" + bboxData.left + "% - 5px)";

		resizeTopRight.style.top = "calc(" + bboxData.top + "% - 5px)";
		resizeTopRight.style.right = "calc(" + bboxData.right + "% - 5px)";

		resizeBottomRight.style.bottom = "calc(" + bboxData.bottom + "% - 5px)";
		resizeBottomRight.style.right = "calc(" + bboxData.right + "% - 5px)";

		resizeBottomLeft.style.bottom = "calc(" + bboxData.bottom + "% - 5px)";
		resizeBottomLeft.style.left = "calc(" + bboxData.left + "% - 5px)";

		// Layout styles.
		topEdge.style.height = bboxData.top + '%';

		bottomEdge.style.height = bboxData.bottom + '%';

		rightEdge.style.top = bboxData.top + '%';
		rightEdge.style.height = bboxHeight + '%';
		rightEdge.style.width = bboxData.right + '%';

		leftEdge.style.top = bboxData.top + '%';
		leftEdge.style.width = bboxData.left + '%';
		leftEdge.style.height = bboxHeight + '%';
	};

	renderBbox();

	[{
		node: moveButton,
		attrs: ['top', 'right', 'bottom', 'left']
	},{
		node: resizeTopLeft,
		attrs: ['top', 'left']
	},{
		node: resizeTopRight,
		attrs: ['top', 'right']
	},{
		node: resizeBottomRight,
		attrs: ['bottom', 'right']
	},{
		node: resizeBottomLeft,
		attrs: ['bottom', 'left']
	}].forEach(function(handler){
		var mc = new Hammer(handler.node);
		var percInPx = { x: 0, y: 0 };
		var _bboxData = null;
		
		// Calc percentage and save bbox data for movement.
		mc.on('panstart', function() {
			_bboxData = JSON.parse(JSON.stringify(bboxData));
			percInPx = {
				x: 100 / olMap.getSize()[0], // olMap see in /js/openlayers.js
				y: 100 / olMap.getSize()[1]
			};
		});

		// Handle movement.
		mc.on('pan', function(e) {
			var dxp = e.deltaX * percInPx.x;
			var dyp = e.deltaY * percInPx.y;
			
			// Resize.
			if(handler.attrs.indexOf('top') !== -1){
				bboxData.top = _bboxData.top + dyp;
			}

			if(handler.attrs.indexOf('bottom') !== -1){
				bboxData.bottom = _bboxData.bottom - dyp;
			}

			if(handler.attrs.indexOf('left') !== -1){
				bboxData.left = _bboxData.left + dxp;
			}

			if(handler.attrs.indexOf('right') !== -1){
				bboxData.right = _bboxData.right - dxp;
			}

			// Resize limits.
			if(handler.attrs.indexOf('top') !== -1 && bboxData.top > 100 - bboxData.bottom - 5){
				bboxData.top = 100 - bboxData.bottom - 5;
			}

			if(handler.attrs.indexOf('bottom') !== -1 && bboxData.bottom > 100 - bboxData.top - 5){
				bboxData.bottom = 100 - bboxData.top - 5;
			}

			if(handler.attrs.indexOf('left') !== -1 && bboxData.left > 100 - bboxData.right - 5){
				bboxData.left = 100 - bboxData.right - 5;
			}

			if(handler.attrs.indexOf('right') !== -1 && bboxData.right > 100 - bboxData.left - 5){
				bboxData.right = 100 - bboxData.left - 5;
			}

			renderBbox();
		});

		// Cleanup temp data.
		mc.on('panend', function(){
			percInPx = null;
			_bboxData = null;
		});
	});

	var bboxDataToOverpass = function(){
		var pxInPerc = {
			x: olMap.getSize()[0] / 100 , // olMap see in /js/openlayers.js
			y: olMap.getSize()[1] / 100
		};

		var topLeft = geo.meters2degrees.apply(this, olMap.getCoordinateFromPixel([
			bboxData.left * pxInPerc.x,
			bboxData.top * pxInPerc.y 
		]));

		var bottomRigth = geo.meters2degrees.apply(this, olMap.getCoordinateFromPixel([
			(100 - bboxData.right) * pxInPerc.x,
			(100 - bboxData.bottom) * pxInPerc.y
		]));

		overpass.bbox([topLeft, bottomRigth], function(err, graphData){
			if(err){ return alert(err); }

			olMap.drawRoads(graphData);
		});
	};

	runOverpass.onclick = function(){
		bboxDataToOverpass();
	}

	var overlaycontainer = document.querySelector('.ol-overlaycontainer-stopevent');
	overlaycontainer.parentNode.insertBefore(bbox, overlaycontainer);
	
	// Stopevents area.
	overlaycontainer.appendChild(bboxControl);
	overlaycontainer.appendChild(actionsContainer);
})();
