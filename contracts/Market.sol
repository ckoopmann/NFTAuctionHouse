//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Market is Ownable, ReentrancyGuard {
  uint256 public commissionPercentage;
  uint256 public minimumCommission;

  constructor(uint256 _commissionPercentage, uint256 _minimumCommission) {
      commissionPercentage = _commissionPercentage;
      minimumCommission = _minimumCommission;
  }


}
