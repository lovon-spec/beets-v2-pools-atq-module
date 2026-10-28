import type { ContractTag, ITagService } from "atq-types";
import fetch from "node-fetch";

// Official source: https://docs.beets.fi/technicals/subgraphs (Sonic, Balancer).
// Current deployment of wwazpiPPt5oJMiTNnQ2VjVxKnKakGDuE2FfEZPD4TKj.
const endpoint = "https://gateway.thegraph.com/api/deployments/id/QmPXaLKDvMMZdjD1ZuMpMSkRjKf8ALLVRtjUpTwWdKSvpQ";
type Pool = { id: string; address: string; name: string; symbol: string; poolType: string };
type Meta = { deployment: string; hasIndexingErrors: boolean; block: { number: number; hash: string } };

async function query(queryText: string, key: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query: queryText }), signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Graph HTTP ${response.status}`);
    const result = await response.json() as { data?: Record<string, unknown>; errors?: unknown };
    if (!result || typeof result !== "object" || Array.isArray(result) || !result.data ||
        typeof result.data !== "object" || Array.isArray(result.data) ||
        (result.errors !== undefined && (!Array.isArray(result.errors) || result.errors.length !== 0))) {
      throw new Error("Graph response is incomplete or contains errors");
    }
    return result.data;
  } finally { clearTimeout(timer); }
}

function meta(value: unknown): Meta {
  const m = value as Meta;
  if (!m || m.deployment !== "QmPXaLKDvMMZdjD1ZuMpMSkRjKf8ALLVRtjUpTwWdKSvpQ" ||
      m.hasIndexingErrors !== false || !Number.isSafeInteger(m.block?.number) || m.block.number < 1 ||
      !/^0x[0-9a-f]{64}$/i.test(m.block.hash)) throw new Error("Invalid source deployment or indexed block");
  return m;
}

const service: ITagService = {
  async returnTags(chainId: string, apiKey: string | null): Promise<ContractTag[]> {
    if (chainId !== "146") throw new Error(`Unsupported Chain ID: ${chainId}`);
    if (typeof apiKey !== "string" || !apiKey.trim()) throw new Error("A Graph API key is required");
    const initial = meta((await query("{ _meta { deployment hasIndexingErrors block { number hash } } }", apiKey))._meta);
    const atBlock = `block: { hash: ${JSON.stringify(initial.block.hash)} }`;
    const allPools: Pool[] = [], addresses = new Set<string>(), registrations = new Set<string>();
    let cursor = "";
    for (;;) {
      // Pool IDs are unique; there is no unique sequential pool field. Use ID fallback with id_gt.
      const data = await query(`{ _meta(${atBlock}) { deployment hasIndexingErrors block { number hash } }
        pools(first: 1000, orderBy: id, orderDirection: asc, where: { id_gt: ${JSON.stringify(cursor)} }, ${atBlock})
        { id address name symbol poolType } }`, apiKey);
      const observed = meta(data._meta);
      if (observed.block.hash !== initial.block.hash || observed.block.number !== initial.block.number) throw new Error("Source block changed");
      if (!Array.isArray(data.pools) || data.pools.length > 1000) throw new Error("Invalid pool page");
      const pools = data.pools as Pool[];
      if (!pools.length) break;
      for (const pool of pools) {
        if (!pool || typeof pool.id !== "string" || !/^0x[0-9a-f]{64}$/.test(pool.id) || pool.id <= cursor) {
          throw new Error("Invalid pool ID or pool cursor did not advance");
        }
        cursor = pool.id;
        if (!/^0x[0-9a-f]{40}$/i.test(pool.address) || /^0x0{40}$/i.test(pool.address) ||
            typeof pool.name !== "string" || !pool.name.trim() || typeof pool.symbol !== "string" || !pool.symbol.trim() ||
            /[\u0000-\u001f\u007f-\u009f]/u.test(pool.name + pool.symbol)) throw new Error("Invalid pool metadata");
        // Beets explicitly attributes E-CLPs to Gyroscope. Gyroscope also
        // documents its 3-CLPs. Preserve that additional project association:
        // https://docs.beets.fi/beets-dex/pools
        // https://docs.gyro.finance/pools/concentrated-liquidity-pools.html
        // A new or missing pool type needs qualification rather than a guess.
        if (!["Weighted", "ComposableStable", "GyroE", "Gyro3"].includes(pool.poolType)) throw new Error("Unqualified pool type");
        const address = pool.address.toLowerCase();
        if (!pool.id.startsWith(address)) throw new Error("Pool ID and address disagree");
        // PoolRegistry encodes address (20 bytes), specialization (2), then
        // the Vault's incrementing registration nonce (10). This is a source
        // identifier, not this query's row number or an address abbreviation.
        // https://github.com/balancer/balancer-v2-monorepo/blob/e91a2b643a49856f51a648d175667c1b48cf3377/pkg/vault/contracts/PoolRegistry.sol
        if (BigInt("0x" + pool.id.slice(42, 46)) > 2n) throw new Error("Invalid pool specialization");
        const registration = BigInt("0x" + pool.id.slice(-20)).toString();
        if (registrations.has(registration)) throw new Error("Duplicate Vault registration number");
        registrations.add(registration);
        if (addresses.has(address)) throw new Error("Duplicate pool address");
        addresses.add(address);
        allPools.push(pool);
      }
      if (pools.length < 1000) break;
    }
    const markdown = (text: string): boolean => /`|\[[^\]]*\]\([^)]*\)|\*[^*]+\*/u.test(text);
    const officialLabel = (text: string): string | null => {
      const name = text.trim().replace(/\s+/gu, " ");
      if (markdown(name)) return null;
      const chars = Array.from(name);
      return (chars.length > 45 ? chars.slice(0, 42).join("") + "..." : name) + " (V2)";
    };
    const key = (text: string): string => text.normalize("NFKC").toLowerCase();
    // Check aliases of ALL source pools, including pools later omitted. A
    // collision cannot be hidden by preferring a different label on its peer.
    const owners = new Map<string, Set<string>>();
    for (const pool of allPools) for (const raw of [pool.name, pool.symbol]) {
      const label = officialLabel(raw);
      if (label !== null) {
        const addresses = owners.get(key(label)) ?? new Set<string>();
        addresses.add(pool.address.toLowerCase()); owners.set(key(label), addresses);
      }
    }
    const tags: ContractTag[] = [];
    for (const pool of allPools) {
      // ATR requires official names and distinguishable instances. Use the
      // published name first, or its official token symbol if only that alias
      // differentiates it. If neither source alias can yield an unambiguous,
      // markdown-free <=50-character label, skip this invalid-output subset
      // under ATQ's explicit invalid-entry exception. Never invent an instance
      // number or truncate the address to construct a new name.
      // The raw symbol is also emitted in the note: markdown there makes
      // this row invalid even if its name alone could supply a valid label.
      if (markdown(pool.symbol)) continue;
      const label = [pool.name, pool.symbol].map(officialLabel).find(label =>
        label !== null && owners.get(key(label))?.size === 1);
      if (!label) continue;
      const registration = BigInt("0x" + pool.id.slice(-20)).toString();
      const gyroscope = pool.poolType === "GyroE" || pool.poolType === "Gyro3" ? " Gyroscope" : "";
      tags.push({ "Contract Address": `eip155:146:${pool.address.toLowerCase()}`, "Project Name": "Beets",
        "Public Name Tag": label, "UI/Website Link": "https://beets.fi",
        "Public Note": `Beets V2 (Balancer V2)${gyroscope} liquidity pool and pool share token on Sonic. Vault registration number: ${registration}. Pool ID: ${pool.id}. Symbol: ${pool.symbol}.` });
    }
    return tags;
  },
};

export async function returnTags(chainId: string, apiKey: string): Promise<ContractTag[]> {
  return service.returnTags(chainId, apiKey);
}
