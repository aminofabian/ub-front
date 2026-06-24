(function () {
  function at(n) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  }
  if (!Array.prototype.at) {
    Object.defineProperty(Array.prototype, "at", {
      value: at,
      writable: true,
      configurable: true,
    });
  }
  if (!String.prototype.at) {
    Object.defineProperty(String.prototype, "at", {
      value: at,
      writable: true,
      configurable: true,
    });
  }
  if (!Object.hasOwn) {
    Object.defineProperty(Object, "hasOwn", {
      value: function (o, p) {
        return Object.prototype.hasOwnProperty.call(o, p);
      },
      writable: true,
      configurable: true,
    });
  }
  if (!String.prototype.replaceAll) {
    Object.defineProperty(String.prototype, "replaceAll", {
      value: function (s, r) {
        if (Object.prototype.toString.call(s) === "[object RegExp]") {
          return this.replace(s, r);
        }
        return this.split(s).join(r);
      },
      writable: true,
      configurable: true,
    });
  }
  if (!Array.prototype.findLast) {
    Object.defineProperty(Array.prototype, "findLast", {
      value: function (cb, t) {
        for (var i = this.length - 1; i >= 0; i--) {
          if (cb.call(t, this[i], i, this)) return this[i];
        }
        return undefined;
      },
      writable: true,
      configurable: true,
    });
  }
  if (!Array.prototype.findLastIndex) {
    Object.defineProperty(Array.prototype, "findLastIndex", {
      value: function (cb, t) {
        for (var i = this.length - 1; i >= 0; i--) {
          if (cb.call(t, this[i], i, this)) return i;
        }
        return -1;
      },
      writable: true,
      configurable: true,
    });
  }
  if (typeof Promise !== "undefined" && !Promise.any) {
    Promise.any = function (ps) {
      return new Promise(function (res, rej) {
        var arr = Array.prototype.slice.call(ps);
        var n = arr.length;
        var errs = [];
        var c = 0;
        if (!n) {
          rej(new Error("All promises were rejected"));
          return;
        }
        arr.forEach(function (p, i) {
          Promise.resolve(p).then(res, function (e) {
            errs[i] = e;
            c++;
            if (c === n) rej(new Error("All promises were rejected"));
          });
        });
      });
    };
  }
  if (typeof structuredClone === "undefined") {
    window.structuredClone = function (v) {
      return v == null ? v : JSON.parse(JSON.stringify(v));
    };
  }
  try {
    if (
      window.crypto &&
      !window.crypto.randomUUID &&
      window.crypto.getRandomValues
    ) {
      window.crypto.randomUUID = function () {
        var b = window.crypto.getRandomValues(new Uint8Array(16));
        b[6] = (b[6] & 15) | 64;
        b[8] = (b[8] & 63) | 128;
        var h = [];
        for (var i = 0; i < 16; i++) {
          h.push((b[i] + 256).toString(16).slice(1));
        }
        return (
          h[0] +
          h[1] +
          h[2] +
          h[3] +
          "-" +
          h[4] +
          h[5] +
          "-" +
          h[6] +
          h[7] +
          "-" +
          h[8] +
          h[9] +
          "-" +
          h[10] +
          h[11] +
          h[12] +
          h[13] +
          h[14] +
          h[15]
        );
      };
    }
  } catch (e) {}
})();
