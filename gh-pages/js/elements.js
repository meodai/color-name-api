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
  physicsCollisions: document.querySelectorAll(
    "h1:not([data-physics='ignore']), h2:not([data-physics='ignore']), h3:not([data-physics='ignore']), p:not([data-physics='ignore']), .pseudo-terminal"
  ),
};
