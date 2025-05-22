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
    populateListOverview(data.listDescriptions || {});
  } catch (error) {
    console.error('Error fetching color lists:', error);
    elements.listSelect.innerHTML = '<option value="">Error loading lists</option>';
  }
}

const listEntryTpl = document.createElement("template");
listEntryTpl.innerHTML = `
  <li class="color-name-lists__item">
    <div class="color-name-lists__header">
      <h4 class="color-name-lists__title"></h4>
      <sup class="color-name-lists__count" title="color count"></sup>
    </div>
    <p class="color-name-lists__description"></p>
    <div class="color-name-lists__footer">
      <div>
        <strong>License</strong>
        <span class="color-name-lists__license"></span>
      </div>
      <div class="color-name-lists__key-container">
        <strong>Key</strong>
        <code class="color-name-lists__key"></code>
      </div>
    </div>
  </li>
`;

export function populateListOverview(listsData) {
  /*
  {
    "title": "Basic",
    "description": "A set of basic colors. Red, Green, Blue...",
    "source": "https://github.com/colorjs/color-namer/tree/master/lib/colors",
    "key": "basic",
    "license": "MIT",
    "colorCount": 21,
    "url": "/v1/?list=basic"
  }
  */
  elements.listOverview.innerHTML = "";

  Object.keys(listsData).reverse().forEach(item => {
    const listItem = listsData[item];
    const listEntry = listEntryTpl.content.firstElementChild.cloneNode(true);
    const title = listEntry.querySelector(".color-name-lists__title");
    const description = listEntry.querySelector(".color-name-lists__description");
    const count = listEntry.querySelector(".color-name-lists__count");
    const key = listEntry.querySelector(".color-name-lists__key");
    const keyContainer = listEntry.querySelector(".color-name-lists__key-container");
    const license = listEntry.querySelector(".color-name-lists__license");
    //const source = listEntry.querySelector(".color-name-lists__source");

    title.textContent = listItem.title;
    description.textContent = listItem.description;
    count.textContent = listItem.colorCount;
    key.textContent = listItem.key;
    license.textContent = listItem.license;
    //source.href = listItem.source;

    // Add click event to key to update API example and scroll
    keyContainer.style.cursor = "pointer";
    keyContainer.title = "Click to use this list in the API example";
    keyContainer.addEventListener("click", () => {
      if (typeof window.updateApiExampleSetting === "function") {
        window.updateApiExampleSetting("setList", { listKey: listItem.key });
      }
    });

    elements.listOverview.appendChild(listEntry);
  });
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
