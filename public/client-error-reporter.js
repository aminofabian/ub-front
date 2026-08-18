(function () {
  var KEY = "ub.lastError";

  function fmt(m, s, l, c) {
    return (
      String(m || "Error") +
      (s ? " @ " + String(s).split("/").pop() : "") +
      (l ? " " + l + ":" + (c || 0) : "")
    );
  }

  /** Shoppers should never see a red debug banner on a live store. */
  function isProductionHost() {
    var h = location.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1" || h === "::1") {
      return false;
    }
    try {
      if (localStorage.getItem("ub.debugErrors") === "1") {
        return false;
      }
    } catch (e) {}
    return true;
  }

  /** React often recovers from these; surfacing them panics shoppers for nothing. */
  function isIgnorableProductionError(text) {
    return (
      /Minified React error #(418|423|425)/.test(text) ||
      /Hydration failed/i.test(text) ||
      /Text content does not match/i.test(text) ||
      /did not match\. Server:/i.test(text)
    );
  }

  function remember(text) {
    try {
      sessionStorage.setItem(KEY, text + " | " + navigator.userAgent);
    } catch (e) {}
  }

  function paintBanner(text) {
    if (document.getElementById("ub-err")) return;
    var b = document.body;
    if (!b) return;

    var d = document.createElement("div");
    d.id = "ub-err";
    d.setAttribute(
      "style",
      "position:fixed;left:0;right:0;top:0;z-index:2147483647;background:#7f1d1d;color:#fff;font:13px/1.4 -apple-system,system-ui,sans-serif;padding:10px 12px;box-shadow:0 2px 8px rgba(0,0,0,.3);word-break:break-word;",
    );
    d.innerHTML =
      "<strong>App error (please screenshot):</strong><br>" +
      text.replace(/</g, "&lt;") +
      '<br><button id="ub-err-x" style="margin-top:6px;background:#fff;color:#7f1d1d;border:0;border-radius:6px;padding:4px 10px;font-weight:600;">Dismiss</button>';
    b.appendChild(d);
    var x = document.getElementById("ub-err-x");
    if (x) {
      x.onclick = function () {
        d.parentNode && d.parentNode.removeChild(d);
      };
    }
  }

  function report(text) {
    remember(text);

    if (isProductionHost()) {
      if (isIgnorableProductionError(text)) {
        return;
      }
      if (typeof console !== "undefined" && console.error) {
        console.error("[client-error]", text);
      }
      return;
    }

    function show() {
      paintBanner(text);
    }
    if (document.body) {
      show();
    } else {
      document.addEventListener("DOMContentLoaded", show);
    }
  }

  window.addEventListener(
    "error",
    function (ev) {
      if (ev && ev.message) {
        report(fmt(ev.message, ev.filename, ev.lineno, ev.colno));
      }
    },
    true,
  );

  window.addEventListener("unhandledrejection", function (ev) {
    var r = ev && ev.reason;
    var m = r && r.message ? r.message : r ? String(r) : "unhandledrejection";
    report("Promise: " + m);
  });
})();
