// URL interactive elements and color name fetching logic
import { elements } from './elements.js';
import { API_BASE_URL } from './api.js';

export function initializeUrlInteractiveElements(availableLists, updateApiUrlPreview) {
  const urlListSelect = document.createElement('select');
  urlListSelect.classList.add('url-list-select');
  urlListSelect.id = 'url-list-select';
  const urlListLabel = document.createElement('span');
  urlListLabel.classList.add('url-list-label');
  availableLists.forEach(listName => {
    const option = document.createElement('option');
    option.value = listName;
    option.textContent = listName;
    urlListSelect.appendChild(option);
  });
  urlListSelect.value = elements.listSelect.value;
  urlListLabel.textContent = urlListSelect.value || 'default';
  urlListSelect.addEventListener('change', (event) => {
    elements.listSelect.value = event.target.value;
    urlListLabel.textContent = event.target.value;
    updateApiUrlPreview();
  });
  elements.urlListContainer.innerHTML = '';
  elements.urlListContainer.appendChild(urlListSelect);
  elements.urlListContainer.appendChild(urlListLabel);
  const checkboxContainer = document.createElement('label');
  checkboxContainer.classList.add('url-checkbox-container');
  const urlCheckbox = document.createElement('input');
  urlCheckbox.type = 'checkbox';
  urlCheckbox.id = 'url-noduplicates-checkbox';
  urlCheckbox.classList.add('url-checkbox');
  urlCheckbox.checked = elements.noduplicatesCheckbox.checked;
  const urlCheckboxLabel = document.createElement('span');
  urlCheckboxLabel.classList.add('url-checkbox-label');
  urlCheckboxLabel.textContent = 'false';
  urlCheckbox.addEventListener('change', (event) => {
    elements.noduplicatesCheckbox.checked = event.target.checked;
    urlCheckboxLabel.textContent = event.target.checked ? 'true' : 'false';
    updateApiUrlPreview();
  });
  checkboxContainer.appendChild(urlCheckbox);
  checkboxContainer.appendChild(urlCheckboxLabel);
  elements.urlNoDuplicatesContainer.innerHTML = '';
  elements.urlNoDuplicatesContainer.appendChild(checkboxContainer);
}

export function updateApiUrlPreview(selectedColors, availableLists, isInitialized) {
  let urlString = API_BASE_URL;
  let params = [];
  if (selectedColors.length > 0) {
    params.push(`values=${selectedColors.join(",")}`);
  }
  const selectedList = elements.listSelect.value;
  if (selectedList && selectedList !== 'default') {
    params.push(`list=${selectedList}`);
  }
  if (elements.noduplicatesCheckbox.checked) {
    params.push('noduplicates=true');
  }
  if (params.length > 0) {
    urlString += `?${params.join("&")}`;
  }
  elements.apiUrlPreview.textContent = urlString;
  if (isInitialized.value) {
    fetchColorNames(urlString);
  }
}

let timeoutId = null;

export async function fetchColorNames(apiUrl) {
  if (!apiUrl || !apiUrl.startsWith(API_BASE_URL)) return;
  const jsonViewer = elements.jsonViewer;
  const jsonViewerHeight = jsonViewer.getBoundingClientRect().height;
  jsonViewer.style.height = `${jsonViewerHeight}px`;
  elements.apiResponse.textContent = "Fetching...";
  jsonViewer.innerHTML = "";

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      jsonViewer.style.height = "auto";
    }, 200); // Allow for the JSON viewer to to load before resetting height
    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    elements.apiResponse.style.display = "none";
    // Use @textea/json-viewer for pretty rendering
    new window.JsonViewer({
      value: data,
      theme: "dark",
      expanded: false,
      enableClipboard: false,
      indentWidth: 2,
      collapseStringsAfterLength: 20,
    }).render(jsonViewer);
  } catch (error) {
    console.error("Error fetching color names:", error);
    elements.apiResponse.textContent = `Error: ${error.message}`;
    elements.apiResponse.style.display = "block";
    jsonViewer.innerHTML = "";
  }
}
