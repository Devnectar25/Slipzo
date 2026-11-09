import i18n from "../i18n/i18n"

// Messages the server sends in English, and the translation key for each.
// The app shows the translated text; the original is kept on the error as `rawMessage`.
const API_MESSAGES = {
  "Invalid credentials": "apiErrors.invalidCredentials",
  "This mobile number is already registered": "apiErrors.mobileTaken",
  "This email is already registered": "apiErrors.emailTaken",
  "Email already registered": "apiErrors.emailTaken",
  "Please enter a valid 10-digit mobile number": "auth.err_mobile_invalid",
  "Please enter a valid email address or leave it blank": "auth.err_email",
  "Mobile number and password are required": "apiErrors.mobilePasswordRequired",
  "Mobile number, password, and name are required": "apiErrors.registerRequired",
  "Name must be at least 2 characters": "apiErrors.nameShort",
  "Password must be at least 8 characters and include uppercase, lowercase, number, and special character": "apiErrors.passwordRules",
  "Shop name must be between 2 and 100 characters": "apiErrors.shopNameLength",
  "Something went wrong on our side. Please try again.": "apiErrors.serverError",
  "Please sign in to buy prints.": "apiErrors.signInToBuy",
  "This payment has already been used.": "apiErrors.paymentUsed",
  "Authentication required": "apiErrors.sessionExpired",
  "Invalid token": "apiErrors.sessionExpired",
  "Token expired": "apiErrors.sessionExpired",
  "Invalid or expired token": "apiErrors.sessionExpired",
  "User not found": "apiErrors.sessionExpired",
  "No prints available in your print quota. Please purchase a plan to continue printing.": "apiErrors.quotaEmpty",
  "Only the shop owner can do this.": "apiErrors.ownerOnly",
  "Duplicate entry. This record already exists.": "apiErrors.duplicate",
  "That request is too large.": "apiErrors.tooLarge",
  "Payment verification is not configured on the server.": "apiErrors.payNotConfigured",
  "Could not reach the payment gateway to confirm the payment. Please try again.": "apiErrors.payGateway",
  "This payment could not be found.": "apiErrors.payNotFound",
  "This payment was not completed.": "apiErrors.payNotCompleted",
  "The amount paid does not cover this pack.": "apiErrors.payAmount",
  "Invalid payment id.": "apiErrors.payBadId",
  "Unexpected payment currency.": "apiErrors.payCurrency",
  "This payment does not belong to this order.": "apiErrors.payOrder",
  "Could not start the payment. Please try again.": "apiErrors.payStart",
  "Please choose a plan before finishing setup.": "apiErrors.planRequired",
  "You already started signing up with this mobile number. Sign in with the password you chose to continue.": "apiErrors.signupInProgress",
  "Something went wrong": "apiErrors.generic"
}

export const translateApiMessage = (message) => {
  const key = API_MESSAGES[String(message || "").trim()]
  return key ? i18n.t(key, { defaultValue: message }) : message
}

export const networkErrorMessage = () =>
  i18n.t("apiErrors.network", { defaultValue: "Could not connect to the server. Please check your internet connection." })

// Plan names come from the server in English ("Free Starter Tier", "Pro Growth", ...)
const PLAN_NAMES = {
  "Free Starter Tier": "plans.freeStarter",
  "Starter Pack": "planGate.starter.name",
  "Pro Growth": "planGate.pro.name",
  "Business Super": "planGate.business.name",
  "Custom Print Pack": "plans.custom",
  "Active Plan": "plans.active",
  "New Account (Pending Setup)": "plans.pendingSetup",
  "No Plan": "plans.none"
}

export const translatePlanName = (name) => {
  const key = PLAN_NAMES[String(name || "").trim()]
  return key ? i18n.t(key, { defaultValue: name }) : name
}
