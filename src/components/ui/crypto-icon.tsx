/**
 * CryptoIcon - Displays cryptocurrency logos using CoinCap API
 * Falls back to a styled text avatar if image fails to load
 */
import { useState } from "react";
import { cn } from "@/lib/utils";

// Map common base symbols to CoinCap asset IDs
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  BNB: "binance-coin",
  DOGE: "dogecoin",
  ADA: "cardano",
  DOT: "polkadot",
  AVAX: "avalanche",
  MATIC: "polygon",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  FIL: "filecoin",
  NEAR: "near-protocol",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  SUI: "sui",
  SEI: "sei",
  TIA: "celestia",
  INJ: "injective-protocol",
  FET: "fetch",
  RENDER: "render-token",
  PEPE: "pepe",
  SHIB: "shiba-inu",
  WIF: "dogwifhat",
  BONK: "bonk1",
  FLOKI: "floki-inu",
  NOT: "notcoin",
  TRX: "tron",
  TON: "toncoin",
  ALGO: "algorand",
  VET: "vechain",
  ICP: "internet-computer",
  SAND: "the-sandbox",
  MANA: "decentraland",
  AXS: "axie-infinity",
  GALA: "gala",
  ENS: "ethereum-name-service",
  AAVE: "aave",
  CRV: "curve-dao-token",
  MKR: "maker",
  COMP: "compound",
  SNX: "synthetix-network-token",
  SUSHI: "sushiswap",
  YFI: "yearn-finance",
  "1INCH": "1inch",
  RUNE: "thorchain",
  EGLD: "elrond-erd-2",
  HBAR: "hedera",
  EOS: "eos",
  XLM: "stellar",
  THETA: "theta",
  FTM: "fantom",
  KAVA: "kava",
  CAKE: "pancakeswap",
  GMT: "stepn",
  APE: "apecoin-ape",
  LDO: "lido-dao",
  RPL: "rocket-pool",
  SSV: "ssv-network",
  STX: "stacks",
  IMX: "immutable-x",
  BLUR: "blur2",
  JTO: "jito",
  JUP: "jupiter-ag",
  W: "wormhole",
  ENA: "ethena",
  PENDLE: "pendle",
  WLD: "worldcoin-wld",
  PYTH: "pyth-network",
  TAO: "bittensor",
  KAS: "kaspa",
  CFX: "conflux-network",
  ORDI: "ordi",
  TRB: "tellor",
  GRT: "the-graph",
  FLM: "flamingo",
  ZRX: "0x",
  BAT: "basic-attention-token",
  ENJ: "enjin-coin",
  CHZ: "chiliz",
  FLOW: "flow",
  MINA: "mina",
  CELO: "celo",
  ONE: "harmony",
  ZIL: "zilliqa",
  WAVES: "waves",
  ICX: "icon",
  IOTA: "iota",
  NEO: "neo",
  QTUM: "qtum",
  ZEC: "zcash",
  DASH: "dash",
  XMR: "monero",
  BCH: "bitcoin-cash",
  ETC: "ethereum-classic",
};

// Extract base symbol from pair (e.g., "BTCUSDT" -> "BTC")
function getBase(symbolOrPair: string): string {
  const s = symbolOrPair.toUpperCase();
  for (const suffix of ["USDT", "BUSD", "USDC", "BTC", "ETH"]) {
    if (s.endsWith(suffix) && s.length > suffix.length) {
      return s.slice(0, -suffix.length);
    }
  }
  return s;
}

function getIconUrl(base: string): string {
  const id = SYMBOL_TO_ID[base] || base.toLowerCase();
  return `https://assets.coincap.io/assets/icons/${base.toLowerCase()}@2x.png`;
}

interface CryptoIconProps {
  symbol: string; // Can be "BTC", "BTCUSDT", etc.
  size?: number;
  className?: string;
}

export function CryptoIcon({ symbol, size = 20, className }: CryptoIconProps) {
  const [failed, setFailed] = useState(false);
  const base = getBase(symbol);

  if (failed) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-bold shrink-0",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {base.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={getIconUrl(base)}
      alt={base}
      width={size}
      height={size}
      className={cn("inline-block rounded-full shrink-0", className)}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
