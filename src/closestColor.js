import { differenceCiede2000 } from 'culori';

/**
 * Return closest color from a given list
 * uses caching for faster response. Has the ability to return every match
 * only once.
 */
export default class Closest {
  /**
   * Creates an instance of Closest.
   * @param {Array}     list    Parsed Culori Color List
   * @param {Boolean}   unique  If set to true, every entry from `list`
   *                            can be returned only once
   *                            unit clearCache() is called
   */
  constructor(list, unique, metric = differenceCiede2000()) {
    // creates a copy of list
    this.list = Array.from(list);

    this.unique = unique;

    this.metric = metric;

    // console.log(this.diff)
    // inits the cache and previouslyReturnedIndexes properties
    this.clearCache(false);
  }

  /**
   Public method to rest cached value / result paris
   * especially if set to unique (return every match only once)
   * you may want to reset the previously returned indexes
   * @param {Boolean} indexOnly if you are using "unique" mode only the returned
   *                            indexes are cleared by default
   */
  clearCache(indexOnly = this.unique) {
    if (!indexOnly) {
      this.cache = {};
    }
    this.previouslyReturnedIndexes = [];
  }

  /**
   * gets the closes Number/VectorN
   * @param {Number|Array} val reference number or array
   * @return {Object|Null} closes match within lists containing
   *                      {
   *                         closest:   {Number|Array} closest entry from list
   *                         index:     {Number}       index within list
   *                         distance:  {Number}       Distance within the
   *                                                   coordinate system
   *                      }
   */
  get(color) {
    let minDistance = Infinity;
    let index = 0;
    let closest = this.list[index];

    // is there a better way to do this? If "color" is only a number, it seams
    // like a big overhead to JSON stringify it every-time, I don't see an other
    // way when color is an array thought. Other than something like
    // cache[color[0]][color[1]][color[3]] or whatever
    const colorUID = JSON.stringify(color);

    // returns previously found match
    if (!this.unique && this.cache.hasOwnProperty(colorUID)) {
      return this.cache[colorUID];
    }

    // if set to return every colorue in the list only once
    // and being out of entries in the list
    if (
      this.unique && this.previouslyReturnedIndexes.length === this.list.length
    ) {
      return null;
    }

    for (let i = 0; i < this.list.length; i++) {
      // skip if set to unique and color was returned previously
      if (!(this.unique && this.previouslyReturnedIndexes.indexOf(i) > -1)) {
        const distance = this.metric(color, this.list[i]);
        if (distance < minDistance) {
          minDistance = distance;
          index = i;
          closest = this.list[i];
        }
      }
    }

    // save previously returned indexes if set to unique mode,
    if (this.unique) {
      this.previouslyReturnedIndexes.push(index);
    }

    // return and save in cache
    return this.cache[colorUID] = {
      closest,
      index
    };
  }
}