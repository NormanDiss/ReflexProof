"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { ReactionTester } from "@/components/test/ReactionTester";
import { useReflexProofApp } from "@/components/reflex/ReflexProofProvider";

function TestPageContent() {
  const { reflex } = useReflexProofApp();
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get("eventId");
  const initialEventId = eventIdParam ? Number(eventIdParam) : undefined;
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-900/70 px-8 py-6 text-white backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">反应速度测试</h1>
            <p className="text-sm text-white/70">
              完成随机化反应测试，选择期望的隐私级别，随后链上存证即可生成可信成绩。
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            查看排行榜
          </Link>
        </div>
        <p className="text-xs text-white/50">
          提示：每次提交会记录平均值与设备指纹哈希。组织活动时建议完成多次测试以防异常成绩。
        </p>
      </div>

      <ReactionTester initialEventId={initialEventId} />

      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-white/70 backdrop-blur">
        <h2 className="text-xl font-semibold text-white">链上结果概览</h2>
        <p className="mt-2 text-sm">
          当前共有{" "}
          <span className="font-semibold text-white">{reflex.results.length}</span> 条成绩。上链后可在「排行榜」查看公开记录，或在「我的成绩」中导出 JSON / PDF 证明。
        </p>
      </section>
    </div>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={null}>
      <TestPageContent />
    </Suspense>
  );
}
