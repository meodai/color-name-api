class MaxHeap {
  constructor(size) {
    this.size = size;
    this.data = [];
  }

  push(item) {
    this.data.push(item);
    this._siftUp(this.data.length - 1);

    if (this.data.length > this.size) {
      this.pop(); // remove worst
    }
  }

  pop() {
    const top = this.data[0];
    const end = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = end;
      this._siftDown(0);
    }
    return top;
  }

  peek() {
    return this.data[0];
  }

  toSortedArray() {
    return [...this.data].sort((a, b) => a.dist - b.dist);
  }

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

  _siftDown(i) {
    const length = this.data.length;
    const item = this.data[i];

    while (true) {
      let left = 2 * i + 1;
      let right = 2 * i + 2;
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

export class VPTree {
  constructor(points, distanceFn) {
    this.distance = distanceFn;
    this.root = this._build(points);
  }

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

    const distances = rest.map((p) => ({
      point: p,
      dist: this.distance(p, node.point),
    }));

    distances.sort((a, b) => a.dist - b.dist);
    const median = Math.floor(distances.length / 2);
    node.threshold = distances[median].dist;

    node.left = this._build(distances.slice(0, median).map((d) => d.point));
    node.right = this._build(distances.slice(median).map((d) => d.point));

    return node;
  }

  search(target, maxResults = 1) {
    const heap = new MaxHeap(maxResults);

    const searchNode = (node) => {
      if (!node) return;

      const dist = this.distance(target, node.point);

      if (heap.data.length < maxResults || dist < heap.peek().dist) {
        heap.push({ point: node.point, dist });
      }

      const side = dist < node.threshold ? "left" : "right";
      const other = side === "left" ? "right" : "left";

      if (node[side]) searchNode(node[side]);

      const maxDist =
        heap.data.length < maxResults ? Infinity : heap.peek().dist;
      if (node[other] && Math.abs(dist - node.threshold) < maxDist) {
        searchNode(node[other]);
      }
    };

    searchNode(this.root);
    return heap.toSortedArray().map((h) => h.point);
  }
}
