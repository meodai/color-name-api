import seedrandom from 'seedrandom';

/**
 * Generate a unique palette title by combining parts from multiple color names.
 * Deterministic based on input order.
 */
export function getPaletteTitle(
  namesArr,
  separatorRegex = /(\s|[-\u2010\u2011\u2012\u2013\u2014\u2015\u00B7/])+/
) {
  // Handle edge cases
  if (!namesArr || namesArr.length === 0) return '';
  const uniqueNames = [...new Set(namesArr)];
  if (uniqueNames.length === 1) return uniqueNames[0];

  // Deterministic random selection
  const rng = seedrandom(uniqueNames.join('-'));
  const pickIndex = max => Math.floor(rng() * max);

  // Pick two distinct names
  const idx1 = pickIndex(uniqueNames.length);
  let idx2 = pickIndex(uniqueNames.length - 1);
  if (idx2 >= idx1) idx2++;

  const name1 = uniqueNames[idx1];
  const name2 = uniqueNames[idx2];

  // Split names into parts (words and separators)
  const parts1 = name1.split(separatorRegex);
  const parts2 = name2.split(separatorRegex);

  // Determine combination style
  const useStyleA = rng() < 0.5;
  let headParts, tailParts, separator;

  if (useStyleA) {
    // Style A: head from first name (all but last word) + tail from second name (last word)
    // Take all parts except the last word and its separator
    headParts = parts1.length > 2 ? parts1.slice(0, -2) : [parts1[0]];

    // For tail, take just the last word
    tailParts = [parts2[parts2.length - 1]];

    // Extract separator from the original parts
    const headSep = parts1.length > 1 ? parts1[parts1.length - 2] : null;
    const tailSep =
      parts2.length > 3
        ? parts2[parts2.length - 4]
        : parts2.length > 1
          ? parts2[parts2.length - 2]
          : null;
    separator = extractSeparator(headSep, tailSep);
  } else {
    // Style B: first word from first name + rest of second name (with internal separators)
    headParts = [parts1[0]];
    // Take everything after the first word from parts2, including separators
    tailParts = parts2.length > 1 ? parts2.slice(2) : parts2;
    separator = extractSeparator(parts1[1], parts2[1]);
  }

  // Combine: headParts + separator + tailParts, then deduplicate
  const combined = [...headParts, separator, ...tailParts];
  const result = deduplicateWords(combined, separatorRegex);

  return result.join('').trim();
}

/**
 * Extract preferred separator (prefer dash/dot/slash over space)
 */
function extractSeparator(sep1, sep2) {
  const preferredRegex = /[-\u2010-\u2015\u00B7/.]/;
  const allSepRegex = /[-\u2010-\u2015\u00B7/. ]/;

  for (const sep of [sep2, sep1]) {
    if (!sep) continue;
    const match = sep.match(allSepRegex);
    if (match && preferredRegex.test(match[0])) return match[0];
  }

  // Fallback to any separator or space
  for (const sep of [sep2, sep1]) {
    if (!sep) continue;
    const match = sep.match(allSepRegex);
    if (match) return match[0];
  }

  return ' ';
}

/**
 * Remove consecutive duplicate words while preserving separators
 */
function deduplicateWords(parts, separatorRegex) {
  if (parts.length < 3) return parts;

  // Create regex once, not in every iteration
  const sepTest = new RegExp(
    `^${separatorRegex.source}$`,
    separatorRegex.flags
  );
  const isSep = token => !!token && sepTest.test(token);

  const result = [];
  let prevWord = '';

  for (const token of parts) {
    if (isSep(token)) {
      // Keep separators, but don't add duplicate separators
      if (result.length > 0 && !isSep(result[result.length - 1])) {
        result.push(token);
      }
    } else {
      const word = token.trim().toLowerCase();
      if (word !== prevWord) {
        result.push(token);
        prevWord = word;
      } else {
        // Remove the separator before this duplicate word
        if (result.length > 0 && isSep(result[result.length - 1])) {
          result.pop();
        }
      }
    }
  }

  return result;
}
