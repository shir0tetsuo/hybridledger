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

async function getUser(userName) { return user = db.Users.findOne({ where: { userName: this.userName }}) }

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


    updateEmoji()
    {

    }


    updatePublicName()
    {

    }


    updateUserEmail()
    {

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

    }

    async getUserFirstBlock()
    {

    }

    async authorize() 
    {
        if (!this.passwordToCompare || this.passwordToCompare == undefined) { return false }


        const User = await getUser(this.userName);


        if (!User) { return false } // Don't login if user doesn't exist
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
                
                this.passwordToCompare = undefined

                await db.Users.update({lastIP: this.lastIP},{where:{userName: User.userName}})
                return true
            } else { return false } // Don't login if passwords don't match
        }

    }

    /**
     * @requires logged-in, `(userLastBlock != undefined)`
     * @returns calculation of time remaining before able to mint again
     */
    async getMintingDelta()
    {
        //if (this.accountType == 3) { return 1 }

        let lastBlock = await this.getUserLastBlock()
    }
}

async function callUserAccount(plaintextPasswd, lastIP, username)
{
    var uac = new UserAccount(plaintextPasswd, lastIP, username)
    var authorized = await uac.authorize();
    // if (authorized) { var sessionKey = uac.sessionKey; return uac }
}

module.exports = {getUser, callUserAccount}