function PostHelperPrototype() {
	var self = this;
	
	self.LOCATION_CHANGE = [];
	self.WATCH_ID;

	self.POSITION = {};
		
	self.setPostDatePicker = function() {
		var date = self.dateToTimestamp(new Date());
		date = date.split(' ').join('T');
		
		$("#post_datetime").val(date);
	};

	self.loadGeolocation = function() {
		navigator.geolocation.getCurrentPosition(function(position) {
			self.setLocationRelatedInformations(position);
			
		}, function(error) {
			alert('code : ' + error.code + '\n' + 'message : ' + error.message + '\n');
			
			self.setLocationRelatedInformations(self.CURRENT_POSITION);	
		});
	};
	
	self.setLocationRelatedInformations = function(position) {
		if(!position) return;
		
		$.ajax({
			type: 'get', 
			dataType: 'json',
			url: 'http://maps.googleapis.com/maps/api/geocode/json', 
			data: {
				'latlng': position.coords.latitude + ',' + position.coords.longitude, 
				'sensor': false, 
				'language': 'en', 
			}, 
		}).done(function(result) {
			if(result.results.length > 0) {
				self.POSITION.lat = result.results[0].geometry.location.lat;
				self.POSITION.lng = result.results[0].geometry.location.lng;
				if($("#id_post_section_location > div > input").val() == "")
					$("#id_post_section_location > div > input").val(result.results[0]["formatted_address"]);
			}
		}).fail(function(err) {
			alert(err);
		});
		
		$.simpleWeather({
			lat: position.coords.latitude,
			lng: position.coords.longitude,
			unit: 'c',
			success: function (weather) {
				if($("#id_post_section_weather > img").attr('name') == '3200') {
					$("#id_post_section_weather > img").attr('src', 'img/icon/weather/' + weather.code + '.png');
					$("#id_post_section_weather > img").attr('name', weather.code);
					$("#id_post_section_weather > span").html('  ' + weather.temp + '&deg');
				}
			},
			error: function (weather) {
				console.log(weather);
			}
		});
	};
	
	self.uploadPhoto = function() 
	{
		$("#popup_upload_photo").popup("open");
	};
	
	self.capturePhoto = function() {
        navigator.camera.getPicture(self.photoSuccess, self.photoFail, {
            quilty: 50, 
            destinationType: Camera.DestinationType.FILE_URI, 
        });
	};
	
	self.getPhoto = function() {
        navigator.camera.getPicture(self.photoSuccess, self.photoFail, {
            quilty: 50, 
            destinationType: Camera.DestinationType.FILE_URI, 
            sourceType: Camera.PictureSourceType.PHOTOLIBRARY, 
        });
	};
		
	self.photoSuccess = function(imageURI) {
        $("#popup_upload_photo").popup("close");
		
		console.log("PhotoURL : " + imageURI);
        
        $("#page_post_photo_container > .item_photo > .add_photo").parent().before(
			'<div class=item_photo>' +
			'	<img src="' + imageURI + '">' + 
			'</div>'
		);
	};
	
	self.photoFail = function(msg) {
        $("#popup_upload_photo").popup("close");
        alert('Photo Failed because: ' + msg);
	};
	
	self.postNote = function() {
		if(!$("#page_post_note").val() || $("#page_post_note").val() == "") {
			alert("Please note something");
			$("#page_post_note").focus();
			return;
		}
		
		var data = {};
		
		data.timestamp = self.dateToTimestamp(new Date($("#post_datetime").val().split('T').join(' ')));
		data.type = self.TYPE_USERPOST;
		data.locationString = $("#id_post_section_location > div > input").val() == "" ? null : $("#id_post_section_location > div > input").val();
		data.longitude = typeof self.POSITION.lng != 'undefined' ? self.POSITION.lng : null;
		data.latitude = typeof self.POSITION.lat != 'undefined' ? self.POSITION.lat : null;
		data.weatherType = $("#id_post_section_weather > img").attr('name');
		data.weatherTemperature = parseInt($("#id_post_section_weather > span").html());
		data.note = $("#page_post_note").val();
		
		if(self.db) {
			self.db.transaction(function(tx) {
				tx.executeSql("INSERT INTO moment" + 
					"(timestamp, type, locationString, latitude, longitude, " + 
					" weatherType, weatherTemperature, note) values " + 
					"(?, ?, ?, ?, ?, ?, ?, ?)", 
					self.rowForInsert(data), 
					function(tx, results) {
						console.log("Save Complete");
						
						self.savePictures(results.insertId);
						
						self.list({
							callback: function (tx, results) {		
								self.callbackList(tx, results);
							},
						});
						
						$.mobile.changePage('#page_main', {
							transition: 'slide', 
						});
					}, self.callbackError);
			});
		}
	};
	
	self.savePictures = function(id) {
		$("#page_post_photo_container > .item_photo > img").each(function(index) {
			var imageURI = $(this).attr('src');
			var imgFileName = id + '_' + index + '.jpg';
			
			window.resolveLocalFileSystemURI(imageURI, function(fileEntry) {
	            console.log("got image file entry: " + fileEntry.fullPath); 
				
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
					fileSystem.root.getDirectory("Moments", {create: true}, function(moments) {
						moments.getDirectory("photo", {create: true}, function(photo) {
							photo.getDirectory("" + id, {create: true}, function(parent) {
			                    fileEntry.copyTo(parent, imgFileName, function(fileEntry) {
									self.initPostingPage();
								}, function(error) {
									alert("FS failed with error code: " + error.code); 					
								}); 
							});
						});
					});	
                }, function(error) {
					alert("FS failed with error code: " + error.code); 					
				}); 
            }, function(error) {
				alert("FS failed with error code: " + error.code); 
			});
		});
	};
	
	self.setImageTags = function(id) {	
		window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
			fileSystem.root.getDirectory("Moments", {create: false}, function(moments) {
				moments.getDirectory("photo", {create: false}, function(photo) {
					photo.getDirectory("" + id, {create: false}, function(parent) {
						var reader = parent.createReader();
						reader.readEntries(function(entries) {
							var imageTags = "";
							for(i in entries) {
								imageTags += '<img src="' + entries[i].fullPath + '"/>';
							}
							
							$("#post_id_" + id + " > .log_picture").html(imageTags);
						}, function(error) {
							alert("FS read entries failed with error code: " + error.code); 
						});
					}); 
				});
			});
		}, function(error) {
			alert("FS failed with error code: " + error.code);
		});
	}
	
	self.initPostingPage = function() {
		$("#id_post_section_location > div > input").val("");
		$("#id_post_section_weather > img").attr('src', 'jquerymobile/sand/images/ajax-loader.gif');
		$("#id_post_section_weather > img").attr('name', '3200');
		$("#id_post_section_weather > span").html('');
		$("#page_post_note").val("");
		$("#page_post_photo_container > .item_photo > img").parent().remove();
	};
	
	self.TYPE_USERPOST = 0, 
	self.TYPE_FACEBOOK = 1, 
	self.TYPE_TWITTER = 2, 
	self.TYPE_SCHEDULE = 3, 
	self.TYPE_LOCATION = 4, 
	self.TYPE_WEATHER = 5,
	self.TYPE_CONTACTS = 6;
    
	self.MONTH = ["January", "February", "March", "April", "May", "June", "July",
				"August", "September", "October", "November", "December"];
	self.WEATHER = ["Tornado", "Tropical Storm", "Hurricane", "Severe Thunderstorms", "Thunderstorms", "Mixed rain and snow", "Mixed rain and sleet",
                    "Mixed snow and sleet", "Freezing drizzle", "Drizzle", "Freezing rain", "Showers", "Showers", "Snow flurries", "Light snow showers",
					"Blowing snow", "Snow", "Hail", "Sleet", "Dust", "Foggy", "Haze", "Smoky", "Blustery", "Windy", "Cold", "Cloudy", "Mostly cloudy (night)", 
					"Mostly cloudy (day)", "Partly cloudy (night)", "Partly cloudy (day)", "Clear (night)", "Sunny", "Fair (night)", "Fair (day)", "Mixed rain and hail", 
					"Hot", "Isolated thunderstorms", "Scattered thunderstorms", "Scattered thunderstorms", "Scattered showers", "Heavy snow", "Scattered snow showers", 
					"Heavy snow", "Partly cloudy", "Thundershowers", "Snow showers", "Isolated thundershowers"];
	self.WEATHER[3200] = "Not available";
	
	self.db = null;

	// Transaction error callback
	self.callbackError = function(tx, results) {
		console.log(results);
	};

	// Transaction success callback
	self.callbackSuccess = function (tx, results) {
		console.log(results);
	};
	
	self.init = function() {
        self.db = window.openDatabase("MOMENT_DB", "1.0", "MOMENT_DB", 200000);
        self.db.transaction(function (tx) {
			//tx.executeSql("DROP TABLE moment");
           tx.executeSql("CREATE TABLE IF NOT EXISTS moment (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "timestamp TIMESTAMP NOT NULL, " +
                "type INTEGER(3) NOT NULL, " +
                "locationString VARCHAR(255), " +
                "longitude FLOAT, " +
                "latitude FLOAT, " +
                "weatherType INTEGER(6), " +
                "weatherTemperature FLOAT, " +
                "note VARCHAR(255))"
				, [], 
				function (tx, results) {
					self.list({
						callback: function (tx, results) {
							self.callbackList(tx, results);
						},
					});
                }, self.callbackError);
		});
	};
	
	self.loadMorePost = function() {
		self.list({
            lastTimestamp: $("#id_main_list > div").last().attr('timestamp'), 
			callback: function(tx, results) {
				if(results.rows.length == 0) {
					alert('No more post to read..');
				} else {
					self.callbackList(tx, results);
				}
			}, 
		});
	}
	
	self.callbackList = function(tx, results) {
		if (results.rows && results.rows.length > 0)
		{
			var html = '';
			var newDates = [];
			var newPostIds = [];
			
			for (var i = 0 ; i < results.rows.length ; i++)
			{
				var item = results.rows.item(i);
				
				if ($.inArray(item.create_date, newDates) < 0 && 
					$("#id_main_list > div[date='" + item.create_date + "']").length < 1)
				{
					var date = new Date(item.timestamp);
					var timestamp = date.getFullYear() + "-" + ((date.getMonth()+1) < 10 ? "0" : "") + (date.getMonth()+1) + "-" + 
									(date.getDate() < 10 ? "0" : "") + date.getDate() + " 23:59:59";

					html += '<div  class="divider_date" date="' + item.create_date + '" timestamp="' + timestamp + '">';
					html += '	<div class="divider_content">' + self.MONTH[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear() + '</div>';
					html += '	<div class="divider_line"></div>';
					html += '</div>';

					newDates.push(item.create_date);
				}
				
				if($("#id_main_list > div[id='id_" + item.timestamp + "_" + item.id + "']").length < 1) {
					html += self.rowToHtml(item);
					
					if(item.type == self.TYPE_USERPOST) {
						newPostIds.push(item.id);
					}
				}
			}
			
			$("#id_main_list").prepend(html);
			
			self.addDeleteEvent();
			self.addUpdateEvent();
			
			for(i in newPostIds) {
				self.setImageTags(newPostIds[i]);
			}
			
			$("#id_main_list > div").tsort({
				attr: 'timestamp',
				order: 'desc', 
			});
		}
	};
	
	self.rowToHtml = function(row) {
		var buf = "";
		
		var id = "post_id_" + row.id;
		switch (row.type)
		{
		case self.TYPE_USERPOST:
			buf += '<div class="log ui-shadow" id="' + id + '" timestamp="' + row.timestamp + '">';
			buf += '	<div class="log_date">' + row.timestamp + '</div>';
			buf += '	<div class="log_weather">'
			buf += '		<img name="' + row.weatherType + '" src="img/icon/weather/' + row.weatherType + '.png" width="20" align="absmiddle"/> '
			buf += self.WEATHER[row.weatherType] + ', ' + (typeof row.weatherTemperature != 'undefined' ? row.weatherTemperature : '?') + '&degC'
			buf += '	</div>';
			buf += '	<div class="log_content">';
			buf += row.note;
			buf += '	</div>';
			buf += '	<div class="log_picture">';
			buf += '	</div>';
			buf += '</div>';
			break;
			
		case self.TYPE_FACEBOOK:
		
			buf += '<div class="log_auto" id="' + id + '" timestamp="' + row.timestamp + '">';
			buf += '	<div class="log_delete">X</div>';
			buf += '	<img src="img/icon/facebook.png" width="20" align="absmiddle"/>';
			buf += '	<div class="log_auto_timestamp">' + row.create_time + '</div>';
			buf += '	<div class="log_auto_content">' + row.note + '</div>';
			buf += '</div>';
			break;
			
		case self.TYPE_TWITTER:
		
			buf += '<div class="log_auto" id="' + id + '" timestamp="' + row.timestamp + '">';
			buf += '	<div class="log_delete">X</div>';
			buf += '	<img src="img/icon/twitter.png" width="20" align="absmiddle"/>';
			buf += '	<div class="log_auto_timestamp">' + row.create_time + '</div>';
			buf += '	<div class="log_auto_content">' + row.note + '</div>';
			buf += '</div>';
			break;
			
		case self.TYPE_SCHEDULE:
		
			buf += '<div class="log_auto" id="' + id + '" timestamp="' + row.timestamp + '">';
			buf += '	<div class="log_delete">X</div>';
			buf += '	<img src="img/icon/schedule.png" width="20" align="absmiddle"/>';
			buf += '	<div class="log_auto_timestamp">' + row.timestamp + '</div>';
			buf += row.note;
			buf += '</div>';
			break;
			
		case self.TYPE_LOCATION:
		
			buf += '<div class="log_auto" id="' + id + '" timestamp="' + row.timestamp + '">';
			buf += '	<div class="log_delete">X</div>';
			buf += '	<img src="img/icon/map.png" width="20" align="absmiddle"/>';
			buf += '	<div class="log_auto_timestamp">' + row.timestamp + '</div>';
			buf += row.locationString;
			buf += '</div>';
			break;
			
		case self.TYPE_WEATHER:
		
			buf += '<div class="log_auto" id="' + id + '" timestamp="' + row.timestamp + '">';
			buf += '	<div class="log_delete">X</div>';
			buf += '	<img src="img/icon/weather/' + row.weatherType + '.png" width="20" align="absmiddle"/>';
			buf += '	<div class="log_auto_timestamp">' + row.timestamp + '</div>';
			buf += self.WEATHER[row.weatherType] + ' ' + row.weatherTemperature + '&degC';
			buf += '</div>';
			break;
			
		case self.TYPE_CONTACTS:
		
			buf += '<div class="log_auto" id="' + id + '" timestamp="' + row.timestamp + '">';
			buf += '	<div class="log_delete">X</div>';
			buf += '	<img src="img/icon/contact.png" width="20" align="absmiddle"/>';
			buf += '	<div class="log_auto_timestamp">' + row.timestamp + '</div>';
			buf += row.note;
			buf += '</div>';
			break;
			
		}
		
		return buf;
	};
	
	self.dateToTimestamp = function (date) {
		var ret = "";
		ret += date.getFullYear();
		ret += "-" + (((date.getMonth() + 1) < 10) ? "0" : "") + (date.getMonth() + 1);
		ret += "-" + ((date.getDate() < 10) ? "0" : "") + date.getDate();
		ret += " " + ((date.getHours() < 10) ? "0" : "") + date.getHours();
		ret += ":" + ((date.getMinutes() < 10) ? "0" : "") + date.getMinutes();
		return ret;
	};
	
	self.addDeleteEvent = function() {
		$("#id_main_list > div > div.log_delete").click(function() {
			var id = $(this).parent().attr('id');
			var timestamp = $(this).parent().attr('timestamp');
			self.remove(id.split('_')[2]);
			$('#' + id).remove();
			self.removeUnnecessaryDateDivider(timestamp.split(' ')[0]);			
		});
	}
	
	self.addUpdateEvent = function() {
		$("#id_main_list > div.log").click(function() {
			var id = $(this).attr('id').split('_')[2];
			
			$('#page_btn_update').click(function() {
				if(!$("#page_post_note").val() || $("#page_post_note").val() == "") {
					alert("Please note something");
					$("#page_post_note").focus();
					return;
				}
		
				var data = {};
		
				data.timestamp = self.dateToTimestamp(new Date($("#post_datetime").val().split('T').join(' ')));
				data.locationString = $("#id_post_section_location > div > input").val() == "" ? null : $("#id_post_section_location > div > input").val();
				data.longitude = typeof self.POSITION.lng != 'undefined' ? self.POSITION.lng : null;
				data.latitude = typeof self.POSITION.lat != 'undefined' ? self.POSITION.lat : null;
				data.note = $("#page_post_note").val();

				if (self.db) {
					self.db.transaction(function(tx) {
						tx.executeSql("UPDATE moment " +
          				  "SET locationString=?, latitude=?, longitude=?, note=? WHERE id=?", 
         				  [data.locationString, data.latitude, data.longitude, data.note, id],
						function(tx, results) {
							self.savePictures(id);
								
							$("#post_id_" + id).attr('timestamp', data.timestamp);
							$("#post_id_" + id + " > .log_date").html(data.timestamp);
							$("#post_id_" + id + " > .log_content").html(data.note);
			
							$("#id_main_list > div").tsort({
								attr: 'timestamp',
								order: 'desc', 
							});
							
							self.setImageTags(id);
							
							$.mobile.changePage('#page_main', {
								transition: 'slide', 
							});
						}, self.callbackError);
					});
				};
			});
			

			if (self.db) {
				self.db.transaction(function(tx) {
					tx.executeSql("SELECT * FROM moment WHERE id=?", [id], 
					function(tx, results) {
						console.log(tx);
						console.log(results.rows);
						if(results.rows.length == 1) {
							var item = results.rows.item(0);
							console.log(item);
							if(item.locationString == null) self.loadGeolocation();
							else {
								$("#id_post_section_location > div > input").val(item.locationString);
								self.POSITION.lng = item.longitude;
								self.POSITION.lat = item.latitude;
							}
							
							$("#post_datetime").val(item.timestamp.split(' ').join('T'));
							$("#id_post_section_weather > img").attr('name', item.weatherType);
							$("#id_post_section_weather > img").attr('src', 'img/icon/weather/' + item.weatherType + '.png');
							$("#id_post_section_weather > span").html('  ' + item.weatherTemperature + '&deg');
							$("#page_post_note").val(item.note);
						}
					}, self.callbackError);
				});
			}
			
			$(this).children('.log_picture').children('img').each(function() {
				console.log($(this));
		        $("#page_post_photo_container > .item_photo > .add_photo").parent().before(
					'<div class=item_photo>' +
					'	<img src="' + $(this).attr('src') + '">' + 
					'</div>'
				);
			});
						
			$.mobile.changePage('#page_post', {
				transition: 'slide', 
			});
			
			$('#wrapper_btn_post').hide();
			$('#wrapper_btn_update').show();
		});
	}
	
	self.removeUnnecessaryDateDivider = function(date) {
		if($('#id_main_list > div[timestamp^="' + date + '"]').length < 2) {
			$("#id_main_list > .divider_date[date='" + date + "']").remove();
		}
	}
	
	self.generateSample = function() {
		var sampleData = [];
		var sampleBaseDate = new Date().getTime();	
		var locations = ['83-62 Changcheon-dong, Seodaemun-gu, Seoul, South Korea', '1-27 Gusan-dong, Eunpyeong-gu, Seoul, South Korea', '764-1 Gajwa-dong, Ilsanseo-gu, Goyang-si, Gyeonggi-do, South Korea'];
		////////////////////////////////////////////
		for(i = 0; i < 20; i++) {
			var row = {};
			row.timestamp = self.dateToTimestamp(new Date((new Date(2013, 11, 5)).getTime() + parseInt(Math.random() * 5*24*60*60*1000)));
			row.type = self.TYPE_WEATHER;
			row.locationString = null;
			row.longitude = null;
			row.latitude = null;
			row.weatherType = parseInt((Math.random() * 48) % 48);
			row.weatherTemperature = parseInt((Math.random() * 15), 10) % 15 - 17;
			row.note = null;
			sampleData.push(row);
		}
		////////////////////////////////////////////
		var row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 5, 15));
		row.type = self.TYPE_SCHEDULE;
		row.locationString = locations[0];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = 'Computer Science Graduation Exhibition 3 ~ 5';
		sampleData.push(row);
		
		row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 6, 23));
		row.type = self.TYPE_SCHEDULE;
		row.locationString = locations[0];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = 'Mobile Programming - Project 2 Final Report';
		sampleData.push(row);
		
		row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 7, 17));
		row.type = self.TYPE_SCHEDULE;
		row.locationString = locations[1];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = 'Mobile Programming Team Meeting';
		sampleData.push(row);					
		self.post(sampleData);
		////////////////////////////////////////////
		row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 5, 11, 43));
		row.type = self.TYPE_LOCATION;
		row.locationString = locations[0];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = null;
		sampleData.push(row);
		
		row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 5, 19, 23));
		row.type = self.TYPE_LOCATION;
		row.locationString = locations[1];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = null;
		sampleData.push(row);
		
		row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 7, 11, 24));
		row.type = self.TYPE_LOCATION;
		row.locationString = locations[0];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = null;
		sampleData.push(row);
		
		row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 7, 19, 2));
		row.type = self.TYPE_LOCATION;
		row.locationString = locations[1];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = null;
		sampleData.push(row);
		
		row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 7, 22, 27));
		row.type = self.TYPE_LOCATION;
		row.locationString = locations[2];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = null;
		sampleData.push(row);
		
		row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 9, 1, 2));
		row.type = self.TYPE_LOCATION;
		row.locationString = locations[1];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = null;
		sampleData.push(row);
		
		row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 9, 23, 32));
		row.type = self.TYPE_LOCATION;
		row.locationString = locations[0];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = null;
		sampleData.push(row);
		
		row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 9, 18, 48));
		row.type = self.TYPE_LOCATION;
		row.locationString = locations[1];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = null;
		sampleData.push(row);
		
		row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 10, 9, 51));
		row.type = self.TYPE_LOCATION;
		row.locationString = locations[0];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = null;
		sampleData.push(row);
		////////////////////////////////////////////
		row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 8, 23, 34));
		row.type = self.TYPE_FACEBOOK;
		row.locationString = locations[2];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = "Facebook Post Test..";
		sampleData.push(row);
		
		row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 9, 2, 9));
		row.type = self.TYPE_FACEBOOK;
		row.locationString = locations[2];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = "lol lol lol lol lol lol lol&nbspFinished Final PROJECT~~ lol";
		sampleData.push(row);
		////////////////////////////////////////////
		row = {};
		row.timestamp = self.dateToTimestamp(new Date(2013, 11, 8, 23, 13));
		row.type = self.TYPE_TWITTER;
		row.locationString = locations[2];
		row.longitude = null;
		row.latitude = null;
		row.weatherType = parseInt((Math.random() * 48) % 48);
		row.weatherTemperature = parseInt((Math.random() * 20), 10) % 20 - 10;
		row.note = "Twitter Post Test..";
		sampleData.push(row);
		/////////////////////////////////////////////
	};
	
	self.rowForInsert = function(obj) {
		return [
			obj.timestamp,
			obj.type,
			obj.locationString,
			obj.latitude,
			obj.longitude,
			obj.weatherType,
			obj.weatherTemperature,
			obj.note
		];
	};
	
	self.post = function (data) {
		if (!self.db) return;
		
        self.db.transaction(function(tx) {
            for(var i in data) {
                tx.executeSql("INSERT INTO moment" + 
					"(timestamp, type, locationString, latitude, longitude, " + 
					" weatherType, weatherTemperature, note) values " + 
					"(?, ?, ?, ?, ?, ?, ?, ?)", 
					self.rowForInsert(data[i]), 
					self.callbackSuccess, self.callbackError);
            }
        });
	};

	self.update = function (id, data) {
		if (!self.db) return;
		
        self.db.transaction(function(tx) {
            tx.executeSql("UPDATE moment " +
                "SET locationString=?, latitude=?, longitude=?, note=? WHERE id=?", 
                [data.locationString, data.latitude, data.longitude, data.note, id],
                self.callbackSuccess, self.callbackError);
        });
	};

	self.remove = function (id) {
		if (!self.db) return;
		
        self.db.transaction(function(tx) {
            tx.executeSql("DELETE FROM moment WHERE id=?", [id], 
				self.callbackSuccess, self.callbackError);
        });
	};

	self.get = function (id) {
		if (!self.db) return;
		
        self.db.transaction(function(tx) {
            tx.executeSql("SELECT * FROM moment WHERE id=?", [id], 
				self.callbackSuccess, self.callbackError);
        });
	};

	self.list = function(_options) {
		if (!self.db) return;
		
        var options = $.extend({
            'lastTimestamp': null, 
            'limit': 10, 
            'callback': function() {}, 
        }, _options);
    
        self.db.transaction(function(tx) {
			var query = "";
			var params = [];
			
            if(options.lastTimestamp !== null) {
                query = "SELECT m.* ";
				query += ", DATE(m.timestamp) AS create_date, TIME(m.timestamp) AS create_time ";
				query += ", strftime('%s', m.timestamp) AS unix_timestamp ";
				query += ", strftime('%h:%m ', m.timestamp) AS create_time_a ";
				query += ", CASE WHEN CAST(strftime('%H', m.timestamp, 'localtime') AS INTEGER) = 12 "
						+ " THEN strftime('%H:%M', m.timestamp, 'localtime') || ' PM' "
						+ " WHEN CAST(strftime('%H', m.timestamp, 'localtime') AS INTEGER) > 12 "
						+ " THEN strftime('%H:%M', m.timestamp, '-12 Hours', 'localtime') || ' PM' "
						+ " ELSE strftime('%H:%M', m.timestamp, 'localtime') || ' AM' END AS create_time_b";
				query += " FROM moment AS m WHERE timestamp < ? ORDER BY timestamp DESC LIMIT ?";
				params = [options.lastTimestamp, options.limit];
            } else {
                query = "SELECT m.*";
				query += ", DATE(m.timestamp) AS create_date, TIME(m.timestamp) AS create_time ";
				query += ", strftime('%s', m.timestamp) AS unix_timestamp ";
				query += ", strftime('%h:%m', m.timestamp) AS create_time_a ";
				query += ", CASE WHEN CAST(strftime('%H', m.timestamp, 'localtime') AS INTEGER) = 12 "
						+ " THEN strftime('%H:%M', m.timestamp, 'localtime') || ' PM' "
						+ " WHEN CAST(strftime('%H', m.timestamp, 'localtime') AS INTEGER) > 12 "
						+ " THEN strftime('%H:%M', m.timestamp, '-12 Hours', 'localtime') || ' PM' "
						+ " ELSE strftime('%H:%M', m.timestamp, 'localtime') || ' AM' END AS create_time_b";
				query += " FROM moment AS m WHERE 1 ORDER BY timestamp DESC LIMIT ?";
				params = [options.limit];
            }
			
			console.log(query);
            tx.executeSql(query, params, function(tx, results) {
						console.log(tx);
						console.log(results);
                        options.callback(tx, results);
			}, self.callbackError);
        });
	};
}

var PostHelper = new PostHelperPrototype();
