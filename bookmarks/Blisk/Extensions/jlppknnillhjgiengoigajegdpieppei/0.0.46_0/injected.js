var ExtVersion;

ExtVersion = '0.0.46';

var CustomEvents, LiveReloadInjected;

CustomEvents = {
  bind: function(element, eventName, handler) {
    if (element.addEventListener) {
      return element.addEventListener(eventName, handler, false);
    } else if (element.attachEvent) {
      element[eventName] = 1;
      return element.attachEvent('onpropertychange', function(event) {
        if (event.propertyName === eventName) {
          return handler();
        }
      });
    } else {
      throw new Error("Attempt to attach custom event " + eventName + " to something which isn't a DOMElement");
    }
  },
  fire: function(element, eventName) {
    var document, event;
    document = element instanceof HTMLDocument ? element : element.ownerDocument;
    if (element.addEventListener) {
      event = document.createEvent('HTMLEvents');
      event.initEvent(eventName, true, true);
      return document.dispatchEvent(event);
    } else if (element.attachEvent) {
      if (element[eventName]) {
        return element[eventName]++;
      }
    } else {
      throw new Error("Attempt to fire custom event " + eventName + " on something which isn't a DOMElement");
    }
  }
};

LiveReloadInjected = (function() {
  function LiveReloadInjected(document, window, extName) {
    var _ref, _ref1, _ref2,
      _this = this;
    this.document = document;
    this.window = window;
    this.extName = extName;
    this._hooked = false;
    this._verbose = !!((_ref = this.window) != null ? (_ref1 = _ref.location) != null ? (_ref2 = _ref1.href) != null ? _ref2.match(/LR-verbose/) : void 0 : void 0 : void 0);
    setTimeout((function() {
      return _this.determineInitialState();
    }), 1);
  }

  LiveReloadInjected.prototype.determineInitialState = function() {
    if (this.findScriptTag()) {
      this.send('status', {
        enabled: true,
        active: true,
        initial: true
      });
      return this.hook();
    } else {
      return this.send('status', {
        enabled: false,
        active: false,
        initial: true
      });
    }
  };

  LiveReloadInjected.prototype.findScriptTag = function() {
    var element, m, src, _i, _len, _ref;
    _ref = this.document.getElementsByTagName('script');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      element = _ref[_i];
      if (src = element.src) {
        if (m = src.match(/\/livereload\.js(?:\?(.*))?$/)) {
          return element;
        }
      }
    }
    return null;
  };

  LiveReloadInjected.prototype.doDisable = function(callback) {
    var element;
    element = this.findScriptTag();
    if (element) {
      CustomEvents.fire(this.document, 'LiveReloadShutDown');
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
    return callback();
  };

  LiveReloadInjected.prototype.doEnable = function(_arg) {
    var element, isSSL, scriptURI, url, useFallback, _ref;
    useFallback = _arg.useFallback, scriptURI = _arg.scriptURI, this.host = _arg.host, this.port = _arg.port;
    if (((_ref = this.document.documentElement) != null ? _ref.contentEditable : void 0) === 'true') {
      return;
    }
    isSSL = this.window.location.protocol === "https:";
    if (useFallback) {
      if (isSSL) {
        url = "" + scriptURI + "?ext=" + this.extName + "&extver=" + ExtVersion + "&host=" + this.host + "&port=" + this.port;
      } else {
        url = "" + scriptURI + "?ext=" + this.extName + "&extver=" + ExtVersion + "&host=" + this.host + "&port=" + this.port;
      }
      if (this._verbose) {
        console.log("Loading LiveReload.js bundled with the browser extension...");
      }
    } else {
      if (isSSL) {
        url = "https://" + this.host + ":" + this.port + "/livereload.js?ext=" + this.extName + "&extver=" + ExtVersion;
      } else {
        url = "http://" + this.host + ":" + this.port + "/livereload.js?ext=" + this.extName + "&extver=" + ExtVersion;
      }
      if (this._verbose) {
        console.log("Loading LiveReload.js from " + (url.replace(/\?.*$/, '')) + "...");
      }
    }
    console.log("Injected LiveReload.js : URL = " + url);
    this.hook();
    element = this.document.createElement('script');
    element.src = url;
    return this.document.body.appendChild(element);
  };

  LiveReloadInjected.prototype.hook = function() {
    var _this = this;
    if (this._hooked) {
      return;
    }
    this._hooked = true;
    CustomEvents.bind(this.document, 'LiveReloadConnect', function() {
      return _this.send('status', {
        active: true
      });
    });
    return CustomEvents.bind(this.document, 'LiveReloadDisconnect', function() {
      return _this.send('status', {
        active: false
      });
    });
  };

  LiveReloadInjected.prototype.disable = function() {
    var _this = this;
    return this.doDisable(function() {
      return _this.send('status', {
        enabled: false,
        active: false
      });
    });
  };

  LiveReloadInjected.prototype.enable = function(options) {
    var _this = this;
    return this.doDisable(function() {
      _this.doEnable(options);
      return _this.send('status', {
        enabled: true
      });
    });
  };

  return LiveReloadInjected;

})();

var liveReloadInjected;

LiveReloadInjected.prototype.send = function(message, data) {
  return chrome.runtime.sendMessage([message, data]);
};

liveReloadInjected = new LiveReloadInjected(document, window, 'Chrome');

chrome.runtime.onMessage.addListener(function(_arg, sender, sendResponse) {
  var data, eventName;
  eventName = _arg[0], data = _arg[1];
  switch (eventName) {
    case 'alert':
      return alert(data);
    case 'enable':
      return liveReloadInjected.enable(data);
    case 'disable':
      return liveReloadInjected.disable();
  }
});