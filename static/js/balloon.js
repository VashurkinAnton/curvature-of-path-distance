(function() {
	var container = document.body.querySelector('.ol-popup');
	var content = container.querySelector('.popup-content');
	var closer = container.querySelector('.popup-closer');

	var balloon = new ol.Overlay({
		element: container,
		autoPan: true,
		autoPanAnimation: {
			duration: 250
		}
	});

	olMap.addOverlay(balloon);

	balloon.show = function(data, position){
		content.innerHTML = data;
		balloon.setPosition(position);
	};

	balloon.hide = function(){
		balloon.setPosition(undefined);
		closer.blur();
	};

	closer.onclick = balloon.hide;

	window.olBalloon = balloon;
})();
