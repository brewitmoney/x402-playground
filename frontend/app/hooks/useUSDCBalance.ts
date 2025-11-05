import { useState, useEffect } from "react";
import { createThirdwebClient } from "thirdweb";
import { getContract, readContract } from "thirdweb";
import { defineChain } from "thirdweb/chains";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
});

// USDC contract address on Base Sepolia
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
const CHAIN = defineChain(84532); // Base Sepolia

export function useUSDCBalance(address: string | undefined) {
  const [balance, setBalance] = useState<string>("0.00");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setBalance("0.00");
      setIsLoading(false);
      return;
    }

    const fetchUSDCBalance = async () => {
      try {
        setIsLoading(true);
        const contract = getContract({
          client,
          chain: CHAIN,
          address: USDC_ADDRESS,
        });

        // Read balanceOf(address)
        const balanceResult = await readContract({
          contract,
          method: "function balanceOf(address owner) view returns (uint256)",
          params: [address as `0x${string}`],
        });

        // Read decimals
        const decimals = await readContract({
          contract,
          method: "function decimals() view returns (uint8)",
          params: [],
        });

        // Format balance (USDC has 6 decimals)
        const formatted = (Number(balanceResult) / Math.pow(10, Number(decimals))).toFixed(2);
        setBalance(formatted);
      } catch (error) {
        console.error("Error fetching USDC balance:", error);
        setBalance("0.00");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUSDCBalance();
    // Refresh balance every 10 seconds
    const interval = setInterval(fetchUSDCBalance, 10000);
    return () => clearInterval(interval);
  }, [address]);

  return { balance, isLoading };
}

