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

// server application module
const express = require('express')

// cryptography
const SHA256 = require('crypto-js/sha256')
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt') // https://www.npmjs.com/package/bcrypt
// bcrypt config
const saltRounds = 10;

// extended features
const bparse = require('body-parser') //https://codeforgeek.com/handle-get-post-request-express-4/
const cookies = require('cookie-parser') //https://stackoverflow.com/questions/16209145/how-to-set-cookie-in-node-js-using-express-framework

// fs
const ff = require('fs')
const fs = require('fs').promises;
const sequelize = require('sequelize')

// server decl
const server = express();
const port = 8155;

// db
const Sequelize = require('sequelize')

// include json
server.use(express.json()) 

// private configuration
require("dotenv").config();

/*
    MATH FUNCTIONS 
*/
function getDeterministicValue(seed, values = ['.','-','+','o']) 
{
    // seed, [values] => value in values

    //const values = ['.','-','+','o']

    // Use a cryptographic hash function for strong randomness
    const hash = SHA256(seed.toString())
  
    // Convert the hash to a number (avoiding negative values)
    const hashValue = BigInt(`0x${hash}`);
  
    // Use modulo to get an index within the values array range
    const index = Number(hashValue % BigInt(values.length));
  
    // Return the value at the calculated index
    return values[index];
}

function getRandomInt(max) 
{
    // Obtain random integer under maximum value.
    return Math.floor(Math.random() * Math.floor(max));
}

let application_start = new Date();

/*
/map/
X,Y----infinite---->
| . . . . . . . . .
| . . . . . . . +MINTS
| . . . . . . . . .
| . . . . . . . . .
| . . . . . . . . .
v
+ = Hybrid Ledger
*/

/**
 * 
 * The main Block class.
 * Blocks are elements in ledgers.
 * 
 * Minting must be done at runtime.
 * Updates require re-minting.
 * 
 * There are 7 types of blocks (starting at 0):
 * `EMPTY`, `GENESIS`, `MINTED`, `TRANSACTION`, `ACQUIREMENT`, `LOCKED`, and `OBFUSCATED`.
 * 
 * The type of block defines what we should do with the data.
 * 
 */
class Block
{
    /** 
     * Constructor can create new blocks by using
     * constructor defaults. In most cases, the previousHash
     * should be specified, and integrity should be verified
     * by the ledger.
     * 
     * @param {integer} index
     * @param {string} position
     * @param {uuid} ownership
     * @param {integer} blockType
     * @param {any} data
     * @param {integer} minted
     * @param {hash} previousHash
     * @param {date} timestamp
     * @param {uuid} uuid
    */
    constructor(index, 
        position, 
        ownership, 
        blockType, 
        data,
        previousHash = '0',
        minted = 0,
        nonce = 0,
        timestamp = new Date().getTime(),
        uuid = uuidv4())
    {
        this.uuid       = uuid;                 // uuid

        this.index      = index;                // int
        this.position   = position;             // string (0x44_0x22)
        this.minted     = minted;               // int, minting increments this value, but decrements reward
        
        this.ownership  = ownership             // uuid

        //////////////////////////////////////////
        this.blockType  = blockType;            // int
        /*////////////////////////////////////////
        Defines what to do with the payload.

            0 = EMPTY (Empty)

            1 = GENESIS (Genesis Message)

            2 = MINTED (QR Code? & Immutable Message)

            3 = TRANSACTION (value to decrease)

            4 = ACQUIREMENT (UUIDs of Transactions)

            5 = LOCKED (Immutable msg, administrative locking
                        prevents users from taking over ledger,
                        but other administrators are immune.)

            6 = OBFUSCATED (Immutable msg, but only the owner
                            can see the data.)
        */////////////////////////////////////////
        
        // timestamp of runtime genesis
        this.timestamp      = timestamp;
        
        this.previousHash   = previousHash;   // string

        // Ambiguous for multirole use
        this.data           = data;           // any

        // minting
        // this.hash is calculated when the class is called.
        this.nonce          = nonce;
        this.hash           = this.calculateHash();
        
        // debugging
        //this.mint(2)
    }

    /**
     * 
     * @returns {string} hash
     */
    calculateHash(){
        return SHA256(this.index+
            this.position+
            this.minted+
            this.ownership+
            this.blockType+
            this.timestamp+
            this.previousHash+
            this.data+
            this.nonce).toString();
    }


    /**
     * Use #nonce, #minted, #difficulty, genesis timestamp to get block value.
     * 
     * Value of block decays from updates.
     * 
     * Value of block increases over time.
     * 
     * @returns {float} value
     */
    getValue() {

        // (now - this.timestamp) => minted value increases over time
        var agingValue = ((new Date() - new Date(this.timestamp))/5000000)

        var mintValue = (((this.nonce/1000000) + (0.005 - (0.001*(this.minted-1)) *this.calculateDifficulty())))
        
        // value can never be less than zero
        if (mintValue < 0) { mintValue = 0 }

        return mintValue
    }


    /**
     * @returns {integer} for difficulty = `^"0"*?`
     */
    calculateDifficulty() { return this.hash.match(/^0+/)[0].length; }


    /**
     * @param {number} difficulty
     */
    mint(difficulty) {
        
        // difficulty -> leading zeroes, nonce++ until (^"0"*difficulty...)
        this.minted++;

        while(this.hash.substring(0, difficulty) != Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash();

            // for debugging
            console.log(this.nonce, this.hash, 'b-'+ this.uuid)
        }

        // for debugging
        console.log('b-' + this.uuid + ' minted')

        return

    }

    // free from memory
    destroy() {
        this.index = undefined;
        this.position = undefined;
        this.ownership = undefined;
        this.blockType = undefined;
        this.previousHash = undefined;
        this.data = undefined;
        this.minted = undefined;
        this.timestamp = undefined;
        this.uuid = undefined;
        this.nonce = undefined;
        this.hash = undefined;
        return
    }
}
