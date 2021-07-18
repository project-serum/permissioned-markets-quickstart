#!/usr/bin/env bash

################################################################################
#
# localnet.sh runs a localnet with a permissioned market up and running.
#
# Usage:
#
# ./localnet.sh
#
# Installation:
#
# Before using, one must make sure to have the serum crank software built or
# installed locally on one's machine.  To build, clone the serum dex and run
# `cargo build` inside `serum-dex/dex/crank`. Then change the $CRANK variable
# below.
#
################################################################################

DEX_PID="9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"
PAYER_FILEPATH="$HOME/.config/solana/id.json"

#
# If the crank cli isn't installed, use a local path.
# Replace the path below if you'd like to use your own build.
#
CRANK=$(which crank)
if [ $? -ne 0 ]; then
		CRANK="/home/armaniferrante/Documents/code/src/github.com/project-serum/permissioned-markets-quickstart/deps/serum-dex/target/debug/crank"
fi

LOG_DIR="./localnet-logs"
VALIDATOR_OUT="${LOG_DIR}/validator-stdout.txt"
CRANK_LOGS="${LOG_DIR}/crank-logs.txt"
CRANK_STDOUT="${LOG_DIR}/crank-stdout.txt"
TRADE_BOT_STDOUT="${LOG_DIR}/trade-bot-stdout.txt"

echo "CRANK: $CRANK"
set -euo pipefail

main () {
		#
		# Cleanup.
		#
		echo "Cleaning old output files..."
		mkdir -p $LOG_DIR
		rm -rf test-ledger
		rm -f $TRADE_BOT_STDOUT
		rm -f $VALIDATOR_OUT
		rm -f $CRANK_LOGS && touch $CRANK_LOGS

		#
		# Bootup cluster.
		#
		echo "Starting local network..."
		solana-test-validator \
				--bpf-program 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin ./deps/serum-dex/dex/target/deploy/serum_dex.so \
				--bpf-program CGnjwsdrQfJpiXqeAe1p13pUsfZnS9rgEy1DWKimGHqo ./target/deploy/permissioned_markets.so > $VALIDATOR_OUT &
		sleep 2

		#
		# List market at a predetermined address.
		#
		local market="FcZntrVjDRPv8JnU2mHt8ejvvA1eiHqxM8d8JNEC8q9q"
		echo "Listing market $market..."
		./scripts/list-market.js
		sleep 10
		echo "Market listed $market"

		echo "Run the trade bot"
		./scripts/trade-bot.js $market > $TRADE_BOT_STDOUT &

		echo "Running crank..."
		$CRANK localnet consume-events \
					-c $market \
					-d $DEX_PID -e 5 \
					--log-directory $CRANK_LOGS \
					--market $market \
					--num-workers 1 \
					--payer $PAYER_FILEPATH \
					--pc-wallet $market > $CRANK_STDOUT &

		#
		# Park.
		#
		echo "Localnet running..."
		echo "Ctl-c to exit."
		wait
}

cleanup() {
    pkill -P $$ || true
    wait || true
}

trap_add() {
    trap_add_cmd=$1; shift || fatal "${FUNCNAME} usage error"
    for trap_add_name in "$@"; do
        trap -- "$(
            extract_trap_cmd() { printf '%s\n' "${3:-}"; }
            eval "extract_trap_cmd $(trap -p "${trap_add_name}")"
            printf '%s\n' "${trap_add_cmd}"
        )" "${trap_add_name}" \
            || fatal "unable to add to trap ${trap_add_name}"
    done
}

declare -f -t trap_add
trap_add 'cleanup' EXIT
main
