/**
 * VP-Tree (Vantage Point Tree) implementation for efficient nearest neighbor searches
 * Used to accelerate color matching by partitioning the color space
 */

/**
 * Heap item with distance for nearest neighbor tracking
 */
interface HeapItem<T> {
	point: T;
	dist: number;
}

/**
 * VP-Tree node structure
 */
interface VPTreeNode<T> {
	point: T;
	threshold: number;
	left: VPTreeNode<T> | null;
	right: VPTreeNode<T> | null;
}

/**
 * Distance function type
 */
type DistanceFunction<T> = (a: T, b: T) => number;

/**
 * A max-heap data structure optimized for nearest neighbor search
 * Maintains a collection of elements with a maximum size
 * where the element with the highest distance is at the top
 */
class MaxHeap<T> {
	private size: number;
	public data: HeapItem<T>[];

	/**
	 * Creates a new MaxHeap with a maximum size
	 * @param size Maximum number of elements to store in the heap
	 */
	constructor(size: number) {
		this.size = size;
		this.data = [];
	}

	/**
	 * Adds an item to the heap and maintains heap property
	 * Automatically removes the max item if size exceeds limit
	 * @param item The item to add to the heap
	 */
	push(item: HeapItem<T>): void {
		this.data.push(item);
		this._siftUp(this.data.length - 1);

		if (this.data.length > this.size) {
			this.pop();
		}
	}

	/**
	 * Removes and returns the max item from the heap
	 * @return The max item from the heap
	 */
	pop(): HeapItem<T> | undefined {
		const top = this.data[0];
		const end = this.data.pop();
		if (this.data.length > 0 && end !== undefined) {
			this.data[0] = end;
			this._siftDown(0);
		}
		return top;
	}

	/**
	 * Returns the max item without removing it
	 * @return The max item from the heap
	 */
	peek(): HeapItem<T> | undefined {
		return this.data[0];
	}

	/**
	 * Converts the heap to a sorted array based on distance
	 * @return Sorted array of heap items
	 */
	toSortedArray(): HeapItem<T>[] {
		return [...this.data].sort((a, b) => a.dist - b.dist);
	}

	/**
	 * Internal method to maintain heap property when pushing
	 * @param i Index of item to sift up
	 */
	private _siftUp(i: number): void {
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
	 * @param i Index of item to sift down
	 */
	private _siftDown(i: number): void {
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
 *
 * Time complexity: O(log n) average case for search
 * Space complexity: O(n) for storing the tree
 */
export class VPTree<T> {
	private distance: DistanceFunction<T>;
	private root: VPTreeNode<T> | null;

	/**
	 * Creates a new Vantage Point Tree from a set of points
	 * @param points Array of points to build the tree from
	 * @param distanceFn Function to calculate distance between two points
	 */
	constructor(points: T[], distanceFn: DistanceFunction<T>) {
		this.distance = distanceFn;
		this.root = this._build([...points]); // Clone to avoid mutating input
	}

	/**
	 * Recursively builds the tree structure from an array of points
	 * @param points Array of points to build the subtree from
	 * @return The root node of the subtree
	 */
	private _build(points: T[]): VPTreeNode<T> | null {
		if (points.length === 0) return null;

		// Pick a random vantage point
		const i = Math.floor(Math.random() * points.length);
		const vantagePoint = points[i];
		const rest = points.slice(0, i).concat(points.slice(i + 1));

		const node: VPTreeNode<T> = {
			point: vantagePoint,
			threshold: 0,
			left: null,
			right: null,
		};

		if (rest.length === 0) {
			return node;
		}

		// Calculate distances from vantage point to all other points
		const distances = rest.map((p) => ({
			point: p,
			dist: this.distance(p, vantagePoint),
		}));

		// Sort by distance and find median
		distances.sort((a, b) => a.dist - b.dist);
		const median = Math.floor(distances.length / 2);
		node.threshold = distances[median].dist;

		// Build left subtree (closer points) and right subtree (further points)
		node.left = this._build(distances.slice(0, median).map((d) => d.point));
		node.right = this._build(distances.slice(median).map((d) => d.point));

		return node;
	}

	/**
	 * Searches for the closest points to the target
	 * @param target The target point to find neighbors for
	 * @param maxResults Maximum number of results to return (default: 1)
	 * @return Array of closest points, sorted by distance (nearest first)
	 */
	search(target: T, maxResults: number = 1): T[] {
		const heap = new MaxHeap<T>(maxResults);

		const searchNode = (node: VPTreeNode<T> | null): void => {
			if (!node) return;

			// Calculate distance between target and current vantage point
			const dist = this.distance(target, node.point);

			// If we haven't filled heap yet or if this point is closer than furthest in heap
			const peekDist = heap.peek()?.dist;
			if (
				heap.data.length < maxResults ||
				(peekDist !== undefined && dist < peekDist)
			) {
				heap.push({ point: node.point, dist });
			}

			// Determine which subtree to search first (closer one has priority)
			const side: "left" | "right" = dist < node.threshold ? "left" : "right";
			const other: "left" | "right" = side === "left" ? "right" : "left";

			// Search the closer subtree first
			if (node[side]) searchNode(node[side]);

			// Check if we need to search the other subtree
			// Only needed if the distance from target to threshold is less than our worst match
			const maxDist =
				heap.data.length < maxResults
					? Infinity
					: (heap.peek()?.dist ?? Infinity);
			if (node[other] && Math.abs(dist - node.threshold) < maxDist) {
				searchNode(node[other]);
			}
		};

		searchNode(this.root);
		return heap.toSortedArray().map((h) => h.point);
	}

	/**
	 * Returns true if the tree is empty
	 */
	isEmpty(): boolean {
		return this.root === null;
	}
}
