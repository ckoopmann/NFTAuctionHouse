# Unittests
This directory contains a set of tests for the Marketplace contract that check various aspects of the contract are workign as expected.
These tests are run as part of the CI (GithubActions) and can be run manually using `yarn hardhat test` (from the root directory).
Most of these tests are run twice once for `ERC721` token auction and once for `ERC1155`.

- [createAuction](createAuction.test.js): Checks that the contract method for creating new auctions works as expected. (including expected failures when conditions are not met)
- [cancelAuction](cancelAuction.test.js): Checks that the contract method for canceling an existing auction works as expected. (including expected failures when conditions are not met)
- [deployMarketplace](deployMarketplace.test.js): Checks that the constructor works and the Marketplace can be deployed.
- [fullAuctionLifecycle](fullAuctionLifecycle.test.js): The main test suite that checks the whole lifecycle of a sucessful auction. (Creation, Bidding, Settling)
- [helpers](helpers.js): A selection of helper methods for recurring tasks such as deploying contracts, creating auctions and minting test-tokens.


