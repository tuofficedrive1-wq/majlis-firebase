/* shared/nav.js  —  Step-by-step BACK system
 *
 * Load as a normal script:  <script src="shared/nav.js"></script>   (nested folder: ../shared/nav.js)
 *
 * 1) Page ke andar tabs / sub-views (jin me page reload nahi hota):
 *      Nav.register('overview', () => showOverview());
 *      Nav.register('history',  () => showHistory());
 *      Nav.setDefault('overview');
 *      Nav.init();                     // page load par ek baar
 *      Nav.show('history');            // tab click par (history me ek step add hota hai)
 *    Ab browser/phone ka Back button: history -> overview -> pichla page. Step-by-step.
 *
 * 2) Back button (UI wala):   <button data-back="index.html">Wapas</button>
 *      -> pehle page ke andar ke steps, phir pichla page, aur kuch na ho to fallback.
 *
 * 3) Login/redirect ke liye hamesha Nav.redirect(url) (history me login page nahi chhodta).
 */
(function (w) {
  var views = {}, current = null, defaultView = null, depth = 0;

  function hashName() { return (location.hash || '').replace(/^#/, '') || null; }
  function render(name, params) { if (views[name]) { current = name; views[name](params); } }

  var Nav = {
    register: function (name, fn) { views[name] = fn; },
    setDefault: function (name) { defaultView = name; },

    show: function (name, opts) {
      opts = opts || {};
      if (!views[name] || name === current) return;
      var st = { view: name };
      if (current === null || opts.replace) { history.replaceState(st, '', '#' + name); }
      else { history.pushState(st, '', '#' + name); depth++; }
      render(name, opts.params);
    },

    init: function () {
      w.addEventListener('popstate', function (e) {
        var n = (e.state && e.state.view) || hashName() || defaultView;
        if (n && views[n]) { if (depth > 0) depth--; render(n); }
      });
      var start = hashName();
      if (!start || !views[start]) start = defaultView;
      if (start) { current = null; Nav.show(start, { replace: true }); }
    },

    // Naye page par jana (history me entry banegi -> Back se wapas aa sakte hain)
    go: function (url) { location.href = url; },

    // Login/role-redirect: history me purana page nahi rakhta (back loop nahi banta)
    redirect: function (url) { location.replace(url); },

    back: function (fallback) {
      if (depth > 0) { history.back(); return; }                 // page ke andar ka step
      var sameSite = false;
      try { sameSite = document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
      var fromLogin = /(^|\/)index\.html?$|\/$/.test(document.referrer.split('?')[0].split('#')[0]);
      if (sameSite && history.length > 1 && !fromLogin) { history.back(); return; }   // pichla page
      location.replace(fallback || 'index.html');                // aakhri safety net
    }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-back]');
    if (!el) return;
    e.preventDefault();
    if (el.dataset.confirm && !w.confirm(el.dataset.confirm)) return;
    Nav.back(el.getAttribute('data-back'));
  });

  w.Nav = Nav;
})(window);
