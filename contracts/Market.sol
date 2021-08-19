//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";


contract Market is Ownable, ReentrancyGuard {

  // Protect against overflow
  using SafeMath for uint256;
  // Add math utilities missing in solidity
  using Math for uint256;
  
  // Commission in percentage of sale price charged for every sold listing
  uint256 public commissionPercentage;
  // Lower bound of total Commission charged per sale
  uint256 public minimumCommission;


  using Counters for Counters.Counter;
  // Number of listings ever listed
  Counters.Counter private totalListingCount;
  // Number of listings already sold
  Counters.Counter private soldListingCount;

  enum TokenType { NONE, ERC721, ERC1155 }
  enum ListingStatus { NONE, OPEN, SOLD, NOTSOLD, CANCELED }

  struct Listing {
      address contractAddress;
      uint256 tokenId;
      uint256 currentPrice;
      address seller;
      address highestBidder;
      ListingStatus status;
  }

  mapping(uint256 => Listing) public listings;

  constructor(uint256 _commissionPercentage, uint256 _minimumCommission) {
      commissionPercentage = _commissionPercentage;
      minimumCommission = _minimumCommission;
  }

  // Calculate commission due for an listing based on its salePrice
  function calculateCommission(uint256 _salePrice) public view returns(uint256 commission){
      commission  = commissionPercentage.mul(_salePrice).div(1 ether);
      commission = commission.max(minimumCommission);
  }

  // Create Listing
  function createListing(address _contractAddress, uint256 _tokenId, uint256 _startingPrice) public nonReentrant returns(uint256 listingId){

      // Transfer NFT to market contract
      IERC721(_contractAddress).transferFrom(msg.sender, address(this), _tokenId);

      // Generate Listing Id
      totalListingCount.increment();
      listingId = totalListingCount.current();

      // Register new Listing
      listings[listingId] = Listing(_contractAddress, _tokenId, _startingPrice, msg.sender, msg.sender, ListingStatus.OPEN);
      
  }
  


}
