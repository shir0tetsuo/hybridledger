// require block.js class Block
const Block = require('./module/block.js')

m = new Block(0, '0x0,0x0')

m.mint(4)

// wait 10 seconds
setTimeout(() => {
    console.log(m.getValue())
}, 30000)

setTimeout(() => {
    console.log(m.getValue())
}, 5000)