/*
  Google Apps Script API Bridge for website hosting.
  This keeps the existing portal JavaScript calls unchanged:
  google.script.run.withSuccessHandler(...).backendFunction(...)
*/
(() => {
  if (window.google && window.google.script && window.google.script.run) return;

  // Same-origin API endpoint. The Vercel function forwards requests to Apps Script
  // server-side, avoiding the browser's cross-origin (CORS) restriction.
  function endpoint() {
    return '/api/glide-api';
  }

  function makeRunner(successHandler, failureHandler) {
    const runner = {
      withSuccessHandler(fn) {
        return makeRunner(fn, failureHandler);
      },
      withFailureHandler(fn) {
        return makeRunner(successHandler, fn);
      },
      _call(action, args) {
        let url;
        try {
          url = endpoint();
        } catch (err) {
          if (failureHandler) failureHandler(err);
          else console.error(err);
          return;
        }

        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, args })
        })
          .then(async res => {
            const text = await res.text();
            if (res.status === 404) {
              throw new Error('Dashboard API was not found on Vercel. Put api/glide-api.mjs in the Vercel project root and redeploy from GitHub.');
            }
            let payload;
            try { payload = JSON.parse(text); }
            catch (e) { throw new Error('Invalid Apps Script response: ' + text.slice(0, 250)); }
            if (!res.ok) {
              throw new Error((payload && payload.message) || 'Dashboard API returned HTTP ' + res.status + '.');
            }
            if (!payload || payload.status !== 'success') {
              throw new Error((payload && payload.message) || 'Apps Script request failed.');
            }
            return payload.data;
          })
          .then(data => {
            if (successHandler) successHandler(data);
          })
          .catch(err => {
            if (failureHandler) failureHandler(err);
            else console.error(err);
          });
      }
    };

    return new Proxy(runner, {
      get(target, prop) {
        if (prop in target) {
          const value = target[prop];
          return typeof value === 'function' ? value.bind(target) : value;
        }
        return (...args) => target._call(String(prop), args);
      }
    });
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = makeRunner(null, null);
})();
