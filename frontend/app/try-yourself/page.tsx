"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { useActiveWalletChain } from "thirdweb/react";
import { viemAdapter } from "thirdweb/adapters/viem";
import { defineChain } from "thirdweb/chains";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
import { useUSDCBalance } from "../hooks/useUSDCBalance";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
});

// Define allowed chains - only Base Sepolia for this app
const allowedChains = [
  defineChain(84532), // Base Sepolia
];

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

interface EndpointOption {
  id: string;
  name: string;
  path: string;
  method: "GET" | "POST";
  arguments: Array<{
    name: string;
    type: "number" | "string";
    placeholder: string;
  }>;
}

const ENDPOINTS: EndpointOption[] = [
  {
    id: "square",
    name: "Square of a Number",
    path: "/api/x402-endpoint/square",
    method: "GET",
    arguments: [
      {
        name: "number",
        type: "number",
        placeholder: "Enter a number",
      },
    ],
  },
];

export default function TryYourselfPage() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const chain = useActiveWalletChain();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointOption>(ENDPOINTS[0]);
  const [endpointArgs, setEndpointArgs] = useState<Record<string, string>>({});
  const [endpointResult, setEndpointResult] = useState<Record<string, unknown> | null>(null);
  const [isLoadingEndpoint, setIsLoadingEndpoint] = useState(false);
  const { balance: usdcBalance, isLoading: isLoadingBalance } = useUSDCBalance(account?.address);

  // Call x402 paid endpoint
  const handleCallEndpoint = async () => {
    setIsLoadingEndpoint(true);
    setEndpointResult(null);

    if (!account || !wallet) {
      setEndpointResult({ error: "No wallet connected" });
      setIsLoadingEndpoint(false);
      return;
    }
    try {
      if (!chain) {
        throw new Error("Chain not available");
      }

      // Convert Thirdweb wallet to viem wallet client using the adapter
      const viemWalletClient = await viemAdapter.wallet.toViem({
        client,
        chain,
        wallet,
      });

      // Build query string for GET requests
      const queryParams = new URLSearchParams();
      selectedEndpoint.arguments.forEach((arg) => {
        const value = endpointArgs[arg.name];
        if (value) {
          queryParams.append(arg.name, value);
        }
      });

      const url = `${BACKEND_URL}${selectedEndpoint.path}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchWithPayment = wrapFetchWithPayment(fetch, viemWalletClient as any);
      const response = await fetchWithPayment(url, {
        method: selectedEndpoint.method,
      });

      const data = await response.json();
      // const paymentResponse = decodeXPaymentResponse(response.headers.get("x-payment-response")!);
      // console.log("paymentResponse", paymentResponse);
      setEndpointResult(data);
    } catch (error) {
      console.error("Error calling endpoint:", error);
      setEndpointResult({ error: "Failed to call endpoint", details: String(error) });
    } finally {
      setIsLoadingEndpoint(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setEndpointResult(null);
    setEndpointArgs({});
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEndpointResult(null);
    setEndpointArgs({});
  };

  const handleArgChange = (argName: string, value: string) => {
    setEndpointArgs((prev) => ({
      ...prev,
      [argName]: value,
    }));
  };

  const address = account?.address;

  return (
    <main className="flex w-full flex-col items-center justify-between sm:items-start h-full">
      <div className="flex items-center gap-4 w-full mb-4">
        <Link
          href="/"
          className="text-zinc-400 hover:text-foreground transition-colors"
        >
          ← Back
        </Link>
        <Image
          src="/assets/x402-Playground-White.svg"
          alt="x402 Playground Logo"
          width={180}
          height={20}
          priority
        />
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-600 bg-gray-900/50">
            <span className="text-sm text-zinc-400">USDC:</span>
            <span className="text-sm font-semibold text-foreground">
              {isLoadingBalance ? "..." : `$${usdcBalance}`}
            </span>
          </div>
          <ConnectButton
            client={client}
            chains={allowedChains}
            connectModal={{
              size: "compact",
              title: "Connect Wallet",
              showThirdwebBranding: false,
            }}
          />
        </div>
      </div>
      <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left max-w-md">
        <h1 className="text-5xl font-semibold tracking-tight text-foreground">
          Try Yourself
        </h1>
        <p className="text-lg text-zinc-400">
          Connect your wallet and interact with x402 endpoints directly.
        </p>
      </div>
      <div className="flex flex-col gap-4 w-full">
        {address ? (
          <>
            <button
              onClick={handleOpenModal}
              className="flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-4 text-background transition-colors w-full text-lg hover:opacity-90"
            >
              Call x402 Paid Endpoint
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
            <p className="text-lg text-zinc-400">
              Connect your wallet to interact with x402 endpoints directly.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-600 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-foreground">Call x402 Endpoint</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-zinc-400 hover:text-foreground transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Endpoint Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select Endpoint
                </label>
                <select
                  value={selectedEndpoint.id}
                  onChange={(e) => {
                    const endpoint = ENDPOINTS.find((ep) => ep.id === e.target.value);
                    if (endpoint) {
                      setSelectedEndpoint(endpoint);
                      setEndpointArgs({});
                      setEndpointResult(null);
                    }
                  }}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                >
                  {ENDPOINTS.map((endpoint) => (
                    <option key={endpoint.id} value={endpoint.id}>
                      {endpoint.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Arguments */}
              {selectedEndpoint.arguments.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Arguments
                  </label>
                  <div className="space-y-3">
                    {selectedEndpoint.arguments.map((arg) => (
                      <div key={arg.name}>
                        <label className="block text-xs text-zinc-400 mb-1 capitalize">
                          {arg.name}
                        </label>
                        <input
                          type={arg.type}
                          value={endpointArgs[arg.name] || ""}
                          onChange={(e) => handleArgChange(arg.name, e.target.value)}
                          placeholder={arg.placeholder}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-foreground"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Response */}
              {endpointResult && (
                <div className="mb-6 p-4 rounded-lg border border-gray-600 bg-gray-800/50">
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    Response:
                  </h3>
                  <pre className="text-xs text-zinc-300 overflow-x-auto font-mono whitespace-pre-wrap">
                    {JSON.stringify(endpointResult, null, 2)}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-700 text-foreground rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleCallEndpoint}
                  disabled={isLoadingEndpoint || selectedEndpoint.arguments.some((arg) => !endpointArgs[arg.name])}
                  className="flex-1 px-4 py-2 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoadingEndpoint ? (
                    <>
                      <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                      Calling...
                    </>
                  ) : (
                    "Call Endpoint"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

