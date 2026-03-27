/**
 * Token metadata fetcher
 * Runs every 60 seconds — fetches new tokens from Envio, enriches with
 * DexScreener metadata, and writes to data/token-metadata.json
 *
 * Usage:  node scripts/fetch-tokens.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_FILE = join(ROOT, "data", "token-metadata.json");
const INTERVAL_MS = 60_000;

// ─── Config ──────────────────────────────────────────────────────────────────

const ENVIO_URL =
  process.env.ENVIO_GRAPHQL_URL ??
  "https://indexer.dev.hyperindex.xyz/2cea20b/v1/graphql";
const ENVIO_API_KEY = process.env.ENVIO_API_KEY ?? "";

// DexScreener token endpoint — works for any EVM chain
const DEXSCREENER_URL = "https://api.dexscreener.com/tokens/v1/monad";

// ─── GraphQL query ───────────────────────────────────────────────────────────

const TOKENS_QUERY = `
  query GetTokens {
    Token(limit: 500) {
      address
      symbol
      name
      decimals
      pricePerUSDNew
      isWhitelisted
    }
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadCache() {
  if (!existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(data) {
  mkdirSync(join(ROOT, "data"), { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ─── Fetch tokens from Envio ─────────────────────────────────────────────────

async function fetchEnvioTokens() {
  const res = await fetch(ENVIO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ENVIO_API_KEY ? { Authorization: `Bearer ${ENVIO_API_KEY}` } : {}),
    },
    body: JSON.stringify({ query: TOKENS_QUERY }),
  });

  if (!res.ok) throw new Error(`Envio responded ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data?.Token ?? [];
}

// ─── Fetch metadata from DexScreener ─────────────────────────────────────────

async function fetchDexScreenerMeta(address) {
  try {
    const res = await fetch(`${DEXSCREENER_URL}/${address}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();

    // DexScreener returns an array of pairs; grab info from the first one
    const pair = json.pairs?.[0];
    if (!pair) return null;

    const isBase =
      pair.baseToken.address.toLowerCase() === address.toLowerCase();
    const token = isBase ? pair.baseToken : pair.quoteToken;

    return {
      logoUrl: pair.info?.imageUrl ?? "",
      priceUSD: isBase
        ? parseFloat(pair.priceUsd ?? "0")
        : pair.priceUsd
        ? 1 / parseFloat(pair.priceUsd)
        : 0,
      marketCap: pair.marketCap ?? null,
      fdv: pair.fdv ?? null,
      volume24h: pair.volume?.h24 ?? null,
      liquidity: pair.liquidity?.usd ?? null,
      dexUrl: pair.url ?? null,
      name: token.name,
      symbol: token.symbol,
    };
  } catch {
    return null;
  }
}

// ─── Main loop ────────────────────────────────────────────────────────────────

async function run() {
  log("Starting token metadata fetch...");

  const cache = loadCache();
  let newCount = 0;
  let updatedCount = 0;

  let tokens;
  try {
    tokens = await fetchEnvioTokens();
    log(`Fetched ${tokens.length} tokens from Envio`);
  } catch (err) {
    log(`ERROR fetching from Envio: ${err.message}`);
    return;
  }

  for (const token of tokens) {
    const addr = token.address.toLowerCase();
    const existing = cache[addr];

    // Re-fetch metadata if: new token OR >1h since last fetch
    const stale =
      !existing ||
      Date.now() - (existing.lastFetched ?? 0) > 60 * 60 * 1000;

    if (!stale) continue;

    const meta = await fetchDexScreenerMeta(addr);

    cache[addr] = {
      address: addr,
      symbol: token.symbol,
      name: token.name,
      decimals: Number(token.decimals) || 18,
      isWhitelisted: token.isWhitelisted,
      pricePerUSDNew: token.pricePerUSDNew,
      // DexScreener enrichment (null if not found)
      logoUrl: meta?.logoUrl ?? existing?.logoUrl ?? "",
      priceUSD: meta?.priceUSD ?? 0,
      marketCap: meta?.marketCap ?? null,
      fdv: meta?.fdv ?? null,
      volume24h: meta?.volume24h ?? null,
      liquidity: meta?.liquidity ?? null,
      dexUrl: meta?.dexUrl ?? null,
      lastFetched: Date.now(),
    };

    if (!existing) {
      log(`  NEW  ${token.symbol} (${addr}) — dex meta: ${meta ? "✓" : "none"}`);
      newCount++;
    } else {
      updatedCount++;
    }

    // Small delay between DexScreener calls to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  saveCache(cache);
  log(
    `Done — ${newCount} new, ${updatedCount} refreshed, ${Object.keys(cache).length} total in cache`
  );
}

// ─── Kick off ─────────────────────────────────────────────────────────────────

run();
setInterval(run, INTERVAL_MS);
