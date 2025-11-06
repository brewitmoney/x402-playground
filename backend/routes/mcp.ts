import { Router, type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { withX402, type X402Config } from "agents/x402";
import { z } from "zod";

// X402 configuration for payment-enabled tools
const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://x402.org/facilitator";

const X402_CONFIG: X402Config = {
  network: "base-sepolia",
  recipient:
    (process.env.PAYEE_ADDRESS as `0x${string}`) || "0x958543756A4c7AC6fB361f0efBfeCD98E4D297Db" as `0x${string}`,
  facilitator: { url: FACILITATOR_URL as `${string}://${string}` } // Payment facilitator URL - can be overridden via FACILITATOR_URL env var
};

// Create MCP server with x402 payment support
// Note: In Express, we can reuse the server instance across requests
const baseServer = new McpServer({ name: "PayMCP", version: "1.0.0" });
const server = withX402(baseServer, X402_CONFIG);



// 1. Secure Password Generator
server.paidTool(
  "generate_password",
  "Generate a secure random password with customizable options",
  0.01, // USD
  {
    length: z.number().min(8).max(128).default(16).describe("Password length"),
    includeNumbers: z.boolean().default(true).describe("Include numbers"),
    includeSymbols: z.boolean().default(true).describe("Include special symbols"),
    includeUppercase: z.boolean().default(true).describe("Include uppercase letters"),
    includeLowercase: z.boolean().default(true).describe("Include lowercase letters")
  },
  {},
  async ({ length, includeNumbers, includeSymbols, includeUppercase, includeLowercase }) => {
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
      return { content: [{ type: "text", text: JSON.stringify({ error: "At least one character type must be enabled" }) }] };
    }
    
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    // Calculate strength
    let strength = "weak";
    if (length >= 12 && charset.length >= 60) strength = "strong";
    else if (length >= 8 && charset.length >= 40) strength = "medium";
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          password,
          length,
          strength,
          characterSetSize: charset.length,
          options: {
            includeNumbers,
            includeSymbols,
            includeUppercase,
            includeLowercase
          }
        }, null, 2)
      }]
    };
  }
);



// 2. URL Shortener using is.gd API (free and active)
server.paidTool(
  "shorten_url",
  "Shorten a long URL using is.gd service",
  0.02, // USD
  {
    url: z.string().url().describe("The URL to shorten")
  },
  {},
  async ({ url }) => {
    try {
      // Use is.gd API to shorten the URL (free, active API)
      const isGdApi = `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`;
      const response = await fetch(isGdApi);
      
      if (!response.ok) {
        throw new Error(`is.gd API error: ${response.statusText}`);
      }
      
      const data = await response.json() as { 
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
        content: [{
          type: "text",
          text: JSON.stringify({
            originalUrl: url,
            shortUrl: shortUrl,
            service: "is.gd",
            message: "URL shortened successfully using is.gd"
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: "Failed to shorten URL",
            message: error instanceof Error ? error.message : "Unknown error",
            originalUrl: url
          }, null, 2)
        }]
      };
    }
  }
);

// 7. Random Quote Generator (Free)
server.tool(
  "get_inspirational_quote",
  "Get a random inspirational quote",
  {
    category: z.enum(["motivation", "success", "wisdom", "creativity", "random"]).optional().default("random").describe("Quote category")
  },
  async ({ category }) => {
    const quotes: Record<string, string[]> = {
      motivation: [
        "The only way to do great work is to love what you do. - Steve Jobs",
        "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
        "Believe you can and you're halfway there. - Theodore Roosevelt"
      ],
      success: [
        "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
        "The way to get started is to quit talking and begin doing. - Walt Disney",
        "Innovation distinguishes between a leader and a follower. - Steve Jobs"
      ],
      wisdom: [
        "The only true wisdom is in knowing you know nothing. - Socrates",
        "Life is what happens to you while you're busy making other plans. - John Lennon",
        "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt"
      ],
      creativity: [
        "Creativity is intelligence having fun. - Albert Einstein",
        "The creative adult is the child who survived. - Ursula K. Le Guin",
        "Imagination is more important than knowledge. - Albert Einstein"
      ],
      random: [
        "The only way to do great work is to love what you do. - Steve Jobs",
        "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
        "The only true wisdom is in knowing you know nothing. - Socrates",
        "Creativity is intelligence having fun. - Albert Einstein",
        "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt"
      ]
    };
    
    const categoryQuotes = quotes[category] || quotes.random;
    const randomQuote = categoryQuotes[Math.floor(Math.random() * categoryQuotes.length)];
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          quote: randomQuote,
          category: category,
          message: `Here's a ${category} quote for you!`
        }, null, 2)
      }]
    };
  }
);

const router: Router = Router();

// HTTP endpoint for MCP
router.post("/", async (req: Request, res: Response) => {
  // Create a new transport for each request to prevent request ID collisions
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  res.on("close", () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Health check endpoint for MCP
router.get("/health", (_req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    service: "pay-mcp-server",
    network: X402_CONFIG.network,
    recipient: X402_CONFIG.recipient,
    facilitator: X402_CONFIG.facilitator.url
  });
});

export default router;

