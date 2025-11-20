"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { useReflexProofApp } from "@/components/reflex/ReflexProofProvider";
import type { ReflexResult } from "@/hooks/useReflexProof";

type FilterVisibility = "all" | "public" | "encrypted" | "private";

export default function LeaderboardPage() {
  const { reflex } = useReflexProofApp();
  const [visibilityFilter, setVisibilityFilter] =
    useState<FilterVisibility>("all");

  const filtered = useMemo(() => {
    return reflex.results.filter((item) => {
      if (visibilityFilter === "all") return true;
      return item.visibility === visibilityFilter;
    });
  }, [reflex.results, visibilityFilter]);

  return (
    <div className="space-y-10">
      <header className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-white backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">排行榜 · 最新链上成绩</h1>
            <p className="text-sm text-white/70">
              成绩按提交时间倒序展示。加密记录可由拥有解密权限的用户查看明文。
            </p>
          </div>
          <Link
            href="/test"
            className="rounded-full border border-white/10 px-5 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            去测试一局 →
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {(["all", "public", "encrypted", "private"] as const).map((item) => {
            const active = item === visibilityFilter;
            const label =
              item === "all"
                ? "全部"
                : item === "public"
                  ? "公开"
                  : item === "encrypted"
                    ? "加密"
                    : "私密";
            return (
              <button
                key={item}
                onClick={() => setVisibilityFilter(item)}
                className={`rounded-full border px-4 py-2 transition ${
                  active
                    ? "border-cyan-400 bg-cyan-400/20 text-white"
                    : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </header>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur">
        <div className="grid grid-cols-[auto,1fr,auto,auto,auto] gap-4 border-b border-white/10 pb-4 text-xs uppercase tracking-wide text-white/55">
          <span>#</span>
          <span>提交信息</span>
          <span>成绩</span>
          <span>可见性</span>
          <span className="text-right">操作</span>
        </div>
        <div className="divide-y divide-white/5">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/60">
              暂无符合条件的成绩。
            </p>
          ) : (
            filtered.map((item) => (
              <LeaderboardRow key={item.id} result={item} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function LeaderboardRow({ result }: { result: ReflexResult }) {
  const { reflex } = useReflexProofApp();
  const visibilityLabel =
    result.visibility === "public"
      ? "公开"
      : result.visibility === "encrypted"
        ? "加密"
        : "私密";

  const canDecrypt =
    result.visibility !== "public" &&
    result.decryptedValue === undefined &&
    !reflex.decryptingIds.has(result.id);

  const score =
    result.visibility === "public"
      ? `${result.valueMs} ms`
      : result.decryptedValue !== undefined
        ? `${result.decryptedValue} ms`
        : "🔐";

  return (
    <div className="grid grid-cols-[auto,1fr,auto,auto,auto] items-center gap-4 py-4 text-sm text-white/85">
      <span className="text-white/60">#{result.id}</span>
      <div>
        <p className="font-semibold text-white">
          {result.player.slice(0, 6)}…{result.player.slice(-4)}
        </p>
        <p className="text-xs text-white/40">
          {new Date(result.submittedAt * 1000).toLocaleString()}
        </p>
      </div>
      <span className="font-semibold text-white">{score}</span>
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
        {visibilityLabel}
      </span>
      <div className="flex items-center justify-end gap-2">
        {canDecrypt && (
          <button
            className="rounded-full border border-cyan-400/40 px-3 py-1 text-xs text-cyan-200 transition hover:border-cyan-200 hover:text-cyan-100"
            onClick={() => reflex.decryptResult(result.id)}
          >
            解密
          </button>
        )}
        <Link
          href={`/results/${result.id}`}
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
        >
          详情
        </Link>
      </div>
    </div>
  );
}

