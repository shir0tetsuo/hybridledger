# HybridLedger

Demonstration: https://shadowsword.ca/
![Version](https://img.shields.io/badge/Version-2.3.1-indigo "VER")

# Description
This is a web application that allows users to create and manage a "time-oriented" hybrid ledger system. A hybrid ledger is a centralized position-relative block chain that combines the ability to retroactively inspect the histories of created blocks that contain data values, of which appreciates value over time. Unlike cryptocurrencies,  the system is intended to be used as a personal data storage system, designed to be lightweight and operated on single board computers as personal data storage wallets. It's possible to create new blocks on top of ledgers owned by other users, as long as the user's net value exceeds the value of the ledger to purchase.

The system can be repurposed to track various types of data, suitable for numerous data storage tasks. The code has been separated into modules for ease of readability/access.

Every block in the system is assigned a unique identifier and a QR Code. There is an "infinite" number of spaces encoded in Hexadecimal.

There are currently **no plans to implement a multi-server system,** currently there isn't a need for it as this was designed for private use among select few. Anyone is welcome to suggest improvements, optimizations, or features to this project. Listed as `MIT License` 

# Routes
- `/`: The home page of the application. (GET)
- `/uac`: The user access control page. (GET)
- `/uac/login`: Login to the application. (POST)
- `/logout`: Log out of the application. (GET) (301)
- `/user/:uuid`: The profile page for a given user. (GET)
- `/gate`: The main application page. (GET)
- `/gate/last/:xpos/:ypos`: The last block in a given area of the ledger. (GET)
- `/gate/minttime`: Get the time left until the user can mint a new block. (POST)
- `/mint/:address`: The page for minting a new block to a given ledger. (GET, POST)
- `/hl/:address/:index`: Get the data for a given block. (GET)
- `/hl/:address/:index/qr`: Get the QR code for a given block. (GET) (PNG)
- `/b/:uuid`: The page for viewing a given block. (GET)
- `/b/:address/:index`: Redirect to `/b/:uuid` (GET) (301)

# Software
- Node JS/HTML/CSS/JS/SQLite3 Web Application

# Deployment
Update the variables to the equivalent in your setup.