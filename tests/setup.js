import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

// jsdom lacks these browser APIs used by React Flow / Recharts / motion
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || RO
globalThis.IntersectionObserver =
  globalThis.IntersectionObserver ||
  class {
    constructor(cb) {
      this.cb = cb
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
const hasWindow = typeof window !== 'undefined'
if (hasWindow && !window.matchMedia) {
  window.matchMedia = (q) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false } })
}
if (hasWindow && !window.DOMMatrixReadOnly) {
  window.DOMMatrixReadOnly = class {
    constructor() {
      this.m22 = 1
    }
  }
}
if (hasWindow) window.scrollTo = () => {}
// jsdom has no canvas; the hero wave grid simply skips drawing
if (hasWindow) window.HTMLCanvasElement.prototype.getContext = () => null
