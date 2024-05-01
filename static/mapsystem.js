function Hexadecimal(toHex){
    var toHex = parseInt(toHex)
    return toHex.toString(16)
}

// get plaintext date/time
function getTimeString(ts){
    if (parseInt(ts) == 0) { return '--- --- ---- -- --- --- -' }
    var tsstring = new Date(parseInt(ts)).toLocaleString()
    return tsstring
}

/**
 * block level linking
 */
function getLinks(){
    
    hrefPv = document.getElementById('pvBlockLinkInit').innerHTML;
    hrefNx = document.getElementById('nxBlockLinkInit').innerHTML;
    
    if (hrefPv != '#') { document.getElementById('pvBlockLink').href = hrefPv }
    if (hrefNx != '#') { document.getElementById('nxBlockLink').href = hrefNx }
    
}

/**
 * block level initialization
 */
function initialize(){
    // enable back to grid icon
    toggle('backToGrid')

    let canMint = document.getElementById('userAuth').innerHTML;

    if (canMint == 'true') toggle('userCanMint')

    // <= xTSinit(ts)
    let latestTS = document.getElementById('latestTSinit').innerHTML;
    let nextTS = document.getElementById('nextTSinit').innerHTML;
    let blockTS = document.getElementById('blockTSinit').innerHTML;
    let prevTS = document.getElementById('prevTSinit').innerHTML;
    let genesisTS = document.getElementById('genesisTSinit').innerHTML;
    // => time++
    rotateTS('latestTS', latestTS)
    rotateTS('nextTS', nextTS)
    rotateTS('blockTS', blockTS)
    rotateTS('prevTS', prevTS)
    rotateTS('genesisTS', genesisTS)
    // => timestamp -> date/time string
    document.getElementById('latestTSStr').innerHTML = getTimeString(latestTS)
    document.getElementById('nextTSStr').innerHTML = getTimeString(nextTS)
    document.getElementById('blockTSStr').innerHTML = getTimeString(blockTS)
    document.getElementById('prevTSStr').innerHTML = getTimeString(prevTS)
    document.getElementById('genesisTSStr').innerHTML = getTimeString(genesisTS)
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

    if (blockType != 0) toggle('canRetrospect'+blockUUID)
    if (blockType == 2) blockCell.style.backgroundColor = '#009db254'
    if (blockType == 3) blockCell.style.backgroundColor = '#b2af0054'
    if (blockType == 4) blockCell.style.backgroundColor = '#c29ebf54'
    if (blockType == 5) blockCell.style.backgroundColor = '#ff000033'
    if (blockType == 6) blockCell.style.backgroundColor = '#2d2d2d'

    console.log('Initialized',blockUUID,blockType)
}