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
      <v-list-item>
        <v-list-item-title>Expiration Date</v-list-item-title>
        <v-list-item-subtitle>{{
          expiryDate.toLocaleString("en-GB")
        }}</v-list-item-subtitle>
      </v-list-item>

      <v-card-actions>
        <v-spacer></v-spacer>

        <v-btn
          v-if="auctionCanBeCanceled"
          color="blue darken-1"
          type="button"
          @click.prevent="cancelAuctionButton"
          :loading="loading"
          :disabled="loading"
        >
          Cancel Auction
          <template #loader>
            <span>Loading...</span>
          </template>
        </v-btn>
        <v-btn
          v-if="auctionCanBeSettled"
          color="blue darken-1"
          type="button"
          @click.prevent="settleAuctionButton"
          :loading="loading"
          :disabled="loading"
        >
          Settle Auction
          <template #loader>
            <span>Loading...</span>
          </template>
        </v-btn>
        <PlaceBidDialogue v-if="canBid" :auctionId="auctionId" />
      </v-card-actions>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
import { ethers } from "ethers";
import PlaceBidDialogue from "./PlaceBidDialogue.vue";
export default {
  components: { PlaceBidDialogue },
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
  data() {
    return {
      loading: false,
    };
  },
  computed: {
    ...mapGetters("web3Module", ["selectedAccount", "blockTime"]),
    canBid() {
      return this.blockTime < this.expiryDate;
    },
    auctionCanBeSettled() {
      return this.blockTime > this.expiryDate;
    },
    auctionCanBeCanceled() {
      const userIsSeller =
        ethers.utils.getAddress(this.seller) ==
        ethers.utils.getAddress(this.selectedAccount);
      const noBidsYet = this.highestBidder == ethers.constants.AddressZero;
      return userIsSeller && noBidsYet;
    },
    tokenTypeString() {
      const tokenTypeMapping = {
        1: "ERC721",
        2: "ERC1155",
      };
      return tokenTypeMapping[this.tokenType];
    },
    highestBidderParsed() {
      if (
        ethers.utils.getAddress(this.highestBidder) ==
        ethers.utils.getAddress(this.selectedAccount)
      ) {
        return "You";
      }
      if (this.highestBidder == ethers.constants.AddressZero) {
        return "No bids yet";
      }
      return this.highestBidder;
    },
    sellerParsed() {
      if (
        ethers.utils.getAddress(this.seller) ==
        ethers.utils.getAddress(this.selectedAccount)
      ) {
        return "You";
      }
      return this.seller;
    },
  },
  methods: {
    ...mapActions("contractModule", [
      "cancelAuction",
      "settleAuction",
      "loadAuctions",
    ]),
    async settleAuctionButton() {
      try {
        this.loading = true;
        console.log(`settleing Auction ${this.auctionId}`);
        await this.settleAuction({
          auctionId: this.auctionId,
        });
        await this.loadAuctions();
      } catch (e) {
        console.error("Settleing auction failed with: ", e);
      } finally {
        this.loading = false;
      }
    },
    async cancelAuctionButton() {
      try {
        this.loading = true;
        console.log(`Canceling Auction ${this.auctionId}`);
        await this.cancelAuction({
          auctionId: this.auctionId,
        });
        await this.loadAuctions();
      } catch (e) {
        console.error("Cancling auction failed with: ", e);
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
