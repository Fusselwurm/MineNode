/*global require, exports, process, console, __dirname*/

var url = require('url'),
	fs = require('fs'),
	path = require('path'),
	daemon,
	adminkey,
	users,
	/**
	 * @param status HTTP Status Code
	 * @param contentType defaults to application/json
	 */
	header = function (response, status, contentType) {
		response.writeHead(status, {
			'Content-Type': contentType || 'application/json'
		});
	},
	sendResource = function (response, urlbits) {
		var
			mime = 'text/plain',
			filepath = __dirname + urlbits.pathname;

		if (/^\/resources\/[a-z]+\.([a-z]+)$/.test(urlbits.pathname)) {
			switch (path.extname(filepath)) {
				case '.js':
					mime = 'application/x-javascript';
					break;
				case '.html':
					mime = 'text/html';
					break;
				case '.css':
					mime = 'text/css';
					break;
				default:
					mime = 'application/unknown';
			}

			path.exists(filepath, function (exists) {
				if (exists) {
					header(response, 200, mime);
					response.end(fs.readFileSync(filepath));
				} else {
					header(response, 404, mime);
					response.end();
				}
			});
		} else {
			header(response, 403, mime);
			response.end();
			console.log('bösartiger zugriff, path:' + JSON.stringify(path.substr(0, 50)));
		}
	},
	clients = require(__dirname + '/clients.js').clients,
	doAuth = function (response, query, client) {
		var u = users.getByName(query.name);
		if (u) {
			if (u.key === query.key) {
				client.user = u;

				header(response, 200);
				response.write(JSON.stringify({
					success: true,
					msg: 'auth ok'
				}));

			} else {
				header(response, 400);
				response.write(JSON.stringify({
					success: false,
					msg: 'key mismatch'
				}));
			}
		} else {
			header(response, 400);
			response.write(JSON.stringify({
				success: false,
				msg: 'invalid username'
			}));
		}

	},
	methods = {
		stdin: function (response, query, user) {
			if (user.rights >= 16) {
				if (daemon.isRunning()) {
					daemon.writeStdin(query.message + '\n');

					header(response, 200);
					response.write('true');
				} else {
					header(response, 400);
					response.write('false');
				}
			} else {
				header(response, 400);
				response.write(JSON.stringify({success: false, msg: 'bad client!'}));
			}
		},
		start: function (response, query, user) {
			if (user.rights > 2) {
				daemon.start();
				header(response, 200);
				response.write('true');
			} else {
				header(response, 400);
			}
		},
		stop: function (response, query, user) {
			if (user.rights > 8) {
				if (daemon.stop()) {
					header(response, 200);
					response.write('ok');
				} else {
					header(response, 500);
					response.write('nok');
				}
			} else {
				header(response, 400);
			}
		},
		update: function (response, query, user) {
			var props, c = clients.getByClientid(query.clientid);
			if (!c) {
				header(response, 400);
				response.write(JSON.stringify('unknown client (did your session time out? plz refresh the page)'));
			}
			props = {
				properties: daemon.getServerProperties(),
				status: daemon.isRunning()
			};

			if (user.rights > 2) {
				props.players = daemon.getPlayers();
			}

			if (user.rights > 4) {
				props.stdout =  c.stdout;
				props.stderr = c.stderr;
			}

			if (user.rights > 8) {
				props.clients = clients.map(function (c) {
					return {
						clientid: c.clientid,
						name: c.user ? c.user.name : 'UNKNOWN',
						userAgent: c.userAgent
					};
				});
			}

			c.stdout = '';
			c.stderr = '';

			header(response, 200);
			response.write(JSON.stringify(props));
		}
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


exports.setUsers = function (o) {
	users = o;
};


exports.handler = function that(request, response) {
	if (!daemon) {
		throw 'daemon not set';
	}
	if (!users) {
		throw 'users not set';
	}


	var urlbits = url.parse(request.url, true),
		username = urlbits.pathname.substr(1),
		clientid = urlbits.query ? urlbits.query.clientid : null,
		client = clientid ? clients.getByClientid(clientid) : null,
		user = client ? client.user : null;

	if (urlbits.pathname.indexOf('/resources/') === 0) {
		return sendResource(response, urlbits);
	}

	// if no or an invalid username is given, explode
	if (!username) {
		header(response, 400);
		response.end(JSON.stringify('nö (missing username)'));
		return;
	} else if (!users.getByName(username)) {
		header(response, 400);
		response.end(JSON.stringify('nö (invalid username)'));
		return;
	}

	// if no clientid is given, return index page
	if (!clientid) {

		header(response, 200, 'text/html');

		// return resources/index_[role].html
		response.write(fs.readFileSync(__dirname + '/resources/index_' + users.getByName(username).role + '.html').toString().replace('%%USERNAME%%', username).replace('%%CLIENTID%%', clients.newClient(request.headers['user-agent'] || 'unknown user agent').clientid));
		response.end();
		return;
	}

	// if clientid _was_ given, but doesnt belong to a known client, reject the request
	if (!client) {
		console.log('invalid clientid ' + urlbits.query.clientid);
		header(response, 400, 'text/plain');
		response.end('invalid clientid ' + urlbits.query.clientid + '\nwtf?');
		return;
	}

	client.ping();

	// if clientid is given, but user is not authed, the only legal action is an authentication request.
	if (!user) {
		if (urlbits.query.type === 'auth') {
			doAuth(response, urlbits.query, client);
		} else {
			console.log('invalid request from a user that has not been validated ' + username);
			header(response, 400, 'text/plain');
			response.write('invalid request ' + urlbits.query.clientid + '\nwtf?');
		}
		response.end();
		return;
	}

	// ooookay. now we have for sure an authenticated user
	if (urlbits.query.type && (typeof methods[urlbits.query.type] === 'function')) {
		try {
			methods[urlbits.query.type](response, urlbits.query, user);
			response.end();
		} catch (e) {
			header(response, 500);
			console.log(e);
			response.write(JSON.stringify('wah! an exception! and i wont tell you what it was about.'));
		}
		response.end();
		return;
	}

	header(response, 400);
	response.end('false');
	console.log('sth is wrong here');
};
