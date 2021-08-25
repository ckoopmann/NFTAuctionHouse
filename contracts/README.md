# Smart Contracts
This directory contains the solidity source code for the following smart contracts.

- [Market](Market.sol): This is the main Marketplace contract that implements the logic of creating, cancelling and settling auctions as well as bidding and the handling of user funds.
- [ERC1155Receiver](ERC1155Receiver.sol): This is an implementation of the IERC1155Receiver interface that needs to be fulfilled by any contract that wants to receive ERC-1155 tokens.
- [TestERC721](TestERC721.sol): This is a simple implementation of an ERC721 contract that allows for simple and free minting of tokens that can be used to test the Marketplace.
- [TestERC1155](TestERC1155.sol): Same as above but for ERC1155 tokens.

