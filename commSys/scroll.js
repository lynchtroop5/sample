// This function hides the header if the user is scrolling down. 
// Once the user scrolls up then the header comes back into view.
$(document).scroll(function () {
    //Get scrollPosition
    var scrollPosition = $(this).scrollTop();
    // Check that fixedtoolbar() is loaded and ready.
    if ($('[data-id="clips-header"]').fixedtoolbar()) {
        // Prevents page clicks from the user interfering with with the scroll. 
        $('[data-role="footer"], [data-id="clips-header"]').fixedtoolbar({
            tapToggle: false
        });
        if (scrollPosition > lastScrollPosition) {
            // If the header is currently showing then hide the header.
            if (!$('[data-id="clips-header"].ui-fixed-hidden').length) {
                $('[data-id="clips-header"]').fixedtoolbar('hide');
            }
        }
        else {
            // If the header is currently hidden then show the header
            if ($('[data-id="clips-header"].ui-fixed-hidden').length) {
                $('[data-id="clips-header"]').fixedtoolbar('show');
            }
        }
    }
    // Reset lastScrollPosition.
    lastScrollPosition = scrollPosition;
});