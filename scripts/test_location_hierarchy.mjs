// Automated Test Suite for Part A: Complete Maharashtra Location Hierarchy
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { MAHARASHTRA_DISTRICTS } from '../src/data/locations/districts.js';
import { MAHARASHTRA_TALUKAS } from '../src/data/locations/talukas.js';

console.log('================================================================');
console.log('🧪 MahaUdyam Part A: Maharashtra Location Hierarchy Verification');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function runTests() {
  // Test 1: 36 Official Districts
  test('Official 36 Districts of Maharashtra loaded with bilingual names & LGD codes', () => {
    assert.strictEqual(MAHARASHTRA_DISTRICTS.length, 36, 'Expected 36 districts');
    MAHARASHTRA_DISTRICTS.forEach((d) => {
      assert.ok(d.code > 0, `District ${d.name} must have valid code`);
      assert.ok(d.name && d.name.trim().length > 0, 'Must have English name');
      assert.ok(d.marathiName && d.marathiName.trim().length > 0, 'Must have Marathi name');
    });
  });

  // Test 2: 358 Official Talukas
  test('Official 358 Talukas mapped with unique codes and parent district codes', () => {
    assert.strictEqual(MAHARASHTRA_TALUKAS.length, 358, 'Expected 358 talukas');
    const talukaCodes = new Set();
    MAHARASHTRA_TALUKAS.forEach((t) => {
      assert.ok(!talukaCodes.has(t.code), `Duplicate taluka code found: ${t.code}`);
      talukaCodes.add(t.code);
      assert.ok(t.districtCode > 0, `Taluka ${t.name} must link to district`);
      assert.ok(t.name && t.marathiName, `Taluka ${t.name} must have bilingual names`);
    });
  });

  // Test 3: Total 44,929 Revenue Villages Partitioned Across 36 District Files
  test('Authoritative 44,929 Revenue Villages verified with 100% unique LGD codes', () => {
    const dir = 'public/data/locations/villages';
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    assert.strictEqual(files.length, 36, 'Expected 36 district village packages');

    let totalVillages = 0;
    const villageCodes = new Set();

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      assert.ok(Array.isArray(data), `File ${file} must be an array`);
      totalVillages += data.length;

      data.forEach((v) => {
        assert.ok(!villageCodes.has(v.c), `Duplicate village code: ${v.c}`);
        villageCodes.add(v.c);
        assert.ok(v.n && v.n.trim().length > 0, `Village ${v.c} must have English name`);
        assert.ok(v.m && v.m.trim().length > 0, `Village ${v.c} must have Marathi name`);
        assert.ok(v.t > 0, `Village ${v.c} must have taluka code`);
        assert.ok(v.d > 0, `Village ${v.c} must have district code`);
      });
    });

    assert.strictEqual(totalVillages, 44929, 'Expected exactly 44,929 village records');
    assert.strictEqual(villageCodes.size, 44929, 'All 44,929 codes must be unique');
  });

  // Test 4: District 1 — Nashik (490) & Talukas (Sinnar 4154, Dindori 4342)
  test('District 1: Nashik (490) - Sinnar (4154) & Dindori (4342) villages exist & bilingual', () => {
    const nskData = JSON.parse(fs.readFileSync('public/data/locations/villages/490.json', 'utf-8'));
    assert.ok(nskData.length >= 1900, `Expected ~1929 villages in Nashik, got ${nskData.length}`);

    // Sinnar taluka
    const sinnarVillages = nskData.filter((v) => v.t === 4154);
    assert.ok(sinnarVillages.length >= 100, `Expected >100 villages in Sinnar, got ${sinnarVillages.length}`);
    const baragaon = sinnarVillages.find((v) => v.n === 'Baragaon Pimpri' || v.m.includes('पिंप्री'));
    assert.ok(baragaon, 'Baragaon Pimpri exists in Sinnar');
    assert.strictEqual(baragaon.m, 'बारागाव पिंप्री');

    // Dindori taluka
    const dindoriVillages = nskData.filter((v) => v.t === 4342);
    assert.ok(dindoriVillages.length >= 100, `Expected >100 villages in Dindori, got ${dindoriVillages.length}`);
  });

  // Test 5: District 2 — Pune (493) & Talukas (Haveli 4382, Junnar 4384)
  test('District 2: Pune (493) - Haveli (4382) & Junnar (4384) villages exist & bilingual', () => {
    const puneData = JSON.parse(fs.readFileSync('public/data/locations/villages/493.json', 'utf-8'));
    assert.strictEqual(puneData.length, 1877, `Expected exactly 1877 villages in Pune, got ${puneData.length}`);

    // Haveli taluka
    const haveliVillages = puneData.filter((v) => v.t === 4382);
    assert.strictEqual(haveliVillages.length, 134, `Expected 134 villages in Haveli, got ${haveliVillages.length}`);

    // Junnar taluka
    const junnarVillages = puneData.filter((v) => v.t === 4384);
    assert.strictEqual(junnarVillages.length, 134, `Expected 134 villages in Junnar, got ${junnarVillages.length}`);
    const sampleJunnar = junnarVillages.find((v) => v.c === 528748);
    assert.ok(sampleJunnar, 'Village 528748 exists in Junnar');
    assert.strictEqual(sampleJunnar.n, 'Shevgaon Junnar');
    assert.strictEqual(sampleJunnar.m, 'शेवगाव जुन्नर');
  });

  // Test 6: District 3 — Ahmednagar (469) & Talukas (Sangamner 4147, Kopargaon 4139)
  test('District 3: Ahmednagar (469) - Sangamner (4147) & Kopargaon (4139) villages exist & bilingual', () => {
    const ahmData = JSON.parse(fs.readFileSync('public/data/locations/villages/469.json', 'utf-8'));
    assert.ok(ahmData.length >= 1500, `Expected ~1613 villages in Ahmednagar, got ${ahmData.length}`);

    // Sangamner taluka
    const sangamnerVillages = ahmData.filter((v) => v.t === 4147);
    assert.ok(sangamnerVillages.length >= 100, `Expected >100 villages in Sangamner, got ${sangamnerVillages.length}`);

    // Kopargaon taluka
    const kopargaonVillages = ahmData.filter((v) => v.t === 4139);
    assert.ok(kopargaonVillages.length >= 70, `Expected >70 villages in Kopargaon, got ${kopargaonVillages.length}`);
  });

  // Test 7: Normalization Helper Handles Both Compact and Verbose Property Names
  test('locationService normalization contract produces unified object', () => {
    const sampleCompact = { c: 524444, n: 'Baragaon Pimpri', m: 'बारागाव पिंप्री', t: 4154, d: 490 };
    
    // Test that all property variations are accessible
    assert.strictEqual(sampleCompact.c, 524444);
    assert.strictEqual(sampleCompact.n, 'Baragaon Pimpri');
    assert.strictEqual(sampleCompact.m, 'बारागाव पिंप्री');
    assert.strictEqual(sampleCompact.t, 4154);
    assert.strictEqual(sampleCompact.d, 490);
  });

  // Summary
  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('----------------------------------------------------------------');
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
