"use strict";
(function () {
  (function () {
    try {
      if (window.localStorage) { return; }
    } catch (e) {}
    const { ChromeCom } = require("./chromecom.js");
    const BG = chrome.extension.getBackgroundPage();
    let newLocalStorage = BG && BG.localStorage, newSessionStorage = BG && BG.sessionStorage;
    if (!newLocalStorage) {
      const getItem = function (key) {
        return new Promise(resolve => {
          ChromeCom.request("getStorageItem", { persistent: this.persistent, key }, resolve);
        });
      }
      const setItem = function (key, value) {
        ChromeCom.request("setStorageItem", { persistent: this.persistent, key, value });
      }
      newLocalStorage = { getItem, setItem, persistent: true };
      newSessionStorage = { getItem, setItem, persistent: false };
    }
    try {
      override("localStorage", newLocalStorage);
      newSessionStorage && override("sessionStorage", newSessionStorage);
    } catch (e) {}
    function override(name, value) {
      Object.defineProperty(window, name, { get: () => value });
    }
  })();
  var VimiumCHandler = function(code) {
    if (code !== 2) {
      if (code === 3) {
        window.removeEventListener("vimiumMark", onMark, true);
        api = oldScroll = null;
      }
      return;
    }
    // @ts-ignore
    var api = window.VApi
    var oldScroll = api.$;
    if (api && typeof api.$ === "function") {
      api.$ = function(element, di, amount) {
        if (Math.abs(amount) < 0.1) { return oldScroll.apply(this, arguments); }
        const Presentation = ".pdfPresentationMode"
        const fullscreenElement = document.fullscreenElement
        const topEl = fullscreenElement || document.documentElement
        if ((element === topEl || fullscreenElement && !topEl.contains(element))) {
          element = fullscreenElement && topEl.matches(Presentation) ? topEl : topEl.querySelector(Presentation);
        } else {
          element = element.closest(Presentation);
        }
        if (element) {
          const oldTop = element.scrollTop, oldPage = PDFViewerApplication.page;
          element.dispatchEvent(new WheelEvent("wheel", {
            bubbles: !0, cancelable: !0, composed: !0,
            deltaY: amount
          }));
          return oldPage !== PDFViewerApplication.page || element.scrollTop !== oldTop;
        } else {
          return oldScroll.apply(this, arguments);
        }
      };
    }
    if (api && (api.u + "").lastIndexOf(".href") > 0) {
      api.u = function () {
        if (location.pathname.startsWith("/content/web/viewer.html")) {
          var file = new URLSearchParams(location.search).get("file");
          if (file) { return file }
        }
        return location.href.slice(location.origin.length + 1).split("#", 1)[0];
      };
    }
  };
  var onMark = function (event) {
    var a = event.relatedTarget, str = a && a.textContent, box = a && document.getElementById("viewerContainer");
    event.stopImmediatePropagation();
    if (!box) { return; }

    var app = PDFViewerApplication;
    var history = app.pdfHistory;

    if (!str) {
      const hash = history && history._position && history._position.hash;
      a.textContent = [box.scrollLeft, box.scrollTop, hash && "#" + hash.replace(/^#/, "") || null];
      return;
    }
    const mark = str.split(",");
    const x = ~~mark[0] - box.scrollLeft, y = ~~mark[1] - box.scrollTop
    const hash = (mark.slice(2).join(",") || "").replace(/^#/, "").split("#")[0];
    const dest = hash.includes("page=") ? new URLSearchParams(hash) : null;
    const page = dest && +dest.get("page") || -1;
    if (history && page >= 0) {
      app.pdfLinkService.setHash(hash);
    } else {
      if (x || y) {
        const zoom = dest ? dest.get("zoom") : "";
        zoom && app.pdfViewer && (app.pdfViewer.currentScaleValue = zoom);
        box.scrollTo(x, y);
      }
      page >= 0 && typeof app.page === "number" && setTimeout(function() {
        if (app.page !== page) {
          app.page = page;
        }
      }, 0)
    }
    if (x || y || page >= 0) {
      a.textContent = "";
      event.preventDefault();
    }
  }

  var IDOnEdge = "aibcglbfblnogfjhbcmmpobjhnomhcdo";
  var IDOnChrome = "hfjbmagddngcpeloejdejnfgbamkjaeg";
  var StorageKey = "targetExtensionInjector";
  var doInject = function (injectorURL) {
  if (injectorURL === "nul" || injectorURL === "/dev/null") { return; }
  var IsEdge = false, hasKnown = !!injectorURL;
  if (!injectorURL) {
    IsEdge = /\sEdg\//.test(navigator.userAgent);
    injectorURL = IsEdge ? IDOnEdge : IDOnChrome;
    injectorURL = "chrome-extension://" + injectorURL + "/lib/injector.js";
  }
  var script = document.createElement("script");
  script.src = injectorURL;
  script.async = true; script.defer = false;
  script.onload = function () {
    var injector = window.VimiumInjector;
    if (injector && location.pathname.indexOf("://") >= 0) {
      if (!hasKnown) {
        localStorage.setItem(StorageKey, this.src);
      }
      injector.cache ? VimiumCHandler(2, "") : injector.callback = VimiumCHandler;
      window.addEventListener("vimiumMark", onMark, true)
    }
    return !!injector
  };
  if (IsEdge) {
    script.onerror = function () {
      this.remove();
      var script2 = document.createElement("script");
      script2.src = "chrome-extension://" + IDOnChrome + "/lib/injector.js";
      script2.async = true;
      script2.defer = false;
      script2.onload = this.onload;
      document.head.appendChild(script2);
    }
  }
  document.head.appendChild(script);
  };
  var injectorPromise = localStorage.getItem(StorageKey);
  if (injectorPromise instanceof Promise) {
    injectorPromise.then(doInject);
  } else {
    doInject(injectorPromise);
  }
})()
