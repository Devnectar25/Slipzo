// The three product pages opened from the cards under the landing hero.
// English text lives here; Hindi / Marathi are in the locale files under "featurePages.<id>.*".

export const FEATURE_PAGES = [
  {
    id: "token",
    view: "feature_token",
    path: "/token-system",
    tone: "blue",
    card: {
      title: "Token system",
      text: "Every bill carries a clear order number, so customers wait calmly and the counter calls them in order."
    },
    hero: {
      eyebrow: "TOKEN SYSTEM",
      title: "Serve the queue",
      accent: "in perfect order.",
      sub: "Each printed bill carries a big, clear order number. The customer keeps the slip, the kitchen sees the same number, and you call out who is next. No shouting, no mix-ups."
    },
    what: {
      title: "What is a token system?",
      text: "A token is the number a customer holds while their order is being prepared. In Slipzen, the bill number printed on every receipt works as that token. It goes up by one with every bill, starts with your own prefix, and is printed large so it can be read across the counter.",
      points: [
        "A new number on every bill, never repeated",
        "Your own prefix, like CAFE-0042",
        "Printed on 58mm and 80mm thermal paper",
        "Find any order again by its number in Bill history"
      ]
    },
    steps: [
      ["Take the order", "Tap the items at the counter and choose Cash, UPI or Card."],
      ["Print the token", "The receipt prints with the order number on top. Hand the slip to the customer."],
      ["Call the number", "When the order is ready, call the number. The customer shows the slip and collects."]
    ],
    businesses: [
      ["☕", "Cafes & tea stalls", "Quick orders at the counter, collected by number."],
      ["🍔", "Quick-service restaurants", "Pay first, eat after: the token links the payment to the plate."],
      ["🍰", "Bakeries & sweet shops", "Busy festival rush handled one number at a time."],
      ["🥤", "Juice & snack centres", "Fresh orders made in sequence while customers wait."],
      ["🍱", "Canteens & food stalls", "Office and college canteens with long lunch queues."],
      ["🍽️", "Hotels & dine-in", "Table orders and takeaway kept apart by their numbers."]
    ],
    benefits: [
      ["No lost orders", "Every order has a number on paper, so nothing is forgotten in the rush."],
      ["Fair waiting", "Customers are served in the order they paid. No arguments at the counter."],
      ["Faster counter", "Staff call one number instead of searching for faces in the crowd."]
    ]
  },
  {
    id: "inventory",
    view: "feature_inventory",
    path: "/inventory-management",
    tone: "blue",
    card: {
      title: "Inventory management",
      text: "Know how much stock you have. Every bill takes sold pieces out on its own, and low stock is flagged early."
    },
    hero: {
      eyebrow: "INVENTORY MANAGEMENT",
      title: "Always know",
      accent: "what is on your shelf.",
      sub: "Slipzen keeps the stock count for every product. Each bill takes the sold pieces out by itself, low stock is flagged before it runs out, and a bill can never sell more than you have."
    },
    what: {
      title: "What is inventory management?",
      text: "Inventory management means keeping an exact count of the goods in your shop. Instead of counting shelves by hand, Slipzen updates the count every time you bill, restock or remove damaged goods, and keeps a history of every change.",
      points: [
        "Opening stock when you add a product",
        "Stock taken out automatically on every bill",
        "Low-stock and out-of-stock alerts",
        "Full history: restock, sale, return, damage"
      ]
    },
    steps: [
      ["Add your products", "Set the price and how many pieces you have. Scan or type the barcode."],
      ["Bill as usual", "Every bill takes the sold pieces out of stock. A bill cannot sell more than you have."],
      ["Restock in seconds", "When new goods arrive, add them with one tap and see the new count straight away."]
    ],
    businesses: [
      ["🛒", "Kirana & grocery stores", "Hundreds of packets, each with its own count and barcode."],
      ["🏪", "Supermarkets & mini marts", "Fast barcode billing with stock that stays correct."],
      ["👗", "Cloth & garment shops", "Shirts, sarees and kurtas tracked piece by piece."],
      ["👠", "Boutiques & fashion stores", "Know which designs are selling and which to reorder."],
      ["👟", "Footwear & accessories", "Sizes and styles counted so you never promise what is gone."],
      ["📦", "General & wholesale stores", "Bulk stock with alerts before a best seller runs out."]
    ],
    benefits: [
      ["Never run out", "Low-stock alerts tell you what to reorder before the shelf is empty."],
      ["Stop losses", "Damaged, expired and returned goods are recorded, so the count stays honest."],
      ["Know your value", "See how much your stock is worth and which items sell the most."]
    ]
  },
  {
    id: "pos",
    view: "feature_pos",
    path: "/point-of-sale",
    tone: "blue",
    card: {
      title: "Point of Sale",
      text: "A complete billing counter: tap or scan items, take payment and print the receipt in seconds."
    },
    hero: {
      eyebrow: "POINT OF SALE",
      title: "Your whole counter,",
      accent: "in one simple app.",
      sub: "Bill customers in seconds on a phone, tablet or computer. Tap or scan items, take Cash, UPI or Card, and print on any 58mm, 80mm or A4 printer. Every sale is saved and counted."
    },
    what: {
      title: "What is a Point of Sale?",
      text: "A Point of Sale (POS) is the place where a sale is completed: the customer pays and gets a receipt. Slipzen turns your phone or computer into that counter, with your menu, your prices, your receipt design and a record of every bill.",
      points: [
        "Your menu with your own prices",
        "Barcode scanning with camera or scanner",
        "Cash, UPI and Card payments",
        "Today's sales and full bill history"
      ]
    },
    steps: [
      ["Set up your menu", "Pick items from the catalogue or add your own, with your selling price."],
      ["Bill in seconds", "Tap or scan items, change quantities and choose how the customer pays."],
      ["Print or share", "Print the receipt on your thermal printer, or save it as a PDF to share."]
    ],
    businesses: [
      ["☕", "Cafes, tea & snacks", "Small menus billed in a few taps at a busy counter."],
      ["🍽️", "Hotels & restaurants", "Table billing with a live bill preview for every table."],
      ["🛒", "Kirana & grocery", "Scan barcodes for fast billing with stock kept up to date."],
      ["👗", "Cloth & garments", "Clean A4 or thermal invoices for every customer."],
      ["🍰", "Bakeries & sweet shops", "Weighed and packed items billed quickly at rush hour."],
      ["💼", "Small businesses", "Any shop that sells over the counter and needs a receipt."]
    ],
    benefits: [
      ["Faster billing", "Your items are ready on screen, so a bill takes seconds, not minutes."],
      ["No mistakes", "Prices and totals are worked out for you, every time."],
      ["Know your day", "See today's sales, bills and best sellers the moment you need them."]
    ]
  }
]

export const featurePageByView = (view) => FEATURE_PAGES.find((p) => p.view === view) || null
export const featurePageByPath = (pathname) => {
  const clean = String(pathname || "").toLowerCase().replace(/\/+$/, "")
  return FEATURE_PAGES.find((p) => p.path === clean) || null
}
