$(document).ready(function () {
	$('#authenticate input').keyup(function (e) {

		if (e.keyCode === 13) {
			get({
				type : 'auth',
				name: username,
				key: this.value
			}, function (data) {
				if (data.success) {
					$('#authenticate').remove();
					poll();
				}
			});
			this.value = '';
		}
	}).focus();
});

function setProperties(data) {
	var n, s = '<table>';
	for (n in data) {
		if (n && data.hasOwnProperty(n)) {
			s += '<tr><td>' + n + '<\/td><td>' + data[n] + '<\/td><\/tr>\n';
		}
	}
	s += '<\/table>';
	$('#server_properties').html(s);

	if (data['level-name']) {
		document.title = title.replace('%s', data['level-name']);
	}

}

function setWebclients(data) {
	$('#server_webclients').html(data.map(function (c) {
		var s = '<span title="%s - %s">%s</span>';
		if (c.clientid === clientid) {
			s = '<em>' + s + '<\/em>';
		}

		return s.
			replace('%s', c.clientid).
			replace('%s', c.userAgent).
			replace('%s', c.name);
	}).join(', '));
}

var activeModules = [],
	modules = {
		stdout: (function () {
			var stdout = '';
			return function(data) {
				if (data.stdout) {
					stdout += data.stdout;
					$('#server_stdout').text(stdout).scrollTop($('#server_stdout')[0].scrollHeight);
				}
			};
		}()),
		stderr: (function () {
			var stderr = '';
			return function (data) {
				if (data.stderr) {
					stderr += data.stderr;
					$('#server_stderr').text(stderr).scrollTop($('#server_stderr')[0].scrollHeight);
				}
			};
		}()),
		status: function (data) {
			if (data.status) {
				$('#container_server_status').addClass('enabled').removeClass('disabled');
				$('#server_status').text('running');
			} else {
				$('#container_server_status').removeClass('enabled').addClass('disabled');
				$('#server_status').text('stopped');
			}
		},
		clients: function (data) {
			if (data.clients) {
				setWebclients(data.clients);
			}
		},
		players: function (data) {
			if (data.players) {
				$('#server_players').text(data.players.join(', '));
			}
		},
		properties: function (data) {
			if (data.properties) {
				setProperties(data.properties);
			}
		}
	};

function activate(name) {
	if (modules[name]) {
		activeModules.push(modules[name]);
	} else {
		throw 'unknown module ' + name;
	}
}

function poll() {
	get({type: 'update'}, function (data) {

		if (typeof data == 'string') {
			data = JSON.parse(data);
		}

		if (!data) {
			throw 'aaaaaaaaaargs';
		}

		activeModules.forEach(function (m) {
			m(data);
		});

		setTimeout(poll, 2000);
	}, 'json');
}

function get(request, cb) {
	request.clientid = clientid;
	$.get('/' + username, request, cb, 'json');
}