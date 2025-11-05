import { Router, type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { withX402, type X402Config } from "agents/x402";
import { z } from "zod";

// X402 configuration for payment-enabled tools
const X402_CONFIG: X402Config = {
  network: "base-sepolia",
  recipient:
    (process.env.PAYEE_ADDRESS as `0x${string}`) || "0x958543756A4c7AC6fB361f0efBfeCD98E4D297Db" as `0x${string}`,
  facilitator: { url: "https://x402.org/facilitator" } // Payment facilitator URL
};

// Create MCP server with x402 payment support
// Note: In Express, we can reuse the server instance across requests
const baseServer = new McpServer({ name: "PayMCP", version: "1.0.0" });
const server = withX402(baseServer, X402_CONFIG);

//Register paid tool (requires payment)
server.paidTool(
  "square",
  "Squares a number",
  0.01, // USD
  { number: z.number() },
  {},
  async ({ number }) => {
    return { content: [{ type: "text", text: String(number ** 2) }] };
  }
);

// Register free tool (no payment required)
server.tool(
  "echo",
  "Echo a message",
  { message: z.string() },
  async ({ message }) => {
    return { content: [{ type: "text", text: message }] };
  }
);

// Register free tool (no payment required)
server.tool(
  "greet",
  "Returns a greeting message",
  { name: z.string() },
  async ({ name }) => {
    return {
      content: [{ type: "text", text: `Hello, ${name ?? "World"}! sdsd` }]
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

