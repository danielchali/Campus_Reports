import "@testing-library/jest-dom";

if (!window.performance.mark) {
  window.performance.mark = jest.fn();
}
if (!window.performance.measure) {
  window.performance.measure = jest.fn();
}
if (!window.performance.getEntriesByName) {
  window.performance.getEntriesByName = jest.fn(() => [{ duration: 0 }]);
}
if (!window.performance.clearMarks) {
  window.performance.clearMarks = jest.fn();
}
if (!window.performance.clearMeasures) {
  window.performance.clearMeasures = jest.fn();
}
