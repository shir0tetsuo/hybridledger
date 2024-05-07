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
  TODO: Work on cell function buttons (make them smaller)
  TODO: Make /contact
  NOTE: Reduce the number of database calls with a findAll function? but this
        current method is probably the fastest. Assuming the database is loaded
        into RAM instead of constantly making unnecessary calls to the file
        after it's been loaded. Will have to follow up on the npm dev or inspect
        SQLite3/sequelize.
  TODO: Standardize DIV's in pages and add dynamic color.
  TODO: Touch up DIVs, add minting capability to the Block itself, more block security,
        and write the transaction system properly & test it.

  TODO: Block loading optimization! Might save the computer, and processing time!.

  TODO: Ledger Historical View

  DONE: NV optimization! Compare with loaded blocks!.

  NOTE: Remember that changes to user attributes must be reflected in
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
server.use('/robots.txt', express.static(path.resolve('./robots.txt')))

// private configuration
require("dotenv").config();

// the start time of the application
let application_start = new Date();

let accountTypes = ['Ghost', 'User', 'Moderator', 'Administrator']
let blockTypes = ['Empty','Genesis','Minted','Transaction','Acquirement','Locked','Obfuscated']
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
      'DISCORDSITEBAR': 'Hybrid Ledgers',
      'SITEADDRESS': process.env.SITEADDRESS,
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
   * For calculating part of position for ledger calls.
   * 
   * @param {string} hexString 
   * @returns {string} hexString++
   */
  incrementHexString(hexString) { var bigInt = BigInt(`0x${hexString}`)++; return bigInt.toString(16) }


  /**
   * Pass Inspected Block to Site Meta Variables.
   * 
   * @param {dict} Inspection 
   */
  pushBlockVariables(Inspection)
  {
    this.pushVariable('ledger_size', Inspection.ledger.size)
    this.pushVariable('ledger_maxidx', Inspection.ledger.size-1)
    this.pushVariable('ledger_position', Inspection.ledger.position)
    this.pushVariable('ledger_value', Inspection.ledger.value)
    this.pushVariable('ledger_pristine', Inspection.ledger.pristine)
    this.pushVariable('ledger_own', Inspection.ledger.ledgerOwnership)
    this.pushVariable('ledger_own_userName', Inspection.ledger.ledgerOwnershipAccount.userName)
    this.pushVariable('ledger_own_userUUID', Inspection.ledger.ledgerOwnershipAccount.userUUID)
    this.pushVariable('ledger_own_accountType', Inspection.ledger.ledgerOwnershipAccount.accountType)
    this.pushVariable('ledger_own_accountTypeStr', Inspection.ledger.ledgerOwnershipAccount.accountTypeStr)
    this.pushVariable('ledger_own_pubName', Inspection.ledger.ledgerOwnershipAccount.publicName)
    this.pushVariable('ledger_own_emoji', Inspection.ledger.ledgerOwnershipAccount.emoji)
    this.pushVariable('ledger_own_created', Inspection.ledger.ledgerOwnershipAccount.created)
    this.pushVariable('ledger_own_email', Inspection.ledger.ledgerOwnershipAccount.userEmail)
    this.pushVariable('ledger_prevts', Inspection.ledger.prevTS)
    this.pushVariable('ledger_nextts', Inspection.ledger.nextTS)
    this.pushVariable('ledger_lastts', Inspection.ledger.lastblkTS)
    this.pushVariable('ledger_genesists', Inspection.ledger.genesisTS)
    this.pushVariable('ledger_area',Inspection.ledger.area)
    this.pushVariable('ledger_prevlink', Inspection.ledger.prevLink)
    this.pushVariable('ledger_nextlink', Inspection.ledger.nextLink)
    this.pushVariable('blk_hash',Inspection.block.mint.hash)
    this.pushVariable('blk_idx', Inspection.block.mint.index)
    this.pushVariable('blk_uuid', Inspection.block.mint.uuid)
    this.pushVariable('blk_type', Inspection.block.mint.blockType)
    this.pushVariable('blk_typeStr', Inspection.block.mint.blockTypeStr)
    this.pushVariable('blk_diff', Inspection.block.mint.hashDifficulty)
    this.pushVariable('blk_prevhash', Inspection.block.previousHash)
    this.pushVariable('blk_minted', Inspection.block.mint.xMinted)
    this.pushVariable('blk_nonce', Inspection.block.mint.xNonce)
    this.pushVariable('blk_ts', Inspection.block.mint.timestamp)
    this.pushVariable('blk_data', Inspection.block.mint.data.replace(/\n/g, '<br>'))
    this.pushVariable('blk_islastblk', Inspection.block.isLastBlock)
    this.pushVariable('blk_val', Inspection.block.value)
    this.pushVariable('blk_own', Inspection.block.ownership)
    this.pushVariable('blk_qr', Inspection.block.QRCode)
    this.pushVariable('blk_link', Inspection.block.link)
    this.pushVariable('blk_own_userName', Inspection.block.ownershipAccount.userName)
    this.pushVariable('blk_own_userUUID', Inspection.block.ownershipAccount.userUUID)
    this.pushVariable('blk_own_accountType', Inspection.block.ownershipAccount.accountType)
    this.pushVariable('blk_own_accountTypeStr', Inspection.block.ownershipAccount.accountTypeStr)
    this.pushVariable('blk_own_pubName', Inspection.block.ownershipAccount.publicName)
    this.pushVariable('blk_own_emoji', Inspection.block.ownershipAccount.emoji)
    this.pushVariable('blk_own_created', Inspection.block.ownershipAccount.created)
    this.pushVariable('blk_own_email', Inspection.block.ownershipAccount.userEmail)
    this.pushVariable('uac_can_mint', Inspection.authorization.canMint)
    this.pushVariable('uac_account_type', Inspection.authorization.uac.accountType)
  }

  /**
   * Pushes time-based block information to main cells.
   * 
   * @param {number} xX Number to multiply matrix cell inspector, horizontal value. Always number, not hex.
   * @param {number} xY Number to multiply matrix cell inspector, veritcal value. Always number, not hex.
   * @param {Block} ib Inspection Block Class
   */
  async TimeMatrix(xX, xY, ib)
  {
    let Mx = 8; // matrix length for x, y
    var positionPoolX = []; for (var i = xX*Mx; i < (xX*Mx)+Mx; i++) { positionPoolX.push(i.toString(16)) };
    var positionPoolY = []; for (var i = xY*Mx; i < (xY*Mx)+Mx; i++) { positionPoolY.push(i.toString(16)) };

    // TODO: Get the hybrid ledger and calculate the +/- index button.



    var cellY = 0
    for (let Y in positionPoolY.reverse()) {
      var cellX = 0
      for (let X in positionPoolX) {
        let HL = await HybridLedgers.callHybridLedger(`${positionPoolX[X]},${positionPoolY[Y]}`)
        var xb = HL.ledger[0]; // cell block
        for (let b in HL.ledger) {
          if (HL.ledger[b].blockType != 0 && HL.ledger[b].timestamp < ib.timestamp) {
            xb=HL.ledger[b]
          }
        }
        let Inspection = await this.LedgerHandler(`${positionPoolX[X]},${positionPoolY[Y]}`, xb.index, false)
      
        this.pushVariable(`blockUUID`, Inspection.block.mint.uuid)
        this.pushVariable(`blockTimestamp`, Inspection.block.mint.timestamp)
        this.pushVariable(`ledgerPosition`, Inspection.ledger.position)
        this.pushVariable(`blockData`, Inspection.block.mint.data)
        this.pushVariable(`blockDataTrimmed`, Inspection.block.mint.dataTrimmed)
        this.pushVariable(`ledgerEmoji`, Inspection.ledger.ledgerOwnershipAccount.emoji)
        this.pushVariable(`blockIndex`, `${Inspection.block.mint.index}/${Inspection.ledger.size-1}`)
        this.pushVariable(`blockTimestamp`, Inspection.block.mint.timestamp)
        this.pushVariable(`blockType`, Inspection.block.mint.blockType)
        this.pushVariable(`blockURL`, Inspection.block.link)
        this.pushVariable(`ledgerPristine`, Inspection.ledger.pristine)
        this.pushVariable(`ledgerOwnerAcctType`, Inspection.ledger.ledgerOwnershipAccount.accountTypeStr)
        this.pushVariable(`ledgerOwnerLink`, '/user/'+ Inspection.ledger.ledgerOwnershipAccount.userUUID)
        this.pushVariable(`ledgerOwnerPubname`, Inspection.ledger.ledgerOwnershipAccount.publicName)
        this.pushVariable(`ledgerOwn`, Inspection.ledger.ledgerOwnershipAccount.userUUID)
        this.pushVariable(`ledgerOwnerUsername`, Inspection.ledger.ledgerOwnershipAccount.userName)
        this.pushVariable(`ledgerOwnEmail`, Inspection.ledger.ledgerOwnershipAccount.userEmail)
        this.pushVariable(`blockMintable`, Inspection.authorization.canMint)
        this.pushVariable(`ledgerZone`, Inspection.ledger.xypos)

        let Element = await replace('./private/gate/blockElement.html',this)

        this.pushVariable(`cell${cellY}_${cellX}`, Element)

        cellX++
      }
      cellY++
    }

  }

  /**
   * Pushes matrix site meta variables. 
   * 
   * This will not be the same handler for time functions.
   * 
   * @param {number} xX Number to multiply matrix cell inspector, horizontal value. Always number, not hex.
   * @param {number} xY Number to multiply matrix cell inspector, veritcal value. Always number, not hex.
   */
  async BlockMatrix(xX, xY)
  {
    let Mx = 8; // matrix length for x, y
    
    var positionPoolX = []; for (var i = xX*Mx; i < (xX*Mx)+Mx; i++) { positionPoolX.push(i.toString(16)) };
    var positionPoolY = []; for (var i = xY*Mx; i < (xY*Mx)+Mx; i++) { positionPoolY.push(i.toString(16)) };
    
    var cellY = 0
    for (let Y in positionPoolY.reverse()) {
      var cellX = 0
      for (let X in positionPoolX) {
        let Inspection = await this.LedgerHandler(`${positionPoolX[X]},${positionPoolY[Y]}`, 0, true)

        this.pushVariable(`blockUUID`, Inspection.block.mint.uuid)
        this.pushVariable(`blockTimestamp`, Inspection.block.mint.timestamp)
        this.pushVariable(`ledgerPosition`, Inspection.ledger.position)
        this.pushVariable(`blockData`, Inspection.block.mint.data)
        this.pushVariable(`blockDataTrimmed`, Inspection.block.mint.dataTrimmed)
        this.pushVariable(`ledgerEmoji`, Inspection.ledger.ledgerOwnershipAccount.emoji)
        this.pushVariable(`blockIndex`, Inspection.block.mint.index)
        this.pushVariable(`blockTimestamp`, Inspection.block.mint.timestamp)
        this.pushVariable(`blockType`, Inspection.block.mint.blockType)
        this.pushVariable(`blockURL`, Inspection.block.link)
        this.pushVariable(`ledgerPristine`, Inspection.ledger.pristine)
        this.pushVariable(`ledgerOwnerAcctType`, Inspection.ledger.ledgerOwnershipAccount.accountTypeStr)
        this.pushVariable(`ledgerOwnerLink`, '/user/'+ Inspection.ledger.ledgerOwnershipAccount.userUUID)
        this.pushVariable(`ledgerOwnerPubname`, Inspection.ledger.ledgerOwnershipAccount.publicName)
        this.pushVariable(`ledgerOwn`, Inspection.ledger.ledgerOwnershipAccount.userUUID)
        this.pushVariable(`ledgerOwnerUsername`, Inspection.ledger.ledgerOwnershipAccount.userName)
        this.pushVariable(`ledgerOwnEmail`, Inspection.ledger.ledgerOwnershipAccount.userEmail)
        this.pushVariable(`blockMintable`, Inspection.authorization.canMint)
        this.pushVariable(`ledgerZone`, Inspection.ledger.xypos)

        let Element = await replace('./private/gate/blockElement.html',this)

        this.pushVariable(`cell${cellY}_${cellX}`, Element)

        cellX++
      }
      cellY++
    }
  }

  /**
   * Find the modulo of a decimal number by 8.
   * 
   * @param {string} hexString 
   * @returns {number}
   */
  findGridValue(hexString) {
    let decimal = parseInt(hexString, 16);
    return (Math.floor(decimal/8))
  }

  /**
   * Get modulo grid positions for target.
   * 
   * @param {string} address 
   * @returns {string} for href
   */
  findGrid(address) {
    let addr = address.split(',')
    let xpos;
    let ypos;
    try {
      xpos = this.findGridValue(addr[0])
      ypos = this.findGridValue(addr[1])
    } catch {
      return 'Unknown'
    } finally {
      return `${xpos}/${ypos}`
    }

  }

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

    // TODO : Incorporate Back to Map function.

    let HL = await HybridLedgers.callHybridLedger(address);
    //let time_left = await this.uac.timeToMint();

    let gridlink = this.findGrid(address)
  
    var block;
    let prevTS; let prevLink;
    let nextTS; let nextLink;
    let idx = parseInt(index)
    if (idx+1 <= HL.ledger.length && useLastBlock == false) {
      block = HL.ledger[idx]
      if (idx >= 1) {
        prevTS = HL.ledger[idx-1].timestamp
        prevLink = process.env.SITEADDRESS + 'b/' + HL.ledger[idx-1].uuid
      } else {
        prevTS = 0
        prevLink = '#'
      }
      if (idx+1 < HL.ledger.length) {
        nextTS = HL.ledger[idx+1].timestamp
        nextLink = process.env.SITEADDRESS + 'b/' + HL.ledger[idx+1].uuid
      } else {
        nextTS = 0
        nextLink = '#'
      }

    } else {
      // get last of ledger
      block = HL.ledger[HL.ledger.length - 1]
      if (HL.ledger.length > 1) {
        prevTS = HL.ledger[HL.ledger.length - 2]
        prevLink = process.env.SITEADDRESS + 'b/' + HL.ledger[HL.ledger.length - 2]

      } else {
        prevTS = 0 //block.timestamp
        prevLink = '#'
      }
      nextTS = 0
      nextLink = '#'
    }

    let isLastBlock;
    if (block.index+1 == HL.ledger.length) {
      isLastBlock = true;
    } else {
      isLastBlock = false;
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
      accountTypeStr: accountTypes[UDataLedgerOwnership.accountType],
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
      accountTypeStr: accountTypes[UDataBlockOwnership.accountType],
      publicName: UDataBlockOwnership.publicName,
      emoji: UDataBlockOwnership.emoji,
      created: UDataBlockOwnership.created,
      userEmail: publicBlockUACEmail
    }


    let blkOwnIsUAC;
    if (block.ownership == this.uac.userUUID) { blkOwnIsUAC = true } else { blkOwnIsUAC = false };

    let BlockData;
    let BlockDataTrimmed;
    if (block.blockType == 6 && blkOwnIsUAC == false)
    {
      BlockData = 'Secret'
      BlockDataTrimmed = 'Secret'
    } else {
      BlockData = block.data
      if (block.data.length > 64) { BlockDataTrimmed = block.data.substring(0,64) + '...' } else { BlockDataTrimmed = block.data }
      //if (block.data.length > 70) { BlockData = block.data.substring(0,70) + '<level>...</level>' } else { BlockData = block.data }
    }

    var Inspection = {
      ledger: {
        size: HL.ledger.length,
        position: HL.position,
        value: await HL.getValue(),
        pristine: HL.checkPristine(),
        ledgerOwnership: HL.lastBlock.ownership,
        ledgerOwnershipAccount: publicLedgerUAC,
        genesisTS: HL.ledger[0].timestamp,
        lastblkTS: HL.lastBlock.timestamp,
        prevTS: prevTS,
        prevLink: prevLink,
        nextTS: nextTS,
        nextLink: nextLink,
        //lastLink: HL.lastBlock.blockType,
        area: process.env.SITEADDRESS + 'gate/last/' + gridlink,
        xypos: gridlink
      },

      block: {
        mint: {
          index: block.index,
          uuid: block.uuid,
          hash: await block.getHash(),
          blockType: block.blockType,
          blockTypeStr: blockTypes[block.blockType],
          hashDifficulty: block.getDifficulty(),
          xMinted: block.minted,
          xNonce: block.nonce,
          timestamp: block.timestamp,
          data: BlockData,
          dataTrimmed: BlockDataTrimmed,
        },
        isLastBlock: isLastBlock,
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
        //netValue: await this.uac.netValue(),
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
  const page_main = await replace('./private/gate/homepage.html', siteMeta)


  let data = page_header + page_nav + page_main
  res.status(200).send(data); console.log(`🦾 200 ${req.url} => ${uac.userName}`)

  // cleanup memory
  siteMeta = undefined
  uac = undefined
})

/*

  #################################################################################
    /gate/time/:xpos/:ypos/:uuid (Block Timeline Inspection/Retrospection)
  #################################################################################

*/
server.get('/gate/time/:xpos/:ypos/:uuid', async(req, res) => {

  const { xpos, ypos, uuid } = req.params;

  if (!xpos||xpos==undefined||isNaN(xpos)){return res.status(404).send({error: 'xpos NaN'})}
  if (!ypos||ypos==undefined||isNaN(ypos)){return res.status(404).send({error: 'ypos NaN'})}
  if (!uuid||uuid==undefined){return res.status(404).send({error: 'uuid not defined'})}

  let inspection_block = await db.Ledgers.findOne({where: {uuid: uuid}})

  if (!inspection_block || inspection_block == undefined){return res.status(404).send({error: 'block not found'})}

  

  var siteMeta = new siteMetadata()
  siteMeta.pushVariable('SITENAME', `Gateway Area ${xpos}:${ypos}`)
  siteMeta.pushVariable('DISCORDSITEBAR', `Hybrid Ledger Gateway Area X${xpos}:Y${ypos}`)

  var uac = await siteMeta.UACHandler(req)

  await siteMeta.TimeMatrix(xpos, ypos, inspection_block)

  siteMeta.pushVariable('navWest', `/gate/time/${parseInt(xpos)-1}/${ypos}/${uuid}`)
  siteMeta.pushVariable('navEast', `/gate/time/${parseInt(xpos)+1}/${ypos}/${uuid}`)
  siteMeta.pushVariable('navNorth', `/gate/time/${xpos}/${parseInt(ypos)+1}/${uuid}`)
  siteMeta.pushVariable('navSouth', `/gate/time/${xpos}/${parseInt(ypos)-1}/${uuid}`)
  
  const page_header = await replace('./private/header.html', siteMeta)
  const page_nav = await replace('./private/gate/navigator.html', siteMeta)

  const page_main = await replace('./private/gate/main.html', siteMeta)

  let data = page_header + page_nav + page_main
  res.status(200).send(data); console.log(`🦾 200 ${req.url} => ${uac.userName}`)

  // testing
  //res.status(200).send(inspection_block)
  // cleanup memory
  siteMeta = undefined
  uac = undefined
})

/*

  #################################################################################
    /gate/last/:xpos/:ypos (Return map matrix)
  #################################################################################

*/
server.get('/gate/last/:xpos/:ypos', async(req, res) => {

  const { xpos, ypos } = req.params;

  if (!xpos||xpos==undefined||isNaN(xpos)){return res.status(404).send({error: 'xpos NaN'})}
  if (!ypos||ypos==undefined||isNaN(ypos)){return res.status(404).send({error: 'ypos NaN'})}

  var siteMeta = new siteMetadata()
  siteMeta.pushVariable('SITENAME', `Gateway Area ${xpos}:${ypos}`)
  siteMeta.pushVariable('DISCORDSITEBAR', `Hybrid Ledger Gateway Area X${xpos}:Y${ypos}`)

  var uac = await siteMeta.UACHandler(req)

  await siteMeta.BlockMatrix(xpos, ypos)

  siteMeta.pushVariable('navWest', `/gate/last/${parseInt(xpos)-1}/${ypos}`)
  siteMeta.pushVariable('navEast', `/gate/last/${parseInt(xpos)+1}/${ypos}`)
  siteMeta.pushVariable('navNorth', `/gate/last/${xpos}/${parseInt(ypos)+1}`)
  siteMeta.pushVariable('navSouth', `/gate/last/${xpos}/${parseInt(ypos)-1}`)
  
  const page_header = await replace('./private/header.html', siteMeta)
  const page_nav = await replace('./private/gate/navigator.html', siteMeta)
  // const page_nav_fn = await siteMeta.fnHandler()...
  const page_main = await replace('./private/gate/main.html', siteMeta)

  let data = page_header + page_nav + page_main
  res.status(200).send(data); console.log(`🦾 200 ${req.url} => ${uac.userName}`)

  // cleanup memory
  siteMeta = undefined
  uac = undefined
})

/*

  #################################################################################
    /fix/:address (System Block Fixer)
  #################################################################################

  NOTE: This is a simple clean-up utility to re-hash blocks.
        Empty blocks don't need to be fixed.

*/
server.get('/fix/:address', async(req, res) => {

  const { address } = req.params;

  var siteMeta = new siteMetadata()
  var uac = await siteMeta.UACHandler(req)

  if (!uac.accountType>=2){return res.status(401).send({unauthorized: 'Account not authorized.'})}

  if (!address||address==undefined){return res.status(404).send({error: 'address unknown'})}
  
  var HL = await HybridLedgers.callHybridLedger(address)

  //if (HL.checkPristine() == true) {return res.status(200).send({ok: 'address is fine'})}

  console.log(`Fixing ${HL.position}`);

  var previousHash = '0';
  for (let ib in HL.ledger) {

    var block = HL.ledger[ib];

    //if (ib != 0) { block.previousHash = previousHash; }

    // minted++ & nonce++
    block.previousHash = previousHash
    if (block.blockType == 0) { await block.mint(1) }
    if (block.blockType == 1) { await block.mint(2) }
    if (block.blockType == 2) { await block.mint(4) }
    if (block.blockType == 3) { await block.mint(3) }
    if (block.blockType == 4) { await block.mint(4) }
    if (block.blockType == 5) { await block.mint(3) }
    if (block.blockType == 6) { await block.mint(4) }
    previousHash = block.getHash()

    block.debug()

    if (block.blockType != 0) {
      db.Ledgers.update({minted: block.minted, nonce: block.nonce, previousHash: block.previousHash}, { where: { uuid: block.uuid }})
    }
  }
  
  res.status(200).send('OK'); console.log(`🦾 200 ${req.url} => ${uac.userName}`)

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

  // cleanup memory
  siteMeta = undefined
  uac = undefined
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
    /user/:useruuid (User Profile/Page)
  #################################################################################

*/

server.get('/user/:uuid', async(req, res) => {

  const { uuid } = req.params;

  let user = await Users.callUser(uuid)

  var siteMeta = new siteMetadata()
  var uac = siteMeta.UACHandler(req)
  siteMeta.pushVariable('SITENAME', 'User')

  siteMeta.pushVariable('user_name', user.userName)
  if (user.displayEmail || user.displayEmail == true || user.displayEmail == 'true') {
    siteMeta.pushVariable('user_email', user.userEmail)
  } else {
    siteMeta.pushVariable('user_email', 'ghost@'+process.env.SITE)
  }
  
  let nv = await user.netValue()
  siteMeta.pushVariable('user_emoji', user.emoji)
  siteMeta.pushVariable('user_nv', nv)
  siteMeta.pushVariable('user_uuid', uuid)
  siteMeta.pushVariable('user_created', user.created)
  siteMeta.pushVariable('user_publicname', user.publicName)
  siteMeta.pushVariable('user_accountType', accountTypes[user.accountType])

  let page_header = await replace('./private/header.html',siteMeta)
  let page_nav = await replace('./private/gate/navigator.html',siteMeta)
  let page_main = await replace('./private/uac/userPage.html',siteMeta)

  let data = page_header + page_nav + page_main

  res.status(200).send(data)

  // cleanup memory
  siteMeta = undefined
  uac = undefined
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
    /mint/:address
  #################################################################################

*/
server.get('/mint/:address', async (req, res) => {

  // This should be done, don't touch this unless necessary

  const { address } = req.params;

  if (!address || address == undefined) return res.status(200).send({error: 'Cannot identify address.'})

  var siteMeta = new siteMetadata()
  var uac = await siteMeta.UACHandler(req)

  let Inspection = await siteMeta.LedgerHandler(address, 0, true)

  siteMeta.pushBlockVariables(Inspection)

  if (Inspection.authorization.canMint == false) { return res.status(401).send({error: "Unauthorized Mint."}) }

  let page_header = await replace('./private/header.html',siteMeta)
  let page_nav = await replace('./private/gate/navigator.html', siteMeta)
  let page_controls = await replace('./private/gate/mint/mintPage.html', siteMeta)

  let data = page_header + page_nav + page_controls

  res.status(200).send(data)

  // cleanup memory
  siteMeta = undefined
  uac = undefined
})

/*

  #################################################################################
    POST /mint/:address ==200=> goto grid
  #################################################################################

  NOTE: NOT SECURE.
  
*/
server.post('/mint/:address', async (req, res) => {

  const { address } = req.params;

  let reqBlockType;
  let reqBlockData;
  if (!req.body.blockType || req.body.blockType == undefined) { reqBlockType = 2 } else { reqBlockType = req.body.blockType }
  if (!req.body.blockData || req.body.blockData == undefined || req.body.blockData == '') { reqBlockData = 'Empty'} else { reqBlockData = req.body.blockData }
  
  // TODO: Implement server-side blockType security.

  if (!address || address == undefined) return res.status(200).send({error: 'Cannot identify address.'})

  var siteMeta = new siteMetadata()
  var uac = await siteMeta.UACHandler(req)

  let Inspection = await siteMeta.LedgerHandler(address, 0, true)

  let HL = await HybridLedgers.callHybridLedger(address)

  if (Inspection.authorization.canMint == false) { return res.status(401).send({error: "Unauthorized Mint."}) }
  
  let blockRequest;
  blockRequest = {
    blockType: reqBlockType,
    blockData: reqBlockData.substring(0,4096)
  }

  console.log(blockRequest)

  // If only default Empty block present, mint a Genesis block as well.
  if (HL.lastBlock.blockType == 0 && HL.lastBlock.index == 0 && Inspection.ledger.size == 1) {
    var genesisBlock = HL.ledger[0]
    let genesisDataHash = genesisBlock.hash
    genesisBlock.blockType = 1
    genesisBlock.data = `Genesis <span style="font-size: smaller;">[${genesisDataHash}]</span>`
    genesisBlock.ownership = uac.userUUID
    genesisBlock.timestamp = new Date().getTime()
    await genesisBlock.mint(2)
    await HL.commit(genesisBlock)
    //await HL.commit(genesisBlock)
  } //else {
    // Do not forget case condition where transactions must occur!
    // Transactions must mint over a random user owned ledger!
    // "Admin does what admin wants:" can even acquire blocks that users can't afford.
    //
    //}
  var newBlock = new Block(HL.lastBlock.index+1, address, uac.userUUID, blockRequest.blockType, blockRequest.blockData, HL.lastBlock.hash)
  await newBlock.mint(4)
  await HL.commit(newBlock)

  res.status(200).send({response: "OK!", navigate: Inspection.ledger.area})

  // cleanup memory
  siteMeta = undefined
  uac = undefined
})

/*

  #################################################################################
    /hl/:address/:index (return json of ledger index)
  #################################################################################

*/
server.get('/hl/:address/:index', async (req, res) => {

  const { address, index } = req.params;

  if (!address || address == undefined) return res.status(200).send({error: 'Cannot identify address.'})
  if (!index || index == undefined || isNaN(parseInt(index))) return res.status(200).send({error: 'Cannot identify index.'})

  var siteMeta = new siteMetadata()
  var uac = await siteMeta.UACHandler(req)

  let data = await siteMeta.LedgerHandler(address, index);

  res.status(200).send({data}); console.log(`🦾 200 ${req.url} => ${uac.userName}`)

  // cleanup memory
  siteMeta = undefined
  uac = undefined
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
    /b/:address/:index (Redirect to /b/:uuid)
  #################################################################################

*/
server.get('/b/:address/:index', async(req, res) => {

  const { address, index } = req.params;
  if (!address||address==undefined||!index||index==undefined||isNaN(index)) { return res.status(404).send({error: "Bad Address."}) }

  var siteMeta = new siteMetadata()

  siteMeta.pushVariable('SITENAME', 'Redirect')

  let HL = await HybridLedgers.callHybridLedger(address);

  let block;
  if (index >= HL.ledger.length || index < 0) { block = HL.lastBlock }
  else { block = HL.ledger[index] }

  let siteRedirect = process.env.SITEADDRESS + 'b/' + block.uuid

  siteMeta.pushVariable('301redirect',siteRedirect)

  let page_header = await replace('./private/header.html', siteMeta)

  let page_redir = await replace('./private/301.html', siteMeta)

  let data = page_header + page_redir

  res.status(301).send(data)

  // cleanup memory
  siteMeta = undefined
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

  let Inspection;
  let dbBlock = await db.Ledgers.findOne({where: { uuid: uuid }})
  if (!dbBlock || dbBlock == undefined) {
    Inspection = await siteMeta.LedgerHandler('0,0',0,false)
  } else {
    Inspection = await siteMeta.LedgerHandler(dbBlock.position,dbBlock.index,false)
  }

  siteMeta.pushVariable('TITLE',process.env.SITE + ' B-' + Inspection.block.mint.uuid)
  siteMeta.pushVariable('DISCORDSITEBAR', `Ledger ${Inspection.ledger.position} #${Inspection.block.mint.index} (${Inspection.block.mint.uuid})`)
  siteMeta.pushBlockVariables(Inspection)

  let page_header = await replace('./private/header.html', siteMeta)
  let page_nav = await replace('./private/gate/navigator.html', siteMeta)
  let page_main = await replace('./private/gate/block.html', siteMeta)

  let data = page_header + page_nav + page_main

  res.status(200).send(data); console.log(`🦾 200 ${req.url} => ${uac.userName}`)

  // cleanup memory
  siteMeta = undefined
  uac = undefined

})

/*

  #################################################################################
    /hl/:address (v3) (last block)
  #################################################################################
*/
server.get('/hl/:address', async (req, res) => {

  const { address } = req.params;

  if (!address || address == undefined) return res.status(200).send({error: 'Cannot identify address.'})

  var siteMeta = new siteMetadata()
  var uac = await siteMeta.UACHandler(req)

  let data = await siteMeta.LedgerHandler(address, 0, true);

  res.status(200).send({data}); console.log(`🦾 200 ${req.url} => ${uac.userName}`)
  
  // cleanup memory
  siteMeta = undefined
  uac = undefined
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