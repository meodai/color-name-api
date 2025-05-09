// Physics and visualization logic
import { elements } from './elements.js';
import { getColorValue } from './colors.js';

export let engine, render, runner;
export let physics = {
  objects: [],
  maxObjects: 1000,
  initialized: false,
  wasInitialized: false,
  paused: false,
  bounds: { width: 0, height: 0 },
  resizeThrottle: null,
  scrollThrottle: null,
  scrollCheckCounter: 0,
  observer: null,
  mouseBody: null,
  isTouchActive: false
};

let Matter = window.Matter;
const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

export function initializePhysics() {
  if (physics.initialized) {
    cleanupPhysics();
  }
  engine = Engine.create({ gravity: { x: 0, y: 0.5 } });
  physics.bounds = { width: window.innerWidth, height: window.innerHeight };
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
    collisionFilter: { group: 1, category: 0x0002 },
    render: { fillStyle: 'rgba(0, 0, 0, 0)', opacity: 0 }
  });
  Composite.add(engine.world, physics.mouseBody);
  document.addEventListener('mousemove', handleMouseMove);
  createHeadingBodies();
  Events.on(engine, 'afterUpdate', afterUpdateHandler);
  window.removeEventListener('resize', handleWindowResize);
  window.addEventListener('resize', handleWindowResize);
  window.removeEventListener('scroll', handleScroll);
  window.addEventListener('scroll', handleScroll);
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchend', handleTouchEnd);
  document.removeEventListener('touchcancel', handleTouchEnd);
  document.addEventListener('touchstart', handleTouchStart);
  document.addEventListener('touchend', handleTouchEnd);
  document.addEventListener('touchcancel', handleTouchEnd);
  if (physics.observer) physics.observer.disconnect();
  physics.observer = new MutationObserver(() => createHeadingBodies());
  physics.observer.observe(document.body, { childList: true, subtree: true });
  runner = Runner.create();
  Render.run(render);
  Runner.run(runner, engine);
  physics.initialized = true;
}

export function cleanupPhysics() {
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
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchend', handleTouchEnd);
  document.removeEventListener('touchcancel', handleTouchEnd);
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
  Body.setPosition(physics.mouseBody, { x: mouseX, y: mouseY });
}

function handleWindowResize() {
  if (physics.isTouchActive) return;
  if (physics.resizeThrottle) clearTimeout(physics.resizeThrottle);
  physics.resizeThrottle = setTimeout(() => {
    initializePhysics();
    updateHeadingBodies("full");
  }, 300);
}

function handleTouchStart() { physics.isTouchActive = true; }
function handleTouchEnd() { physics.isTouchActive = false; }

function afterUpdateHandler() {
  const objectsToRemove = [];
  const buffer = 500;
  physics.objects.forEach(obj => {
    if (obj.position.y > physics.bounds.height + buffer ||
        obj.position.x < -buffer ||
        obj.position.x > physics.bounds.width + buffer) {
      objectsToRemove.push(obj);
    }
  });
  if (objectsToRemove.length > 0) {
    objectsToRemove.forEach(obj => {
      Composite.remove(engine.world, obj);
      physics.objects = physics.objects.filter(o => o.id !== obj.id);
    });
  }
  if (physics.objects.length > physics.maxObjects) {
    const objectsToTrim = physics.objects.slice(0, physics.objects.length - physics.maxObjects);
    objectsToTrim.forEach(obj => {
      Composite.remove(engine.world, obj);
    });
    physics.objects = physics.objects.slice(physics.objects.length - physics.maxObjects);
  }
}

export function createColorObject(hexColor) {
  if (!physics.initialized) return;
  const color = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
  const size = Math.random() * 18 + 5;
  const x = Math.random() * physics.bounds.width;
  const y = -size * 2;
  const sides = Math.floor(Math.random() * 4) + 1;
  const scale = 1;
  const density = Math.max(0.001, (size / 23) ** 2);
  const commonProps = {
    restitution: 0.4,
    friction: 0.05,
    frictionAir: (1 - (size / 23)) * 0.05,
    density: density,
    angle: Math.random() * Math.PI * 2,
    render: { fillStyle: color, strokeStyle: '#000000', lineWidth: 0 }
  };
  let object;
  if (sides <= 2) {
    object = Bodies.circle(x, y, size, commonProps);
  } else {
    object = Bodies.polygon(x, y, sides, size * scale, commonProps);
  }
  physics.objects.push(object);
  Composite.add(engine.world, object);
}

export function createColorObjectsFromData(data) {
  if (!physics.initialized || !data.colors || !data.colors.length) return;
  const maxToCreate = Math.min(data.colors.length, 50);
  for (let i = 0; i < maxToCreate; i++) {
    createColorObject(getColorValue(data.colors[i]));
  }
}

function createHeadingBodies() {
  if (!physics.initialized) return;
  const bodies = Composite.allBodies(engine.world);
  const headingBodies = bodies.filter(body => body.isHeading);
  const pixelBodies = bodies.filter(body => body.isPixel);
  headingBodies.forEach(body => Composite.remove(engine.world, body));
  pixelBodies.forEach(body => Composite.remove(engine.world, body));
  const headings = elements.physicsCollisions
  headings.forEach(heading => {
    const rect = heading.getBoundingClientRect();
    // Only add if the TOP is in the viewbox
    if (rect.top < window.innerHeight && rect.top >= 0 && rect.width > 0 && rect.height > 0) {
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
  const pixelatedMap = document.querySelector('.pixelated-map');
  if (pixelatedMap && pixelatedMap.style.display !== 'none') {
    addPixelsToPhysics(pixelatedMap);
  }
}

function updateHeadingBodies(mode = "full") {
  if (!physics.initialized) return;
  const bodies = Composite.allBodies(engine.world);
  const headingBodies = bodies.filter(body => body.isHeading);
  const pixelBodies = bodies.filter(body => body.isPixel);
  const bodiesToRemove = [];
  headingBodies.forEach(body => {
    if (body.headingElement) {
      const rect = body.headingElement.getBoundingClientRect();
      let x = body.position.x;
      let y = rect.top + rect.height / 2;
      if (mode === "full") {
        x = rect.left + rect.width / 2;
      }
      // Remove from simulation if the TOP is out of the viewbox
      if (rect.top < window.innerHeight && rect.top >= 0 && rect.width > 0 && rect.height > 0) {
        Body.setPosition(body, { x, y });
        body.render.opacity = 1;
      } else {
        bodiesToRemove.push(body);
      }
    }
  });
  // Update pixel bodies positions
  pixelBodies.forEach(body => {
    if (body.pixelElement) {
      const rect = body.pixelElement.getBoundingClientRect();
      let x = body.position.x;
      let y = rect.top + rect.height / 2;
      if (mode === "full") {
        x = rect.left + rect.width / 2;
      }
      // Remove from simulation if the TOP is out of the viewbox
      if (rect.top < window.innerHeight && rect.top >= 0 && rect.width > 0 && rect.height > 0) {
        Body.setPosition(body, { x, y });
      } else {
        bodiesToRemove.push(body);
      }
    }
  });
  if (bodiesToRemove.length > 0) {
    bodiesToRemove.forEach(body => Composite.remove(engine.world, body));
  }
  const headings = elements.physicsCollisions;
  headings.forEach(heading => {
    const rect = heading.getBoundingClientRect();
    // Only add if the TOP is in the viewbox
    if (rect.top < window.innerHeight && rect.top >= 0 && rect.width > 0 && rect.height > 0) {
      const alreadyExists = headingBodies.some(body => body.headingElement === heading);
      if (!alreadyExists) {
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
    }
  });
}

function handleScroll() {
  physics.scrollThrottle = requestAnimationFrame(() => {
    updateHeadingBodies("yOnly");
    physics.scrollCheckCounter = physics.scrollCheckCounter || 0;
    physics.scrollCheckCounter++;
    if (physics.scrollCheckCounter % 10 === 0) {
      createHeadingBodies();
    }
  });
}

export function addPixelsToPhysics(pixelatedMap) {
  if (!physics.initialized || !pixelatedMap) return;

  // Remove existing pixel bodies to avoid duplicates
  const bodies = Composite.allBodies(engine.world);
  const pixelBodies = bodies.filter(body => body.isPixel);
  pixelBodies.forEach(body => Composite.remove(engine.world, body));

  const pixels = pixelatedMap.querySelectorAll('.pixel-country');
  const maxPhysicsPixels = 300;
  const totalPixels = pixels.length;
  const addEvery = Math.max(1, Math.floor(totalPixels / maxPhysicsPixels));

  pixels.forEach((pixel, index) => {
    if (index % addEvery !== 0) return;
    const rect = pixel.getBoundingClientRect();
    if (rect.width < 5 || rect.height < 5) return;
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const body = Bodies.rectangle(
      x, y, rect.width, rect.height,
      {
        isStatic: true,
        isPixel: true,
        pixelElement: pixel,
        friction: 0.2,
        render: {
          fillStyle: 'rgba(0, 0, 0, 0)',
          strokeStyle: 'rgba(0, 0, 0, 0.05)',
          lineWidth: 0
        }
      }
    );
    Composite.add(engine.world, body);
  });
}
