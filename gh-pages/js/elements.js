export const elements = {
  doc: document.documentElement,
  listSelect: document.getElementById("list-select"),
  noduplicatesCheckbox: document.getElementById("noduplicates-checkbox"),
  apiUrlPreview: document.getElementById("api-url-preview"),
  apiResponse: document.getElementById("api-response"),
  liveView: document.querySelector(".live-requests"),
  urlColors: document.getElementById("url-colors"),
  urlListContainer: document.getElementById("url-list-container"),
  urlNoDuplicatesContainer: document.getElementById(
    "url-noduplicates-container"
  ),
  requestsContainer: document.getElementById("requests-container"),
  jsonViewer: document.getElementById("json-viewer"),
  svgCountryPaths: document.querySelectorAll("[data-cc]"),
  mapContainer: document.querySelector(".map"),
  splitText: document.querySelectorAll("[data-split]"),
  physicsCollisions: document.querySelectorAll(
    "[data-collision]"
  ),
  listOverview: document.querySelector(".color-name-lists"),
};
