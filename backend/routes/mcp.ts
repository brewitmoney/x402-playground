import { Router, type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { withX402, type X402Config } from "agents/x402";
import { z } from "zod";
import { generatePassword, shortenUrl, getInspirationalQuote, type QuoteCategory } from "../lib/services.js";

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
    try {
      const result = generatePassword({
        length,
        includeNumbers,
        includeSymbols,
        includeUppercase,
        includeLowercase,
      });
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : "Failed to generate password"
          })
        }]
      };
    }
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
      const result = await shortenUrl(url);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
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

// 3. Random Quote Generator (Free)
server.tool(
  "get_inspirational_quote",
  "Get a random inspirational quote",
  {
    category: z.enum(["motivation", "success", "wisdom", "creativity", "random"]).optional().default("random").describe("Quote category")
  },
  async ({ category = "random" }) => {
    const result = getInspirationalQuote(category as QuoteCategory);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
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

