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

const db = require('./db.js')
const Block = require('./block.js')

/**
 * v3
 * 
 * HybridLedger is a position wallet holding a ledger of blocks.
 * Ledger of blocks contains data and transaction information.
 * System loads and saves (mints) block data from db.
 * 
 * @construct > `position`, `realm`
 * @callHybridLedger > `ledger`, `lastBlock`, `ownership`
 * 
 * @func `checkPristine`, `getValue`
 * @async `getBlocks`
 * 
 */
class HybridLedger
{
    /**
     * Constructor creates information foundation from position
     * @param {string} position 
     */
    constructor(position)
    {
        this.position = position
        if (this.position.includes(':')) {
            this.realm = this.position.split(':')[0]
        } else {
            this.realm = "public"
        }
    }

    /**
     * 
     * @requires this.ledger
     * @returns {boolean} `pristine=`
     */
    checkPristine() {
        // check if ledger is available
        if (!this.ledger) { return false }

        // one entry is always pristine as there is nothing to check back on
        if (this.ledger.length < 2) { return true }

        var pristine = true

        for (i = this.ledger.length - 2; i >= 0; i--) {
            if (this.ledger[i].getHash() != this.ledger[i + 1].previousHash) {
                pristine = false
                break
            }
        }
        return pristine
    }

    /**
     * Return the calculated sum of the blocks in the ledger.
     * 
     * @requires this.ledger
     * @returns {float} value
     */
    getValue() {
        if (!this.ledger) { return 0 }
        
        // for each block ...
        var ledgerValue = 0

        for (const blk of this.ledger) {

            /* common */

            // GENESIS
            if (blk.blockType == 1) { ledgerValue += blk.getValue() }

            // MINTED
            if (blk.blockType == 2) { ledgerValue += blk.getValue() }


            /* transactions */

            // TRANSACTION
            if (blk.blockType == 3) {
                // transaction has its own value
                ledgerValue += blk.getValue()

                // transaction data block = value spent
                ledgerValue -= blk.data
            }

            // ACQUIREMENT
            if (blk.blockType == 4) {
                ledgerValue += blk.getValue()

                // data => transaction UUIDs, read from db

                // => get transaction data value
                // => push data value to ledger value
            }


            /* special */

            // LOCKED
            if (blk.blockType == 5) { ledgerValue += blk.getValue() }

            // OBFUSCATED
            if (blk.blockType == 6) { ledgerValue += blk.getValue() }
        }

        return ledgerValue
    }

    /**
     * Async call of ledger list by sorting db.Ledgers where `position` = `this.position`
     * 
     * @returns {list} ledger
     */
    async getBlocks() {
        try {
            ledger = []
            const blocks = await db.Ledgers.findAll({
                where: { position: this.position }
            })
            for (const blk of blocks.sort(function(a,b){return a.index-b.index})) 
                {
                var BLK = new Block(index=blk.index,
                    position=blk.position,
                    ownership=blk.ownership,
                    blockType=blk.blockType,
                    data=blk.data,
                    previousHash=blk.previousHash,
                    minted=blk.minted,
                    nonce=blk.nonce,
                    timestamp=blk.timestamp,
                    uuid=blk.uuid)
                ledger.push(BLK)
            }
            return ledger 
        } catch (error) {
            var newBlock = new Block(0,this.position,'0',0,'Empty')
            newBlock.mint(1)
            return [newBlock]
        }
    }
}

/**
 * Async function call handles db IO and pushes variables to class.
 * 
 * @param {string} position 
 * @returns {HybridLedger} HybridLedger
 */
async function callHybridLedger(position) {
    // create hybrid ledger
    HL = await new HybridLedger(position)
    ledger = await HL.getBlocks()

    HL.ledger = ledger
    HL.lastBlock = ledger[ledger.length - 1]
    HL.ownership = HL.lastBlock.ownership
    return HL
}

module.exports = { callHybridLedger }