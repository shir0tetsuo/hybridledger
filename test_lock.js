// require block.js class Block
const Block = require('./module/block.js')
const Users = require('./module/user.js')
const HybridLedgers = require('./module/ledger.js')
const sysmath = require('./module/math.js')

let testUser = 'c31a83ff-6aa5-4e6c-a2c2-023af54d850f'//sysmath.newUUID()

HybridLedgers.callHybridLedger('0,0').then((HL) => {
    //HL.debug()
    m = new Block(HL.lastBlock.index+1, '0,0', testUser, 5, '<gold>This block locks the ledger.</gold>',HL.lastBlock.hash)
    m.mint(3)
    HL.commit(m).then((HL) => {
        console.log('! LAST BLOCK !')
        HL.lastBlock.debug()
    })
})
