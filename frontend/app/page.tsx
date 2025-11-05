import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex w-full flex-col items-center justify-between sm:items-start h-full">
      <Image
        src="/assets/x402-Playground-White.svg"
        alt="x402 Playground Logo"
        width={180}
        height={20}
        priority
      />
      <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left max-w-md">
        <h1 className="text-5xl font-semibold tracking-tight text-foreground">
          Welcome to the x402 Playground
        </h1>
        <p className="text-lg text-zinc-400">
          A playground to try out x402 features and explore the x402 ecosystem.
        </p>
      </div>
      <div className="flex flex-col gap-4 w-full max-w-md">
        <Link
          href="/try-with-agent"
          className="flex items-center justify-center gap-2 rounded-full bg-foreground px-8 py-4 text-background transition-colors w-full text-lg font-medium hover:opacity-90"
        >
          Try with Agent
        </Link>
        <Link
          href="/try-yourself"
          className="flex items-center justify-center gap-2 rounded-full border border-gray-600 px-8 py-4 text-foreground transition-colors w-full text-lg font-medium hover:bg-gray-900/50"
        >
          Try Yourself
        </Link>
      </div>
    </main>
  );
}
