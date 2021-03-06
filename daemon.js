/*global require, exports, process, console*/
// daemon.js

var sys = require('sys'),
	spawn = require('child_process').spawn,
	fs = require('fs'),
	path = require('path'),
	// minecraft server process
	daemon,
	users,
	serverjar,
	serverpath,
	players = [],
	shutdowntimer = (function () {
		var timer = 0,
			muh = function (stopServer) {
				var t = muh.time;
				if (t === -1) {
					return;
				}

				if (stopServer) {
					if (!timer) {
						console.log('requiring auto shutdown after ' + t + ' milliseconds of inactivity');
						timer = setTimeout(function () {
							console.log('auto shutdown after ' + t + ' milliseconds of inactivity...');
							exports.stop();
						}, t);
					}
				} else {
					console.log('stopping auto shutdown');
					if (timer) {
						clearTimeout(timer);
						timer = 0;
					}
				}
			};

		muh.time = 60000; // default time: 60s
		return muh;
	}()),
	outputParsers = [
		function listOut(s) {
			var tmp = s.trim().match(/connected players:(.*)$/i);
			if (tmp) {
				while (players.length) {
					players.pop();
				}
				tmp[1].split(',').forEach(function (p) {
					p = p.trim();
					if (p) {
						players.push(p);
					}
				});
				shutdowntimer(players.length === 0);
			}
		},
		function playerConnect(s) {
			var tmp = s.match(/\[INFO\] ([^\s]+) .* logged in /),
				name = tmp ? tmp[1] : null;

			if (name) {
				if (players.indexOf(name) === -1) {
					players.push(name);
					shutdowntimer(false);
				}
				if (!users.getByName(name)) {
					users.push({
						name: name,
						role: 'visitor',
						key: ''
					});
				}
			}
		},
		function playerDisconnect(s) {
			var idx, player, tmp = s.match(/\[INFO\] ([^\s]+) lost connection/);
			if (tmp) {
				player = tmp[1];
				idx = players.indexOf(player);
				if (idx !== -1) {
					players.splice(idx, 1);
					shutdowntimer(players.length === 0);
				}
			}
		},
		function chatMessages(s) {
			// bspw 2011-01-05 21:43:30 [INFO] <Fusselwurm> muh

			// matches: date time group, user name, message
			var u,
				parts = s.trim().match(/^([0-9\-: ]+) \[INFO\] <([^>]+)> (.*)$/);
			if (!parts) {
				return;
			}
			u = users.getByName(parts[2]);
			if (u) {
				exports.emit('chat', u, parts[3]);
			} else {
				console.log('wtf? couldnt find user ' + parts[2] + ' in users array');
			}
		}
	],
	events = new (require('events').EventEmitter)(),
	stdout = '',
	stderr = '';

// force player check every 60s
setInterval(function () {
	if (daemon) {
		daemon.stdin.write('list\n');
	}
}, 60000);

// console.log(events.on); process.exit();

exports.on = events.on;
exports.emit = events.emit;

exports.setServerJar = function (filename) {
	if (!path.existsSync(filename)) {
		throw 'could not find jar ' + filename;
	}
	serverjar = filename;
};

exports.setServerPath = function (dirname) {
	if (!path.existsSync(dirname + '/server.properties')) {
		throw 'could not find server.properties in server path ' + dirname;
	}

	serverpath = dirname;
};

exports.setUsers = function (u) {
	users = u;
};

/**
 * @param timeout milliseconds until server shuts down if no player is connected
 */
exports.setAutoShutDown = function (timeout) {
	shutdowntimer.time = timeout;
};

/**
 * do start minecraft server
 * @return boolean true on success, false if it was already running
 */
exports.start = function () {
	if (daemon) {
		return false;
	}

	daemon = spawn('java', ['-Xmx1024M', '-Xms1024M', '-jar', serverjar, 'nogui']);

	daemon.on('exit', function (code) {
		console.log('DAEMON exit: ' + code);
		daemon = null;
	});

	daemon.stdout.on('data', function (data) {
		exports.emit('stdout', data);

		data = data.toString();
		outputParsers.forEach(function (f) {
			f(data);
		});
	});

	daemon.stderr.on('data', function (data) {
		exports.emit('stderr', data);

		data = data.toString();
		outputParsers.forEach(function (f) {
			f(data);
		});
	});

	return true;
};

/**
 * stop minecraft server
 * @returns boolean true if successful, false if it wasnt running to begin with
 */
exports.stop = function () {
	if (exports.isRunning()) {
		daemon.stdin.write('stop\n');
		return true;
	}
	return false;
};

/**
 * @returns minecraft server process
 */
exports.getDaemon = function () {
	return daemon;
};

/**
 * @return array of connected playernames
 */
exports.getPlayers = function () {
	return players;
};

/**
 * @returns object containing server properties (as written in server.properties)
 */
exports.getServerProperties = function () {
	var file = fs.readFileSync(serverpath + '/server.properties'),
		result = {};

	if (!file) {
		throw 'couldnt find properties (correct server path "' + serverpath + '"?)';
	}

	file.toString().split('\n').forEach(function (l) {
		if (l.indexOf('#') === 0) {
			return;
		}

		l = l.split('=');
		var tmp = l.shift();
		result[tmp] = l.join('=');
	});
	return result;
};

/**
 * @return boolean if minecraft server is running
 */
exports.isRunning = function () {
	return !!daemon;
};

exports.writeStdin = function (data) {
	if (!daemon) {
		throw 'daemon is not running';
	}
	daemon.stdin.write(data);
};
