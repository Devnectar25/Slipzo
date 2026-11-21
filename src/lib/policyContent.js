// Full text of the three policy pages (loaded only with the policy page). Addresses and labels: policyPages.js
// The short first-open agreement on Android lives in legalContent.js.

import { SUPPORT_EMAIL } from "./legalContent"

export const POLICY_EFFECTIVE_DATE = "21 November 2026"
export const POLICY_CONTACT = {
  email: SUPPORT_EMAIL,
  address: "Indiranagar, Bengaluru, Karnataka, India",
  hours: "Monday to Saturday, 9 AM to 8 PM IST"
}

const DOCS = [
  {
    id: "terms",
    view: "policy_terms",
    path: "/terms-and-conditions",
    aliases: ["/terms", "/terms-of-service", "/policies", "/legal"],
    navLabel: "Terms & Conditions",
    title: "Terms & Conditions",
    summary: "The rules for using Slipzen: your account, print packs and payments, refunds, your data and our responsibilities.",
    intro: "These Terms & Conditions (the \"Terms\") are an agreement between you and Slipzen (\"Slipzen\", \"we\", \"us\"). They apply when you use the Slipzen website, the web app and the Slipzen Android app (together, the \"Service\"). By creating an account or using the Service you agree to these Terms. If you do not agree, please do not use the Service.",
    sections: [
      {
        id: "service",
        h: "1. What Slipzen is",
        p: [
          "Slipzen is a billing and receipt-printing tool for shops, cafes, restaurants and other small businesses. It lets you keep a menu or item list, create bills, print receipts on thermal or A4 printers, save bills as PDF, track stock, bill restaurant tables and see your daily sales.",
          "Slipzen is a software tool. It does not sell goods to your customers, does not collect money on your behalf and does not give tax, legal or accounting advice."
        ]
      },
      {
        id: "eligibility",
        h: "2. Who can use Slipzen",
        list: [
          "You must be at least 18 years old, or use Slipzen with the permission and supervision of a parent or guardian.",
          "You must use Slipzen for a genuine business that you own or are allowed to run.",
          "The details you give us (name, mobile number, shop name, address) must be true and kept up to date."
        ]
      },
      {
        id: "account",
        h: "3. Your account and security",
        list: [
          "Your account is linked to your mobile number, which we verify with a one-time code (OTP). Keep your password private and do not share your account.",
          "You are responsible for everything done through your account, including bills created and prints used.",
          "Staff access: when you invite a worker with an invite code, that worker can create bills, print and manage tables for your shop. You are responsible for the actions of the staff you invite. You can remove a worker at any time from Shop Profile.",
          "Tell us straight away at " + SUPPORT_EMAIL + " if you think someone else has used your account."
        ]
      },
      {
        id: "plans",
        h: "4. Print packs, plans and payments",
        list: [
          "Printing receipts needs print credits. You can buy a print pack (a fixed number of prints) or, where offered, a time-based plan (unlimited prints for a fixed period). The price, the number of prints or the validity period is shown before you pay.",
          "All prices are in Indian Rupees (₹). Prices may change in the future, but a change never affects a pack or plan you have already bought.",
          "Prints in a print pack do not expire while your account is active. A time-based plan ends at the end of its period.",
          "One print credit is used when a receipt is printed. In the Android app, a print you cancel does not use a credit. In a web browser, a receipt counts as printed once the print window closes. Saving or sharing a bill as PDF does not use a credit.",
          "Payments are processed by Razorpay, our payment partner. Your credits or plan are added only after the payment is confirmed. If money was taken but the credits do not appear, contact us with the payment ID and we will fix it.",
          "Print credits have no cash value and cannot be transferred to another account."
        ]
      },
      {
        id: "refunds",
        h: "5. Refunds and cancellations",
        list: [
          "If you were charged twice for the same purchase, or charged without receiving your credits, we will refund the extra payment or add the missing credits.",
          "You can ask for a refund of a print pack within 7 days of buying it, as long as none of its prints have been used. Prints that have been used, and time-based plans that have started, cannot be refunded.",
          "To ask for a refund, write to " + SUPPORT_EMAIL + " from your registered email or with your registered mobile number and the payment ID.",
          "Approved refunds are sent back to the original payment method through Razorpay, usually within 5 to 7 working days. Your bank may take longer to show the money."
        ]
      },
      {
        id: "supplies",
        h: "6. Supplies (printers and paper rolls)",
        list: [
          "The Supplies section shows thermal printers, paper rolls and other billing equipment. Some items can be ordered inside Slipzen, others open the seller's own page (for example an online marketplace).",
          "For orders placed inside Slipzen, you must give a correct delivery address and phone number. Delivery times shown are estimates.",
          "Products carry the manufacturer's warranty. If an item arrives damaged or not working, tell us within 48 hours of delivery with photos so we can arrange a replacement or refund.",
          "When you buy from another seller's page, that seller's own terms, prices and return rules apply."
        ]
      },
      {
        id: "your-data",
        h: "7. Your bills and business data",
        list: [
          "The items, prices, stock, bills and any customer details you enter belong to you. You give us permission to store and process them only so we can run the Service for you.",
          "You are responsible for the accuracy of your prices, taxes and bills, and for following the GST, tax, consumer and other laws that apply to your business.",
          "If you enter details of your customers on bills, you must have a lawful reason to do so and must handle them as the law requires.",
          "Bill history is shown in the app for a limited period. Download or print any bills you need to keep for your own records."
        ]
      },
      {
        id: "acceptable-use",
        h: "8. Acceptable use",
        p: ["You agree not to:"],
        list: [
          "use Slipzen for any unlawful, fraudulent or misleading sale or bill, including fake invoices;",
          "try to hack, break, overload, reverse-engineer or copy the Service or its receipt templates and catalogues;",
          "use another person's account, invite code or payment method without permission;",
          "upload harmful code or content that is illegal, offensive or infringes someone else's rights."
        ]
      },
      {
        id: "availability",
        h: "9. Availability of the Service",
        list: [
          "Slipzen needs an internet connection for signing in, saving bills, payments and most features.",
          "We work to keep the Service running, but it may sometimes be unavailable because of maintenance, updates or problems outside our control.",
          "Slipzen prints through your device's print system. We test common 58mm, 80mm and A4 printers, but we cannot promise that every printer model will work.",
          "We may add, change or remove features to improve the Service. If we remove a paid feature you have already paid for, we will offer a fair alternative or refund."
        ]
      },
      {
        id: "ip",
        h: "10. Our content and brand",
        p: [
          "The Slipzen name, logo, app, receipt templates, item catalogues and website content belong to Slipzen. We give you a limited, non-transferable right to use them through the Service for your own business. You may print and share receipts made with our templates freely."
        ]
      },
      {
        id: "termination",
        h: "11. Suspending or closing an account",
        list: [
          "You can stop using Slipzen at any time and ask us to delete your account.",
          "We may suspend or close an account that breaks these Terms, is used for fraud, or puts the Service or other users at risk. Where possible we will tell you first and explain why.",
          "If we close your account without a fault on your side, we will refund unused print credits."
        ]
      },
      {
        id: "liability",
        h: "12. Disclaimers and limits of liability",
        list: [
          "The Service is provided \"as is\" and \"as available\". We do our best to keep it accurate and working, but we do not promise it will be free of errors or interruptions.",
          "We are not responsible for losses caused by wrong prices or taxes entered by you, printer or device faults, internet outages, or the actions of your staff.",
          "To the extent the law allows, our total liability for any claim relating to the Service is limited to the amount you paid us in the 3 months before the claim.",
          "Nothing in these Terms limits any rights you have under Indian consumer protection law that cannot be excluded."
        ]
      },
      {
        id: "law",
        h: "13. Governing law and disputes",
        p: [
          "These Terms are governed by the laws of India. Please contact us first so we can try to solve any problem quickly and informally. If a dispute cannot be solved, the courts at Bengaluru, Karnataka will have jurisdiction."
        ]
      },
      {
        id: "changes",
        h: "14. Changes to these Terms",
        p: [
          "We may update these Terms from time to time. The date at the top shows the latest version. If a change is important, we will tell you in the app or ask you to accept the new Terms before you continue."
        ]
      },
      {
        id: "contact",
        h: "15. Contact and grievances",
        p: [
          "For questions, complaints or grievances about the Service, write to our Grievance Officer at " + SUPPORT_EMAIL + ". We will acknowledge your message within 48 hours and try to resolve it within 15 days."
        ]
      }
    ]
  },
  {
    id: "privacy",
    view: "policy_privacy",
    path: "/privacy-policy",
    aliases: ["/privacy"],
    navLabel: "Privacy Policy",
    title: "Privacy Policy",
    summary: "What information Slipzen collects, why we need it, who we share it with and the choices you have.",
    intro: "Your trust matters to us. This Privacy Policy explains what personal data Slipzen collects when you use our website, web app and Android app, how we use it and the rights you have. We follow the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000 of India. We do not sell your data and we do not show advertisements.",
    sections: [
      {
        id: "collect",
        h: "1. Information we collect",
        p: ["We collect only what we need to run a billing service for your shop:"],
        list: [
          "Account details: your name, mobile number, optional email address and password (stored only in encrypted, hashed form).",
          "Shop details: shop name, shop category, address, phone number, logo, GST details if you add them, invoice prefix and receipt settings.",
          "Business data: your menu or item list, prices, stock counts and stock history, restaurant tables, and the bills you create (items, amounts, discounts, taxes and payment mode).",
          "Customer details on bills: if you choose to type a customer's name or number on a bill, it is saved with that bill.",
          "Staff details: the mobile numbers of workers you invite to your shop.",
          "Purchase details: the plan or print pack you bought, your print credit balance, and payment records from Razorpay (payment ID, amount, status and time). Supplies orders also include the delivery address you give.",
          "Support messages: your name, email, phone and message when you contact us.",
          "Technical details: device and browser type, app version, IP address, and logs of errors and sign-ins, used to keep the Service secure and working."
        ]
      },
      {
        id: "not-collect",
        h: "2. Information we do not collect",
        list: [
          "We never see or store your card number, CVV, UPI PIN or net banking password. These are entered only on Razorpay's secure payment screen.",
          "We do not record your voice. When you use voice search, your device's speech service turns your words into text and only that text is used.",
          "We do not save camera images. The barcode scanner reads the code on your device and only the code number is used.",
          "We do not read your contacts, messages, photos or location."
        ]
      },
      {
        id: "use",
        h: "3. How we use your information",
        list: [
          "To create and secure your account, including sending one-time codes (OTP) to verify your mobile number and reset your password.",
          "To run the Service: save your menu, bills and stock, print receipts, show your sales reports and keep your data in sync across your devices and staff.",
          "To process payments, add print credits and deliver Supplies orders.",
          "To answer your questions and send important messages about your account, payments or changes to our policies.",
          "To find and fix problems, prevent fraud and misuse, and improve Slipzen.",
          "To meet our legal, tax and accounting obligations."
        ]
      },
      {
        id: "consent",
        h: "4. Consent and permissions",
        list: [
          "We process your data with your consent, which you give when you create an account and accept this policy, and where needed to provide the Service you asked for or to follow the law.",
          "The Android app asks for camera permission only when you open the barcode scanner, and microphone permission only when you tap the voice button. You can turn these off at any time in your phone's settings; the rest of Slipzen keeps working.",
          "You can withdraw your consent at any time by deleting your account. This does not affect anything we did lawfully before you withdrew it."
        ]
      },
      {
        id: "sharing",
        h: "5. Who we share information with",
        p: ["We share data only with trusted partners who help us run Slipzen, and only as much as they need:"],
        list: [
          "Razorpay, to process payments securely.",
          "Our hosting and cloud providers, who store our servers and databases.",
          "SMS and messaging providers, to deliver one-time codes.",
          "Delivery and logistics partners, for Supplies orders.",
          "Staff you invite, who can see your shop's menu, tables and bills while they have access.",
          "Government or law-enforcement authorities, when the law requires it, or to protect the rights and safety of our users and Slipzen."
        ],
        after: ["These partners must protect your data and may use it only to provide their service to us. We do not sell or rent your personal data to anyone."]
      },
      {
        id: "customers",
        h: "6. Your customers' data",
        p: [
          "If you enter details of your own customers on bills, you decide what is collected and why, and we store it only on your behalf to provide the Service. Please collect only what you need and tell your customers how you use it."
        ]
      },
      {
        id: "security",
        h: "7. How we protect your data",
        list: [
          "All data between your device and our servers travels over an encrypted (HTTPS) connection.",
          "Passwords are stored in hashed form, never as plain text.",
          "Access to your data inside Slipzen is limited to people who need it to support you.",
          "No system is 100% secure. If a data breach affects you, we will inform you and the authorities as the law requires."
        ]
      },
      {
        id: "retention",
        h: "8. How long we keep your data",
        list: [
          "We keep your account and business data while your account is active.",
          "When you delete your account, we delete or anonymise your personal data within 30 days, except records we must keep by law.",
          "Payment and invoice records are kept for as long as Indian tax and accounting laws require (currently up to 8 years).",
          "Some data saved in your browser or app (such as your language or a cached copy of your menu) stays on your device until you sign out, clear the app's data or uninstall the app."
        ]
      },
      {
        id: "rights",
        h: "9. Your rights",
        p: ["Under Indian data protection law you can:"],
        list: [
          "see the personal data we hold about you and how it is used;",
          "correct or update it (most details can be changed directly in Shop Profile);",
          "ask us to delete your account and personal data;",
          "withdraw consent you have given;",
          "nominate another person to use these rights if you die or become unable to;",
          "raise a grievance with us, and if you are not satisfied, with the Data Protection Board of India."
        ],
        after: ["To use any of these rights, write to " + SUPPORT_EMAIL + " from your registered email or with your registered mobile number. We will reply within 30 days."]
      },
      {
        id: "children",
        h: "10. Children",
        p: [
          "Slipzen is a business tool and is not meant for children under 18. We do not knowingly collect personal data from children. If you believe a child has given us personal data, contact us and we will delete it."
        ]
      },
      {
        id: "changes",
        h: "11. Changes to this policy",
        p: [
          "We may update this Privacy Policy when our Service or the law changes. The date at the top shows the latest version. If a change is important, we will tell you in the app before it applies."
        ]
      },
      {
        id: "contact",
        h: "12. Contact and Grievance Officer",
        p: [
          "For any privacy question, request or complaint, contact our Grievance Officer at " + SUPPORT_EMAIL + ", " + POLICY_CONTACT.address + ". We will acknowledge your message within 48 hours."
        ]
      }
    ]
  },
  {
    id: "cookies",
    view: "policy_cookies",
    path: "/cookie-policy",
    aliases: ["/cookies"],
    navLabel: "Cookie Policy",
    title: "Cookie Policy",
    summary: "How Slipzen uses cookies and browser storage. In short: only what the app needs to work, and no advertising or tracking.",
    intro: "This Cookie Policy explains how Slipzen uses cookies and similar technologies such as browser local storage on our website, web app and Android app. The short version: Slipzen does not use advertising cookies, tracking cookies or analytics trackers. We store only what the app needs to keep you signed in and to work quickly.",
    sections: [
      {
        id: "what",
        h: "1. What cookies and local storage are",
        p: [
          "Cookies are small text files that a website saves in your browser. Local storage and session storage are similar features that let a website or app keep small pieces of information on your device, such as your sign-in or your chosen language, so you do not have to enter them again every time."
        ]
      },
      {
        id: "use",
        h: "2. How Slipzen uses them",
        p: [
          "Slipzen itself does not set advertising or tracking cookies, and we do not use third-party analytics such as Google Analytics or Facebook Pixel. Instead, the app uses your device's local storage only for things that are strictly needed for it to work:"
        ],
        table: {
          head: ["What is stored", "Why", "How long"],
          rows: [
            ["Sign-in session (your login token and basic account details)", "Keeps you signed in so you do not have to log in on every visit", "Until you sign out"],
            ["Language choice", "Shows Slipzen in English, Hindi or Marathi as you chose", "Until you change it or clear site data"],
            ["Policy acceptance", "Remembers that you accepted our Terms and Privacy Policy in the Android app", "Until the policies change"],
            ["Saved copies of your shop, plan, menu and tables", "Makes screens open instantly and keeps billing working on a weak connection", "Until you sign out or clear site data"],
            ["Print settings, default template and printer name", "Prints with your chosen paper size and receipt design", "Until you change or clear them"],
            ["Setup progress", "Remembers which setup steps you have finished", "Until setup is complete"],
            ["Session storage (temporary)", "Helps the app recover after an update or a lost connection", "Until you close the tab or app"]
          ]
        },
        after: ["Because these items are essential for the Service, they do not need separate consent. Slipzen does not use them to track you across other websites."]
      },
      {
        id: "third-party",
        h: "3. Third-party services",
        list: [
          "Razorpay: when you buy a print pack, plan or supplies, Razorpay's secure payment window opens. Razorpay may set its own cookies to complete the payment and prevent fraud. These are covered by Razorpay's privacy and cookie policies.",
          "PDF tools: when you save a bill as PDF, the app may load a PDF library from a public content delivery network (such as cdnjs, jsDelivr or unpkg). Like any web request, these services receive your IP address, but they do not get your bill.",
          "External shops: some products in Supplies open the seller's own website (for example an online marketplace), which uses its own cookies under its own policies."
        ]
      },
      {
        id: "control",
        h: "4. Your choices",
        list: [
          "Signing out removes your sign-in session from the device.",
          "You can delete everything Slipzen has stored by clearing your browser's site data for Slipzen, or by clearing the app's storage in your phone's settings.",
          "You can block cookies and site data in your browser settings. If you block local storage, Slipzen will not be able to keep you signed in and some features will not work."
        ]
      },
      {
        id: "changes",
        h: "5. Changes to this policy",
        p: [
          "If we ever start using new kinds of cookies, such as analytics, we will update this policy and, where the law requires, ask for your consent first."
        ]
      },
      {
        id: "contact",
        h: "6. Contact us",
        p: [
          "Questions about cookies or storage? Write to " + SUPPORT_EMAIL + "."
        ]
      }
    ]
  }
]

export const policyContentById = (id) => DOCS.find((d) => d.id === id) || DOCS[0]
