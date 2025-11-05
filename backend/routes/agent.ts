import { Router, type Request, type Response } from "express";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { generateText, CoreMessage, dynamicTool, jsonSchema } from "ai";
import { openai } from "@ai-sdk/openai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { privateKeyToAccount } from "viem/accounts";
import { withX402Client, type X402ClientConfig } from "agents/x402";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { PaymentRequirements } from "x402/types";
import dotenv from "dotenv";
dotenv.config();

const router: Router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { messages, accountAddress, confirmPayment, paymentRequirements: confirmedPaymentRequirements } = req.body;
    
    // Store payment requirements to return in response
    let paymentRequirements: PaymentRequirements[] | null = null;

    // Payment confirmation handler - returns true if payment is confirmed, false otherwise
    async function onPaymentRequired(
      requirements: PaymentRequirements[]
    ): Promise<boolean> {
      if (requirements.length === 0) {
        return false;
      }
      
      // If payment is confirmed from frontend, return true
      if (confirmPayment && confirmedPaymentRequirements) {
        // Verify the payment requirements match
        const req = requirements[0];
        const confirmedReq = Array.isArray(confirmedPaymentRequirements) 
          ? confirmedPaymentRequirements[0] 
          : confirmedPaymentRequirements;
        
        if (req.payTo === confirmedReq.payTo && 
            req.maxAmountRequired === confirmedReq.maxAmountRequired &&
            req.resource === confirmedReq.resource) {
          const amountUSD = Number(req.maxAmountRequired) / 1e6;
          console.log("\n=== Payment Confirmed ===");
          console.log(`Resource: ${req.resource || "N/A"}`);
          console.log(`Pay to: ${req.payTo || "N/A"}`);
          console.log(`Network: ${req.network || "N/A"}`);
          console.log(`Amount: $${amountUSD.toFixed(6)} USD`);
          console.log("Proceeding with payment...\n");
          return true;
        }
      }
      
      // Store payment requirements to return in response
      paymentRequirements = requirements;
      
      // Log payment details
      const req = requirements[0];
      const amountUSD = Number(req.maxAmountRequired) / 1e6;
      console.log("\n=== Payment Required ===");
      console.log(`Resource: ${req.resource || "N/A"}`);
      console.log(`Pay to: ${req.payTo || "N/A"}`);
      console.log(`Network: ${req.network || "N/A"}`);
      console.log(`Amount: $${amountUSD.toFixed(6)} USD`);
      console.log(`Asset: ${req.asset || "N/A"}`);
      console.log("=======================\n");
      
      // Return false to pause - frontend will handle confirmation
      return false;
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    if (!accountAddress) {
      return res.status(400).json({ error: "Account address is required" });
    }

    // MCP server URL
    const mcpServerUrl = process.env.MCP_SERVER_URL || process.env.NEXT_PUBLIC_MCP_SERVER_URL || "http://localhost:3001/mcp";

    // Create account from private key (for server-side signing)
    const privateKey = process.env.PAYMENT_PRIVATE_KEY;
    if (!privateKey) {
      return res.status(500).json({ error: "Payment private key not configured" });
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);

    console.log("account", account.address);

    const client = new Client(
      {
        name: "x402-mcp-client",
        version: "1.0.0"
      },
      {
        capabilities: {}
      }
    );
    const transport = new StreamableHTTPClientTransport(new URL(mcpServerUrl));
    await client.connect(transport);

    // Wrap client with x402 payment support
    const x402Config: X402ClientConfig = {
      network: "base-sepolia",
      account,
      confirmationCallback: onPaymentRequired
    };

    const x402Client = withX402Client(client, x402Config);
    console.log("x402Client", x402Client);

    const { tools: mcpTools } = await x402Client.listTools();
    console.log(`✓ Found ${mcpTools.length} tool(s):`);

    // Convert MCP tools array to AI SDK ToolSet (object keyed by tool name)
    const tools = Object.fromEntries(
      (mcpTools as Tool[]).map((mcpTool) => [
        mcpTool.name,
        dynamicTool({
          description: mcpTool.description || "",
          inputSchema: jsonSchema((mcpTool.inputSchema || {}) as unknown as Parameters<typeof jsonSchema>[0]),
          execute: async (args: unknown) => {
            const result = await x402Client.callTool(null, {
              name: mcpTool.name,
              arguments: args as Record<string, unknown>,
            });
            if (result.isError) {
              const errorText = result.content[0]?.text;
              throw new Error(typeof errorText === "string" ? errorText : "Tool execution failed");
            }
            const textContent = result.content.find((c: { type?: string; text?: string }) => c.type === "text");
            return (textContent?.text as string) || JSON.stringify(result.content);
          },
        }),
      ])
    );

    // Convert messages to CoreMessage format
    const coreMessages: CoreMessage[] = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    }));

    // Use the tools with your AI model
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      tools,
      messages: coreMessages,
    });

    const toolCalls: Array<{
      toolName: string;
      toolCallId: string;
      input: unknown;
      output: unknown;
      isError: boolean;
      paymentRequired?: {
        network: string;
        maxAmountRequired: string;
        payTo: string;
        asset: string;
        resource: string;
        description: string;
        mimeType: string;
        maxTimeoutSeconds: number;
        extra?: Record<string, unknown>;
      };
    }> = [];

    // Iterate through steps to find tool calls and their results
    for (const step of result.steps || []) {
      if ('content' in step && Array.isArray(step.content)) {
        const toolCallItems = step.content.filter((item: unknown) => 
          typeof item === 'object' && item !== null && 'type' in item && item.type === 'tool-call'
        );
        const toolResultItems = step.content.filter((item: unknown) => 
          typeof item === 'object' && item !== null && 'type' in item && item.type === 'tool-result'
        );

        for (const toolCallItem of toolCallItems) {
          const toolCall = toolCallItem as {
            toolCallId: string;
            toolName: string;
            input: unknown;
          };
          
          const toolResult = toolResultItems.find((item: unknown) => {
            const result = item as { toolCallId?: string };
            return result.toolCallId === toolCall.toolCallId;
          }) as {
            toolName: string;
            input: unknown;
            output?: {
              _meta?: {
                'x402/error'?: {
                  network: string;
                  maxAmountRequired: string;
                  payTo: string;
                  asset: string;
                  resource: string;
                  description: string;
                  mimeType: string;
                  maxTimeoutSeconds: number;
                  extra?: Record<string, unknown>;
                };
              };
              content?: Array<{ type: string; text?: string }>;
              isError?: boolean;
            };
          } | undefined;

          if (toolResult) {
            const output = toolResult.output;
            let paymentRequired = undefined;
            
            if (output?._meta?.['x402/error']) {
              const x402Error = output._meta['x402/error'] as {
                accepts?: Array<{
                  network?: string;
                  maxAmountRequired?: string;
                  payTo?: string;
                  asset?: string;
                  resource?: string;
                  description?: string;
                  mimeType?: string;
                  maxTimeoutSeconds?: number;
                  extra?: Record<string, unknown>;
                }>;
                network?: string;
                maxAmountRequired?: string;
                payTo?: string;
                asset?: string;
                resource?: string;
                description?: string;
                mimeType?: string;
                maxTimeoutSeconds?: number;
                extra?: Record<string, unknown>;
              };
              
              const accept = Array.isArray(x402Error.accepts) && x402Error.accepts.length > 0
                ? x402Error.accepts[0]
                : x402Error;
              
              paymentRequired = {
                network: accept.network || '',
                maxAmountRequired: accept.maxAmountRequired || '',
                payTo: accept.payTo || '',
                asset: accept.asset || '',
                resource: accept.resource || '',
                description: accept.description || '',
                mimeType: accept.mimeType || '',
                maxTimeoutSeconds: accept.maxTimeoutSeconds || 300,
                extra: accept.extra,
              };
            }

            let outputText: unknown = output;
            if (output?.content && Array.isArray(output.content)) {
              const textContent = output.content.find((item) => item.type === 'text');
              if (textContent && 'text' in textContent) {
                try {
                  outputText = JSON.parse(textContent.text as string);
                } catch {
                  outputText = textContent.text;
                }
              }
            }

            toolCalls.push({
              toolName: toolCall.toolName,
              toolCallId: toolCall.toolCallId,
              input: toolCall.input || {},
              output: outputText,
              isError: output?.isError || false,
              paymentRequired,
            });
          }
        }
      }
    }

    console.log("=== EXTRACTED TOOL CALLS ===");
    console.log(JSON.stringify(toolCalls, null, 2));

    // Clean up MCP client
    await client.close();

    // Return JSON response
    res.json({
      text: result.text || "No response generated",
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      paymentRequired: paymentRequirements || undefined,
    });
  } catch (error) {
    console.error("Error in agent route:", error);
    res.status(500).json({ error: "Failed to process message" });
  }
});

export default router;

