// utils/mindee.js
const mindee = require('mindee');
const client = new mindee.Client({ apiKey: process.env.MINDEE_API_KEY });

async function parseEnergyBill(filePath) {
  try {
    const result = await client.enqueueAndParse(
      mindee.product.fr.EnergyBillV1,
      client.docFromPath(filePath)
    );

    const doc = result.document.inference.prediction;

    // Safe mapping and filtering of energyUsage
    const energyUsage = (doc.energyUsage || [])
      .map(u => u?.value)
      .filter(v => v && typeof v.consumption === 'number')
      .map(v => ({
        consumption: v.consumption,
        unitPrice: v.unitPrice ?? null
      }));

    return {
      invoiceDate: doc.invoiceDate?.value ?? null,
      dueDate: doc.dueDate?.value ?? null,
      totalBeforeTaxes: doc.totalBeforeTaxes?.value ?? 0,
      totalTaxes: doc.totalTaxes?.value ?? 0,
      totalAmount: doc.totalAmount?.value ?? 0,
      energyUsage
    };

  } catch (err) {
    console.error("❌ Mindee parse error:", err);
    return {
      invoiceDate: null,
      dueDate: null,
      totalBeforeTaxes: 0,
      totalTaxes: 0,
      totalAmount: 0,
      energyUsage: []
    };
  }
}

module.exports = { parseEnergyBill };
