// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract TestERC1155 is ERC1155 {
    constructor(string memory baseURI) ERC1155(baseURI) {
    }

    function mintToken(uint256 tokenId, uint256 quantity) public {
        _mint(msg.sender, tokenId, quantity, "");
    }
}
