/**
 * create users object from configuration object
 */
exports.create = function (config) {
	var users = config;

	users.getByName = function (name) {
		var user;
		users.some(function (u) {
			if (u.name === name) {
				user = u;
				return true;
			}
		});
		return user;
	}

	users.forEach(function (u) {
		switch (u.role) {
			case 'admin': u.rights = 16; break;
			case 'player': u.rights = 8; break;
			case 'visitor': u.rights = 2; break;
			default: throw 'invalid user role ' + user.role;
		}
	});

	return users;
};