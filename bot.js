// catches player's message

var daemon,
	users,
	commands = [
		'help',
		'kick',
		'ban',
		'pardon',
		'ban-ip',
		'pardon-ip',
		'op',
		'deop',
		'tp',
		'give',
		'tell',
		'stop',
		'save-all',
		'save-off',
		'save-on',
		'list',
		'say'
	],
	chatHandler = function (user, message) {
		var parts = message.match(/^\!([a-z\-]+)( .*)?$/);
		console.log(parts);
		if (!parts) {
			return;
		}
		// pass commands to server command line
		if (commands.indexOf(parts[1]) !== -1 && user.rights >= users.RIGHTS_ADMIN) {
			daemon.writeStdin(message.substr(1) + '\n');
		}
	};

exports.setDaemon = function (d) {
	daemon = d;

	daemon.on('chat', chatHandler);
};

exports.setUsers = function (u) {
	users = u;
};
