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
  // Minimum amount by which a new bid has to exceed previousBid
  uint256 public minimumBidSize;
  // Minimum duration in seconds for which the auction has to be live
  uint256 public minimumAuctionLiveness;

  // Save Users refund balances (to be used when they are outbid)
  mapping(address => uint256) userRefunds;
  


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
      uint256 expiryDate;
  }

  mapping(uint256 => Auction) public auctions;

  constructor(uint256 _commissionPercentage, uint256 _minimumCommission, uint256 _minimumBidSize, uint256 _minimumAuctionLiveness) {
      commissionPercentage = _commissionPercentage;
      minimumCommission = _minimumCommission;
      minimumBidSize = _minimumBidSize;
      minimumAuctionLiveness = _minimumAuctionLiveness;
  }

  // EVENTS
  event AuctionCreated(
      uint256 auctionId,
      address contractAddress,
      uint256 tokenId,
      uint256 startingPrice,
      address seller,
      uint256 expiryDate
  );

  event AuctionCanceled(
      uint256 auctionId
  );

  event BidPlaced(
      uint256 auctionId,
      uint256 bidPrice
  );

 event UserRefunded(
     address refundAddress,
     uint256 amount
 );




  // MODIFIERS
  modifier openAuction(uint256 auctionId) {
      require(auctions[auctionId].status == AuctionStatus.OPEN, "Transaction only permissible for open Auctions");
        _;
  }

  modifier nonExpiredAuction(uint256 auctionId) {
      require(auctions[auctionId].expiryDate >= block.timestamp, "Transaction not valid for expired Auctions");
        _;
  }

  modifier onlyExpiredAuction(uint256 auctionId) {
      require(auctions[auctionId].expiryDate < block.timestamp, "Transaction only valid for expired Auctions");
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


  // AUCTION MANAGEMENT
  // Create Auction
  function createAuction(address _contractAddress, uint256 _tokenId, uint256 _startingPrice, uint256 expiryDate) public nonReentrant returns(uint256 auctionId){
      require(expiryDate.sub(minimumAuctionLiveness) > block.timestamp, "Expiry date is not far enough in the future");

      // Transfer NFT to market contract
      IERC721(_contractAddress).transferFrom(msg.sender, address(this), _tokenId);

      // Generate Auction Id
      totalAuctionCount.increment();
      auctionId = totalAuctionCount.current();

      // Register new Auction
      auctions[auctionId] = Auction(_contractAddress, _tokenId, _startingPrice, msg.sender, address(0), AuctionStatus.OPEN, expiryDate);
      emit AuctionCreated(auctionId, _contractAddress, _tokenId, _startingPrice, msg.sender, expiryDate);
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

  // BIDDING
  function refundUser(address refundAddress, uint256 amount) private {
      userRefunds[refundAddress] = userRefunds[refundAddress].add(amount);
      emit UserRefunded(refundAddress, amount);
  }

  function withdrawRefund() public nonReentrant{
      uint256 refundBalance = userRefunds[msg.sender];
      require(refundBalance > 0, "User has no refunds to withdraw");
      userRefunds[msg.sender] = 0;

      (bool success, ) = msg.sender.call{value: refundBalance}("");
      require(success);
  }


  function placeBid(uint256 auctionId, uint256 bidPrice) public payable openAuction(auctionId) nonExpiredAuction(auctionId) nonReentrant{
      Auction storage auction = auctions[auctionId];
      require(bidPrice >= auction.currentPrice.add(minimumBidSize), "Bid has to exceed current price by the minimumBidSize or more");
      require(msg.value == bidPrice.add(calculateCommission(bidPrice)), "Transaction value has to equal price + commission");
    
      // If this is not the first bid, refund the previous highest bidder
      address previousBidder = auction.highestBidder;
      if(previousBidder != address(0)){
        uint256 refundAmount = auction.currentPrice.add(calculateCommission(auction.currentPrice));
        refundUser(previousBidder, refundAmount);
      }
    
      auction.highestBidder = msg.sender;
      auction.currentPrice = bidPrice;
      emit BidPlaced(auctionId, bidPrice);
  }
  
}
