(function() {
	function joinURL(domain, path, query, options) {
		var url = "";
		if (!domain) {
			console.error('Options with error:', options);
			throw new Error('AJAX error: domain should be not be empty string..');
		} else {
			if (domain[domain.length - 1] === '/') {
				domain = domain.substring(0, domain.length - 1);
			}
		}

		if (!path) {
			console.error('Options with error:', options);
			throw new Error('AJAX error: url path should be not be empty string.');
		} else {
			if (path[0] !== '/') {
				path = '/' + path;
			}
		}

		url = domain + path;

		if (query) {
			url += window.toUrlQuery(query, true);
		}

		return url;
	};

	window.microAjax = function(options) {
		if (!options.url) {
			console.error('Options with error:', options);
			throw new Error('AJAX error: url should not be empty or undefined.');
		}

		if (typeof options.url === 'object') {
			options.url = joinURL(options.url.domain, options.url.path, options.url.query, options);
		}

		if (!options.type) {
			options.type = "GET";
		}

		if (options.type === "POST" || options.type === "PUT") {
			if (!options.contentType) {
				options.contentType = "application/json";
			}
			if (!options.dataType) {
				options.dataType = "*/*";
			}
			if (options.data && typeof options.data === 'object' && options.contentType.indexOf('json') !== -1) {
				options.data = JSON.stringify(options.data);
			}
		}

		if (!options.error) {
			options.error = function(err) {
				console.error('AJAX error:', err, 'with options:', options);
			}
		}

		options.crossDomain = true;
		options.xhrFields = { withCredentials: true };
		var error = options.error;
		var success = options.success || function() {};
		var xhr;
		var timeoutError = d3.timeout(function() {
			console.error('AJAX timeout error');
			error({ message: 'Request timeouted', description: 'Server not answer on request more than 45 seconds.' })
			error = success = function() {};
			xhr.abort();
		}, 45000);


		options.success = function() {
			success.apply(this, arguments);
			timeoutError.stop();
		}
		options.error = function() {
			error.apply(this, arguments);
			timeoutError.stop();
		}
		xhr = window.ajax(options);
	};
})();
