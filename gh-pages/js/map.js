// Map and pixelation logic
import { elements } from './elements.js';
import { addPixelsToPhysics } from './physics.js';

export const countriesMap = new Map();
export const countryPathData = new Map();

export function setupCountryMaps() {
  elements.svgCountryPaths.forEach((path) => {
    const countryCode = path.getAttribute("data-cc");
    countriesMap.set(countryCode, path);
    countryPathData.set(countryCode, {
      path: path,
      bbox: path.getBBox ? path.getBBox() : null
    });
  });
}

export function createPixelatedMap(pixelSize = 10) {
  const originalMap = elements.mapContainer;
  if (!originalMap) return;
  const pixelatedMap = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  pixelatedMap.setAttribute('viewBox', originalMap.getAttribute('viewBox'));
  pixelatedMap.classList.add('pixelated-map');
  const viewBox = originalMap.getAttribute('viewBox').split(' ');
  const mapWidth = parseFloat(viewBox[2]);
  const mapHeight = parseFloat(viewBox[3]);
  const cols = Math.ceil(mapWidth / pixelSize);
  const rows = Math.ceil(mapHeight / pixelSize);
  const grid = Array(rows).fill().map(() => Array(cols).fill().map(() => new Set()));
  countryPathData.forEach((data, countryCode) => {
    const path = data.path;
    const bbox = data.bbox;
    if (!bbox) return;
    const startCol = Math.max(0, Math.floor(bbox.x / pixelSize));
    const endCol = Math.min(cols - 1, Math.ceil((bbox.x + bbox.width) / pixelSize));
    const startRow = Math.max(0, Math.floor(bbox.y / pixelSize));
    const endRow = Math.min(rows - 1, Math.ceil((bbox.y + bbox.height) / pixelSize));
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const x = col * pixelSize + pixelSize / 2;
        const y = row * pixelSize + pixelSize / 2;
        if (isPointInPath(path, x, y)) {
          grid[row][col].add(countryCode);
        }
      }
    }
  });
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const countryCodes = Array.from(grid[row][col]);
      if (countryCodes.length > 0) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', col * pixelSize);
        rect.setAttribute('y', row * pixelSize);
        rect.setAttribute('width', pixelSize);
        rect.setAttribute('height', pixelSize);
        rect.setAttribute('data-countries', countryCodes.join(','));
        rect.setAttribute('data-cc', countryCodes[0]);
        rect.classList.add('pixel-country');
        if (countryCodes.length > 1) {
          rect.classList.add('pixel-border');
        }
        const originalPath = countriesMap.get(countryCodes[0]);
        rect.style.fill = (originalPath && originalPath.style.fill) ? originalPath.style.fill : 'var(--c-fill)';
        fragment.appendChild(rect);
      }
    }
  }
  pixelatedMap.appendChild(fragment);
  originalMap.parentNode.insertBefore(pixelatedMap, originalMap.nextSibling);
  return pixelatedMap;
}

export function highlightMapCountry(countryCode, colors) {
  // Always target the pixel map, not the original SVG paths
  const pixelMap = document.querySelector('.pixelated-map');
  if (!pixelMap) return;
  const pixels = pixelMap.querySelectorAll(`.pixel-country[data-cc="${countryCode}"]`);
  if (!pixels.length) return;
  // Pick a color for each pixel
  if (Array.isArray(colors) && colors.length > 1) {
    pixels.forEach(pixel => {
      const pixelRandomColor = colors[Math.floor(Math.random() * colors.length)];
      pixel.style.fill = pixelRandomColor.hex;
    });
  } else {
    const colorHex = colors[0].hex;
    pixels.forEach(pixel => {
      pixel.style.fill = colorHex;
    });
  }
}
export function initializePixelatedMap(config) {
  const pixelatedMap = createPixelatedMap(config.pixelSize);
  if (pixelatedMap) {
    const originalMap = elements.mapContainer;
    // Show pixel map by default, hide original
    originalMap.style.display = 'none';
    pixelatedMap.style.display = '';
    addPixelsToPhysics(pixelatedMap);
    // Add toggle button as in script.js
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Toggle Original Map';
    toggleButton.classList.add('map-toggle-button');
    toggleButton.addEventListener('click', () => {
      if (originalMap.style.display === 'none') {
        originalMap.style.display = '';
        pixelatedMap.style.display = 'none';
        toggleButton.textContent = 'Toggle Pixel Map';
      } else {
        originalMap.style.display = 'none';
        pixelatedMap.style.display = '';
        toggleButton.textContent = 'Toggle Original Map';
      }
    });
    elements.mapContainer.parentNode.insertBefore(toggleButton, elements.mapContainer);
  }
}
export function isPointInPath(path, x, y) {
  if (path.isPointInFill) {
    const svgPoint = path.ownerSVGElement.createSVGPoint();
    if (!window.config || !window.config.pixelDetection || !window.config.pixelDetection.permissive) {
      svgPoint.x = x;
      svgPoint.y = y;
      return path.isPointInFill(svgPoint);
    }
    svgPoint.x = x;
    svgPoint.y = y;
    if (path.isPointInFill(svgPoint)) {
      return true;
    }
    const offset = 2;
    const samplingPoints = (window.config && window.config.pixelDetection && window.config.pixelDetection.borderPixelSampling) || 3;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        if (Math.abs(i) + Math.abs(j) > samplingPoints) continue;
        svgPoint.x = x + (i * offset);
        svgPoint.y = y + (j * offset);
        if (path.isPointInFill(svgPoint)) {
          return true;
        }
      }
    }
    return false;
  }
  return false;
}
