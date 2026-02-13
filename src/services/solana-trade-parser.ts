/**
 * Solana Trade Parser - Deriverse DEX Transaction Parser
 * Parses on-chain Solana transactions from connected wallet
 * to extract Deriverse perpetual futures trade data
 */
import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';

// Deriverse Official Program ID (VERSION=6)
const DERIVERSE_PROGRAM_ID = 'CDESjex4EDBKLwx9ZPzVbjiHEHatasb5fhSJZMzNfvw2';
const DERIVERSE_VERSION = 6;
const DERIVERSE_PROGRAM_IDS = [DERIVERSE_PROGRAM_ID];

// Known Solana DEX program IDs for broader support
const KNOWN_DEX_PROGRAMS: Record<string, string> = {
  [DERIVERSE_PROGRAM_ID]: 'Deriverse',
  'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH': 'Drift',
  'ZETAxsqBRek56DhiGXrn75S111wGXVHc6JaRkzo6T1M': 'Zeta Markets',
  'FUfpR31LmcP1VSbz5zDaM7nxnH55iBHkpwusgrnhaFjL': 'Mango Markets v4',
  'PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu': 'Perpetual Protocol',
};

export interface ParsedSolanaTrade {
  signature: string;
  blockTime: number;
  program: string;
  programName: string;
  direction: 'LONG' | 'SHORT' | 'UNKNOWN';
  pair: string;
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  pnl: number;
  fees: number;
  status: 'open' | 'closed';
  rawInstruction?: string;
}

export interface SolanaParserResult {
  trades: ParsedSolanaTrade[];
  totalTransactions: number;
  parsedCount: number;
  errors: string[];
}

/**
 * Fetch and parse trading transactions from a Solana wallet
 */
export async function parseSolanaWalletTrades(
  connection: Connection,
  walletAddress: PublicKey,
  options?: {
    limit?: number;
    beforeSignature?: string;
    programFilter?: string[];
  }
): Promise<SolanaParserResult> {
  const limit = options?.limit || 100;
  const programFilter = options?.programFilter || [
    ...DERIVERSE_PROGRAM_IDS,
    ...Object.keys(KNOWN_DEX_PROGRAMS),
  ];
  
  const errors: string[] = [];
  const trades: ParsedSolanaTrade[] = [];

  try {
    // Fetch recent signatures
    const signatures = await connection.getSignaturesForAddress(
      walletAddress,
      { limit, before: options?.beforeSignature },
      'confirmed'
    );

    if (signatures.length === 0) {
      return { trades: [], totalTransactions: 0, parsedCount: 0, errors: [] };
    }

    // Batch fetch transactions (max 100 at a time)
    const txSignatures = signatures.map(s => s.signature);
    const batchSize = 20;
    const allTransactions: (ParsedTransactionWithMeta | null)[] = [];

    for (let i = 0; i < txSignatures.length; i += batchSize) {
      const batch = txSignatures.slice(i, i + batchSize);
      const txs = await Promise.all(
        batch.map(sig => 
          connection.getParsedTransaction(sig, {
            maxSupportedTransactionVersion: 0,
          }).catch(() => null)
        )
      );
      allTransactions.push(...txs);
    }

    // Parse each transaction
    for (const tx of allTransactions) {
      if (!tx || !tx.meta || tx.meta.err) continue;

      try {
        const parsed = parseTransaction(tx, walletAddress, programFilter);
        if (parsed) {
          trades.push(parsed);
        }
      } catch (err) {
        errors.push(`Failed to parse tx: ${err}`);
      }
    }

    return {
      trades,
      totalTransactions: signatures.length,
      parsedCount: trades.length,
      errors,
    };
  } catch (err) {
    errors.push(`Failed to fetch transactions: ${err}`);
    return { trades: [], totalTransactions: 0, parsedCount: 0, errors };
  }
}

/**
 * Parse a single transaction for DEX trade data
 */
function parseTransaction(
  tx: ParsedTransactionWithMeta,
  walletAddress: PublicKey,
  programFilter: string[]
): ParsedSolanaTrade | null {
  const { transaction, meta, blockTime } = tx;
  const message = transaction.message;

  // Find instructions from known DEX programs
  for (const instruction of message.instructions) {
    const programId = instruction.programId.toBase58();
    
    if (!programFilter.includes(programId)) continue;

    const programName = KNOWN_DEX_PROGRAMS[programId] || 'Unknown DEX';

    // Extract trade data from token balance changes
    const preBalances = meta?.preTokenBalances || [];
    const postBalances = meta?.postTokenBalances || [];

    // Calculate token flow to determine trade direction and size
    const walletStr = walletAddress.toBase58();
    let tokenIn = 0;
    let tokenOut = 0;
    let tokenMint = '';
    let stableMint = '';

    for (const post of postBalances) {
      const pre = preBalances.find(
        p => p.accountIndex === post.accountIndex
      );
      
      if (!pre || !post.uiTokenAmount || !pre.uiTokenAmount) continue;
      
      const diff = (post.uiTokenAmount.uiAmount || 0) - (pre.uiTokenAmount.uiAmount || 0);
      
      if (post.owner === walletStr) {
        if (diff > 0) {
          tokenIn += diff;
          tokenMint = post.mint;
        } else if (diff < 0) {
          tokenOut += Math.abs(diff);
          stableMint = post.mint;
        }
      }
    }

    // Determine direction from SOL balance changes
    const preSOL = meta?.preBalances?.[0] || 0;
    const postSOL = meta?.postBalances?.[0] || 0;
    const solDiff = (postSOL - preSOL) / 1e9; // lamports to SOL

    // Calculate fees from the transaction
    const txFees = (meta?.fee || 0) / 1e9;

    // Build trade from available data
    if (tokenIn > 0 || tokenOut > 0 || Math.abs(solDiff) > 0.001) {
      const direction = determineTradeSide(instruction, solDiff, tokenIn, tokenOut);
      const pair = extractPairFromMints(tokenMint, stableMint) || 'SOL-PERP';
      
      // Estimate PnL from token changes
      const pnl = solDiff - txFees;
      const quantity = Math.max(tokenIn, tokenOut);
      const entryPrice = quantity > 0 ? Math.abs(solDiff) / quantity : 0;

      return {
        signature: tx.transaction.signatures[0],
        blockTime: blockTime || Math.floor(Date.now() / 1000),
        program: programId,
        programName,
        direction,
        pair,
        entryPrice,
        exitPrice: null,
        quantity,
        pnl: Number(pnl.toFixed(6)),
        fees: Number(txFees.toFixed(6)),
        status: 'closed',
        rawInstruction: JSON.stringify(instruction).slice(0, 200),
      };
    }
  }

  // Also check inner instructions for DEX interactions
  if (meta?.innerInstructions) {
    for (const inner of meta.innerInstructions) {
      for (const ix of inner.instructions) {
        const programId = ix.programId.toBase58();
        if (programFilter.includes(programId)) {
          const programName = KNOWN_DEX_PROGRAMS[programId] || 'Unknown DEX';
          const txFees = (meta?.fee || 0) / 1e9;
          const preSOL = meta?.preBalances?.[0] || 0;
          const postSOL = meta?.postBalances?.[0] || 0;
          const solDiff = (postSOL - preSOL) / 1e9;

          return {
            signature: tx.transaction.signatures[0],
            blockTime: blockTime || Math.floor(Date.now() / 1000),
            program: programId,
            programName,
            direction: solDiff > 0 ? 'LONG' : 'SHORT',
            pair: 'SOL-PERP',
            entryPrice: 0,
            exitPrice: null,
            quantity: Math.abs(solDiff),
            pnl: Number((solDiff - txFees).toFixed(6)),
            fees: Number(txFees.toFixed(6)),
            status: 'closed',
          };
        }
      }
    }
  }

  return null;
}

function determineTradeSide(
  _instruction: any,
  solDiff: number,
  tokenIn: number,
  tokenOut: number
): 'LONG' | 'SHORT' | 'UNKNOWN' {
  // If SOL decreased and tokens increased → bought (LONG)
  if (solDiff < 0 && tokenIn > tokenOut) return 'LONG';
  // If SOL increased and tokens decreased → sold (SHORT)
  if (solDiff > 0 && tokenOut > tokenIn) return 'SHORT';
  // Default heuristic
  if (solDiff < 0) return 'LONG';
  if (solDiff > 0) return 'SHORT';
  return 'UNKNOWN';
}

// Common Solana token mints
const KNOWN_MINTS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ETH',
  '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh': 'BTC',
};

function extractPairFromMints(mint1: string, mint2: string): string | null {
  const token1 = KNOWN_MINTS[mint1];
  const token2 = KNOWN_MINTS[mint2];
  
  if (token1 && token2) {
    // Put non-stable first
    const stables = ['USDC', 'USDT'];
    if (stables.includes(token1)) return `${token2}-PERP`;
    return `${token1}-PERP`;
  }
  
  if (token1) return `${token1}-PERP`;
  if (token2) return `${token2}-PERP`;
  
  return null;
}

/**
 * Get Deriverse-specific program IDs
 */
export function getDeriverseProgramIds(): string[] {
  return [...DERIVERSE_PROGRAM_IDS];
}

/**
 * Check if a transaction is from Deriverse
 */
export function isDeriverseTransaction(programId: string): boolean {
  return DERIVERSE_PROGRAM_IDS.includes(programId);
}
