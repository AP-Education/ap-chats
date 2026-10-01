// __DEV__ only diagnostic: the WebView runs in its own JS context, invisible to
// Metro/the RN console — this forwards web/'s console output and uncaught errors
// back through the existing WebToNativeMessage bridge so they show up where we can
// actually see them. Runs before web/'s own scripts so it catches load-time errors too.
export const DEBUG_CONSOLE_SCRIPT = `
  (function () {
    var post = function (payload) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
    };
    var stringifyArg = function (arg) {
      try { return typeof arg === 'string' ? arg : JSON.stringify(arg); }
      catch (e) { return String(arg); }
    };
    ['log', 'warn', 'error'].forEach(function (level) {
      var original = console[level];
      console[level] = function () {
        post({ type: 'debug/console', level: level, args: Array.prototype.map.call(arguments, stringifyArg) });
        original.apply(console, arguments);
      };
    });
    window.addEventListener('error', function (event) {
      post({ type: 'debug/error', message: (event.error && event.error.stack) || event.message });
    });
    window.addEventListener('unhandledrejection', function (event) {
      post({ type: 'debug/error', message: 'Unhandled rejection: ' + stringifyArg(event.reason) });
    });
  })();
  true;
`;
