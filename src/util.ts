/**
 *
 * @param a
 * @param b
 */
const sortByCasadingViews = (a: any, b: any) => {
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

  return 0
}

export { sortByCasadingViews }
