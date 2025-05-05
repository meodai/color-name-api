// Main entry point for the app
import { elements } from './elements.js';
import { getRandomHexColor, renderColors } from './colors.js';
import { fetchLists, populateListDropdown } from './api.js';
import { initializeUrlInteractiveElements, updateApiUrlPreview, fetchColorNames } from './url.js';
import { setupCountryMaps, initializePixelatedMap } from './map.js';
import { initializePhysics, physics } from './physics.js';
import { initializeSocket, setPageVisibility } from './socket.js';

// Shared state
let selectedColors = [];
let availableLists = [];
let isInitialized = { value: false };

function removeColor(hexColorToRemove) {
  selectedColors = selectedColors.filter(color => color !== hexColorToRemove);
  renderColors(selectedColors, () => updateApiUrlPreview(selectedColors, availableLists, isInitialized), removeColor);
  updateApiUrlPreview(selectedColors, availableLists, isInitialized);
}

// Setup country maps for highlighting
setupCountryMaps();

// Initialize physics (Matter.js)
initializePhysics();

// Initialize pixelated map
initializePixelatedMap({ pixelSize: 10 });

// Initialize socket.io
initializeSocket();

// Color logic
selectedColors.push(getRandomHexColor());
renderColors(selectedColors, () => updateApiUrlPreview(selectedColors, availableLists, isInitialized), removeColor);

fetchLists((lists) => {
  populateListDropdown(
    lists,
    availableLists,
    () => initializeUrlInteractiveElements(availableLists, () => updateApiUrlPreview(selectedColors, availableLists, isInitialized)),
    () => updateApiUrlPreview(selectedColors, availableLists, isInitialized),
    isInitialized,
    selectedColors,
    () => fetchColorNames(elements.apiUrlPreview.textContent)
  );
});

// Event listeners for hidden controls
elements.listSelect.addEventListener('change', (event) => {
  updateApiUrlPreview(selectedColors, availableLists, isInitialized);
});
elements.noduplicatesCheckbox.addEventListener('change', (event) => {
  updateApiUrlPreview(selectedColors, availableLists, isInitialized);
});

document.addEventListener('visibilitychange', () => {
  const isVisible = document.visibilityState === 'visible';
  setPageVisibility(isVisible);
  if (isVisible) {
    if (!physics.initialized && physics.wasInitialized) {
      initializePhysics();
    } else if (physics.paused) {
      if (window.runner) {
        window.Runner.run(window.runner, window.engine);
      }
      physics.paused = false;
    }
  } else {
    if (physics.initialized) {
      physics.paused = true;
      if (window.runner) {
        window.Runner.stop(window.runner);
      }
    }
  }
});

elements.liveView.addEventListener(
  "click",
  (event) => {
    elements.doc.classList.toggle("color-visualization-open");
  },
  {
    capture: true,
  }
);

let isPageOnTop = true;
const topThreshold = 10;

function handleScroll() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  if (scrollTop > topThreshold && isPageOnTop) {
    isPageOnTop = false;
    elements.doc.classList.add("scrolling");
  } else if (scrollTop <= topThreshold && !isPageOnTop) {
    isPageOnTop = true;
    elements.doc.classList.remove("scrolling");
  }
}

window.addEventListener("scroll", handleScroll);