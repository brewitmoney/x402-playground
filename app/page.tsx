import Image from "next/image";

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
        <div className="flex flex-row flex-wrap gap-4 text-base font-medium sm:flex-row w-full">
          <button
            className="flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-4 text-background transition-colors w-full text-lg"
          >
           Get Started
          </button>
          {/* <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a> */}
        </div>
      </main>
  );
}
