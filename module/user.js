//
// MIT License
//
// Copyright (c) 2024 shir0tetsuo
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//

const db = require('./db.js');
const SHA256 = require('crypto-js/sha256')
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt') // https://www.npmjs.com/package/bcrypt
const saltRounds = 10;

/**
 * User Profile:
 * 
 *  * = Generated
 *  v = Deterministic (Function)
 * 
 * *- UUID
 *  - User Name
 *  - User Email
 *  - {boolean} Display Email
 * 
 * v- User Profile Graphic
 * 
 *  - Account Type (Guest=0, User=1, Moderator=2, Admin=3)
 * 
 * *- Last IP Address
 * 
 *  - Plaintext Password (undefined when converted to protected)
 * *- Protected Password
 */


async function getUser(userName) { return user = await db.Users.findOne({ where: { userName: userName }}) }

async function getUserByUUID(userUUID) { return user = await db.Users.findOne({ where: { userUUID: userUUID }}) }

/**
 * Deactivate the Account (set accountType = 0), admin only
 */
async function suspend(userUUID)
{
    await db.Users.update({accountType: 0}, {where: {userUUID: userUUID}})
}

class UserAccount
{
    constructor(plaintextPasswd, lastIP = 'localhost', username='Guest', userUUID=uuidv4())
    {
        // new users get new UUID
        this.userUUID = userUUID

        // also determines logged in status
        this.accountType = 0

        this.userName = username
        this.publicName = username
        this.userEmail = 'example@example.com'

        // admins get a calculated golden shim
        this.vertA = undefined // deterministic
        this.vertB = undefined // deterministic
        this.vertC = undefined // deterministic
        this.vertD = undefined // deterministic
        this.emoji = '⛩️' // User-Set Default

        // erased at login/registration
        this.passwordToCompare = plaintextPasswd

        this.displayEmail = false

        this.lastIP = lastIP
        this.sessionKey = uuidv4() // for {sessionKey:UserAccount}
    }

    debug()
    {
        // console.log everything in this
        console.log('UUID:',this.userUUID)
        console.log('ACCOUNTTYPE:',this.accountType)
        console.log('USERNAME:',this.userName)
        console.log('PUBLICNAME:',this.publicName)
        console.log('USEREMAIL:',this.userEmail)
        console.log('EMOJI:',this.emoji)
        console.log('DISPLAYEMAIL:',this.displayEmail)
        console.log('LASTIP',this.lastIP)
        console.log('SESSIONKEY',this.sessionKey)
        if (!this.passwordToCompare || this.passwordToCompare == undefined)
        {
            console.log('NO PASSWORD TO COMPARE')
        } else {
            console.log('COMPAREPASSWD: TRUE')
        }
    }


    /**
     * Directly update emoji in db.
     * 
     * @param {string} newEmoji 
     */
    async updateEmoji(newEmoji)
    {
        this.emoji = newEmoji
        await db.Users.update({emoji: newEmoji}, {where: { userName: this.userName }})
    }


    /**
     * Directly update public name in db.
     * 
     * @param {string} newPublicName
     */
    async updatePublicName(newPublicName)
    {
        this.publicName = newPublicName
        await db.Users.update({publicName: newPublicName}, {where: { userName: this.userName }})
    }


    /**
     * Directly update email string in db.
     * 
     * @param {string} newEmail 
     */
    async updateUserEmail(newEmail)
    {
        this.userEmail = newEmail
        await db.Users.update({userEmail: newUserEmail}, {where: { userName: this.userName }})
    }


    /**
     * Directly update display email boolean in db.
     * 
     * @param {boolean} displayBool 
     */
    async updateDisplayEmail(displayBool)
    {
        this.displayEmail = displayBool
        await db.Users.update({displayEmail: displayBool}, {where: { userName: this.userName }})
    }

    /**
     * Directly update user password in db.
     * 
     * @param {string} newPassword 
     */
    async updateUserPassword(newPassword)
    {
        let privatePassword = bcrypt.hashSync(newPassword, saltRounds);
        await db.Users.update({privatePassword: privatePassword}, {where: { userName: this.userName }});
    }


    /**
     * registration = `await register()`
     * 
     * `(if registration) { SessionKey = UserAccount.sessionKey } ...`
     * 
     * @requires this.passwordToCompare
     * @returns Promise {boolean}
     */
    async register() 
    {
        // Generate the Private Password
        let privatePassword = bcrypt.hashSync(this.passwordToCompare, saltRounds);
        
        try {
            const User = db.Users.create({
                userUUID: this.userUUID,
                userName: this.userName,
                userEmail: this.userEmail,
                publicName: this.publicName,
                accountType: 1,
                emoji: this.emoji,
                displayEmail: this.displayEmail,
                privatePassword: privatePassword,
                lastIP: this.lastIP            
            })
        } catch (e) {
            console.log(e)
            return false
        } finally {
            this.passwordToCompare = undefined;
            return true
        }
    }

    async getUserLastBlock()
    {
        // Get the last block in the database that contains the user's ownership

        const lastBlock = await db.Ledgers.findOne({
            where: {
                ownership: this.userUUID
            },
            order: [
                // use timestamp as order and use the greatest value
                ['timestamp', 'DESC']
            ]
        });

        if (!lastBlock) { return false } // can mint first block immediately

        return lastBlock
    }

    async getUserFirstBlock()
    {
        const firstBlock = await db.Ledgers.findOne({
            where: {
                ownership: this.userUUID
            },
            order: [
                // use timestamp as order and use the lowest value
                ['timestamp', 'ASC']
            ]
        });

        if (!firstBlock) { return false }

        return firstBlock
    }

    async getNumBlocks()
    {
        // Obtain total number (length) of db.Ledgers where ownership is user UUID
        const numBlocks = await db.Ledgers.count({
            where: {
                ownership: this.userUUID
            }
        });

        // If there are none, return 0
        if (!numBlocks || numBlocks.length == 0 || numBlocks == undefined) { return 0 }

        return numBlocks
    }

    /**
     * 
     * @returns `db.Users: User => this`
     */
    async authorize() {
        try {
            if (!this.passwordToCompare || this.passwordToCompare == undefined) { console.log('! No Password'); return }
    
            const User = await getUser(this.userName);
    
            if (!User) { console.log('! No User'); return } // Don't login if user doesn't exist
            else {
                // If the user exists, compare the plaintext password against the private hashed password;
                if (bcrypt.compareSync(this.passwordToCompare, User.privatePassword)) {
                    // Push variables to class
                    this.userUUID = User.userUUID
                    this.userEmail = User.userEmail
                    this.publicName = User.publicName
                    this.accountType = User.accountType
                    this.emoji = User.emoji
                    this.displayEmail = User.displayEmail
                    
                    // Destroy plaintext password
                    this.passwordToCompare = undefined
    
                    // Push Last IP Address to database
                    await db.Users.update({lastIP: this.lastIP},{where:{userName: User.userName}})
                }
            }
        } catch (error) {
            console.log(error)
        }
    }

    /**
     * Return exact time before able to mint again. If negative value or 0, user should
     * be able to mint a new block.
     * 
     * Personal realm is unlimited use, but contains the same ownership,
     * therefore minted personal blocks will also increment the mint time
     * in the public realm.
     * 
     * Might want to change this in the future.
     * 
     * @requires logged-in, `(userLastBlock != undefined)`
     * @param {number} divide users may acquire boosters that cut minting time
     * @returns calculation of time remaining before able to mint again
     */
    async timeToMint(divide = 1)
    {
        // admin can mint immediately
        if (this.accountType == 3) { return 0 }

        // moderator mint time cut in half
        if (this.accountType == 2) { divide += 1 }

        // integer for Now
        let now = new Date().getTime()

        // Get the user's last minted block
        let lastBlock = await this.getUserLastBlock();

        // No blocks => mint immediately
        if (!lastBlock || lastBlock == false) { return 0 }

        // Get num of user's minted blocks
        let mintedBlocks = await this.getNumBlocks();

        // last block timestamp
        let lastMintTS = lastBlock.timestamp;
        
        // datetime to pass (ts+(n*.5s))
        let mintDelta = (lastMintTS + Math.floor((mintedBlocks * 500)/divide))

        // Calculate the time remaining until user can mint again
        let timeRemaining = mintDelta - now

        return timeRemaining
    }
}

/**
 * Initialize a user account template. 
 * Guests may only read and not mint.
 * 
 * Use return to control settings, db management;
 * `{sessionKey (from cookie) : UserAccount}`
 * 
 * @param {string} plaintextPasswd 
 * @param {string} lastIP 
 * @param {string} username 
 * @returns {UserAccount}
 */
async function callUserAccount(plaintextPasswd, lastIP, username)
{
    // Init UserAccount Class
    var uac = new UserAccount(plaintextPasswd, lastIP, username)

    // Check user, passwd against db, update uac
    await uac.authorize();

    // Return the UserAccount class
    return uac
}

/**
 * Return time to mint based on timeRemaining in timeToMint.
 * 
 * @param {UserAccount} uac 
 * @returns {number} timeRemaining (for timers)
 */
async function callTimeToMint(uac, divide = 1) { let timeToMint = await uac.timeToMint(divide); return timeToMint; }

module.exports = {
    // Read (db)
    getUser, 
    getUserByUUID, 
    
    // Admin
    suspend, 
    
    // Read/Write/Update (uac)
    callUserAccount, 
    callTimeToMint,
}