"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useReflexProofApp } from "@/components/reflex/ReflexProofProvider";

export default function EventDetailPage() {
  const { reflex } = useReflexProofApp();
  const { refreshEvents, refreshResults, events, results } = reflex;
  const params = useParams<{ id: string }>();
  const eventId = Number(params?.id ?? "0");

  useEffect(() => {
    refreshEvents();
    refreshResults();
  }, [refreshEvents, refreshResults]);

  const event = useMemo(
    () => events.find((item) => item.id === eventId),
    [events, eventId]
  );

  const participants = useMemo(
    () =>
      results.filter((item) => item.eventId === eventId).sort((a, b) => b.id - a.id),
    [results, eventId]
  );

  if (!event) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-center text-white/70 backdrop-blur">
        未找到活动 #{eventId}，请确认活动 ID 是否正确或刷新后重试。
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-white backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">活动详情 · Event #{event.id}</h1>
            <p className="text-sm text-white/70">
              组织者：{event.organizer.slice(0, 6)}…{event.organizer.slice(-4)}
            </p>
            <p className="text-sm text-white/70">
              时间窗口：{event.startTime ? new Date(event.startTime * 1000).toLocaleString() : "未设定"} —{" "}
              {event.endTime ? new Date(event.endTime * 1000).toLocaleString() : "不限"}
            </p>
          </div>
          <Link
            href={`/test?eventId=${event.id}`}
            className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2 text-sm font-semibold text-white shadow shadow-cyan-500/30 transition hover:from-cyan-400 hover:to-blue-400"
          >
            参与并提交成绩
          </Link>
        </div>
        <p className="mt-4 text-xs text-white/55 break-all">CID: {event.eventCID || "N/A"}</p>
        <p className="mt-2 text-xs text-white/55 break-all">rulesHash: {event.rulesHash}</p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-white backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">
            参与者 ({participants.length})
          </h2>
          <button
            onClick={() => {
              refreshResults();
            }}
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
          >
            刷新
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {participants.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
              尚无玩家提交该活动的成绩，成为第一个吧！
            </p>
          ) : (
            participants.map((participant) => (
              <Link
                key={participant.id}
                href={`/results/${participant.id}`}
                className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/75 transition hover:border-cyan-400/40 hover:text-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-semibold text-white">
                    成绩 #{participant.id}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                    {participant.visibility === "public"
                      ? "公开"
                      : participant.visibility === "encrypted"
                        ? "加密"
                        : "私密"}
                  </span>
                </div>
                <p className="text-xs text-white/55">
                  提交者：{participant.player.slice(0, 6)}…{participant.player.slice(-4)} ·{" "}
                  {new Date(participant.submittedAt * 1000).toLocaleString()}
                </p>
                <p className="text-xs text-white/55">
                  成绩：
                  {participant.visibility === "public"
                    ? `${participant.valueMs} ms`
                    : participant.decryptedValue !== undefined
                      ? `${participant.decryptedValue} ms`
                      : "🔐 密文"}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

