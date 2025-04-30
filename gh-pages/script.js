
const elements = {
  listSelect: document.getElementById('list-select'),
  noduplicatesCheckbox: document.getElementById('noduplicates-checkbox'),
  apiUrlPreview: document.getElementById('api-url-preview'),
  apiResponse: document.getElementById('api-response'),
  urlColors: document.getElementById('url-colors'),
  urlListContainer: document.getElementById('url-list-container'),
  urlNoDuplicatesContainer: document.getElementById('url-noduplicates-container'),
  requestsContainer: document.getElementById('requests-container'),
  jsonViewer: document.getElementById('json-viewer'),
};
const API_BASE_URL = 'https://api.color.pizza/v1/';
const SOCKET_URL = 'https://api.color.pizza';
const FETCH_DEBOUNCE_MS = 300;
const MAX_COLORS_DISPLAY = 100;
const MAX_COLOR_ITEMS = 100;

let selectedColors = [];
let availableLists = [];
let isInitialized = false;
let fetchTimeout = null;
let socket = null;

const { Engine, Render, Runner, Bodies, Composite, Events, Body, Mouse, MouseConstraint, Common } = Matter;
let engine, render, runner, mouseConstraint;
let physics = {
  objects: [],
  maxObjects: 1000,
  initialized: false,
  bounds: { width: 0, height: 0 },
  resizeThrottle: null,
  scrollThrottle: null,
  scrollCheckCounter: 0,
  observer: null,
  mouseBody: null
};

function getRandomHexColor() {
  return Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

function getColorValue(colorObj) {
  return colorObj.hasOwnProperty('requestedHex') ? colorObj.requestedHex : colorObj.hex;
}

function colorArrToSteppedGradient(colorsArr) {
  return colorsArr.map((c, i) => 
    `${c} ${i/colorsArr.length*100}% ${(i+1)/colorsArr.length*100}%`
  ).join();
}

function updateElementIfExists(id, property, value) {
  const element = document.getElementById(id);
  if (element) {
    if (property === 'value') {
      element.value = value;
    } else if (property === 'checked') {
      element.checked = value;
    } else if (property === 'text') {
      element.textContent = value;
    }
  }
}

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
  
  physics.mouseBody = Bodies.circle(0, 0, 35, {
    isStatic: true,
    collisionFilter: {
      group: 1,
      category: 0x0002
    },
    render: {
      fillStyle: 'rgba(0, 0, 0, 0)',
      opacity: 0
    }
  });
  
  Composite.add(engine.world, physics.mouseBody);
  
  document.addEventListener('mousemove', handleMouseMove);
  
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
  
  window.removeEventListener('scroll', handleScroll);
  window.addEventListener('scroll', handleScroll);
  
  if (physics.observer) {
    physics.observer.disconnect();
  }
  physics.observer = new MutationObserver(() => createHeadingBodies());
  physics.observer.observe(document.body, { childList: true, subtree: true });
  
  runner = Runner.create();
  Render.run(render);
  Runner.run(runner, engine);
  
  physics.initialized = true;
}

function cleanupPhysics() {
  if (!physics.initialized) return;
  
  if (runner) Runner.stop(runner);
  
  if (render) {
    Render.stop(render);
    if (render.canvas && render.canvas.parentNode) {
      render.canvas.parentNode.removeChild(render.canvas);
    }
  }
  
  window.removeEventListener('scroll', handleScroll);
  document.removeEventListener('mousemove', handleMouseMove);
  
  if (physics.observer) {
    physics.observer.disconnect();
    physics.observer = null;
  }
  
  physics.objects = [];
  physics.mouseBody = null;
  physics.initialized = false;
}

function handleMouseMove(event) {
  if (!physics.initialized || !physics.mouseBody) return;
  
  const canvasBounds = render.canvas.getBoundingClientRect();
  const mouseX = event.clientX - canvasBounds.left;
  const mouseY = event.clientY - canvasBounds.top;
  
  Body.setPosition(physics.mouseBody, {
    x: mouseX,
    y: mouseY
  });
}

function handleWindowResize() {
  if (physics.resizeThrottle) clearTimeout(physics.resizeThrottle);
  physics.resizeThrottle = setTimeout(initializePhysics, 300);
}

function createHeadingBodies() {
  if (!physics.initialized) return;
  
  const bodies = Composite.allBodies(engine.world);
  const headingBodies = bodies.filter(body => body.isHeading);
  
  headingBodies.forEach(body => Composite.remove(engine.world, body));
  
  const headings = document.querySelectorAll("h1, h2, h3, p, .pseudo-terminal");
  
  headings.forEach(heading => {
    const rect = heading.getBoundingClientRect();
    
    if (rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0 && rect.height > 0) {
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      const body = Bodies.rectangle(
        x, y, rect.width, rect.height,
        {
          isStatic: true,
          isHeading: true,
          headingElement: heading,
          headingType: heading.tagName.toLowerCase(),
          friction: 0.2,
          render: {
            fillStyle: 'rgba(0, 0, 0, 0)', 
            strokeStyle: 'rgba(0, 0, 0, 0.1)',
            lineWidth: 0
          }
        }
      );
      
      Composite.add(engine.world, body);
    }
  });
}

function updateHeadingBodies() {
  if (!physics.initialized) return;
  
  const bodies = Composite.allBodies(engine.world);
  const headingBodies = bodies.filter(body => body.isHeading);
  const bodiesToRemove = [];
  
  headingBodies.forEach(body => {
    if (body.headingElement) {
      const rect = body.headingElement.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      if (rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0 && rect.height > 0) {
        Body.setPosition(body, { x, y });
        body.render.opacity = 1;
      } else {
        bodiesToRemove.push(body);
      }
    }
  });
  
  if (bodiesToRemove.length > 0) {
    bodiesToRemove.forEach(body => Composite.remove(engine.world, body));
  }
}

function handleScroll() {
  if (physics.scrollThrottle) cancelAnimationFrame(physics.scrollThrottle);
  
  physics.scrollThrottle = requestAnimationFrame(() => {
    updateHeadingBodies();
    
    physics.scrollCheckCounter = physics.scrollCheckCounter || 0;
    physics.scrollCheckCounter++;
    
    if (physics.scrollCheckCounter % 10 === 0) {
      createHeadingBodies();
    }
  });
}

function createColorObject(hexColor) {
  if (!physics.initialized) return;
  
  const color = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
  const size = Math.random() * 18 + 5;
  const x = Math.random() * physics.bounds.width; 
  const y = -size * 2; 
  const isSquare = Math.random() > 0.5;
  
  const commonProps = {
    restitution: isSquare ? 0.4 : 0.3,
    friction: 0.05,
    frictionAir: 0.005,
    render: {
      fillStyle: color,
      strokeStyle: '#000000',
      lineWidth: 0
    }
  };
  
  let object = isSquare 
    ? Bodies.rectangle(x, y, size * 2, size * 2, {
        ...commonProps,
        angle: Math.random() * Math.PI * 2
      })
    : Bodies.circle(x, y, size, commonProps);
  
  physics.objects.push(object);
  Composite.add(engine.world, object);
}

function createColorObjectsFromData(data) {
  if (!physics.initialized || !data.colors || !data.colors.length) return;
  
  const maxToCreate = Math.min(data.colors.length, 50);
  for (let i = 0; i < maxToCreate; i++) {
    createColorObject(getColorValue(data.colors[i]));
  }
}

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
    elements.listSelect.innerHTML = '<option value="">Error loading lists</option>';
  }
}

function populateListDropdown(lists) {
  elements.listSelect.innerHTML = '';
  availableLists = lists.sort();
  
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
  isInitialized = true;
  
  if (selectedColors.length > 0) {
    fetchColorNames();
  }
}

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

function removeColor(hexColorToRemove) {
  selectedColors = selectedColors.filter(color => color !== hexColorToRemove);
  renderColors();
  updateApiUrlPreview();
}

function renderColors() {
  elements.urlColors.innerHTML = '';
  
  if (selectedColors.length === 0) {
    const placeholder = document.createElement('span');
    placeholder.classList.add('url-placeholder');
    placeholder.textContent = 'Add Colors';
    elements.urlColors.appendChild(placeholder);
  } else {
    selectedColors.forEach((hexColor, index) => {
      const colorContainer = document.createElement('span');
      colorContainer.classList.add('url-color-chip');
      colorContainer.style.setProperty('--color', `#${hexColor}`);

      const label = document.createElement('label');
      label.classList.add('url-color-label');
      
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.classList.add('url-color-input');
      colorInput.value = `#${hexColor}`;
      
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
      removeBtn.addEventListener('click', () => removeColor(hexColor));
      
      label.appendChild(colorInput);
      label.appendChild(colorText);
      colorContainer.appendChild(label);
      colorContainer.appendChild(removeBtn);
      elements.urlColors.appendChild(colorContainer);
      
      if (index < selectedColors.length - 1) {
        const comma = document.createElement('span');
        comma.textContent = ',';
        elements.urlColors.appendChild(comma);
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
  elements.urlColors.appendChild(addBtn);
}

function updateApiUrlPreview() {
  let urlString = API_BASE_URL;
  let params = [];

  if (selectedColors.length > 0) {
    params.push(`values=${selectedColors.join(",")}`);
  }

  const selectedList = elements.listSelect.value;
  updateElementIfExists("url-list-select", "value", selectedList);

  if (selectedList && selectedList !== "default") {
    params.push(`list=${selectedList}`);
  }

  updateElementIfExists("url-noduplicates-checkbox", "checked", elements.noduplicatesCheckbox.checked);

  if (elements.noduplicatesCheckbox.checked) {
    params.push("noduplicates=true");
  }

  if (params.length > 0) {
    urlString += `?${params.join("&")}`;
  }

  elements.apiUrlPreview.textContent = urlString;

  clearTimeout(fetchTimeout);
  
  if (isInitialized) {
    fetchTimeout = setTimeout(fetchColorNames, FETCH_DEBOUNCE_MS);
  }
}

async function fetchColorNames() {
  const apiUrl = elements.apiUrlPreview.textContent;
  
  if (!apiUrl || !apiUrl.startsWith(API_BASE_URL)) return;

  const jsonViewer = elements.jsonViewer;
  const jsonViewerHeight = jsonViewer.getBoundingClientRect().height;
  jsonViewer.style.height = `${jsonViewerHeight}px`;

  elements.apiResponse.textContent = "Fetching...";
  jsonViewer.innerHTML = "";

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    jsonViewer.style.height = "auto";
    
    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    elements.apiResponse.style.display = "none";

    new JsonViewer({
      value: data,
      theme: "dark",
      expanded: false,
      enableClipboard: false,
      indentWidth: 2,
      collapseStringsAfterLength: 20,
    }).render("#json-viewer");
    
    if (data?.colors?.length > 0) {
      createColorObjectsFromData(data);
    }
  } catch (error) {
    console.error("Error fetching color names:", error);
    elements.apiResponse.textContent = `Error: ${error.message}`;
    elements.apiResponse.style.display = "block";
    jsonViewer.innerHTML = "";
  }
}

function initializeSocket() {
  try {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5
    });

    socket.on('connect', () => console.log('Connected to Socket.io server'));
    socket.on('disconnect', () => console.log('Disconnected from Socket.io server'));
    
    socket.on('colors', (msg) => {
      addColorsToVisualization(msg);
      createColorObjectsFromData(msg);
    });

    socket.on('connect_error', (error) => console.error('Socket connection error:', error));
  } catch (error) {
    console.error('Error initializing socket:', error);
  }
}

function addColorsToVisualization(data) {
  const { paletteTitle, colors } = data;
  
  if (!document.getElementById('color-visualization')) {
    const visualizationContainer = document.createElement('div');
    visualizationContainer.id = 'color-visualization';
    visualizationContainer.classList.add('color-visualization');
    elements.requestsContainer.parentNode.insertBefore(visualizationContainer, elements.requestsContainer);
  }
  
  const visualizationContainer = document.getElementById('color-visualization');
  
  const colorItem = document.createElement('div');
  colorItem.classList.add('color-item');
  
  const max = Math.min(MAX_COLORS_DISPLAY, colors.length);
  colorItem.style.setProperty('--max', max);
  
  const colorValues = [];
  for (let i = 0; i < max; i++) {
    colorValues.push(getColorValue(colors[i]));
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

elements.listSelect.addEventListener('change', (event) => {
  updateElementIfExists('url-list-select', 'value', event.target.value);
  updateApiUrlPreview();
});

elements.noduplicatesCheckbox.addEventListener('change', (event) => {
  updateElementIfExists('url-noduplicates-checkbox', 'checked', event.target.checked);
  updateApiUrlPreview();
});

initializePhysics();

selectedColors.push(getRandomHexColor());
fetchLists();
renderColors();
initializeSocket();
