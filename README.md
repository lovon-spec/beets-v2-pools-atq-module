# Beets V2 liquidity pool tags

ATQ module for Beets V2 pool token contracts on Sonic (146). Source: the Balancer V2 Sonic subgraph linked by https://docs.beets.fi/technicals/subgraphs . The deployment is pinned to the current version of that exact documented subgraph. All pages use the unique pool ID cursor at one indexed block hash. No underlying token addresses are emitted.

Run `yarn build`; import `returnTags` from `dist/main.mjs` and pass decimal chain ID and a Graph API key. Unsupported chains, missing data, Graph errors, inconsistent pages and duplicate pool addresses fail the whole call.

Public names prefer the source-published pool name with the official V2 version qualifier. Shared official names are retained at every distinct contract address, as allowed by Address Tags criterion 3; they are not treated as invalid merely because another pool publishes the same name. Labels preserve source spelling and use the policy's ellipsis exception at 50 characters. If that rendering would merge different original aliases, use the published symbol instead. Case and compatibility Unicode normalization apply only to collision comparison, not emitted spelling.

The complete source is paginated and validated before names are selected. No address is omitted because an official name or symbol is shared. A row is omitted only if its note's source symbol contains markdown, or neither source name nor symbol supplies a markdown-free label without a lossy collision. These invalid-entry exclusions are dynamic and documented in code. Pool IDs and Vault registration numbers remain factual note details; they are not invented public-name instance numbers. Preparation must enumerate any omitted rows. There is no activity filter or fixed output count.

Notes preserve the Beets / Balancer V2 share-token role, full pool ID, registration number and symbol. GyroE and Gyro3 pools also identify Gyroscope. Preparation must match every selected source pool ID, name and symbol to deployed contracts and the Vault.

Run `node --experimental-vm-modules --test test/module.test.mjs` for the offline response tests.

This is an unpublished preparation draft. No registry review or filing authority.
