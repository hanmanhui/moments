function ServiceHelperPrototype() {
	var self = this;
	self.service = null;
	
	self.option = {
		timerMilliSeconds: 60000,
	};
	
	self.successCallback = function (data) {
	};
	
	self.errorCallback = function (data) {
		// alert("Error: " + data.ErrorMessage);
		// alert(JSON.stringify(data));
	};

	self.getStatus = function () {
		self.service.getStatus(self.successCallback, self.errorCallback);
	};
	
	self.startService = function () {
		self.service.startService(self.successCallback, self.errorCallback);
	};

	self.stopService = function () {
		self.service.stopService(self.successCallback, self.errorCallback);
	};

	self.enableTimer = function () {
		self.service.enableTimer(self.option.timerMilliSeconds, self.successCallback, self.errorCallback);
	};

	self.disableTimer = function () {
		self.service.disableTimer(self.successCallback, self.errorCallback);
	};

	self.registerForBootStart = function () {
		self.service.registerForBootStart(self.successCallback, self.errorCallback);
	};

	self.deregisterForBootStart = function () {
		self.service.deregisterForBootStart(self.successCallback, self.errorCallback);
	};

	self.registerForUpdates = function () {
		self.service.registerForUpdates(self.successCallback, self.errorCallback);
	};
	
	self.deregisterForUpdates = function () {
		self.service.deregisterForUpdates(self.successCallback, self.errorCallback);
	};

	self.setConfig = function (helloToString) {
		var config = { 
						"HelloTo" : helloToString 
					}; 
		self.service.setConfiguration(config, self.successCallback, self.errorCallback);
	};
	
	self.initSuccessCallback = function(r) {
		// if not registered 
		if (!r.ServiceRunning) {
			self.service.startService(self.initSuccessCallback, self.initErrorCallback);
		} else {
			if (!r.TimerEnabled) {
				self.service.enableTimer(self.option.timerMilliSeconds, 
					self.initSuccessCallback, self.initErrorCallback);
			}
		}	
	};
	
	self.initErrorCallback = function(r) {
		
	};
	
	self.init = function() {
		try {
			self.service = cordova.require('cordova/plugin/myService');
			self.service.getStatus(self.initSuccessCallback, self.initErrorCallback);
		} catch(e) {}
	};
	
}


var ServiceHelper = new ServiceHelperPrototype();