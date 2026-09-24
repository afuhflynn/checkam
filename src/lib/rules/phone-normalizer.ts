export type TelecomOperator = "MTN" | "ORANGE" | "NEXTTEL" | "CAMTEL" | "UNKNOWN";

export interface NormalizedCameroonPhone {
  original: string;
  normalized: string; // E.164: +2376XXXXXXXX
  localNumber: string; // 9 digits: 6XXXXXXXX
  operator: TelecomOperator;
  isValid: boolean;
}

export function normalizeCameroonPhone(phoneInput: string): NormalizedCameroonPhone {
  // Strip all non-digit characters except leading +
  const digitsOnly = phoneInput.replace(/[^0-9]/g, "");

  let localNumber = "";

  if (digitsOnly.startsWith("237") && digitsOnly.length === 12) {
    localNumber = digitsOnly.slice(3);
  } else if (digitsOnly.startsWith("00237") && digitsOnly.length === 14) {
    localNumber = digitsOnly.slice(5);
  } else if (digitsOnly.length === 9) {
    localNumber = digitsOnly;
  } else if (digitsOnly.length === 8) {
    // Old 8-digit format from pre-2014, legacy check
    localNumber = `6${digitsOnly}`;
  }

  const isValid = localNumber.length === 9 && ["2", "6"].includes(localNumber.charAt(0));

  let operator: TelecomOperator = "UNKNOWN";

  if (isValid) {
    const prefix2 = localNumber.slice(0, 2);
    const prefix3 = localNumber.slice(0, 3);

    // MTN Cameroon: 67X, 68X, 650-654
    if (
      prefix2 === "67" ||
      prefix2 === "68" ||
      ["650", "651", "652", "653", "654"].includes(prefix3)
    ) {
      operator = "MTN";
    }
    // Orange Cameroun: 69X, 655-659
    else if (prefix2 === "69" || ["655", "656", "657", "658", "659"].includes(prefix3)) {
      operator = "ORANGE";
    }
    // Nexttel (Viettel): 66X
    else if (prefix2 === "66") {
      operator = "NEXTTEL";
    }
    // Camtel: 62X, 222, 233, 242, 243
    else if (prefix2 === "62" || ["222", "233", "242", "243"].includes(prefix3)) {
      operator = "CAMTEL";
    }
  }

  const normalized = isValid ? `+237${localNumber}` : phoneInput.trim();

  return {
    original: phoneInput,
    normalized,
    localNumber,
    operator,
    isValid,
  };
}

export function extractCameroonPhoneNumbers(text: string): NormalizedCameroonPhone[] {
  // Regex to match Cameroonian phone variations: (+237 or 237 or raw 6XX-XX-XX-XX)
  const phoneRegex =
    /(?:\+?237\s?)?(?:6\d{2}[-\s]?\d{2}[-\s]?\d{2}[-\s]?\d{2}|2\d{2}[-\s]?\d{2}[-\s]?\d{2}[-\s]?\d{2})/g;
  const matches = text.match(phoneRegex) || [];

  const results: NormalizedCameroonPhone[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const parsed = normalizeCameroonPhone(match);
    if (parsed.isValid && !seen.has(parsed.normalized)) {
      seen.add(parsed.normalized);
      results.push(parsed);
    }
  }

  return results;
}
