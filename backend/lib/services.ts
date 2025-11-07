/**
 * Shared service functions for MCP server and x402 endpoints
 */

export interface PasswordOptions {
  length?: number;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
}

export interface PasswordResult {
  password: string;
  length: number;
  strength: "weak" | "medium" | "strong";
  characterSetSize: number;
  options: {
    includeNumbers: boolean;
    includeSymbols: boolean;
    includeUppercase: boolean;
    includeLowercase: boolean;
  };
}

/**
 * Generate a secure random password
 */
export function generatePassword(options: PasswordOptions = {}): PasswordResult {
  const {
    length = 16,
    includeNumbers = true,
    includeSymbols = true,
    includeUppercase = true,
    includeLowercase = true,
  } = options;

  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  let charset = "";
  if (includeLowercase) charset += lowercase;
  if (includeUppercase) charset += uppercase;
  if (includeNumbers) charset += numbers;
  if (includeSymbols) charset += symbols;

  if (charset.length === 0) {
    throw new Error("At least one character type must be enabled");
  }

  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  // Calculate strength
  let strength: "weak" | "medium" | "strong" = "weak";
  if (length >= 12 && charset.length >= 60) strength = "strong";
  else if (length >= 8 && charset.length >= 40) strength = "medium";

  return {
    password,
    length,
    strength,
    characterSetSize: charset.length,
    options: {
      includeNumbers,
      includeSymbols,
      includeUppercase,
      includeLowercase,
    },
  };
}

export interface ShortenUrlResult {
  originalUrl: string;
  shortUrl: string;
  service: string;
  message: string;
}

/**
 * Shorten a URL using is.gd API
 */
export async function shortenUrl(url: string): Promise<ShortenUrlResult> {
  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Use is.gd API to shorten the URL
  const isGdApi = `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`;
  const response = await fetch(isGdApi);

  if (!response.ok) {
    throw new Error(`is.gd API error: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    shorturl?: string;
    errorcode?: number;
    errormessage?: string;
  };

  // Check if there's an error in the response
  if (data.errorcode) {
    throw new Error(data.errormessage || "Failed to shorten URL");
  }

  const shortUrl = data.shorturl;

  // Validate that we got a valid short URL
  if (!shortUrl || !shortUrl.startsWith("https://is.gd/")) {
    throw new Error("Invalid response from is.gd API");
  }

  return {
    originalUrl: url,
    shortUrl: shortUrl,
    service: "is.gd",
    message: "URL shortened successfully using is.gd",
  };
}

export type QuoteCategory = "motivation" | "success" | "wisdom" | "creativity" | "random";

export interface QuoteResult {
  quote: string;
  category: QuoteCategory;
  message: string;
}

/**
 * Get a random inspirational quote
 */
export function getInspirationalQuote(category: QuoteCategory = "random"): QuoteResult {
  const quotes: Record<QuoteCategory, string[]> = {
    motivation: [
      "The only way to do great work is to love what you do. - Steve Jobs",
      "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
      "Believe you can and you're halfway there. - Theodore Roosevelt",
    ],
    success: [
      "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
      "The way to get started is to quit talking and begin doing. - Walt Disney",
      "Innovation distinguishes between a leader and a follower. - Steve Jobs",
    ],
    wisdom: [
      "The only true wisdom is in knowing you know nothing. - Socrates",
      "Life is what happens to you while you're busy making other plans. - John Lennon",
      "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
    ],
    creativity: [
      "Creativity is intelligence having fun. - Albert Einstein",
      "The creative adult is the child who survived. - Ursula K. Le Guin",
      "Imagination is more important than knowledge. - Albert Einstein",
    ],
    random: [
      "The only way to do great work is to love what you do. - Steve Jobs",
      "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
      "The only true wisdom is in knowing you know nothing. - Socrates",
      "Creativity is intelligence having fun. - Albert Einstein",
      "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
    ],
  };

  const validCategories: QuoteCategory[] = ["motivation", "success", "wisdom", "creativity", "random"];
  const selectedCategory = validCategories.includes(category) ? category : "random";
  const categoryQuotes = quotes[selectedCategory] || quotes.random;
  const randomQuote = categoryQuotes[Math.floor(Math.random() * categoryQuotes.length)];

  return {
    quote: randomQuote,
    category: selectedCategory,
    message: `Here's a ${selectedCategory} quote for you!`,
  };
}

