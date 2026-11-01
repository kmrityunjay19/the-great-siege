/**
 * siege-hud.js — heads-up display controller for The Great Siege
 *
 * Manages `window.siegeHUD`, which the main polling loop calls to show or
 * hide the HTML HUD overlay while the game is running.
 *
 * `siegeHUD.visible(bool)` is called every 250 ms from the interval in
 * index.html with the result of `Module.ccall("web_is_playing")`.
 */
(function () {
  "use strict";

  /** @type {HTMLElement|null} Root HUD container (created lazily). */
  var _hudRoot = null;
  var _isVisible = false;

  function ensureRoot() {
    if (_hudRoot) return _hudRoot;
    _hudRoot = document.createElement("div");
    _hudRoot.id = "siege-hud-root";
    _hudRoot.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:6",
      "pointer-events:none",
      "display:none"
    ].join(";");
    document.body.appendChild(_hudRoot);
    return _hudRoot;
  }

  var siegeHUD = {
    /**
     * Show or hide the HUD overlay.
     * Called by the main polling interval with the current "is playing" state.
     * @param {boolean} show
     */
    visible: function (show) {
      if (!!show === _isVisible) return; // no change
      _isVisible = !!show;
      var root = ensureRoot();
      root.style.display = _isVisible ? "block" : "none";
    },

    /** Whether the HUD is currently visible. */
    get isVisible() {
      return _isVisible;
    }
  };

  window.siegeHUD = siegeHUD;
})();
