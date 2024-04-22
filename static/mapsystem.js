function Hexadecimal(toHex){
    var toHex = parseInt(toHex)
    return toHex.toString(16)
}

var cells = [ ] // makes it easier to drag cells around and apply functions

class LedgerCell
{
    constructor(positionX, positionY)
    {
        this.position = {
            X: positionX, xX: Hexadecimal(positionX),
            Y: positionY, xY: Hexadecimal(positionY),
            cellX: positionX*125 + positionX*5,
            cellY: positionY*125 + positionY*5
        }

        this.drawn = false // change to true when cell has been loaded fully

        this.address = `${this.position.xX},${this.position.xY}`

        this.cell = document.createElement('div')
        // => decorate and push to document with loading indicator

    }

    /**
     * Get the default information from server
     * regarding the ownership of the ledger
     */
    async getLastBlock()
    {
        $.ajax({
            type: "POST",
            url: "/ledger/" + this.address,
            data: {
                lastBlock: true
            },
            success: function(data) {
                return data
            },
            error: function(data) {
                console.log(data)
            }
        })
    }
}

async function callServerLedger(positionX, positionY)
{
    LC = new LedgerCell(positionX, positionY)
    data = await LC.getLastBlock()
    console.log(`${positionX}, ${positionY}`)
    return data
}