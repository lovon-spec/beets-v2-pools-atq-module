import type { ContractTag, ITagService } from "atq-types";
import fetch from "node-fetch";

// Official source: https://docs.beets.fi/technicals/subgraphs (Sonic, Balancer).
// Current deployment of wwazpiPPt5oJMiTNnQ2VjVxKnKakGDuE2FfEZPD4TKj.
const endpoint = "https://gateway.thegraph.com/api/deployments/id/QmPXaLKDvMMZdjD1ZuMpMSkRjKf8ALLVRtjUpTwWdKSvpQ";
type Pool = { id: string; address: string; name: string; symbol: string };
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
    const result = await response.json() as { data?: Record<string, unknown>; errors?: unknown[] };
    if (!result.data || result.errors?.length) throw new Error("Graph response is incomplete or contains errors");
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
    const tags: ContractTag[] = [], addresses = new Set<string>(), labels = new Set<string>();
    let cursor = "";
    for (;;) {
      // Pool IDs are unique; there is no unique sequential pool field. Use ID fallback with id_gt.
      const data = await query(`{ _meta(${atBlock}) { deployment hasIndexingErrors block { number hash } }
        pools(first: 1000, orderBy: id, orderDirection: asc, where: { id_gt: ${JSON.stringify(cursor)} }, ${atBlock})
        { id address name symbol } }`, apiKey);
      const observed = meta(data._meta);
      if (observed.block.hash !== initial.block.hash || observed.block.number !== initial.block.number) throw new Error("Source block changed");
      if (!Array.isArray(data.pools) || data.pools.length > 1000) throw new Error("Invalid pool page");
      const pools = data.pools as Pool[];
      if (!pools.length) break;
      for (const pool of pools) {
        if (typeof pool.id !== "string" || pool.id <= cursor) throw new Error("Pool cursor did not advance");
        cursor = pool.id;
        if (!/^0x[0-9a-f]{40}$/i.test(pool.address) || /^0x0{40}$/i.test(pool.address) ||
            typeof pool.name !== "string" || !pool.name.trim() || typeof pool.symbol !== "string") throw new Error("Invalid pool metadata");
        const address = pool.address.toLowerCase();
        if (addresses.has(address)) throw new Error("Duplicate pool address");
        addresses.add(address);
        const name = pool.name.trim().replace(/\s+/g, " ");
        const label = (name.length > 34 ? name.slice(0, 31) + "..." : name) + ` (${address.slice(2, 12)})`;
        if (labels.has(label)) throw new Error("Ambiguous pool name");
        labels.add(label);
        tags.push({ "Contract Address": `eip155:146:${address}`, "Project Name": "Beets",
          "Public Name Tag": label, "UI/Website Link": "https://beets.fi",
          "Public Note": `Beets V2 liquidity pool and pool share token on Sonic. Pool ID: ${pool.id}. Symbol: ${pool.symbol}.` });
      }
      if (pools.length < 1000) break;
    }
    return tags;
  },
};

export async function returnTags(chainId: string, apiKey: string): Promise<ContractTag[]> {
  return service.returnTags(chainId, apiKey);
}
