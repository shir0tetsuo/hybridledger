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

/*

  #################################################################################
    Modules & Configuration
  #################################################################################

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

// the start time of the application
let application_start = new Date();

/*

  #################################################################################
    Application System File Read Functions
  #################################################################################

*/

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

/*

  #################################################################################
    Application Metadata Handling System
  #################################################################################

*/

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
      // to be depr. for ${SITEADDRESS.}
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
   * ledger handler v3
   * Returns ledger, block, mint, authorization for frontpage.
   * 
   * Assume variables are already defined.
   * 
   * @requires `this.uac`
   * @param {string} address Address/Position of block.
   * @param {number} index Index of block.
   * @param {boolean} useLastBlock Switch flag to `true` to force last block.
   * @returns `Inspection`
  */
  async LedgerHandler(address, index, useLastBlock = false)
  {

    let HL = await HybridLedgers.callHybridLedger(address);
    let time_left = await this.uac.timeToMint();
  
    var block;
    let idx = parseInt(index)
    if (HL.ledger.length >= idx && useLastBlock == false) {
      block = HL.ledger[idx]
    } else {
      // get last of ledger
      block = HL.ledger[HL.ledger.length - 1]
    }

    
    
    var UDataLedgerOwnership = await Users.getUserByUUID(HL.lastBlock.ownership)
    if (!UDataLedgerOwnership || UDataLedgerOwnership == undefined) 
    { UDataLedgerOwnership = Users.blankAccount() } 
    let publicLedgerUACEmail;
    if (UDataLedgerOwnership.displayEmail == true) {
      publicLedgerUACEmail = UDataLedgerOwnership.userEmail
    } else {
      publicLedgerUACEmail = 'ghost@'+process.env.SITE
    }
    let publicLedgerUAC = {
      userName: UDataLedgerOwnership.userName,
      userUUID: UDataLedgerOwnership.userUUID,
      accountType: UDataLedgerOwnership.accountType,
      publicName: UDataLedgerOwnership.publicName,
      emoji: UDataLedgerOwnership.emoji,
      created: UDataLedgerOwnership.created,
      userEmail: publicLedgerUACEmail
    }


    var UDataBlockOwnership = await Users.getUserByUUID(block.ownership)
    if (!UDataBlockOwnership || UDataBlockOwnership == undefined) 
    { UDataBlockOwnership = Users.blankAccount() } 
    let publicBlockUACEmail;
    if (UDataBlockOwnership.displayEmail == true) {
      publicBlockUACEmail = UDataBlockOwnership.userEmail
    } else {
      publicBlockUACEmail = 'ghost@'+process.env.SITE
    }
    let publicBlockUAC = {
      userName: UDataBlockOwnership.userName,
      userUUID: UDataBlockOwnership.userUUID,
      accountType: UDataBlockOwnership.accountType,
      publicName: UDataBlockOwnership.publicName,
      emoji: UDataBlockOwnership.emoji,
      created: UDataBlockOwnership.created,
      userEmail: publicBlockUACEmail
    }


    let blkOwnIsUAC;
    if (block.ownership == this.uac.userUUID) { blkOwnIsUAC = true } else { blkOwnIsUAC = false };


    var Inspection = {
      ledger: {
        size: HL.ledger.length,
        position: HL.position,
        value: await HL.getValue(),
        pristine: HL.checkPristine(),
        ledgerOwnership: HL.lastBlock.ownership,
        ledgerOwnershipAccount: publicLedgerUAC,
      },

      block: {
        mint: {
          index: block.index,
          uuid: block.uuid,
          hash: await block.getHash(),
          blockType: block.blockType,
          hashDifficulty: block.getDifficulty(),
          xMinted: block.minted,
          xNonce: block.nonce,
          timestamp: block.timestamp,
          data: block.data,
        },
        previousHash: block.previousHash,
        value: await block.getValue(),
        ownership: block.ownership,
        ownershipAccount: publicBlockUAC,
        QRCode: process.env.SITEADDRESS + `hl/${address}/${block.index}/qr`,
        link: process.env.SITEADDRESS + `b/${block.uuid}`,
      },

      authorization: {
        uac: {
          userName: this.uac.userName,
          userUUID: this.uac.userUUID,
          accountType: this.uac.accountType,
        },
        timeToMint: await this.uac.timeToMint(),
        canMint: await Users.checkAuthorization(HL, this.uac),
        ownershipMatchesAccountUUID: blkOwnIsUAC,
        netValue: await this.uac.netValue(),
      }
    }
    return Inspection
  }

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

        //console.log('! Access Denied; return Guest account')

        return this.pushUACToVariables()

      } else {

        // match: Get uac by userName
        // check if userName exists in loggedIn, otherwise
        // create a new class instance for the user and return it;

        if (loggedIn[userName]) {

          this.uac = loggedIn[userName]

          //console.log(`Returning Account Authorization: ${this.uac.userName}`)

          return this.pushUACToVariables()

        } else {
          
          const uac = await new Users.UserAccount(undefined, userName)
          await uac.authorizePrivate(privatePassword)

          loggedIn[userName] = uac
          this.uac = uac

          //console.log(`! Access Confirmed: Welcome Back, ${this.uac.userName}`)
          this.uac.debug()

          return this.pushUACToVariables()
        }

      }
     
    // no cookies => guest account
    } else {

      const uac = await new Users.UserAccount(undefined, 'Guest')
      this.uac = uac

      //console.log('! Guest Account: No Cookies')

      return this.pushUACToVariables()
    }
    
  }
}

/*

  #################################################################################
    / (Home Page)
  #################################################################################

*/
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
  res.status(200).send(data); console.log(`🦾 200 ${req.url} => ${uac.userName}`)

  // cleanup memory
  siteMeta = undefined
  uac = undefined
})

/*

  #################################################################################
    /uac (User Access Controller)
  #################################################################################

*/
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

  res.status(200).send(data); console.log(`🦾 200 ${req.url} => ${uac.userName}`)

  // cleanup memory
  siteMeta = undefined
  uac = undefined
})

/*

  #################################################################################
    /gate (Main Application)
  #################################################################################

*/
server.get('/gate', async(req, res) => {
  var siteMeta = new siteMetadata()
  siteMeta.pushVariable('SITENAME', 'Gateway')

  var uac = await siteMeta.UACHandler(req)

  const page_header = await replace('./private/header.html', siteMeta)
  const page_nav = await replace('./private/gate/navigator.html', siteMeta)
  const page_main = await replace('./private/gate/main.html', siteMeta)


  let data = page_header + page_nav + page_main
  res.status(200).send(data); console.log(`🦾 200 ${req.url} => ${uac.userName}`)

  // cleanup memory
  siteMeta = undefined
  uac = undefined
})

/*

  #################################################################################
    /gate/minttime (Get uac time left to mint)
  #################################################################################

*/
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

/*

  #################################################################################
    /logout (delete cookies)
  #################################################################################

*/
server.get('/logout', async(req, res) => { 
  var siteMeta = new siteMetadata()
  siteMeta.pushVariable('SITENAME', 'User Access Control')
  const page_header = await replace('./private/header.html', siteMeta)
  const page_main = await readFile('./private/uac/logout.html')

  let data = page_header + page_main
  res.status(200).send(data); console.log(`🦾 200 ${req.url} => ---`)

  // cleanup memory
  siteMeta = undefined
})

/*

  #################################################################################
    POST /uac/login ==200=> uac.privatePassword
  #################################################################################

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


/*

  #################################################################################
    /hl/:address/:index (return json of ledger index)
  #################################################################################

  NOTE: Might move data here to function for in-system calling than
        burden the user with call requests.

*/
server.get('/hl/:address/:index', async (req, res) => {

  const { address, index } = req.params;

  if (!address || address == undefined) return res.status(200).send({error: 'Cannot identify address.'})
  if (!index || index == undefined || isNaN(parseInt(index))) return res.status(200).send({error: 'Cannot identify index.'})

  var siteMeta = new siteMetadata()
  var uac = await siteMeta.UACHandler(req)

  let data = await siteMeta.LedgerHandler(address, index);

  return res.status(200).send({data}); console.log(`🦾 200 ${req.url} => ${uac.userName}`)

})

/*

  #################################################################################
    /hl/:address/:index/qr (QR Code Call, Route Handler)
  #################################################################################

*/
server.get('/hl/:address/:index/qr', async (req, res) => {

  const { address, index } = req.params;

  let QRCode = await generateQRObject(address, index)

  if (!QRCode || QRCode == undefined) {
    res.status(404).send({ error: "Cannot display image, index out of range." })
  } else {
    res.setHeader('Content-Type', 'image/png')
    res.status(200).send(QRCode)
  }

})

/*

  #################################################################################
    /b/:uuid (Get block information by UUID)
  #################################################################################

*/
server.get('/b/:uuid', async (req, res) => {
  const { uuid } = req.params;

  var siteMeta = new siteMetadata()

  siteMeta.pushVariable('SITENAME', 'Block')

  var uac = await siteMeta.UACHandler(req)

  let time_left = await uac.timeToMint()

  let dbBlock = await db.Ledgers.findOne({where: { uuid: uuid }})

  let page_header = await replace('./private/header.html', siteMeta)
  let page_nav = await replace('./private/gate/navigator.html', siteMeta)

  let position;
  let index;
  let timestamp;
  if (!dbBlock || dbBlock == undefined) {
    //console.log(`Placeholder called for ${uuid}`)
    position = '0,0'
    index = 0
    timestamp = new Date().getTime()
    blockdata = 'Empty'
    blockType = 0
  } else {
    //console.log(`Set position/index for ${uuid}`)
    position = dbBlock.position
    index = dbBlock.index
    timestamp = dbBlock.timestamp
    blockdata = dbBlock.data
    blockType = dbBlock.blockType
  }

  let blockQR = process.env.SITEADDRESS + 'hl/' + position + '/' + index + '/qr';

  siteMeta.pushVariable('blockQR', blockQR)
  siteMeta.pushVariable('blockPosition', position)
  siteMeta.pushVariable('blockIndex', index)
  siteMeta.pushVariable('blockTypeStr', ['Empty','Genesis','Minted','Transaction','Acquirement','Locked','Obfuscated'][blockType])
  siteMeta.pushVariable('blockType', blockType)
  siteMeta.pushVariable('blockData', blockdata)

  siteMeta.pushVariable('blockTS', timestamp)
  siteMeta.pushVariable('blockTSStr', new Date(timestamp).toLocaleString())

  let page_main = await replace('./private/gate/block.html', siteMeta)

  let data = page_header + page_nav + page_main
  
  res.status(200).send(data); console.log(`🦾 200 ${req.url} => ${uac.userName}`)

})

/*

  #################################################################################
    /lastblock/:address (v3)
  #################################################################################
*/
server.get('/lastblock/:address', async (req, res) => {

  const { address } = req.params;

  if (!address || address == undefined) return res.status(200).send({error: 'Cannot identify address.'})

  var siteMeta = new siteMetadata()
  var uac = await siteMeta.UACHandler(req)

  let data = await siteMeta.LedgerHandler(address, 0, true);

  return res.status(200).send({data}); console.log(`🦾 200 ${req.url} => ${uac.userName}`)

})

/*

  #################################################################################
    Start Server Listener (END)
  #################################################################################

*/
server.listen(
    port,
    () => console.log(`Connection open @ localhost:${port}`)
)