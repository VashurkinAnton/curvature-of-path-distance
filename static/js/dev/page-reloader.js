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
		if(message.type === 'page'){
			window.location.reload();
		}
	};
	function onclose(){
		setTimeout(function(){
			attempt += 1;
			if(attempt >= times){
				console.error('Socket server is down. Page reloader disabled.');
			}else{
				openSocket();
			}
		}, reopenTime);
	}

	openSocket();

	console.debug('Developing tool:', 'Page reloader enabled.');
})();
