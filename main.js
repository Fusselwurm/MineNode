/*global require, exports, process, console, __dirname*/
var sys = require('sys'),
	http = require('http'),
	config = require(__dirname + '/config.js'),
	frontend = require(__dirname + '/http.js'),
	httpServer,
	daemon = require(__dirname + '/daemon.js'),
	stdin = process.openStdin();

(function () {
	daemon.setServerJar(config.minecraft_server_jar);

	var path = config.minecraft_server_path;
	if (!path) {
		path = config.minecraft_server_jar.split('/');
		path.pop();
		path = path.join('/');
	}

	// chdir. thats important - else the server wont find its files again
	process.chdir(path);
	daemon.setServerPath(path);
}());

daemon.on('stdout', function (data) {
	console.log('DAEMON stdout: ' + data.toString().trim());
});

daemon.on('stderr', function (data) {
	console.log('DAEMON stderr: ' + data.toString().trim());
});

frontend.setDaemon(daemon);
frontend.setAdminkey(config.adminkey);


httpServer = http.createServer(frontend.handler);
httpServer.listen(config.httpPort);

console.log('http server should be running...');

stdin.on('data', function (chunk) {
	// 	console.log('GOT STDIN: ' + chunk);
	var input = chunk.toString().match(/^daemon (.*)/),
		 cmd = input ? input[1].trim() : false;

	if (cmd) {
		if (typeof daemon[cmd] === 'function') {
			daemon[cmd]();
		} else {
			if (daemon.isRunning()) {
				daemon.writeStdin(cmd + '\n');
			} else {
				console.log('server not running, wont write ' + chunk);
			}
		}
	} else {
		chunk = chunk.toString().trim();
		switch (chunk) {
		case 'exit':
			if (daemon.isRunning()) {
				daemon.stop();
				console.log('sending stop to daemon');
			}
			process.exit('exiting');
			break;
		case 'start':
			if (!daemon.isRunning()) {
				daemon.start();
			} else {
				console.log('daemon already running');
			}
			break;
		case 'stop':
			if (daemon.isRunning()) {
				daemon.stop();
			} else {
				console.log('daemon already stopped');
			}
			break;
		case 'help':
			console.log('available commands:\n' +
				'\tstart - start minecraft\n' +
				'\tstop - stop minecraft\n' +
				'\texit - kill this console (along with the minecraft server)\n' +
				'\tdaemon COMMAND - send COMMAND to running minecraft server');
			break;
		default:
			console.log('I don\'t understand you. type "help" for help');
		}
	}
});

console.log('listening to stdin...');

console.log('world name is: ' + daemon.getServerProperties()['level-name']);