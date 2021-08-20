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
  
  // Commission in percentage of sale price charged for every sold auction
  uint256 public commissionPercentage;
  // Lower bound of total Commission charged per sale
  uint256 public minimumCommission;


  using Counters for Counters.Counter;
  // Number of auctions ever listed
  Counters.Counter private totalAuctionCount;
  // Number of auctions already sold
  Counters.Counter private closedAuctionCount;

  enum TokenType { NONE, ERC721, ERC1155 }
  enum AuctionStatus { NONE, OPEN, SOLD, NOTSOLD, CANCELED }

  struct Auction {
      address contractAddress;
      uint256 tokenId;
      uint256 currentPrice;
      address seller;
      address highestBidder;
      AuctionStatus status;
  }

  mapping(uint256 => Auction) public auctions;

  constructor(uint256 _commissionPercentage, uint256 _minimumCommission) {
      commissionPercentage = _commissionPercentage;
      minimumCommission = _minimumCommission;
  }

  // EVENTS
  event AuctionCreated(
      uint256 auctionId,
      address contractAddress,
      uint256 tokenId,
      uint256 startingPrice,
      address seller
  );

  event AuctionCanceled(
      uint256 auctionId
  );


  // MODIFIERS
  modifier openAuction(uint256 auctionId) {
      require(auctions[auctionId].status == AuctionStatus.OPEN, "Transaction only permissible for open Auctions");
        _;
  }

  modifier noBids(uint256 auctionId) {
      require(auctions[auctionId].highestBidder == address(0), "Auction has bids already");
        _;
  }

  modifier sellerOnly(uint256 auctionId) {
      require(msg.sender == auctions[auctionId].seller, "Caller is not Seller");
        _;
  }

  // Calculate commission due for an auction based on its salePrice
  function calculateCommission(uint256 _salePrice) public view returns(uint256 commission){
      commission  = commissionPercentage.mul(_salePrice).div(1 ether);
      commission = commission.max(minimumCommission);
  }

  // Create Auction
  function createAuction(address _contractAddress, uint256 _tokenId, uint256 _startingPrice) public nonReentrant returns(uint256 auctionId){

      // Transfer NFT to market contract
      IERC721(_contractAddress).transferFrom(msg.sender, address(this), _tokenId);

      // Generate Auction Id
      totalAuctionCount.increment();
      auctionId = totalAuctionCount.current();

      // Register new Auction
      auctions[auctionId] = Auction(_contractAddress, _tokenId, _startingPrice, msg.sender, address(0), AuctionStatus.OPEN);
      emit AuctionCreated(auctionId, _contractAddress, _tokenId, _startingPrice, msg.sender);
  }

  // Get all Open Auctions that have not yet been sold, expired or cancelled
  function getOpenAuctions() public view returns(Auction[] memory){
      uint256 openAuctionsCount = totalAuctionCount.current().sub(closedAuctionCount.current());
      uint resultIndex = 0;

      Auction[] memory openAuctions = new Auction[](openAuctionsCount);
      for(uint i = 1; i <= totalAuctionCount.current(); i++){
          if(auctions[i].status == AuctionStatus.OPEN){
              openAuctions[resultIndex] = auctions[i];
              resultIndex++;
          }
      }

      return openAuctions;
  }

  // Create Auction
  function cancelAuction(uint256 auctionId) public openAuction(auctionId) noBids(auctionId) sellerOnly(auctionId) nonReentrant{
      auctions[auctionId].status = AuctionStatus.CANCELED;
      closedAuctionCount.increment();
      IERC721(auctions[auctionId].contractAddress).transferFrom(address(this), msg.sender, auctions[auctionId].tokenId);
      emit AuctionCanceled(auctionId);
  }

}
