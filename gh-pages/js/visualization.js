// Visualization logic for color requests
import { elements } from './elements.js';
import { highlightMapCountry } from './map.js';
import { getColorValue, colorArrToSteppedGradient } from './colors.js';

const MAX_COLORS_DISPLAY = 100;
const MAX_COLOR_ITEMS = 100;
const API_BASE_URL = 'https://api.color.pizza/v1/';

export function addColorsToVisualization(data) {
  const { paletteTitle, colors } = data;
  let url = data.request.url;
  if (url && !url.startsWith('http')) {
    if (!url.includes('/v1/') && !url.startsWith('/v1/')) {
      url = url.startsWith('/') ? url.substring(1) : url;
      url = API_BASE_URL + url;
    } else {
      url = url.startsWith('/') ? url : '/' + url;
      url = API_BASE_URL.split('/v1/')[0] + url;
    }
  }
  url = url.replace(/%2C/g, ",");
  let countryCode = null;
  if (
    data.request.hasOwnProperty("clientLocation") &&
    data.request.clientLocation.hasOwnProperty("country")
  ) {
    countryCode = data.request.clientLocation.country.toUpperCase();
  }
  if (!document.getElementById("color-visualization")) {
    const visualizationContainer = document.createElement("div");
    visualizationContainer.id = "color-visualization";
    visualizationContainer.classList.add("color-visualization");
    elements.requestsContainer.parentNode.insertBefore(
      visualizationContainer,
      elements.requestsContainer
    );
  }
  const visualizationContainer = document.getElementById("color-visualization");
  const colorItem = document.createElement("aside");
  colorItem.classList.add("color-item");
  const max = Math.min(MAX_COLORS_DISPLAY, colors.length);
  colorItem.style.setProperty("--max", max);
  const colorValues = [];
  for (let i = 0; i < max; i++) {
    colorValues.push(getColorValue(colors[i]));
  }
  colorItem.style.setProperty("--g", colorArrToSteppedGradient(colorValues));
  colorItem.style.setProperty("--c", colors[0].bestContrast);
  if (paletteTitle) {
    const titleElement = document.createElement("h4");
    titleElement.classList.add("color-title");
    titleElement.textContent = paletteTitle;
    colorItem.appendChild(titleElement);
  }
  if (url) {
    const urlElement = document.createElement("a");
    urlElement.classList.add("color-url");
    urlElement.href = url;
    urlElement.target = "_blank";
    urlElement.textContent = url;
    colorItem.appendChild(urlElement);
  }
  if (countryCode) {
    const countryElement = document.createElement("span");
    countryElement.classList.add("color-country");
    countryElement.innerText = countryCode;
    colorItem.appendChild(countryElement);
    highlightMapCountry(countryCode, colors);
  }
  visualizationContainer.insertBefore(
    colorItem,
    visualizationContainer.firstChild
  );
  while (visualizationContainer.children.length > MAX_COLOR_ITEMS) {
    visualizationContainer.removeChild(visualizationContainer.lastChild);
  }
}
