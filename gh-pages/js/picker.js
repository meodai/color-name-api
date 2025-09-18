import { elements } from './elements.js';
import { getRandomHexColor } from './colors.js';

const intialColor = `#${getRandomHexColor()}`;

const setColor = color => {
  elements.colorPicker.value = `${color}`;
  elements.colorValue.value = `${color}`;
  elements.colorPreview.style.setProperty('--c', `#${color}`);
};

export function initColorPicker() {
  elements.colorPicker.addEventListener('input', e => {
    const color = e.target.value;
    setColor(color);
  });

  setColor(intialColor);
}
