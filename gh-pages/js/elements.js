export const elements = {
  doc: document.documentElement,
  listSelect: document.getElementById('list-select'),
  noduplicatesCheckbox: document.getElementById('noduplicates-checkbox'),
  descriptionCheckbox: document.getElementById('description-checkbox'),
  apiUrlPreview: document.getElementById('api-url-preview'),
  apiResponse: document.getElementById('api-response'),
  liveView: document.querySelector('.live-requests'),
  urlColors: document.getElementById('url-colors'),
  urlListContainer: document.getElementById('url-list-container'),
  urlNoDuplicatesContainer: document.getElementById(
    'url-noduplicates-container'
  ),
  urlDescriptionContainer: document.getElementById('url-description-container'),
  requestsContainer: document.getElementById('requests-container'),
  jsonViewer: document.getElementById('json-viewer'),
  svgCountryPaths: document.querySelectorAll('[data-cc]'),
  mapContainer: document.querySelector('.map'),
  splitText: document.querySelectorAll('[data-split]'),
  physicsCollisions: document.querySelectorAll('[data-collision]'),
  listOverview: document.querySelector('.color-name-lists'),

  colorPicker: document.querySelector('[data-colorpicker]'),
  colorValue: document.querySelector('[data-colorvalue]'),
  colorPreview: document.querySelector('[data-colorpreview]'),

  favicon: document.querySelector('[data-favicon]'),
};
