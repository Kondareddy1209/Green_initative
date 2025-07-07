// utils/ocrParser.js

const Tesseract = require('tesseract.js');
const fs = require('fs');

function cleanText(text) {
  return text
    .replace(/[\n\r]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[^\x00-\x7F\s₹]/g, '') // Keep alphanumeric, whitespace, and Indian Rupee symbol
    .trim();
}

function extractValue(text, patterns) {
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].replace(/[₹$,\s]/g, '').trim(); // Remove spaces within captured value
    }
  }
  return null;
}

function extractDate(text) {
  const datePatterns = [
    /(?:BILL\s*DATE|INVOICE\s*DATE|DATE)[:\s]*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i, // DD/MM/YYYY or DD.MM.YYYY
    /(\d{1,2}\s*[A-Za-z]{3,}\s*\d{2,4})/i // e.g., 01 Jan 2025
  ];
  for (const regex of datePatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      // Attempt to standardize date format to DD/MM/YYYY
      let dateStr = match[1].trim();
      if (/[A-Za-z]{3,}/.test(dateStr)) { // Contains month name (e.g., 01 Jul 2025)
        const parts = dateStr.split(/\s+/);
        if (parts.length >= 3) {
          const day = parts[0];
          const monthName = parts[1];
          const year = parts[2];
          const monthMap = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };
          const monthNum = monthMap[monthName.toLowerCase()];
          if (monthNum) return `${day}/${monthNum}/${year}`;
        }
      }
      return dateStr;
    }
  }
  return null;
}

function getSavingsTip(units) {
  if (units > 300) return '⚠️ High usage! Consider reducing heavy-load appliances or going solar.';
  if (units > 200) return 'Shift high-energy tasks to off-peak hours for cost savings.';
  if (units > 100) return 'Your usage is moderate. Energy-efficient appliances can help.';
  return '✅ Great job! Your energy usage is efficient.';
}

function parseBillText(rawText) {
  const text = cleanText(rawText);
  console.log("DEBUG: Cleaned OCR Text for parsing:\n", text.substring(0, Math.min(text.length, 1000)) + "...");

  // --- Bill ID Patterns (Prioritizing APSPDCL specific terms from your bill) ---
  const billIdPatterns = [
    // APSPDCL "SERVICE NUMBER", "CONSUMER NUMBER", "CA NO"
    /SERVICE\s*NUMBER\s*([0-9]{10,})/i,
    /CONSUMER\s*NUMBER\s*([0-9]{10,})/i,
    /CA\s*NO[:\s]*([0-9]{10,})/i, // APSPDCL style
    /BILL\s*ID[:\s]*([A-Z0-9]{8,})/i, // Specific Bill ID format (e.g., A1B2C3D4...)
    /(?:Service\s*No|Account\s*ID)[:\s]*([A-Za-z0-9\s-]+)/i, // Generic terms for service/account number
  ];
  const extractedBillId = extractValue(text, billIdPatterns);
  console.log("DEBUG: Extracted Bill ID:", extractedBillId);

  // --- Total Amount Patterns (Prioritizing "CURRENT DEMAND PAYABLE" from your bill) ---
  const totalPatterns = [
    /CURRENT\s*DEMAND\s*PAYABLE[:\s]*₹?\s*([\d,.]+)/i, // Most specific from your bill
    /Total\s*Amount\s*(?:Due)?[:\s]*₹?\s*([\d,.]+)/i,
    /Net\s*Payable[:\s]*₹?\s*([\d,.]+)/i,
    /Amount\s*Payable[:\s]*₹?\s*([\d,.]+)/i,
    /Total\s*Payable\s*Rs\.?\s*([\d,.]+)/i,
    /Grand\s*Total[:\s]*₹?\s*([\d,.]+)/i,
    /Bill\s*Amount[:\s]*₹?\s*([\d,.]+)/i, // Broader match
    /Bill\s*TSB[:\s]*₹?\s*([\d,.]+)/i,
  ];
  const totalAmount = extractValue(text, totalPatterns);
  console.log("DEBUG: Extracted Total Amount:", totalAmount);

  // --- Unit Consumption Patterns (Prioritizing "NET UNITS CONSUMED" from your bill) ---
  const unitPatterns = [
    /NET\s*UNITS\s*CONSUMED[:\s]*([\d,.]+)/i, // Most specific from your bill
    /(?:consumption|units\s*consumed|monthly\s*units|energy\s*used)[:\s]*([\d,.]+)\s*(?:kwh)?/i,
    /Total\s*Units[:\s]*([\d,.]+)/i,
    /Usage[:\s]*([\d,.]+)\s*kWh/i,
    /units[:\s]*([\d,.]+)/i,
    /Current\s*Reading\s*-\s*Previous\s*Reading\s*=\s*([\d,.]+)\s*Units/i
  ];
  const units = extractValue(text, unitPatterns);
  console.log("DEBUG: Extracted Units:", units);

  // --- Date Patterns ---
  const date = extractDate(text); // Re-uses the improved extractDate function
  console.log("DEBUG: Extracted Date:", date);


  if (!totalAmount || isNaN(parseFloat(totalAmount))) console.warn("⚠️ Total amount not matched or invalid in OCR text");
  if (!units || isNaN(parseFloat(units))) console.warn("⚠️ Energy usage not matched or invalid in OCR text");
  if (!extractedBillId) console.warn("⚠️ Bill ID not matched in OCR text");

  const totalConsumption = parseFloat(units || 0);
  const carbonKg = +(totalConsumption * 0.82).toFixed(1);
  const savingsTip = getSavingsTip(totalConsumption);

  return {
    billId: extractedBillId,
    invoiceDate: date,
    totalAmount: parseFloat(totalAmount || 0),
    energyUsage: [{ consumption: totalConsumption }],
    carbonKg,
    savingsTip
  };
}

// 📷 OCR function (no changes)
async function extractTextFromImage(filePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng+hin+tam+tel+kan+mal', { // Multi-language for Indian context
      logger: m => console.log("🔍 OCR status:", m.status)
    });
    console.log("✅ OCR Extracted Raw Text:\n", text.substring(0, Math.min(text.length, 1000)) + "..."); // Log first 1000 chars of raw text
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