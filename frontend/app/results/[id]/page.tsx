"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { useReflexProofApp } from "@/components/reflex/ReflexProofProvider";
import type { ReflexResult } from "@/hooks/useReflexProof";

export default function ResultDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const resultId = Number(params?.id ?? "0");
  const { reflex } = useReflexProofApp();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ReflexResult | null>(null);

  const cached = useMemo(
    () => reflex.results.find((item) => item.id === resultId),
    [reflex.results, resultId]
  );

  useEffect(() => {
    if (!resultId || Number.isNaN(resultId)) {
      router.replace("/leaderboard");
      return;
    }

    const load = async () => {
      setLoading(true);
      if (cached) {
        setDetail(cached);
        setLoading(false);
        return;
      }
      const fetched = await reflex.loadResult(resultId);
      setDetail(fetched);
      setLoading(false);
    };

    load();
  }, [cached, reflex, resultId, router]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-12 text-center text-white/70 backdrop-blur">
        正在加载成绩详情…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-12 text-center text-white/70 backdrop-blur">
        未找到成绩 #{resultId}，可能尚未上链或已被清理。
      </div>
    );
  }

  const isDecrypting = reflex.decryptingIds.has(detail.id);
  const displayScore =
    detail.visibility === "public"
      ? `${detail.valueMs} ms`
      : detail.decryptedValue !== undefined
        ? `${detail.decryptedValue} ms`
        : "🔐 密文";

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-white backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">
              成绩详情 · #{detail.id}
            </h1>
            <p className="text-sm text-white/65">
              提交时间：{new Date(detail.submittedAt * 1000).toLocaleString()}
            </p>
            <p className="text-sm text-white/65">
              提交者：{detail.player.slice(0, 6)}…{detail.player.slice(-4)}
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="rounded-full border border-white/10 px-5 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            返回排行榜
          </Link>
        </div>

        <div className="mt-8 grid gap-4 text-sm md:grid-cols-2">
          <InfoRow label="成绩（平均值）" value={displayScore} />
          <InfoRow
            label="可见性"
            value={
              detail.visibility === "public"
                ? "公开"
                : detail.visibility === "encrypted"
                  ? "链上密文"
                  : "仅本地记录"
            }
          />
          <InfoRow label="参与轮数" value={`${detail.rounds}`} />
          <InfoRow
            label="所属活动 ID"
            value={detail.eventId ? `#${detail.eventId}` : "未关联"}
          />
          <InfoRow
            label="证书 Token"
            value={detail.certificateTokenId ? `Token #${detail.certificateTokenId}` : "尚未颁发"}
          />
          <InfoRow label="验证状态" value={detail.verified ? "已验证" : "未验证"} />
        </div>

        {detail.visibility !== "public" && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            <p className="font-semibold text-white">加密数据说明</p>
            <p className="mt-2">
              此成绩以 Fully Homomorphic Encryption 加密存储。如果你是提交者或被授权的审核者，可点击
              「解密」获取明文。
            </p>
            <button
              disabled={isDecrypting}
              onClick={() => reflex.decryptResult(detail.id)}
              className="mt-4 rounded-full border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 transition hover:border-cyan-200 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {detail.decryptedValue !== undefined
                ? "已解密"
                : isDecrypting
                  ? "解密中..."
                  : "解密成绩"}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-white/70 backdrop-blur">
        <h2 className="text-xl font-semibold text-white">导出 & 证明</h2>
        <p className="mt-3 text-sm">
          - JSON 原始数据可通过浏览器本地存储或 IPFS CID 获取。
          <br />
          - 合约事件日志可作为链上不可篡改证据，建议记录 txHash。
          <br />- 可通过组织方颁发的 SBT 证书作为长期凭证。
        </p>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

