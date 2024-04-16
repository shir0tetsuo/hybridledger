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

// Get the path for this file:
const path = require('path');
const fs = require('fs');

// Get the path to the database file:
const systemDB = path.join(__dirname, 'database.sqlite');

const Sequelize = require('sequelize')

const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  logging: false,
  storage: systemDB,
});

const Users = sequelize.define('Users', {
    userUUID: { type: Sequelize.STRING, unique: true, allowNull: false },
    userName: { type: Sequelize.STRING, unique: true, allowNull: false },
    userEmail: { type: Sequelize.STRING },
    publicName: { type: Sequelize.STRING },
    accountType: { type: Sequelize.INTEGER, defaultValue: 0 },
    emoji: { type: Sequelize.STRING },
    displayEmail: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    privatePassword: { type: Sequelize.STRING, allowNull: false }
})

const Ledgers = sequelize.define('HybridLedgers', {
    index: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    position: { type: Sequelize.STRING, allowNull: false },
    ownership: { type: Sequelize.STRING, allowNull: false },
    blockType: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    data: { type: Sequelize.STRING },
    previousHash: { type: Sequelize.STRING, allowNull: false, defaultValue: '0' },
    minted: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    nonce: { type: Sequelize.INTEGER, allowNull: false},
    timestamp: { type: Sequelize.INTEGER, allowNull: false },
    uuid: { type: Sequelize.STRING, allowNull: false }
})

// create the tables
sequelize.sync()
Users.sync()
Ledgers.sync()

// functions

// => read user
// => write user
// => update user
// => delete user (admin)

module.exports = {
    Users,
    Ledgers
}