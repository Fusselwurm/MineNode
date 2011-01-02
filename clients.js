var clients = [],
	/**
	* @brief returns random string (matching, atm, ^[0-9a-f]+$)
	* @param length desired string length
	* @return "random" string of specified length
	*/
	randomString = function (length) {
		var s = '',
		i,
		chars = 'abcdef0123456789';

		for (i = 0; i < length; i += 1) {
			s += chars[Math.floor(Math.random() * chars.length)];
		}
		return s;
	};

clients.TIMEOUT = 30000;
// client must have its ping method called regularly.
clients.newClient = function (userAgent) {
	// after 30s without request, consider client dead!
	var timer, that;

	timer = 0;
	that = {
		stdout: '',
		stderr: '',
		clientid: randomString(32),
		// may contain: 'admin', 'user', 'visitor' ... ?
		user: null,
		userAgent: userAgent || '',
		ping: function () {
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(function () {
				var idx = clients.indexOf(that);
				if (idx !== -1) {
					clients.splice(idx, 1);
				}
			}, clients.TIMEOUT);

		}
	};

	that.ping();
	clients.push(that);
	return that;
};
clients.getByClientid = function (clientid) {
	var result = null;
	clients.some(function (c) {
		if (c.clientid === clientid) {
			result = c;
			return true;
		}
	});
	return result;
};

exports.clients = clients;