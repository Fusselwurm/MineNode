/*global require, exports, process, console*/
// daemon.js

var sys = require('sys'),
	spawn = require('child_process').spawn,
	config = require('./config.js'),
	daemon,
	stdout = '',
	stderr = '';


exports.start = function () {
	if (daemon) {
		return false;
	}

	daemon = spawn('java', ['-Xmx1024M', '-Xms1024M', '-jar', config.minecraft_server_jar, 'nogui']);

	daemon.on('exit', function (code) {
		console.log('DAEMON exit: ' + code);
		daemon = null;
	});

	daemon.stdout.on('data', function (data) {
		stdout += data.toString();
		console.log('DAEMON stdout: ' + data);
	});

	daemon.stderr.on('data', function (data) {
		stderr += data.toString();
		console.log('DAEMON stderr: ' + data);
	});

	return true;
};

exports.stop = function () {
	if (exports.isRunning()) {
		daemon.stdin.write('stop\n');
		return true;
	}
	return false;
};

exports.getDaemon = function () {
	return daemon;
};

exports.isRunning = function () {
	return !!daemon;
};

/**
 * @param clear (boolean) whether to clear the buffer
 */
exports.getStdout = function (clear) {
	var r = stdout;
	if (clear) {
		stdout = '';
	}
	return r;
};

exports.getStderr = function (clear) {
	var r = stderr;
	if (clear) {
		stderr = '';
	}
	return r;
};

exports.writeStdin = function (data) {
	if (!daemon) {
		throw 'daemon is not running';
	}
	daemon.stdin.write(data);
};