// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";


/**
 * @title NFT Auction Market
 * @dev NFT Marketplace for creating auctions on ERC-721 tokens
 * 
 * This contract implements a marketplace where sellers can put their NFTs
 * up for auction and would-be buyers can place bids on those NFTs.
 * Sellers can choose a minimum / starting bid, an expiry time when the auction ends
 * as well as the contract address and id of the token to sell.
 * Before creating an auction the seller has to approve this contract for the respective token,
 * which will be held in escrow until the auction ends.
 * When placing a bid the buyer has to transfer the amount he wants to bid plus commission to the 
 * contract, which he will be refunded in case he gets outbid.
 * After the specified expiry date of an auction anyone can trigger the settlement 
 * which will transfer the token to its new owner as well as credit the seller with the 
 * sale price.
 * All comissions will be credited to the owner / deployer of the marketplace contract.
 */
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

  // Save Users credit balances (to be used when they are outbid)
  mapping(address => uint256) userCredits;
  


  using Counters for Counters.Counter;
  // Number of auctions ever listed
  Counters.Counter private totalAuctionCount;
  // Number of auctions already sold
  Counters.Counter private closedAuctionCount;

  enum TokenType { NONE, ERC721, ERC1155 }
  enum AuctionStatus { NONE, OPEN, SETTLED, CANCELED }

  struct Auction {
      address contractAddress;
      uint256 tokenId;
      uint256 currentPrice;
      address seller;
      address highestBidder;
      AuctionStatus status;
      uint256 expiryDate;
      uint256 auctionId;
      TokenType tokenType;
      uint256 quantity;
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

  event AuctionSettled(
      uint256 auctionId,
      bool sold
  );

  event BidPlaced(
      uint256 auctionId,
      uint256 bidPrice
  );

 event UserCredited(
     address creditAddress,
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
  /**
   * @dev Creates a new auction and transfers the token to the contract to be held in escrow until the end of the auction.
   * Requires this contract to be approved for the token to be auctioned.
   */
  function createAuction(address _contractAddress, uint256 _tokenId, uint256 _startingPrice, uint256 expiryDate, TokenType tokenType, uint256 _quantity) public nonReentrant returns(uint256 auctionId){
      require(expiryDate.sub(minimumAuctionLiveness) > block.timestamp, "Expiry date is not far enough in the future");
      require(tokenType != TokenType.NONE, "Invalid token type provided");

      uint256 quantity = 1;
      if(tokenType == TokenType.ERC1155){
        quantity = _quantity;
      }

      // Generate Auction Id
      totalAuctionCount.increment();
      auctionId = totalAuctionCount.current();

      // Register new Auction
      auctions[auctionId] = Auction(_contractAddress, _tokenId, _startingPrice, msg.sender, address(0), AuctionStatus.OPEN, expiryDate, auctionId, tokenType, quantity);

      // Transfer Token
      transferToken(auctionId, msg.sender, address(this));


      emit AuctionCreated(auctionId, _contractAddress, _tokenId, _startingPrice, msg.sender, expiryDate);
  }

  /**
   * @dev Returns all auctions that are still in "open" status
   */
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

  /**
   * @dev Cancels an auction and returns the token to the original owner.
   * Requires the caller to be the seller who created the auction, the auction to be open and no bids having been placed on it.
   */
  function cancelAuction(uint256 auctionId) public openAuction(auctionId) noBids(auctionId) sellerOnly(auctionId) nonReentrant{
      auctions[auctionId].status = AuctionStatus.CANCELED;
      closedAuctionCount.increment();
      transferToken(auctionId, address(this), msg.sender);
      emit AuctionCanceled(auctionId);
  }

  /**
   * @dev Settles an auction.
   * If at least one bid has been placed the token will be transfered to its new owner, the seller will be credited the sale price
   * and the contract owner will be credited the commission.
   * If no bid has been placed on the token it will just be transfered back to its original owner.
   */
  function settleAuction(uint256 auctionId) public openAuction(auctionId) onlyExpiredAuction(auctionId) nonReentrant{
      Auction storage auction = auctions[auctionId];
      auction.status = AuctionStatus.SETTLED;
      closedAuctionCount.increment();
      
      bool sold = auction.highestBidder != address(0);
      if(sold){
        // If token was sold transfer it to its new owner and credit seller / contractOwner with price / commission
        transferToken(auctionId, address(this), auction.highestBidder);
        creditUser(auction.seller, auction.currentPrice);
        creditUser(owner(), calculateCommission(auction.currentPrice));
      }
      else{
        // If token was not sold, return ownership to the seller
        transferToken(auctionId, address(this), auction.seller);
      }
      
      emit AuctionSettled(auctionId, sold);
  }


  /**
   * @dev Credit user with given amount in ETH
   * Credits a user with a given amount that he can later withdraw from the contract.
   * Used to refund outbidden buyers and credit sellers / contract owner upon sucessfull sale.
   */
  function creditUser(address creditAddress, uint256 amount) private {
      userCredits[creditAddress] = userCredits[creditAddress].add(amount);
      emit UserCredited(creditAddress, amount);
  }

  /**
   * @dev Withdraws all credit of the caller
   * Transfers all of his credit to the caller and sets the balance to 0
   * Fails if caller has no credit.
   */
  function withdrawCredit() public nonReentrant{
      uint256 creditBalance = userCredits[msg.sender];
      require(creditBalance > 0, "User has no credits to withdraw");
      userCredits[msg.sender] = 0;

      (bool success, ) = msg.sender.call{value: creditBalance}("");
      require(success);
  }


  /**
   * @dev Places a bid on the selected auction at the selected price
   * Requires the provided bid price to exceed the current highest bid by at least the minimumBidSize.
   * Also requires the caller to transfer the exact amount of the chosen bidPrice plus commission, to be held in escrow by the contract
   * until the auction is settled or a higher bid is placed.
   */
  function placeBid(uint256 auctionId, uint256 bidPrice) public payable openAuction(auctionId) nonExpiredAuction(auctionId) nonReentrant{
      Auction storage auction = auctions[auctionId];
      require(bidPrice >= auction.currentPrice.add(minimumBidSize), "Bid has to exceed current price by the minimumBidSize or more");
      require(msg.value == bidPrice.add(calculateCommission(bidPrice)), "Transaction value has to equal price + commission");
    
      // If this is not the first bid, credit the previous highest bidder
      address previousBidder = auction.highestBidder;
      if(previousBidder != address(0)){
        uint256 creditAmount = auction.currentPrice.add(calculateCommission(auction.currentPrice));
        creditUser(previousBidder, creditAmount);
      }
    
      auction.highestBidder = msg.sender;
      auction.currentPrice = bidPrice;
      emit BidPlaced(auctionId, bidPrice);
  }

  function transferToken(uint256 auctionId, address from, address to) private {
      require(to != address(0), "Cannot transfer token to zero address");

      Auction storage auction = auctions[auctionId];
      require(auction.status != AuctionStatus.NONE, "Cannot transfer token of non existent auction");

      TokenType tokenType = auction.tokenType;
      uint256 tokenId = auction.tokenId;
      address contractAddress = auction.contractAddress;

      if(tokenType == TokenType.ERC721){
        IERC721(contractAddress).transferFrom(from, to, tokenId);
      }
      else if(tokenType == TokenType.ERC1155){
        uint256 quantity = auction.quantity;
        require(quantity > 0, "Cannot create a ERC1155 auction with zero quantity");
        IERC1155(contractAddress).safeTransferFrom(from, to, tokenId, quantity, "");
      }
      else{
        revert("Invalid token type for transfer");
      }
  }
  
}
