// Main entry point for the app
import { elements } from './elements.js';
import { getRandomHexColor, renderColors } from './colors.js';
import { fetchLists, populateListDropdown } from './api.js';
import {
  initializeUrlInteractiveElements,
  updateApiUrlPreview,
  fetchColorNames,
} from './url.js';
import { setupCountryMaps, initializePixelatedMap } from './map.js';
import {
  initializePhysics,
  physics,
  setupMotionPreferenceListener,
  togglePhysics,
  updateToggleButton,
} from './physics.js';
import { initializeSocket, setPageVisibility } from './socket.js';
import { initColorPicker } from './picker.js';
import { generateFavicon } from './favicon.js';

elements.splitText.forEach(element => {
  const text = element.textContent;
  element.setAttribute('aria-label', text);
  const words = text.split(' ');
  const $warp = document.createElement('span');
  $warp.classList.add('word-split');

  words.forEach(word => {
    const $word = document.createElement('span');
    $word.classList.add('word-split__word');
    const letters = word.split('');
    letters.forEach(letter => {
      const $letter = document.createElement('span');
      $letter.classList.add('letter-split__letter');

      $letter.dataset.collision = '.27 -.1';
      // check if letter is uppercase
      if (
        (letter === letter.toUpperCase() && letter !== letter.toLowerCase()) ||
        letter === 'l' ||
        letter === 'i' ||
        letter === 't'
      ) {
        $letter.classList.add('letter-split__letter--uppercase');
        $letter.dataset.collision = '.15 -.1';
      }
      $letter.textContent = letter;
      $word.appendChild($letter);
    });
    $warp.appendChild($word);
  });
  element.textContent = '';
  element.appendChild($warp);
});

// Shared state
let selectedColors = [];
const availableLists = [];
const isInitialized = { value: false };

function removeColor(hexColorToRemove) {
  selectedColors = selectedColors.filter(color => color !== hexColorToRemove);
  renderColors(
    selectedColors,
    () => updateApiUrlPreview(selectedColors, availableLists, isInitialized),
    removeColor
  );
  updateApiUrlPreview(selectedColors, availableLists, isInitialized);
}

/**
 * Abstract function to update the API example settings and scroll to the pseudo-terminal.
 * @param {string} action - The action to perform (addColor, changeColor, removeAllColors, removeColor, setList, setNoduplicates)
 * @param {object} payload - The payload for the action
 */
function updateApiExampleSetting(action, payload = {}) {
  switch (action) {
    case 'addColor': {
      const { hexColor } = payload;
      if (hexColor && !selectedColors.includes(hexColor)) {
        selectedColors.push(hexColor);
      }
      break;
    }
    case 'changeColor': {
      const { index, hexColor } = payload;
      if (typeof index === 'number' && hexColor && selectedColors[index]) {
        selectedColors[index] = hexColor;
      }
      break;
    }
    case 'removeAllColors': {
      selectedColors = [];
      break;
    }
    case 'removeColor': {
      const { index } = payload;
      if (typeof index === 'number' && selectedColors[index]) {
        selectedColors.splice(index, 1);
      }
      break;
    }
    case 'setList': {
      const { listKey } = payload;
      if (listKey && availableLists.includes(listKey)) {
        elements.listSelect.value = listKey;
        // Update the visible select in the pseudo-terminal
        const urlListSelect = document.getElementById('url-list-select');
        const urlListLabel = document.querySelector('.url-list-label');
        if (urlListSelect) {
          urlListSelect.value = listKey;
          // Also update the label if present
          if (urlListLabel) urlListLabel.textContent = listKey;
        }
      }
      break;
    }
    case 'setNoduplicates': {
      const { value } = payload;
      elements.noduplicatesCheckbox.checked = !!value;
      break;
    }
    default:
      break;
  }
  const pseudoTerminal = document.querySelector('.pseudo-terminal');
  if (pseudoTerminal && typeof pseudoTerminal.scrollIntoView === 'function') {
    pseudoTerminal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      switch (action) {
        case 'setList': {
          const { listKey } = payload;
          if (listKey && availableLists.includes(listKey)) {
            elements.listSelect.value = listKey;
            const urlListSelect = document.getElementById('url-list-select');
            const urlListLabel = document.querySelector('.url-list-label');
            if (urlListSelect) {
              urlListSelect.value = listKey;
              if (urlListLabel) urlListLabel.textContent = listKey;
            }
          }
          break;
        }
        case 'setNoduplicates': {
          const { value } = payload;
          elements.noduplicatesCheckbox.checked = !!value;
          break;
        }
      }
      renderColors(
        selectedColors,
        () =>
          updateApiUrlPreview(selectedColors, availableLists, isInitialized),
        removeColor
      );
      updateApiUrlPreview(selectedColors, availableLists, isInitialized);
    }, 1000);
    return;
  }
  // fallback: update immediately if no scroll
  renderColors(
    selectedColors,
    () => updateApiUrlPreview(selectedColors, availableLists, isInitialized),
    removeColor
  );
  updateApiUrlPreview(selectedColors, availableLists, isInitialized);
  // Scroll pseudo-terminal (API example) into view
  const pseudoTerminalFallback = document.querySelector('.pseudo-terminal');
  if (
    pseudoTerminalFallback &&
    typeof pseudoTerminalFallback.scrollIntoView === 'function'
  ) {
    pseudoTerminalFallback.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }
}

window.updateApiExampleSetting = updateApiExampleSetting;

// Setup country maps for highlighting
setupCountryMaps();

// Setup motion preference listener
setupMotionPreferenceListener();

// Initialize physics (Matter.js)
setTimeout(() => {
  initializePhysics();
}, 100);

// Setup physics toggle button
const physicsToggle = document.getElementById('physics-toggle');
if (physicsToggle) {
  physicsToggle.addEventListener('click', togglePhysics);
  // Initialize button state after a brief delay to ensure physics state is set
  setTimeout(() => {
    updateToggleButton();
  }, 200);
}

// Initialize pixelated map
initializePixelatedMap({ pixelSize: 10 });

// Initialize socket.io
initializeSocket();

// Color logic
selectedColors.push(getRandomHexColor());
renderColors(
  selectedColors,
  () => updateApiUrlPreview(selectedColors, availableLists, isInitialized),
  removeColor
);

fetchLists(lists => {
  populateListDropdown(
    lists,
    availableLists,
    () =>
      initializeUrlInteractiveElements(availableLists, () =>
        updateApiUrlPreview(selectedColors, availableLists, isInitialized)
      ),
    () => updateApiUrlPreview(selectedColors, availableLists, isInitialized),
    isInitialized,
    selectedColors,
    () => fetchColorNames(elements.apiUrlPreview.textContent)
  );
});

// Event listeners for hidden controls
elements.listSelect.addEventListener('change', event => {
  updateApiUrlPreview(selectedColors, availableLists, isInitialized);
});
elements.noduplicatesCheckbox.addEventListener('change', event => {
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
  'click',
  event => {
    elements.doc.classList.toggle('color-visualization-open');
  },
  {
    capture: true,
  }
);
elements.doc.addEventListener(
  'click',
  event => {
    if (elements.doc.classList.contains('color-visualization-open')) {
      const isClickInside = elements.liveView.contains(event.target);
      if (!isClickInside) {
        elements.doc.classList.remove('color-visualization-open');
      }
    }
  },
  {
    capture: true,
  }
);

let isPageOnTop = true;
const topThreshold = 10;

function handleScroll() {
  const scrollTop =
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop;
  if (scrollTop > topThreshold && isPageOnTop) {
    isPageOnTop = false;
    elements.doc.classList.add('scrolling');
  } else if (scrollTop <= topThreshold && !isPageOnTop) {
    isPageOnTop = true;
    elements.doc.classList.remove('scrolling');
  }
}

window.addEventListener('scroll', handleScroll);

handleScroll();

generateFavicon(`#${getRandomHexColor()}`);

// initColorPicker();
