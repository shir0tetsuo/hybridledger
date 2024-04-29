// require block.js class Block
const Block = require('./module/block.js')
const Users = require('./module/user.js')
const HybridLedgers = require('./module/ledger.js')
const sysmath = require('./module/math.js')

let testUser = 'c31a83ff-6aa5-4e6c-a2c2-023af54d850f'//sysmath.newUUID()

HybridLedgers.callHybridLedger('0,0').then((HL) => {
    //HL.debug()
    m = new Block(0, '0,1', testUser, 1, 'Genesis')
    m.mint(2)
    HL.commit(m).then((HL) => {
        console.log('! LAST BLOCK !')
        HL.lastBlock.debug()
    })
})
