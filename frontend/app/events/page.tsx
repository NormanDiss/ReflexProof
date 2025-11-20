"use client";

import { useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";

import { useReflexProofApp } from "@/components/reflex/ReflexProofProvider";
import type { ReflexEventInfo } from "@/hooks/useReflexProof";

export default function EventsPage() {
  const { reflex } = useReflexProofApp();
  const [eventCID, setEventCID] = useState("");
  const [rules, setRules] = useState("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rules) return;
    try {
      setIsSubmitting(true);
      const rulesHash = ethers.keccak256(ethers.toUtf8Bytes(rules));
      const startTimestamp = startTime ? new Date(startTime) : undefined;
      const endTimestamp = endTime ? new Date(endTime) : undefined;
      await reflex.createEvent({
        eventCID,
        rulesHash,
        startTime: startTimestamp,
        endTime: endTimestamp,
      });
      setEventCID("");
      setRules("");
      setStartTime("");
      setEndTime("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-white backdrop-blur">
        <h1 className="text-3xl font-semibold">赛事 / 实验管理</h1>
        <p className="mt-2 text-sm text-white/70">
          组织者可以创建链上活动，供玩家在指定时间窗口内提交成绩。活动信息可存储于 IPFS，并通过 rulesHash 保证一致性。
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          <p>
            若当前账户尚未获得 Organizer 权限，可点击下方按钮尝试向合约请求授权（需具备管理员角色）。
          </p>
          <button
            onClick={async () => {
              try {
                setIsRequesting(true);
                await reflex.requestOrganizerRole();
              } finally {
                setIsRequesting(false);
              }
            }}
            disabled={isRequesting}
            className="rounded-full border border-cyan-400/40 px-4 py-2 text-xs text-cyan-200 transition hover:border-cyan-200 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRequesting ? "授权中…" : "请求 Organizer 授权"}
          </button>
        </div>
        <form onSubmit={submitForm} className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-wide text-white/50">
              Event CID（IPFS 或元数据地址）
            </label>
            <input
              value={eventCID}
              onChange={(e) => setEventCID(e.target.value)}
              placeholder="ipfs://..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-white/50">
              开始时间
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-white/50">
              结束时间
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-wide text-white/50">
              赛事规则 / 验证说明
            </label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={4}
              placeholder="例如：完成 5 次测试取平均值；需视频录屏等。"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none"
              required
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2 text-sm font-semibold text-white shadow shadow-cyan-500/30 transition hover:from-cyan-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "创建中…" : "创建活动"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-white backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">已创建的活动</h2>
          <button
            onClick={() => reflex.refreshEvents()}
            disabled={reflex.isRefreshingEvents}
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reflex.isRefreshingEvents ? "刷新中…" : "刷新"}
          </button>
        </div>
        <div className="mt-6 space-y-4">
          {reflex.events.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
              尚未创建任何活动。
            </p>
          ) : (
            reflex.events.map((event) => <EventCard key={event.id} event={event} />)
          )}
        </div>
      </section>
    </div>
  );
}

function EventCard({ event }: { event: ReflexEventInfo }) {
  const start = event.startTime ? new Date(event.startTime * 1000).toLocaleString() : "未设定";
  const end = event.endTime ? new Date(event.endTime * 1000).toLocaleString() : "不限";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-white/50">
          Event #{event.id}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          组织者：{event.organizer.slice(0, 6)}…{event.organizer.slice(-4)}
        </span>
      </div>
      <p className="mt-3 text-xs text-white/50">
        时间窗口：{start} — {end}
      </p>
      <p className="mt-3 break-all text-xs text-white/45">
        CID: {event.eventCID || "N/A"}
      </p>
      <p className="mt-2 break-all text-xs text-white/45">
        rulesHash: {event.rulesHash}
      </p>
      <Link
        href={`/events/${event.id}`}
        className="mt-4 inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
      >
        查看详情 →
      </Link>
    </div>
  );
}

