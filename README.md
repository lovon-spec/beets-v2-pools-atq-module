# Beets V2 liquidity pool tags

ATQ module for Beets V2 pool token contracts on Sonic (146). Source: the Balancer V2 Sonic subgraph linked by https://docs.beets.fi/technicals/subgraphs . The deployment is pinned to the current version of that exact documented subgraph. All pages use the unique pool ID cursor at one indexed block hash. No underlying token addresses are emitted.

Run `yarn build`; import `returnTags` from `dist/main.mjs` and pass decimal chain ID and a Graph API key. Unsupported chains, missing data, Graph errors, inconsistent pages and duplicate pool addresses fail the whole call.

Public names use the source-published pool name, with the official V2 version qualifier. If its label is shared by another source address, the published pool-token symbol is used instead, provided it uniquely identifies the pool. Aliases of every source pool participate in the collision check, with case and compatibility Unicode normalization applied only to collision keys. The label itself preserves published spelling and uses ATQ's ellipsis exception at 50 characters. Pool IDs and Vault registration numbers appear only as factual details in the note, never as invented public names.

Rows for which neither published name nor symbol provides a distinct, markdown-free label within the limit are omitted under ATQ's explicit invalid-entry exception. This exclusion is dynamic, not a hardcoded address catalog. Comments identify the naming criteria and excluded subset. All metadata, source ordering, IDs, addresses and registration numbers are still validated across every source page before any output is returned. Every usable unambiguous official alias is returned; no activity filter is applied. Preparation must enumerate the omitted rows and independently assess this policy interpretation.

Notes preserve the Beets / Balancer V2 share-token role, full pool ID, registration number and symbol. GyroE and Gyro3 pools also identify Gyroscope. Preparation must match every selected source pool ID, name and symbol to deployed contracts and the Vault.

Run `node --experimental-vm-modules --test test/module.test.mjs` for the offline response tests.

This is an unpublished preparation draft. No registry review or filing authority.
