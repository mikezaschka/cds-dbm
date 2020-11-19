'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.sortByCasadingViews = void 0
/**
 *
 * @param a
 * @param b
 */
const sortByCasadingViews = (a, b) => {
  const [, tableA, entityA] = a.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || []
  const [, tableB, entityB] = b.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || []
  if (tableA && !tableB) {
    return -1
  }
  if (tableB && !tableA) {
    return 1
  }
  if (!tableB && !tableA) {
    if (a.includes(entityB)) {
      return 1
    }
    if (b.includes(entityA)) {
      return -1
    }
  }
  return -1
}
exports.sortByCasadingViews = sortByCasadingViews
//# sourceMappingURL=util.js.map
