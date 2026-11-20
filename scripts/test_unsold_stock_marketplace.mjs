import assert from 'node:assert';
import { unsoldStockService } from '../src/services/stock/unsoldStockService.js';
import { STOCK_CATEGORIES, STOCK_STATUSES, PERISHABILITY_LEVELS } from '../src/data/stock/stockConstants.js';

console.log('--- MahaUdyam Unsold Stock Rescue: Buyer Marketplace Automated Verification Suite ---');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ [PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] Test ${total}: ${name}`);
      console.error(err);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] Test ${total}: ${name}`);
      console.error(err);
    }
  }

  // Initialize service
  await unsoldStockService.initStockDatabase();

  // Test 1: getAvailableMarketplaceStocks returns active items and excludes spoiled spinach
  await asyncTest('Marketplace strictly excludes damaged or spoiled food (Food Safety Guard)', async () => {
    const stocks = await unsoldStockService.getAvailableMarketplaceStocks();
    assert(stocks.length > 0, 'Should return marketplace stocks');
    const spoiled = stocks.find((s) => s.id === 'stock_damaged_spinach_05');
    assert(!spoiled, 'Damaged spoiled spinach MUST NOT appear in buyer marketplace');
  });

  // Test 2: Sanitization of private entrepreneur inventory costs
  await asyncTest('Marketplace sanitizes private cost data (no originalTotalCost leakage)', async () => {
    const stocks = await unsoldStockService.getAvailableMarketplaceStocks();
    for (const item of stocks) {
      assert.strictEqual(item.originalTotalCost, undefined, 'Private originalTotalCost must not be exposed');
      assert(item.askingPricePerUnit >= 0, 'Must have valid askingPricePerUnit');
    }
  });

  // Test 3: Urgent lots (< 24h remaining shelf life) sorted first
  await asyncTest('Sorts urgent perishable lots (< 24h) to the top of the marketplace', async () => {
    const stocks = await unsoldStockService.getAvailableMarketplaceStocks();
    const urgentIndex = stocks.findIndex((s) => s.isUrgent);
    if (urgentIndex !== -1) {
      assert.strictEqual(urgentIndex, 0, 'First item should be an urgent lot');
    }
  });

  // Test 4: Category Filtering
  await asyncTest('Filters marketplace items accurately by category', async () => {
    const dairyItems = await unsoldStockService.getAvailableMarketplaceStocks({
      category: STOCK_CATEGORIES.DAIRY
    });
    assert(dairyItems.length > 0, 'Should find dairy surplus');
    for (const d of dairyItems) {
      assert.strictEqual(d.category, STOCK_CATEGORIES.DAIRY, 'All returned items must be dairy');
    }
  });

  // Test 5: District Filtering
  await asyncTest('Filters marketplace items by district code or name', async () => {
    const nashikItems = await unsoldStockService.getAvailableMarketplaceStocks({
      district: 'Nashik'
    });
    assert(nashikItems.length > 0, 'Should find Nashik surplus');
    for (const item of nashikItems) {
      assert.strictEqual(item.districtName.toLowerCase(), 'nashik');
    }
  });

  // Test 6: Max Price Filter
  await asyncTest('Applies maximum asking price filter correctly', async () => {
    const cheapItems = await unsoldStockService.getAvailableMarketplaceStocks({
      maxPrice: 30
    });
    for (const item of cheapItems) {
      assert(item.askingPricePerUnit <= 30, `Price ${item.askingPricePerUnit} exceeds max 30`);
    }
  });

  // Test 7: Direct Buyer Offer Submission
  await asyncTest('Buyer can submit direct purchase offer to seller', async () => {
    const targetStock = (await unsoldStockService.getAvailableMarketplaceStocks())[0];
    const sellerId = targetStock.sellerId;

    const offerResult = await unsoldStockService.submitBuyerOffer({
      stockId: targetStock.id,
      buyerName: 'Sahyadri Agro Processing',
      buyerPhone: '9822155667',
      buyerType: 'Food Processing Unit',
      offeredQuantity: 30,
      offeredPricePerUnit: 12,
      deliveryTerms: 'pickup',
      message: 'Can pick up tomorrow at 8am from farm gate',
      userId: 'buyer_sahyadri_01'
    });

    assert(offerResult.success, 'Offer should succeed');
    assert(offerResult.enquiryId, 'Should return generated enquiry ID');

    // Verify it landed in seller's enquiry inbox
    const sellerEnquiries = await unsoldStockService.getEnquiriesForStock(sellerId, targetStock.id);
    const matchedEnquiry = sellerEnquiries.find((e) => e.id === offerResult.enquiryId);
    assert(matchedEnquiry, 'Enquiry must exist in seller inbox');
    assert.strictEqual(matchedEnquiry.enquiryQuantity, 30);
    assert.strictEqual(matchedEnquiry.proposedPricePerUnit, 12);
    assert.strictEqual(matchedEnquiry.negotiationHistory.length, 1);
    assert.strictEqual(matchedEnquiry.negotiationHistory[0].offeredPrice, 12);
    assert.strictEqual(matchedEnquiry.negotiationHistory[0].offeredQuantity, 30);
  });

  // Test 8: Offer quantity exceeds available quantity throws error
  await asyncTest('Rejects buyer offer when offered quantity exceeds available quantity', async () => {
    const targetStock = (await unsoldStockService.getAvailableMarketplaceStocks())[0];
    let errCaught = false;
    try {
      await unsoldStockService.submitBuyerOffer({
        stockId: targetStock.id,
        buyerName: 'Greedy Buyer',
        offeredQuantity: targetStock.availableQuantity + 9999,
        offeredPricePerUnit: 10
      });
    } catch (e) {
      errCaught = true;
      assert(e.message.includes('exceeds available quantity'));
    }
    assert(errCaught, 'Should throw error when quantity exceeds available');
  });

  // Test 9: Food Safety guard prevents buyer offer on damaged or expired stock
  await asyncTest('Prevents buyer offer on spoiled or damaged stock', async () => {
    let errCaught = false;
    try {
      await unsoldStockService.submitBuyerOffer({
        stockId: 'stock_damaged_spinach_05',
        buyerName: 'Unsuspecting Buyer',
        offeredQuantity: 5,
        offeredPricePerUnit: 5
      });
    } catch (e) {
      errCaught = true;
      assert(e.message.includes('Food Safety Guard'));
    }
    assert(errCaught, 'Should throw food safety error on damaged stock');
  });

  console.log(`\nResults: ${passed} / ${total} tests passed.`);
  if (passed === total) {
    console.log('🎉 All Buyer Marketplace tests passed successfully!');
  } else {
    process.exit(1);
  }
}

runTests();
