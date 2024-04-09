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

const SHA256 = require('crypto-js/sha256')
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt') // https://www.npmjs.com/package/bcrypt
const saltRounds = 10;

/*
    accountFactory => sql => constructor
    or
    web => accountFactory => sql => constructor
*/

// Wip
class UserAccount
{
    constructor(userName,
        userEmail,
        userUUID = uuidv4(),
        accountType = 0,
        plaintxtPassword = undefined,
        privatePassword = undefined,
        registered = false)
    {

        // @user
        this.userName = userName
        //this.userEmail = userEmail
        this.userUUID = userUUID

        this.accountType = accountType
        this.plaintxtPassword = plaintxtPassword
        this.privatePassword = privatePassword

        this.registered = registered
        this.authorized = false

        if (!this.registered) { this.registerUser() }


    }

    // Wip
    getAccountNodes(public = false) {
        // => search records * uuid
        // => get unique positional references
        // => search positions for oldest block
        // => trim non-ownership blocks
        return
    }

    // Wip
    registerUser() {
        // check if username/email exists in db

        // hash plaintxt password
        this.privatePassword = bcrypt.hashSync(this.plaintxtPassword, saltRounds)

        // add to database

        // notify system user registered
        this.registered = true
    }

    // Wip
    /**
     * Test plaintxt against hashed passwords.
     * Success returns `true` to receive cookie.
     * @returns {boolean}
     */
    authorize() {

        // Cannot authorize if no password given
        if (this.plaintxtPassword == undefined) { return false }

        if (bcrypt.compareSync(this.plaintxtPassword, this.privatePassword)) {
            this.authorized = true
            this.plaintxtPassword = undefined
            return true
        } else {
            this.authorized = false
            this.plaintxtPassword = undefined
            return false
        }
        
    }

    async read(userUUID) {
        var user = await db.Users.findOne({
            where: {
                uuid: userUUID
            }
        })

        return user
    }
}