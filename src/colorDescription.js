import ColorDescription from 'color-description';

/**
 * describes a color in words using color-description, leaving out its long
 * per-color-family summary paragraphs
 * @param   {string} hex hex representation of the color
 * @return  {object} nouns, adjectives, meanings, effects, usage and temperature
 */
export const describeColor = hex => {
  const description = new ColorDescription(hex);

  return {
    nouns: description.nouns,
    adjectives: description.descriptiveWords,
    meanings: description.meanings,
    effects: description.effects,
    usage: description.usage,
    temperature: description.temperatureWords,
  };
};
