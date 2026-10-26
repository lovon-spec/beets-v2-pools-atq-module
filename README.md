# Beets V2 liquidity pool tags

ATQ module for Beets V2 pool token contracts on Sonic (146). Source: the Balancer V2 Sonic subgraph linked by https://docs.beets.fi/technicals/subgraphs . The deployment is pinned to the current version of that exact documented subgraph. All pages use the unique pool ID cursor at one indexed block hash. No underlying token addresses are emitted.

Run `yarn build`; import `returnTags` from `dist/main.mjs` and pass decimal chain ID and a Graph API key. Unsupported chains, missing data, Graph errors, inconsistent pages and duplicate pool addresses fail the whole call.

This is an unpublished preparation draft. No registry review or filing authority.
