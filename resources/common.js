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
					work();
				}
			});
			this.value = '';
		}
	}).focus();
});