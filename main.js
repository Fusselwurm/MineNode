/*global require, exports, process, console, __dirname*/
var sys = require('sys'),
	http = require('http'),
	config = require(__dirname + '/config.js'),
	frontend = require(__dirname + '/http.js'),
	path = require('path'),
	httpServer,
	daemon = require(__dirname + '/daemon.js'),
	users = require(__dirname + '/users.js'),
	bot = require(__dirname + '/bot.js'),
	log = require(__dirname + '/log.js'),
	logger = log.getLogger('main'),
	stdin = process.openStdin();

log.setOutfile(__dirname + '/log.txt');

users = users.create(config.users);

try {

	(function () {
		daemon.setServerJar(config.minecraft_server_jar);

		var mcServerJarPath = config.minecraft_server_path;
		if (!mcServerJarPath) {
			mcServerJarPath = path.dirname(config.minecraft_server_jar);
		}

		// chdir. thats important - else the server wont find its files again
		if (!mcServerJarPath) {
			logger.fatal('no server file path given!');
			process.exit();
		}
		if (!path.existsSync(mcServerJarPath)) {
			logger.fatal('cannot find dir '  + mcServerJarPath);
			process.exit();
		}
		process.chdir(mcServerJarPath);
		daemon.setServerPath(mcServerJarPath);
		daemon.setAutoShutDown(config.autoshutdown || 60000);
		daemon.setUsers(users);
	}());

} catch (e) {
	logger.fatal('couldnt initialize daemon module: ' + e);
	process.exit();
}


daemon.on('stdout', function (data) {
	logger.debug('DAEMON stdout: ' + data.toString().trim());
});

daemon.on('stderr', function (data) {
	logger.debug('DAEMON stderr: ' + data.toString().trim());
});

frontend.setDaemon(daemon);
frontend.setUsers(config.users);

bot.setUsers(users);
bot.setDaemon(daemon);


httpServer = http.createServer(frontend.handler);
httpServer.listen(config.httpPort);

logger.info('http server should be running...');

stdin.on('data', function (chunk) {
	// 	logger.debug('GOT STDIN: ' + chunk);
	var input = chunk.toString().match(/^daemon (.*)/),
		 cmd = input ? input[1].trim() : false;

	if (cmd) {
		if (typeof daemon[cmd] === 'function') {
			daemon[cmd]();
		} else {
			if (daemon.isRunning()) {
				daemon.writeStdin(cmd + '\n');
			} else {
				logger.error('server not running, wont write ' + chunk);
			}
		}
	} else {
		chunk = chunk.toString().trim();
		switch (chunk) {
		case 'exit':
			if (daemon.isRunning()) {
				daemon.stop();
				logger.info('sending stop to daemon');
			}
			process.exit('exiting');
			break;
		case 'start':
			if (!daemon.isRunning()) {
				daemon.start();
			} else {
				logger.warn('daemon already running');
			}
			break;
		case 'stop':
			if (daemon.isRunning()) {
				daemon.stop();
			} else {
				logger.warn('daemon already stopped');
			}
			break;
		case 'help':
			logger.info('available commands:\n' +
				'\tstart - start minecraft\n' +
				'\tstop - stop minecraft\n' +
				'\texit - kill this console (along with the minecraft server)\n' +
				'\tdaemon COMMAND - send COMMAND to running minecraft server');
			break;
		default:
			logger.warn('I don\'t understand you. type "help" for help');
		}
	}
});

logger.info('listening to stdin...');

logger.info('world name is: ' + daemon.getServerProperties()['level-name']);
