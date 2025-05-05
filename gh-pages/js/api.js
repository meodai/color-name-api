// API and list-fetching logic
import { elements } from './elements.js';

export const API_BASE_URL = 'https://api.color.pizza/v1/';

export async function fetchLists(populateListDropdown) {
  try {
    const response = await fetch(`${API_BASE_URL}lists/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    populateListDropdown(data.availableColorNameLists || []);
  } catch (error) {
    console.error('Error fetching color lists:', error);
    elements.listSelect.innerHTML = '<option value="">Error loading lists</option>';
  }
}

export function populateListDropdown(lists, availableLists, initializeUrlInteractiveElements, updateApiUrlPreview, isInitialized, selectedColors, fetchColorNames) {
  elements.listSelect.innerHTML = '';
  availableLists.length = 0;
  lists.sort().forEach(listName => availableLists.push(listName));
  availableLists.forEach(listName => {
    const option = document.createElement('option');
    option.value = listName;
    option.textContent = listName;
    if (listName === 'default') {
      option.selected = true;
    }
    elements.listSelect.appendChild(option);
  });
  if (!elements.listSelect.querySelector('[value="default"]') && elements.listSelect.options.length > 0) {
    elements.listSelect.options[0].selected = true;
  }
  initializeUrlInteractiveElements();
  updateApiUrlPreview();
  isInitialized.value = true;
  if (selectedColors.length > 0) {
    fetchColorNames();
  }
}
