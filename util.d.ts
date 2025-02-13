import { Node, Leaf, Parent } from './types.js';

declare class CloseUp {}

export function isParent <Hash>(node: Node<Hash>): node is Parent<Hash>;
export function isLeaf <Hash>(node: Node<Hash>): node is Leaf<Hash>;
export const CLOSE_UP: CloseUp;

export {};
