/*global require, exports, process, console, __dirname*/

var url = require('url'),
	fs = require('fs'),
	daemon,
	adminkey,
	methods = {
		stdin: function (response, msg) {


			if (daemon.isRunning()) {
				daemon.writeStdin(msg + '\n');

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
		stderr: function (response, msg) {
			response.writeHead(200, {
				'Content-Type': 'text/plain'
			});
			response.write(daemon.getStderr(true));
		},
		stdout: function (response, msg) {
			response.writeHead(200, {
				'Content-Type': 'text/plain'
			});
			response.write(daemon.getStdout(true));
		},
		start: function (response, msg) {
			daemon.start();
			response.writeHead(200, {
				'Content-Type': 'text/plain'
			});
			response.write('ok');
		},
		stop: function (response, msg) {
			response.writeHead(200, {
				'Content-Type': 'text/plain'
			});
			if (daemon.stop()) {
				response.write('ok');
			} else {
				response.write('nok');
			}
		},
		status: function (response, msg) {
			response.writeHead(200, {
				'Content-Type': 'text/plain'
			});
			response.write(JSON.stringify(daemon.isRunning()));
		},
		properties: function (response, msg) {
			response.writeHead(200, {
				'Content-Type': 'text/plain'
			});
			response.write(JSON.stringify(daemon.getServerProperties()));
		}
	};

exports.setDaemon = function (o) {
	daemon = o;
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

	var urlbits = url.parse(request.url, true),
		msg;

	if ('/' + adminkey !== urlbits.pathname) {
		response.writeHead(400, {
			'Content-Type': 'text/html'
		});
		response.end('nö (missing or invalid key)');
	}


	if (urlbits.query) {
		msg = urlbits.query.message;
		if (typeof methods[urlbits.query.type] === 'function') {
			try {
				methods[urlbits.query.type](response, msg);
				response.end();
			} catch (e) {
				response.writeHead(500);
				console.log(e);
				response.end(e);
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

		response.write(fs.readFileSync(__dirname + '/resources/index.html').toString().replace('%%ADMINKEY%%', adminkey));
		response.end();
	}
};