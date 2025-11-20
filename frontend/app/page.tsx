"use client";

import Link from "next/link";

import { useReflexProofApp } from "@/components/reflex/ReflexProofProvider";

export default function HomePage() {
  const { meta, reflex, fhevm, mode } = useReflexProofApp();
  const latestResults = reflex.results.slice(0, 5);
  const upcomingEvents = reflex.events.slice(0, 4);

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/40 p-10 shadow-lg shadow-black/20">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-emerald-200">
              ReflexProof
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
              手速反应链存证仪表盘
            </h1>
            <p className="text-base text-white/70">
              在浏览器中完成随机化反应测试，成绩由 Fully Homomorphic Encryption 加密并写入区块链。
              支持赛事榜单、科研样本、隐私可控的证书。
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/test"
                className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow shadow-cyan-500/30 transition hover:from-cyan-400 hover:to-blue-400"
              >
                立即开启测试
              </Link>
              <Link
                href="/leaderboard"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
              >
                查看排行榜
              </Link>
            </div>
          </div>
          <div className="grid gap-4 text-sm text-white/70 sm:grid-cols-2">
            <StatusCard title="网络模式" value={mode === "mock" ? "本地 Mock FHEVM" : "Relayer 模式"} />
            <StatusCard
              title="FHEVM 状态"
              value={fhevm.status === "error" ? "异常" : fhevm.status}
              highlight={fhevm.status === "ready"}
            />
            <StatusCard
              title="已上链成绩"
              value={`${reflex.results.length} 条`}
            />
            <StatusCard
              title="赛事/实验"
              value={`${reflex.events.length} 场`}
            />
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 bottom-0 hidden h-64 w-64 rounded-full bg-gradient-to-tr from-cyan-500/40 to-transparent blur-3xl md:block" />
        <div className="pointer-events-none absolute -left-16 top-10 hidden h-72 w-72 rounded-full bg-gradient-to-br from-purple-500/40 to-transparent blur-3xl md:block" />
      </section>

      <section className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur">
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-2xl font-semibold">最近成绩</h2>
              <p className="text-sm text-white/60">最新的五条链上成绩，可在排行榜中查看更多信息。</p>
            </div>
            <Link
              href="/leaderboard"
              className="text-sm text-cyan-300 transition hover:text-cyan-100"
            >
              查看全部 →
            </Link>
          </div>
          <div className="space-y-3">
            {latestResults.length === 0 ? (
              <EmptyState message="暂无成绩，请完成一次反应测试并上链。" />
            ) : (
              latestResults.map((item) => (
                <Link
                  key={item.id}
                  href={`/results/${item.id}`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/80 transition hover:border-cyan-400/40 hover:text-white"
                >
                  <div>
                    <p className="font-semibold text-white">
                      成绩 #{item.id} ·{" "}
                      {item.visibility === "public"
                        ? `${item.valueMs} ms`
                        : item.decryptedValue ?? "密文"}
                    </p>
                    <p className="text-xs text-white/50">
                      {new Date(item.submittedAt * 1000).toLocaleString()} · 提交者{" "}
                      {item.player.slice(0, 6)}…{item.player.slice(-4)}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                    {item.visibility === "public"
                      ? "公开"
                      : item.visibility === "encrypted"
                        ? "加密"
                        : "私密"}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur">
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-2xl font-semibold">赛事 / 实验</h2>
              <p className="text-sm text-white/60">
                浏览近期创建的比赛或科研活动，查看规则与时间窗。
              </p>
            </div>
            <Link
              href="/events"
              className="text-sm text-cyan-300 transition hover:text-cyan-100"
            >
              管理活动 →
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <EmptyState message="暂无活动，组织者可创建新的比赛或实验。" />
            ) : (
              upcomingEvents.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
                >
                  <p className="font-semibold text-white">Event #{item.id}</p>
                  <p className="mt-1 text-xs text-white/50">
                    组织者：{item.organizer.slice(0, 6)}…{item.organizer.slice(-4)}
                  </p>
                  <p className="mt-2 text-xs text-white/50">
                    时间窗口：{item.startTime ? new Date(item.startTime * 1000).toLocaleString() : "未设定"}
                    {" - "}
                    {item.endTime ? new Date(item.endTime * 1000).toLocaleString() : "不限"}
                  </p>
                  <p className="mt-2 text-xs text-white/45 break-all">
                    CID: {item.eventCID || "N/A"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-10 backdrop-blur">
        <div className="grid gap-10 md:grid-cols-3">
          <FeatureCard
            title="可信成绩"
            description="每一次反应测试的平均值、设备指纹与完整性信息都会生成哈希写入链上，不可篡改。"
          />
          <FeatureCard
            title="隐私可控"
            description="支持公开、加密、私密三种模式：可向公众展示成绩，或仅向授权者分享解密密钥。"
          />
          <FeatureCard
            title="赛事与证书"
            description="组织者可创建活动、颁发 SBT 证书；验证者可链上确认样本有效，提升可信度。"
          />
        </div>
      </section>

      {!meta.isConnected && (
        <section className="rounded-3xl border border-cyan-500/50 bg-cyan-500/10 p-8 text-center text-white backdrop-blur">
          <h2 className="text-2xl font-semibold">尚未连接钱包</h2>
          <p className="mt-2 text-sm text-white/70">
            连接 MetaMask 以体验全流程，包括反应测试、链上存证、排名查看与赛事管理。
          </p>
          <button
            onClick={meta.connect}
            className="mt-4 rounded-full bg-white/10 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            连接 MetaMask
          </button>
        </section>
      )}
    </div>
  );
}

function StatusCard({
  title,
  value,
  highlight = false,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 shadow-inner shadow-black/20 ${
        highlight
          ? "border-emerald-400/70 bg-emerald-400/15 text-white"
          : "border-white/10 bg-white/5 text-white/75"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-white/50">{title}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/75">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm">{description}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-5 py-6 text-center text-sm text-white/50">
      {message}
    </div>
  );
}
