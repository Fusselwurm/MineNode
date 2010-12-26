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
		case 'help':
			console.log('available commands: \nstart - start minecraft\nexit - kill this console (along with the minecraft server)\ndaemon XXX - send command to running minecraft server');
			break;
		default:
			console.log('I don\'t understand you. type "help" for help');
		}
	}
});

console.log('listening to stdin...');

console.log('world name is: ' + daemon.getServerProperties()['level-name']);