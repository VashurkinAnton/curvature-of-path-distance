(function(){
	var refreshSocket, reopenInterval, reopenTime = 500, times = 5, attempt = 0;
	function openSocket(){
		var socket = new WebSocket("ws://" + window.location.hostname + ":" + window.SERVER_CONFIG.watch.port);

		socket.onopen = function(){
			attempt = 0;
			socket.onmessage = onmessage;
			socket.onclose = onclose;

			if(reopenInterval){
				clearInterval(reopenInterval);
			}
		}

		socket.onerror = onclose
	};

	function onmessage(message){
		message = JSON.parse(message.data);
		if(message.type === 'code'){
			if(document.querySelector('script[src="' + message.filename + '"]')){
				window.location.reload();
			}else{
				oQuery.wildcard('/**', ['apiScripts'], xi.components, function(obj){
					if(obj.apiScripts.length !== 0){
				      return true;
				    }
				}).forEach(function(obj){
					if(obj.res.apiScripts.indexOf(message.filename) !== -1){
						var componentParent = obj.path.split('/');
						var componentName = componentParent.pop();
						componentParent = componentParent.join('/');
						delete xi.objGet(componentParent, xi.components)[componentName];

						var componentsInDOM = document.querySelectorAll('[xi-component="' + obj.path + '"]') || [];
						componentsInDOM = Array.prototype.slice.call(componentsInDOM);
						componentsInDOM.reverse();

						componentsInDOM.forEach(function(component){
							component.parentNode.replaceChild(xi(obj.path, component.xiData), component);
						});
					}
				});
			}
		}
	};
	function onclose(){
		setTimeout(function(){
			attempt += 1;
			if(attempt >= times){
				console.error('Socket server is down. Component reloader disabled.');
			}else{
				openSocket();
			}
		}, reopenTime);
	}

	openSocket();

	console.debug('Developing tool:', 'Component reloader enabled.');
})();