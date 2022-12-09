import seedrandom from 'seedrandom';

/**
 * getPaletteTitle
 * @param {string[]} namesArr
 * @param {RegExp} separatorRegex
 * @return {string}
 */
export function getPaletteTitle(
  namesArr, // array of names
  separatorRegex = /(\s|-)+/g,
) {
  // remove duplicates
  const localnames = [...new Set(namesArr)];

  // if there is only one name, return it
  if (localnames.length === 1) {
    return localnames[0];
  }

  const rng = seedrandom(namesArr.join('-'));
  const rnd1 = rng();
  const rnd2 = rng();
  const longPartFirst = rng() < 0.5;

  // select a random name from the list for the first word in the palette title
  const indexFirst = Math.round(rnd1 * (localnames.length - 1));

  // remove the selected name from the list
  const firstName = localnames.splice(indexFirst, 1)[0];

  // select a random name from the list as a last word in the palette title
  const lastIndex = Math.round(rnd2 * (localnames.length - 1));
  const lastName = localnames[lastIndex];

  const partsFirst = firstName.split(separatorRegex);
  const partsLast = lastName.split(separatorRegex);

  if (longPartFirst) {
    if (partsFirst.length > 1) {
      partsFirst.pop();
    } else {
      partsFirst[0] = `${partsFirst[0]} `;
    }
    return partsFirst.join('') + partsLast.pop();
  }

  if (partsLast.length > 1) {
    partsLast.shift();
  } else {
    partsLast[0] = ` ${partsLast[0]}`;
  }

  return partsFirst.shift() + partsLast.join('');
}
