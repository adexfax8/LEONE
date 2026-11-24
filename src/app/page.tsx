import Image from "next/image";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
      <Image src="/brand/leone-official-logo.jpg" alt="LEONE ADEX.com" width={206} height={270} priority />
      <p className="font-display text-2xl text-brand-red">Tech for all, affordable always.</p>
      <p className="text-sm text-brand-black/70">Storefront under construction.</p>
    </main>
  );
}
