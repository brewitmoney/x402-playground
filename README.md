# x402 Playground

A playground project to try out x402 features and explore the x402 ecosystem.

## Project Structure

This project is split into two separate applications:

- **`frontend/`** - Next.js frontend application
- **`backend/`** - Express backend server

## Getting Started

### Prerequisites

- Node.js
- pnpm (or npm/yarn)

### Installation

Each application has its own dependencies and must be installed separately:

```bash
# Install frontend dependencies
cd frontend
pnpm install

# Install backend dependencies
cd ../backend
pnpm install
```

### Development

Run both applications separately:

```bash
# From root directory

# Start frontend (Next.js)
pnpm frontend:dev

# Start backend (Express)
pnpm backend:dev
```

Or run them individually:

```bash
# Frontend
cd frontend
pnpm dev

# Backend
cd backend
pnpm dev
```

### Build

```bash
# Build frontend
pnpm frontend:build

# Build backend
pnpm backend:build
```

### Start Production

```bash
# Start frontend
pnpm frontend:start

# Start backend
pnpm backend:start
```

## Project Details

- **Frontend**: Next.js 16 with React 19
- **Backend**: Express server with MCP (Model Context Protocol) support
- **Payment Integration**: x402 for payment-enabled tools and APIs
