#!/usr/bin/env node

// Script to list a permissioned market, logging the address to stdout.

const utils = require("../tests/utils");
const utilsCmn = require("../tests/utils/common");
const anchor = require("@project-serum/anchor");
const provider = anchor.Provider.local();
const program = anchor.workspace.PermissionedMarkets;
const Account = anchor.web3.Account;

async function main() {
  const { marketProxyClient } = await utils.genesis({
    provider,
    proxyProgramId: utilsCmn.PROGRAM_KP.publicKey,
  });
  const out = {
    market: marketProxyClient.market.address.toString(),
  };
  console.log(JSON.stringify(out));
}

main();
