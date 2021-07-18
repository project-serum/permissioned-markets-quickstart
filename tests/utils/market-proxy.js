const { SYSVAR_RENT_PUBKEY } = require("@solana/web3.js");
const {
  OpenOrders,
  OpenOrdersPda,
  Logger,
  ReferralFees,
  MarketProxyBuilder,
} = require("/home/armaniferrante/Documents/code/src/github.com/project-serum/serum-ts/packages/serum");

// Returns a client for the market proxy.
//
// If changing the program, one will likely need to change the builder/middleware
// here as well.
async function load(connection, proxyProgramId, dexProgramId, market) {
  return new MarketProxyBuilder()
    .middleware(
      new OpenOrdersPda({
        proxyProgramId,
        dexProgramId,
      })
    )
    .middleware(new ReferralFees())
    .middleware(new Identity())
    .middleware(new Logger())
    .load({
      connection,
      market,
      dexProgramId,
      proxyProgramId,
      options: { commitment: "recent" },
    });
}

// Dummy identity middleware used for testing.
class Identity {
  initOpenOrders(ix) {
    this.proxy(ix);
  }
  newOrderV3(ix) {
    this.proxy(ix);
  }
  cancelOrderV2(ix) {
    this.proxy(ix);
  }
  cancelOrderByClientIdV2(ix) {
    this.proxy(ix);
  }
  settleFunds(ix) {
    this.proxy(ix);
  }
  closeOpenOrders(ix) {
    this.proxy(ix);
  }
  proxy(ix) {
    ix.keys = [
      { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
      ...ix.keys,
    ];
  }
}

module.exports = {
  load,
};
