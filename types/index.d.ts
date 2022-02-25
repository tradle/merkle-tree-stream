import { Transform } from 'streamx';
import { CLOSE_UP } from './util';
import { MerkleTreeOpts, Parent, Node } from './types';

declare class MerkleTreeStream <Hash> extends Transform<
  Buffer | Uint8Array | string | typeof CLOSE_UP,
  Node<Hash>
> {
  static CLOSE_UP: typeof CLOSE_UP;

  constructor(opts: MerkleTreeOpts<Hash>, roots?: Array<Parent<Hash>>);
}

export = MerkleTreeStream;
