// =============================================================================
// CODE-STRUCTURE-V2.TS — UPGRADED & OPTIMIZED
// Integrasi: Line Cache + Inverted Index + Stack Parser + Structure Cache
//            + Lazy Context + V8-Enhanced Patch Engine Integration
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// 1. CORE INTERFACES (Enhanced from original)
// ─────────────────────────────────────────────────────────────────────────────

export interface CodeSnippet {
  lineNumber: number;
  lines: string[];
  matchIndex: number;        // ← NEW: exact char position of match
  matchLength: number;      // ← NEW: length of matched substring
}

export interface CodeBlock {
  type: 'function' | 'class' | 'import' | 'comment' | 'raw' | 'interface' | 'enum' | 'type' | 'struct';
  name: string;
  startLine: number;        // 0-based
  endLine: number;          // 0-based, inclusive
  signature: string;
  body: string[];
  context: string[];
  // ← NEW: metadata for patch integration
  depth: number;            // nesting depth
  parentBlock: string | null; // parent block name
  children: string[];       // child block names
  hash: string;             // DJB2 hash of body
}

export interface BlockSearchResult {
  block: CodeBlock;
  score: number;            // relevance score
  matchType: 'exact' | 'prefix' | 'substring' | 'fuzzy';
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PARSER STATE MACHINE (Refactored to const for Node 22 compatibility)
// ─────────────────────────────────────────────────────────────────────────────

export const ParseContext = {
  Code: 0,
  String: 1,
  Template: 2,
  Comment: 3,
  MultilineComment: 4,
  Regex: 5,
} as const;

export type ParseContext = typeof ParseContext[keyof typeof ParseContext];

export const ParserState = {
  Idle: 0,
  InBlock: 1,
  InSignature: 2,
} as const;

export type ParserState = typeof ParserState[keyof typeof ParserState];

/**
 * HTML5 Void Elements that cannot have children.
 */
export const HTML_VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'source', 'track', 'wbr'
]);

interface BlockFrame {
  type: CodeBlock['type'];
  name: string;
  startLine: number;
  signature: string;
  braceDepth: number;
  bracketDepth: number;    // ← NEW: track [] separately
  parenDepth: number;      // ← NEW: track () separately
  genericDepth: number;    // ← NEW: track <> separately
  hasOpenedBrace: boolean;
  body: string[];
  contextStart: number;
  depth: number;
  parentName: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ENHANCED PATTERN SYSTEM (Extensible & Language-Aware)
// ─────────────────────────────────────────────────────────────────────────────

export interface BlockPattern {
  type: CodeBlock['type'];
  regex: RegExp;
  nameGroup: number;       // which regex group captures the name
  canNest: boolean;        // can this block contain other blocks?
  requiresBrace: boolean;  // does this block type require {}?
  priority: number;        // higher = checked first
}

const DEFAULT_PATTERNS: BlockPattern[] = [
  { type: 'import',   regex: /^\s*import\s+(?:type\s+)?(?:\{[^}]*\}\s+from\s+)?['"]/, nameGroup: 0, canNest: false, requiresBrace: false, priority: 100 },
  { type: 'comment',  regex: /^\s*(?:\/\/|\/\*|\*|#)/, nameGroup: 0, canNest: false, requiresBrace: false, priority: 90 },
  { type: 'interface',regex: /^\s*(?:export\s+)?interface\s+(\w+)/, nameGroup: 1, canNest: true, requiresBrace: true, priority: 80 },
  { type: 'enum',     regex: /^\s*(?:export\s+)?enum\s+(\w+)/, nameGroup: 1, canNest: false, requiresBrace: true, priority: 80 },
  { type: 'type',     regex: /^\s*(?:export\s+)?type\s+(\w+)/, nameGroup: 1, canNest: false, requiresBrace: false, priority: 70 },
  { type: 'class',    regex: /^\s*(?:export\s+|abstract\s+)?class\s+(\w+)/, nameGroup: 1, canNest: true, requiresBrace: true, priority: 60 },
  { type: 'function', regex: /^\s*(?:export\s+|async\s+|static\s+)*function\s*(\w+)/, nameGroup: 1, canNest: true, requiresBrace: true, priority: 50 },
  { type: 'function', regex: /^\s*(?:export\s+|async\s+)*(?:const|let|var)\s+(\w+)\s*[:=]\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>/, nameGroup: 1, canNest: false, requiresBrace: true, priority: 50 },
  { type: 'function', regex: /^\s*(?:public|private|protected|async\s+)?(?:static\s+)?(?:get|set)?\s*(\w+)\s*\([^)]*\)\s*[:\{]/, nameGroup: 1, canNest: true, requiresBrace: true, priority: 40 },
  { type: 'function', regex: /^\s*(?:export\s+)?default\s+function/, nameGroup: 0, canNest: true, requiresBrace: true, priority: 40 },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. MAIN ANALYZER CLASS (P1: Line Cache + P2: Inverted Index + P3: Structure Cache)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Advanced Code Structure Analyzer for multi-language static analysis.
 * Features: Stack-based block extraction, inverted word index, and surgical code reading.
 */
export class CodeStructureAnalyzer {
  private readonly content: string;
  // P1: Line Cache — parsed once, reused everywhere
  private readonly lines: string[];
  private readonly lineCount: number;
  private readonly contentHash: string;

  // P2: Inverted Index — word → line indices
  private _wordIndex: Map<string, number[]> | null = null;
  private _indexBuilt = false;

  // P3: Structure Cache
  private _structureCache: CodeBlock[] | null = null;
  private _blockMap: Map<string, CodeBlock> | null = null; // name → block
  private _lineToBlock: Map<number, string> | null = null; // line → block name

  // P4: Lazy Context — store indices, materialize on access
  private _contextRanges: Map<string, { start: number; end: number }> = new Map();

  // Configuration
  private readonly patterns: BlockPattern[];
  private readonly contextRange: number;

  constructor(
    content: string,
    options: {
      patterns?: BlockPattern[];
      contextRange?: number;
      buildIndex?: boolean;
    } = {}
  ) {
    this.content = content;
    // P1: Parse once
    this.lines = content.split(/\r?\n/);
    this.lineCount = this.lines.length;
    this.contentHash = this.computeHash(content);

    this.patterns = options.patterns || DEFAULT_PATTERNS;
    this.contextRange = options.contextRange ?? 3;

    // P2: Build index eagerly if requested
    if (options.buildIndex !== false) {
      this.buildWordIndex();
    }
  }

  // ───────────────────────────────────────────────
  // UTILITIES
  // ───────────────────────────────────────────────

  private computeHash(content: string): string {
    let h = 0;
    for (let i = 0; i < content.length; i++) {
      h = (h << 5) - h + content.charCodeAt(i);
      h |= 0;
    }
    return h.toString(16);
  }

  private djb2Hash(lines: string[]): string {
    let h = 0;
    for (const line of lines) {
      for (let i = 0; i < line.length; i++) {
        h = (h << 5) - h + line.charCodeAt(i);
        h |= 0;
      }
    }
    return h.toString(16);
  }

  /** P3: Invalidate all caches (call when content mutates externally) */
  public invalidateCache(): void {
    this._structureCache = null;
    this._blockMap = null;
    this._lineToBlock = null;
    this._wordIndex = null;
    this._indexBuilt = false;
    this._contextRanges.clear();
  }

  /** Get content hash for change detection */
  public getContentHash(): string {
    return this.contentHash;
  }

  /** Get total line count */
  public getLineCount(): number {
    return this.lineCount;
  }

  // ───────────────────────────────────────────────
  // P2: INVERTED INDEX (Fast Surgical Read)
  // ───────────────────────────────────────────────

  private buildWordIndex(): void {
    if (this._indexBuilt) return;
    this._wordIndex = new Map();

    // Index significant identifiers (skip common keywords)
    const skipWords = new Set([
      'const', 'let', 'var', 'function', 'class', 'interface', 'enum', 'type',
      'import', 'export', 'from', 'return', 'if', 'else', 'for', 'while',
      'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally',
      'throw', 'new', 'this', 'super', 'extends', 'implements', 'async',
      'await', 'public', 'private', 'protected', 'static', 'readonly',
      'abstract', 'override', 'get', 'set', 'constructor', 'true', 'false',
      'null', 'undefined', 'void', 'any', 'number', 'string', 'boolean',
      'object', 'Array', 'Promise', 'Map', 'Set', 'Date', 'RegExp',
      'console', 'log', 'error', 'warn', 'info', 'debug',
    ]);

    for (let i = 0; i < this.lineCount; i++) {
      const line = this.lines[i];
      // Extract identifiers (word chars, min 3 chars)
      const words = line.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g);
      if (words) {
        for (const word of new Set(words)) {
          if (skipWords.has(word)) continue;
          if (!this._wordIndex!.has(word)) {
            this._wordIndex!.set(word, []);
          }
          this._wordIndex!.get(word)!.push(i);
        }
      }
    }

    this._indexBuilt = true;
  }

  /**
   * P2: Enhanced surgical read with inverted index
   * Returns snippets around matching lines with exact match position
   */
  public surgicalRead(query: string, contextRange?: number): CodeSnippet[] {
    const range = contextRange ?? this.contextRange;
    this.buildWordIndex();

    let indices: number[];
    const isIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(query);

    // Fast path: use inverted index for identifiers in large files
    if (isIdentifier && this.lineCount > 500 && this._wordIndex!.has(query)) {
      indices = this._wordIndex!.get(query)!;
    } else {
      // Fallback: linear scan (for regex queries or small files)
      indices = [];
      for (let i = 0; i < this.lineCount; i++) {
        if (this.lines[i].includes(query)) {
          indices.push(i);
        }
      }
    }

    const found: CodeSnippet[] = [];
    for (const i of indices) {
      const line = this.lines[i];
      const matchIdx = line.indexOf(query);
      const start = Math.max(0, i - range);
      const end = Math.min(this.lineCount, i + range + 1);
      found.push({
        lineNumber: i + 1,
        lines: this.lines.slice(start, end),
        matchIndex: matchIdx,
        matchLength: query.length,
      });
    }
    return found;
  }

  /**
   * NEW: Fuzzy surgical read with relevance scoring
   */
  public fuzzySurgicalRead(query: string, contextRange?: number, maxResults = 10): CodeSnippet[] {
    const range = contextRange ?? this.contextRange;
    const allMatches = this.surgicalRead(query, range);

    // Score matches by proximity to block boundaries
    const scored = allMatches.map(snippet => {
      let score = 0;
      // Exact match on line start = higher score
      const matchLine = this.lines[snippet.lineNumber - 1];
      if (matchLine.trim().startsWith(query)) score += 10;
      // Near block start = higher score
      const block = this.findBlockAtLine(snippet.lineNumber);
      if (block && block.startLine === snippet.lineNumber - 1) score += 5;
      return { snippet, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults).map(s => s.snippet);
  }

  /**
   * Get context around a specific line (1-based)
   */
  public contextAt(lineNumber: number, contextRange?: number): string {
    const range = contextRange ?? 10;
    const zeroBased = lineNumber - 1;
    if (zeroBased < 0 || zeroBased >= this.lineCount) {
      return `Error: Line ${lineNumber} out of range (total: ${this.lineCount}).`;
    }
    const start = Math.max(0, zeroBased - range);
    const end = Math.min(this.lineCount, zeroBased + range + 1);
    return this.lines.slice(start, end).join('\n');
  }

  // ───────────────────────────────────────────────
  // P0: STACK-BASED STRUCTURE EXTRACTION
  //    + Context-Aware Brace Counting
  // ───────────────────────────────────────────────

  /**
   * P3: Extract code blocks with caching
   * P0: Stack-based parser for accurate nesting
   */
  public extractStructure(): CodeBlock[] {
    if (this._structureCache !== null) return this._structureCache;

    const blocks: CodeBlock[] = [];
    const stack: BlockFrame[] = [];
    let inMultilineComment = false;
    let inMultilineString = false;  // ← NEW: template literal tracking
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let stringDelimiter: string | null = null;

    // Sort patterns by priority (highest first)
    const sortedPatterns = [...this.patterns].sort((a, b) => b.priority - a.priority);
    const isHtml = this.patterns === LANGUAGE_PATTERNS.html;

    for (let i = 0; i < this.lineCount; i++) {
      const line = this.lines[i];
      const trimmed = line.trim();

      // ── Handle multiline constructs ──
      if (!inMultilineComment && !inMultilineString) {
        // Check for /* start
        const mlCommentStart = trimmed.indexOf('/*');
        if (mlCommentStart !== -1) {
          const mlCommentEnd = trimmed.indexOf('*/', mlCommentStart + 2);
          if (mlCommentEnd === -1) {
            inMultilineComment = true;
            continue;
          }
        }

        // Check for template literal start (backtick not in string)
        const backtickIdx = this.findBacktickOutsideString(line);
        if (backtickIdx !== -1) {
          const endBacktick = line.indexOf('`', backtickIdx + 1);
          if (endBacktick === -1) {
            inMultilineString = true;
            stringDelimiter = '`';
            continue;
          }
        }
      } else if (inMultilineComment) {
        if (trimmed.includes('*/')) {
          inMultilineComment = false;
        }
        continue;
      } else if (inMultilineString) {
        const endIdx = line.indexOf('`');
        if (endIdx !== -1 && !this.isEscaped(line, endIdx)) {
          inMultilineString = false;
          stringDelimiter = null;
        }
        continue;
      }

      // ── Skip empty/comment lines when not in block ──
      if (stack.length === 0) {
        if (!trimmed || /^\s*\/\//.test(trimmed) || /^\s*#/.test(trimmed)) {
          continue;
        }
      }

      // ── Detect new block start ──
      const topFrame = stack[stack.length - 1];
      let canNestNow = stack.length === 0;

      if (topFrame) {
          const pattern = this.patterns.find(p => p.type === topFrame.type);
          if (pattern?.canNest !== false) {
              if (pattern?.requiresBrace === false || topFrame.hasOpenedBrace) {
                  canNestNow = true;
              }
          }
      }

      if (canNestNow) {
        for (const p of sortedPatterns) {
          const match = trimmed.match(p.regex);
          if (match) {
            const name = p.nameGroup > 0 && match[p.nameGroup]
              ? match[p.nameGroup]
              : 'anonymous';

            const parentName = stack.length > 0 ? stack[stack.length - 1].name : null;

            const isVoid = p.type === 'struct' && this.patterns === LANGUAGE_PATTERNS.html && HTML_VOID_ELEMENTS.has(name.toLowerCase());
            const isSelfClosing = trimmed.endsWith('/>');

            stack.push({
              type: p.type,
              name,
              startLine: i,
              signature: trimmed,
              braceDepth: 0,
              bracketDepth: 0,
              parenDepth: 0,
              genericDepth: (isHtml && !isVoid && !isSelfClosing) ? 1 : 0,
              hasOpenedBrace: false,
              body: [],
              contextStart: Math.max(0, i - this.contextRange),
              depth: stack.length,
              parentName,
            });

            if (isVoid || isSelfClosing) {
                const block = stack.pop()!;
                const blockObj = this.buildBlock(block, i);
                blocks.push(blockObj);
            }
            break;
          }
        }
      }

      // ── Accumulate body & count braces ──
      if (stack.length > 0) {
        const frame = stack[stack.length - 1];
        frame.body.push(line);

        const isHtml = this.patterns === LANGUAGE_PATTERNS.html;
        const delta = this.countStructuralSymbols(line, isHtml);
        frame.braceDepth += delta.brace;
        frame.bracketDepth += delta.bracket;
        frame.parenDepth += delta.paren;
        frame.genericDepth += delta.generic;

        if (delta.brace > 0) frame.hasOpenedBrace = true;

        // ── Determine block end ──
        let isEnd = false;

        if (isHtml) {
            // Simplified HTML block end: current tag balanced OR self-closing
            // Note: genericDepth was initialized to 1 for non-void opening tags.
            // When it reaches 0 (or lower via </tag>), the block ends.
            if ((frame.genericDepth <= 0 || trimmed.endsWith('/>')) && frame.braceDepth === 0) isEnd = true;
        } else if (frame.hasOpenedBrace && frame.braceDepth === 0) {
          // Braces balanced → block ended
          isEnd = true;
        } else if (frame.type === 'comment') {
           // Single line comment ends immediately unless multiline handled above
           if (!inMultilineComment) isEnd = true;
        } else if (frame.type === 'import' || frame.type === 'type') {
           if (trimmed.endsWith(';')) isEnd = true;
        } else if (!frame.hasOpenedBrace && frame.braceDepth === 0) {
           // One-liner function/struct/etc.
           if (trimmed.endsWith(';') || (frame.type === 'function' && trimmed.endsWith('}'))) isEnd = true;
        }

        if (isEnd) {
          const block = stack.pop()!;
          const blockObj = this.buildBlock(block, i);
          blocks.push(blockObj);

          // Update parent-child relationships
          if (block.parentName && this._blockMap) {
            const parent = this._blockMap.get(block.parentName);
            if (parent) {
              (parent.children as string[]).push(block.name);
            }
          }
        }
      }
    }

    // ── Handle unclosed blocks ──
    while (stack.length > 0) {
      const block = stack.pop()!;
      const blockObj = this.buildBlock(block, this.lineCount - 1);
      blocks.push(blockObj);
    }

    // Build lookup maps
    this._blockMap = new Map();
    this._lineToBlock = new Map();
    for (const block of blocks) {
      this._blockMap.set(block.name, block);
      for (let l = block.startLine; l <= block.endLine; l++) {
        this._lineToBlock.set(l, block.name);
      }
    }

    this._structureCache = blocks;
    return blocks;
  }

  /**
   * P0: Context-aware structural symbol counting
   * Returns delta for braces, brackets, parens separately.
   * Tracks nested generics <>, template literals, and escaping.
   */
  private countStructuralSymbols(line: string, isHtml = false): { brace: number; bracket: number; paren: number; generic: number; inAttr: boolean } {
    let brace = 0, bracket = 0, paren = 0, generic = 0;
    let inAttr = false;
    let ctx: ParseContext = ParseContext.Code;
    let escaped = false;
    let stringChar: string | null = null;
    let templateDepth = 0;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1] || '';

      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }

      switch (ctx) {
        case ParseContext.Code:
          if (isHtml) {
              if (char === '<' && nextChar !== '/' && nextChar !== '!' && nextChar !== '?') {
                  generic++;
              } else if (char === '<' && nextChar === '/') {
                  generic--;
              } else if (char === '"' || char === "'") {
                  // Potential HTML attribute start
                  inAttr = true;
              }
          }
          if (char === '"' || char === "'") {
            ctx = ParseContext.String; stringChar = char;
          } else if (char === '`') {
            ctx = ParseContext.Template; templateDepth = 1;
          } else if (char === '/' && nextChar === '/') {
            ctx = ParseContext.Comment; i++;
          } else if (char === '/' && nextChar === '*') {
            ctx = ParseContext.MultilineComment; i++;
          } else if (char === '{' ) { brace++; }
          else if (char === '}' ) { brace--; }
          else if (char === '[' ) { bracket++; }
          else if (char === ']' ) { bracket--; }
          else if (char === '(' ) { paren++; }
          else if (char === ')' ) { paren--; }
          else if (char === '<' && nextChar !== ' ' && nextChar !== '=') { generic++; }
          else if (char === '>' && i > 0 && line[i-1] !== ' ' && line[i-1] !== '-') { generic--; }
          break;

        case ParseContext.String:
          if (char === stringChar) { ctx = ParseContext.Code; stringChar = null; }
          break;

        case ParseContext.Template:
          if (char === '`') {
            ctx = ParseContext.Code; templateDepth = 0;
          } else if (char === '$' && nextChar === '{') {
            // Template expression start — count as code context
            // Increment template depth to handle nested braces if we were tracking properly
            templateDepth++;
            i++;
            // For simplicity, we don't fully switch context here but it would be ideal
          }
          break;

        case ParseContext.Comment:
          break;

        case ParseContext.MultilineComment:
          if (char === '*' && nextChar === '/') {
            ctx = ParseContext.Code; i++;
          }
          break;
      }
    }

    return { brace, bracket, paren, generic, inAttr };
  }

  private findBacktickOutsideString(line: string): number {
    let inString = false;
    let stringChar: string | null = null;
    let escaped = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }

      if (!inString && (char === '"' || char === "'")) {
        inString = true; stringChar = char;
      } else if (inString && char === stringChar) {
        inString = false; stringChar = null;
      } else if (!inString && char === '`') {
        return i;
      }
    }
    return -1;
  }

  private isEscaped(line: string, pos: number): boolean {
    let backslashes = 0;
    for (let i = pos - 1; i >= 0 && line[i] === '\\'; i--) {
      backslashes++;
    }
    return backslashes % 2 === 1;
  }

  private buildBlock(frame: BlockFrame, endLine: number): CodeBlock {
    return {
      type: frame.type,
      name: frame.name,
      startLine: frame.startLine,
      endLine: endLine,
      signature: frame.signature,
      body: frame.body,
      context: this.lines.slice(frame.contextStart, frame.startLine),
      depth: frame.depth,
      parentBlock: frame.parentName,
      children: [],
      hash: this.djb2Hash(frame.body),
    };
  }

  // ───────────────────────────────────────────────
  // BLOCK QUERY & NAVIGATION
  // ───────────────────────────────────────────────

  /** Find block by exact name */
  public findBlock(name: string): CodeBlock | undefined {
    this.extractStructure(); // ensure cache built
    return this._blockMap!.get(name);
  }

  /** Find block containing a specific line (1-based) */
  public findBlockAtLine(lineNumber: number): CodeBlock | undefined {
    this.extractStructure();
    const name = this._lineToBlock!.get(lineNumber - 1);
    return name ? this._blockMap!.get(name) : undefined;
  }

  /**
   * Searches for code blocks by name or signature using relevance scoring.
   * @param query The search term.
   * @returns A sorted list of BlockSearchResult objects, highest relevance first.
   */
  public searchBlocks(query: string): BlockSearchResult[] {
    const blocks = this.extractStructure();
    const results: BlockSearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const block of blocks) {
      let score = 0;
      let matchType: BlockSearchResult['matchType'] = 'fuzzy';

      const lowerName = block.name.toLowerCase();
      if (lowerName === lowerQuery) {
        score = 100; matchType = 'exact';
      } else if (lowerName.startsWith(lowerQuery)) {
        score = 80; matchType = 'prefix';
      } else if (lowerName.includes(lowerQuery)) {
        score = 60; matchType = 'substring';
      } else if (this.levenshtein(lowerName, lowerQuery) <= 2) {
        score = 40; matchType = 'fuzzy';
      } else if (block.signature.toLowerCase().includes(lowerQuery)) {
        score = 30; matchType = 'substring';
      } else {
        continue; // no match
      }

      // Boost by block type relevance
      if (block.type === 'class' || block.type === 'struct' || block.type === 'interface') score += 10;
      if (block.type === 'function') score += 5;
      if (block.depth === 0) score += 5; // top-level

      // Boost for exported/public members
      if (block.signature.includes('export ') || block.signature.includes('pub ')) {
        score += 20;
      }

      results.push({ block, score, matchType });
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /** Get all blocks of a specific type */
  public getBlocksByType(type: CodeBlock['type']): CodeBlock[] {
    return this.extractStructure().filter(b => b.type === type);
  }

  /** Get child blocks of a parent block */
  public getChildren(parentName: string): CodeBlock[] {
    const parent = this.findBlock(parentName);
    if (!parent) return [];
    return parent.children
      .map(name => this.findBlock(name))
      .filter((b): b is CodeBlock => b !== undefined);
  }

  // ───────────────────────────────────────────────
  // STATISTICS & ANALYSIS
  // ───────────────────────────────────────────────

  public getStats(): {
    totalLines: number;
    totalBlocks: number;
    blocksByType: Record<string, number>;
    maxDepth: number;
    avgBlockSize: number;
  } {
    const blocks = this.extractStructure();
    const byType: Record<string, number> = {};
    let maxDepth = 0;
    let totalSize = 0;

    for (const block of blocks) {
      byType[block.type] = (byType[block.type] || 0) + 1;
      maxDepth = Math.max(maxDepth, block.depth);
      totalSize += block.endLine - block.startLine + 1;
    }

    return {
      totalLines: this.lineCount,
      totalBlocks: blocks.length,
      blocksByType: byType,
      maxDepth,
      avgBlockSize: blocks.length > 0 ? Math.round(totalSize / blocks.length) : 0,
    };
  }

  // ───────────────────────────────────────────────
  // V8-ENHANCED PATCH ENGINE INTEGRATION
  // ───────────────────────────────────────────────

  /**
   * Convert CodeBlock to DagNode for patch engine integration
   */
  public toDagNode(block: CodeBlock): {
    id: string;
    type: string;
    content: string;
    start: number;
    end: number;
    children: string[];
    depth: number;
    parentId: string | null;
  } {
    return {
      id: block.name,
      type: block.type === 'function' || block.type === 'class' ? 'declaration' : 'block',
      content: block.body.join('\n'),
      start: block.startLine,
      end: block.endLine,
      children: block.children,
      depth: block.depth,
      parentId: block.parentBlock,
    };
  }

  /**
   * Build a CodeDag from extracted structure
   */
  public toCodeDag(): {
    rootId: string;
    nodes: Map<string, any>;
    source: string;
    version: number;
    fileName: string;
  } {
    const blocks = this.extractStructure();
    const nodes = new Map();

    // Create root node
    nodes.set('__root', {
      id: '__root',
      type: 'root',
      content: this.content,
      start: 0,
      end: this.lineCount - 1,
      children: blocks.filter(b => b.depth === 0).map(b => b.name),
      depth: -1,
      parentId: null,
    });

    for (const block of blocks) {
      nodes.set(block.name, this.toDagNode(block));
    }

    return {
      rootId: '__root',
      nodes,
      source: this.content,
      version: Date.now(),
      fileName: 'unknown',
    };
  }

  // ───────────────────────────────────────────────
  // UTILITIES
  // ───────────────────────────────────────────────

  private levenshtein(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
    return dp[a.length][b.length];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. BACKWARD COMPATIBILITY WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

export function internalSurgicalRead(
  content: string,
  query: string,
  contextRange = 5
): CodeSnippet[] {
  return new CodeStructureAnalyzer(content, { buildIndex: false }).surgicalRead(query, contextRange);
}

export function internalContextAt(
  content: string,
  path: string,
  pos: number,
  contextRange = 10
): string {
  const analyzer = new CodeStructureAnalyzer(content, { buildIndex: false });
  return `--- Konteks di sekitar baris ${pos} (${path}) ---\n\n${analyzer.contextAt(pos, contextRange)}`;
}

export function extractStructure(content: string, contextRange = 3): CodeBlock[] {
  return new CodeStructureAnalyzer(content, { contextRange }).extractStructure();
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. FACTORY & BUILDER
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyzerOptions {
  patterns?: BlockPattern[];
  contextRange?: number;
  buildIndex?: boolean;
  language?: 'typescript' | 'javascript' | 'python' | 'rust' | 'go';
}

export function createAnalyzer(content: string, options?: AnalyzerOptions): CodeStructureAnalyzer {
  return new CodeStructureAnalyzer(content, options);
}

// Language-specific pattern presets
export const LANGUAGE_PATTERNS: Record<string, BlockPattern[]> = {
  typescript: DEFAULT_PATTERNS,
  javascript: DEFAULT_PATTERNS.filter(p => p.type !== 'interface' && p.type !== 'enum' && p.type !== 'type'),
  python: [
    { type: 'import', regex: /^\s*(?:import|from)\s+/, nameGroup: 0, canNest: false, requiresBrace: false, priority: 100 },
    { type: 'comment', regex: /^\s*#/, nameGroup: 0, canNest: false, requiresBrace: false, priority: 90 },
    { type: 'class', regex: /^\s*class\s+(\w+)/, nameGroup: 1, canNest: true, requiresBrace: false, priority: 60 },
    { type: 'function', regex: /^\s*(?:async\s+)?def\s+(\w+)/, nameGroup: 1, canNest: true, requiresBrace: false, priority: 50 },
  ],
  rust: [
    { type: 'import', regex: /^\s*use\s+/, nameGroup: 0, canNest: false, requiresBrace: false, priority: 100 },
    { type: 'comment', regex: /^\s*(?:\/\/|\/\*|\*)/, nameGroup: 0, canNest: false, requiresBrace: false, priority: 90 },
    { type: 'type', regex: /^\s*(?:pub(?:\([^)]*\))?\s+)?type\s+(\w+)/, nameGroup: 1, canNest: false, requiresBrace: false, priority: 80 },
    { type: 'struct', regex: /^\s*(?:pub(?:\([^)]*\))?\s+)?struct\s+(\w+)/, nameGroup: 1, canNest: false, requiresBrace: true, priority: 70 },
    { type: 'enum', regex: /^\s*(?:pub(?:\([^)]*\))?\s+)?enum\s+(\w+)/, nameGroup: 1, canNest: false, requiresBrace: true, priority: 70 },
    { type: 'interface', regex: /^\s*(?:pub(?:\([^)]*\))?\s+)?trait\s+(\w+)/, nameGroup: 1, canNest: true, requiresBrace: true, priority: 60 },
    { type: 'class', regex: /^\s*(?:pub(?:\([^)]*\))?\s+)?impl(?:\s+.*?\s+for)?\s+(\w+)/, nameGroup: 1, canNest: true, requiresBrace: true, priority: 60 },
    { type: 'function', regex: /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+(\w+)/, nameGroup: 1, canNest: true, requiresBrace: true, priority: 50 },
  ],
  go: [
    { type: 'import', regex: /^\s*import\s+/, nameGroup: 0, canNest: false, requiresBrace: false, priority: 100 },
    { type: 'comment', regex: /^\s*(?:\/\/|\/\*|\*)/, nameGroup: 0, canNest: false, requiresBrace: false, priority: 90 },
    { type: 'type', regex: /^\s*type\s+(\w+)\s+(?:struct|interface|func|map|chan|\[)/, nameGroup: 1, canNest: true, requiresBrace: true, priority: 80 },
    { type: 'function', regex: /^\s*func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(/, nameGroup: 1, canNest: true, requiresBrace: true, priority: 50 },
  ],
  html: [
    { type: 'comment', regex: /<!--/, nameGroup: 0, canNest: false, requiresBrace: false, priority: 100 },
    { type: 'struct', regex: /<([a-zA-Z0-9:-]+)(?:\s+[^>]*?)?\/?>/, nameGroup: 1, canNest: true, requiresBrace: false, priority: 50 },
  ],
  css: [
    { type: 'comment', regex: /\/\*/, nameGroup: 0, canNest: false, requiresBrace: false, priority: 90 },
    { type: 'type', regex: /^\s*(@[\w-]+)/, nameGroup: 1, canNest: true, requiresBrace: true, priority: 80 },
    { type: 'class', regex: /^\s*([.#\w][^{]*)\{/, nameGroup: 1, canNest: true, requiresBrace: true, priority: 50 },
  ],
};

export function createAnalyzerForLanguage(content: string, language: keyof typeof LANGUAGE_PATTERNS): CodeStructureAnalyzer {
  const patterns = LANGUAGE_PATTERNS[language];
  if (!patterns) {
    throw new Error(`Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_PATTERNS).join(', ')}`);
  }
  return new CodeStructureAnalyzer(content, { patterns });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default CodeStructureAnalyzer;
