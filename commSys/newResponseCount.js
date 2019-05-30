newResponseCount: function (count, type) {
	if (typeof count != 'undefined') {
		$newCount = $('#new_count');
		$newCount.text(count);
		var $responseLink = $('#GeneralResponseLink');
		var $responseTab = $('#navmenu ul:first li:first');

		if (count > 0) {
			// Checks if the first element of the <ul> does not have the 'current' class, if the 'confirmation' 
			// class exists on the first element of the <ul>.  
			if (!$responseTab.hasClass('current') && $responseTab.hasClass('confirmation')) {
				// Add the alert to the href tag if the user is not on the Responses tab.
				$('.confirmation a:first').addClass('confirmationAlert');
				$('.confirmation').addClass('confirmationAlert');
			}
			// Check the message type and check if the new response count is at zero.
			if (type == 'confirmation' && $responseLink.attr('newresponsecount') != 0) {
				// Add the alert to the Unsolicited Messages tab.
				$responseLink.addClass('hit_confirmation');
				if ($responseLink.hasClass('hit_alert')) {
					$responseLink.removeClass('hit_alert');
				}
			}
			$newCount.css('color', '#f00');
			$('#new_alert img').prop('src', '/img/rotate.gif');
		}
		else {
			$newCount.css('color', '#000000');
			$('#new_alert img').prop('src', '/img/no_rotate.gif');
		}

		clientState.newResponses = count;
		this._flash(0);
	}

	return clientState.newResponses;
},