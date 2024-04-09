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

/*
/map/
/u/00000-000.../
X,Y----infinite---->
| . . . . . . . . .
| . . . . . . . +MINTS
| . . . . . . . . .
| . . . . . . . . .
| . . . . . . . . .
v
+ = Hybrid Ledger

/mint/b/00000-000.../
(Capability of Sharing Minted Blocks)
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
 * Position example is `"0x0,0x0"` and if attached to a user, `"uuid:0x0,0x0"`
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

            0 = EMPTY (Empty) (mint 1)

            1 = GENESIS (Genesis Message) (mint 2)

            2 = MINTED (QR Code? & Immutable Message) (mint 4)

            3 = TRANSACTION (value to decrease) (mint 3)

            4 = ACQUIREMENT (UUIDs of Transactions) (mint 4)

            5 = LOCKED (Immutable msg, administrative locking
                        prevents users from taking over ledger,
                        but other administrators are immune.) (mint 3)

            6 = OBFUSCATED (Immutable msg, but only the owner
                            can see the data.) (mint 4)
        */////////////////////////////////////////
        
        // timestamp of runtime genesis
        this.timestamp      = timestamp;
        
        this.previousHash   = previousHash;   // string

        // Ambiguous for multirole use
        this.data           = data;           // any

        // minting
        // this.hash is calculated when the class is called.
        this.nonce          = nonce;
        this.hash           = this.getHash();
        
        // debugging
        //this.mint(2)
    }

    /**
     * 
     * @returns {string} hash
     */
    getHash(){
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
        var agingValue = ((new Date() - new Date(this.timestamp))/1050000000)

        var mintValue = Math.round((((this.nonce/1000000) + (0.005 - (0.001*(this.minted-1)) *this.getDifficulty())) + agingValue) * 1000000) / 1000000
        
        // value can never be less than zero
        if (mintValue < 0) { mintValue = 0 }

        return mintValue
    }


    /**
     * @returns {integer} for difficulty = `^"0"*?`
     */
    getDifficulty() { return this.hash.match(/^0+/)[0].length; }


    /**
     * @param {number} difficulty
     */
    mint(difficulty) {

        console.log('Minting b-' + this.uuid)
        
        // difficulty -> leading zeroes, nonce++ until (^"0"*difficulty...)
        this.minted++;

        while(this.hash.substring(0, difficulty) != Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.getHash();
        }

        // for debugging
        console.log(this.nonce, this.hash, 'b-'+ this.uuid, 'minted', this.minted)

        return

    }

    /*
    rmqr() {
        encode = this.uuid;

        // Use qrean to encode an rMQR code to buffer.
        //var rMQR = Qrean.encode(encode);

        return rMQR
    }*/

    /**
     * Free block from memory (cocurrent processing)
     * @returns {null}
     */
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

    /**
     * @returns debugging information `(console.log)`
     */
    debug() {
        let types = ['EMPTY','GENESIS','MINTED','TRANSACTION','ACQUIREMENT','LOCKED','OBFUSCATED']
        console.log('----')
        console.log('INDEX:',this.index);
        console.log('POSITION:',this.position);
        console.log('OWNERSHIP:',this.ownership);
        console.log('TYPE:', this.blockType, types[this.blockType])
        console.log('DATA:', this.data);
        console.log('MINTED:', this.minted);
        console.log('TS:', new Date(this.timestamp).toString());
        console.log('UUID:', this.uuid)
        console.log('NONCE:', this.nonce)
        console.log('HASH:', this.hash)
        console.log('VALUE:', this.getValue())
        console.log('DIFFICULTY:', this.getDifficulty())
    }
}

module.exports = Block