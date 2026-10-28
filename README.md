# Beets V2 liquidity pool tags

ATQ module for Beets V2 pool token contracts on Sonic (146). Source: the Balancer V2 Sonic subgraph linked by https://docs.beets.fi/technicals/subgraphs . The deployment is pinned to the current version of that exact documented subgraph. All pages use the unique pool ID cursor at one indexed block hash. No underlying token addresses are emitted.

Run `yarn build`; import `returnTags` from `dist/main.mjs` and pass decimal chain ID and a Graph API key. Unsupported chains, missing data, Graph errors, inconsistent pages and duplicate pool addresses fail the whole call.

Public names preserve the source pool name and add `(V2 #n)`, where `n` is the Vault registration nonce encoded in the last ten bytes of the source pool ID. This distinguishes instances sharing an official pool name without assigning query-order numbers. The Vault's PoolRegistry uses an increasing nonce; see https://github.com/balancer/balancer-v2-monorepo/blob/e91a2b643a49856f51a648d175667c1b48cf3377/pkg/vault/contracts/PoolRegistry.sol . ATQ's explicit ellipsis exception is used when the complete name plus qualifier would exceed 50 characters. The note states the Beets / Balancer V2 share-token role, registration number, full pool ID and symbol. Preparation must independently match every source pool ID to the deployed pool and Vault registration.

Run `node --experimental-vm-modules --test test/module.test.mjs` for the offline response tests.

This is an unpublished preparation draft. No registry review or filing authority.
