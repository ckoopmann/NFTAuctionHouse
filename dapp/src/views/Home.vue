<template>
  <v-container>
    <v-row justify="center" align="center" data-testid="index-page">
      <v-col cols="12" sm="8" md="6">
        <h1>NFT Auction House</h1>
        <h3>
          The best place to sell your ERC-721 / 1155 tokens
          <br />
        </h3>
        <br />
        <h2>Benefits</h2>
        <ul>
          <li>
              Easily put any ERC-721/1155 token up for auction
          </li>
          <li>
              Sell arbitrary amounts of ERC1155 tokens in a single auction.
          </li>
          <li>
              Comission / Fee only charged upon successful sale
          </li>
        </ul>

        <br />
        <h2>The Process</h2>
        <ol>
          <li>
            Seller puts token up for auction by transfering the token and configuring the auction parameters.
          </li>
          <li>Potential buyers place bids on the auction by transfering the bid price plus comission</li>
          <li>Previous bidders are credited with a full refund as soon as they are outbid</li>
          <li>Any user can settle the auction after its configured expiry date has passed.</li>
          <li>Upon expiry token is transferred to highest bidder and seller is credited with sale price</li>
          <li>Users withdraw their credit through the Dapp</li>
        </ol>
      </v-col>
    </v-row>
  </v-container>
</template>

<style type="text/css">
ul {
  margin-top: 20px;
}

ol {
  margin-top: 20px;
}

ul li {
  list-style: none !important;
  padding: 10px 0;
}

ol li {
  padding: 10px 0;
}

li i {
  padding-right: 10px;
}

h1 {
  font-weight: bolder;
  font-size: 46px;
  padding: 30px 0;
  line-height: 55px;
}

h3 {
  font-weight: 300;
  font-size: 18px;
}
</style>
