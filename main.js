/*global require, console, process*/
var sys = require('sys'),
	spawn = require('child_process').spawn,
	http = require('http'),
	url = require('url'),
	config = require('./config.js'),
	fs = require('fs'),
	daemon,
	httpServer,
	daemon_stdout = '',
	daemon_stderr = '';

daemon = spawn('java', ['-Xmx1024M', '-Xms1024M', '-jar', config.minecraft_server_jar, 'nogui']);



daemon.stdout.on('data', function (data) {
	daemon_stdout += data.toString();
	console.log('DAEMON stdout: ' + data);
});

daemon.stderr.on('data', function (data) {
	daemon_stderr += data.toString();
	console.log('DAEMON stderr: ' + data);
});

daemon.on('exit', function (code) {
	console.log('DAEMON exit: ' + code);
});

var stdin = process.openStdin();

stdin.on('data', function (chunk) {
	console.log('GOT STDIN: ' + chunk);
	daemon.stdin.write(chunk);
});


httpServer = http.createServer(function (request, response) {

	var urlbits = url.parse(request.url, true),
		msg;

		if ('/' + config.adminkey !== urlbits.pathname) {
			response.writeHead(400, {
				'Content-Type': 'text/html'
			});
			response.end('nö (missing or invalid key)');
		}


	if (!urlbits.query) {
		response.writeHead(200, {
			'Content-Type': 'text/html'
		});


		response.write(fs.readFileSync('resources/index.html').toString().replace('%%ADMINKEY%%', JSON.stringify(config.adminkey)));
		response.end();
		return;
	}

	msg = urlbits.query.message;
	switch (urlbits.query.type) {
	case 'stdin':

		response.writeHead(200, {
			'Content-Type': 'text/plain'
		});

		response.end('ok');

		daemon.stdin.write(msg + '\n');
		break;
	case 'stdout':
		response.writeHead(200, {
			'Content-Type': 'text/plain'
		});
		response.end(daemon_stdout);
		daemon_stdout = '';
		break;
	case 'stderr':
		response.writeHead(200, {
			'Content-Type': 'text/plain'
		});
		response.end(daemon_stderr);
		daemon_stderr = '';
		break;
	default:
		response.writeHead(400, {
			'Content-Type': 'text/plain'
		});
		response.end('wtf?');
	}

});
httpServer.listen(config.httpPort);

console.log('http server should be running...');