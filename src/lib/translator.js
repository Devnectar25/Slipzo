// translator.js - Database to UI Real-Time Translation Engine
// Bridges database content to the UI in the selected app language (English, Marathi, Hindi)

import { useState, useEffect } from "react";
import i18n from "../i18n/i18n";
import { toDevanagariNumerals, formatNumberByLang } from "./utils";

// Local storage key for cached dynamic translations
const CACHE_KEY = "slipzo_db_translations_v1";

// In-memory cache loaded from localStorage
let memoryCache = {};
try {
  const saved = localStorage.getItem(CACHE_KEY);
  if (saved) {
    memoryCache = JSON.parse(saved);
  }
} catch (_) {
  memoryCache = {};
}

// Save memory cache to localStorage (debounced)
let saveTimer = null;
const persistCache = () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
    } catch (_) {}
  }, 1000);
};

// Event listeners to notify active components when a new translation resolves
const listeners = new Set();
const notifyListeners = () => {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (_) {}
  });
};

// Pending translation requests to prevent duplicate network calls
const pendingRequests = new Set();

/**
 * Curated offline-first high-speed translation dictionary
 */
export const DICTIONARY = {
  // Food & Menu Master Catalog (all items from database)
  "Masala Chai": { mr: "मसाला चहा", hi: "मसाला चाय" },
  "Filter Coffee": { mr: "फिल्टर कॉफी", hi: "फ़िल्टर कॉफ़ी" },
  "Cold Coffee": { mr: "कोल्ड कॉफी", hi: "कोल्ड कॉफी" },
  "Cappuccino": { mr: "कॅप्युचिनो", hi: "कैपुचीनो" },
  "Espresso": { mr: "एस्प्रेसो", hi: "एस्प्रेसो" },
  "Mango Lassi": { mr: "मँगो लस्सी", hi: "मैंगो लस्सी" },
  "Sweet Lassi": { mr: "गोड लस्सी", hi: "मीठी लस्सी" },
  "Fresh Lime Soda": { mr: "फ्रेश लाईम सोडा", hi: "ताज़ा नींबू सोडा" },
  "Green Tea": { mr: "ग्रीन टी", hi: "ग्रीन टी" },
  "Badam Milk": { mr: "बदाम दूध", hi: "बादाम दूध" },
  "Veg Burger": { mr: "व्हेज बर्गर", hi: "वेज बर्गर" },
  "Cheese Burger": { mr: "चीज बर्गर", hi: "चीज बर्गर" },
  "Margherita Pizza": { mr: "मार्गेरिटा पिझ्झा", hi: "मार्गेरिटा पिज़्ज़ा" },
  "Veg Farmhouse Pizza": { mr: "व्हेज फार्महाऊस पिझ्झा", hi: "वेज फार्महाउस पिज़्ज़ा" },
  "French Fries": { mr: "फ्रेंच फ्राईज", hi: "फ्रेंच फ्राइज" },
  "Peri Peri Fries": { mr: "पेरी पेरी फ्राईज", hi: "पेरी पेरी फ्राइज" },
  "Samosa (2 pcs)": { mr: "समोसा (२ नग)", hi: "समोसा (२ पीस)" },
  "Samosa": { mr: "समोसा", hi: "समोसा" },
  "Vada Pav": { mr: "वडा पाव", hi: "वड़ा पाव" },
  "Veg Grilled Sandwich": { mr: "व्हेज ग्रिल्ड सँडविच", hi: "वेज ग्रिल्ड सैंडविच" },
  "Cheese Corn Sandwich": { mr: "चीज कॉर्न सँडविच", hi: "चीज कॉर्न सैंडविच" },
  "Masala Dosa": { mr: "मसाला डोसा", hi: "मसाला डोसा" },
  "Plain Dosa": { mr: "साधा डोसा", hi: "सादा डोसा" },
  "Onion Rava Dosa": { mr: "कांदा रवा डोसा", hi: "प्याज रवा डोसा" },
  "Idli Sambar (2 pcs)": { mr: "इडली सांबार (२ नग)", hi: "इडली सांभर (२ पीस)" },
  "Idli Sambar": { mr: "इडली सांबार", hi: "इडली सांभर" },
  "Medu Vada (2 pcs)": { mr: "मेदू वडा (२ नग)", hi: "मेदू वड़ा (२ पीस)" },
  "Medu Vada": { mr: "मेदू वडा", hi: "मेदू वड़ा" },
  "Onion Uttapam": { mr: "कांदा उत्तपम", hi: "प्याज उत्तपम" },
  "Poha": { mr: "पोहे", hi: "पोहा" },
  "Upma": { mr: "उपमा", hi: "उपमा" },
  "Chole Bhature (2 pcs)": { mr: "छोले भटुरे (२ नग)", hi: "छोले भटूरे (२ पीस)" },
  "Chole Bhature": { mr: "छोले भटुरे", hi: "छोले भटूरे" },
  "Aloo Paratha with Curd": { mr: "आलू पराठा आणि दही", hi: "आलू पराठा और दही" },
  "Aloo Paratha": { mr: "आलू पराठा", hi: "आलू पराठा" },
  "Paneer Butter Masala": { mr: "पनीर बटर मसाला", hi: "पनीर बटर मसाला" },
  "Shahi Paneer": { mr: "शाही पनीर", hi: "शाही पनीर" },
  "Dal Makhani": { mr: "दाल मखनी", hi: "दाल मखनी" },
  "Dal Tadka": { mr: "दाल तडका", hi: "दाल तड़का" },
  "Veg Biryani": { mr: "व्हेज बिर्याणी", hi: "वेज बिरयानी" },
  "Jeera Rice": { mr: "जिरा राईस", hi: "जीरा राइस" },
  "Butter Naan": { mr: "बटर नान", hi: "बटर नान" },
  "Garlic Naan": { mr: "लसूण नान", hi: "लहसुन नान" },
  "Veg Hakka Noodles": { mr: "व्हेज हक्का नूडल्स", hi: "वेज हक्का नूडल्स" },
  "Veg Fried Rice": { mr: "व्हेज फ्राईड राईस", hi: "वेज फ्राइड राइस" },
  "Gulab Jamun (2 pcs)": { mr: "गुलाब जामुन (२ नग)", hi: "गुलाब जामुन (२ पीस)" },
  "Gulab Jamun": { mr: "गुलाब जामुन", hi: "गुलाब जामुन" },
  "Rasgulla (2 pcs)": { mr: "रसगुल्ला (२ नग)", hi: "रसगुल्ला (२ पीस)" },
  "Rasgulla": { mr: "रसगुल्ला", hi: "रसगुल्ला" },
  "Chocolate Brownie": { mr: "चॉकलेट ब्राउनी", hi: "चॉकलेट ब्राउनी" },
  "Sizzling Brownie with Ice Cream": { mr: "आईस्क्रीमसह सिझलिंग ब्राउनी", hi: "आइसक्रीम के साथ सिज़लिंग ब्राउनी" },
  "Sizzling Brownie": { mr: "सिझलिंग ब्राउनी", hi: "सिज़लिंग ब्राउनी" },
  "Vanilla Ice Cream Scoop": { mr: "व्हॅनिला आईस्क्रीम स्कूप", hi: "वैनिला आइसक्रीम स्कूप" },
  "Vanilla Ice Cream": { mr: "व्हॅनिला आईस्क्रीम", hi: "वैनिला आइसक्रीम" },
  "Chocolate Ice Cream Scoop": { mr: "चॉकलेट आईस्क्रीम स्कूप", hi: "चॉकलेट आइसक्रीम स्कूप" },
  "Chocolate Ice Cream": { mr: "चॉकलेट आईस्क्रीम", hi: "चॉकलेट आइसक्रीम" },
  "Matka Kulfi": { mr: "मटका कुल्फी", hi: "मटका कुल्फी" },
  "Butter Croissant": { mr: "बटर क्रोइसंट", hi: "बटर क्रोइसैंट" },
  "Choco Lava Cake": { mr: "चॉको लावा केक", hi: "चोको लावा केक" },
  "Kaju Katli (100g)": { mr: "काजू कतली (१०० ग्रॅम)", hi: "काजू कतली (१०० ग्राम)" },
  "Kaju Katli": { mr: "काजू कतली", hi: "काजू कतली" },
  "Mineral Water": { mr: "मिनरल वॉटर", hi: "मिनरल वाटर" },
  "Basmati Rice 1kg": { mr: "बासमती तांदूळ १ किलो", hi: "बासमती चावल १ किलो" },
  "Refined Sunflower Oil 1L": { mr: "रिफाइंड सूर्यफूल तेल १ लिटर", hi: "रिफाइंड सूरजमुखी तेल १ लीटर" },
  "Sunflower Oil 1L": { mr: "सूर्यफूल तेल १ लिटर", hi: "सूरजमुखी तेल १ लीटर" },
  "Assam Tea 250g": { mr: "आसाम चहा २५० ग्रॅम", hi: "असम चाय २५० ग्राम" },
  "Espresso Single Shot": { mr: "एस्प्रेसो सिंगल शॉट", hi: "एस्प्रेसो सिंगल शॉट" },
  "Espresso Shot": { mr: "एस्प्रेसो शॉट", hi: "एस्प्रेसो शॉट" },
  "Sample Item 1": { mr: "नमुना वस्तू १", hi: "नमूना आइटम १" },
  "Sample Item 2": { mr: "नमुना वस्तू २", hi: "नमूना आइटम २" },
  "Pure Linen Shirt (x1)": { mr: "प्युअर लिनन शर्ट (१ नग)", hi: "प्योर लिनन शर्ट (१ पीस)" },
  "Pure Linen Shirt": { mr: "प्युअर लिनन शर्ट", hi: "प्योर लिनन शर्ट" },
  "Classic Denim Jeans": { mr: "क्लासिक डेनिम जीन्स", hi: "क्लासिक डेनिम जींस" },
  "Cotton Polo T-Shirt": { mr: "कॉटन पोलो टी-शर्ट", hi: "कॉटन पोलो टी-शर्ट" },
  "Organic Honey 500g": { mr: "सेंद्रिय मध ५०० ग्रॅम", hi: "ऑर्गेनिक शहद ५०० ग्राम" },
  "Brown Rice 1kg": { mr: "तपकिरी तांदूळ १ किलो", hi: "ब्राउन राइस १ किलो" },
  "A2 Gir Cow Ghee 500ml": { mr: "ए२ गीर गाय तूप ५०० मिली", hi: "ए२ गिर गाय घी ५०० मिली" },
  "Artisan Scented Candle": { mr: "सुगंधी मेणबत्ती", hi: "सुगंधित मोमबत्ती" },
  "Ceramic Coffee Mug": { mr: "सिरेमिक कॉफी मग", hi: "सिरेमिक कॉफी मग" },
  "Handcrafted Notebook": { mr: "हस्तनिर्मित वही", hi: "हस्तनिर्मित नोटबुक" },
  "Executive Leather Bag": { mr: "एक्झिक्युटिव्ह लेदर बॅग", hi: "एक्जीक्यूटिव लेदर बैग" },
  "Wireless Noise-Canceling Earbuds": { mr: "वायरलेस इयरबड्स", hi: "वायरलेस ईयरबड्स" },
  "Smart Fitness Tracker": { mr: "स्मार्ट फिटनेस ट्रॅकर", hi: "स्मार्ट फिटनेस ट्रैकर" },

  // Receipt Addresses & Footers
  "hinjewadi,pune": { mr: "हिंजवडी, पुणे", hi: "हिंजेवाड़ी, पुणे" },
  "hinjewadi": { mr: "हिंजवडी", hi: "हिंजेवाड़ी" },
  "pune": { mr: "पुणे", hi: "पुणे" },
  "Thank you for shopping with us! Please come again.": {
    mr: "आमच्याकडे खरेदी केल्याबद्दल धन्यवाद! पुन्हा भेट द्या.",
    hi: "हमारे साथ खरीदारी करने के लिए धन्यवाद! कृपया फिर पधारें।"
  },
  "Thank you for visiting! Please come again.": {
    mr: "भेट दिल्याबद्दल धन्यवाद! पुन्हा या.",
    hi: "पधारने के लिए धन्यवाद! कृपया फिर आएं।"
  },
  "Thank you for shopping with us!": {
    mr: "आमच्याकडे खरेदी केल्याबद्दल धन्यवाद!",
    hi: "हमारे साथ खरीदारी करने के लिए धन्यवाद!"
  },
  "Thank you for shopping!": {
    mr: "खरेदी केल्याबद्दल धन्यवाद!",
    hi: "खरीदारी के लिए धन्यवाद!"
  },
  "Thank you! Please visit again.": {
    mr: "धन्यवाद! पुन्हा भेट द्या.",
    hi: "धन्यवाद! कृपया पुनः पधारें।"
  },
  "thank you for visiting": {
    mr: "भेट दिल्याबद्दल धन्यवाद",
    hi: "पधारने के लिए धन्यवाद"
  },
  "Invoice": { mr: "पावती", hi: "चालान / बिल" },
  "Payment Mode": { mr: "पेमेंट पद्धत", hi: "भुगतान का प्रकार" },
  "Cash": { mr: "रोख (Cash)", hi: "नकद" },
  "UPI": { mr: "यूपीआय", hi: "यूपीआई" },
  "Card": { mr: "कार्ड", hi: "कार्ड" },
  "Credit": { mr: "उधार", hi: "उधार" },
  "UPI / PhonePe": { mr: "यूपीआय / फोनपे", hi: "यूपीआई / फोनपे" },

  // Hardware & Store Products
  "printer roll": { mr: "प्रिंटर रोल", hi: "प्रिंटर रोल" },
  "Printer Roll": { mr: "प्रिंटर रोल", hi: "प्रिंटर रोल" },
  "80mm POS Thermal Paper Rolls (10 Rolls)": { mr: "८०मिमी पीओएस थर्मल पेपर रोल्स (१० रोल्स)", hi: "80मिमी पीओएस थर्मल पेपर रोल्स (10 रोल्स)" },
  "Bluetooth POS Receipt Printer (80mm)": { mr: "ब्ल्यूटूथ पीओएस पावती प्रिंटर (८०मिमी)", hi: "ब्लूटूथ पीओएस रसीद प्रिंटर (80मिमी)" },
  "Hansol SUPERMAX Thermal POS Paper Rolls (Pack of 10)": { mr: "हान्सोल सुपरमॅक्स थर्मल पीओएस पेपर रोल्स (१० चा पॅक)", hi: "हैनसोल सुपरमैक्स थर्मल पीओएस पेपर रोल्स (10 का पैक)" },
  "NIYAMA Portable Bluetooth POS Printer (58mm)": { mr: "नियामा पोर्टेबल ब्ल्यूटूथ पीओएस प्रिंटर (५८मिमी)", hi: "नियामा पोर्टेबल ब्लूटूथ पीओएस प्रिंटर (58मिमी)" },
  "ATPOS premium smooth thermal paper rolls, jam-free dark printing for POS terminals": {
    mr: "एटीपीओएस प्रीमियम गुळगुळीत थर्मल पेपर रोल्स, पीओएस टर्मिनल्ससाठी जाम-मुक्त डार्क प्रिंटिंग",
    hi: "एटीपीओएस प्रीमियम चिकने थर्मल पेपर रोल, पीओएस टर्मिनल्स के लिए जाम-मुक्त डार्क प्रिंटिंग"
  },
  "Portable 58mm wireless thermal printer for Android & iOS with rechargeable battery": {
    mr: "रिचार्ज करण्यायोग्य बॅटरीसह अँड्रॉइड आणि आयओएससाठी पोर्टेबल ५८मिमी वायरलेस थर्मल प्रिंटर",
    hi: "रिचार्जेबल बैटरी के साथ एंड्रॉइड और आईओएस के लिए पोर्टेबल 58मिमी वायरलेस थर्मल प्रिंटर"
  },
  "Portable 80mm wireless thermal printer for Android & iOS with rechargeable battery": {
    mr: "रिचार्ज करण्यायोग्य बॅटरीसह अँड्रॉइड आणि आयओएससाठी पोर्टेबल ८०मिमी वायरलेस थर्मल प्रिंटर",
    hi: "रिचार्जेबल बैटरी के साथ एंड्रॉइड और आईओएस के लिए पोर्टेबल 80मिमी वायरलेस थर्मल प्रिंटर"
  },
  "Premium grade Hansol SUPERMAX smooth, jam-free thermal receipt rolls for clear dark printing": {
    mr: "स्पष्ट गडद प्रिंटिंगसाठी प्रीमियम दर्जाचे हान्सोल सुपरमॅक्स गुळगुळीत, जाम-मुक्त थर्मल पावती रोल्स",
    hi: "स्पष्ट डार्क प्रिंटिंग के लिए प्रीमियम ग्रेड हैनसोल सुपरमैक्स चिकने, जाम-मुक्त थर्मल रसीद रोल्स"
  },
  "Rechargeable 58mm Bluetooth handheld mobile thermal printer with battery indicator and high-speed print engine": {
    mr: "बॅटरी इंडिकेटर आणि हाय-स्पीड प्रिंट इंजिनसह रिचार्ज करण्यायोग्य ५८मिमी ब्ल्यूटूथ हँडहेल्ड मोबाइल थर्मल प्रिंटर",
    hi: "बैटरी इंडिकेटर और उच्च गति प्रिंट इंजन के साथ रिचार्जेबल 58मिमी ब्लूटूथ हैंडहेल्ड मोबाइल थर्मल प्रिंटर"
  },
  "Rechargeable 58mm Bluetooth handheld mobile thermal printer with battery indicator and high-speed receipt printing": {
    mr: "बॅटरी इंडिकेटर आणि हाय-स्पीड पावती प्रिंटिंगसह रिचार्ज करण्यायोग्य ५८मिमी ब्ल्यूटूथ हँडहेल्ड मोबाइल थर्मल प्रिंटर",
    hi: "बैटरी इंडिकेटर और उच्च गति रसीद प्रिंटिंग के साथ रिचार्जेबल 58मिमी ब्लूटूथ हैंडहेल्ड मोबाइल थर्मल प्रिंटर"
  },

  // Templates
  "Classic Receipt": { mr: "क्लासिक पावती", hi: "क्लासिक रसीद" },
  "Minimal Clean Bill": { mr: "मिनिमल क्लीन बिल", hi: "मिनिमल क्लीन बिल" },
  "Shop Pro": { mr: "शॉप प्रो", hi: "शॉप प्रो" },
  "Eco Print": { mr: "इको प्रिंट", hi: "इको प्रिंट" },
  "Modern Shop": { mr: "मॉडर्न शॉप", hi: "मॉडर्न शॉप" },
  "Business Elite": { mr: "बिझनेस एलिट", hi: "बिजनेस एलीट" },

  // Template Badges
  "Standard": { mr: "मानक", hi: "मानक" },
  "Most Popular": { mr: "सर्वात लोकप्रिय", hi: "सर्वाधिक लोकप्रिय" },
  "Retail Choice": { mr: "किरकोळ पसंती", hi: "रिटेल पसंद" },
  "Paper Saver": { mr: "कागद बचत", hi: "पेपर सेवर" },
  "Trendy": { mr: "ट्रेंडी", hi: "ट्रेंडी" },
  "Premium": { mr: "प्रीमियम", hi: "प्रीमियम" },
  "Default": { mr: "डीफॉल्ट", hi: "डिफ़ॉल्ट" },
  "Custom": { mr: "सानुकूल", hi: "कस्टम" },

  // Template Features
  "Shop logo header": { mr: "दुकान लोगो हेडर", hi: "दुकान लोगो हेडर" },
  "Itemized list with quantity": { mr: "नगांसह तपशीलवार यादी", hi: "मात्रा सहित आइटम सूची" },
  "Itemized table (Qty, Rate, Total)": { mr: "तपशीलवार तक्ता (नग, दर, एकूण)", hi: "आइटमवार तालिका (मात्रा, दर, कुल)" },
  "Tax / GST calculation": { mr: "कर / जीएसटी गणना", hi: "टैक्स / जीएसटी गणना" },
  "Payment mode badge": { mr: "पेमेंट पद्धत बॅज", hi: "भुगतान मोड बैज" },
  "Payment mode & barcode": { mr: "पेमेंट पद्धत आणि बारकोड", hi: "भुगतान मोड और बारकोड" },
  "Shop header & GSTIN": { mr: "दुकान हेडर आणि जीएसटी क्रमांक", hi: "दुकान हेडर और जीएसटी नंबर" },
  "Compact receipt layout": { mr: "कॉम्पॅक्ट पावती लेआउट", hi: "कॉम्पैक्ट रसीद लेआउट" },
  "Large legible totals": { mr: "मोठी वाचनीय एकूण रक्कम", hi: "बड़े पठनीय कुल योग" },
  "Zero-waste spacing": { mr: "शून्य-कचरा अंतर", hi: "जीरो-वेस्ट स्पेसिंग" },
  "Thermal optimized": { mr: "थर्मल ऑप्टिमाइझ्ड", hi: "थर्मल अनुकूलित" },
  "Retail store header": { mr: "रिटेल स्टोअर हेडर", hi: "रिटेल स्टोर हेडर" },
  "Itemized table with quantity": { mr: "नगांसह तपशीलवार तक्ता", hi: "मात्रा सहित आइटमवार तालिका" },
  "Editable footer note": { mr: "संपादित करण्यायोग्य पादलेख टीप", hi: "संपादन योग्य फ़ूटर नोट" },
  "Brand accent header": { mr: "ब्रँड अ‍ॅक्सेंट हेडर", hi: "ब्रांड एक्सेंट हेडर" },
  "Discount highlight tags": { mr: "सवलत हायलाइट टॅग", hi: "छूट हाइलाइट टैग" },
  "Loyalty rewards counter": { mr: "लॉयल्टी रिवॉर्ड्स काउंटर", hi: "लॉयल्टी रिवार्ड्स काउंटर" },
  "Dynamic UPI QR code": { mr: "डायनॅमिक यूपीआय क्यूआर कोड", hi: "डायनामिक यूपीआई क्यूआर कोड" },
  "Fast thermal printing": { mr: "जलद थर्मल प्रिंटिंग", hi: "तेज थर्मल प्रिंटिंग" },
  "Monospace font alignment": { mr: "मोनोस्पेस फॉन्ट अलाइनमेंट", hi: "मोनोस्पेस फ़ॉन्ट संरेखण" },
  "High-density item lines": { mr: "हाय-डेन्सिटी वस्तू ओळी", hi: "उच्च घनता आइटम पंक्तियाँ" },
  "Less paper usage": { mr: "कमी कागद वापर", hi: "कम कागज़ का उपयोग" },
  "Modern typography": { mr: "आधुनिक टायपोग्राफी", hi: "आधुनिक टाइपोग्राफी" },
  "Category pill badges": { mr: "श्रेणी पिल बॅज", hi: "श्रेणी पिल बैज" },
  "Social media footer": { mr: "सोशल मीडिया फुटर", hi: "सोशल मीडिया फूटर" },
  "Clean spacing": { mr: "स्वच्छ स्पेसिंग", hi: "स्वच्छ स्पेसिंग" },
  "HSN / SAC Code column": { mr: "एचएसएन / सॅक कोड कॉलम", hi: "एचएसएन / सैक कोड कॉलम" },
  "Split CGST & SGST": { mr: "विभक्त सीजीएसटी आणि एसजीएसटी", hi: "विभाजित सीजीएसटी और एसजीएसटी" },
  "Authorized signatory box": { mr: "अधिकृत स्वाक्षरी बॉक्स", hi: "अधिकृत हस्ताक्षर बॉक्स" },
  "Terms & conditions": { mr: "अटी व शर्ती", hi: "नियम एवं शर्तें" },

  // Template Descriptions
  "Clean and professional receipt template with itemized table, GST breakdown, and clear totals.": {
    mr: "तपशीलवार टेबल, जीएसटी ब्रेकडाउन आणि स्पष्ट एकूण रकमेसह स्वच्छ आणि व्यावसायिक पावती टेम्प्लेट.",
    hi: "आइटमयुक्त टेबल, जीएसटी विवरण और स्पष्ट कुल योग के साथ स्वच्छ और पेशेवर रसीद टेम्पलेट।"
  },
  "Streamlined layout engineered to reduce paper roll consumption while maintaining crystal clear readability.": {
    mr: "स्पष्ट वाचनक्षमता राखताना कागदी रोलचा वापर कमी करण्यासाठी डिझाइन केलेले लेआउट.",
    hi: "स्पष्ट पठनीयता बनाए रखते हुए पेपर रोल की खपत को कम करने के लिए डिज़ाइन किया गया लेआउट।"
  },
  "Professional high-volume retail POS receipt with clean column headers, item discounts, and net totals.": {
    mr: "स्वच्छ कॉलम शीर्षके, वस्तूंच्या सवलती आणि निव्वळ एकूण रकमेसह व्यावसायिक रिटेल पीओएस पावती.",
    hi: "स्वच्छ कॉलम हेडर, आइटम छूट और शुद्ध कुल के साथ पेशेवर रिटेल पीओएस रसीद।"
  },
  "Ultra-compact monospace thermal bill layout engineered specifically to maximize speed and minimize paper waste.": {
    mr: "कमाल गती आणि किमान कागद कचरा यासाठी तयार केलेले कॉम्पॅक्ट थर्मल बिल लेआउट.",
    hi: "अधिकतम गति और न्यूनतम कागज़ की बर्बादी के लिए विशेष रूप से डिज़ाइन किया गया कॉम्पैक्ट थर्मल बिल लेआउट।"
  },
  "Contemporary aesthetic for boutiques, cafes, and salons with pill badges, stylish spacing, and Instagram handles.": {
    mr: "बुटीक, कॅफे आणि सलूनसाठी आकर्षक बॅज आणि स्टायलिश स्पेसिंगसह आधुनिक सौंदर्य.",
    hi: "बुटीक, कैफे और सैलून के लिए आकर्षक बैज और स्टाइलिश स्पेसिंग के साथ आधुनिक सौंदर्य।"
  },
  "Formal tax invoice template designed for electronics, hardware, and B2B services requiring HSN, CGST/SGST breakdown.": {
    mr: "एचएसएन, सीजीएसटी/एसजीएसटी ब्रेकडाउन आवश्यक असणाऱ्या इलेक्ट्रॉनिक्स, हार्डवेअर आणि बी२बी सेवांसाठी अधिकृत कर बीजक टेम्प्लेट.",
    hi: "इलेक्ट्रॉनिक्स, हार्डवेयर और बी2बी सेवाओं के लिए औपचारिक टैक्स इनवॉइस टेम्पलेट जिसमें एचएसएन और सीजीएसटी/एसजीएसटी विवरण शामिल है।"
  },

  // Categories
  "All Categories": { mr: "सर्व श्रेणी", hi: "सभी श्रेणियां" },
  "all": { mr: "सर्व", hi: "सभी" },
  "All": { mr: "सर्व", hi: "सभी" },
  "Breakfast": { mr: "नाश्ता", hi: "नाश्ता" },
  "Beverages": { mr: "पेये", hi: "पेय पदार्थ" },
  "Bakery": { mr: "बेकरी", hi: "बेकरी" },
  "Main Course": { mr: "मुख्य जेवण", hi: "मेन कोर्स" },
  "Fast Food": { mr: "फास्ट फूड", hi: "फ़ास्ट फ़ूड" },
  "Snacks": { mr: "स्नॅक्स", hi: "स्नैक्स" },
  "Desserts": { mr: "मिठाई आणि डेझर्ट", hi: "मिठाई और डेसर्ट" },
  "South Indian": { mr: "दक्षिण भारतीय", hi: "दक्षिण भारतीय" },
  "General": { mr: "सामान्य", hi: "सामान्य" },
  "Hardware": { mr: "हार्डवेअर", hi: "हार्डवेयर" },
  "Stationery": { mr: "स्टेशनरी", hi: "स्टेशनरी" },
  "Electronics": { mr: "इलेक्ट्रॉनिक्स", hi: "इलेक्ट्रॉनिक्स" },
  "Bestsellers": { mr: "सर्वाधिक विकले जाणारे", hi: "बेस्टसेलर" },
  "bestsellers": { mr: "सर्वाधिक विकले जाणारे", hi: "बेस्टसेलर" },

  // Payment Modes
  "Cash": { mr: "रोख", hi: "नकद" },
  "cash": { mr: "रोख", hi: "नकद" },
  "UPI": { mr: "यूपीआय", hi: "यूपीआई" },
  "upi": { mr: "यूपीआय", hi: "यूपीआई" },
  "Card": { mr: "कार्ड", hi: "कार्ड" },
  "card": { mr: "कार्ड", hi: "कार्ड" },
  "Credit": { mr: "उधारी", hi: "उधार" },
  "credit": { mr: "उधारी", hi: "उधार" },
  "Online": { mr: "ऑनलाइन", hi: "ऑनलाइन" },
  "online": { mr: "ऑनलाइन", hi: "ऑनलाइन" },
  "Cash on Delivery": { mr: "कॅश ऑन डिलिव्हरी", hi: "कैश ऑन डिलीवरी" },
  "Cash on Delivery (COD)": { mr: "कॅश ऑन डिलिव्हरी (सीओडी)", hi: "कैश ऑन डिलीवरी (सीओडी)" }
};

/**
 * Fetch dynamic translation for unfamiliar text via public translation service
 */
async function fetchOnlineTranslation(text, lang) {
  const cacheKey = `${lang}_${text.trim().toLowerCase()}`;
  if (pendingRequests.has(cacheKey)) return;
  pendingRequests.add(cacheKey);

  try {
    const encoded = encodeURIComponent(text.trim());
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|${lang}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.responseData?.translatedText && !data.responseData.translatedText.includes("MYMEMORY WARNING")) {
        const cleanTranslation = data.responseData.translatedText.trim();
        memoryCache[cacheKey] = cleanTranslation;
        persistCache();
        notifyListeners();
      }
    }
  } catch (err) {
    // Fail gracefully without crashing
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

/**
 * Synchronously translate database text with instant dictionary + cached dynamic fallback
 * @param {string} text - Text from database
 * @param {string} targetLang - Target language ("mr", "hi", "en")
 * @returns {string} - Translated text
 */
export function translateDbText(text, targetLang) {
  if (!text || typeof text !== "string") return text;
  const lang = (targetLang || i18n.language || "en").toLowerCase();

  // If English, return original directly
  if (lang === "en" || lang.startsWith("en-")) {
    return text;
  }

  const trimmed = text.trim();
  if (!trimmed) return text;

  // 1. Direct dictionary lookup (exact match)
  if (DICTIONARY[trimmed] && DICTIONARY[trimmed][lang]) {
    return toDevanagariNumerals(DICTIONARY[trimmed][lang]);
  }

  // 2. Case-insensitive dictionary lookup
  const lowerKey = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(DICTIONARY)) {
    if (key.toLowerCase() === lowerKey && val[lang]) {
      return toDevanagariNumerals(val[lang]);
    }
  }

  // 3. Check memory/localStorage cache
  const cacheKey = `${lang}_${lowerKey}`;
  if (memoryCache[cacheKey]) {
    return toDevanagariNumerals(memoryCache[cacheKey]);
  }

  // 4. Trigger background fetch for dynamic / user-entered items not in dictionary
  if (typeof window !== "undefined" && window.fetch) {
    fetchOnlineTranslation(trimmed, lang);
  }

  // Return text with Devanagari numerals while asynchronous translation is fetched
  return toDevanagariNumerals(text);
}

/**
 * React hook that connects components to the database translation layer
 */
export function useDbTranslation() {
  const currentLang = (i18n.language || "en").toLowerCase();
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1);
    listeners.add(handleUpdate);
    return () => listeners.delete(handleUpdate);
  }, []);

  const tDb = (text) => translateDbText(text, currentLang);
  const formatNum = (val) => formatNumberByLang(val, currentLang);

  return {
    tDb,
    formatNum,
    lang: currentLang
  };
}
