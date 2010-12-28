/*global require, exports, process, console, __dirname*/

var url = require('url'),
	fs = require('fs'),
	daemon,
	adminkey,
	clients,
	methods = {
		stdin: function (response, query) {
			if (daemon.isRunning()) {
				daemon.writeStdin(query.message + '\n');

				response.writeHead(200, {
					'Content-Type': 'text/plain'
				});

				response.write('nok');
			} else {
				response.writeHead(400, {
					'Content-Type': 'text/plain'
				});
				response.write('nok');
			}
		},
		start: function (response, query) {
			daemon.start();
			response.writeHead(200, {
				'Content-Type': 'text/plain'
			});
			response.write('ok');
		},
		stop: function (response, query) {
			response.writeHead(200, {
				'Content-Type': 'text/plain'
			});
			if (daemon.stop()) {
				response.write('ok');
			} else {
				response.write('nok');
			}
		},
		update: function (response, query) {
			var props, c = clients.getByClientid(query.clientid);
			if (!c) {
				response.writeHead(400, {
					'Content-Type': 'text/plain'
				});
				response.write('unknown client (did your session time out? plz refresh the page)');
			}
			props = {
				players: daemon.getPlayers(),
				properties: daemon.getServerProperties(),
				status: daemon.isRunning(),
				stdout:  c.stdout,
				stderr: c.stderr,
				clients: clients.map(function (c) {
					return c.clientid;
				})
			};

			c.stdout = '';
			c.stderr = '';

			response.writeHead(200, {
				'Content-Type': 'application/json'
			});
			response.write(JSON.stringify(props));
		}
	},
	/**
	 * @brief returns random string (matching, atm, ^[0-9a-f]+$)
	 * @param length desired string length
	 * @return "random" string of specified length
	 */
	randomString = function (length) {
		var s = '',
			i,
			chars = 'abcdef0123456789';

		for (i = 0; i < length; i += 1) {
			s += chars[Math.floor(Math.random() * chars.length)];
		}
		return s;
	};


clients = [];
clients.TIMEOUT = 30000;
// client must have its ping method called regularly.
clients.newClient =  function () {
	// after 30s without request, consider client dead!
	var timer, that;

	timer = 0;
	that = {
		stdout: '',
		stderr: '',
		clientid: randomString(16),
		ping: function () {
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(function () {
				var idx = clients.indexOf(that);
				if (idx !== -1) {
					clients.splice(idx, 1);
				}
			}, clients.TIMEOUT);

		}
	};

	that.ping();
	clients.push(that);
	return that;
};
clients.getByClientid = function (clientid) {
	var result;
	clients.some(function (c) {
		if (c.clientid === clientid) {
			result = c;
			return true;
		}
	});
	return result;
};

exports.setDaemon = function (o) {
	daemon = o;
	daemon.on('stdout', function (data) {
		clients.forEach(function (c) {
			c.stdout += data.toString();
		});
	});

	daemon.on('stderr', function (data) {
		clients.forEach(function (c) {
			c.stderr += data.toString();
		});
	});
};

exports.setAdminkey = function (s) {
	adminkey = s;
};


exports.handler = function that(request, response) {
	if (!daemon) {
		throw 'daemon not set';
	}
	if (!adminkey) {
		throw 'adminkey not set';
	}

	var urlbits = url.parse(request.url, true);

	if (urlbits.pathname === '/jquery.js') {
		response.writeHead(200, {
			'Content-Type': 'application/x-javascript'
		});
		response.end(fs.readFileSync(__dirname + '/resources/jquery.js'));
		return;
	}

	if ('/' + adminkey !== urlbits.pathname) {
		response.writeHead(400, {
			'Content-Type': 'text/html'
		});
		response.end('nö (missing or invalid key)');
	}


	if (urlbits.query) {
		if (urlbits.query.clientid) {
			clients.forEach(function (c) {
				if (c.clientid === urlbits.query.clientid) {
					c.ping();
				}
			});
		}
		if (typeof methods[urlbits.query.type] === 'function') {
			try {
				methods[urlbits.query.type](response, urlbits.query);
				response.end();
			} catch (e) {
				response.writeHead(500);
				console.log(e);
				response.end(e.message || e.toString());
			}
		} else {
			response.writeHead(400, {
				'Content-Type': 'text/plain'
			});
			response.end('wtf?');
		}
	} else {

		response.writeHead(200, {
			'Content-Type': 'text/html'
		});

		response.write(fs.readFileSync(__dirname + '/resources/index.html').toString().replace('%%ADMINKEY%%', adminkey).replace('%%CLIENTID%%', clients.newClient().clientid));
		response.end();
	}
};
