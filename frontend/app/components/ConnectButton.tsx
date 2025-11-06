"use client";

import { useActiveAccount, useActiveWallet, useConnectModal, useDisconnect } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb/chains";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOutIcon } from "lucide-react";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
});

// Define allowed chains - only Base Sepolia for this app
const allowedChains = [
  defineChain(84532), // Base Sepolia
];

export default function ConnectButton() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { connect, isConnecting } = useConnectModal();
  const { disconnect } = useDisconnect();

  // Handle wallet connection
  const handleConnect = async () => {
    try {
      await connect({
        client,
        chains: allowedChains,
        theme: {
          type: "dark",
          fontFamily: "inherit",
          colors: {
            primaryText: "#ffffff",
            secondaryText: "#a1a1aa",
            accentText: "#ffffff",
            danger: "#ef4444",
            success: "#22c55e",
            modalOverlayBg: "rgba(0, 0, 0, 0.7)",
            accentButtonBg: "#27272a",
            accentButtonText: "#ffffff",
            primaryButtonBg: "#ffffff",
            primaryButtonText: "#000000",
            secondaryButtonBg: "#27272a",
            secondaryButtonText: "#ffffff",
            secondaryButtonHoverBg: "#3f3f46",
            connectedButtonBg: "#27272a",
            connectedButtonBgHover: "#3f3f46",
            inputAutofillBg: "#18181b",
            borderColor: "#3f3f46",
            separatorLine: "#3f3f46",
            modalBg: "#18181b",
            tertiaryBg: "#27272a",
            secondaryIconColor: "#a1a1aa",
            secondaryIconHoverColor: "#ffffff",
            secondaryIconHoverBg: "#27272a",
            scrollbarBg: "#27272a",
            tooltipBg: "#18181b",
            tooltipText: "#ffffff",
            selectedTextBg: "#27272a",
            selectedTextColor: "#ffffff",
            skeletonBg: "#27272a",
          },
        },
      });
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  // Handle wallet disconnection
  const handleDisconnect = async () => {
    if (wallet) {
      await disconnect(wallet);
    }
  };

  return (
    <>
      {account ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900/50 text-sm font-semibold text-foreground hover:bg-zinc-800/50 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {account.address.slice(0, 6)}...{account.address.slice(-4)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-zinc-700" align="end">
            <DropdownMenuItem onClick={handleDisconnect}>
              <LogOutIcon className="w-4 h-4" /> Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <>
              <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect Wallet"
          )}
        </button>
      )}
    </>
  );
}

