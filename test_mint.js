const SHA256 = require('crypto-js/sha256')
const { v4: uuidv4 } = require('uuid');
class Block
{

    /** 
     * @param {number} index
     * @param {string} position
     * @param {string} ownership
     * @param {number} blockType
     * @param {string} previousHash
     * @param {any} data
    */
    constructor(index, 
        position, 
        ownership, 
        blockType, 
        previousHash = undefined, 
        data = undefined)
    {
        this.uuid = uuidv4()                // uuid

        this.index = index;                 // int
        this.position = position;           // string (0x44_0x22)
        
        this.ownership = ownership          // uuid

        this.minted = 0;

        //////////////////////////////////////////
        this.blockType = blockType;         // int
        /*////////////////////////////////////////
        Defines what to do with the payload.
            0 = EMPTY (Empty)
            1 = GENESIS (Genesis Message)
            2 = MINTED (QR Code? & Immutable Message)
            3 = TRANSACTION (value to decrease)
            4 = ACQUIREMENT (UUIDs of Transactions)
        */////////////////////////////////////////
       
        
        // timestamp of runtime genesis
        this.timestamp = new Date().getTime();
        
        // chain integrity element
        this.previousHash = previousHash;   // string

        // Ambiguous for multirole use
        this.data = data;                   // any

        // locking
        this.obfuscate = false
        this.locked = false
        /* 
        Obfuscate flag will hide previous blocks' data. 
        Locked flag will prevent the ledger from being taken over. (admin only)
        */

        // for minting
        this.nonce = 0;
        this.hash = this.calculateHash();
        
        // mint the block
        this.mint(3) // debug only
    }

    calculateHash(){
        return SHA256(this.index+
            this.position+
            this.ownership+
            this.blockType+
            this.timestamp+
            this.previousHash+
            this.data+
            this.nonce).toString();
    }

    calculateValue(){

        // get diff between this.timestamp and now
        var agingValue = ((new Date() - new Date(this.timestamp))/5000000)

        console.log(agingValue)

        var value = (((this.nonce/1000000) + (0.005 - (0.001*(this.minted-1)) *this.calculateDifficulty())) + agingValue)
        
        // value can never be less than zero
        if (value < 0) { value = 0 }

        return value
    }

    calculateDifficulty() {
        return this.hash.match(/^0+/)[0].length;
    }

    mint(difficulty) {
        this.minted++
        while(this.hash.substring(0, difficulty) != Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash();
            console.log(this.nonce, this.hash, 'b-'+this.uuid)
        }

    }
}

m = new Block(0, '0x0_0x0', uuidv4(), 0)

console.log(m.calculateValue())