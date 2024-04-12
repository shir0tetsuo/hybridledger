// require block.js class Block
const Block = require('./module/block.js')
const Users = require('./module/user.js')
const HybridLedgers = require('./module/ledger.js')
const sysmath = require('./module/math.js')

//let testUser = sysmath.newUUID()

Users.callUserAccount('secret_debugging_password', 'localhost', 'shadowsword').then((UAC) => {
    //UAC.passwordToCompare = 'debugging_password'
    //UAC.register()
    if (UAC.accountType == 0) {
        console.log('! The user will be logged in as a Guest.')
    } else {
        console.log('+ User Logged In.')
    }
    UAC.debug()
    console.log(UAC.userUUID)

    HybridLedgers.callHybridLedger('0x0,0x0').then((HL) => {
        console.log(HL.ledger[0])
        HL.lastBlock.debug()
        console.log('----')
        console.log('LEDGER_VALUE:',HL.getValue())
        console.log('OWNERSHIP:', HL.ownership)
        console.log('REALM:', HL.realm)
        console.log(HL.lastBlock)
        HL.mintByAuthorizing(UAC.userUUID, 'Hello, World!')
        HL.lastBlock.debug()
    })

})



//m = new Block(0, '0x0,0x0', testUser, 0, 'Hello, World!')

//m.mint(4)
//m.debug()


