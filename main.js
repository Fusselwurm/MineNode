/*global require, exports, process, console*/
var sys = require('sys'),
	http = require('http'),
	config = require('./config.js'),
	frontend = require('./http.js'),
	httpServer,
	daemon = require('./daemon.js');

var stdin = process.openStdin();

stdin.on('data', function (chunk) {
// 	console.log('GOT STDIN: ' + chunk);
	var input = chunk.toString().match(/^daemon (.*)/),
		 cmd = input ? input[1].trim() : false;

	console.log(JSON.stringify(input));

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
			process.exit(); // FIXME
			break;
		case 'help':
			console.log('available commands: \nstart - start minecraft\nexit - kill this console (along with the minecraft server)\ndaemon XXX - send command to running minecraft server');
			break;
		default:
			console.log('I don\'t understand you. type "help" for help');
		}
	}
});

frontend.setDaemon(daemon);
frontend.setAdminkey(config.adminkey);

httpServer = http.createServer(frontend.handler);
httpServer.listen(config.httpPort);

console.log('http server should be running...');