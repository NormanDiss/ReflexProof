"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { useReflexProofApp } from "@/components/reflex/ReflexProofProvider";
import type { SubmitOptions } from "@/hooks/useReflexProof";

type Phase = "idle" | "arming" | "ready" | "finished";

const MODES = [
  { label: "极速单次", description: "单次反应极限测试", rounds: 1, mode: 1 },
  { label: "竞技 5 连击", description: "赛事推荐模式，取平均值", rounds: 5, mode: 2 },
  { label: "耐力 10 连击", description: "长时间专注表现评估", rounds: 10, mode: 3 },
];

export function ReactionTester({ initialEventId }: { initialEventId?: number }) {
  const {
    reflex,
    meta: { connect, isConnected },
  } = useReflexProofApp();

  const [modeIndex, setModeIndex] = useState(1);
  const currentMode = MODES[modeIndex];
  const [visibility, setVisibility] = useState<"public" | "encrypted" | "private">("public");
  const [phase, setPhase] = useState<Phase>("idle");
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundTimes, setRoundTimes] = useState<number[]>([]);
  const [prompt, setPrompt] = useState("点击中央开始测试");
  const [frameRate, setFrameRate] = useState<number | undefined>(undefined);
  const [isEarlyPenalty, setIsEarlyPenalty] = useState(false);
  const [lastSubmissionHash, setLastSubmissionHash] = useState<string | undefined>(undefined);
  const [linkedEventId, setLinkedEventId] = useState<number | null>(initialEventId ?? null);

  const startRef = useRef<number>(0);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (initialEventId !== undefined) {
      setLinkedEventId(initialEventId);
    }
  }, [initialEventId]);

  useEffect(() => {
    let animationFrameId: number;
    let measuring = true;
    let frames = 0;
    let start = performance.now();

    const measure = (timestamp: number) => {
      if (!measuring) return;
      frames += 1;
      if (timestamp - start >= 1000) {
        setFrameRate(frames);
        frames = 0;
        start = timestamp;
      }
      animationFrameId = requestAnimationFrame(measure);
    };

    animationFrameId = requestAnimationFrame(measure);
    return () => {
      measuring = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const stats = useMemo(() => {
    if (!roundTimes.length) {
      return { average: 0, best: 0, worst: 0, stdev: 0 };
    }
    const sum = roundTimes.reduce((acc, v) => acc + v, 0);
    const average = sum / roundTimes.length;
    const best = Math.min(...roundTimes);
    const worst = Math.max(...roundTimes);
    const stdev = Math.sqrt(
      roundTimes.reduce((acc, value) => acc + Math.pow(value - average, 2), 0) /
        roundTimes.length
    );
    return {
      average: Math.round(average),
      best,
      worst,
      stdev: Math.round(stdev),
    };
  }, [roundTimes]);

  const resetTest = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setRoundIndex(0);
    setRoundTimes([]);
    setPhase("idle");
    setPrompt("点击中央开始测试");
    setIsEarlyPenalty(false);
  };

  const scheduleRound = () => {
    setPhase("arming");
    const delay = Math.floor(Math.random() * 2200) + 900;
    setPrompt("请保持专注…");
    timerRef.current = window.setTimeout(() => {
      startRef.current = performance.now();
      setPhase("ready");
      setPrompt("触发啦！快点按！");
    }, delay);
  };

  const registerRound = (delta: number) => {
    const updated = [...roundTimes, delta];
    setRoundTimes(updated);

    if (roundIndex + 1 >= currentMode.rounds) {
      setPhase("finished");
      setPrompt("测试完成！准备上链吧 🚀");
      setRoundIndex(currentMode.rounds);
    } else {
      setRoundIndex((idx) => idx + 1);
      scheduleRound();
      setPrompt(`第 ${roundIndex + 1} 轮成绩：${delta} ms`);
    }
  };

  const handlePadClick = () => {
    if (!isConnected) {
      connect();
      return;
    }
    if (phase === "idle") {
      resetTest();
      scheduleRound();
      return;
    }
    if (phase === "arming") {
      setIsEarlyPenalty(true);
      setPrompt("太快了！等待信号后再按 👀");
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        setIsEarlyPenalty(false);
        scheduleRound();
      }, 800);
      return;
    }
    if (phase === "ready") {
      const delta = Math.round(performance.now() - startRef.current);
      registerRound(delta);
      return;
    }
    if (phase === "finished") {
      resetTest();
      scheduleRound();
    }
  };

  const handleSubmit = async () => {
    if (!reflex.canSubmit || !roundTimes.length) return;
    const options: SubmitOptions = {
      rounds: roundTimes,
      mode: currentMode.mode,
      visibility,
      frameRate,
      eventId: linkedEventId ? BigInt(linkedEventId) : undefined,
    };
    const result = await reflex.submitResult(options);
    if (result?.txHash) {
      setLastSubmissionHash(result.txHash);
    }
  };

  const eventOptions = reflex.events;
  const eventLabel =
    linkedEventId !== null
      ? eventOptions.find((item) => item.id === linkedEventId)?.eventCID || `Event #${linkedEventId}`
      : "未关联";

  const statusColor =
    phase === "ready"
      ? "from-emerald-500/80 to-emerald-400/50 border-emerald-400/70 shadow-[0_0_40px_rgba(16,185,129,0.35)]"
      : phase === "arming"
        ? "from-yellow-500/60 to-orange-400/40 border-yellow-400/50"
        : "from-white/6 to-white/2 border-white/10";

  return (
    <section className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold text-white">反应测试操控台</h2>
              <p className="mt-2 text-sm text-white/60">
                随机延迟 + 随机刺激，确保每个成绩可信。平均值将使用 FHE 加密写入区块链。
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
                帧率监测：{frameRate ?? "--"} fps
              </span>
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
                <span>关联赛事：</span>
                <select
                  value={linkedEventId ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLinkedEventId(value ? Number(value) : null);
                  }}
                  className="rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1 text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">不关联</option>
                  {eventOptions.map((event) => (
                    <option key={event.id} value={event.id}>
                      #{event.id} · {event.eventCID || "无 CID"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {MODES.map((item, index) => {
              const isActive = index === modeIndex;
              return (
                <button
                  key={item.mode}
                  onClick={() => {
                    setModeIndex(index);
                    resetTest();
                  }}
                  className={`flex flex-col items-start gap-2 rounded-2xl border px-4 py-4 text-left transition ${
                    isActive
                      ? "border-cyan-400/70 bg-cyan-400/20 text-white shadow-lg shadow-cyan-500/20"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:text-white"
                  }`}
                >
                  <span className="text-sm uppercase tracking-wide text-white/50">
                    模式 {item.mode}
                  </span>
                  <span className="text-lg font-semibold">{item.label}</span>
                  <span className="text-xs text-white/50">{item.description}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {(["public", "encrypted", "private"] as const).map((value) => {
              const active = value === visibility;
              const label =
                value === "public" ? "公开上链" : value === "encrypted" ? "链上密文" : "仅本地保存";
              return (
                <button
                  key={value}
                  onClick={() => setVisibility(value)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-emerald-400 bg-emerald-400/20 text-white"
                      : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          role="button"
          onClick={handlePadClick}
          className={`relative flex h-80 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[40px] border bg-gradient-to-br ${statusColor} transition`}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={prompt}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-3xl font-semibold text-white drop-shadow"
            >
              {prompt}
            </motion.span>
          </AnimatePresence>
          <AnimatePresence>
            {isEarlyPenalty && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-10 rounded-full bg-red-500/80 px-4 py-2 text-xs text-white shadow"
              >
                过早点击，成绩无效
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <StatCard label="平均反应" value={stats.average ? `${stats.average} ms` : "--"} />
          <StatCard label="最佳成绩" value={stats.best ? `${stats.best} ms` : "--"} />
          <StatCard label="最慢反应" value={stats.worst ? `${stats.worst} ms` : "--"} />
          <StatCard label="波动 (σ)" value={stats.stdev ? `${stats.stdev} ms` : "--"} />
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">成绩摘要</h3>
              <p className="text-sm text-white/60">
                共 {roundTimes.length} 次记录，当前模式目标 {currentMode.rounds} 次。关联活动：{eventLabel}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetTest}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
              >
                重置
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  !roundTimes.length || phase !== "finished" || !reflex.canSubmit || reflex.isSubmitting
                }
                className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-2 text-sm font-semibold text-white shadow shadow-orange-500/30 transition hover:from-orange-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {reflex.isSubmitting ? "提交中…" : "上链存证"}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
            {roundTimes.map((value, index) => (
              <span
                key={index}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80"
              >
                #{index + 1} {value} ms
              </span>
            ))}
          </div>
          {reflex.message && (
            <p className="mt-4 text-sm text-cyan-200/80">{reflex.message}</p>
          )}
          {lastSubmissionHash && (
            <p className="mt-2 text-xs text-white/50">
              最新交易哈希：{lastSubmissionHash}
            </p>
          )}
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h3 className="text-xl font-semibold text-white">测试指南</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/60">
            <li>• 随机延迟确保难以预判，减少脚本作弊。</li>
            <li>• 浏览器会记录帧率、设备指纹作为完整性参考。</li>
            <li>• 可选择公开上链、密文上链或仅本地保存。</li>
            <li>• 上链后可前往排行榜或成绩详情页查看证据。</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-6 backdrop-blur">
          <h3 className="text-lg font-semibold text-white">链上存证策略</h3>
          <div className="mt-4 space-y-4 text-sm text-white/65">
            <div>
              <p className="font-semibold text-white">公开模式</p>
              <p className="mt-1">
                平均反应时间将以明文写入链上，适合娱乐赛、公开榜单。
              </p>
            </div>
            <div>
              <p className="font-semibold text-white">加密模式</p>
              <p className="mt-1">
                平均值密文与 AES-GCM 结果存储在链上与 IPFS，后续可分享密钥解密。
              </p>
            </div>
            <div>
              <p className="font-semibold text-white">私密模式</p>
              <p className="mt-1">
                仅保存哈希证明，原始 JSON 保存在浏览器本地，适合个人记录。
              </p>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-inner shadow-black/20">
      <span className="text-xs uppercase tracking-wide text-white/50">{label}</span>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

