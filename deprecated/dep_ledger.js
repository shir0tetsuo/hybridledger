
class HybridLedger
{
    constructor(position) 
    {
        // the hex-xy position
        this.position = position

        // initialize
        this.getBlocks().then(this.getPristine())

        // All blocks in hex-xy position
        this.ledger = undefined

        // the last block in the ledger
        this.lastBlock = undefined

        // ledger ownership = this.lastBlock.ownership
        this.ownership = undefined

        // block integrity
        this.pristine = undefined

        // for debugging
        this.initialized = false

        
    }


    /**
     * Calls database to obtain ledger and lastBlock, called position load.
     * @returns {void} `ledger=blocks` `lastBlock=ledger[-1]`
     */
    async getBlocks()
    {
        // from db.Ledgers get all blocks matching this.position,
        var blocks = db.Ledgers.findAll({
            where: {
                position: this.position
            }
            
        })

        console.log('Blocks Loaded:', blocks.length)

        // If there is no block, generate a new empty one
        if (blocks == undefined || blocks.length == 0) {

            // create empty new block
            var newBlock = new Block(
                index = 0,
                position = this.position,
                ownership = '0',
                blockType = 0,
                data = 'Empty',
                previousHash = '0',
                minted = 0,
                nonce = 0)
            // Never set empty block difficulty too high when minting.
            newBlock.mint(1)

            this.ledger = [newBlock]

        } else {

            // use existing blocks, convert them to Block()
            // blocks.map is not a function
            // use a for loop instead
            for (var i = 0; i < blocks.length; i++) {
                blocks[i] = new Block(blocks[i].index, blocks[i].position, blocks[i].previousHash, blocks[i].minted, blocks[i].data, blocks[i].nonce, blocks[i].timestamp, blocks[i].uuid)
            }

            console.log(blocks)

            this.ledger = blocks


            // Sort classes in array by index, .sort is not a function



            //this.ledger = blocks.map(block => new Block(block.index, block.position, block.previousHash, block.minted, block.data, block.nonce, block.timestamp, block.uuid))
            //this.ledger.sort((a, b) => { return a.index - b.index })
        }

        // set last block
        this.lastBlock = await this.ledger[this.ledger.length - 1]

        this.ownership = this.lastBlock.ownership

        // and include last block's time for minting spacing ...
    }


    getPristine()
    {
        // Starting with the last block, check previous hash; iterate through each block-- in this.ledger, and check if the block.getHash() matches the further block's previousHash.
        var pristine = true
        for (i = this.ledger.length - 2; i >= 0; i--) {
            if (this.ledger[i].getHash() != this.ledger[i + 1].previousHash) {
                pristine = false
                break
            }
        }

        this.pristine = pristine

        this.initialized = true
    }


    /**
     * Get total ledger value, runtime only
     * due to value increasing over time,
     * do not store value.
     * 
     * Empty blocks do not contain any value.
     * They are blank positions.
     * 
     * Must await HybridLedger's init.
     * 
     * @returns {float} ledger value
     */
    getValue()
    {
        var ledgerValue = 0;
        
        for (block in this.ledger) {

            /* common */

            // GENESIS
            if (block.blockType == 1) { ledgerValue += block.getValue() }

            // MINTED
            if (block.blockType == 2) { ledgerValue += block.getValue() }


            /* transactions */

            // TRANSACTION
            if (block.blockType == 3) {
                // transaction has its own value
                ledgerValue += block.getValue()

                // transaction data block = value spent
                ledgerValue -= block.data
            }

            // ACQUIREMENT
            if (block.blockType == 4) {
                ledgerValue += block.getValue()

                // data => transaction UUIDs, read from db

                // => get transaction data value
                // => push data value to ledger value
            }


            /* special */

            // LOCKED
            if (block.blockType == 5) { ledgerValue += block.getValue() }

            // OBFUSCATED
            if (block.blockType == 6) { ledgerValue += block.getValue() }
        }

        // Data Manipulation destroys integrity, therefore devalue entire ledger.
        if (!this.pristine) { ledgerValue = 0; }

        return ledgerValue
    }

    /**
     * 
     * @param {uuid} authorizingUser 
     * @param {any} data 
     */
    async mint(authorizingUser, data)
    {
        // mint over existing ownership
        if (this.lastBlock.ownership == authorizingUser) {
            
            // construct new block
            var newBlock = new Block(
                index = this.lastBlock.index + 1,
                position = this.position,
                ownership = authorizingUser,
                blockType = 2,
                data = data,
                previousHash = await this.lastBlock.getHash())

            // mint
            newBlock.mint(4)

            // add block to ledger
            this.ledger.push(newBlock)

            // set last block
            this.lastBlock = newBlock

            // write to database
            await db.Ledgers.create({
                index: newBlock.index,
                position: newBlock.position,
                ownership: newBlock.ownership,
                blockType: newBlock.blockType,
                data: newBlock.data,
                previousHash: newBlock.previousHash,
                minted: newBlock.minted,
                nonce: newBlock.nonce,
                timestamp: newBlock.timestamp,
                uuid: newBlock.uuid
            })

            // update pristine
            this.getPristine()

            // set ownership (from empty)
            //this.ownership = authorizingUser

            return true
        }

        if (this.lastBlock.blockType == 0 && this.lastBlock.index == 0) {

            emptyHash = await this.lastBlock.getHash()

            // remove last block from ledger
            this.ledger.pop()
            this.lastBlock.destroy()

            // construct new block
            let GenesisData = "Genesis Block "+authorizingUser+' '+data
            var newBlock = new Block(
                index = 0,
                position = this.position,
                ownership = authorizingUser,
                blockType = 1,
                data = GenesisData)
            this.ledger.push(newBlock)
            this.lastBlock = newBlock

            this.getPristine()
        }

        

        
    }
}



/**
 * v2
 * 
 * HybridLedger is a position wallet holding blocks.
 */
class HybridLedger
{
    /**
     * 
     * @param {string} position 
     */
    constructor(position)
    {
        this.position = position;

        if (this.hasColon(this.position)) 
        { this.Realm = this.position.split(':')[0] } else { this.Realm = "public" }

        this.ledger = this.readBlocks()


    }

    //function to search for ':' in this.position
    hasColon(position) {
        return position.includes(':');
    }

    async readBlocks() {
        try {
            ledger = []
            const blocks = await db.Ledgers.findAll({
                where: { position: this.position }
            })
            for (block in blocks) {
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
            newBlock = new Block(
                index = 0,
                position = this.position,
                ownership = '0',
                blockType = 0,
                data = 'Empty'
            )
            await newBlock.mint(1)
            return [newBlock]
        } finally {
            // blocks => Block()
            
            return
        }
        

        if (blocks == undefined || !blocks) {
            

            
            return
        } else {
            //console.log(blocks)
            return
        }
    }
}