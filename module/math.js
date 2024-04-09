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

/**
 * Use any `seed` string to find deterministic value in values
 * @param {string} seed 
 * @param {list} values 
 * @returns {string} deterministic string in values by seed
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

/**
 * rng `0 - max`
 * @param {number} max 
 * @returns {number} integer
 */
function getRandomInt(max) { return Math.floor(Math.random() * Math.floor(max)); }

function newUUID() { 
    uuid = uuidv4()
    return uuid 
}

// export functions
module.exports = {
    getDeterministicValue,
    getRandomInt,
    newUUID
}