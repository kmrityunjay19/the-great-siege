/**
 * siege-core.js — coordinate mapping helpers for The Great Siege
 *
 * Provides SiegeCore.point(), which maps a client-space (CSS pixel) pointer
 * position into the logical 800×600 game-canvas coordinate system.
 *
 * The canvas is always stretched to fill the viewport via CSS
 * (width:100vw; height:100vh), so we scale the hit point by the ratio of
 * the logical resolution (800×600) to the rendered canvas size.
 */
(function () {
  "use strict";

  /** Logical canvas dimensions used by the C/WASM engine. */
  var LOGICAL_W = 800;
  var LOGICAL_H = 600;

  /**
   * Convert a client-space (CSS pixel) position to logical canvas coords.
   *
   * @param {number} clientX  Pointer X in CSS pixels (e.g. from a MouseEvent)
   * @param {number} clientY  Pointer Y in CSS pixels
   * @param {DOMRect} rect    The bounding rect of the canvas element
   * @returns {{ lx: number, ly: number }}
   *   lx / ly — integer coordinates in the 800×600 logical space
   */
  function point(clientX, clientY, rect) {
    var relX = clientX - rect.left;
    var relY = clientY - rect.top;

    var scaleX = rect.width  > 0 ? LOGICAL_W / rect.width  : 1;
    var scaleY = rect.height > 0 ? LOGICAL_H / rect.height : 1;

    return {
      lx: Math.round(relX * scaleX),
      ly: Math.round(relY * scaleY)
    };
  }

  // Expose as a global so the inline script in index.html can use it.
  window.SiegeCore = {
    point: point,
    LOGICAL_W: LOGICAL_W,
    LOGICAL_H: LOGICAL_H
  };
})();
