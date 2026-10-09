import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

/** Every test starts with an empty browser store, so a persisted cart cannot leak between them. */
afterEach(() => {
  window.localStorage.clear();
});
