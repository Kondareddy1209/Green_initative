// 🔧 Updated ocrParser.js
const Tesseract = require('tesseract.js');
const fs = require('fs');

// Extract text from image
async function extractTextFromImage(filePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng+hin+tam+tel+kan+mal', {
      logger: m => console.log("🔍 OCR status:", m.status)
    });
    console.log("✅ OCR Extracted Text:\n", text);
    return text;
  } catch (err) {
    console.error('❌ OCR failed:', err);
    return '';
  }
}

// Extract number from text using regex
function extractNumber(text, regex) {
  const match = text.match(regex);
  return match ? match[1].replace(/[,₹]/g, '') : null;
}

// Extract date in various formats
function extractDate(text) {
  const match = text.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
  return match ? match[1] : null;
}

// Generate savings tip based on usage
function getSavingsTip(units) {
  if (units > 300) return '⚠️ High usage! Consider reducing heavy-load appliances or going solar.';
  if (units > 200) return 'Shift high-energy tasks to off-peak hours for cost savings.';
  if (units > 100) return 'Your usage is moderate. Energy-efficient appliances can help.';
  return '✅ Great job! Your energy usage is efficient.';
}

// Parse extracted OCR text into structured data
function parseBillText(text) {
  // Match total amount using a broader pattern
  const totalAmount = extractNumber(text, /(?:net bill|bill\s*amount|total\s*due|net\s*payable|amount\s*payable|bill\s*aft\s*sub|total\s*amount)[^\d₹]*₹?\s*([\d,.]+)/i);

  // Match energy usage in kWh/units
  const units = extractNumber(text, /(?:units\s*consumed|monthly\s*units|consumption|energy\s*charges|kwh\s*used|units|energy\s*org)[^\d]*([\d,.]+)/i);

  const date = extractDate(text);

  // Logs to debug pattern match
  if (!totalAmount) console.warn("⚠️ Total amount not matched in OCR text");
  if (!units) console.warn("⚠️ Energy usage not matched in OCR text");

  const totalConsumption = parseFloat(units || 0);
  const carbonKg = +(totalConsumption * 0.82).toFixed(1);
  const savingsTip = getSavingsTip(totalConsumption);

  return {
    invoiceDate: date,
    totalAmount: parseFloat(totalAmount || 0),
    energyUsage: [{ consumption: totalConsumption }],
    carbonKg,
    savingsTip
  };
}

module.exports = {
  extractTextFromImage,
  parseBillText
};
