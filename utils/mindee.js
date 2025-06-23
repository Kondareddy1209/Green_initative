// utils/mindee.js
const mindee = require("mindee");
const client = new mindee.Client({ apiKey: process.env.MINDEE_API_KEY });

async function parseEnergyBill(filePath) {
  const input = client.docFromPath(filePath);
  const resp = await client.enqueueAndParse(
    mindee.product.fr.EnergyBillV1,
    input
  );
  const doc = resp.document.inference.prediction;
  return {
    invoiceDate: doc.invoiceDate?.value,
    dueDate: doc.dueDate?.value,
    totalBeforeTaxes: doc.totalBeforeTaxes?.value,
    totalTaxes: doc.totalTaxes?.value,
    totalAmount: doc.totalAmount?.value,
    energyUsage: doc.energyUsage?.map(u => ({
      consumption: u.value.consumption,
      unitPrice: u.value.unitPrice,
    })) || []
  };
}

module.exports = { parseEnergyBill };
