<template>
  <v-card class="mx-auto my-12" max-width="500">
    <v-card-title>Auction No. {{ auctionId }}</v-card-title>
    <v-card-text>
      <v-list-item>
        <v-list-item-title>Token Contract</v-list-item-title>
        <v-list-item-subtitle>{{ contractAddress }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <v-list-item-title>Token Id</v-list-item-title>
        <v-list-item-subtitle>{{ tokenId }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <v-list-item-title>Token Type</v-list-item-title>
        <v-list-item-subtitle>{{ tokenTypeString }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <v-list-item-title>Quantity</v-list-item-title>
        <v-list-item-subtitle>{{ quantity }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <v-list-item-title>Current Price</v-list-item-title>
        <v-list-item-subtitle>{{ currentPrice }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <v-list-item-title>Highest Bidder</v-list-item-title>
        <v-list-item-subtitle>{{ highestBidderParsed }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <v-list-item-title>Seller </v-list-item-title>
        <v-list-item-subtitle>{{ sellerParsed }}</v-list-item-subtitle>
      </v-list-item>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapGetters } from "vuex";
import { ethers } from "ethers";
export default {
  props: [
    "auctionId",
    "contractAddress",
    "currentPrice",
    "expiryDate",
    "highestBidder",
    "quantity",
    "seller",
    "status",
    "tokenId",
    "tokenType",
  ],
  computed: {
    ...mapGetters("web3Module", ["selectedAccount"]),
    tokenTypeString() {
      const tokenTypeMapping = {
        1: "ERC721",
        2: "ERC1155",
      };
      return tokenTypeMapping[this.tokenType];
    },
    highestBidderParsed() {
      if (ethers.utils.getAddress(this.highestBidder) == ethers.utils.getAddress(this.selectedAccount)) {
        return "You";
      }
      if (this.highestBidder == ethers.constants.AddressZero) {
        return "No bids yet";
      }
      return this.highestBidder;
    },
    sellerParsed() {
      if (ethers.utils.getAddress(this.seller) == ethers.utils.getAddress(this.selectedAccount)) {
        return "You";
      }
      return this.seller;
    },
  },
};
</script>
