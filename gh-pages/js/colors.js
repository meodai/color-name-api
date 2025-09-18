// Color utilities and rendering
import { elements } from './elements.js';

export function getRandomHexColor() {
  return Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, '0');
}

export function getColorValue(colorObj) {
  return Object.prototype.hasOwnProperty.call(colorObj, 'requestedHex')
    ? colorObj.requestedHex
    : colorObj.hex;
}

export function colorArrToSteppedGradient(colorsArr) {
  return colorsArr
    .map(
      (c, i) =>
        `${c} ${(i / colorsArr.length) * 100}% ${((i + 1) / colorsArr.length) * 100}%`
    )
    .join();
}

export function renderColors(selectedColors, updateApiUrlPreview, removeColor) {
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
      colorInput.addEventListener('change', e => {
        const newColor = e.target.value.slice(1).toLowerCase();
        selectedColors[index] = newColor;
        colorContainer.style.setProperty('--color', `#${newColor}`);
        renderColors(selectedColors, updateApiUrlPreview, removeColor);
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
    renderColors(selectedColors, updateApiUrlPreview, removeColor);
    updateApiUrlPreview();
  });
  elements.urlColors.appendChild(addBtn);
}
