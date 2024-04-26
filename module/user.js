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
const HybridLedgers = require('./ledger.js')
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

/**
 * 
 * @returns {dict}
 */
function blankAccount()
{
    account = {
        userUUID: uuidv4(),
        accountType: 0,
        userName: 'None',
        publicName: 'None',
        userEmail: 'ghost@shadowsword.ca',
        emoji: '⛩️',
        created: 'Unknown',
        passwordToCompare: undefined,
        displayEmail: false,
        //sessionKey: uuidv4()
    }
    return account
}

/**
 * 
 * Is user authorized to mint?
 * Calls `uac.netValue()`
 * and `HybridLedgers.callHybridLedger()`
 * for user's owned ledgers, transacted
 * blocks;
 * 
 * @param {HybridLedger} HL Hybrid Ledger
 * @param {UserAccount} uac User Account
 * @returns {boolean}
 */
async function checkAuthorization(HL, uac)
{
    // Admin does what admin wants.
    if ( uac.accountType >= 3 ) { console.log('! Auth Grant to Admin');
        return true }

    // Guests cannot mint.
    if ( uac.accountType == 0 ) { return false }

    // Time left before mint must not be greater than zero
    let time_left = await uac.timeToMint();
    if ( time_left > 0 ) { return false }

    // Users cannot mint over locked blocks, but moderators can.
    // Once a ledger lastBlock is locked, it can only be undone by a moderator+.
    if ( uac.accountType < 2 && HL.lastBlock.blockType == 5 ) { return false }

    // If the user+'s ownership is the last block's ownership,
    // the user+ can mint. If the ownership is '0', user can mint.
    if ( uac.userUUID == HL.lastBlock.ownership || HL.lastBlock.ownership == '0' ) { return true }
    
    // User net value must be greater than block's value.
    uacNV = await uac.netValue();
    if (uacNV < HL.getValue()) { return false }

    // Authorized: User+ can mint!
    return true
}

class UserAccount
{
    constructor(plaintextPasswd, username='Guest', userUUID=uuidv4())
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

        this.created = 'Unknown' // Update from db .createdAt

        // erased at login/registration
        this.passwordToCompare = plaintextPasswd

        this.displayEmail = false

        this.sessionKey = uuidv4() // for {sessionKey:UserAccount}
    }

    /**
     * 
     * Get the uac's net value minus transaction blocks.
     * Used for take-over calc.
     * 
     * @returns {number} user-net-value
     */
    async netValue()
    {
        // Access blocks from db
        let UserBlocks = await db.Ledgers.findAll({where: {ownership: this.userUUID} })
        
        // Return zero net value if user has no blocks
        // (zero mint power over other ledgers).
        if (!UserBlocks || UserBlocks == undefined || UserBlocks.length == 0) { return 0 }
        

        // 1 => Get unique positions by user's blocks.
        var uniqueLedgerPositions = []
        for (let block in UserBlocks) {
            if (!uniqueLedgerPositions.includes(block.position)) {
                uniqueLedgerPositions.push(block.position)
            }
        }

        // 2 => If the ledgers' ownerships are account's,
        //      get the ledger's value, push to total value.
        var HLValue = 0;
        for (let uniquePosition in uniqueLedgerPositions) {
            // trim lastBlock.ownership != uac.userUUID
            let inspectHL = await HybridLedgers.callHybridLedger(uniquePosition);
            if (inspectHL.lastBlock.ownership == this.userUUID) {
                HLValue += inspectHL.getValue()
            }
        }

        // 3 => transaction value reduction
        //      from all user's blocks
        //      (data = value to decrease)
        var TXValue = 0;
        for (let block in UserBlocks) {
            if (block.blockType == 3) {
                TXValue += parseFloat(block.data)
            }
        }

        // HLValue is total value by ledger ownership.
        // TXValue decreases total value.
        let netValue = (HLValue - TXValue)

        return netValue
    }

    debug()
    {
        // console.log everything in this
        console.log('-- UserAccount.debug() --')
        console.log('UUID:',this.userUUID)
        console.log('ACCOUNTTYPE:',this.accountType)
        console.log('USERNAME:',this.userName)
        console.log('PUBLICNAME:',this.publicName)
        console.log('USEREMAIL:',this.userEmail)
        console.log('EMOJI:',this.emoji)
        console.log('DISPLAYEMAIL:',this.displayEmail)
        console.log('SESSIONKEY:',this.sessionKey)
        console.log('CREATED:', this.created)
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
    async register() {
        try {
          // Generate the Private Password
          let privatePassword = bcrypt.hashSync(this.passwordToCompare, saltRounds);
      
          // Create the new user in the database
          const User = await db.Users.create({
            userUUID: this.userUUID,
            userName: this.userName,
            userEmail: this.userEmail,
            publicName: this.publicName,
            accountType: 1,
            emoji: this.emoji,
            displayEmail: this.displayEmail,
            privatePassword: privatePassword
          });
      
          // Set the account type to 1
          this.accountType = 1;
      
          // Erase the plaintext password
          this.passwordToCompare = undefined;
      
          // Set the private password
          this.privatePassword = privatePassword;
      
          // Debug the UserAccount
          this.debug();
      
          // Return true to indicate that the registration was successful
          return true;
        } catch (e) {
          console.log(e);
      
          // Return false to indicate that the registration failed
          return false;
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

    async authorizePrivate(privatePassword) {
        const User = await getUser(this.userName);
        if (User.privatePassword == privatePassword) {
            this.userUUID = User.userUUID
            this.userEmail = User.userEmail
            this.publicName = User.publicName
            this.accountType = User.accountType
            this.emoji = User.emoji
            this.displayEmail = User.displayEmail
            this.privatePassword = privatePassword
            this.created = User.createdAt
            //await db.Users.update({lastIP: this.lastIP},{where:{userName: User.userName}})
            return true
        } else { 
            console.log('! Private Password Mismatch !')
            return false }
    }

    /**
     * Authorize from a plaintext password.
     * 
     * @returns `db.Users: User => this`
     */
    async authorizePlaintxt() {
        try {
            if (!this.passwordToCompare || this.passwordToCompare == undefined) { console.log('! No Password'); return 2 }
    
            const User = await getUser(this.userName);
    
            if (!User) { console.log('! No User'); return 1 } // Don't login if user doesn't exist
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
                    this.created = User.createdAt
                    
                    // Destroy plaintext password
                    this.passwordToCompare = undefined

                    this.privatePassword = User.privatePassword
    
                    // Push Last IP Address to database
                    //await db.Users.update({lastIP: this.lastIP},{where:{userName: User.userName}})
                    return 0
                } else {
                    return 3
                }
            }
        } catch (error) {
            console.log(error)
            return 4
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
 * @param {string} username 
 * @returns {UserAccount}
 */
async function callUserAccountAuthPT(plaintextPasswd, username)
{
    // Init UserAccount Class
    var uac = new UserAccount(plaintextPasswd, username)

    // Check user, passwd against db, update uac
    await uac.authorizePlaintxt();

    // Return the UserAccount class
    return uac
}

/**
 * Check whether the user exists in db, and if the password matches.
 * 
 * @param {string} userName 
 * @param {string} privatePassword 
 * @returns 
 */
async function callUserPrivate(userName, privatePassword)
{
    const account = await db.Users.findOne({where: {userName: userName}})
    if (!account || account == undefined) { return false }
    else { 
        if (account.privatePassword == privatePassword) {
            return true
        } else {
            return false
        }
    }
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
    callUserAccount: callUserAccountAuthPT, 
    callUserAccountAuthPT,
    callTimeToMint,

    // uac logged in true/false
    callUserPrivate,

    blankAccount,

    checkAuthorization,

    // uac itself
    UserAccount
}