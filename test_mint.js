// require block.js class Block
const Block = require('./module/block.js')
const HybridLedgers = require('./module/ledger.js')
const sysmath = require('./module/math.js')

let testUser = sysmath.newUUID()

//m = new Block(0, '0x0,0x0', testUser, 0, 'Hello, World!')

//m.mint(4)
//m.debug()


HybridLedgers.callHybridLedger('0x0,0x0').then((HL) => {
    console.log(HL.ledger[0])
    HL.lastBlock.debug()
    console.log('LEDGER_VALUE:',HL.getValue())
})