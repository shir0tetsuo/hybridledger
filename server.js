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
  Remember that changes to user attributes must be reflected in
  database as well as active login (loggedIn) class
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



/// Begin Main Application ///



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
      this.variablesToReplace['LoginStatus'] = `(Authorized as ${accountTypes[this.uac.accountType]} - <a class="phasedBlue" href="/logout">Logout</a>)`
      this.variablesToReplace['loggedIcon'] = 'key'
    } else {
      this.variablesToReplace['LoginStatus'] = '(Not Logged In - Minting Disabled)'
      this.variablesToReplace['loggedIcon'] = 'key_off'
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

          console.log(`Returning Account Authorization: ${this.uac.userName}`)

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

/**
 * 
 * Boundary between systems for testing and info absorption
 * 
 */
server.get('/gate', async(req, res) => {
  var siteMeta = new siteMetadata()
  siteMeta.pushVariable('SITENAME', 'Gateway')

  var uac = await siteMeta.UACHandler(req)

  const page_header = await replace('./private/header.html', siteMeta)
  const page_nav = await replace('./private/gate/navigator.html', siteMeta)


  let data = page_header + page_nav
  res.status(200).send(data)

  // cleanup memory
  siteMeta = undefined
  uac = undefined
})

server.post('/gate/minttime', async(req, res) => {

  var siteMeta = new siteMetadata()
  var uac = await siteMeta.UACHandler(req)

  let time_left = await uac.timeToMint()

  if (uac.accountType > 0) {
    res.status(200).send({
      timeleft: time_left
    })
    
  } else {
    res.status(200).send({
      infinite: true
    })
  }

  
})

/**
 * 
 * Logout sequence directs user to page and lets JS delete cookies.
 * get /logout
 * 
 */
server.get('/logout', async(req, res) => { 
  var siteMeta = new siteMetadata()
  siteMeta.pushVariable('SITENAME', 'User Access Control')
  const page_header = await replace('./private/header.html', siteMeta)
  const page_main = await readFile('./private/uac/logout.html')

  let data = page_header + page_main
  res.status(200).send(data)

  // cleanup memory
  siteMeta = undefined
})

/**
 * 
 * login system
 * post /uac/login
 * 
 * Returns the user's hashed password as a key.
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

/**
 * 
 * Below is general QR Generation handling
 * within /hl/addr/index/qr,
 * Empty QR will always point to /b/empty,
 * or will return a 404 if there is an index mismatch;
 * This should never happen, but can happen
 * if users manually enter in a bad
 * index for an address.
 * 
 * @param {string} address 
 * @param {number} index 
 * @returns {QRCode.toBuffer}
 */
async function generateQRObject(address, index) {
  return HybridLedgers.callHybridLedger(address).then((HL) => {
    let block = HL.ledger[index]

    if (!block || block == undefined) {
      return
    } else {
      return block.getQRCode()
    }
    
  })
}

server.get('/hl/:address/:index/qr', async (req, res) => {

  // no db handling, read by class only

  const { address, index } = req.params;

  let QRCode = await generateQRObject(address, index)

  if (!QRCode || QRCode == undefined) {
    res.status(404).send({ error: "Cannot display image, index out of range." })
  } else {
    res.setHeader('Content-Type', 'image/png')
    res.status(200).send(QRCode)
  }


})

server.get('/b/:uuid', async (req, res) => {
  const { uuid } = req.params;

  var siteMeta = new siteMetadata()

  siteMeta.pushVariable('SITENAME', 'Block')

  var uac = await siteMeta.UACHandler(req)

  let time_left = await uac.timeToMint()

  let dbBlock = await db.Ledgers.findOne({where: { uuid: uuid }})

  let page_header = await replace('./private/header.html', siteMeta)

  let position;
  let index;
  if (!dbBlock || dbBlock == undefined) {
    position = '0,0'
    index = 0
  } else {
    position = dbBlock.position
    index = dbBlock.index
  }

  let blockQR = process.env.SITEADDRESS + 'hl/' + position + '/' + index + '/qr';

  //let blockQR = await 

  siteMeta.pushVariable('blockQR', blockQR)

  let page_main = await replace('./private/gate/block.html', siteMeta)

  let data = page_header + page_main
  
  console.log('success.')
  res.status(200).send(data)

})

server.get('/lastblock/:address', async (req, res) => {

  const { address } = req.params;

  var siteMeta = new siteMetadata()
  var uac = await siteMeta.UACHandler(req)

  let time_left = await uac.timeToMint()

  if (address != undefined) {
    HybridLedgers.callHybridLedger(address).then((HL) => {

      let block = HL.lastBlock
    
      let value = HL.lastBlock.getValue()
    
      let difficulty = HL.lastBlock.getDifficulty()

      let blockHash = block.getHash();

      let HLValue = HL.getValue();

      let HLPristine = HL.checkPristine();

      var OWNERSHIP;

      Users.getUserByUUID(block.ownership).then(ownerData => {
        if (!ownerData || ownerData == undefined) {
          OWNERSHIP = {
            accountType:0,
            userName:'None',
            publicName:'None',
            emoji:'',
            created: 'Unknown'
          }
        } else {
          OWNERSHIP = {
            accountType:ownerData.accountType,
            userName:ownerData.userName,
            publicName:ownerData.publicName,
            emoji:ownerData.emoji,
            created:ownerData.createdAt
          }
        }
        //block.debug()

        var AUTHORIZED;

        // case ownership 0/Empty: grant authorization to non-guest account
        if (block.ownership == '0') {
          if (uac.accountType > 0) {
            AUTHORIZED = true
          } else {
            AUTHORIZED = false
          }
        
        // case ownership belongs to someone else: check mint time left,
        // ensure user account is authorized to mint,
        // and ensure that the block is not locked.
        } else {
          if (block.ownership == uac.userUUID && time_left <= 0) {
            if (uac.accountType > 0 && block.blockType != 5) {
              AUTHORIZED = true
            } else {
              AUTHORIZED = false
            }
          } else {
            AUTHORIZED = false
          }
        }
    
        return res.status(200).send({

          ledger: {
            size: HL.ledger.length,
            position: block.position,
            ledgerOwnership: block.ownership,
            ownershipAccount: OWNERSHIP,
            value: HLValue,
            pristine: HLPristine,
          },

          block: {
            index: block.index,
            blockType: block.blockType,
            data: block.data,
            previousHash: block.previousHash,
            ownership: block.ownership,
            ownershipAccount: OWNERSHIP,
            mint: {
              hash: blockHash,
              hash_difficulty: difficulty,
              x_minted: block.minted,
              x_nonce: block.nonce,
              timestamp: block.timestamp,
              uuid: block.uuid,
              value: value,
              QRCode: process.env.SITEADDRESS + `hl/${address}/${block.index}/qr`,
              link: process.env.SITEADDRESS + `b/${block.uuid}`,
            },
          },
          
          authorization: {
            uac: {
              userName: uac.userName,
              userUUID: uac.userUUID,
              accountType: uac.accountType
            },
            timeToMint: time_left,
            canMint: AUTHORIZED
          }
        })
    
      })
      
    })
    
  }
  else {
    return res.status(404).send({
      error: 'Unknown Error Occurred'
    })
  }
})





// Start Server Listener
server.listen(
    port,
    () => console.log(`Connection open @ localhost:${port}`)
)