import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex w-full flex-col items-start justify-between sm:items-center h-full">
      <Image
        src="/assets/x402-Playground-White.svg"
        alt="x402 Playground Logo"
        width={220}
        height={20}
        priority
      />
      <div className="flex flex-col items-start gap-6 sm:items-center text-left sm:text-center max-w-lg">
        <h1 className="text-5xl font-semibold tracking-tight text-foreground">
          Welcome to the x402 Playground
        </h1>
        <p className="text-lg text-zinc-400">
          A playground to try out x402 features with MCP and Web Servers.
        </p>
      </div>
      <div className="flex md:flex-row flex-col gap-4 w-full max-w-lg">
        <Link
          href="/try-with-agent"
          className="flex items-center justify-center gap-2 rounded-full bg-foreground px-8 py-4 text-background transition-colors w-full text-lg font-medium hover:opacity-90"
        >
          Try with Agent
        </Link>
        <Link
          href="/try-yourself"
          className="flex items-center justify-center gap-2 rounded-full border border-zinc-700 px-8 py-4 text-foreground transition-colors w-full text-lg font-medium hover:bg-zinc-900/50"
        >
          Try Yourself
        </Link>
      </div>
    </main>
  );
}
