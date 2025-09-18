import seedrandom from 'seedrandom';

/**
 * Removes adjacent duplicate words from a parts array.
 * e.g., ['Deep', ' ', 'Deep', ' ', 'Blue'] becomes ['Deep', ' ', 'Blue']
 * @param {string[]} parts - The array of name parts, including separators.
 * @returns {string[]} A new array with adjacent duplicates removed.
 */
function deduplicateParts(parts) {
  if (parts.length < 3) return parts; // Not enough parts for an adjacent duplicate

  const result = [parts[0]]; // Always keep the first word
  // Iterate through the rest of the words (at even indices)
  for (let i = 2; i < parts.length; i += 2) {
    const currentWord = parts[i];
    const previousWordInResult = result[result.length - 1];

    // Only add the new word if it's different from the last one we added
    if (
      currentWord.trim().toLowerCase() !==
      previousWordInResult.trim().toLowerCase()
    ) {
      result.push(parts[i - 1]); // Add the separator
      result.push(currentWord); // Add the word
    }
  }
  return result;
}

/**
 * Generates a unique and deterministic palette name from an array of color names.
 */
export function getPaletteTitle(namesArr, separatorRegex = /(\s|-)+/) {
  // ... (Steps 1-5: setup, RNG, name selection, and splitting are identical to before)

  // 1. Create a new array with unique names.
  const uniqueNames = [...new Set(namesArr)];

  // 2. Handle edge cases.
  if (uniqueNames.length === 0) {
    return '';
  }
  if (uniqueNames.length === 1) {
    return uniqueNames[0];
  }

  // 3. Initialize a deterministic random number generator.
  const rng = seedrandom(namesArr.join('-'));

  // 4. Select two distinct random names efficiently.
  const n = uniqueNames.length;
  const indexFirst = Math.floor(rng() * n);
  let indexLast = Math.floor(rng() * (n - 1));
  if (indexLast >= indexFirst) {
    indexLast += 1;
  }
  const firstName = uniqueNames[indexFirst];
  const lastName = uniqueNames[indexLast];

  // 5. Split the chosen names into parts.
  let partsFirst = firstName.split(separatorRegex);
  let partsLast = lastName.split(separatorRegex);

  // 6. Check and prevent duplicate words at the combination seam.
  const firstOfFirst = partsFirst[0].trim().toLowerCase();
  const lastOfLast = partsLast[partsLast.length - 1].trim().toLowerCase();
  if (firstOfFirst === lastOfLast) {
    const firstOfLast = partsLast[0].trim().toLowerCase();
    const lastOfFirst = partsFirst[partsFirst.length - 1].trim().toLowerCase();
    if (firstOfLast !== lastOfFirst) {
      [partsFirst, partsLast] = [partsLast, partsFirst];
    }
  }

  // 7. Combine parts, now with internal de-duplication.
  if (rng() < 0.5) {
    // Style A: (all but the last part of first) + (the last part of last)
    const headParts =
      partsFirst.length > 1 ? partsFirst.slice(0, -1) : partsFirst;
    const head =
      partsFirst.length > 1
        ? deduplicateParts(headParts).join('').trim()
        : partsFirst[0].trim();
    const tail = partsLast[partsLast.length - 1].trim();
    return `${head} ${tail}`;
  } else {
    // Style B: (the first part of first) + (all but the first part of last)
    const head = partsFirst[0].trim();
    const tailParts = partsLast.length > 1 ? partsLast.slice(1) : partsLast;
    const tail =
      partsLast.length > 1
        ? deduplicateParts(tailParts).join('').trim()
        : partsLast[0].trim();
    return `${head} ${tail}`;
  }
}
