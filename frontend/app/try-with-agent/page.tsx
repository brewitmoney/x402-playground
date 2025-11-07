"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUSDCBalance } from "../hooks/useUSDCBalance";
import CopyButton from "../components/CopyButton";
import { Send } from "lucide-react";
import { formatUnits } from "viem";

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
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

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
  const [pendingPayment, setPendingPayment] = useState<
    PaymentRequired[] | null
  >(null);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { balance: usdcBalance, isLoading: isLoadingBalance } =
    useUSDCBalance(AGENT_WALLET_ADDRESS);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = useCallback(
    async (confirmPayment = false, promptText?: string) => {
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
        if (
          data.paymentRequired &&
          data.paymentRequired.length > 0 &&
          !confirmPayment
        ) {
          setPendingPayment(data.paymentRequired);
          setPendingMessages([...currentMessages, userMessage]);
          const paymentReq = data.paymentRequired[0];
          const amountUSD = formatUnits(BigInt(paymentReq.maxAmountRequired), 6);
          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: `Payment required: ${amountUSD} ${
              paymentReq.extra?.name || "tokens"
            }\n\n${
              paymentReq.description || "Please confirm payment to proceed."
            }`,
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
          content:
            "Sorry, there was an error processing your message. Please try again.",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, pendingPayment, pendingMessages]
  );

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

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  // Function to render text with clickable URLs
  const renderTextWithLinks = (text: string): React.ReactNode[] => {
    // First, handle markdown-style links [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = markdownLinkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        parts.push(...renderPlainUrls(beforeText));
      }
      // Add the link
      parts.push(
        <a
          key={match.index}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline break-all"
        >
          {match[1]}
        </a>
      );
      lastIndex = markdownLinkRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      parts.push(...renderPlainUrls(remainingText));
    }

    // If no markdown links were found, just render plain URLs
    if (parts.length === 0) {
      return renderPlainUrls(text);
    }

    return parts;
  };

  // Function to render plain URLs in text
  const renderPlainUrls = (text: string): React.ReactNode[] => {
    // URL regex pattern
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = urlRegex.exec(text)) !== null) {
      // Add text before the URL
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      // Add the URL as a link
      parts.push(
        <a
          key={key++}
          href={match[1]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline break-all"
        >
          {match[1]}
        </a>
      );
      lastIndex = urlRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    // If no URLs found, return the text as-is
    if (parts.length === 0) {
      return [text];
    }

    return parts;
  };

  return (
    <main className="flex w-full flex-col h-full gap-6">
      <div className="flex items-center gap-4 w-full">
        <Image
          src="/assets/x402-Playground-White.svg"
          alt="x402 Playground Logo"
          width={140}
          height={20}
          priority
        />
        <div className="ml-auto flex md:flex-row flex-col items-end md:items-center md:gap-4 gap-2">
          {/* USDC Balance */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900/50">
            <span className="text-sm text-zinc-400">USDC:</span>
            <span className="text-sm font-semibold text-foreground">
              {isLoadingBalance ? "..." : `$${usdcBalance}`}
            </span>
          </div>
          {/* Agent Avatar */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900/50">
            
            <div className="flex flex-row items-center gap-2">
              <span className="text-sm text-zinc-400 font-medium">Agent:</span>
              <div className="flex items-center gap-1.5 text-sm text-foreground group">
                <span>{formatAddress(AGENT_WALLET_ADDRESS)}</span>
                <CopyButton
                  textToCopy={AGENT_WALLET_ADDRESS}
                  
                  iconSize="w-4 h-4"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/"
        className="text-zinc-400 hover:text-foreground transition-colors"
      >
        ← Back
      </Link>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-900 rounded-lg border border-zinc-700">
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
                  : "bg-zinc-900 text-foreground border border-zinc-700"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">
                {renderTextWithLinks(message.content)}
              </div>
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                  <p className="text-xs font-semibold text-zinc-400 mb-2">
                    Tool Calls:
                  </p>
                  {message.toolCalls.map((toolCall, idx) => (
                    <div
                      key={toolCall.toolCallId || idx}
                      className="bg-background border border-zinc-700 rounded p-2 text-xs"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">
                          {toolCall.toolName}
                        </span>
                        {toolCall.isError && (
                          <span className="text-red-400 text-xs">(Error)</span>
                        )}
                        {toolCall.paymentRequired && (
                          <span className="text-yellow-400 text-xs">
                            (Payment Required)
                          </span>
                        )}
                      </div>
                      {toolCall.input !== null &&
                        toolCall.input !== undefined && (
                          <div className="text-zinc-400 mb-1">
                            <span className="text-zinc-500">Input: </span>
                            <pre className="text-xs mt-1 whitespace-pre-wrap">
                              {JSON.stringify(toolCall.input, null, 2)}
                            </pre>
                          </div>
                        )}
                      {toolCall.paymentRequired && (
                        <div className="mt-2 p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm">💰</span>
                            <p className="text-yellow-200 font-semibold text-xs">
                              Payment Required
                            </p>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-yellow-300/70">Amount</span>
                              <span className="text-yellow-200 font-medium">
                                {formatUnits(BigInt(toolCall.paymentRequired.maxAmountRequired), 6)}{" "}
                                {String(toolCall.paymentRequired.extra?.name || "USDC")}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-yellow-300/70">Network</span>
                              <span className="text-yellow-200 font-medium">
                                {toolCall.paymentRequired.network}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-yellow-300/70">Recipient</span>
                              <span className="text-yellow-200 font-mono text-[10px]">
                                {formatAddress(toolCall.paymentRequired.payTo)}
                              </span>
                            </div>
                            {toolCall.paymentRequired.description && (
                              <div className="pt-1.5 border-t border-yellow-700/30">
                                <span className="text-yellow-300/70 block mb-0.5">Description</span>
                                <p className="text-yellow-200 text-[11px]">
                                  {toolCall.paymentRequired.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {toolCall.output !== null &&
                        toolCall.output !== undefined &&
                        !toolCall.paymentRequired && (
                          <div className="text-zinc-300">
                            <span className="text-zinc-500">Output: </span>
                            <pre className="text-xs mt-1 whitespace-pre-wrap">
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {typeof (toolCall.output as any) === "string"
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
          <div className="flex justify-start items-center">
            <div className="bg-zinc-900 text-foreground border border-zinc-700 rounded-lg p-3">
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
        <div className="p-5 border border-yellow-600/50 bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-xl backdrop-blur-sm shadow-lg">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <h3 className="text-yellow-200 font-semibold text-base">
                  Payment Required
                </h3>
                <p className="text-yellow-300/70 text-xs">
                  Confirm payment to proceed with the request
                </p>
              </div>
            </div>
            {pendingPayment[0] &&
              (() => {
                const req = pendingPayment[0];
                return (
                  <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-4 space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-sm font-medium">Amount</span>
                      <span className="text-yellow-200 font-semibold">
                        {formatUnits(BigInt(req.maxAmountRequired), 6)} {String(req.extra?.name || "USDC")}
                      </span>
                    </div>
                    <div className="h-px bg-zinc-700/50" />
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-sm font-medium">Network</span>
                      <span className="text-foreground text-sm font-medium">
                        {req.network}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-sm font-medium">Recipient</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-foreground text-sm font-mono">
                          {formatAddress(req.payTo)}
                        </span>
                        <CopyButton
                          textToCopy={req.payTo}
                          iconSize="w-3.5 h-3.5"
                        />
                      </div>
                    </div>
                    {req.description && (
                      <>
                        <div className="h-px bg-zinc-700/50" />
                        <div>
                          <span className="text-zinc-400 text-sm font-medium block mb-1">Description</span>
                          <p className="text-foreground text-sm">
                            {req.description}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setPendingPayment(null);
                setPendingMessages([]);
              }}
              className="flex-1 px-4 py-2.5 bg-zinc-800/50 hover:bg-zinc-800 text-foreground rounded-lg font-medium transition-colors border border-zinc-700/50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSend(true)}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-background rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                "Confirm & Pay"
              )}
            </button>
          </div>
        </div>
      )}
      {/* Prompt Suggestions */}
      {!isLoading && !pendingPayment && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-500 font-medium">Sample prompts</p>
          <div className="flex flex-row max-w-full overflow-x-auto scrollbar-hide gap-2 pb-1">
            {[
              { text: "Shorten a URL", paid: true, price: "$0.02" },
              { text: "Generate a password", paid: true, price: "$0.01" },
              { text: "What tools are available?", paid: false },
              { text: "Motivate me", paid: false },
            ].map((prompt) => (
              <button
                key={prompt.text}
                onClick={() => handleSend(false, prompt.text)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  prompt.paid
                    ? "bg-yellow-900/20 hover:bg-yellow-900/30 text-foreground border border-yellow-600/50 hover:border-yellow-600/70"
                    : "bg-zinc-900/50 hover:bg-zinc-800/50 text-foreground border border-zinc-700/50 hover:border-zinc-600"
                }`}
              >
                {prompt.paid && (
                  <span className="text-yellow-400 text-[10px]">💰</span>
                )}
                <span className="font-medium">{prompt.text}</span>
                {prompt.paid && prompt.price && (
                  <span className="text-[10px] text-yellow-300/80 font-medium">
                    {prompt.price}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={onSubmit} className="flex gap-2 border border-zinc-700 bg-zinc-900 rounded-2xl p-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1 ml-2 py-2 bg-transparent text-foreground placeholder-zinc-500 focus:outline-none"
          disabled={isLoading || !!pendingPayment}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading || !!pendingPayment}
          className="p-3 bg-foreground text-background rounded-2xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
        >
          <Send />
        </button>
      </form>
    </main>
  );
}
