import seedrandom from 'seedrandom';

/** Remove adjacent duplicate words (case-insensitive) from a token array */
function deduplicateParts(parts, separatorRegex) {
  if (parts.length < 3) return parts;

  // Helper to check if a token is a separator
  const isSepToken = token =>
    !!token &&
    new RegExp(`^${separatorRegex.source}$`, separatorRegex.flags).test(token);

  const result = [];
  let lastWordLower = null;
  let pendingSep = '';

  for (const token of parts) {
    if (isSepToken(token)) {
      pendingSep = token;
      continue;
    }
    const wordLower = token.trim().toLowerCase();
    if (wordLower !== lastWordLower) {
      if (pendingSep) {
        result.push(pendingSep);
        pendingSep = '';
      }
      result.push(token);
      lastWordLower = wordLower;
    } else {
      pendingSep = '';
    }
  }

  // Final pass: remove any consecutive duplicate words (across head/tail seams)
  const final = [];
  let prevWord = null;
  for (let i = 0; i < result.length; i++) {
    const token = result[i];
    if (isSepToken(token)) {
      final.push(token);
    } else {
      const wordLower = token.trim().toLowerCase();
      if (wordLower !== prevWord) {
        final.push(token);
        prevWord = wordLower;
      }
    }
  }
  return final;
}

export function getPaletteTitle(
  namesArr,
  separatorRegex = /(\s|[-\u2010\u2011\u2012\u2013\u2014\u2015\u00B7/])+/
) {
  const uniqueNames = [...new Set(namesArr)];
  if (uniqueNames.length === 0) return '';
  if (uniqueNames.length === 1) return uniqueNames[0];

  const rng = seedrandom(uniqueNames.join('-'));
  const n = uniqueNames.length;
  const indexFirst = Math.floor(rng() * n);
  let indexLast = Math.floor(rng() * (n - 1));
  if (indexLast >= indexFirst) indexLast += 1;
  const firstName = uniqueNames[indexFirst];
  const lastName = uniqueNames[indexLast];

  let partsFirst = firstName.split(separatorRegex);
  let partsLast = lastName.split(separatorRegex);

  // Swap if seam would be a duplicate
  const firstOfFirst = partsFirst[0].trim().toLowerCase();
  const lastOfLast = partsLast[partsLast.length - 1].trim().toLowerCase();
  if (firstOfFirst === lastOfLast) {
    const firstOfLast = partsLast[0].trim().toLowerCase();
    const lastOfFirst = partsFirst[partsFirst.length - 1].trim().toLowerCase();
    if (firstOfLast !== lastOfFirst) {
      [partsFirst, partsLast] = [partsLast, partsFirst];
    }
  }

  // Regex for preferred separators (dash, dot, slash - but not space)
  const preferredSepRegex = /[-\u2010-\u2015\u00B7/.]/;

  // Helper to extract preferred separator
  function extractPreferredSeparator(sep) {
    if (!sep) return '';
    // Only allow dash, dot, slash, or space
    const match = sep.match(/[-\u2010-\u2015\u00B7/. ]/);
    return match ? match[0] : '';
  }

  // Helper to pick a seam separator
  function pickSeamSeparator(headSepRaw, tailSepRaw) {
    const sepFromTail = extractPreferredSeparator(tailSepRaw);
    const sepFromHead = extractPreferredSeparator(headSepRaw);
    // Prefer dash/dot/slash if present
    if (sepFromTail && preferredSepRegex.test(sepFromTail)) {
      return sepFromTail;
    }
    if (sepFromHead && preferredSepRegex.test(sepFromHead)) {
      return sepFromHead;
    }
    return sepFromTail || sepFromHead || ' ';
  }

  // Style A: (all but the last part of first) + (the last part(s) of last)
  if (rng() < 0.5) {
    const headParts =
      partsFirst.length > 1 ? partsFirst.slice(0, -1) : partsFirst;
    let tailParts, tailSepRaw;
    if (partsLast.length > 3) {
      tailParts = partsLast.slice(-3);
      tailSepRaw = partsLast[partsLast.length - 4] || null;
    } else {
      tailParts = [partsLast[partsLast.length - 1]];
      tailSepRaw =
        partsLast.length > 1 ? partsLast[partsLast.length - 2] : null;
    }
    const headSepRaw =
      partsFirst.length > 1 ? partsFirst[partsFirst.length - 2] : null;
    const separator = pickSeamSeparator(headSepRaw, tailSepRaw);
    // Combine parts with separator, then deduplicate
    const combined = [...headParts, separator, ...tailParts];
    const deduplicated = deduplicateParts(combined, separatorRegex);
    return deduplicated.join('').trim();
  } else {
    // Style B: (the first part of first) + (all but the first part of last)
    const headParts = [partsFirst[0]];
    const tailParts = partsLast.length > 1 ? partsLast.slice(1) : partsLast;
    const headSepRaw = partsFirst.length > 1 ? partsFirst[1] : null;
    const tailSepRaw = partsLast.length > 1 ? partsLast[1] : null;
    const separator = pickSeamSeparator(headSepRaw, tailSepRaw);
    // Combine parts with separator, then deduplicate
    const combined = [...headParts, separator, ...tailParts];
    const deduplicated = deduplicateParts(combined, separatorRegex);
    return deduplicated.join('').trim();
  }
}
