import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import CodeStructureAnalyzer, { createAnalyzerForLanguage } from './analyzer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runHarness() {
  console.log('=== V8 TYPES KERNEL TEST HARNESS ===\n');

  // 1. Analyze v8_kernel_types.ts
  console.log('--- Phase 1: Analyzing v8_kernel_types.ts ---');
  const typesPath = path.resolve(__dirname, '../v8_kernel_types.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');
  const typesAnalyzer = new CodeStructureAnalyzer(typesContent, { buildIndex: true });

  const typesStats = typesAnalyzer.getStats();
  console.log('Stats:', JSON.stringify(typesStats, null, 2));

  const interfaces = typesAnalyzer.getBlocksByType('interface');
  console.log(`Found ${interfaces.length} interfaces.`);

  const enums = typesAnalyzer.getBlocksByType('enum');
  console.log(`Found ${enums.length} enums.`);

  // Verify some core types exist
  const coreTypes = ['Heap', 'JSObject', 'FailureKind', 'PromiseState'];
  for (const type of coreTypes) {
    const block = typesAnalyzer.findBlock(type);
    if (block) {
      console.log(`[OK] Verified core type: ${type} (${block.type})`);
    } else {
      console.error(`[FAIL] Core type missing: ${type}`);
    }
  }

  console.log('\n--- Phase 2: Analyzing Rust Source (src/heap/mod.rs) ---');
  const rustPath = path.resolve(__dirname, '../src/heap/mod.rs');
  const rustContent = fs.readFileSync(rustPath, 'utf8');
  const rustAnalyzer = createAnalyzerForLanguage(rustContent, 'rust');

  const rustStats = rustAnalyzer.getStats();
  console.log('Stats:', JSON.stringify(rustStats, null, 2));

  const structs = rustAnalyzer.getBlocksByType('struct');
  console.log(`Found ${structs.length} structs.`);

  const functions = rustAnalyzer.getBlocksByType('function');
  console.log(`Found ${functions.length} functions.`);

  const traits = rustAnalyzer.getBlocksByType('interface');
  console.log(`Found ${traits.length} traits.`);

  const impls = rustAnalyzer.getBlocksByType('class');
  console.log(`Found ${impls.length} impl blocks.`);

  // Sample search relevance test
  console.log('\n--- Phase 3: Search Relevance Test ---');
  const searchResults = rustAnalyzer.searchBlocks('new');
  console.log(`Found ${searchResults.length} blocks matching "new".`);
  if (searchResults.length > 0) {
    console.log(`Top match: ${searchResults[0].block.name} (Score: ${searchResults[0].score}, Type: ${searchResults[0].block.type})`);
    console.log(`Signature: ${searchResults[0].block.signature}`);
  }

  // Phase 5: HTML/CSS Test
  console.log('\n--- Phase 5: HTML/CSS Test ---');
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <div id="main">
        <h1>Hello World</h1>
    </div>
</body>
</html>
`;
  const htmlAnalyzer = createAnalyzerForLanguage(htmlContent, 'html');
  console.log('HTML Stats:', JSON.stringify(htmlAnalyzer.getStats(), null, 2));
  console.log('HTML Blocks:', htmlAnalyzer.extractStructure().map(b => `${b.name} (${b.type})`).join(', '));

  const cssContent = `
body {
    background: #fff;
}
#main {
    color: red;
}
@media (max-width: 600px) {
    #main {
        color: blue;
    }
}
`;
  const cssAnalyzer = createAnalyzerForLanguage(cssContent, 'css');
  console.log('CSS Stats:', JSON.stringify(cssAnalyzer.getStats(), null, 2));
  console.log('CSS Blocks:', cssAnalyzer.extractStructure().map(b => `${b.name} (${b.type})`).join(', '));

  // Phase 6: Go Test
  console.log('\n--- Phase 6: Go Test ---');
  const goContent = `
package main
import "fmt"
type User struct {
    Name string
}
func (u *User) Greet() {
    fmt.Printf("Hello, %s\n", u.Name)
}
`;
  const goAnalyzer = createAnalyzerForLanguage(goContent, 'go');
  console.log('Go Stats:', JSON.stringify(goAnalyzer.getStats(), null, 2));
  console.log('Go Blocks:', goAnalyzer.extractStructure().map(b => `${b.name} (${b.type})`).join(', '));

  // Sample surgical read
  console.log('\n--- Phase 7: Surgical Read Test ---');
  const snippets = rustAnalyzer.surgicalRead('pub fn new', 2);
  console.log(`Found ${snippets.length} instances of "pub fn new".`);
  if (snippets.length > 0) {
    console.log('Sample snippet from first match:');
    console.log(snippets[0].lines.join('\n'));
  }

  console.log('\n=== TEST HARNESS COMPLETE ===');
}

runHarness().catch(err => {
  console.error('Harness failed:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
  process.exit(1);
});
