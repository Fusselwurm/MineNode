/**
 * I'm dreaming of log4js or something like it ^^
 */

var
	fs = require('fs'),
	levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
	messages = [],
	outFStream,
	getLevelFn = function (level, logger) {
		return function (message) {
			var formatted;

			if (levels.indexOf(logger.getLevel()) > level) {
				return;
			}

			formatted = (new Date()).toUTCString() + ' [' + level.toUpperCase() + '] ' + logger.getName() + ' : ' + message;

			messages.push({
				logger: logger,
				level: level,
				message: message
			});

			if (outFStream) {
				outFStream.write(formatted + '\n');
			}
			console.log(formatted);
		};
	},
	newLogger = function (name) {
		var
			my = {
				level: 'info'
			},
			logger = {
				getName: function () {
					return name;
				},
				getMessages: function () {
					return messages.filter(function (m) {
						return m.logger === logger
					});
				},
				/**
				 * return parent logger or null
				 */
				getParent: function () {
					levels = name.split('.');
					levels.shift();

					return name ? (levels.length ? getLogger(levels.join('.')) : rootLogger) : null;
				},
				setLevel: function (level) {
					my.level = level;
				},
				getLevel: function () {
					return my.level;
				}
			};

		levels.forEach(function (level) {
			logger[level] = getLevelFn(level, logger);
		});

		if (name) {
			loggers[name] = logger;
		}

		return logger;
	},
	rootLogger = newLogger(),
	loggers = {
	},
	getLogger = function (name) {
		if (!name) {
			return rootLogger;
		}
		return loggers[name] || newLogger(name);
	};


exports.getLogger = getLogger;

exports.getMessages = function () {
	return messages;
};

exports.setOutfile = function (filename) {
	if (outFStream) {
		outFStream.destroySoon();
	}
	outFStream = fs.createWriteStream(filename);
};
