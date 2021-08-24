<template>
  <v-card class="mx-auto my-12" max-width="500">
    <v-card-title>Create New Auction</v-card-title>
    <form>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="tokenContractAddress"
                label="Token Contract Address"
                hint="Address of the Smart Contract for the token you want to sell"
                persistent-hint
                :rules="[validAddress, notNullAddress]"
                required
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="tokenType"
                label="Token Type"
                :items="supportedTokenTypes"
                required
              ></v-select>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="tokenId"
                label="Token Id"
                required
              ></v-text-field>
            </v-col>
          </v-row>
          <div v-if="approved">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="quantity"
                  label="Quantity"
                  type="number"
                  required
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="startingPrice"
                  label="Starting Price"
                  type="number"
                  required
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-datetime-picker
                  v-model="expiryDate"
                  label="Expiry Date"
                  required
                  ><template slot="dateIcon">
                    <v-icon>mdi-calendar</v-icon>
                  </template>
                  <template slot="timeIcon">
                    <v-icon>mdi-clock</v-icon>
                  </template></v-datetime-picker
                >
              </v-col>
            </v-row>
          </div>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>

        <v-btn
          v-if="approved"
          color="blue darken-1"
          type="button"
          @click.prevent="createAuctionButton"
          :loading="loading"
          :disabled="loading"
        >
          Create Auction
          <template #loader>
            <span>Loading...</span>
          </template>
        </v-btn>
        <v-btn
          v-else
          color="blue darken-1"
          type="button"
          @click.prevent="approveTokenButton"
          :loading="loading"
          :disabled="loading"
        >
          Approve Token
          <template #loader>
            <span>Loading...</span>
          </template>
        </v-btn>
      </v-card-actions>
    </form>
  </v-card>
</template>

<script>
import { mapActions } from "vuex";
import { ethers } from "ethers";
export default {
  data() {
    return {
      loading: false,
      approved: false,
      tokenId: "",
      tokenContractAddress: "",
      quantity: 1,
      tokenType: "ERC721",
      supportedTokenTypes: ["ERC721", "ERC1155"],
      startingPrice: 0,
      expiryDate: new Date(Date.now() + 60 * 60 * 1000),
    };
  },
  methods: {
    ...mapActions("contractModule", [
      "approveToken",
      "createAuction",
      "loadAuctions",
    ]),

    async approveTokenButton() {
      try {
        this.loading = true;
        console.log(
          `Approving token ${this.tokenId} of contract ${this.tokenContractAddress}`
        );
        await this.approveToken({
          tokenId: this.tokenId,
          tokenContractAddress: this.tokenContractAddress,
          tokenType: this.tokenType,
        });
        this.approved = true;
      } catch (e) {
        console.error("Approval failed with exception: ", e);
      } finally {
        this.loading = false;
      }
    },

    async createAuctionButton() {
      try {
        this.loading = true;
        console.log(
          `Creating auction for token ${this.tokenId} of contract ${this.tokenContractAddress}`
        );
        await this.createAuction({
          tokenId: this.tokenId,
          tokenContractAddress: this.tokenContractAddress,
          tokenType: this.tokenType,
          quantity: this.quantity,
          startingPrice: this.startingPrice,
          expiryDate: this.expiryDate,
        });
        this.approved = false;
        this.loadAuctions();
      } catch (e) {
        console.error("Create Auction failed with exception: ", e);
      } finally {
        this.loading = false;
      }
    },

    validAddress(address) {
      return (
        ethers.utils.isAddress(address) || "Please provide a valid address"
      );
    },

    notNullAddress(address) {
      return (
        address !== "0x0000000000000000000000000000000000000000" ||
        "Cannot set Zero Address"
      );
    },
  },
};
</script>
