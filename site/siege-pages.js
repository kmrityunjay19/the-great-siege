/**
 * siege-pages.js — in-game overlay / UI page controller for The Great Siege
 *
 * Manages the `window.siegeUI` object that the main script polls to decide
 * whether the HTML overlay is active (and therefore whether the main menu
 * should remain hidden even when the engine reports it is on a menu screen).
 *
 * When `siegeUI.active` is true the menu overlay is considered to be in
 * control; the siege-menu section stays hidden and the canvas stays on top.
 */
(function () {
  "use strict";

  var _active = false;

  var siegeUI = {
    /**
     * Whether an HTML overlay page is currently shown.
     * Read by the main polling interval in index.html.
     * @type {boolean}
     */
    get active() {
      return _active;
    },

    /**
     * Show a named overlay page.
     * Extend this function to add real HTML pages as the game grows.
     * @param {string} name
     */
    show: function (name) {
      _active = true;
      // Future: render HTML overlay identified by `name`
    },

    /**
     * Hide the active overlay page and return control to the canvas.
     */
    hide: function () {
      _active = false;
    }
  };

  window.siegeUI = siegeUI;
})();
