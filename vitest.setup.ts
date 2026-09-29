// Polyfill IndexedDB in jsdom, das keine native Implementierung mitbringt.
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
