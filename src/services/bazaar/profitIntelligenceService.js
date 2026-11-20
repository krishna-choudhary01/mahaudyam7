/**
 * Profit Intelligence Service for MahaUdyam BazaarPath
 * Evaluates the net financial viability of travelling to and selling at a weekly market.
 * 
 * Formulas:
 * - Estimated Revenue = Expected Selling Price × Expected Quantity Sold
 * - Estimated Total Cost = Product Cost + Round-trip Travel Cost + Stall Fee + Packaging + Misc
 * - Estimated Net Profit = Estimated Revenue − Estimated Total Cost
 * - Profit Margin = (Estimated Net Profit / Estimated Revenue) × 100
 * - Break-even Quantity = Total Cost / Expected Selling Price
 * - Minimum Selling Price = Total Cost / Quantity Sold
 * - Unsold-Stock Risk = (Quantity Carried − Quantity Sold) × Cost per Unit
 */

export const profitIntelligenceService = {
  /**
   * Calculate complete profit metrics for an entrepreneur's trip
   */
  calculateProfit({
    quantityCarried = 0,
    costPerUnit = 0,
    expectedPricePerUnit = 0,
    sellThroughPct = 85, // Default assumption: 85% of stock sold
    travelCost = 0,
    stallFee = 50,
    packagingCost = 0,
    otherExpenses = 0
  }) {
    const qty = Math.max(0, Number(quantityCarried) || 0);
    const unitCost = Math.max(0, Number(costPerUnit) || 0);
    const sellingPrice = Math.max(0, Number(expectedPricePerUnit) || 0);
    const sellPct = Math.min(100, Math.max(1, Number(sellThroughPct) || 85));

    // Quantity sold vs unsold
    const quantitySold = Math.round(qty * (sellPct / 100) * 10) / 10;
    const unsoldQuantity = Math.round(Math.max(0, qty - quantitySold) * 10) / 10;

    // Financial totals
    const grossRevenue = Math.round(quantitySold * sellingPrice);
    const productCost = Math.round(qty * unitCost);
    const logisticsAndMarketCost = Math.round(
      Number(travelCost || 0) + Number(stallFee || 0) + Number(packagingCost || 0) + Number(otherExpenses || 0)
    );
    const totalCost = productCost + logisticsAndMarketCost;
    const netProfit = grossRevenue - totalCost;

    // Margins and ratios
    const profitMargin = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 1000) / 10 : 0;
    const returnOnInvestment = totalCost > 0 ? Math.round((netProfit / totalCost) * 1000) / 10 : 0;

    // Break-even metrics
    const breakEvenQuantity = sellingPrice > 0 ? Math.ceil(totalCost / sellingPrice) : 0;
    const isBreakEvenAchievable = breakEvenQuantity <= qty;

    // Minimum price required to recover all expenses
    const minSellingPrice = quantitySold > 0 ? Math.round(totalCost / quantitySold) : 0;

    // Capital tied up in unsold stock
    const unsoldStockRiskValue = Math.round(unsoldQuantity * unitCost);

    return {
      quantityCarried: qty,
      quantitySold,
      unsoldQuantity,
      sellThroughPct: sellPct,
      grossRevenue,
      productCost,
      travelCost: Number(travelCost || 0),
      stallFee: Number(stallFee || 0),
      packagingCost: Number(packagingCost || 0),
      otherExpenses: Number(otherExpenses || 0),
      logisticsAndMarketCost,
      totalCost,
      netProfit,
      isProfitable: netProfit > 0,
      profitMargin,
      returnOnInvestment,
      breakEvenQuantity,
      isBreakEvenAchievable,
      minSellingPrice,
      unsoldStockRiskValue
    };
  },

  /**
   * Generates three scenarios: Conservative, Expected, and Optimistic
   */
  generateScenarios({
    quantityCarried = 0,
    costPerUnit = 0,
    expectedPricePerUnit = 0,
    travelCost = 0,
    stallFee = 50,
    packagingCost = 0,
    otherExpenses = 0
  }) {
    const price = Number(expectedPricePerUnit) || 0;

    // 1. Conservative: 65% sold, 10% lower price due to afternoon market drops
    const conservativePrice = Math.round(price * 0.9);
    const conservative = this.calculateProfit({
      quantityCarried,
      costPerUnit,
      expectedPricePerUnit: conservativePrice,
      sellThroughPct: 65,
      travelCost,
      stallFee,
      packagingCost,
      otherExpenses
    });

    // 2. Expected: 85% sold, standard expected price
    const expected = this.calculateProfit({
      quantityCarried,
      costPerUnit,
      expectedPricePerUnit: price,
      sellThroughPct: 85,
      travelCost,
      stallFee,
      packagingCost,
      otherExpenses
    });

    // 3. Optimistic: 100% sold, 10% premium for peak freshness
    const optimisticPrice = Math.round(price * 1.1);
    const optimistic = this.calculateProfit({
      quantityCarried,
      costPerUnit,
      expectedPricePerUnit: optimisticPrice,
      sellThroughPct: 100,
      travelCost,
      stallFee,
      packagingCost,
      otherExpenses
    });

    return {
      conservative: {
        ...conservative,
        label_en: 'Conservative',
        label_mr: 'मंदीची स्थिती (सावध अंदाज)',
        assumptions: '६५% विक्री व १०% कमी दर (बाजार मंदीच्या काळात)'
      },
      expected: {
        ...expected,
        label_en: 'Expected',
        label_mr: 'अपेक्षित स्थिती (सर्वसामान्य)',
        assumptions: '८५% विक्री व ठरलेला अपेक्षित दर'
      },
      optimistic: {
        ...optimistic,
        label_en: 'Optimistic',
        label_mr: 'तेजीची स्थिती (उत्तम व्यवहार)',
        assumptions: '१००% संपूर्ण विक्री व १०% जादा दर'
      }
    };
  },

  /**
   * Evaluate whether recovering unsold stock by travelling to a secondary market is viable
   */
  evaluateUnsoldStockRecovery({
    unsoldQuantity,
    costPerUnit,
    nextMarketExpectedPrice,
    nextMarketTravelCost,
    nextMarketStallFee = 30
  }) {
    const qty = Number(unsoldQuantity) || 0;
    const unitCost = Number(costPerUnit) || 0;
    const price = Number(nextMarketExpectedPrice) || 0;
    const travel = Number(nextMarketTravelCost) || 0;
    const stall = Number(nextMarketStallFee) || 0;

    if (qty <= 0) {
      return {
        isViable: false,
        advice: 'शिल्लक माल नाही. (No unsold inventory to recover).'
      };
    }

    // Incremental costs to visit next market
    const additionalTripCost = travel + stall;
    // Expected recovery at 80% sell-through
    const recoveryRevenue = Math.round(qty * 0.8 * price);
    const originalInventoryValue = qty * unitCost;
    const incrementalNetReturn = recoveryRevenue - additionalTripCost;

    const isViable = incrementalNetReturn > 0;

    return {
      isViable,
      unsoldQuantity: qty,
      originalInventoryValue,
      additionalTripCost,
      expectedRecoveryRevenue: recoveryRevenue,
      incrementalNetReturn,
      advice: isViable
        ? `दुसऱ्या बाजारात जाऊन विक्री करणे फायदेशीर आहे. अंदाजे निव्वळ वसुली ₹${incrementalNetReturn} होईल.`
        : `प्रवास खर्च (₹${additionalTripCost}) शिल्लक मालाच्या किमतीपेक्षा जास्त आहे. स्थानिक पातळीवरच माल काढणे श्रेयस्कर.`,
      adviceEn: isViable
        ? `Visiting the next market is profitable. Estimated net recovery is ₹${incrementalNetReturn}.`
        : `Travel cost (₹${additionalTripCost}) exceeds remaining stock value. Prefer local clearance.`
    };
  }
};
