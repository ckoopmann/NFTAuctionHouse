<template>
  <v-row justify="center">
    <v-dialog v-model="dialog" persistent max-width="600px">
      <template v-slot:activator="{ on, attrs }">
        <v-btn color="primary" dark v-bind="attrs" v-on="on">
          Bid
        </v-btn>
      </template>
      <v-card>
        <v-card-title>
          <span class="headline">Place a Bid</span>
        </v-card-title>
        <form @submit.prevent="submit">
          <v-card-text>
            <v-container>
              <v-row>
                <v-text-field
                  v-model="bidPrice"
                  label="The amount you want to bid"
                  required
                ></v-text-field>
              </v-row>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue darken-1" text @click="close">
              Close
            </v-btn>
            <v-progress-circular
              indeterminate
              color="primary"
              v-if="loading"
            ></v-progress-circular>
            <v-btn v-else color="blue darken-1" text type="submit">
              Place bid
            </v-btn>
          </v-card-actions>
        </form>
      </v-card>
    </v-dialog>
  </v-row>
</template>

<script>
import { mapActions } from "vuex";

export default {
  name: "PlaceBid",
  props: {
    auctionId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      dialog: false,
      loading: false,
      bidPrice: "",
    };
  },

  methods: {
    ...mapActions("contractModule", ["placeBid", "loadAuctions"]),
    async submit() {
      try {
        const { auctionId, bidPrice } = this;
        this.loading = true;
        await this.placeBid({ auctionId, bidPrice });
        await this.loadAuctions();
        this.dialog = false;
      } finally {
        this.loading = false;
      }
    },
    close() {
      this.dialog = false;
    },
  },
};
</script>
