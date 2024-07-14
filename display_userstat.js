// require block.js class Block
const Block = require('./module/block.js')
const Users = require('./module/user.js')
const HybridLedgers = require('./module/ledger.js')
const sysmath = require('./module/math.js')
const db = require('./module/db.js')

const displayUsers = async () => {
    try {
        // Fetch all users
        const users = await db.Users.findAll()
        console.log('All users:', JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

// Call the function to display users
displayUsers();