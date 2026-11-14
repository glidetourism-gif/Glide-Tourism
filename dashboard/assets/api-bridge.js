/*
  Google Apps Script API Bridge for website hosting.
  This keeps the existing portal JavaScript calls unchanged:
  google.script.run.withSuccessHandler(...).backendFunction(...)
*/
(() => {
  if (window.google && window.google.script && window.google.script.run) return;

  function endpoint() {
    const url = window.APP_CONFIG && window.APP_CONFIG.webAppUrl;
    if (!url || url === 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
      throw new Error('Apps Script Web App URL missing. Update assets/config.js first.');
    }
    return url;
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
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action, args })
        })
          .then(async res => {
            const text = await res.text();
            let payload;
            try { payload = JSON.parse(text); }
            catch (e) { throw new Error('Invalid Apps Script response: ' + text.slice(0, 250)); }
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
