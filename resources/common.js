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
		stdout: {
			update: (function () {

				var stdout = '';
				return function(data) {
					if (data.stdout) {
						stdout += data.stdout;
						$('#server_stdout').text(stdout).scrollTop($('#server_stdout')[0].scrollHeight);
					}
				};
			}())
		},
		stderr: {
			update: (function () {
				var stderr = '';
				return function (data) {
					if (data.stderr) {
						stderr += data.stderr;
						$('#server_stderr').text(stderr).scrollTop($('#server_stderr')[0].scrollHeight);
					}
				};
			}())
		},
		status: {
			update: function (data) {
				if (data.status) {
					$('#container_server_status').addClass('enabled').removeClass('disabled');
					$('#server_status').text('running');
				} else {
					$('#container_server_status').removeClass('enabled').addClass('disabled');
					$('#server_status').text('stopped');
				}
			}
		},
		clients: {
			update: function (data) {
				if (data.clients) {
					setWebclients(data.clients);
				}
			}
		},
		players: {
			update: function (data) {
				if (data.players) {
					$('#server_players').text(data.players.join(', '));
				}
			}
		},
		properties: {
			update: function (data) {
				if (data.properties) {
					setProperties(data.properties);
				}
			}
		},
		chat: (function () {
			var cnt,
			incomingMessage = function (sender, msg, resource) {
				$('#chat_output').append('<span class="chat ' + resource + '">&lt;' + sender + '&gt; ' + msg + '</span>\n');
				$('#chat_output').scrollTop($('#chat_output')[0].scrollHeight);

			};
			return {
				init: function (container) {
					cnt = container;
					$(cnt).html('<h1>Chat</h1>' +
						'<pre id="chat_output" class="logcontainer"></pre>' +
						'<input id="chat_input" type="text" size="80"/></div><div id="chat_send_confirmation">sendstatus</div>'
					);

					$('#chat_input').keyup(function (e) {
						if (e.keyCode === 13) {
							$('#chat_send_confirmation').addClass('nok').removeClass('ok').show();
							get({
								type : 'chat',
								msg: this.value
							}, function (data) {
								if (data.success) {
									$('#chat_send_confirmation').addClass('ok').removeClass('nok').fadeOut(1000);
								}
							});
							this.value = '';
						}
					});
				},
				update: function (data) {
					if (data.chat) {
						data.chat.forEach(function (l) {
							incomingMessage(l.username, l.msg, l.resource);
						});
					}
				}
			};
		}())
	};

function activate(name, e) {
	if (modules[name]) {
		if (modules[name].init) {
			modules[name].init(e);
		}
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
			m.update(data);
		});

		setTimeout(poll, 2000);
	}, 'json');
}

function get(request, cb) {
	request.clientid = clientid;
	$.get('/' + username, request, cb, 'json');
}
