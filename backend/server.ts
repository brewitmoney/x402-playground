// CRITICAL: Import fetch patch FIRST before any x402-related imports
// This ensures the patch is applied before agents/x402 or x402-express initialize
import express, { type Request, type Response } from "express";
import cors from "cors";
import agentRoutes from "./routes/agent.js";
import x402EndpointRoutes from "./routes/x402-endpoint.js";
import mcpRoutes from "./routes/mcp.js";
import { paymentMiddleware } from "x402-express";


const app = express();

const PORT = process.env.BACKEND_PORT ? parseInt(process.env.BACKEND_PORT) : 3001;

// Middleware
app.use(cors());
app.use(express.json());



const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://facilitator.x402.rs";

console.log('[Config] Facilitator URL:', FACILITATOR_URL);
console.log('[Config] Payee Address:', process.env.PAYEE_ADDRESS || "0x958543756A4c7AC6fB361f0efBfeCD98E4D297Db");

app.use(paymentMiddleware(
    process.env.PAYEE_ADDRESS as `0x${string}` || "0x958543756A4c7AC6fB361f0efBfeCD98E4D297Db" as `0x${string}`, // your receiving wallet address
    {  // Route configurations for protected endpoints
        // Password Generator - $0.01 (same as MCP server)
        "POST /api/x402-endpoint/generate-password": {
          price: "$0.01",
          network: "base-sepolia",
        },
        // URL Shortener - $0.01 (same as MCP server)
        "POST /api/x402-endpoint/shorten-url": {
          price: "$0.02",
          network: "base-sepolia",
        },
        // Quote endpoint is free - no payment required
      },
    {
      url: FACILITATOR_URL as `${string}://${string}`, // Facilitator URL - can be overridden via FACILITATOR_URL env var
    }
  ));

// Routes
app.use("/api/agent", agentRoutes);
app.use("/api/x402-endpoint", x402EndpointRoutes);
app.use("/mcp", mcpRoutes);

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "x402-backend" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Agent endpoint: http://localhost:${PORT}/api/agent`);
  console.log(`x402 endpoint: http://localhost:${PORT}/api/x402-endpoint`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`MCP health check: http://localhost:${PORT}/mcp/health`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down backend server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Shutting down backend server...");
  process.exit(0);
});

