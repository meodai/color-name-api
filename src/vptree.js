/**
 * A max-heap data structure optimized for nearest neighbor search
 * Maintains a collection of elements with a maximum size
 * where the element with the highest distance is at the top
 */
class MaxHeap {
  /**
   * Creates a new MaxHeap with a maximum size
   * @param {number} size Maximum number of elements to store in the heap
   */
  constructor(size) {
    this.size = size;
    this.data = [];
  }

  /**
   * Adds an item to the heap and maintains heap property
   * Automatically removes the max item if size exceeds limit
   * @param {object} item The item to add to the heap
   */
  push(item) {
    this.data.push(item);
    this._siftUp(this.data.length - 1);

    if (this.data.length > this.size) {
      this.pop(); // remove worst
    }
  }

  /**
   * Removes and returns the max item from the heap
   * @return {object} The max item from the heap
   */
  pop() {
    const top = this.data[0];
    const end = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = end;
      this._siftDown(0);
    }
    return top;
  }

  /**
   * Returns the max item without removing it
   * @return {object} The max item from the heap
   */
  peek() {
    return this.data[0];
  }

  /**
   * Converts the heap to a sorted array based on distance
   * @return {Array} Sorted array of heap items
   */
  toSortedArray() {
    return [...this.data].sort((a, b) => a.dist - b.dist);
  }

  /**
   * Internal method to maintain heap property when pushing
   * @param {number} i Index of item to sift up
   * @private
   */
  _siftUp(i) {
    const item = this.data[i];
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.data[parent].dist >= item.dist) break;
      this.data[i] = this.data[parent];
      i = parent;
    }
    this.data[i] = item;
  }

  /**
   * Internal method to maintain heap property when popping
   * @param {number} i Index of item to sift down
   * @private
   */
  _siftDown(i) {
    const length = this.data.length;
    const item = this.data[i];

    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let largest = i;

      if (left < length && this.data[left].dist > this.data[largest].dist) {
        largest = left;
      }
      if (right < length && this.data[right].dist > this.data[largest].dist) {
        largest = right;
      }
      if (largest === i) break;

      this.data[i] = this.data[largest];
      i = largest;
    }
    this.data[i] = item;
  }
}

/**
 * Vantage Point Tree implementation for efficient nearest neighbor searches
 * Used to accelerate color matching by partitioning the color space
 * and creating a spatial data structure for fast lookups
 */
export class VPTree {
  /**
   * Creates a new Vantage Point Tree from a set of points
   * @param {Array} points Array of points to build the tree from
   * @param {Function} distanceFn Function to calculate distance between two points
   */
  constructor(points, distanceFn) {
    this.distance = distanceFn;
    this.root = this._build(points);
  }

  /**
   * Recursively builds the tree structure from an array of points
   * @param {Array} points Array of points to build the subtree from
   * @return {object|null} The root node of the subtree
   * @private
   */
  _build(points) {
    if (points.length === 0) return null;

    const node = {};
    const i = Math.floor(Math.random() * points.length);
    node.point = points[i];
    const rest = points.slice(0, i).concat(points.slice(i + 1));

    if (rest.length === 0) {
      node.threshold = 0;
      node.left = null;
      node.right = null;
      return node;
    }

    // Calculate distances from vantage point to all other points
    const distances = rest.map(p => ({
      point: p,
      dist: this.distance(p, node.point),
    }));

    // Sort by distance and find median
    distances.sort((a, b) => a.dist - b.dist);
    const median = Math.floor(distances.length / 2);
    node.threshold = distances[median].dist;

    // Build left subtree (closer points) and right subtree (further points)
    node.left = this._build(distances.slice(0, median).map(d => d.point));
    node.right = this._build(distances.slice(median).map(d => d.point));

    return node;
  }

  /**
   * Searches for the closest points to the target
   * @param {object} target The target point to find neighbors for
   * @param {number} maxResults Maximum number of results to return
   * @return {Array} Array of closest points, sorted by distance
   */
  search(target, maxResults = 1) {
    const heap = new MaxHeap(maxResults);

    const searchNode = node => {
      if (!node) return;

      // Calculate distance between target and current vantage point
      const dist = this.distance(target, node.point);

      // If we haven't filled heap yet or if this point is closer than furthest in heap
      if (heap.data.length < maxResults || dist < heap.peek().dist) {
        heap.push({ point: node.point, dist });
      }

      // Determine which subtree to search first (closer one has priority)
      const side = dist < node.threshold ? 'left' : 'right';
      const other = side === 'left' ? 'right' : 'left';

      // Search the closer subtree first
      if (node[side]) searchNode(node[side]);

      // Check if we need to search the other subtree
      // Only needed if the distance from target to threshold is less than our worst match
      const maxDist =
        heap.data.length < maxResults ? Infinity : heap.peek().dist;
      if (node[other] && Math.abs(dist - node.threshold) < maxDist) {
        searchNode(node[other]);
      }
    };

    searchNode(this.root);
    return heap.toSortedArray().map(h => h.point);
  }
}
