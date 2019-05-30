function process_response_data(queueSummary) {
	var total = 0; // Integer to tally all requests.
	var hasHit = false; // Boolean value for a Solicited Hit message.
	var hasGeneral = false; // Boolean value for Solicited message.
	var hasConfirmation = false; // Boolean value for Hit Confirmation Request/Response.
	// Boolean value to ensure responses were processed. Failsafe for 'normal' tone being played with every processed queue.
	var hasProcessed = false;

	// Iterate through each queueSummaryKey in the queueSummary.
	for (var queueSummaryKey in queueSummary) {
		if (queueSummaryKey == 'requests' && queueSummary[queueSummaryKey] != null) {
			for (var index = 0; index < queueSummary[queueSummaryKey].length; ++index) {
				var request = queueSummary[queueSummaryKey][index];
				// Addition assignment to total.
				total += request.newResponses;
				// TODO: This event is poorly named; it's actually called anytime there is an update to a request bucket
				$.event.trigger('client_response', request);//[newRequests, newResponses, generalResponse, requests]);
			}
		}
		if (queueSummaryKey == "response" && queueSummary[queueSummaryKey] != null) {
			// Set queueSummary
			var responseData = queueSummary[queueSummaryKey];
			// Map through returned array(s)
			responseData.map(function (val, index) {
				if (val === null || typeof val !== 'object') {
					return;
				}
				// Nested map to iterate through all responseData values.
				Object.keys(val).map(function (responseVal) {
					if (responseVal == 'class' && !hasConfirmation) {
						// Set hasConfirmation if specific condititions are met.
						hasConfirmation = responseData[index][responseVal] == 'HitConfirmationRequest' ||
							responseData[index][responseVal] == 'HitConfirmationResponse'
							? true : false;
					}
					else if (responseVal == 'hit' && !hasHit) {
						// Set hasHit if specific condititions are met.
						hasHit = responseData[index][responseVal]['Detected'] == '1' ? true : false;
					}
					else if (responseVal == 'request' && !hasGeneral) {
						// Set hasGeneral if specific condititions are met.
						if (responseData[index][responseVal]['Id']) {
							hasGeneral = parseInt(responseData[index][responseVal]['Id']) > 0 ? true : false;
						} else {
							hasGeneral = false;
						}
					}
				});
			});
			hasProcessed = true;
		}
	}

	$.event.trigger('client_response_end');

	if (queueSummary.prefill.length > 0) {
		var prefill = queueSummary.prefill[0];
		if (prefill.formId)
			$.event.trigger('prefill_request', [queueSummary.prefill[0].prefillId, queueSummary.prefill[0].formId]);
	}

	if (total > 0) {
		// Check local storage for type. 
		var type = window.localStorage.getItem('type');
		// Switch statement in priority order to set proper type if a new message or messages has been processed.
		if (hasProcessed) {
			switch (true) {
				case hasConfirmation:
					type = 'confirmation';
					break;
				case hasHit:
					type = 'hit';
					break;
				case hasGeneral:
					type = 'general';
					break;
				default:
					type = 'normal';
			}
			// Set local storage type.
			window.localStorage.setItem('type', type);
		}
		// Check if type is available; if not then set type to normal.
		type = window.localStorage.getItem('type') || 'normal';

		// If we're not on the responses tab, update the responses tab background color to indicate the type of
		// response received.
		var $responseTab = $('#new_alert').parents('li:first');
		if (!$responseTab.hasClass('current')) {
			if (type !== 'general')
				$('#new_alert').parents('li:first').addClass(type);
		}

		$.debug.log('Playing notification tone: ', type);
		loop = $.clips.focused(); // only loop if the window isn't active.
		$.audio.play(type, loop);
	}

	$.clips.newResponseCount(total, type);
}