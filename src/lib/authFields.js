// Field rules shared by sign up, sign in and forgot password

export const PASSWORD_RULES = [
  { 
    id: "length", 
    label: "At least 8 characters", 
    test: (pwd) => /.{8,}/.test(pwd) 
  },
  { 
    id: "uppercase", 
    label: "At least 1 uppercase letter (A-Z)", 
    test: (pwd) => /(?=.*[A-Z])/.test(pwd) 
  },
  { 
    id: "lowercase", 
    label: "At least 1 lowercase letter (a-z)", 
    test: (pwd) => /(?=.*[a-z])/.test(pwd) 
  },
  { 
    id: "number", 
    label: "At least 1 number (0-9)", 
    test: (pwd) => /(?=.*[0-9])/.test(pwd) 
  },
  { 
    id: "special", 
    label: "At least 1 symbol like !@#$%^&*", 
    test: (pwd) => /(?=.*?[#?!@$%^&*-])/.test(pwd) || /[#?!@$%^&*+\-=_~`(){}[\]|\\:;"'<>,./]/.test(pwd) 
  }
]

// "+91 98765-43210", "09876543210" and "9876543210" are all the same number
export const normalizeMobile = (value) => {
  let digits = String(value || "").replace(/[\s\-().]/g, "")
  if (digits.startsWith("+")) digits = digits.slice(1)
  if (!/^\d+$/.test(digits)) return null
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1)
  return /^[6-9]\d{9}$/.test(digits) ? digits : null
}

// Strip non-digits and leading country/trunk prefix while typing or pasting a 10-digit mobile number
export const sanitizeMobileInput = (value) => {
  let raw = String(value || "").replace(/\D/g, "")
  if (raw.length === 12 && raw.startsWith("91")) raw = raw.slice(2)
  else if (raw.length === 11 && raw.startsWith("0")) raw = raw.slice(1)
  return raw.slice(0, 10)
}

// What is wrong with a mobile number, in words the person can act on. Returns null when the number is fine.
// [translation key, English text, values for the text]
export const mobileProblem = (value) => {
  const raw = String(value || "").trim()
  if (!raw) return ["auth.err_mobile_required", "Please enter your mobile number"]
  let digits = raw.replace(/[\s\-().]/g, "")
  if (digits.startsWith("+")) digits = digits.slice(1)
  if (!/^\d+$/.test(digits)) return ["auth.err_mobile_digits", "A mobile number can only contain digits (no letters or symbols)"]
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1)
  if (digits.length !== 10) return ["auth.err_mobile_length", "A mobile number has 10 digits. You entered {{n}}.", { n: digits.length }]
  if (!/^[6-9]/.test(digits)) return ["auth.err_mobile_start", "An Indian mobile number starts with 6, 7, 8 or 9"]
  return null
}
