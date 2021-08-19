//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// Dummy NFT-Contract for use in tests
contract TestERC721 is ERC721{

    constructor(string memory tokenName, string memory symbol) ERC721(tokenName, symbol) {
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://ipfs.io/ipfs/";
    }
}
