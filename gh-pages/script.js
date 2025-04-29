const listSelect = document.getElementById('list-select');
const noduplicatesCheckbox = document.getElementById('noduplicates-checkbox');
const apiUrlPreview = document.getElementById('api-url-preview');
const apiResponse = document.getElementById('api-response');

// URL Builder elements
const urlColors = document.getElementById('url-colors');
const urlListContainer = document.getElementById('url-list-container');
const urlNoDuplicatesContainer = document.getElementById('url-noduplicates-container');

// Live requests elements
const liveToggle = document.getElementById('live-toggle');
const requestsContainer = document.getElementById('requests-container');
const socketStatus = document.getElementById('socket-status');

// --- Constants and State ---
const API_BASE_URL = 'https://api.color.pizza/v1/';
const SOCKET_URL = 'https://api.color.pizza'; // Use the same base URL for the socket connection
let selectedColors = []; // Stores hex codes without '#'
let availableLists = []; // Stores available color lists
let isInitialized = false; // Flag to prevent fetching on initial load
let fetchTimeout = null; // Debounce fetch calls
const FETCH_DEBOUNCE_MS = 300; // Debounce time in milliseconds
let socket = null; // Socket.io connection
let isSocketConnected = false; // Flag to track socket connection status
const MAX_DISPLAYED_REQUESTS = 50; // Maximum number of requests to display
const MAX_COLORS_DISPLAY = 100; // Maximum number of colors to display in the visualization
const MAX_COLOR_ITEMS = 100; // Maximum number of color items to keep in the DOM

// --- Logo Constants and Elements ---
let maxLogoPoints = 20;
const logoColors = document.querySelector('[data-log]');
let logoTimer;

// --- Functions ---

/**
 * Generates a random 6-digit hex color code.
 * @returns {string} A hex color string (without #).
 */
function getRandomHexColor() {
    return Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

/**
 * Initialize the color points for the interactive logo
 */
function initializeLogoPoints() {
    // Create the color points for the logo
    for (let i = 0; i < maxLogoPoints; i++) {
        const colorPoint = document.createElement('i');
        colorPoint.classList.add('color');
        colorPoint.classList.add('hidden');
        colorPoint.style.setProperty('--c', '#000');
        colorPoint.style.setProperty('--h', 0);
        colorPoint.style.setProperty('--s', 0);
        colorPoint.style.setProperty('--l', 0);
        colorPoint.style.setProperty('--i', i);
        
        logoColors.appendChild(colorPoint);
    }
}

/**
 * Update the logo with new colors
 * @param {Object} data - Color data with colors array
 */
function updateLogoColors(data) {
    if (logoTimer) return;
    logoTimer = true;
    setTimeout(() => logoTimer = false, 2000);
    
    const {colors} = data;
    const max = Math.min(maxLogoPoints, colors.length);
    const colorPoints = logoColors.querySelectorAll('.color');
    
    colorPoints.forEach((point, i) => {
        point.classList.remove('hidden');
        if (colors[i]) {
            const c = colors[i].hasOwnProperty('requestedHex') ? colors[i].requestedHex : colors[i].hex;
            try {
                const hsl = chroma(c).hsl();
                if (hsl && !isNaN(hsl[0])) {
                    const [h, s, l] = hsl;
                    point.style.setProperty('--c', c);
                    point.style.setProperty('--h', h || 0);
                    point.style.setProperty('--s', s || 0);
                    point.style.setProperty('--l', l || 0);
                }
            } catch (e) {
                console.error('Error processing color:', c, e);
                point.classList.add('hidden');
            }
        } else {
            point.classList.add('hidden');
        }
    });
}

/**
 * Fetches the available color name lists from the API and populates the dropdown.
 */
async function fetchLists() {
    try {
        const response = await fetch(`${API_BASE_URL}lists/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        populateListDropdown(data.availableColorNameLists || []); // Ensure it's an array
    } catch (error) {
        console.error('Error fetching color lists:', error);
        listSelect.innerHTML = '<option value="">Error loading lists</option>';
    }
}

/**
 * Populates the list selection dropdown.
 * @param {string[]} lists - An array of available list names.
 */
function populateListDropdown(lists) {
    listSelect.innerHTML = ''; // Clear loading/error message
    availableLists = lists.sort(); // Store sorted lists for URL dropdown
    
    availableLists.forEach(listName => {
        const option = document.createElement('option');
        option.value = listName;
        option.textContent = listName;
        // Select 'default' if it exists, otherwise the first item
        if (listName === 'default') {
            option.selected = true;
        }
        listSelect.appendChild(option);
    });
    // Select the first option if 'default' wasn't present and lists exist
    if (!listSelect.querySelector('[value="default"]') && listSelect.options.length > 0) {
          listSelect.options[0].selected = true;
    }
    
    // Initialize URL builder elements now that we have lists
    initializeUrlInteractiveElements();
    
    updateApiUrlPreview(); // Update URL preview after lists are loaded
    isInitialized = true; // Allow fetching after initial setup
    // Trigger initial fetch if there are colors
    if (selectedColors.length > 0) {
        fetchColorNames();
    }
}

/**
 * Sets up the interactive elements in the URL builder
 */
function initializeUrlInteractiveElements() {
    // Setup list dropdown in URL
    const urlListSelect = document.createElement('select');
    urlListSelect.classList.add('url-list-select');
    urlListSelect.id = 'url-list-select';


    const urlListLabel = document.createElement("span");
    urlListLabel.classList.add("url-list-label");
    
    // Add the same options as the main dropdown
    availableLists.forEach(listName => {
        const option = document.createElement('option');
        option.value = listName;
        option.textContent = listName;
        urlListSelect.appendChild(option);
    });
    
    // Sync with main list select
    urlListSelect.value = listSelect.value;
    
    // Add event listener
    urlListSelect.addEventListener('change', (event) => {
        // Update the main dropdown when URL dropdown changes
        listSelect.value = event.target.value;
        urlListLabel.textContent = event.target.value;
        updateApiUrlPreview();
    });

    urlListLabel.textContent = urlListSelect.value || 'default'; // Sync main dropdown with URL dropdown
    
    urlListContainer.innerHTML = ''; // Clear any previous content
    
    
    urlListContainer.appendChild(urlListSelect);
    urlListContainer.appendChild(urlListLabel);

    
    // Setup noduplicates checkbox in URL
    const checkboxContainer = document.createElement('label');
    checkboxContainer.classList.add('url-checkbox-container');
    
    const urlCheckbox = document.createElement('input');
    urlCheckbox.type = 'checkbox';
    urlCheckbox.id = 'url-noduplicates-checkbox';
    urlCheckbox.classList.add('url-checkbox');
    urlCheckbox.checked = noduplicatesCheckbox.checked;
    
    const urlCheckboxLabel = document.createElement('span');
    urlCheckboxLabel.classList.add('url-checkbox-label');
    urlCheckboxLabel.textContent = 'false';
    
    // Add event listener
    urlCheckbox.addEventListener('change', (event) => {
        // Update the main checkbox when URL checkbox changes
        noduplicatesCheckbox.checked = event.target.checked;
        urlCheckboxLabel.textContent = event.target.checked ? 'true' : 'false';
        updateApiUrlPreview();
    });
    
    checkboxContainer.appendChild(urlCheckbox);
    checkboxContainer.appendChild(urlCheckboxLabel);
    
    urlNoDuplicatesContainer.innerHTML = ''; // Clear any previous content
    urlNoDuplicatesContainer.appendChild(checkboxContainer);
}

/**
 * Removes a specific color from the selected list.
 * @param {string} hexColorToRemove - The hex color string (without #) to remove.
 */
function removeColor(hexColorToRemove) {
    selectedColors = selectedColors.filter(color => color !== hexColorToRemove);
    renderColors();
    updateApiUrlPreview();
}

/**
 * Renders the selected color chips in the UI.
 */
function renderColors() {
    // Clear existing color chips
    urlColors.innerHTML = '';
    
    // Add colors to the URL builder
    if (selectedColors.length === 0) {
        const placeholder = document.createElement('span');
        placeholder.classList.add('url-placeholder');
        placeholder.textContent = 'Add Colors';
        urlColors.appendChild(placeholder);
    } else {
        selectedColors.forEach((hexColor, index) => {
            // Create a container for each color in the URL
            const colorContainer = document.createElement('span');
            colorContainer.classList.add('url-color-chip');

            const label = document.createElement('label');
            label.classList.add('url-color-label');
            
            // Create color picker input
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.classList.add('url-color-input');
            colorInput.value = `#${hexColor}`;
            colorContainer.style.setProperty('--color', `#${hexColor}`);
            colorInput.addEventListener('change', (e) => {
                const newColor = e.target.value.slice(1).toLowerCase();
                selectedColors[index] = newColor;
                colorContainer.style.setProperty('--color', `#${newColor}`);
                renderColors();
                updateApiUrlPreview();
            });

            
            // Create text showing hex value
            const colorText = document.createElement('span');
            colorText.classList.add('url-color-text');
            colorText.textContent = hexColor;
            
            // Create remove button
            const removeBtn = document.createElement('button');
            removeBtn.classList.add('url-color-remove');
            removeBtn.innerHTML = '×';
            removeBtn.addEventListener('click', () => {
                removeColor(hexColor);
            });
            
            label.appendChild(colorInput);
            label.appendChild(colorText);
            colorContainer.appendChild(label);
            colorContainer.appendChild(removeBtn);
            urlColors.appendChild(colorContainer);
            
            // Add comma after each color except the last one
            if (index < selectedColors.length - 1) {
                const comma = document.createElement('span');
                comma.textContent = ',';
                urlColors.appendChild(comma);
            }
        });
    }
    
    // Add the "+" button to add a new color
    const addBtn = document.createElement('button');
    addBtn.classList.add('url-add-color');
    addBtn.textContent = '+';
    addBtn.title = 'Add a new color';
    addBtn.addEventListener('click', () => {
        const randomColor = getRandomHexColor();
        selectedColors.push(randomColor);
        renderColors();
        updateApiUrlPreview();
    });
    urlColors.appendChild(addBtn);
}

/**
 * Updates the API URL preview based on the current selections and triggers fetch.
 */
function updateApiUrlPreview() {
    // Build the URL
    let urlString = API_BASE_URL;
    let params = [];

    // Add values parameter if colors are selected
    if (selectedColors.length > 0) {
        params.push(`values=${selectedColors.join(',')}`);
    }

    const selectedList = listSelect.value;
    // Sync URL dropdown with main dropdown
    if (document.getElementById('url-list-select')) {
        document.getElementById('url-list-select').value = selectedList;
    }

    // Add list parameter if not default
    if (selectedList && selectedList !== 'default') {
        params.push(`list=${selectedList}`);
    }

    // Sync URL checkbox with main checkbox
    if (document.getElementById('url-noduplicates-checkbox')) {
        document.getElementById('url-noduplicates-checkbox').checked = noduplicatesCheckbox.checked;
    }

    // Add noduplicates parameter if checked
    if (noduplicatesCheckbox.checked) {
        params.push('noduplicates=true');
    }

    // Append parameters if any exist
    if (params.length > 0) {
        urlString += `?${params.join('&')}`;
    }

    // Update full URL display
    apiUrlPreview.textContent = urlString;

    // Debounce the fetch call
    clearTimeout(fetchTimeout);
    // Fetch even if no colors are selected, as long as initialized
    if (isInitialized) {
        fetchTimeout = setTimeout(fetchColorNames, FETCH_DEBOUNCE_MS);
    } 
}

/**
 * Fetches color names from the API using the constructed URL and displays the response.
 */
async function fetchColorNames() {
    const apiUrl = apiUrlPreview.textContent;
    // Basic check if URL is valid
    if (!apiUrl || !apiUrl.startsWith(API_BASE_URL)) {
        // Don't fetch if URL is invalid
        return;
    }

    // Update status message regardless of color count
    apiResponse.textContent = 'Fetching...';
    document.getElementById('json-viewer').innerHTML = ''; // Clear previous JSON viewer

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        // Check for API-level errors if the HTTP status was ok but the API returned an error structure
        if (!response.ok || data.error) {
              throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        // Hide the text-based response since we're using the viewer
        apiResponse.style.display = 'none';
        
        // Use JSON Viewer to display the data
        new JsonViewer({
            value: data,
            theme: 'dark', // or 'dark' depending on your preference
            expanded: true  // Start with all nodes expanded
        }).render('#json-viewer');
        
    } catch (error) {
        console.error('Error fetching color names:', error);
        apiResponse.textContent = `Error: ${error.message}`;
        apiResponse.style.display = 'block'; // Make sure error is visible
        document.getElementById('json-viewer').innerHTML = ''; // Clear the viewer on error
    }
}

// --- Socket.io Functions ---

/**
 * Updates the socket status display to show connection status.
 * @param {boolean} isConnected - Whether socket is connected.
 * @param {string} [errorMessage] - Optional error message to display.
 */
function showSocketStatus(isConnected, errorMessage) {
    const statusElement = document.getElementById('socket-status');
    
    // Update class and text based on connection status
    if (isConnected) {
        statusElement.classList.remove('disconnected');
        statusElement.classList.add('connected');
        statusElement.textContent = 'Socket: Connected';
    } else {
        statusElement.classList.remove('connected');
        statusElement.classList.add('disconnected');
        statusElement.textContent = errorMessage 
            ? `Socket: Disconnected (${errorMessage})` 
            : 'Socket: Disconnected';
    }
}

/**
 * Initializes the Socket.io connection.
 */
function initializeSocket() {
    try {
        // Connect to the socket server
        socket = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnectionAttempts: 5
        });

        // Socket connection event handlers
        socket.on('connect', () => {
            console.log('Connected to Socket.io server');
            isSocketConnected = true;
            showSocketStatus(true);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from Socket.io server');
            isSocketConnected = false;
            showSocketStatus(false);
        });

        // Listen for API request events
        socket.on('api_request', (data) => {
            if (liveToggle.checked) {
                addRequestToDisplay(data);
            }
        });

        // Listen for colors events (like in the CodePen)
        socket.on('colors', (msg) => {
            if (liveToggle.checked) {
                addColorsToVisualization(msg);
            }
            // Update the interactive logo with the received colors
            updateLogoColors(msg);
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            showSocketStatus(false, error.message);
        });
    } catch (error) {
        console.error('Error initializing socket:', error);
        showSocketStatus(false, 'Failed to initialize socket connection');
    }
}

/**
 * Converts an array of colors to a CSS stepped gradient string.
 * @param {string[]} colorsArr - Array of hex color strings.
 * @returns {string} CSS gradient string.
 */
function colorArrToSteppedGradient(colorsArr) {
    return colorsArr.map(
        (c, i) => `${c} ${i/colorsArr.length*100}% ${(i+1)/colorsArr.length*100}%`
    ).join();
}

/**
 * Creates a visual representation of color data received from the socket.
 * @param {Object} data - Color data with paletteTitle and colors array.
 */
function addColorsToVisualization(data) {
    const { paletteTitle, colors } = data;
    
    // Create container for color visualization if it doesn't exist
    if (!document.getElementById('color-visualization')) {
        const visualizationContainer = document.createElement('div');
        visualizationContainer.id = 'color-visualization';
        visualizationContainer.classList.add('color-visualization');
        requestsContainer.parentNode.insertBefore(visualizationContainer, requestsContainer);
    }
    
    const visualizationContainer = document.getElementById('color-visualization');
    
    // Create a new color item element
    const colorItem = document.createElement('div');
    colorItem.classList.add('color-item');
    
    // Process colors for display
    const max = Math.min(MAX_COLORS_DISPLAY, colors.length);
    colorItem.style.setProperty('--max', max);
    
    // Extract colors
    const colorValues = [];
    for (let i = 0; i < max; i++) {
        const color = colors[i].hasOwnProperty('requestedHex') ? colors[i].requestedHex : colors[i].hex;
        colorValues.push(color);
    }
    
    // Set gradient property
    colorItem.style.setProperty('--g', colorArrToSteppedGradient(colorValues));
    
    // Add title if available
    if (paletteTitle) {
        const titleElement = document.createElement('div');
        titleElement.classList.add('color-title');
        titleElement.textContent = paletteTitle;
        colorItem.appendChild(titleElement);
    }
    
    // Add to the container at the top
    visualizationContainer.insertBefore(colorItem, visualizationContainer.firstChild);
    
    // Remove oldest items if exceeding max
    while (visualizationContainer.children.length > MAX_COLOR_ITEMS) {
        visualizationContainer.removeChild(visualizationContainer.lastChild);
    }
}

// --- Event Listeners ---

// Update URL controls when main list selection changes
listSelect.addEventListener('change', (event) => {
    if (document.getElementById('url-list-select')) {
        document.getElementById('url-list-select').value = event.target.value;
    }
    updateApiUrlPreview();
});

// Update URL controls when main noduplicates checkbox changes
noduplicatesCheckbox.addEventListener('change', (event) => {
    if (document.getElementById('url-noduplicates-checkbox')) {
        document.getElementById('url-noduplicates-checkbox').checked = event.target.checked;
    }
    updateApiUrlPreview();
});

// Toggle live requests display
liveToggle.addEventListener('change', (event) => {
    if (event.target.checked) {
        document.querySelector('.live-requests').classList.remove('inactive');
    } else {
        document.querySelector('.live-requests').classList.add('inactive');
    }
});

// --- Initial Load ---
// Initialize logo color points
initializeLogoPoints();

selectedColors.push(getRandomHexColor()); // Add a random color by default
fetchLists(); // Fetch lists when the page loads
renderColors(); // Explicitly render colors immediately (will show placeholder initially)

// --- Initial Socket Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize existing functionality
    
    // Initialize socket connection
    initializeSocket();
});
