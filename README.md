![Tests](https://github.com/ckoopmann/NFTAuctionHouse/actions/workflows/integrate.yml/badge.svg)
[![Netlify Status](https://api.netlify.com/api/v1/badges/b9cee689-6848-483f-b2a2-0e70b7b76220/deploy-status)](https://app.netlify.com/sites/gifted-jepsen-f72e4d/deploys)
# NFT Auction House

A decentralized application to sell ERC721/1155 Tokens in an auction mechanism.

## Features

- Easily put any ERC-721/1155 token up for auction
- Sell arbitrary amounts of ERC1155 tokens in a single auction.
- Comission / Fee only charged upon successful sale

## Contracts

All contracts are deployed on the Rinkeby Testnet.
On etherscan you can find the authenticated source-code for the [Marketplace](https://rinkeby.etherscan.io/address/0xDf0458f8F6e58CC7D08b7Bf002dC33f0A2642A93#code)
contract that contains the app logic as well as
[ERC-721](https://rinkeby.etherscan.io/address/0x4D7Fa1a52c2D42727Ca28f8f1e5FFB87C72B87A8#code)
and
[ERC-1155](https://rinkeby.etherscan.io/address/0xb050236550fB928F81DeBFEf7B7Af5b9d533Cd38#code) test
contracts for minting free tokens that you can use in the dapp.

## Deployment

You can find a demo version of the frontend DApp running at [nftauctionhouse.xyz](https://nftauctionhouse.xyz).
To use it you will need to have Metamask installed and connected to the Rinkeby Testnet.
You will also need Rinkeby ETH which you can get for free [here](https://faucet.rinkeby.io/)

## Process

The general workflow for trading tokens on NFTAuctionHouse is the following:

1. Seller puts token up for auction by transfering the token and configuring the auction parameters.
2. Potential buyers place bids on the auction by transfering the bid price plus comission
3. Previous bidders are credited with a full refund as soon as they are outbid
4. Any user can settle the auction after its configured expiry date has passed.
5. Upon expiry token is transferred to highest bidder and seller is credited with sale price
6. Users withdraw their credit through the Dapp

## Implementation
### Contracts
#### Source Code
The solidity code for all contracts can be found in the [contracts](contracts) directory.

#### Tests
The marketplace contract is thoroughly tested with an array of unittests checking the overall workflow described above 
as well as individual methods.
All contract tests can be found in the [test](test) directory.

### Frontend UI
The user interface that is deployed under above mentioned domain is implemented as a [Vue.js](https://vuejs.org/) application,
the source code of which can be found in the [dapp](dapp) directory.
