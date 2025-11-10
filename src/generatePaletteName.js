import seedrandom from 'seedrandom';

/** Remove adjacent duplicate words (case-insensitive) from a token array */
function deduplicateParts(parts, sepRe) {
  if (parts.length < 3) return parts;
  const isSep = t => new RegExp(`^${sepRe.source}$`, sepRe.flags).test(t);

  const result = [];
  let lastWord = '';
  let sep = '';

  for (const t of parts) {
    if (isSep(t)) {
      sep = t;
      continue;
    }
    const w = t.trim().toLowerCase();
    if (w !== lastWord) {
      if (sep) (result.push(sep), (sep = ''));
      result.push(t);
      lastWord = w;
    } else sep = '';
  }
  return result;
}

function pickSeparator(chunk) {
  if (!chunk) return null;
  const c = chunk.match(/[^\s]/u);
  return c ? c[0] : ' ';
}

export function getPaletteTitle(
  names,
  sepRe = /(\s|[-\u2010-\u2015\u00B7/])+/
) {
  const unique = [...new Set(names)];
  if (!unique.length) return '';
  if (unique.length === 1) return unique[0];

  const rng = seedrandom(unique.join('-'));
  const n = unique.length;
  const i1 = Math.floor(rng() * n);
  const i2 = (Math.floor(rng() * (n - 1)) + (i1 < n - 1 ? 0 : 1)) % n;

  let p1 = unique[i1].split(sepRe);
  let p2 = unique[i2].split(sepRe);

  // swap if they start/end with same word
  const first1 = p1[0].trim().toLowerCase();
  const last2 = p2[p2.length - 1].trim().toLowerCase();
  if (first1 === last2) {
    const last1 = p1[p1.length - 1].trim().toLowerCase();
    const first2 = p2[0].trim().toLowerCase();
    if (first2 !== last1) [p1, p2] = [p2, p1];
  }

  const combine = (head, tail, headSep = null, tailSep = null) => {
    const headTrim = head.replace(
      new RegExp(`^${sepRe.source}|${sepRe.source}$`, sepRe.flags),
      ''
    );
    const tailTrim = tail.replace(
      new RegExp(`^${sepRe.source}|${sepRe.source}$`, sepRe.flags),
      ''
    );
    const sep = pickSeparator(tailSep) || pickSeparator(headSep) || ' ';
    let combined = `${headTrim}${sep}${tailTrim}`.trim();

    // fallback to 2 words if only 1
    if (
      unique.length >= 2 &&
      combined.split(sepRe).filter(w => w.trim()).length < 2
    ) {
      const alt =
        unique.find(w => w.trim().toLowerCase() !== headTrim.toLowerCase()) ||
        headTrim;
      combined = `${headTrim}${sep}${alt}`.trim();
    }
    return combined;
  };

  const styleA = rng() < 0.5;
  if (styleA) {
    const head = deduplicateParts(p1.slice(0, -1), sepRe).join('') || p1[0];
    const tailParts = p2.length > 3 ? p2.slice(-3) : [p2[p2.length - 1]];
    const tail = deduplicateParts(tailParts, sepRe).join('');
    const headSep = p1[p1.length - 2];
    const tailSep = p2[p2.length - 2];
    return combine(head, tail, headSep, tailSep);
  } else {
    const head = p1[0];
    const tailParts = p2.length > 1 ? p2.slice(1) : p2;
    const tail = deduplicateParts(tailParts, sepRe).join('');
    return combine(head, tail, p1[1], p2[1]);
  }
}
