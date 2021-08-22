//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// Dummy NFT-Contract for use in tests
contract TestERC721 is ERC721URIStorage{

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    string public baseURI;

    constructor(string memory tokenName, string memory symbol, string memory baseURIArg) ERC721(tokenName, symbol) {
        baseURI = baseURIArg;
    }

    function _baseURI() internal override view returns (string memory) {
        return baseURI;
    }

    function mintToken(string memory tokenURI)
    public returns (uint256)
    {
        _tokenIds.increment();

        uint256 id = _tokenIds.current();
        _safeMint(msg.sender, id);
        _setTokenURI(id, tokenURI);

        return id;
    }

}
