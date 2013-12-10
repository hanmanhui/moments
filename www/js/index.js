
$(document).on('mobileinit', function() {
	$.support.cors = true;
	$.mobile.allowCrossDomainPages = true;
});

var is_desktop = true;
var is_test = true;
var initEvent = is_desktop ? 'ready' : 'deviceready';

$(document).on(initEvent, function() {
	ServiceHelper.init();
	PostHelper.init();
	$('#wrapper_btn_update').hide();

	$("#page_imagepopup").on('click', function() 
	{
		history.back();
		return false;
	});
		
	$(".log_picture > img").on('click', function() 
	{
		$.mobile.changePage('#page_imagepopup', {
			transition: 'pop',
		});
		
		var image = new Image();
		image.src = $(this).attr("src");
		$("#page_imagepopup").html('').append(image);
	});
	
	$("#page_btn_post").on('click', function() {
		PostHelper.postNote();
	});
	
	$("#page_btn_load").on('click', function() {
		PostHelper.loadMorePost();
	});
	
	$('#id_btn_back').on('click', function() {
		$('#wrapper_btn_post').show();
		$('#wrapper_btn_update').hide();
		PostHelper.initPostingPage();
	});
	
	$('#id_btn_to_post').on('click', function() {
		PostHelper.setPostDatePicker();
	});
	
	$("#id_create_sample").on('click', function() {
		PostHelper.generateSample();
	});
});

$(document).bind("pagechange", function(event, data) {
	if (typeof data.absUrl != 'undefined' && data.absUrl.match(/\#page_post$/)) {
		PostHelper.loadGeolocation();
	} else if (typeof data.absUrl != 'undefined' && data.absUrl.match(/\#page_main$/)) {
		$('#wrapper_btn_post').show();
		$('#wrapper_btn_update').hide();
		PostHelper.initPostingPage();
	}
});