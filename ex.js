// use: `npm i -g dupsh && dupsh "node ex true" "node ex false"`

const Noise = require('.')
const Cipher = require('./cipher')

function write (m) {
  console.error('WRITE:', m.length, m)
  process.stdout.write(m)
}

// read + accum stdin
let buffer = Buffer.alloc(0)
process.stdin.on('data', buf => {
  buffer = Buffer.concat([buffer, buf])
  console.error('BUFFER:', buffer)
  process.stdin.emit('more')
})

function dataReady () {
  return new Promise((resolve, reject) => {
    process.stdin.once('more', resolve)
  })
}

async function readBytes (num) {
  while (buffer.length < num) {
    await dataReady()
  }
  const data = Buffer.alloc(num)
  buffer.copy(data, 0, 0, num)
  buffer = buffer.slice(num)
  return data
}

async function mainInitiator () {
  const psk = Buffer.from('324eee92611cd877841c4de9fd5253e9dba6033329a837ee5f01beb005dffb2f', 'hex')
  const initiator = new Noise('NNpsk0', true, null, { psk })
  const prologue = Buffer.from('CABLE')

  initiator.initialise(prologue)

  write(initiator.send())
  initiator.recv(await readBytes(48))

  console.error('COMPLETE?', initiator.complete) // true

  const tx = new Cipher(initiator.tx)
  // const rx = new Cipher(initiator.rx)

  write(tx.encrypt(Buffer.from('hi thar! it is me, initi nodejs!')))
  // console.error('DECRYPT:', rx.decrypt(await readBytes(48)).toString())

  console.error('done')
}

async function mainResponder () {
  const psk = Buffer.from('324eee92611cd877841c4de9fd5253e9dba6033329a837ee5f01beb005dffb2f', 'hex')
  const responder = new Noise('NNpsk0', false, null, { psk })
  const prologue = Buffer.from('CABLE')

  responder.initialise(prologue)

  responder.recv(await readBytes(48))
  write(responder.send())

  console.error('COMPLETE?', responder.complete) // true

  // const tx = new Cipher(responder.tx)
  const rx = new Cipher(responder.rx)

  console.error('waiting on msg')
  console.error('DECRYPT:', rx.decrypt(await readBytes(48)).toString())
  // write(tx.encrypt(Buffer.from("hi thar! it is me, responder nodejs!")))

  console.error('done')
}

if (process.argv[2] === 'true') mainInitiator()
else if (process.argv[2] === 'false') mainResponder()
else { console.log('ERR: 1st arg MUST be "true" or "false" (no quotes)'); process.exit(1) }

