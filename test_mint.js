// require block.js class Block
const Block = require('./module/block.js')
const HybridLedger = require('./module/ledger.js')


const sysmath = require('./module/math.js')

let testUser = sysmath.newUUID()

//m = new Block(0, '0x0,0x0', testUser, 0, 'Hello, World!')

//m.mint(4)
//m.debug()


// create async function for hybrid ledger
async function callHybridLedger(position) {
    // create hybrid ledger
    HL = await new HybridLedger(position)
    BLOCKS = await HL.getBlocks()

    var ledger = BLOCKS

    return ledger
}

callHybridLedger('0x0,0x0').then((HL) => {
    console.log(HL[0])
})