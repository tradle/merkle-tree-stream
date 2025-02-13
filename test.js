const tape = require('tape')
const crypto = require('crypto')
const MerkleTreeStream = require('./')
const MerkleGenerator = require('./generator')
const util = require('./util')
const isLeaf = util.isLeaf
const isParent = util.isParent

const opts = {
  leaf: function (leaf) {
    return hash([leaf.data])
  },
  parent: function (a, b) {
    return hash([a.hash, b.hash])
  }
}

tape('hashes', function (t) {
  const stream = new MerkleTreeStream(opts)

  stream.write('a')
  stream.write('b')
  stream.end()

  const expected = [{
    index: 0,
    parent: 1,
    hash: hash(['a']),
    size: 1,
    data: Buffer.from('a')
  }, {
    index: 2,
    parent: 1,
    hash: hash(['b']),
    size: 1,
    data: Buffer.from('b')
  }, {
    index: 1,
    parent: 3,
    size: 2,
    hash: hash([hash(['a']), hash(['b'])]),
    data: null
  }]

  stream.on('data', function (data) {
    t.same(data, expected.shift(), 'hashes data')
  })

  stream.on('end', function () {
    t.same(expected.length, 0, 'no more data')
    t.end()
  })
})

tape('one root on power of two', function (t) {
  const stream = new MerkleTreeStream(opts)

  stream.write('a')
  stream.write('b')
  stream.write('c')
  stream.write('d')
  stream.end()

  stream.resume()
  stream.on('end', function () {
    t.same(stream.roots.length, 1, 'one root')
    t.end()
  })
})

tape('multiple roots if not power of two', function (t) {
  const stream = new MerkleTreeStream(opts)

  stream.write('a')
  stream.write('b')
  stream.write('c')
  stream.end()

  stream.resume()
  stream.on('end', function () {
    t.ok(stream.roots.length > 1, 'more than one root')
    t.end()
  })
})

tape('starting of with roots for generation', function (t) {
  // Started with nodes 'a', 'b', 'c', 'd', 'e'
  const gen = new MerkleGenerator(Object.assign({}, opts, {
    roots: [
      {
        index: 3,
        size: 4,
        hash: Buffer.from('14ede5e8e97ad9372327728f5099b95604a39593cac3bd38a343ad76205213e7', 'hex'),
        data: null
      },
      {
        index: 8,
        size: 1,
        hash: Buffer.from('3f79bb7b435b05321651daefd374cdc681dc06faa65e374e38337b88ca046dea', 'hex'),
        data: Buffer.from('65', 'hex')
      }
    ]
  }))
  const nodes = []
  gen.next('f', nodes)
  gen.next('g', nodes)
  gen.next('h', nodes)

  t.deepEqual(gen.roots, [
    {
      index: 7,
      parent: 15,
      hash: Buffer.from('bd7c8a900be9b67ba7df5c78a652a8474aedd78adb5083e80e49d9479138a23f', 'hex'),
      size: 8,
      data: null
    }
  ])
  t.end()
})

tape('requiring input leaf/parent option', function (t) {
  t.throws(function () { return new MerkleGenerator({}) })
  t.throws(function () { return new MerkleGenerator({ leaf: function () {} }) })
  t.end()
})

tape('highwatermark while streaming', function (t) {
  // verified by coverage
  const stream = new MerkleTreeStream(Object.assign({}, opts, {
    highWaterMark: 8
  }))
  t.notEqual(stream, null)
  t.end()
})

tape('isLeaf/isParent test', function (t) {
  const gen = new MerkleGenerator(opts)
  const nodes = []
  gen.next('a', nodes)
  gen.next('b', nodes)
  ;[isLeaf, isLeaf, isParent].forEach(function (expected, index) {
    const entry = nodes[index]
    const unexpected = (expected === isLeaf ? isParent : isLeaf)
    t.ok(expected(entry), 'Entry #' + index + ' ' + expected.name)
    t.equal(unexpected(entry), false, 'Entry #' + index + ' not ' + unexpected.name)
  })
  t.end()
})

;[true, false].forEach(function (manual) {
  tape('close up to one root [' + (manual ? 'manual' : 'automatic') + ']', function (t) {
    const stream = new MerkleTreeStream({
      leaf: function (leaf) {
        return Buffer.from(leaf.data + leaf.data)
      },
      parent: function (a, b) {
        return Buffer.concat([a.hash, b.hash])
      },
      closeUp: !manual
    })

    const nodes = []
    stream.on('data', function (node) {
      nodes.push(node)
    })

    stream.write('a')
    stream.write('b')
    stream.write('c')
    stream.write('d')
    stream.write('e')
    if (manual) {
      stream.write(MerkleTreeStream.CLOSE_UP)
    }
    stream.end()

    stream.on('end', function () {
      t.notOk(stream.roots.length > 1, 'only one root')
      t.equal(stream.roots[0].hash.toString(), 'aabbccddeeeeeeee')

      nodes.sort(function (a, b) {
        return a.index - b.index
      })

      t.deepEqual(nodes.map(function (n) {
        n.data = n.data && n.data.toString()
        n.hash = n.hash.toString()
        return n
      }), [
        { data: 'a', hash: 'aa', index: 0, parent: 1, size: 1 },
        { data: null, hash: 'aabb', index: 1, parent: 3, size: 2 },
        { data: 'b', hash: 'bb', index: 2, parent: 1, size: 1 },
        { data: null, hash: 'aabbccdd', index: 3, parent: 7, size: 4 },
        { data: 'c', hash: 'cc', index: 4, parent: 5, size: 1 },
        { data: null, hash: 'ccdd', index: 5, parent: 3, size: 2 },
        { data: 'd', hash: 'dd', index: 6, parent: 5, size: 1 },
        { data: null, hash: 'aabbccddeeeeeeee', index: 7, parent: 15, size: 8 },
        { data: 'e', hash: 'ee', index: 8, parent: 9, size: 1 },
        { data: null, hash: 'eeee', index: 9, parent: 11, size: 2 },
        { data: null, hash: 'eeeeeeee', index: 11, parent: 7, size: 4 }
      ])

      t.end()
    })
  })
})

function hash (list) {
  const sha = crypto.createHash('sha256')
  for (let i = 0; i < list.length; i++) sha.update(list[i])
  return sha.digest()
}
