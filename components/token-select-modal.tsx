"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Search, X, ExternalLink, Loader2 } from "lucide-react";
import { TOKEN_LIST } from "@/lib/token-list";

export interface Token {
  id: string;
  address: string | null;
  chain: string;
  decimals: number;
  name: string;
  symbol: string;
  logoUrl: string;
  safetyLevel?: string;
  standard?: string;
}

interface TokenSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  selectedToken?: Token;
  excludeToken?: Token;
}

// Popular tokens for quick select
const popularTokenSymbols = ["MON", "USDC", "WMON", "AUSD"];

// Default tokens from shared token list (used as fallback and initial display)
const defaultTokens: Token[] = TOKEN_LIST as Token[];

// Use local API route to avoid CORS issues
const API_ENDPOINT = "/api/tokens";

export default function TokenSelectModal({
  isOpen,
  onClose,
  onSelect,
  selectedToken,
  excludeToken,
}: TokenSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tokens, setTokens] = useState<Token[]>(defaultTokens);
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse tokens from tokenProjects response
  const parseTokenProjects = (data: any): Token[] => {
    const tokens: Token[] = [];
    if (data.data?.tokenProjects) {
      data.data.tokenProjects.forEach((project: any) => {
        if (project.tokens) {
          project.tokens
            .filter((token: any) => token.chain === "MONAD")
            .forEach((token: any) => {
              tokens.push({
                id: token.id,
                address: token.address,
                chain: token.chain,
                decimals: token.decimals,
                name: token.name,
                symbol: token.symbol,
                logoUrl: project.logoUrl,
                safetyLevel: project.safetyLevel,
                standard: token.standard,
              });
            });
        }
      });
    }
    return tokens;
  };

  // Parse tokens from searchTokens response
  const parseSearchTokens = (data: any): Token[] => {
    const tokens: Token[] = [];
    if (data.data?.searchTokens) {
      data.data.searchTokens
        .filter((token: any) => token.chain === "MONAD")
        .forEach((token: any) => {
          tokens.push({
            id: token.id,
            address: token.address,
            chain: token.chain,
            decimals: token.decimals,
            name: token.name,
            symbol: token.symbol,
            logoUrl: token.project?.logoUrl || "",
            safetyLevel: token.project?.safetyLevel,
            standard: "ERC20",
          });
        });
    }
    return tokens;
  };

  // Fetch default tokens
  const fetchDefaultTokens = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINT);
      const data = await response.json();
      console.log("Default tokens response:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      const fetchedTokens = parseTokenProjects(data);
      console.log("Parsed default tokens:", fetchedTokens);

      // Merge with defaults
      const mergedTokens: Token[] = [...defaultTokens];
      fetchedTokens.forEach((fetched) => {
        const existingIndex = mergedTokens.findIndex(
          (t) => t.symbol === fetched.symbol
        );
        if (existingIndex >= 0) {
          mergedTokens[existingIndex] = fetched;
        } else {
          mergedTokens.push(fetched);
        }
      });

      setTokens(mergedTokens);
    } catch (err) {
      console.error("Failed to fetch tokens:", err);
      setError("Failed to fetch tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  // Search for tokens - local token list first, then API fallback
  const searchTokens = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const q = query.toLowerCase();

    // First: search local TOKEN_LIST (instant, no network)
    const localMatches = defaultTokens.filter(
      (token) =>
        token.name.toLowerCase().includes(q) ||
        token.symbol.toLowerCase().includes(q) ||
        (token.address && token.address.toLowerCase().includes(q))
    );

    // Show local matches immediately
    if (localMatches.length > 0) {
      setSearchResults(localMatches);
    }

    // Then: also search via API for tokens not in our list
    setSearching(true);

    try {
      const response = await fetch(
        `${API_ENDPOINT}?search=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Try parsing as search results first, then as token projects
      let apiResults = parseSearchTokens(data);
      if (apiResults.length === 0) {
        apiResults = parseTokenProjects(data);
      }

      // Merge: local matches first, then API results (deduplicated by address)
      const seenAddresses = new Set(
        localMatches.map((t) => t.address?.toLowerCase())
      );
      const seenSymbols = new Set(
        localMatches.map((t) => t.symbol.toUpperCase())
      );
      const uniqueApiResults = apiResults.filter((t) => {
        const addrKey = t.address?.toLowerCase();
        const symKey = t.symbol.toUpperCase();
        if (addrKey && seenAddresses.has(addrKey)) return false;
        if (seenSymbols.has(symKey)) return false;
        return true;
      });

      setSearchResults([...localMatches, ...uniqueApiResults]);
    } catch (err) {
      console.error("Failed to search tokens:", err);
      // Keep showing local matches on API error
      if (localMatches.length > 0) {
        setSearchResults(localMatches);
      }
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchTokens(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchTokens]);

  // Fetch default tokens when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDefaultTokens();
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isOpen, fetchDefaultTokens]);

  // Get display tokens - show search results if searching, otherwise show default tokens
  const displayTokens = searchQuery.length >= 2 ? searchResults : tokens;

  // Filter tokens based on search (for local filtering of defaults)
  const filteredTokens = displayTokens.filter((token) => {
    const matchesSearch =
      searchQuery.length < 2 ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (token.address &&
        token.address.toLowerCase().includes(searchQuery.toLowerCase()));

    const notExcluded = !excludeToken || token.symbol !== excludeToken.symbol;

    return matchesSearch && notExcluded;
  });

  // Get popular tokens for quick select
  const popularTokens = tokens.filter(
    (token) =>
      popularTokenSymbols.includes(token.symbol) &&
      (!excludeToken || token.symbol !== excludeToken.symbol)
  );

  const truncateAddress = (address: string | null) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleSelect = (token: Token) => {
    onSelect(token);
    setSearchQuery("");
    setSearchResults([]);
    onClose();
  };

  if (!isOpen) return null;

  const isSearching = searching && searchResults.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[#0a1612] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Select a token</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or paste address"
              className="w-full pl-12 pr-4 py-3.5 bg-[#0d1f1a] border border-white/10 rounded-2xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#f7931a] transition-colors"
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#f7931a] animate-spin" />
            )}
          </div>

          {/* Popular Tokens */}
          {popularTokens.length > 0 && !searchQuery && (
            <div className="flex flex-wrap gap-2 mt-4">
              {popularTokens.map((token) => (
                <button
                  key={token.id}
                  onClick={() => handleSelect(token)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all ${
                    selectedToken?.symbol === token.symbol
                      ? "bg-[#f7931a]/20 border-[#f7931a]/50"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <Image
                    src={token.logoUrl}
                    alt={token.symbol}
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/assets/Logo.svg";
                    }}
                  />
                  <span className="text-sm font-medium text-white">
                    {token.symbol}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Token List Header */}
        <div className="px-4 py-2 border-b border-white/5">
          <span className="text-xs text-white/40 flex items-center gap-1.5">
            <span className="text-[#f7931a]">↗</span>
            {searchQuery.length >= 2
              ? "Search results"
              : "Tokens by 24H volume"}
          </span>
        </div>

        {/* Token List */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#f7931a] animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-white/60 mb-2">Failed to load tokens</p>
              <button
                onClick={fetchDefaultTokens}
                className="text-[#f7931a] hover:text-[#ff9f2a] text-sm font-medium"
              >
                Try again
              </button>
            </div>
          ) : isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#f7931a] animate-spin mr-2" />
              <span className="text-white/60">Searching...</span>
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-white/60">No tokens found</p>
              <p className="text-white/40 text-sm mt-1">
                {searchQuery.length >= 2
                  ? "Try a different search term or paste a token address"
                  : "Try searching for a token"}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredTokens.map((token) => (
                <button
                  key={token.id}
                  onClick={() => handleSelect(token)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    selectedToken?.symbol === token.symbol
                      ? "bg-[#f7931a]/20"
                      : "hover:bg-white/5"
                  }`}
                >
                  {/* Token Icon with Chain Badge */}
                  <div className="relative">
                    <Image
                      src={token.logoUrl || "/assets/Logo.svg"}
                      alt={token.symbol}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/assets/Logo.svg";
                      }}
                    />
                    {/* Chain badge - Monad */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0a1612] flex items-center justify-center p-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="w-3 h-3"
                      >
                        <path
                          fill="#836EF9"
                          d="M12 3c-2.599 0-9 6.4-9 9s6.401 9 9 9s9-6.401 9-9s-6.401-9-9-9m-1.402 14.146c-1.097-.298-4.043-5.453-3.744-6.549s5.453-4.042 6.549-3.743c1.095.298 4.042 5.453 3.743 6.549c-.298 1.095-5.453 4.042-6.549 3.743"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Token Info */}
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">{token.name}</div>
                    <div className="flex items-center gap-2 text-sm text-white/40">
                      <span>{token.symbol}</span>
                      {token.address && (
                        <>
                          <span>•</span>
                          <span className="text-white/30">
                            {truncateAddress(token.address)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* External Link */}
                  {token.address && (
                    <a
                      href={`https://monadscan.com/address/${token.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-white/[0.02]">
          <p className="text-xs text-white/40 text-center">
            Token data powered by{" "}
            <span className="text-[#f7931a] font-medium">Megadrome</span>
          </p>
        </div>
      </div>
    </div>
  );
}
