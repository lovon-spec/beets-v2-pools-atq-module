# Beets V2 liquidity pool tags

ATQ module for Beets V2 pool token contracts on Sonic (146). Source: the Balancer V2 Sonic subgraph linked by https://docs.beets.fi/technicals/subgraphs . The deployment is pinned to the current version of that exact documented subgraph. All pages use the unique pool ID cursor at one indexed block hash. No underlying token addresses are emitted.

Run `yarn build`; import `returnTags` from `dist/main.mjs` and pass decimal chain ID and a Graph API key. Unsupported chains, missing data, Graph errors, inconsistent pages and duplicate pool addresses fail the whole call.

Public names use the source pool names, with ellipsis only beyond 50 Unicode characters. Repeated official names on different contract addresses are retained. The public note states the Beets / Balancer V2 pool share token role, pool ID and symbol.

Run `node --experimental-vm-modules --test test/module.test.mjs` for the offline response tests.

This is an unpublished preparation draft. No registry review or filing authority.
