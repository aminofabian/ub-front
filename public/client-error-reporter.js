(function () {
  var KEY = "ub.lastError";
  function fmt(m, s, l, c) {
    return (
      String(m || "Error") +
      (s ? " @ " + String(s).split("/").pop() : "") +
      (l ? " " + l + ":" + (c || 0) : "")
    );
  }
  function show(text) {
    try {
      sessionStorage.setItem(KEY, text + " | " + navigator.userAgent);
    } catch (e) {}
    function paint() {
      if (document.getElementById("ub-err")) return;
      var b = document.body;
      if (!b) {
        return;
      }
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
    if (document.body) {
      paint();
    } else {
      document.addEventListener("DOMContentLoaded", paint);
    }
  }
  window.addEventListener(
    "error",
    function (ev) {
      if (ev && ev.message) {
        show(fmt(ev.message, ev.filename, ev.lineno, ev.colno));
      }
    },
    true,
  );
  window.addEventListener("unhandledrejection", function (ev) {
    var r = ev && ev.reason;
    var m = r && r.message ? r.message : r ? String(r) : "unhandledrejection";
    show("Promise: " + m);
  });
})();
