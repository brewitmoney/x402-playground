"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUSDCBalance } from "../hooks/useUSDCBalance";

interface PaymentRequired {
  network: string;
  maxAmountRequired: string;
  payTo: string;
  asset: string;
  resource: string;
  description: string;
  mimeType: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

interface ToolCall {
  toolName: string;
  toolCallId: string;
  input: unknown;
  output: unknown;
  isError: boolean;
  paymentRequired?: PaymentRequired;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

// Agent's wallet address (placeholder - agent has its own wallet)
const AGENT_WALLET_ADDRESS = process.env.NEXT_PUBLIC_AGENT_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export default function TryWithAgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your x402 agent. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PaymentRequired[] | null>(null);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { balance: usdcBalance, isLoading: isLoadingBalance } = useUSDCBalance(AGENT_WALLET_ADDRESS);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = useCallback(async (confirmPayment = false, promptText?: string) => {
    const messageText = promptText || input;
    // Allow proceeding if confirming payment, otherwise require input
    if ((!confirmPayment && !messageText.trim()) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: confirmPayment ? "Payment confirmed" : messageText,
    };

    const currentMessages = confirmPayment ? pendingMessages : messages;
    if (!confirmPayment) {
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
    }
    if (confirmPayment) {
      setPendingMessages([]);
      setPendingPayment(null);
    }
    setIsLoading(true);

    try {
      // Call server-side API route
      // Agent has its own wallet, so we use the agent's address
      const response = await fetch(`${BACKEND_URL}/api/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: confirmPayment 
            ? currentMessages.map((msg) => ({
                role: msg.role,
                content: msg.content,
              }))
            : [...currentMessages, userMessage].map((msg) => ({
                role: msg.role,
                content: msg.content,
              })),
          accountAddress: AGENT_WALLET_ADDRESS,
          network: "base-sepolia",
          confirmPayment,
          paymentRequirements: confirmPayment ? pendingPayment : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from server");
      }

      // Parse JSON response
      const data = await response.json();
      
      // If payment is required, store it and show confirmation
      if (data.paymentRequired && data.paymentRequired.length > 0 && !confirmPayment) {
        setPendingPayment(data.paymentRequired);
        setPendingMessages([...currentMessages, userMessage]);
        const paymentReq = data.paymentRequired[0];
        const amountUSD = Number(paymentReq.maxAmountRequired) / 1e6;
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `Payment required: ${amountUSD.toFixed(6)} ${paymentReq.extra?.name || 'tokens'}\n\n${paymentReq.description || 'Please confirm payment to proceed.'}`,
          toolCalls: data.toolCalls,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: data.text || "No response generated",
          toolCalls: data.toolCalls,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        if (!confirmPayment) {
          setInput("");
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, there was an error processing your message. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, pendingPayment, pendingMessages]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_WALLET_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <main className="flex w-full flex-col h-full">
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
          {/* USDC Balance */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-600 bg-gray-900/50">
            <span className="text-sm text-zinc-400">USDC:</span>
            <span className="text-sm font-semibold text-foreground">
              {isLoadingBalance ? "..." : `$${usdcBalance}`}
            </span>
          </div>
          {/* Agent Avatar */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-600 bg-gray-900/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              AI
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-zinc-400 font-medium">Agent</span>
              <button
                onClick={copyAddress}
                className="flex items-center gap-1.5 text-sm font-mono text-foreground hover:text-blue-400 transition-colors group"
                title="Click to copy address"
              >
                <span>{formatAddress(AGENT_WALLET_ADDRESS)}</span>
                <svg
                  className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {copied ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  )}
                </svg>
              </button>
              {copied && (
                <span className="text-xs text-green-400 mt-0.5">Copied!</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 h-full">
        <div className="mb-4">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
            x402 Agent Chat
          </h1>
          <p className="text-zinc-400">
            Chat with the x402 agent to explore and interact with the x402 ecosystem.
          </p>
        </div>

          {/* Prompt Suggestions */}
          {messages.length === 1 && !isLoading && (
            <div className="mb-4">
              <p className="text-xs text-zinc-400 mb-2">Try these prompts:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { text: "What tools are available?", paid: false },
                  { text: "Help me understand x402", paid: false },
                  { text: "Square of 3", paid: true, price: "$0.01" },
                ].map((prompt) => (
                  <button
                    key={prompt.text}
                    onClick={() => handleSend(false, prompt.text)}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                      prompt.paid
                        ? "bg-yellow-900/20 hover:bg-yellow-900/30 text-foreground border border-yellow-600/50"
                        : "bg-gray-800 hover:bg-gray-700 text-foreground border border-gray-600"
                    }`}
                  >
                    {prompt.paid && (
                      <span className="text-yellow-400 text-xs font-semibold">💰</span>
                    )}
                    <span>{prompt.text}</span>
                    {prompt.paid && prompt.price && (
                      <span className="text-xs text-yellow-300 font-medium ml-1">
                        ({prompt.price})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/30 rounded-lg border border-gray-600 mb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-foreground text-background"
                      : "bg-gray-900 text-foreground border border-gray-600"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                      <p className="text-xs font-semibold text-zinc-400 mb-2">Tool Calls:</p>
                      {message.toolCalls.map((toolCall, idx) => (
                        <div key={toolCall.toolCallId || idx} className="bg-gray-800 rounded p-2 text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">{toolCall.toolName}</span>
                            {toolCall.isError && (
                              <span className="text-red-400 text-xs">(Error)</span>
                            )}
                            {toolCall.paymentRequired && (
                              <span className="text-yellow-400 text-xs">(Payment Required)</span>
                            )}
                          </div>
                          {toolCall.input !== null && toolCall.input !== undefined && (
                            <div className="text-zinc-400 mb-1">
                              <span className="text-zinc-500">Input: </span>
                              <pre className="text-xs mt-1 whitespace-pre-wrap break-words">
                                {JSON.stringify(toolCall.input, null, 2)}
                              </pre>
                            </div>
                          )}
                          {toolCall.paymentRequired && (
                            <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-700 rounded">
                              <p className="text-yellow-300 font-semibold mb-1">💰 Payment Required</p>
                              <div className="text-yellow-200 space-y-1 text-xs">
                                <p><span className="text-yellow-400">Network:</span> {toolCall.paymentRequired.network}</p>
                                <p><span className="text-yellow-400">Amount:</span> {toolCall.paymentRequired.maxAmountRequired} {String(toolCall.paymentRequired.extra?.name || 'tokens')}</p>
                                <p><span className="text-yellow-400">Pay To:</span> {toolCall.paymentRequired.payTo}</p>
                                <p><span className="text-yellow-400">Description:</span> {toolCall.paymentRequired.description}</p>
                              </div>
                            </div>
                          )}
                          {toolCall.output !== null && toolCall.output !== undefined && !toolCall.paymentRequired && (
                            <div className="text-zinc-300">
                              <span className="text-zinc-500">Output: </span>
                              <pre className="text-xs mt-1 whitespace-pre-wrap break-words">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {typeof (toolCall.output as any) === 'string' 
                                  ? (toolCall.output as string)
                                  : JSON.stringify(toolCall.output, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-900 text-foreground border border-gray-600 rounded-lg p-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-foreground rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Payment Confirmation Modal */}
          {pendingPayment && pendingPayment.length > 0 && (
            <div className="p-4 border border-yellow-700 bg-yellow-900/20 rounded-lg mb-4">
              <div className="mb-3">
                <p className="text-yellow-300 font-semibold mb-2">💰 Payment Required</p>
                {pendingPayment[0] && (() => {
                  const req = pendingPayment[0];
                  const amountUSD = Number(req.maxAmountRequired) / 1e6;
                  return (
                    <div className="text-yellow-200 space-y-1 text-sm mb-4">
                      <p><span className="text-yellow-400">Amount:</span> ${amountUSD.toFixed(6)} USD ({req.maxAmountRequired} {String(req.extra?.name || 'tokens')})</p>
                      <p><span className="text-yellow-400">Network:</span> {req.network}</p>
                      <p><span className="text-yellow-400">Pay To:</span> {req.payTo}</p>
                      <p><span className="text-yellow-400">Description:</span> {req.description}</p>
                    </div>
                  );
                })()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPendingPayment(null);
                    setPendingMessages([]);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-foreground rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSend(true)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing..." : "Confirm & Pay"}
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-foreground"
              disabled={isLoading || !!pendingPayment}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || !!pendingPayment}
              className="px-6 py-2 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
      </div>
    </main>
  );
}

