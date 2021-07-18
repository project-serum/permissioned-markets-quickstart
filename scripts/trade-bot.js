#!/usr/bin/env node

// Script to infinitely post orders that are immediately filled.

const process = require("process");
const anchor = require("@project-serum/anchor");
const PublicKey = anchor.web3.PublicKey;
const marketMaker = require("../tests/utils/market-maker");

const MARKET_MAKER = marketMaker.KEYPAIR;

async function main() {
  const market = new PublicKey(process.argv[2]);
  const provider = anchor.Provider.local();
  // TODO: enable the trade bot.
  //  runTradeBot(market, provider);
}

async function runTradeBot(market, provider, iterations = undefined) {
  const marketProxyClient = marketProxy.load(
    provider.connection,
    proxyProgramId,
    DEX_PID,
    market
  );
  const baseTokenUser1 = (
    await marketProxyClient.market.getTokenAccountsByOwnerForMint(
      provider.connection,
      MARKET_MAKER.publicKey,
      marketProxyClient.market.baseMintAddress
    )
  )[0].pubkey;
  const quoteTokenUser1 = (
    await marketProxyClient.market.getTokenAccountsByOwnerForMint(
      provider.connection,
      MARKET_MAKER.publicKey,
      marketProxyClient.market.quoteMintAddress
    )
  )[0].pubkey;

  const baseTokenUser2 = (
    await marketProxyClient.market.getTokenAccountsByOwnerForMint(
      provider.connection,
      provider.wallet.publicKey,
      marketProxyClient.market.baseMintAddress
    )
  )[0].pubkey;
  const quoteTokenUser2 = (
    await marketProxyClient.market.getTokenAccountsByOwnerForMint(
      provider.connection,
      provider.wallet.publicKey,
      marketProxyClient.market.quoteMintAddress
    )
  )[0].pubkey;

  const makerOpenOrdersUser1 = (
    await OpenOrders.findForMarketAndOwner(
      provider.connection,
      market,
      MARKET_MAKER.publicKey,
      DEX_PID
    )
  )[0];
  makerOpenOrdersUser2 = (
    await OpenOrders.findForMarketAndOwner(
      provider.connection,
      market,
      provider.wallet.publicKey,
      DEX_PID
    )
  )[0];

  const price = 6.041;
  const size = 700000.8;

  let maker = MARKET_MAKER;
  let taker = provider.wallet.payer;
  let baseToken = baseTokenUser1;
  let quoteToken = quoteTokenUser2;
  let makerOpenOrders = makerOpenOrdersUser1;

  let k = 1;

  while (true) {
    if (iterations && k > iterations) {
      break;
    }
    const clientId = new BN(k);
    if (k % 5 === 0) {
      if (maker.publicKey.equals(MARKET_MAKER.publicKey)) {
        maker = provider.wallet.payer;
        makerOpenOrders = makerOpenOrdersUser2;
        taker = MARKET_MAKER;
        baseToken = baseTokenUser2;
        quoteToken = quoteTokenUser1;
      } else {
        maker = MARKET_MAKER;
        makerOpenOrders = makerOpenOrdersUser1;
        taker = provider.wallet.payer;
        baseToken = baseTokenUser1;
        quoteToken = quoteTokenUser2;
      }
    }

    // Post ask.
    const txAsk = new Transaction();
    txAsk.add(
      await marketProxyClient.instruction.newOrderV3({
        owner: maker,
        payer: baseToken,
        side: "sell",
        price,
        size,
        orderType: "postOnly",
        clientId,
        openOrdersAddressKey: undefined,
        openOrdersAccount: undefined,
        feeDiscountPubkey: null,
        selfTradeBehavior: "abortTransaction",
      })
    );
    let txSig = await provider.send(txAsk, [maker]);
    console.log("Ask", txSig);

    // Take.
    const txBid = new Transaction();
    tx.add(
      await marketProxyClient.instruction.newOrderV3({
        owner: taker,
        payer: quoteToken,
        side: "buy",
        price,
        size,
        orderType: "ioc",
        clientId: undefined,
        openOrdersAddressKey: undefined,
        openOrdersAccount: undefined,
        feeDiscountPubkey: null,
        selfTradeBehavior: "abortTransaction",
      })
    );
    txSig = await provider.send(txBid, [taker]);
    console.log("Bid", txSig);

    await sleep(1000);

    // Cancel anything remaining.
    try {
      const tx = new Transaction();
      tx.add(
        marketProxyClient.instruction.cancelOrderByClientId(
          provider.connection,
          maker.publicKey,
          makerOpenOrders.address,
          clientId
        )
      );
      txSig = await provider.send(tx, [maker]);
      console.log("Cancelled the rest", txSig);
      await sleep(1000);
    } catch (e) {
      console.log("Unable to cancel order", e);
    }
    k += 1;

    // If the open orders account wasn't previously initialized, it is now.
    if (makerOpenOrdersUser2 === undefined) {
      makerOpenOrdersUser2 = (
        await OpenOrders.findForMarketAndOwner(
          provider.connection,
          market,
          provider.wallet.publicKey,
          DEX_PID
        )
      )[0];
    }
  }
}

main();
