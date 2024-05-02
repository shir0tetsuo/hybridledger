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
     * Directly push new blocks to ledger and database.
     * 
     * @param {Block} block 
     */
    async commit(block) 
    {
        // Remove the empty block by replacing it with Genesis
        if (block.blockType == 1)
        {
            this.ledger = [block]
        } else {
            this.ledger.push(block)
        }

        this.lastBlock = block
        this.ownership = block.ownership

        try {
            const io = await db.Ledgers.create({
                index: block.index,
                position: block.position,
                ownership: block.ownership,
                blockType: block.blockType,
                data: block.data,
                previousHash: block.previousHash,
                minted: block.minted,
                nonce: block.nonce,
                timestamp: block.timestamp,
                uuid: block.uuid
            }).catch(e => {
                console.log(1,e)
            })
        } catch (e) {
            console.log(2,e)
        } finally {
            console.log('OK','b-'+block.uuid,'=>Ledgers')
        }

        return this
    }

    /**
     * Mint 
     * 
     * @requires this.ledger
     * @param {string} data 
     * @param {number} blockType 
     */
    async mintByAuthorizing(authorizingUUID, data)
    {

        const authorizingUserEntry = await db.Users.findOne({ where: { userUUID: authorizingUUID } })
        if (!authorizingUserEntry) { return console.log('! Mint Unauthorized') }

        // over Empty Block creates a Genesis Ledger Registration block.
        if (this.lastBlock.ownership == '0')
        {
            // empty -> Genesis -> New Block
            if (this.lastBlock.blockType == 0) {
                // mint genesis block declaring stack ownership
                const emptyHash = await this.lastBlock.getHash();
                var genesisBlock = new Block(0,this.position,authorizingUUID,1,'Genesis Ledger Registration',emptyHash);
                await genesisBlock.mint(2);
                await this.commit(genesisBlock);

                const genesisHash = await genesisBlock.getHash();

                // mint new block and data
                var newBlock = new Block(1,this.position,authorizingUUID,2,data,genesisHash);
                await newBlock.mint(4)
                await this.commit(newBlock);

            }
        }
    }

    /**
     * 
     * @requires this.ledger
     * @returns {boolean} `pristine=`
     */
    checkPristine()
    {
        // check if ledger is available
        if (!this.ledger || this.ledger == undefined) { return false }

        // one entry is always pristine as there is nothing to check back on
        if (this.ledger.length < 2) { return true }

        var pristine = true

        for (let i = (this.ledger.length - 2); i >= 0; i--) {
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
    getValue()
    {
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
            var ledger = []
            const blocks = await db.Ledgers.findAll({
                where: { position: this.position }
            }).then((blocks) => {
                if (!blocks || blocks.length < 1)
                {
                    var newBlock = new Block(0,this.position,'0',0,'Empty')
                    newBlock.mint(1)
                    ledger = [newBlock]
                }
                else 
                {
                    for (const blk of blocks.sort(function(a,b){return a.index-b.index})) 
                    {
                        //console.log(`(db) => ${blk.timestamp} => ${blk.uuid} => ${blk.position} @ ${blk.index}`)
                        var BLK = new Block(blk.index,blk.position,blk.ownership,blk.blockType,blk.data,blk.previousHash,blk.minted,blk.nonce,blk.timestamp,blk.uuid)
                        ledger.push(BLK)
                    }
                    
                }
                //console.log(`LEDGER:`,ledger)
                this.ledger = ledger
                return ledger
            })
            return ledger
        } catch (error) {
            console.log(error)
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
async function callHybridLedger(position)
{
    // create hybrid ledger
    HL = await new HybridLedger(position)
    const ledger = await HL.getBlocks()

    HL.ledger = await ledger
    //console.log(ledger)
    HL.lastBlock = await ledger[ledger.length - 1]
    HL.ownership = HL.lastBlock.ownership
    return HL
}

module.exports = { callHybridLedger }