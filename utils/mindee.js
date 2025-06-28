const mindee = require('mindee');
const client = new mindee.Client({ apiKey: process.env.MINDEE_API_KEY });

async function parseEnergyBill(filePath) {
  const doc = await client
    .enqueueAndParse(mindee.product.fr.EnergyBillV1, client.docFromPath(filePath))
    .then(r => r.document.inference.prediction);

  return {
    invoiceDate: doc.invoiceDate?.value,
    dueDate: doc.dueDate?.value,
    totalBeforeTaxes: doc.totalBeforeTaxes?.value,
    totalTaxes: doc.totalTaxes?.value,
    totalAmount: doc.totalAmount?.value,
    energyUsage: doc.energyUsage?.map(u => ({
      consumption: u.value.consumption,
      unitPrice: u.value.unitPrice
    })) || []
  };
}

module.exports = { parseEnergyBill };
