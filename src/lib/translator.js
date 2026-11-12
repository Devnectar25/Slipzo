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
  // User Guide tips and buttons (curated)
  "Use the keyboard shortcut 'Ctrl + Enter' on desktop to instantly complete and print the bill without touching your mouse!": { mr: "डेस्कटॉपवर माउसला हात न लावता बिल त्वरित पूर्ण करण्यासाठी आणि प्रिंट करण्यासाठी कीबोर्ड शॉर्टकट 'Ctrl + Enter' वापरा!", hi: "डेस्कटॉप पर माउस छुए बिना बिल तुरंत पूरा करने और प्रिंट करने के लिए कीबोर्ड शॉर्टकट 'Ctrl + Enter' का इस्तेमाल करें!" },
  "Open New Bill Desk": { mr: "नवीन बिल डेस्क उघडा", hi: "नया बिल डेस्क खोलें" },
  "Keep your barcode scanner in auto-sensing mode so you can simply wave products under the beam for frictionless counter billing.": { mr: "तुमचा बारकोड स्कॅनर ऑटो-सेन्सिंग मोडमध्ये ठेवा, जेणेकरून तुम्ही प्रोडक्ट बीमखाली फिरवून काउंटरवर विनाअडथळा बिलिंग करू शकाल.", hi: "अपने बारकोड स्कैनर को ऑटो-सेंसिंग मोड में रखें, ताकि आप प्रोडक्ट को बीम के नीचे घुमाकर काउंटर पर बिना रुकावट बिलिंग कर सकें।" },
  "Manage Products Now": { mr: "आत्ता प्रोडक्ट सांभाळा", hi: "अभी प्रोडक्ट संभालें" },
  "Waiters can use Slipzen directly from an Android mobile phone to take orders tableside, sending KOTs to the kitchen instantly!": { mr: "वेटर थेट Android मोबाइल फोनवरून Slipzen वापरून टेबलवरच ऑर्डर घेऊ शकतात आणि KOT त्वरित किचनमध्ये पाठवू शकतात!", hi: "वेटर सीधे Android मोबाइल फ़ोन से Slipzen इस्तेमाल करके टेबल पर ही ऑर्डर ले सकते हैं और KOT तुरंत किचन में भेज सकते हैं!" },
  "Go to Tables Management": { mr: "टेबल व्यवस्थापनाकडे जा", hi: "टेबल मैनेजमेंट पर जाएं" },
  "Always test a sample print after pairing a new printer to ensure thermal alignment and auto-cutter function are properly enabled.": { mr: "नवीन प्रिंटर पेअर केल्यानंतर नेहमी एक नमुना प्रिंट काढून पहा, जेणेकरून थर्मल अलाइनमेंट आणि ऑटो-कटर योग्यरित्या चालू असल्याची खात्री होईल.", hi: "नया प्रिंटर पेयर करने के बाद हमेशा एक सैंपल प्रिंट निकालकर देखें, ताकि थर्मल अलाइनमेंट और ऑटो-कटर ठीक से चालू होने की पुष्टि हो सके।" },
  "Configure Printer Width": { mr: "प्रिंटरची रुंदी सेट करा", hi: "प्रिंटर की चौड़ाई सेट करें" },
  "Ensure your shop phone number and address are up to date on your template so customers can easily contact you for reorders.": { mr: "तुमच्या टेम्पलेटवर दुकानाचा फोन नंबर आणि पत्ता अद्ययावत ठेवा, जेणेकरून ग्राहक पुन्हा ऑर्डरसाठी सहज संपर्क करू शकतील.", hi: "अपने टेम्पलेट पर दुकान का फ़ोन नंबर और पता अपडेट रखें, ताकि ग्राहक दोबारा ऑर्डर के लिए आसानी से संपर्क कर सकें।" },
  "Browse All Templates": { mr: "सर्व टेम्पलेट्स पहा", hi: "सभी टेम्पलेट देखें" },
  "Review your daily sales summary at the end of each day before closing your cash drawer to ensure cash totals match your register.": { mr: "कॅश ड्रॉवर बंद करण्यापूर्वी रोज दिवसाच्या शेवटी तुमचा दैनंदिन विक्री सारांश पहा, जेणेकरून रोख एकूण रक्कम नोंदवहीशी जुळेल.", hi: "कैश ड्रॉअर बंद करने से पहले हर दिन के अंत में अपनी दैनिक बिक्री का सारांश देखें, ताकि नकद का कुल योग रजिस्टर से मेल खाए।" },
  "View Bill History": { mr: "बिल इतिहास पहा", hi: "बिल इतिहास देखें" },

  // More UI strings (curated)
  "Category": { mr: "प्रकार", hi: "श्रेणी" },
  "Everything you need to master fast billing, barcode inventory, dine-in tables, thermal printers, and daily sales tracking for your business.": { mr: "जलद बिलिंग, बारकोड इन्व्हेंटरी, डाइन-इन टेबल, थर्मल प्रिंटर आणि दैनंदिन विक्री ट्रॅकिंगमध्ये तरबेज होण्यासाठी तुम्हाला जे काही हवे ते सर्व येथे आहे.", hi: "तेज़ बिलिंग, बारकोड इन्वेंटरी, डाइन-इन टेबल, थर्मल प्रिंटर और रोज़ की बिक्री ट्रैकिंग में माहिर होने के लिए आपको जो कुछ चाहिए, सब यहाँ है।" },
  "PRO TIP": { mr: "प्रो टिप", hi: "प्रो टिप" },
  "Try it now": { mr: "आत्ताच वापरून पहा", hi: "अभी आज़माएं" },

  // Add-items catalogue categories
  "Atta & Flour": { mr: "पीठ आणि मैदा", hi: "आटा और मैदा" },
  "Rice": { mr: "तांदूळ", hi: "चावल" },
  "Dal & Pulses": { mr: "डाळी आणि कडधान्ये", hi: "दाल और दालें" },
  "Oil & Ghee": { mr: "तेल आणि तूप", hi: "तेल और घी" },
  "Spices & Masala": { mr: "मसाले", hi: "मसाले" },
  "Salt & Sugar": { mr: "मीठ आणि साखर", hi: "नमक और चीनी" },
  "Biscuits & Cookies": { mr: "बिस्किटे आणि कुकीज", hi: "बिस्कुट और कुकीज़" },
  "Tea & Coffee": { mr: "चहा आणि कॉफी", hi: "चाय और कॉफ़ी" },
  "Instant Food": { mr: "इन्स्टंट फूड", hi: "इंस्टेंट फ़ूड" },
  "Household Cleaning": { mr: "घरगुती स्वच्छता", hi: "घरेलू सफ़ाई" },
  "Men's Wear": { mr: "पुरुषांचे कपडे", hi: "पुरुषों के कपड़े" },
  "Women's Wear": { mr: "महिलांचे कपडे", hi: "महिलाओं के कपड़े" },
  "Kids Wear": { mr: "मुलांचे कपडे", hi: "बच्चों के कपड़े" },
  "Jackets & Winterwear": { mr: "जॅकेट आणि हिवाळी कपडे", hi: "जैकेट और सर्दी के कपड़े" },

  // User Guide (curated)
  "How to Create & Print Bills": { mr: "बिले कशी तयार करावी आणि प्रिंट करावी", hi: "बिल कैसे बनाएं और प्रिंट करें" },
  "Lightning-fast billing with barcode scanner, custom tax, and instant thermal printing.": { mr: "बारकोड स्कॅनर, कस्टम टॅक्स आणि त्वरित थर्मल प्रिंटिंगसह विजेच्या वेगाने बिलिंग.", hi: "बारकोड स्कैनर, कस्टम टैक्स और तुरंत थर्मल प्रिंटिंग के साथ बिजली की तेज़ बिलिंग।" },
  "Select or Scan Items": { mr: "आयटम निवडा किंवा स्कॅन करा", hi: "आइटम चुनें या स्कैन करें" },
  "Type the product name in the search bar or scan its barcode using your camera or USB barcode gun. The item is instantly added to the bill cart.": { mr: "सर्च बारमध्ये प्रोडक्टचे नाव टाइप करा किंवा कॅमेरा अथवा USB बारकोड गनने त्याचा बारकोड स्कॅन करा. आयटम त्वरित बिलमध्ये जोडला जातो.", hi: "सर्च बार में प्रोडक्ट का नाम लिखें या कैमरे अथवा USB बारकोड गन से उसका बारकोड स्कैन करें। आइटम तुरंत बिल में जुड़ जाता है।" },
  "Adjust Quantities & Discounts": { mr: "प्रमाण आणि सूट समायोजित करा", hi: "मात्रा और छूट समायोजित करें" },
  "Click '+' or '-' to change item quantity. You can also apply an overall percentage or flat rupee discount to the entire bill.": { mr: "आयटमचे प्रमाण बदलण्यासाठी '+' किंवा '-' दाबा. तुम्ही संपूर्ण बिलावर टक्केवारी किंवा थेट रुपयांत सूट देखील देऊ शकता.", hi: "आइटम की मात्रा बदलने के लिए '+' या '-' दबाएं। आप पूरे बिल पर प्रतिशत या सीधे रुपयों में छूट भी दे सकते हैं।" },
  "Choose Payment Method (Cash / UPI / Card / Udhar)": { mr: "पेमेंट पद्धत निवडा (रोख / UPI / कार्ड / उधार)", hi: "भुगतान का तरीका चुनें (कैश / UPI / कार्ड / उधार)" },
  "Select how the customer paid. If UPI is chosen, you can display a dynamic QR code for instant scanning and payment verification.": { mr: "ग्राहकाने कसे पेमेंट केले ते निवडा. UPI निवडल्यास तुम्ही त्वरित स्कॅन आणि पेमेंट पडताळणीसाठी डायनॅमिक QR कोड दाखवू शकता.", hi: "चुनें कि ग्राहक ने कैसे भुगतान किया। UPI चुनने पर आप तुरंत स्कैन और भुगतान जांचने के लिए डायनामिक QR कोड दिखा सकते हैं।" },
  "1-Click Print & WhatsApp Share": { mr: "1-क्लिकमध्ये प्रिंट आणि WhatsApp शेअर", hi: "1-क्लिक में प्रिंट और WhatsApp शेयर" },
  "Hit 'Print Bill' to send directly to your 58mm or 80mm thermal printer. You can also send a digital PDF copy directly to the customer's WhatsApp.": { mr: "तुमच्या 58mm किंवा 80mm थर्मल प्रिंटरवर थेट पाठवण्यासाठी 'बिल प्रिंट करा' दाबा. तुम्ही ग्राहकाच्या WhatsApp वर डिजिटल PDF प्रत देखील पाठवू शकता.", hi: "अपने 58mm या 80mm थर्मल प्रिंटर पर सीधे भेजने के लिए 'बिल प्रिंट करें' दबाएं। आप ग्राहक के WhatsApp पर डिजिटल PDF कॉपी भी भेज सकते हैं।" },
  "Managing Products, Prices & Stock": { mr: "प्रोडक्ट, किंमत आणि स्टॉक सांभाळणे", hi: "प्रोडक्ट, कीमत और स्टॉक संभालना" },
  "Organize categories, set low-stock thresholds, and track your inventory in real time.": { mr: "प्रकार व्यवस्थित करा, कमी स्टॉकची मर्यादा ठरवा आणि तुमची इन्व्हेंटरी रिअल टाइममध्ये ट्रॅक करा.", hi: "श्रेणियां व्यवस्थित करें, कम स्टॉक की सीमा तय करें और अपनी इन्वेंटरी रियल टाइम में ट्रैक करें।" },
  "Add Single or Bulk Products": { mr: "एक किंवा अनेक प्रोडक्ट जोडा", hi: "एक या कई प्रोडक्ट जोड़ें" },
  "Click '+ Add Product' to specify name, selling price, MRP, purchase rate, and barcode. For large stores, use the CSV Import feature to load hundreds of items at once.": { mr: "नाव, विक्री किंमत, MRP, खरेदी दर आणि बारकोड भरण्यासाठी '+ प्रोडक्ट जोडा' दाबा. मोठ्या दुकानांसाठी CSV इम्पोर्टने शेकडो आयटम एकाच वेळी जोडा.", hi: "नाम, बिक्री कीमत, MRP, खरीद दर और बारकोड भरने के लिए '+ प्रोडक्ट जोड़ें' दबाएं। बड़ी दुकानों के लिए CSV इम्पोर्ट से सैकड़ों आइटम एक साथ जोड़ें।" },
  "Barcode Generation & Scanning": { mr: "बारकोड तयार करणे आणि स्कॅन करणे", hi: "बारकोड बनाना और स्कैन करना" },
  "If an item doesn't have a manufacturer barcode, Slipzen can auto-generate a unique barcode that you can print on stickers.": { mr: "एखाद्या आयटमवर उत्पादकाचा बारकोड नसल्यास, Slipzen एक अनन्य बारकोड आपोआप तयार करू शकते, जो तुम्ही स्टिकरवर प्रिंट करू शकता.", hi: "अगर किसी आइटम पर निर्माता का बारकोड नहीं है, तो Slipzen एक अनूठा बारकोड अपने आप बना सकता है, जिसे आप स्टिकर पर प्रिंट कर सकते हैं।" },
  "Low Stock Alerts": { mr: "कमी स्टॉक अलर्ट", hi: "कम स्टॉक अलर्ट" },
  "Set minimum threshold levels (e.g. 5 units). When stock runs low, Slipzen highlights the item with an amber badge so you can reorder in time.": { mr: "किमान मर्यादा ठरवा (उदा. 5 युनिट). स्टॉक कमी झाल्यावर Slipzen आयटमला अंबर बॅजने दाखवते, जेणेकरून तुम्ही वेळेत पुन्हा ऑर्डर करू शकाल.", hi: "न्यूनतम सीमा तय करें (जैसे 5 यूनिट)। स्टॉक कम होने पर Slipzen आइटम को एम्बर बैज से दिखाता है ताकि आप समय पर दोबारा ऑर्डर कर सकें।" },
  "Quick Price Updates": { mr: "किंमत झटपट बदला", hi: "कीमत जल्दी बदलें" },
  "Update selling prices anytime from the Products desk. Changes take effect on the new bill desk immediately.": { mr: "प्रोडक्ट डेस्कवरून कधीही विक्री किंमत बदला. बदल नवीन बिल डेस्कवर त्वरित लागू होतात.", hi: "प्रोडक्ट डेस्क से कभी भी बिक्री कीमत बदलें। बदलाव नए बिल डेस्क पर तुरंत लागू हो जाते हैं।" },
  "Restaurant Tables & Kitchen Tickets (KOT)": { mr: "रेस्टॉरंट टेबल आणि किचन तिकिटे (KOT)", hi: "रेस्टोरेंट टेबल और किचन टिकट (KOT)" },
  "Manage dining floor tables, print kitchen orders, and merge bills effortlessly.": { mr: "डायनिंग फ्लोअरची टेबल्स सांभाळा, किचन ऑर्डर प्रिंट करा आणि बिले सहज मर्ज करा.", hi: "डाइनिंग फ़्लोर की टेबल संभालें, किचन ऑर्डर प्रिंट करें और बिल आसानी से मर्ज करें।" },
  "View Floor Status at a Glance": { mr: "फ्लोअरची स्थिती एका दृष्टिक्षेपात पहा", hi: "फ़्लोर की स्थिति एक नज़र में देखें" },
  "See which tables are vacant (gray), occupied (green), or waiting for settlement (amber) on an interactive visual floor map.": { mr: "इंटरॅक्टिव्ह फ्लोअर मॅपवर पहा कोणती टेबल रिकामी (राखाडी), भरलेली (हिरवी) किंवा पेमेंटच्या प्रतीक्षेत (अंबर) आहे.", hi: "इंटरैक्टिव फ़्लोर मैप पर देखें कि कौन-सी टेबल खाली (ग्रे), भरी हुई (हरी) या भुगतान की प्रतीक्षा में (एम्बर) है।" },
  "Punch Orders & Print KOT": { mr: "ऑर्डर नोंदवा आणि KOT प्रिंट करा", hi: "ऑर्डर दर्ज करें और KOT प्रिंट करें" },
  "Select a table, add food items, and click 'Send KOT'. A Kitchen Order Ticket prints immediately on your kitchen printer without prices, letting chefs start cooking.": { mr: "टेबल निवडा, खाद्यपदार्थ जोडा आणि 'KOT पाठवा' दाबा. किंमतीशिवाय किचन ऑर्डर तिकीट तुमच्या किचन प्रिंटरवर त्वरित प्रिंट होते, जेणेकरून शेफ स्वयंपाक सुरू करू शकतील.", hi: "टेबल चुनें, खाने के आइटम जोड़ें और 'KOT भेजें' दबाएं। कीमत के बिना किचन ऑर्डर टिकट तुरंत आपके किचन प्रिंटर पर प्रिंट होता है, ताकि शेफ़ खाना बनाना शुरू कर सकें।" },
  "Add Running Orders": { mr: "चालू ऑर्डरमध्ये जोडा", hi: "चालू ऑर्डर में जोड़ें" },
  "When customers order extra rotis, drinks, or desserts, open the active table and add items. A supplementary KOT prints for only the new items.": { mr: "ग्राहकांनी जास्तीच्या चपात्या, पेये किंवा मिष्टान्न मागवल्यास, चालू टेबल उघडून आयटम जोडा. फक्त नवीन आयटमसाठी पूरक KOT प्रिंट होते.", hi: "जब ग्राहक अतिरिक्त रोटी, ड्रिंक या मिठाई मंगाएं, तो चालू टेबल खोलकर आइटम जोड़ें। केवल नए आइटम के लिए अलग KOT प्रिंट होता है।" },
  "Merge Tables & Settle Bill": { mr: "टेबल मर्ज करा आणि बिल पूर्ण करा", hi: "टेबल मर्ज करें और बिल चुकता करें" },
  "Easily merge two tables for large parties or transfer an order from Table 2 to Table 5 in one tap. Once done, print the final bill and clear the table.": { mr: "मोठ्या गटासाठी दोन टेबल सहज मर्ज करा किंवा एका टॅपमध्ये टेबल 2 ची ऑर्डर टेबल 5 वर हलवा. झाल्यावर अंतिम बिल प्रिंट करा आणि टेबल रिकामी करा.", hi: "बड़े समूह के लिए दो टेबल आसानी से मर्ज करें या एक टैप में टेबल 2 का ऑर्डर टेबल 5 पर ले जाएं। काम पूरा होने पर अंतिम बिल प्रिंट करें और टेबल खाली करें।" },
  "Connecting Bluetooth & USB Thermal Printers": { mr: "ब्लूटूथ आणि USB थर्मल प्रिंटर जोडणे", hi: "ब्लूटूथ और USB थर्मल प्रिंटर जोड़ना" },
  "Setup 58mm (2-inch) and 80mm (3-inch) ESC/POS thermal receipt printers.": { mr: "58mm (2-इंच) आणि 80mm (3-इंच) ESC/POS थर्मल पावती प्रिंटर सेट करा.", hi: "58mm (2-इंच) और 80mm (3-इंच) ESC/POS थर्मल रसीद प्रिंटर सेट करें।" },
  "Bluetooth Mobile Printers (Android)": { mr: "ब्लूटूथ मोबाइल प्रिंटर (Android)", hi: "ब्लूटूथ मोबाइल प्रिंटर (Android)" },
  "Turn on Bluetooth on your phone, pair with your printer (common PIN: 0000 or 1234). In Slipzen, select your paired Bluetooth printer for silent direct printing.": { mr: "तुमच्या फोनमध्ये ब्लूटूथ चालू करा आणि प्रिंटरशी पेअर करा (सामान्य PIN: 0000 किंवा 1234). Slipzen मध्ये तुमचा पेअर केलेला ब्लूटूथ प्रिंटर निवडा, जेणेकरून थेट शांतपणे प्रिंट होईल.", hi: "अपने फ़ोन में ब्लूटूथ चालू करें और प्रिंटर से पेयर करें (सामान्य PIN: 0000 या 1234)। Slipzen में अपना पेयर किया हुआ ब्लूटूथ प्रिंटर चुनें, ताकि सीधे चुपचाप प्रिंट हो।" },
  "USB & LAN Printers (Desktop / Laptop)": { mr: "USB आणि LAN प्रिंटर (डेस्कटॉप / लॅपटॉप)", hi: "USB और LAN प्रिंटर (डेस्कटॉप / लैपटॉप)" },
  "Plug your thermal printer via USB. Install the manufacturer's POS driver. Slipzen automatically utilizes standard system printing dialogs formatted to 58mm or 80mm.": { mr: "तुमचा थर्मल प्रिंटर USB ने जोडा आणि उत्पादकाचा POS ड्रायव्हर इन्स्टॉल करा. Slipzen 58mm किंवा 80mm मध्ये तयार केलेले सामान्य सिस्टम प्रिंट डायलॉग आपोआप वापरते.", hi: "अपना थर्मल प्रिंटर USB से जोड़ें और निर्माता का POS ड्राइवर इंस्टॉल करें। Slipzen 58mm या 80mm में बने सामान्य सिस्टम प्रिंट डायलॉग का अपने आप उपयोग करता है।" },
  "Thermal Paper Size Setting": { mr: "थर्मल पेपर आकार सेटिंग", hi: "थर्मल पेपर साइज़ सेटिंग" },
  "Go to Shop Profile and select your printer width: 58mm (ideal for small receipts & mobile setups) or 80mm (spacious format for detailed bills).": { mr: "दुकान प्रोफाइलमध्ये जाऊन तुमच्या प्रिंटरची रुंदी निवडा: 58mm (लहान पावत्या आणि मोबाइल सेटअपसाठी उत्तम) किंवा 80mm (तपशीलवार बिलांसाठी प्रशस्त फॉरमॅट).", hi: "दुकान प्रोफ़ाइल में जाकर अपने प्रिंटर की चौड़ाई चुनें: 58mm (छोटी रसीदों और मोबाइल सेटअप के लिए बढ़िया) या 80mm (विस्तृत बिलों के लिए बड़ा फ़ॉर्मेट)।" },
  "Print Without Margin Cuts": { mr: "मार्जिन न कापता प्रिंट करा", hi: "मार्जिन कटे बिना प्रिंट करें" },
  "In your browser print dialog, set Margins to 'None' and disable 'Headers and Footers' to get crisp, edge-to-edge receipts without blank paper waste.": { mr: "तुमच्या ब्राउझरच्या प्रिंट डायलॉगमध्ये मार्जिन 'None' करा आणि 'Headers and Footers' बंद करा, जेणेकरून कोरा कागद वाया न जाता कडेपर्यंत स्पष्ट पावती मिळेल.", hi: "अपने ब्राउज़र के प्रिंट डायलॉग में मार्जिन 'None' करें और 'Headers and Footers' बंद करें, ताकि बिना खाली कागज़ बर्बाद किए किनारे तक साफ़ रसीद मिले।" },
  "Customizing Receipt Layouts & Logo": { mr: "पावतीचा लेआउट आणि लोगो कस्टमाइझ करणे", hi: "रसीद का लेआउट और लोगो अनुकूलित करना" },
  "Make your invoices look professional with custom headers, QR codes, and footers.": { mr: "कस्टम हेडर, QR कोड आणि फूटरने तुमचे इनव्हॉइस व्यावसायिक बनवा.", hi: "कस्टम हेडर, QR कोड और फ़ुटर से अपने इनवॉइस को पेशेवर बनाएं।" },
  "Choose From Multiple Layouts": { mr: "अनेक लेआउटमधून निवडा", hi: "कई लेआउट में से चुनें" },
  "Slipzen includes Classic Retail, Modern Minimal, Restaurant Dine-in, and Compact Thermal formats designed for high readability.": { mr: "Slipzen मध्ये क्लासिक रिटेल, मॉडर्न मिनिमल, रेस्टॉरंट डाइन-इन आणि कॉम्पॅक्ट थर्मल फॉरमॅट आहेत, जे सहज वाचता येतील असे बनवले आहेत.", hi: "Slipzen में क्लासिक रिटेल, मॉडर्न मिनिमल, रेस्टोरेंट डाइन-इन और कॉम्पैक्ट थर्मल फ़ॉर्मेट हैं, जो आसानी से पढ़ने लायक बनाए गए हैं।" },
  "Upload Your Shop Logo": { mr: "तुमच्या दुकानाचा लोगो अपलोड करा", hi: "अपनी दुकान का लोगो अपलोड करें" },
  "Upload a clean monochrome or color logo in Shop Profile. It prints cleanly at the top of your bills and appears on digital PDFs.": { mr: "दुकान प्रोफाइलमध्ये स्वच्छ मोनोक्रोम किंवा रंगीत लोगो अपलोड करा. तो बिलांच्या वर स्पष्ट प्रिंट होतो आणि डिजिटल PDF मध्येही दिसतो.", hi: "दुकान प्रोफ़ाइल में साफ़ मोनोक्रोम या रंगीन लोगो अपलोड करें। वह बिलों के ऊपर साफ़ प्रिंट होता है और डिजिटल PDF में भी दिखता है।" },
  "UPI QR Code for Instant Payments": { mr: "त्वरित पेमेंटसाठी UPI QR कोड", hi: "तुरंत भुगतान के लिए UPI QR कोड" },
  "Add your UPI ID (e.g. yourname@upi) in Shop Profile. Slipzen generates a scannable payment QR code directly on the printed receipt for customers to scan.": { mr: "दुकान प्रोफाइलमध्ये तुमचा UPI ID जोडा (उदा. yourname@upi). Slipzen प्रिंट केलेल्या पावतीवरच ग्राहकांना स्कॅन करता येणारा पेमेंट QR कोड तयार करते.", hi: "दुकान प्रोफ़ाइल में अपनी UPI ID जोड़ें (जैसे yourname@upi)। Slipzen प्रिंट की गई रसीद पर ही स्कैन होने वाला पेमेंट QR कोड बनाता है, जिसे ग्राहक स्कैन कर सकते हैं।" },
  "Custom Footer Greetings & Terms": { mr: "कस्टम फूटर संदेश आणि अटी", hi: "कस्टम फ़ुटर संदेश और शर्तें" },
  "Add custom return policies, warranty notes, or friendly messages like 'Thank you! Visit again!' at the bottom of every bill.": { mr: "प्रत्येक बिलाच्या खाली कस्टम रिटर्न धोरण, वॉरंटी टीप किंवा 'धन्यवाद! पुन्हा भेट द्या!' असे मैत्रीपूर्ण संदेश जोडा.", hi: "हर बिल के नीचे कस्टम रिटर्न नीति, वारंटी नोट या 'धन्यवाद! फिर आइएगा!' जैसे दोस्ताना संदेश जोड़ें।" },
  "Daily Sales, Bill History & Customer Credit": { mr: "दैनंदिन विक्री, बिल इतिहास आणि ग्राहक उधार", hi: "रोज़ की बिक्री, बिल इतिहास और ग्राहक उधार" },
  "Track cash vs UPI collections, reprint past bills, and recover customer credit.": { mr: "रोख विरुद्ध UPI वसुली ट्रॅक करा, जुनी बिले पुन्हा प्रिंट करा आणि ग्राहकांचे उधार वसूल करा.", hi: "कैश बनाम UPI वसूली ट्रैक करें, पुराने बिल दोबारा प्रिंट करें और ग्राहकों का उधार वसूलें।" },
  "View Today's Revenue & Payment Split": { mr: "आजची कमाई आणि पेमेंट विभागणी पहा", hi: "आज की कमाई और भुगतान का विभाजन देखें" },
  "Check your dashboard for real-time sales numbers, including how much was collected via UPI vs Cash in hand.": { mr: "डॅशबोर्डवर रिअल-टाइम विक्री आकडे पहा, ज्यात UPI आणि हातातील रोख वसुली वेगवेगळी दिसते.", hi: "डैशबोर्ड पर रियल-टाइम बिक्री के आंकड़े देखें, जिसमें UPI और हाथ में नकद की वसूली अलग-अलग दिखती है।" },
  "Search Past Bills & 1-Click Reprint": { mr: "जुनी बिले शोधा आणि 1-क्लिकमध्ये पुन्हा प्रिंट करा", hi: "पुराने बिल खोजें और 1-क्लिक में दोबारा प्रिंट करें" },
  "Go to Bill History to search any past receipt by bill number, customer phone number, or date. Reprint duplicate receipts in seconds.": { mr: "बिल इतिहासमध्ये जाऊन बिल क्रमांक, ग्राहकाचा फोन नंबर किंवा तारखेनुसार कोणतीही जुनी पावती शोधा. काही सेकंदांत डुप्लिकेट पावत्या पुन्हा प्रिंट करा.", hi: "बिल इतिहास में जाकर बिल नंबर, ग्राहक के फ़ोन नंबर या तारीख से कोई भी पुरानी रसीद खोजें। कुछ ही सेकंड में डुप्लिकेट रसीद दोबारा प्रिंट करें।" },
  "Customer Udhar (Khata / Credit Ledger)": { mr: "ग्राहक उधार (खाते / क्रेडिट वही)", hi: "ग्राहक उधार (खाता / क्रेडिट बही)" },
  "Record pending payments against customer names and phone numbers. See who owes money at a glance and send WhatsApp payment reminders.": { mr: "ग्राहकांची नावे आणि फोन नंबरसह थकबाकी नोंदवा. कोणाकडे किती बाकी आहे ते एका दृष्टिक्षेपात पहा आणि WhatsApp वर पेमेंट रिमाइंडर पाठवा.", hi: "ग्राहकों के नाम और फ़ोन नंबर के साथ बकाया भुगतान दर्ज करें। एक नज़र में देखें किसपर कितना बकाया है और WhatsApp पर भुगतान रिमाइंडर भेजें।" },
  "Audit & Cancel Bills": { mr: "बिलांची तपासणी आणि रद्द करणे", hi: "बिलों की जांच और रद्द करना" },
  "If a mistake is made, authorized staff can cancel a bill with a documented reason, keeping stock numbers and registers accurate.": { mr: "चूक झाल्यास अधिकृत स्टाफ कारण नोंदवून बिल रद्द करू शकतो, ज्यामुळे स्टॉक आणि नोंदवह्या अचूक राहतात.", hi: "गलती होने पर अधिकृत स्टाफ कारण लिखकर बिल रद्द कर सकता है, जिससे स्टॉक और रजिस्टर सही रहते हैं।" },
  "Can I use Slipzen when there is no internet connection?": { mr: "इंटरनेट नसताना मी Slipzen वापरू शकतो का?", hi: "क्या इंटरनेट न होने पर भी मैं Slipzen इस्तेमाल कर सकता हूं?" },
  "Yes! Slipzen has built-in offline resilience. You can create bills, lookup cached inventory, and print receipts even during internet drops. When the connection resumes, your data synchronizes automatically with the cloud.": { mr: "हो! Slipzen मध्ये ऑफलाइन चालण्याची सुविधा आधीच आहे. इंटरनेट गेले तरी तुम्ही बिले तयार करू शकता, सेव्ह केलेली इन्व्हेंटरी पाहू शकता आणि पावत्या प्रिंट करू शकता. कनेक्शन परत येताच तुमचा डेटा आपोआप क्लाउडशी सिंक होतो.", hi: "हाँ! Slipzen में ऑफ़लाइन चलने की सुविधा पहले से है। इंटरनेट जाने पर भी आप बिल बना सकते हैं, सहेजी हुई इन्वेंटरी देख सकते हैं और रसीद प्रिंट कर सकते हैं। कनेक्शन लौटते ही आपका डेटा अपने आप क्लाउड से सिंक हो जाता है।" },
  "How do I remove browser headers and footers from printed receipts?": { mr: "प्रिंट केलेल्या पावतीवरून ब्राउझरचे हेडर आणि फूटर कसे काढावेत?", hi: "प्रिंट की गई रसीद से ब्राउज़र के हेडर और फ़ुटर कैसे हटाऊं?" },
  "When the browser print dialog appears, expand 'More settings', uncheck 'Headers and footers', and set 'Margins' to 'None' or 'Minimum'. Your browser remembers this preference for future prints.": { mr: "ब्राउझरचा प्रिंट डायलॉग उघडल्यावर 'More settings' उघडा, 'Headers and footers' ची खूण काढा आणि 'Margins' 'None' किंवा 'Minimum' करा. तुमचा ब्राउझर ही निवड पुढील प्रिंटसाठी लक्षात ठेवतो.", hi: "ब्राउज़र का प्रिंट डायलॉग खुलने पर 'More settings' खोलें, 'Headers and footers' का निशान हटाएं और 'Margins' को 'None' या 'Minimum' करें। आपका ब्राउज़र यह पसंद आगे के प्रिंट के लिए याद रखता है।" },
  "How do I print directly to a Bluetooth thermal printer on my phone?": { mr: "फोनवरून थेट ब्लूटूथ थर्मल प्रिंटरवर प्रिंट कसे करावे?", hi: "फ़ोन से सीधे ब्लूटूथ थर्मल प्रिंटर पर प्रिंट कैसे करूं?" },
  "First, pair the Bluetooth printer in your phone's Android Bluetooth settings. Open Slipzen, create a bill, and tap 'Print'. Select your paired thermal printer from the available list.": { mr: "आधी तुमच्या फोनच्या Android ब्लूटूथ सेटिंगमध्ये प्रिंटर पेअर करा. नंतर Slipzen उघडा, बिल तयार करा आणि 'प्रिंट' दाबा. यादीतून तुमचा पेअर केलेला थर्मल प्रिंटर निवडा.", hi: "पहले अपने फ़ोन की Android ब्लूटूथ सेटिंग में प्रिंटर पेयर करें। फिर Slipzen खोलें, बिल बनाएं और 'प्रिंट' दबाएं। सूची से अपना पेयर किया हुआ थर्मल प्रिंटर चुनें।" },
  "How do I change the language of the application?": { mr: "अॅपची भाषा कशी बदलावी?", hi: "ऐप की भाषा कैसे बदलूं?" },
  "Click on the globe / language selector icon in the top header or sidebar. Slipzen supports English, Hindi (हिन्दी), and Marathi (मराठी) across the entire interface.": { mr: "वरच्या हेडर किंवा साइडबारमधील ग्लोब / भाषा निवडणाऱ्या आयकॉनवर क्लिक करा. Slipzen संपूर्ण इंटरफेसमध्ये इंग्रजी, हिंदी आणि मराठीला सपोर्ट करते.", hi: "ऊपर के हेडर या साइडबार में ग्लोब / भाषा चुनने वाले आइकन पर क्लिक करें। Slipzen पूरे इंटरफ़ेस में अंग्रेज़ी, हिन्दी और मराठी को सपोर्ट करता है।" },
  "Can I use a physical barcode scanner gun with Slipzen?": { mr: "मी Slipzen सोबत प्रत्यक्ष बारकोड स्कॅनर गन वापरू शकतो का?", hi: "क्या मैं Slipzen के साथ असली बारकोड स्कैनर गन इस्तेमाल कर सकता हूं?" },
  "Absolutely. Standard USB and wireless barcode scanners act as keyboard input. When you scan a product, Slipzen instantly detects the barcode number and adds the item to the bill.": { mr: "नक्कीच. सामान्य USB आणि वायरलेस बारकोड स्कॅनर कीबोर्डप्रमाणे काम करतात. प्रोडक्ट स्कॅन करताच Slipzen बारकोड क्रमांक ओळखून आयटम बिलमध्ये जोडते.", hi: "बिल्कुल। सामान्य USB और वायरलेस बारकोड स्कैनर कीबोर्ड की तरह काम करते हैं। प्रोडक्ट स्कैन करते ही Slipzen बारकोड नंबर पहचानकर आइटम को बिल में जोड़ देता है।" },
  "How do I export my sales or customer data?": { mr: "माझी विक्री किंवा ग्राहक डेटा कसा एक्सपोर्ट करावा?", hi: "अपनी बिक्री या ग्राहक का डेटा कैसे एक्सपोर्ट करूं?" },
  "In the Bill History and Products sections, look for the 'Export to CSV / Excel' button to download comprehensive spreadsheets for your accountant or tax filings.": { mr: "बिल इतिहास आणि प्रोडक्ट विभागांत 'Export to CSV / Excel' बटण पहा, ज्याने तुम्ही तुमच्या अकाउंटंट किंवा कर भरण्यासाठी संपूर्ण स्प्रेडशीट डाउनलोड करू शकता.", hi: "बिल इतिहास और प्रोडक्ट सेक्शन में 'Export to CSV / Excel' बटन देखें, जिससे आप अपने अकाउंटेंट या टैक्स फ़ाइलिंग के लिए पूरी स्प्रेडशीट डाउनलोड कर सकते हैं।" },

  // Custom Item UI & Modal Translations
  "Custom Menu": { mr: "कस्टम मेनू", hi: "कस्टम मेनू" },
  "Create Custom Menu": { mr: "कस्टम मेनू तयार करा", hi: "कस्टम मेनू बनाएं" },
  "Custom Item": { mr: "कस्टम वस्तू", hi: "कस्टम आइटम" },
  "Create Custom Item": { mr: "कस्टम वस्तू तयार करा", hi: "कस्टम आइटम बनाएं" },
  "Create Custom Product": { mr: "कस्टम उत्पादन तयार करा", hi: "कस्टम उत्पाद बनाएं" },
  "Product Image (Optional)": { mr: "वस्तूचे छायाचित्र (पर्यायी)", hi: "उत्पाद की फोटो (वैकल्पिक)" },
  "Upload": { mr: "अपलोड", hi: "अपलोड" },
  "Link": { mr: "लिंक", hi: "लिंक" },
  "Click to upload product image": { mr: "वस्तूचे छायाचित्र अपलोड करण्यासाठी क्लिक करा", hi: "उत्पाद की फोटो अपलोड करने के लिए क्लिक करें" },
  "(PNG, JPG, WebP max 5MB)": { mr: "(PNG, JPG, WebP कमाल ५MB)", hi: "(PNG, JPG, WebP अधिकतम 5MB)" },
  "Product Name *": { mr: "वस्तूचे नाव *", hi: "उत्पाद का नाम *" },
  "e.g. Masala Dosa, Cotton Shirt, Special Chai": { mr: "उदा: मसाला डोसा, कॉटन शर्ट, स्पेशल चहा", hi: "जैसे: मसाला डोसा, कॉटन शर्ट, स्पेशल चाय" },
  "Selling Price (₹) *": { mr: "विक्री किंमत (₹) *", hi: "बिक्री मूल्य (₹) *" },
  "Barcode / SKU (Optional)": { mr: "बारकोड / एसकेयू (पर्यायी)", hi: "बारकोड / एसकेयू (वैकल्पिक)" },
  "Leave blank to auto-generate": { mr: "आपोआप तयार करण्यासाठी रिकामे सोडा", hi: "स्वचालित रूप से बनाने के लिए खाली छोड़ें" },
  "Barcode Status": { mr: "बारकोड स्थिती", hi: "बारकोड स्थिति" },
  "Active (Scan Ready)": { mr: "सक्रिय (स्कॅनसाठी तयार)", hi: "सक्रिय (स्कैन के लिए तैयार)" },
  "Deactive (Manual Only)": { mr: "निष्क्रिय (फक्त मॅन्युअल)", hi: "निष्क्रिय (केवल मैनुअल)" },
  "Create Product": { mr: "वस्तू तयार करा", hi: "उत्पाद बनाएं" },
  "Creating...": { mr: "तयार होत आहे...", hi: "बनाया जा रहा है..." },
  "Attached": { mr: "जोडलेले", hi: "संलग्न" },
  "Photo Ready": { mr: "फोटो तयार", hi: "फोटो तैयार" },
  "Photo": { mr: "फोटो", hi: "फोटो" },
  "Change": { mr: "बदला", hi: "बदलें" },
  "Remove image": { mr: "छायाचित्र हटवा", hi: "फोटो हटाएं" },
  "Small Business / Cafe & Tea": { mr: "लहान व्यवसाय / कॅफे आणि चहा", hi: "छोटा व्यवसाय / कैफे और चाय" },
  "Kirana / Grocery Shop": { mr: "किराणा / ग्रॉसरी दुकान", hi: "किराना / ग्रॉसरी दुकान" },
  "Cloth & Garments Shop": { mr: "कापड आणि कपड्यांचे दुकान", hi: "कपड़ा और वस्त्र दुकान" },
  "Hotel or Food Restaurant": { mr: "हॉटेल किंवा रेस्टॉरंट", hi: "होटल या रेस्टोरेंट" },
  "Item name is required.": { mr: "वस्तूचे नाव आवश्यक आहे.", hi: "उत्पाद का नाम आवश्यक है।" },
  "Enter a valid price.": { mr: "वैध किंमत प्रविष्ट करा.", hi: "वैध मूल्य दर्ज करें।" },
  "A product with this name is already in your menu.": { mr: "या नावाचे उत्पादन आधीपासूनच तुमच्या मेनूमध्ये आहे.", hi: "इस नाम का उत्पाद पहले से ही आपके मेनू में है।" },
  "Unable to add the item. Please try again.": { mr: "वस्तू जोडता आली नाही. कृपया पुन्हा प्रयत्न करा.", hi: "उत्पाद जोड़ने में असमर्थ। कृपया पुनः प्रयास करें।" },
  "Cancel": { mr: "रद्द करा", hi: "रद्द करें" },
  "Remove Logo": { mr: "लोगो काढा", hi: "लोगो हटाएं" },
  "Change Logo": { mr: "लोगो बदला", hi: "लोगो बदलें" },
  "Recommended size: 512 × 512": { mr: "शिफारस केलेला आकार: 512 × 512", hi: "अनुशंसित आकार: 512 × 512" },
  "Remove shop logo?": { mr: "दुकान लोगो काढायचा?", hi: "दुकान का लोगो हटाएं?" },
  "Are you sure you want to remove your shop logo? It will no longer appear on your receipts.": { mr: "तुम्हाला नक्की दुकानाची लोगो हटवायची आहे का? ती पावतीवर पुन्हा दिसणार नाही.", hi: "क्या आप वाकई दुकान का लोगो हटाना चाहते हैं? यह रसीद पर फिर नहीं दिखेगा।" },

  // Templates & Showcase

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
  "Premium-grade Hansol SUPERMAX smooth, jam-free thermal receipt rolls for clear, dark prints.": {
    mr: "स्पष्ट, गडद प्रिंट्ससाठी प्रीमियम दर्जाचे हान्सोल सुपरमॅक्स गुळगुळीत, जाम-मुक्त थर्मल पावती रोल्स.",
    hi: "स्पष्ट, गहरे प्रिंट के लिए प्रीमियम-ग्रेड हैनसोल सुपरमैक्स स्मूद, जाम-मुक्त थर्मल रसीद रोल्स।"
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

  // Built-in receipt templates, badges and store products (local, so no online lookup is needed)
  "STANDARD": { mr: "मानक", hi: "मानक" },
  "MOST POPULAR": { mr: "सर्वाधिक लोकप्रिय", hi: "सबसे लोकप्रिय" },
  "RETAIL CHOICE": { mr: "रिटेल पसंती", hi: "रिटेल पसंद" },
  "PAPER SAVER": { mr: "कागद बचत", hi: "कागज़ बचत" },
  "TRENDY": { mr: "ट्रेंडी", hi: "ट्रेंडी" },
  "PREMIUM": { mr: "प्रीमियम", hi: "प्रीमियम" },
  "CUSTOM": { mr: "कस्टम", hi: "कस्टम" },
  "Clean and professional receipt template with itemized table, clear rates, and totals.": { mr: "आयटमची सारणी, स्पष्ट दर आणि एकूण रक्कम असलेले स्वच्छ आणि व्यावसायिक पावती टेम्पलेट.", hi: "आइटम तालिका, स्पष्ट दरों और कुल राशि वाला साफ़ और पेशेवर रसीद टेम्पलेट।" },
  "Clean and professional receipt template with itemized table, discounts, and clear totals.": { mr: "आयटमची सारणी, सवलती आणि स्पष्ट एकूण रक्कम असलेले स्वच्छ आणि व्यावसायिक पावती टेम्पलेट.", hi: "आइटम तालिका, छूट और स्पष्ट कुल राशि वाला साफ़ और पेशेवर रसीद टेम्पलेट।" },
  "Streamlined layout engineered to reduce paper roll consumption while maintaining clarity.": { mr: "स्पष्टता कायम ठेवून कागदी रोलचा वापर कमी करण्यासाठी तयार केलेली सुटसुटीत मांडणी.", hi: "स्पष्टता बनाए रखते हुए कागज़ रोल की खपत घटाने के लिए बनाया गया सरल लेआउट।" },
  "Ultra-compact monospace thermal bill layout engineered specifically to maximize speed and save paper.": { mr: "वेग वाढवण्यासाठी आणि कागद वाचवण्यासाठी खास तयार केलेली अतिशय कॉम्पॅक्ट मोनोस्पेस थर्मल बिल मांडणी.", hi: "गति बढ़ाने और कागज़ बचाने के लिए खास तौर पर बनाया गया अति-कॉम्पैक्ट मोनोस्पेस थर्मल बिल लेआउट।" },
  "Ultra compact monospace thermal bill layout engineered specifically to maximize speed and minimize roll paper consumption.": { mr: "वेग वाढवण्यासाठी आणि रोल कागदाचा वापर कमी करण्यासाठी खास तयार केलेली अतिशय कॉम्पॅक्ट मोनोस्पेस थर्मल बिल मांडणी.", hi: "गति बढ़ाने और रोल कागज़ की खपत घटाने के लिए खास तौर पर बनाया गया अति-कॉम्पैक्ट मोनोस्पेस थर्मल बिल लेआउट।" },
  "Contemporary design for boutiques, cafés, and salons, featuring pill badges, stylish spacing, and an Instagram handle.": { mr: "बुटीक, कॅफे आणि सलूनसाठी पिल बॅज, आकर्षक अंतर आणि इन्स्टाग्राम हँडलसह आधुनिक डिझाइन.", hi: "बुटीक, कैफ़े और सैलून के लिए पिल बैज, आकर्षक स्पेसिंग और इंस्टाग्राम हैंडल वाला आधुनिक डिज़ाइन।" },
  "Contemporary aesthetic for boutiques, cafes, and salons with pill badges, stylish spacing, and Instagram-style layout.": { mr: "बुटीक, कॅफे आणि सलूनसाठी पिल बॅज, आकर्षक अंतर आणि इन्स्टाग्राम-शैलीच्या मांडणीसह आधुनिक सौंदर्य.", hi: "बुटीक, कैफ़े और सैलून के लिए पिल बैज, आकर्षक स्पेसिंग और इंस्टाग्राम-शैली लेआउट वाला आधुनिक डिज़ाइन।" },
  "Contemporary aesthetic for boutiques, cafes, and modern shops with clean typography and spacing.": { mr: "बुटीक, कॅफे आणि आधुनिक दुकानांसाठी स्वच्छ टायपोग्राफी आणि अंतरासह आधुनिक सौंदर्य.", hi: "बुटीक, कैफ़े और आधुनिक दुकानों के लिए साफ़ टाइपोग्राफ़ी और स्पेसिंग वाला आधुनिक डिज़ाइन।" },
  "Formal business invoice template designed for retail and services with clear totals, signatory, and terms.": { mr: "स्पष्ट एकूण रक्कम, स्वाक्षरी आणि अटींसह रिटेल आणि सेवांसाठी तयार केलेले औपचारिक व्यवसाय इनव्हॉइस टेम्पलेट.", hi: "स्पष्ट कुल राशि, हस्ताक्षर और शर्तों के साथ रिटेल और सेवाओं के लिए बनाया गया औपचारिक व्यवसाय इनवॉइस टेम्पलेट।" },
  "Formal retail invoice template designed for businesses requiring clean itemized totals and formal terms.": { mr: "स्वच्छ आयटमनिहाय एकूण रक्कम आणि औपचारिक अटी आवश्यक असलेल्या व्यवसायांसाठी औपचारिक रिटेल इनव्हॉइस टेम्पलेट.", hi: "साफ़ आइटम-वार कुल राशि और औपचारिक शर्तें चाहने वाले व्यवसायों के लिए औपचारिक रिटेल इनवॉइस टेम्पलेट।" },
  "High quality thermal paper roll for smooth printing.": { mr: "सुरळीत प्रिंटिंगसाठी उच्च दर्जाचा थर्मल पेपर रोल.", hi: "सुचारू प्रिंटिंग के लिए उच्च गुणवत्ता वाला थर्मल पेपर रोल।" },
  "Portable 80mm wireless thermal printer for Android & iOS with rechargeable battery.": { mr: "रिचार्जेबल बॅटरीसह Android आणि iOS साठी पोर्टेबल 80mm वायरलेस थर्मल प्रिंटर.", hi: "रिचार्जेबल बैटरी के साथ Android और iOS के लिए पोर्टेबल 80mm वायरलेस थर्मल प्रिंटर।" },
  "Portable 58mm wireless thermal printer for Android & iOS with rechargeable battery.": { mr: "रिचार्जेबल बॅटरीसह Android आणि iOS साठी पोर्टेबल 58mm वायरलेस थर्मल प्रिंटर.", hi: "रिचार्जेबल बैटरी के साथ Android और iOS के लिए पोर्टेबल 58mm वायरलेस थर्मल प्रिंटर।" },
  "ATPOS premium smooth thermal paper rolls, jam-free dark printing for POS terminals.": { mr: "POS टर्मिनलसाठी ATPOS प्रीमियम गुळगुळीत थर्मल पेपर रोल, जॅम-मुक्त गडद प्रिंटिंग.", hi: "POS टर्मिनल के लिए ATPOS प्रीमियम स्मूद थर्मल पेपर रोल, जाम-मुक्त गहरी प्रिंटिंग।" },

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
  "Cash on Delivery (COD)": { mr: "कॅश ऑन डिलिव्हरी (सीओडी)", hi: "कैश ऑन डिलीवरी (सीओडी)" },

  // Shop Names
  "CLASSIC MART": { mr: "क्लासिक मार्ट", hi: "क्लासिक मार्ट" },
  "CLASSIC MART & GROCERY": { mr: "क्लासिक मार्ट आणि किराणा", hi: "क्लासिक मार्ट और किराना" },
  "MINIMAL CAFE": { mr: "मिनिमल कॅफे", hi: "मिनिमल कैफे" },
  "MINIMAL CAFE & BAKERY": { mr: "मिनिमल कॅफे आणि बेकरी", hi: "मिनिमल कैफे और बेकरी" },
  "URBAN FASHION PRO": { mr: "अर्बन फॅशन प्रो", hi: "अर्बन फैशन प्रो" },
  "KRISHNA JUICE": { mr: "कृष्णा ज्यूस", hi: "कृष्णा जूस" },
  "KRISHNA JUICE & SHAKES": { mr: "कृष्णा ज्यूस आणि शेक्स", hi: "कृष्णा जूस और शेक्स" },
  "LUMINA BEAUTY & SPA": { mr: "लुमिना ब्यूटी आणि स्पा", hi: "लुमिना ब्यूटी और स्पा" },
  "Lumina Boutique & Spa": { mr: "लुमिना बुटीक आणि स्पा", hi: "लुमिना बुटीक और स्पा" },
  "TECHNO COMPUTERS & PERIPHERALS": { mr: "टेक्नो कॉम्प्युटर्स आणि पेरीफेरेल्स", hi: "टेक्नो कंप्यूटर्स और पेरीफेरेल्स" },
  "Techno Corp": { mr: "टेक्नो कॉर्प", hi: "टेक्नो कॉर्प" },
  "HYDRABADI BIRYANI , CHOPDA": { mr: "हैद्राबादी बिर्याणी, चोपडा", hi: "हैदराबादी बिरयानी, चोपड़ा" },
  "Hydrabadi Biryani , Chopda": { mr: "हैद्राबादी बिर्याणी, चोपडा", hi: "हैदराबादी बिरयानी, चोपड़ा" },
  "Slipzen Mart": { mr: "स्लिपझेन मार्ट", hi: "स्लिपज़ेन मार्ट" },
  "NEHA'S SHOP": { mr: "नेहाचे दुकान", hi: "नेहा की दुकान" },

  // User Guide Topics & Headings
  "SLIPZEN HELP CENTER & GUIDE": { mr: "स्लिपझेन मदत केंद्र आणि मार्गदर्शक", hi: "स्लिपज़ेन सहायता केंद्र और गाइड" },
  "Slipzen User Guide & Help Center": { mr: "स्लिपझेन वापरकर्ता मार्गदर्शक आणि मदत केंद्र", hi: "स्लिपज़ेन उपयोगकर्ता गाइड और सहायता केंद्र" },
  "4-Step Quick Launch Checklist": { mr: "४-टप्प्यांची जलद सुरुवात चेकलिस्ट", hi: "४-चरणीय त्वरित लॉन्च चेकलिस्ट" },
  "Get fully operational in under 3 minutes": { mr: "३ मिनिटांपेक्षा कमी वेळात पूर्णपणे कार्यरत व्हा", hi: "३ मिनट से भी कम समय में पूरी तरह चालू हों" },
  "Set Up Shop Profile": { mr: "दुकान प्रोफाइल सेट करा", hi: "दुकान प्रोफ़ाइल सेट करें" },
  "Configure your business name, address, GSTIN, phone, and upload your shop logo.": {
    mr: "तुमच्या दुकानाचे नाव, पत्ता, जीएसटी क्रमांक, फोन कॉन्फिगर करा आणि दुकान लोगो अपलोड करा.",
    hi: "अपना व्यवसाय नाम, पता, जीएसटी नंबर, फोन कॉन्फ़िगर करें और अपना दुकान लोगो अपलोड करें।"
  },
  "Configure Shop": { mr: "दुकान कॉन्फिगर करा", hi: "दुकान कॉन्फ़िगर करें" },
  "Add Products & Inventory": { mr: "उत्पादने आणि इन्व्हेंटरी जोडा", hi: "उत्पाद और इन्वेंट्री जोड़ें" },
  "Add your items with prices, stock levels, and barcodes, or bulk import via CSV.": {
    mr: "किंमत, स्टॉक पातळी आणि बारकोडसह वस्तू जोडा किंवा सीएसव्हीद्वारे एकत्र आयात करा.",
    hi: "कीमतों, स्टॉक स्तरों और बारकोड के साथ अपने आइटम जोड़ें, या सीएसवी के माध्यम से थोक आयात करें।"
  },
  "Manage Items": { mr: "वस्तू व्यवस्थापित करा", hi: "आइटम प्रबंधित करें" },
  "Select Receipt Template": { mr: "पावती टेम्प्लेट निवडा", hi: "रसीद टेम्पलेट चुनें" },
  "Choose between 58mm, 80mm thermal formats or full A4/A5 tax invoice layouts.": {
    mr: "५८मिमी, ८०मिमी थर्मल फॉरमॅट किंवा पूर्ण ए४/ए५ कर बीजक लेआउट निवडा.",
    hi: "58मिमी, 80मिमी थर्मल प्रारूपों या पूर्ण ए4/ए5 टैक्स इनवॉइस लेआउट में से चुनें।"
  },
  "View Templates": { mr: "टेम्प्लेट्स पहा", hi: "टेम्पलेट्स देखें" },
  "Create Your First Bill": { mr: "तुमचे पहिले बिल तयार करा", hi: "अपना पहला बिल बनाएं" },
  "Search items, apply discounts, choose payment method (Cash/UPI), and print in 1-click.": {
    mr: "वस्तू शोधा, सवलत लागू करा, पेमेंट पद्धत (रोख/यूपीआय) निवडा आणि १-क्लिकमध्ये प्रिंट करा.",
    hi: "आइटम खोजें, छूट लागू करें, भुगतान विधि (नकद/यूपीआई) चुनें, और 1-क्लिक में प्रिंट करें।"
  },
  "New Bill Desk": { mr: "नवीन बिल डेस्क", hi: "नया बिल डेस्क" },
  "Billing & Invoices": { mr: "बिलिंग आणि पावत्या", hi: "बिलिंग और चालान" },
  "Products & Barcodes": { mr: "उत्पादने आणि बारकोड", hi: "उत्पाद और बारकोड" },
  "Dine-In Tables & KOT": { mr: "डाइन-इन टेबल्स आणि केओटी", hi: "डाइन-इन टेबल्स और केओटी" },
  "Thermal Printers": { mr: "थर्मल प्रिंटर्स", hi: "थर्मल प्रिंटर" },
  "Bill Templates": { mr: "बिल टेम्प्लेट्स", hi: "बिल टेम्पलेट्स" },
  "Reports & Udhar": { mr: "अहवाल आणि उधारी", hi: "रिपोर्ट और उधार" },
  "Frequently Asked Questions": { mr: "सतत विचारले जाणारे प्रश्न (FAQ)", hi: "अक्सर पूछे जाने वाले प्रश्न (FAQ)" },
  "Need more assistance or custom setup?": { mr: "अधिक मदत किंवा सानुकूल सेटअप हवा आहे?", hi: "अधिक सहायता या कस्टम सेटअप की आवश्यकता है?" },
  "Our dedicated support team is here to help you configure printers, barcodes, and floor layouts.": {
    mr: "आमची टीम प्रिंटर, बारकोड आणि फ्लोर लेआउट कॉन्फिगर करण्यात मदत करण्यास तयार आहे.",
    hi: "हमारी समर्पित सहायता टीम प्रिंटर, बारकोड और फ़्लोर लेआउट कॉन्फ़िगर करने में आपकी मदद के लिए उपलब्ध है।"
  },
  "Contact Support": { mr: "सपोर्ट टीमशी संपर्क साधा", hi: "सपोर्ट टीम से संपर्क करें" },

  // User Guide Banner & Products
  "Product": { mr: "उत्पादने", hi: "उत्पाद" },
  "Products": { mr: "उत्पादने", hi: "उत्पाद" },
  "Add to inventory": { mr: "इन्व्हेंटरीचा साठा", hi: "इन्वेंट्री में जोड़ें" },
  "Slipzen User Guide & Quick Setup": { mr: "स्लिपझेन वापरकर्ता मार्गदर्शक आणि त्वरित सेटअप", hi: "स्लिपज़ेन उपयोगकर्ता गाइड और त्वरित सेटअप" },
  "Step-by-step instructions for thermal printers, barcode inventory, dine-in tables & billing.": {
    mr: "थर्मल प्रिंटर, बारकोड इन्व्हेंटरी, डाइन-इन टेबल आणि बिलिंगसाठी टप्प्याटप्प्याने मार्गदर्शक.",
    hi: "थर्मल प्रिंटर, बारकोड इन्वेंट्री, डाइन-इन टेबल और बिलिंग के लिए चरण-दर-चरण निर्देश।"
  },
  "Open Guide": { mr: "मार्गदर्शक उघडा", hi: "गाइड खोलें" },
  "Help": { mr: "मदत", hi: "मदद" },
  "Saved Bills": { mr: "जतन केलेली बिले", hi: "सहेजे गए बिल" },
  "Print Bills": { mr: "प्रिंट बिले", hi: "प्रिंट बिल" }
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
