// require block.js class Block
const Block = require('./module/block.js')
const Users = require('./module/user.js')
const HybridLedgers = require('./module/ledger.js')
const sysmath = require('./module/math.js')

let testUser = 'c31a83ff-6aa5-4e6c-a2c2-023af54d850f'//sysmath.newUUID()

HybridLedgers.callHybridLedger('0,6').then((HL) => {
    //HL.debug()
    m = new Block(0, '0,6', testUser, 2, '! THIS IS A TEST BLOCK ! Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Est lorem ipsum dolor sit amet consectetur adipiscing elit pellentesque. Bibendum ut tristique et egestas. Mattis pellentesque id nibh tortor id. Nisi scelerisque eu ultrices vitae auctor. Egestas sed tempus urna et pharetra pharetra massa. Porttitor massa id neque aliquam vestibulum morbi. Nec feugiat in fermentum posuere. Scelerisque felis imperdiet proin fermentum leo vel. Nec nam aliquam sem et tortor consequat. Phasellus faucibus scelerisque eleifend donec pretium. Nullam ac tortor vitae purus faucibus. Tempus egestas sed sed risus. Risus feugiat in ante metus dictum at tempor commodo ullamcorper. Consectetur purus ut faucibus pulvinar elementum integer enim neque. Quam viverra orci sagittis eu volutpat odio facilisis. Lobortis elementum nibh tellus molestie nunc. Purus in massa tempor nec. Amet aliquam id diam maecenas ultricies.')
    m.mint(4)
    HL.commit(m).then((HL) => {
        console.log('! LAST BLOCK !')
        HL.lastBlock.debug()
    })
})
