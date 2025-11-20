"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

import { useReflexProofApp } from "@/components/reflex/ReflexProofProvider";

const NAV_ITEMS = [
  { href: "/", label: "仪表盘" },
  { href: "/test", label: "反应测试" },
  { href: "/leaderboard", label: "排行榜" },
  { href: "/events", label: "赛事活动" },
];

function truncateAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function AppNavbar() {
  const pathname = usePathname();
  const { meta, fhevm, mode } = useReflexProofApp();
  const active = NAV_ITEMS.find((item) => pathname === item.href)?.href;
  const isConnected = meta.isConnected && meta.accounts && meta.accounts.length > 0;
  const address = meta.accounts?.[0] ?? "";

  return (
    <header className="sticky top-0 z-40 rounded-3xl border border-white/10 bg-slate-900/70 px-6 py-4 backdrop-blur-lg">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/zama-logo.svg" alt="Zama Logo" width={108} height={28} priority />
            <span className="rounded-full border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200">
              ReflexProof FHEVM
            </span>
          </Link>
          <nav className="hidden gap-1 rounded-full bg-white/5 p-1 text-sm md:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 transition ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/80 to-blue-500/80 text-white shadow-lg shadow-cyan-500/30"
                      : "text-white/65 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NetworkPill mode={mode} chainId={meta.chainId} />
          <StatusPill status={fhevm.status} error={fhevm.error} />
          {isConnected ? (
            <div className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90">
              {truncateAddress(address)}
            </div>
          ) : (
            <button
              onClick={meta.connect}
              className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-2 text-sm font-semibold text-white shadow shadow-orange-500/30 transition hover:from-orange-400 hover:to-pink-400"
            >
              连接钱包
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function NetworkPill({
  mode,
  chainId,
}: {
  mode: "mock" | "relayer";
  chainId: number | undefined;
}) {
  const label =
    mode === "mock"
      ? "本地 Mock FHEVM"
      : chainId === 11155111
        ? "Sepolia Relayer"
        : "Relayer 网络";
  return (
    <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-white/70 sm:flex">
      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      {label}
    </span>
  );
}

function StatusPill({
  status,
  error,
}: {
  status: string;
  error: Error | undefined;
}) {
  const isError = status === "error" || Boolean(error);
  const color = isError ? "bg-red-500/90" : "bg-cyan-500/90";
  const text = isError ? "FHEVM 错误" : `FHEVM ${status}`;
  return (
    <span className={`hidden rounded-full px-4 py-1 text-xs text-white sm:inline-flex ${color}`}>
      {text}
    </span>
  );
}

