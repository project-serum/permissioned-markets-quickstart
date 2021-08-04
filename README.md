# Permissioned Markets

This repo demonstrates how to create "permissioned markets" on Serum via a proxy smart contract.
A permissioned market is a regular Serum market with an additional
open orders authority, which must sign every transaction to create an
open orders account.

In practice, what this means is that one can create a program that acts
as this authority *and* that marks its own PDAs as the *owner* of all
created open orders accounts, making the program the sole arbiter over
who can trade on a given market.

For example, this program forces all trades that execute on this market
to set the referral to a hardcoded address--`referral::ID`--and requires
the client to pass in an identity token, authorizing the user.

See the [code](https://github.com/project-serum/permissioned-markets-quickstart/blob/master/programs/permissioned-markets/src/lib.rs).

## Developing

This program requires building the Serum DEX from source, which is done using
git submodules.

### Install Submodules

Pull the source

```
git submodule init
git submodule update
```

### Install Dependencies

[Anchor](https://github.com/project-serum/anchor) is used for developoment, and it's
recommended workflow is used here. To get started, see the [guide](https://project-serum.github.io/anchor/getting-started/introduction.html).

To install Anchor and all local dependencies, run

```
yarn
```

### Build

To build, run


```
yarn build
```

### Test

A set of integration tests are provided. See these for an example of how to use a
permissioned market from JavaScript.

```bash
yarn test
```

### Localnet

To start a localnetwork with both the dex and proxy deployed and an orderbook
listed with posted orders, first install the "crank" cli.

```
cargo install --git https://github.com/project-serum/serum-dex crank --locked --tag v0.4.0
```

Then run,

```bash
yarn localnet
```

### Connect a GUI

To connect a GUI to the localnet, either run one locally or go to
dex.projectserum.com and select the *localnet* network and enter the
market address: `FcZntrVjDRPv8JnU2mHt8ejvvA1eiHqxM8d8JNEC8q9q`.

In short, go to this [link](https://dex.projectserum.com/#/market/FcZntrVjDRPv8JnU2mHt8ejvvA1eiHqxM8d8JNEC8q9q).

Don't forget to click the `+` button to "Add a custom market" so that the GUI
can recognize the market running locally.

## Extending the Proxy

To implement a custom proxy, one can implement the [MarketMiddleware](https://github.com/project-serum/permissioned-markets-quickstart/blob/master/programs/permissioned-markets/src/lib.rs#L71) trait
to intercept, modify, and perform any access control on DEX requests before
they get forwarded to the orderbook. These middleware can be mixed and
matched. Note, however, that the order of middleware matters since they can
mutate the request.

One useful pattern is to treat the request like layers of an onion, where
each middleware unwraps the request by stripping accounts and instruction
data before relaying it to the next middleware and ultimately to the
orderbook. This allows one to easily extend the behavior of a proxy by
adding a custom middleware that may process information that is unknown to
any other middleware or to the DEX.

After adding a middleware, the only additional requirement, of course, is
to make sure the client sending transactions does the same, but in reverse.
It should wrap the transaction in the opposite order. For convenience, an
identical abstraction is provided in the JavaScript [client](https://github.com/project-serum/permissioned-markets-quickstart/blob/master/tests/utils/market-proxy.js#L15).

## Alternatives to Middleware

Note that this middleware abstraction is not required to host a
permissioned market. One could write a regular program that manages the PDAs
and CPI invocations onesself.
