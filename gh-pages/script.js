const listSelect = document.getElementById('list-select');
const noduplicatesCheckbox = document.getElementById('noduplicates-checkbox');
const apiUrlPreview = document.getElementById('api-url-preview');
const apiResponse = document.getElementById('api-response');

// URL Builder elements
const urlColors = document.getElementById('url-colors');
const urlListContainer = document.getElementById('url-list-container');
const urlNoDuplicatesContainer = document.getElementById('url-noduplicates-container');

// Live requests elements
const requestsContainer = document.getElementById('requests-container');

// --- Constants and State ---
const API_BASE_URL = 'https://api.color.pizza/v1/';
const SOCKET_URL = 'https://api.color.pizza';
let selectedColors = [];
let availableLists = [];
let isInitialized = false;
let fetchTimeout = null;
const FETCH_DEBOUNCE_MS = 300;
let socket = null;
const MAX_COLORS_DISPLAY = 100;
const MAX_COLOR_ITEMS = 100;

// --- Logo Constants and Elements ---
let maxLogoPoints = 20;
const logoColors = document.querySelector('[data-log]');
let logoTimer;

// --- Matter.js Physics Engine Setup ---
let Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Events = Matter.Events,
    Body = Matter.Body;
let engine, render, runner;
let physics = {
    objects: [],
    maxObjects: 1000,
    initialized: false,
    bounds: {
        width: 0,
        height: 0
    },
    resizeThrottle: null,
    scrollThrottle: null,
    observer: null
};

/**
 * Initializes the Matter.js physics engine for the color objects animation
 */
function initializePhysics() {
    if (physics.initialized) {
        cleanupPhysics();
    }
    
    engine = Engine.create({
        gravity: { x: 0, y: 0.5 }
    });
    
    physics.bounds = {
        width: window.innerWidth,
        height: window.innerHeight
    };
    
    render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: physics.bounds.width,
            height: physics.bounds.height,
            wireframes: false,
            background: 'transparent',
            pixelRatio: window.devicePixelRatio
        }
    });
    
    render.canvas.style.position = 'fixed';
    render.canvas.style.top = '0';
    render.canvas.style.left = '0';
    render.canvas.style.width = '100%';
    render.canvas.style.height = '100%';
    render.canvas.style.zIndex = '-1';
    render.canvas.style.pointerEvents = 'none';
    
    const platformWidth = physics.bounds.width * 0.8;
    const platformHeight = 10;
    const platformY = physics.bounds.height - platformHeight / 2;
    
    const platform = Bodies.rectangle(
        physics.bounds.width / 2,
        platformY,
        platformWidth,
        platformHeight,
        { isStatic: true, render: { fillStyle: '#ffffff', opacity: 0.5 } }
    );
    
    Composite.add(engine.world, platform);
    
    // Create bodies for headings
    createHeadingBodies();
    
    Events.on(engine, 'afterUpdate', () => {
        const objectsToRemove = [];
        const buffer = 500;
        
        physics.objects.forEach(obj => {
            if (obj.position.y > physics.bounds.height + buffer) {
                objectsToRemove.push(obj);
            }
        });
        
        if (objectsToRemove.length > 0) {
            objectsToRemove.forEach(obj => {
                Composite.remove(engine.world, obj);
                physics.objects = physics.objects.filter(o => o.id !== obj.id);
            });
        }
    });
    
    window.removeEventListener('resize', handleWindowResize);
    window.addEventListener('resize', handleWindowResize);
    
    // Add scroll event listener
    window.removeEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);
    
    // Add a mutation observer to detect when new headings are added
    if (physics.observer) {
        physics.observer.disconnect();
    }
    physics.observer = new MutationObserver(mutations => {
        createHeadingBodies();
    });
    physics.observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
    
    runner = Runner.create();
    Render.run(render);
    Runner.run(runner, engine);
    
    physics.initialized = true;
}

/**
 * Cleans up the physics engine resources
 */
function cleanupPhysics() {
    if (!physics.initialized) return;
    
    if (runner) {
        Runner.stop(runner);
    }
    
    if (render) {
        Render.stop(render);
        if (render.canvas && render.canvas.parentNode) {
            render.canvas.parentNode.removeChild(render.canvas);
        }
    }
    
    window.removeEventListener('scroll', handleScroll);
    
    if (physics.observer) {
        physics.observer.disconnect();
        physics.observer = null;
    }
    
    physics.objects = [];
    physics.initialized = false;
}

/**
 * Handle window resize with throttling
 */
function handleWindowResize() {
    if (physics.resizeThrottle) {
        clearTimeout(physics.resizeThrottle);
    }
    
    physics.resizeThrottle = setTimeout(() => {
        initializePhysics();
    }, 300);
}

/**
 * Resizes the physics canvas when the window size changes
 */
function resizePhysicsCanvas() {
    if (!physics.initialized) return;
    
    physics.bounds = {
        width: window.innerWidth,
        height: window.innerHeight
    };
    
    render.options.width = physics.bounds.width;
    render.options.height = physics.bounds.height;
    render.canvas.width = physics.bounds.width;
    render.canvas.height = physics.bounds.height;
    
    const bodies = Composite.allBodies(engine.world);
    
    const platform = bodies.find(body => body.isStatic && !body.isHeading);
    if (platform) {
        const platformWidth = physics.bounds.width * 0.7;
        const platformHeight = 50;
        const platformY = physics.bounds.height - platformHeight / 2;
        
        Composite.remove(engine.world, platform);
        
        const newPlatform = Bodies.rectangle(
            physics.bounds.width / 2,
            platformY,
            platformWidth,
            platformHeight,
            { isStatic: true, render: { fillStyle: '#ffffff', opacity: 1 } }
        );
        
        Composite.add(engine.world, newPlatform);
    }
    
    // Update heading physics bodies
    updateHeadingBodies();
}

/**
 * Creates physics bodies for heading elements (h1, h2, h3)
 */
function createHeadingBodies() {
    if (!physics.initialized) return;
    
    // Clear existing heading bodies first
    const bodies = Composite.allBodies(engine.world);
    const headingBodies = bodies.filter(body => body.isHeading);
    
    headingBodies.forEach(body => {
        Composite.remove(engine.world, body);
    });
    
    // Create bodies for all heading elements
    const headings = document.querySelectorAll('h1, h2, h3, p');
    
    headings.forEach(heading => {
        const rect = heading.getBoundingClientRect();
        
        // Only create bodies for visible headings
        if (rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0 && rect.height > 0) {
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2 + rect.height * 0.25;
            const width = rect.width;
            const height = rect.height * .75;
            
            // Create a physics body for the heading
            const body = Bodies.rectangle(
                x, y, width, height,
                {
                    isStatic: true,
                    isHeading: true,
                    headingElement: heading,
                    headingType: heading.tagName.toLowerCase(),
                    friction: 0.2,
                    render: {
                        fillStyle: 'rgba(0, 0, 0, 0)',  // Subtle visualization
                        strokeStyle: 'rgba(0, 0, 0, 0.1)',
                        lineWidth: 0
                    }
                }
            );
            
            Composite.add(engine.world, body);
        }
    });
}

/**
 * Updates the position of heading physics bodies based on scroll position
 */
function updateHeadingBodies() {
    if (!physics.initialized) return;
    
    const bodies = Composite.allBodies(engine.world);
    const headingBodies = bodies.filter(body => body.isHeading);
    
    headingBodies.forEach(body => {
        if (body.headingElement) {
            const rect = body.headingElement.getBoundingClientRect();
            
            // Update body position
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            
            // Check if heading is still visible
            if (rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0 && rect.height > 0) {
                Body.setPosition(body, { x, y });
                body.render.opacity = 1;
            } else {
                // Make it invisible and ineffective when out of viewport
                body.render.opacity = 0;
                Body.setPosition(body, { x, y: -1000 });
            }
        }
    });
}

/**
 * Handle scroll events to update heading bodies
 */
function handleScroll() {
    if (physics.scrollThrottle) {
        cancelAnimationFrame(physics.scrollThrottle);
    }
    
    physics.scrollThrottle = requestAnimationFrame(() => {
        updateHeadingBodies();
    });
}

/**
 * Creates a shape with the given color and adds it to the physics world
 * @param {string} hexColor - Hex color code with or without the # prefix
 */
function createColorObject(hexColor) {
    if (!physics.initialized) return;
    
    const color = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
    
    const size = Math.random() * 20 + 10;
    const x = Math.random() * physics.bounds.width; 
    const y = -size * 2; 
    const isSquare = Math.random() > 0.5;
    
    let object;
    
    if (isSquare) {
        object = Bodies.rectangle(x, y, size * 2, size * 2, {
            restitution: 0.4,
            friction: 0.05,
            frictionAir: 0.005,
            angle: Math.random() * Math.PI * 2,
            render: {
                fillStyle: color,
                strokeStyle: '#000000',
                lineWidth: 0
            }
        });
    } else {
        object = Bodies.circle(x, y, size, {
            restitution: 0.3,
            friction: 0.05,
            frictionAir: 0.005,
            render: {
                fillStyle: color,
                strokeStyle: '#000000',
                lineWidth: 0
            }
        });
    }
    
    physics.objects.push(object);
    Composite.add(engine.world, object);
}

/**
 * Creates objects for all colors in a color palette
 * @param {Object} data - Color data with colors array
 */
function createColorObjectsFromData(data) {
    if (!physics.initialized) return;
    
    const { colors } = data;
    if (!colors || !colors.length) return;
    
    const maxToCreate = Math.min(colors.length, 50); 
    for (let i = 0; i < maxToCreate; i++) {
        const colorHex = colors[i].hasOwnProperty('requestedHex') ? 
            colors[i].requestedHex : colors[i].hex;
        
        createColorObject(colorHex);
    }
}

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
    setTimeout(() => logoTimer = false, 500);
    
    const {colors} = data;
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
        populateListDropdown(data.availableColorNameLists || []);
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
    listSelect.innerHTML = '';
    availableLists = lists.sort();
    
    availableLists.forEach(listName => {
        const option = document.createElement('option');
        option.value = listName;
        option.textContent = listName;
        if (listName === 'default') {
            option.selected = true;
        }
        listSelect.appendChild(option);
    });
    
    if (!listSelect.querySelector('[value="default"]') && listSelect.options.length > 0) {
          listSelect.options[0].selected = true;
    }
    
    initializeUrlInteractiveElements();
    
    updateApiUrlPreview();
    isInitialized = true;
    
    if (selectedColors.length > 0) {
        fetchColorNames();
    }
}

/**
 * Sets up the interactive elements in the URL builder
 */
function initializeUrlInteractiveElements() {
    const urlListSelect = document.createElement('select');
    urlListSelect.classList.add('url-list-select');
    urlListSelect.id = 'url-list-select';

    const urlListLabel = document.createElement("span");
    urlListLabel.classList.add("url-list-label");
    
    availableLists.forEach(listName => {
        const option = document.createElement('option');
        option.value = listName;
        option.textContent = listName;
        urlListSelect.appendChild(option);
    });
    
    urlListSelect.value = listSelect.value;
    
    urlListSelect.addEventListener('change', (event) => {
        listSelect.value = event.target.value;
        urlListLabel.textContent = event.target.value;
        updateApiUrlPreview();
    });

    urlListLabel.textContent = urlListSelect.value || 'default';
    
    urlListContainer.innerHTML = '';
    
    urlListContainer.appendChild(urlListSelect);
    urlListContainer.appendChild(urlListLabel);
    
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
    
    urlCheckbox.addEventListener('change', (event) => {
        noduplicatesCheckbox.checked = event.target.checked;
        urlCheckboxLabel.textContent = event.target.checked ? 'true' : 'false';
        updateApiUrlPreview();
    });
    
    checkboxContainer.appendChild(urlCheckbox);
    checkboxContainer.appendChild(urlCheckboxLabel);
    
    urlNoDuplicatesContainer.innerHTML = '';
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
    urlColors.innerHTML = '';
    
    if (selectedColors.length === 0) {
        const placeholder = document.createElement('span');
        placeholder.classList.add('url-placeholder');
        placeholder.textContent = 'Add Colors';
        urlColors.appendChild(placeholder);
    } else {
        selectedColors.forEach((hexColor, index) => {
            const colorContainer = document.createElement('span');
            colorContainer.classList.add('url-color-chip');

            const label = document.createElement('label');
            label.classList.add('url-color-label');
            
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
            
            const colorText = document.createElement('span');
            colorText.classList.add('url-color-text');
            colorText.textContent = hexColor;
            
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
            
            if (index < selectedColors.length - 1) {
                const comma = document.createElement('span');
                comma.textContent = ',';
                urlColors.appendChild(comma);
            }
        });
    }
    
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
    let urlString = API_BASE_URL;
    let params = [];

    if (selectedColors.length > 0) {
        params.push(`values=${selectedColors.join(",")}`);
    }

    const selectedList = listSelect.value;
    
    if (document.getElementById("url-list-select")) {
        document.getElementById("url-list-select").value = selectedList;
    }

    if (selectedList && selectedList !== "default") {
        params.push(`list=${selectedList}`);
    }

    if (document.getElementById("url-noduplicates-checkbox")) {
        document.getElementById("url-noduplicates-checkbox").checked =
        noduplicatesCheckbox.checked;
    }

    if (noduplicatesCheckbox.checked) {
        params.push("noduplicates=true");
    }

    if (params.length > 0) {
        urlString += `?${params.join("&")}`;
    }

    apiUrlPreview.textContent = urlString;

    clearTimeout(fetchTimeout);
    
    if (isInitialized) {
        fetchTimeout = setTimeout(fetchColorNames, FETCH_DEBOUNCE_MS);
    }
}

/**
 * Fetches color names from the API using the constructed URL and displays the response.
 */
async function fetchColorNames() {
  const apiUrl = apiUrlPreview.textContent;
  
  if (!apiUrl || !apiUrl.startsWith(API_BASE_URL)) {
    return;
  }

  const jsonViewer = document.getElementById("json-viewer");
  const jsonViewerHeight = jsonViewer.getBoundingClientRect().height;
  jsonViewer.style.height = `${jsonViewerHeight}px`;

  apiResponse.textContent = "Fetching...";
  document.getElementById("json-viewer").innerHTML = "";

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    jsonViewer.style.height = "auto";
    
    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    apiResponse.style.display = "none";

    new JsonViewer({
      value: data,
      theme: "dark",
      expanded: false,
      enableClipboard: false,
      indentWidth: 2,
      collapseStringsAfterLength: 20,
    }).render("#json-viewer");
    
    if (data && data.colors && data.colors.length > 0) {
      createColorObjectsFromData(data);
    }
  } catch (error) {
    console.error("Error fetching color names:", error);
    apiResponse.textContent = `Error: ${error.message}`;
    apiResponse.style.display = "block";
    document.getElementById("json-viewer").innerHTML = "";
  }
}

// --- Socket.io Functions ---

/**
 * Initializes the Socket.io connection.
 */
function initializeSocket() {
    try {
        socket = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnectionAttempts: 5
        });

        socket.on('connect', () => {
            console.log('Connected to Socket.io server');
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from Socket.io server');
        });

        socket.on('colors', (msg) => {
            addColorsToVisualization(msg);
            updateLogoColors(msg);
            createColorObjectsFromData(msg);
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    } catch (error) {
        console.error('Error initializing socket:', error);
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
    
    if (!document.getElementById('color-visualization')) {
        const visualizationContainer = document.createElement('div');
        visualizationContainer.id = 'color-visualization';
        visualizationContainer.classList.add('color-visualization');
        requestsContainer.parentNode.insertBefore(visualizationContainer, requestsContainer);
    }
    
    const visualizationContainer = document.getElementById('color-visualization');
    
    const colorItem = document.createElement('div');
    colorItem.classList.add('color-item');
    
    const max = Math.min(MAX_COLORS_DISPLAY, colors.length);
    colorItem.style.setProperty('--max', max);
    
    const colorValues = [];
    for (let i = 0; i < max; i++) {
        const color = colors[i].hasOwnProperty('requestedHex') ? colors[i].requestedHex : colors[i].hex;
        colorValues.push(color);
    }
    
    colorItem.style.setProperty('--g', colorArrToSteppedGradient(colorValues));
    colorItem.style.setProperty("--c", colors[0].bestContrast);

    if (paletteTitle) {
        const titleElement = document.createElement('div');
        titleElement.classList.add('color-title');
        titleElement.textContent = paletteTitle;
        colorItem.appendChild(titleElement);
    }
    
    visualizationContainer.insertBefore(colorItem, visualizationContainer.firstChild);
    
    while (visualizationContainer.children.length > MAX_COLOR_ITEMS) {
        visualizationContainer.removeChild(visualizationContainer.lastChild);
    }
}

listSelect.addEventListener('change', (event) => {
    if (document.getElementById('url-list-select')) {
        document.getElementById('url-list-select').value = event.target.value;
    }
    updateApiUrlPreview();
});

noduplicatesCheckbox.addEventListener('change', (event) => {
    if (document.getElementById('url-noduplicates-checkbox')) {
        document.getElementById('url-noduplicates-checkbox').checked = event.target.checked;
    }
    updateApiUrlPreview();
});

initializeLogoPoints();
initializePhysics();

selectedColors.push(getRandomHexColor());
fetchLists();
renderColors();

initializeSocket();
