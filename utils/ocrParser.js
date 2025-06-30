const Tesseract = require('tesseract.js');
const fs = require('fs');

// 🔍 Clean up OCR text (remove extra whitespace and normalize)
function cleanText(text) {
  return text
    .replace(/[\n\r]+/g, ' ')     // flatten newlines
    .replace(/\s{2,}/g, ' ')       // remove extra spaces
    .replace(/[^\x00-\x7F]/g, '')  // remove non-ASCII chars if needed
    .trim();
}

// ✅ Extract number with flexible pattern and fallback
function extractNumber(text, patterns) {
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) {
      return match[1].replace(/[₹,]/g, '').trim();
    }
  }
  return null;
}

// ✅ Extract dates in various formats
function extractDate(text) {
  const match = text.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
  return match ? match[1] : null;
}

// ⚡ Dynamic savings tip
function getSavingsTip(units) {
  if (units > 300) return '⚠️ High usage! Consider reducing heavy-load appliances or going solar.';
  if (units > 200) return 'Shift high-energy tasks to off-peak hours for cost savings.';
  if (units > 100) return 'Your usage is moderate. Energy-efficient appliances can help.';
  return '✅ Great job! Your energy usage is efficient.';
}

// 🧠 Text parsing logic
function parseBillText(rawText) {
  const text = cleanText(rawText);

  const totalPatterns = [
    /current\s*demand\s*payable[:\s]*₹?\s*([\d,.]+)/i,
    /total\s*amount[:\s]*₹?\s*([\d,.]+)/i,
    /bill\s*amount[:\s]*₹?\s*([\d,.]+)/i,
    /net\s*payable[:\s]*₹?\s*([\d,.]+)/i,
    /amount\s*payable[:\s]*₹?\s*([\d,.]+)/i,
    /bill\s*tsb[:\s]*₹?\s*([\d,.]+)/i,
    /bill[:\s]*₹?\s*([\d,.]+)/i,
    /sub\s*total.*₹?\s*([\d,.]+)/i
  ];

  const unitPatterns = [
    /(?:consumption|units\s*consumed|monthly\s*units|energy\s*used)[^\d]*([\d,.]+)/i,
    /(?:energy\s*charges)[^\d]*([\d,.]+)/i,
    /units:\s*\[?([\d,.]+)/i
  ];

  const totalAmount = extractNumber(text, totalPatterns);
  const units = extractNumber(text, unitPatterns);
  const date = extractDate(text);

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

// 📷 OCR function
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

module.exports = {
  extractTextFromImage,
  parseBillText
};
