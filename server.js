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

/*
  TODO: Work on Page Navigator.
  TODO: Make /contact, /gate, and /user/uuid.
*/


// server application module
const express = require('express')

// require custom modules
const Block = require('./module/block.js')
const Users = require('./module/user.js')
const db = require('./module/db.js')
const HybridLedgers = require('./module/ledger.js')
const sysmath = require('./module/math.js')

// extended features
const bparse = require('body-parser') //https://codeforgeek.com/handle-get-post-request-express-4/
const cookies = require('cookie-parser') //https://stackoverflow.com/questions/16209145/how-to-set-cookie-in-node-js-using-express-framework

// fs
const ff = require('fs')
const fs = require('fs').promises;
const path = require('path');

// server decl
const server = express();
const port = 8155;

// include json
server.use(bparse.urlencoded({ extended: true }));
server.use(bparse.json());
server.use(express.json()) 

// cookies
server.use(cookies())

// Serve static content from /static
server.use('/static', express.static(path.resolve('./static')))
server.use('/favicon.ico', express.static(path.resolve('./favicon.ico')))

// private configuration
require("dotenv").config();

let application_start = new Date();

/**
 * Read file from fs like from `'/private'`
 * 
 * @param {string} filePath 
 * @returns {string} file data => `data.toString()`
 */
async function readFile(filePath) {
    try {
      const data = await fs.readFile(filePath);
      return data.toString()
    } catch (error) {
      console.error(`Read Error: ${error.message}`);
    }
}

/**
 * Replace any number of ${VARIABLES} in an .html file
 * by a given dict.
 *
 * @param {string} filePath
 * @param {siteMetadata} siteMeta
 * @returns {string} data
 */
async function replace(filePath, siteMeta) {
    var data = await readFile(filePath);
    for (var key in siteMeta.variablesToReplace) {
      data = data.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), siteMeta.variablesToReplace[key]);
    }
    return data;
}

/**
 * A place to store a dict of accounts with active sessions.
 * 
 * `key = userName`
 * `value = UserAccount`
 */
var loggedIn = {}

class siteMetadata
{
  constructor()
  {
    this.uac = undefined
    this.variablesToReplace = 
    {
      // defaults
      'TITLE': process.env.SITE,
      'SITEOWNER': process.env.SITEOWNER,
      'SITE': process.env.SITE,
      'SITENAME': process.env.SITENAME,
      'DESCRIPTION': 'shadowsword.ca Hybrid Ledger System. Create a minted immutable Hybrid Ledger using our new web application.',
      'DISCORDSITENAME': process.env.SITEADDRESS,
      'VERSION': process.env.VERSION,
      'SERVERSTART': `at ${application_start.toISOString()}`,
      'EXACTSERVERSTART': application_start.getTime()
    }
  }

  /**
   * Push UAC variables to class replace variables.
   * @returns {UserAccount} `this.uac`
   */
  pushUACToVariables()
  {
    let accountTypes = ['Guest', 'User', 'Moderator', 'Administrator']
    this.variablesToReplace['userUUID'] = this.uac.userUUID
    this.variablesToReplace['userName'] = this.uac.userName
    this.variablesToReplace['userEmail'] = this.uac.userEmail
    this.variablesToReplace['publicName'] = this.uac.publicName
    this.variablesToReplace['accountType'] = this.uac.accountType
    this.variablesToReplace['accountTypeStr'] = accountTypes[this.uac.accountType]
    this.variablesToReplace['emoji'] = this.uac.emoji
    this.variablesToReplace['displayEmail'] = this.uac.displayEmail
    this.variablesToReplace['uacCreatedAt'] = this.uac.created

    if (parseInt(this.uac.accountType) > 0) {
      this.variablesToReplace['LoginStatus'] = `(Authorized as ${accountTypes[this.uac.accountType]} - <a class="phasedYel" href="/logout">Logout</a>)`
    } else {
      this.variablesToReplace['LoginStatus'] = '(Not Logged In - Minting Disabled)'
    }

    return this.uac
  }

  /**
   * Push simple key/instruction to variables
   * 
   * @param {string} key 
   * @param {string} instruction 
   */
  pushVariable(key, instruction) { this.variablesToReplace[key] = instruction; return }

  /**
   * Pushes UAC data to keys in variablesToReplace
   */
  async UACHandler(req)
  {
    // cookies required to get uac
    let userName = req.cookies.userName
    let privatePassword = req.cookies.private

    // has cookies
    if ((userName && privatePassword) && userName != undefined && privatePassword != undefined) {

      // does private hash match? (boolean)
      let access = await Users.callUserPrivate(userName, privatePassword)

      // non-match: Create guest user uac
      if (!access || access == false) { 

        const uac = await new Users.UserAccount(undefined, 'Guest')
        this.uac = uac

        console.log('! Access Denied; return Guest account')

        return this.pushUACToVariables()

      } else {

        // match: Get uac by userName
        // check if userName exists in loggedIn, otherwise
        // create a new class instance for the user and return it;

        if (loggedIn[userName]) {

          this.uac = loggedIn[userName]

          console.log(`Returning Account: ${this.uac.userName}`)

          return this.pushUACToVariables()

        } else {
          
          const uac = await new Users.UserAccount(undefined, userName)
          await uac.authorizePrivate(privatePassword)

          loggedIn[userName] = uac
          this.uac = uac

          console.log(`! Access Confirmed: Welcome Back, ${this.uac.userName}`)
          this.uac.debug()

          return this.pushUACToVariables()
        }

      }
     
    // no cookies => guest account
    } else {

      const uac = await new Users.UserAccount(undefined, 'Guest')
      this.uac = uac

      console.log('! Guest Account: No Cookies')

      return this.pushUACToVariables()
    }
    
  }
}

// get /
server.get('/', async(req, res) => { 
  // new siteMeta class
  var siteMeta = new siteMetadata()

  // get user account and variables from cookies
  var uac = await siteMeta.UACHandler(req)

  //uac.debug()
  
  const page_header = await replace('./private/header.html', siteMeta)
  const page_main = await replace('./private/homepage.html', siteMeta)

  let data = page_header + page_main
 
  // send res status 200 with data
  res.status(200).send(data)

  console.log(`200 OK / => ${uac.userName}`)
  // cleanup memory
  siteMeta = undefined
  uac = undefined
})

// get /uac
server.get('/uac', async(req, res) => { 
  var siteMeta = new siteMetadata()
  siteMeta.pushVariable('SITENAME', 'User Access Control')

  var uac = await siteMeta.UACHandler(req)

  const page_header = await replace('./private/header.html', siteMeta)
  const page_main = await replace('./private/uac/userAccessControlPage.html', siteMeta)

  let page_secondary
  if (uac.accountType > 0) {
    page_secondary = await replace('./private/uac/uacProfile.html', siteMeta)
  } else {
    page_secondary = await readFile('./private/uac/uacLogin.html')
  }

  let data = page_header + page_main + page_secondary

  res.status(200).send(data)

  console.log(`200 OK /uac => ${uac.userName}`)

  // cleanup memory
  siteMeta = undefined
  uac = undefined
})

// Boundary between systems for testing and info absorption
server.get('/gate', async(req, res) => {

})

server.get('/logout', async(req, res) => { 
  var siteMeta = new siteMetadata()
  siteMeta.pushVariable('SITENAME', 'User Access Control')
  const page_header = await replace('./private/header.html', siteMeta)
  const page_main = await readFile('./private/uac/logout.html')

  let data = page_header + page_main
  res.status(200).send(data)
})





/**
 * 
 * POST login
 * 
 */
server.post('/uac/login', async(req, res) => {
  let userName = req.body.user_name
  let plaintextPasswd = req.body.password
  let confirmpassword = req.body.confirmpassword

  if (!userName || userName == undefined || userName.length == 0) {

    return res.status(200).send({
      response: "There's no username provided.",
    })

  }

  var uac = await new Users.UserAccount(plaintextPasswd, userName)

  let auth = await uac.authorizePlaintxt()

  if (auth == 0) {

    return res.status(200).send({
      response: "Successful login! Please wait while we transfer the session.",
      user: userName,
      private: uac.privatePassword,
      reload: true
    })

  } else if (auth == 1) {

    if (confirmpassword == plaintextPasswd) {

      let registration = await uac.register()

      if (registration == true) {
        return res.status(200).send({
          response: "Welcome! Please wait while we transfer the session.",
          user: userName,
          private: uac.privatePassword,
          reload: true
        })
      } else {
        return res.status(200).send({
          response: "Couldn't generate user registration."
        })
      }

      
      
    } else {

      return res.status(200).send({
        response: "Please confirm your password to register your account.",
        confirmpass: true
      })

    }
    
  } else if (auth == 2) {

    return res.status(200).send({
      response: "No password provided.",
    })

  } else if (auth == 3) {

    return res.status(200).send({
      response: "Password Non-match",
    })

  } else {

    return res.status(200).send({
      response: "Something went wrong Please contact your administrator.",
    })

  }

})





// Start Server Listener
server.listen(
    port,
    () => console.log(`Connection open @ localhost:${port}`)
)