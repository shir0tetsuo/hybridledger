// require block.js class Block
const Block = require('./module/block.js')
const Users = require('./module/user.js')
const HybridLedgers = require('./module/ledger.js')
const sysmath = require('./module/math.js')

let testUser = sysmath.newUUID()

HybridLedgers.callHybridLedger('0,0e').then((HL) => {
    //HL.debug()
    m = new Block(0, '0,0e', testUser, 0, 'Hello, World!')
    m.mint(4)
    m.debug()
})
