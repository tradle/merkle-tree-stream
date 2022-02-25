import { MerkleGeneratorOpts, Node, Parent, LeafHash, ParentHash } from './types';
import { CLOSE_UP } from './util';

declare class MerkleGenerator<Hash> {
  static CLOSE_UP: typeof CLOSE_UP;

  roots: Array<Parent<Hash>>;
  blocks: number;

  _leaf: LeafHash<Hash>;
  _parent: ParentHash<Hash>;

  constructor(opts: MerkleGeneratorOpts<Hash>, roots?: Array<Parent<Hash>>);
  next(data: Buffer | Uint8Array | string | typeof CLOSE_UP, nodes: Array<Node<Hash>>): Array<Node<Hash>>;
}

export = MerkleGenerator;
