<template>
  <div>
    <OpenAuctionCard
      v-for="auction in openAuctionList"
      :key="auction.auctionId"
      v-bind="auction"
    />
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import OpenAuctionCard from "../components/OpenAuctionCard.vue";
export default {
  name: "Open Auctions",
  components: { OpenAuctionCard },
  computed: mapGetters( "contractModule" , ["openAuctionList"])
};
</script>
