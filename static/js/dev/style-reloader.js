(function(){
	function insertAfter(src, target){
		var parent = target.parentNode;
		var nextNode = target.nextSibling;
		if(nextNode){
			parent.insertBefore(src, nextNode);
		}else{
			parent.appendChild(src);
		}
	}
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
		if(message.type === 'style' && message.filename){
			var oldStyleNode = document.querySelector('link[href="' + message.filename + '"]');
			if(oldStyleNode){
				newStyleNode = document.createElement('link');
				for(var i = 0; i < oldStyleNode.attributes.length; i ++){
					var attrName = oldStyleNode.attributes[i].name || oldStyleNode.attributes[i].nodeName;
					var attrValue = oldStyleNode.attributes[i].value || oldStyleNode.attributes[i].nodeValue;
					newStyleNode.setAttribute(attrName, attrValue);
				}
				newStyleNode.setAttribute('href', message.filename);
				newStyleNode.onload = function(){
					[].forEach.call(document.querySelectorAll('link[href="' + message.filename + '"]'), function(node, index, nodes){
						if(nodes.length - 1 !==  index){
							node.parentNode.removeChild(node);
						}
					});
				}
				insertAfter(newStyleNode, oldStyleNode);
			}
		}
	};
	function onclose(){
		setTimeout(function(){
			attempt += 1;
			if(attempt >= times){
				console.error('Socket server is down. Style reloader disabled.');
			}else{
				openSocket();
			}
		}, reopenTime);
	}

	openSocket();

	console.debug('Developing tool:', 'Style reloader enabled.');
})();