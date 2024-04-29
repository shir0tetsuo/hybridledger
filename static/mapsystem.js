function Hexadecimal(toHex){
    var toHex = parseInt(toHex)
    return toHex.toString(16)
}

var cells = [ ] // makes it easier to drag cells around and apply functions
var blockUUID;

/**
 * Initialize blockElement
 * 
 * @param {uuid} blockUUID 
 */
function initCell(blockUUID) {

    var blockCell = document.getElementById('Cell'+blockUUID)
    var blockType = parseInt(document.getElementById('type'+blockUUID).innerHTML);

    var mintable = document.getElementById('mint'+blockUUID).innerHTML;

    if (mintable == 'true') {
        toggle('canMint'+blockUUID)
    }

    if (blockType == 2) blockCell.style.backgroundColor = '#0000ff33'
    if (blockType == 5) blockCell.style.backgroundColor = '#ff000033'

    console.log('Initialized',blockUUID,blockType)
}