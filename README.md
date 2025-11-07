# x402 Playground

A comprehensive playground project demonstrating x402 payment integration with both **MCP (Model Context Protocol) servers** and **traditional web APIs**. This project showcases how to build payment-enabled tools and services using x402, enabling monetization of MCP tools and API endpoints.

## 🚀 Features

### MCP Server Integration
- **Payment-enabled MCP tools** using x402
- **AI Agent integration** with multi-step tool calling
- **x402 mcp tool** support using Cloudflare [Agent x402 MCP](https://github.com/cloudflare/agents)

### Web API Endpoints
- **RESTful API endpoints** with x402 payment middleware
- **Shared service library** for code reuse between MCP and web APIs

### Available Tools/Services

#### Paid Services ($0.01 - $0.02)
- **Password Generator** - Generate secure random passwords with customizable options
- **URL Shortener** - Shorten URLs using is.gd service

#### Free Services
- **Inspirational Quotes** - Get random motivational quotes by category

### Frontend Features
- **Try with Agent** - Interactive chat interface with AI agent using MCP tools
- **Try Yourself** - Direct API testing interface with wallet integration
- **Real-time payment confirmation** with USDC balance display
- **Tool call visualization** with detailed execution results


## 🔧 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd x402-playground
```

### 2. Install dependencies

Each application has its own dependencies:

```bash
# Install frontend dependencies
cd frontend
pnpm install

# Install backend dependencies
cd ../backend
pnpm install
```

### 3. Environment Variables

#### Backend (`.env` in `backend/`)

```env
# Payment Configuration
PAYEE_ADDRESS=0x958543756A4c7AC6fB361f0efBfeCD98E4D297Db
PAYMENT_PRIVATE_KEY=your_private_key_here
FACILITATOR_URL=https://x402.org/facilitator

# Server Configuration
BACKEND_PORT=3001
MCP_SERVER_URL=http://localhost:3001/mcp

# OpenAI (for agent)
OPENAI_API_KEY=your_openai_api_key_here
```

#### Frontend (`.env.local` in `frontend/`)

```env
# Backend URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Thirdweb Configuration
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id

# Agent Configuration
NEXT_PUBLIC_AGENT_WALLET_ADDRESS=your_agent_wallet_address
```

## 🚀 Development

### Start both applications

From the root directory:

```bash
# Terminal 1: Start backend
pnpm backend:dev

# Terminal 2: Start frontend
pnpm frontend:dev
```

Or run them individually:

```bash
# Backend
cd backend
pnpm dev

# Frontend
cd frontend
pnpm dev
```

### Access the application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MCP Server**: http://localhost:3001/mcp
- **Health Check**: http://localhost:3001/health


## 📁 Project Structure

```
x402-playground/
├── backend/
│   ├── lib/
│   │   └── services.ts          # Shared service functions
│   ├── routes/
│   │   ├── agent.ts             # AI agent route with MCP integration
│   │   ├── mcp.ts               # MCP server with x402 payment support
│   │   └── x402-endpoint.ts     # REST API endpoints with payment middleware
│   └── server.ts                # Express server configuration
├── frontend/
│   ├── app/
│   │   ├── try-with-agent/      # AI agent chat interface
│   │   ├── try-yourself/        # Direct API testing interface
│   │   └── components/         # Reusable UI components
│   └── hooks/                   # Custom React hooks
└── README.md
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Express.js, TypeScript
- **Payment**: x402 protocol for USDC payments
- **AI**: Vercel AI SDK with OpenAI GPT-4o-mini
- **MCP**: Model Context Protocol SDK
- **Wallet**: Thirdweb for wallet integration
- **Blockchain**: Base Sepolia testnet

## 📋 Prerequisites

- **Node.js** 18+ 
- **pnpm** (or npm/yarn)
- **Wallet** with USDC on Base Sepolia testnet
- **OpenAI API Key** (for agent functionality)


## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Adding New Tools/Services

1. **Add to shared services** (`backend/lib/services.ts`):
   ```typescript
   export function myNewService(params: MyParams): MyResult {
     // Implementation
   }
   ```

2. **Add to MCP server** (`backend/routes/mcp.ts`):
   ```typescript
   server.paidTool(
     "my_new_tool",
     "Description",
     0.01, // Price in USD
     { /* zod schema */ },
     {},
     async (params) => {
       const result = myNewService(params);
       return { content: [{ type: "text", text: JSON.stringify(result) }] };
     }
   );
   ```

3. **Add to REST API** (`backend/routes/x402-endpoint.ts`):
   ```typescript
   router.post("/my-endpoint", async (req, res) => {
     const result = myNewService(req.body);
     res.json({ success: true, data: result });
   });
   ```

4. **Update payment config** (`backend/server.ts`):
   ```typescript
   "POST /api/x402-endpoint/my-endpoint": {
     price: "$0.01",
     network: "base-sepolia",
   }
   ```


### Reporting Issues

Please use GitHub Issues to report bugs or suggest features. Include:
- Description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details


## 🙏 Acknowledgments

- [x402](https://x402.org) - Payment protocol
- [Cloudflare Agent SDK](https://github.com/cloudflare/agents) - MCP tool
- [MCP](https://modelcontextprotocol.io) - Model Context Protocol
- [Vercel AI SDK](https://sdk.vercel.ai) - AI SDK
- [Thirdweb](https://thirdweb.com) - Web3 infrastructure



Built with ❤️ by Brewit for the x402 community
