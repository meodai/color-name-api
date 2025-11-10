import seedrandom from 'seedrandom';

/**
 * Removes adjacent duplicate words from a parts array.
 * e.g., ['Deep', ' ', 'Deep', ' ', 'Blue'] becomes ['Deep', ' ', 'Blue']
 * @param {string[]} parts - The array of name parts, including separators.
 * @returns {string[]} A new array with adjacent duplicates removed.
 */
function deduplicateParts(parts) {
  if (parts.length < 3) return parts; // Not enough parts for an adjacent duplicate

  // The first part is always included.
  // Subsequent parts are added only if they are not the same as the previous part.
  return parts.filter((part, i) => {
    // Keep all separators (odd indices) and the first word (index 0)
    if (i % 2 !== 0 || i === 0) return true;
    // For words (even indices > 0), check against the previous word
    const previousWord = parts[i - 2];
    return part.trim().toLowerCase() !== previousWord.trim().toLowerCase();
  });
}

/**
 * Extract a preferred single-character separator from a captured separator chunk.
 * - If the chunk contains any non-space character (e.g., '-', '–', '—', '‑', '·', '/'), use the first one.
 * - Otherwise, return a single space.
 * @param {string} sepChunk
 * @returns {string|null}
 */
function extractPreferredSeparator(sepChunk) {
  if (!sepChunk) return null;
  const match = sepChunk.match(/[^\s]/u);
  if (match) return match[0];
  // All spaces
  return ' ';
}

/**
 * Generates a unique and deterministic palette name from an array of color names.
 */
// Default separator regex captures whitespace and a broad set of dash-like separators
// Hyphen-minus -, Non‑breaking hyphen ‑, Figure dash ‒, En dash –, Em dash —, Horizontal bar ―, Middle dot ·, Slash /
export function getPaletteTitle(
  namesArr,
  separatorRegex = /(\s|[-\u2010\u2011\u2012\u2013\u2014\u2015\u00B7/])+/
) {
  // ... (Steps 1-5: setup, RNG, name selection, and splitting are identical to before)

  // Helper to count word tokens using the same separatorRegex used for splitting
  function countWords(str) {
    const parts = str.split(separatorRegex);
    let count = 0;
    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i] && parts[i].trim()) count += 1;
    }
    return count;
  }

  // Derive leading/trailing trim regexes from the provided separatorRegex to avoid repeating character classes
  const leadingSepRegex = new RegExp(
    `^${separatorRegex.source}`,
    separatorRegex.flags
  );
  const trailingSepRegex = new RegExp(
    `${separatorRegex.source}$`,
    separatorRegex.flags
  );

  // Helper to assemble the final string with consistent trimming, separator selection, and fallback
  function assembleCombinedName(
    head,
    tail,
    headSepRaw,
    tailSepRaw,
    candidates
  ) {
    // Normalize edges
    const headTrimmed = head.replace(trailingSepRegex, '');
    const tailTrimmed = tail.replace(leadingSepRegex, '');

    // Determine separator at seam using exact captured separators
    const sepFromTail = extractPreferredSeparator(tailSepRaw);
    const sepFromHead = extractPreferredSeparator(headSepRaw);
    const separator = sepFromTail || sepFromHead || ' ';

    const combined = `${headTrimmed}${separator}${tailTrimmed}`.trim();

    // Fallback: ensure at least two tokens if we had >=2 unique names
    if (uniqueNames.length >= 2) {
      const wordCount = countWords(combined);
      if (wordCount < 2) {
        const headLower = headTrimmed.trim().toLowerCase();
        const fallbackTailRaw = candidates.find(
          w => w && w.trim() && w.trim().toLowerCase() !== headLower
        );
        const fallbackTail = fallbackTailRaw
          ? fallbackTailRaw.trim()
          : headTrimmed;
        const safeSep = separator || ' ';
        return `${headTrimmed}${safeSep}${fallbackTail}`.trim();
      }
    }
    return combined;
  }

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
        ? deduplicateParts(headParts).join('')
        : partsFirst[0];

    // Get the tail - if partsLast has multiple parts, include the separator with it
    let tail;

    if (partsLast.length > 2) {
      // Take last 2 elements (separator + word) to preserve the original separator
      tail = partsLast.slice(-2).join('');
    } else {
      tail = partsLast[partsLast.length - 1];
    }
    const headSepRaw =
      partsFirst.length > 1 ? partsFirst[partsFirst.length - 2] : null;
    const tailSepRaw =
      partsLast.length > 2 ? partsLast[partsLast.length - 2] : null;
    const candidates = [
      partsLast[partsLast.length - 1],
      partsLast[0],
      partsFirst[partsFirst.length - 1],
    ];
    return assembleCombinedName(head, tail, headSepRaw, tailSepRaw, candidates);
  } else {
    // Style B: (the first part of first) + (all but the first part of last)
    const head = partsFirst[0];

    // Get the tail with its separator
    let tail;

    if (partsLast.length > 2) {
      // Take everything after the first word, including its separator
      const tailParts = partsLast.slice(1);
      tail = deduplicateParts(tailParts).join('');
    } else if (partsLast.length === 1) {
      tail = partsLast[0];
    } else {
      // partsLast has 2 or 3 elements
      tail = partsLast.slice(1).join('');
    }
    const headSepRaw = partsFirst.length > 1 ? partsFirst[1] : null;
    const tailSepRaw = partsLast.length > 1 ? partsLast[1] : null;
    const candidates = [
      partsLast[partsLast.length - 1],
      partsLast[0],
      partsFirst[partsFirst.length - 1],
    ];
    return assembleCombinedName(head, tail, headSepRaw, tailSepRaw, candidates);
  }
}
