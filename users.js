
/**
 * create users object from configuration object
 */
exports.create = function (config) {
	var users = config,
		parent = {
			push: config.push
		},
		userAddProperties = function (u) {
			switch (u.role) {
				case 'admin': u.rights = users.RIGHTS_ADMIN; break;
				case 'player': u.rights = users.RIGHTS_PLAYER; break;
				case 'visitor': u.rights = users.RIGHTS_VISITOR; break;
				default: throw 'invalid user role ' + user.role;
			}
		}

	users.RIGHTS_ADMIN = 16;
	users.RIGHTS_PLAYER = 8;
	users.RIGHTS_VISITOR = 2;

	users.RIGHTS_VISITOR = 2;
	users.RIGHTS_PLAYER = 8;
	users.RIGHTS_ADMIN = 16;

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

	users.push = function (u) {
		userAddProperties(u);
		parent.push(u);
	};

	users.forEach(function (u) {
		userAddProperties(u);
	});

	return users;
};

