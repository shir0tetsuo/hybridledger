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

class HybridLedger
{
    constructor(position)
    {
        this.position = position
        if (this.position.includes(':')) {
            this.realm = this.position.split(':')[0]
        } else {
            this.realm = "public"
        }
    }

    async getBlocks() {
        try {
            ledger = []
            const blocks = await db.Ledgers.findAll({
                where: { position: this.position }
            })
            for (block in blocks.sort(function(a,b){return a.index-b.index})) 
                {
                BLOCK = new Block(index=block.index,
                    position=block.position,
                    ownership=block.ownership,
                    blockType=block.blockType,
                    data=block.data,
                    previousHash=block.previousHash,
                    minted=block.minted,
                    nonce=block.nonce,
                    timestamp=block.timestamp,
                    uuid=block.uuid)
                ledger.push(block)
            }
            return ledger 
        } catch (error) {
            var newBlock = new Block(0,this.position,'0',0,'Empty')
            newBlock.mint(1)
            return [newBlock]
        }
    }
}

module.exports = HybridLedger