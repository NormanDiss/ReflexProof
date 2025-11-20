"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { ethers } from "ethers";

import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";
import { ReflexProofABI } from "@/abi/ReflexProofABI";
import { ReflexProofAddresses } from "@/abi/ReflexProofAddresses";
import type { GenericStringStorage } from "@/fhevm/GenericStringStorage";

type Visibility = "private" | "encrypted" | "public";

type ReflexProofInfoType = {
  abi: typeof ReflexProofABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

export type ReactionStats = {
  average: number;
  best: number;
  worst: number;
  stdev: number;
};

export type SubmitOptions = {
  rounds: number[];
  mode: number;
  visibility: Visibility;
  eventId?: bigint;
  frameRate?: number;
};

export type SubmitResultPayload = {
  resultId?: number;
  txHash?: string;
  resultHash: string;
  resultCID: string;
  payloadJSON: string;
  encryptionKey?: string;
  encryptionIv?: string;
  ciphertext?: string;
};

export type ReflexResult = {
  id: number;
  player: string;
  valueMs: number | null;
  visibility: Visibility;
  encryptedHandle: string;
  decryptedValue?: number;
  submittedAt: number;
  rounds: number;
  eventId: number;
  verified: boolean;
  certificateTokenId?: number;
};

export type ReflexEventInfo = {
  id: number;
  organizer: string;
  eventCID: string;
  startTime: number;
  endTime: number | null;
  rulesHash: string;
};

export type CreateEventOptions = {
  eventCID: string;
  startTime?: number | Date;
  endTime?: number | Date;
  rulesHash: string;
};

function visibilityToUint8(visibility: Visibility): number {
  switch (visibility) {
    case "private":
      return 0;
    case "encrypted":
      return 1;
    case "public":
      return 2;
  }
}

function visibilityFromUint8(value: number): Visibility {
  if (value === 2) return "public";
  if (value === 1) return "encrypted";
  return "private";
}

function getContractByChainId(chainId: number | undefined): ReflexProofInfoType {
  if (!chainId) {
    return { abi: ReflexProofABI.abi };
  }

  const entry =
    ReflexProofAddresses[chainId.toString() as keyof typeof ReflexProofAddresses];

  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: ReflexProofABI.abi, chainId };
  }

  return {
    address: entry.address as `0x${string}`,
    chainId: entry.chainId ?? chainId,
    chainName: entry.chainName,
    abi: ReflexProofABI.abi,
  };
}

function toBase64(array: Uint8Array): string {
  let binary = "";
  array.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

async function encryptPayload(payload: string): Promise<{
  key: string;
  iv: string;
  ciphertext: string;
}> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    cryptoKey,
    data
  );

  const ciphertext = toBase64(new Uint8Array(cipherBuffer));
  const key = toBase64(rawKey);
  const iv = toBase64(ivBytes);

  return { key, iv, ciphertext };
}

function computeStats(rounds: number[]): ReactionStats {
  if (rounds.length === 0) {
    return { average: 0, best: 0, worst: 0, stdev: 0 };
  }
  const sum = rounds.reduce((acc, value) => acc + value, 0);
  const average = sum / rounds.length;
  const best = Math.min(...rounds);
  const worst = Math.max(...rounds);
  const variance =
    rounds.reduce((acc, value) => acc + Math.pow(value - average, 2), 0) /
    rounds.length;
  const stdev = Math.sqrt(variance);
  return { average, best, worst, stdev };
}

function fingerprintDevice(frameRate?: number) {
  if (typeof navigator === "undefined") {
    return {
      userAgent: "unknown",
      language: "unknown",
      platform: "unknown",
      hardwareConcurrency: 0,
      deviceMemory: 0,
      screen: { width: 0, height: 0, pixelRatio: 0 },
      frameRate,
    };
  }
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency ?? 0,
    deviceMemory: (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 0,
    screen: {
      width: window.screen?.width ?? 0,
      height: window.screen?.height ?? 0,
      pixelRatio: window.devicePixelRatio ?? 0,
    },
    frameRate,
  };
}

export const useReflexProof = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<(ethersSigner: ethers.JsonRpcSigner | undefined) => boolean>;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [results, setResults] = useState<ReflexResult[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [decryptingIds, setDecryptingIds] = useState<Set<number>>(new Set());
  const [events, setEvents] = useState<ReflexEventInfo[]>([]);
  const [isRefreshingEvents, setIsRefreshingEvents] = useState<boolean>(false);

  const contractInfo = useMemo(() => {
    const info = getContractByChainId(chainId);
    if (!info.address) {
      setMessage(`ReflexProof deployment not found for chainId=${chainId}.`);
    }
    return info;
  }, [chainId]);

  const contractInterface = useMemo(
    () => new ethers.Interface(contractInfo.abi),
    [contractInfo.abi]
  );

  const readonlyContract = useMemo(() => {
    if (!contractInfo.address || !ethersReadonlyProvider) {
      return undefined;
    }
    return new ethers.Contract(contractInfo.address, contractInfo.abi, ethersReadonlyProvider);
  }, [contractInfo.address, contractInfo.abi, ethersReadonlyProvider]);

  const resultsRef = useRef<ReflexResult[]>([]);
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  const refreshResults = useCallback(async () => {
    if (!readonlyContract) {
      return;
    }
    try {
      setIsRefreshing(true);
      const totalResults: bigint = await readonlyContract.totalResults();
      const totalNumber = Number(totalResults);
      const fetchCount = Math.min(10, totalNumber);
      const ids = Array.from({ length: fetchCount }, (_, i) => totalNumber - i).filter((id) => id > 0);

      const fetched = await Promise.all(
        ids.map(async (id) => {
          const view = await readonlyContract.getResult(id);
          const encrypted = await readonlyContract.getEncryptedValue(id);
          return {
            id: Number(id),
            player: view.player as string,
            valueMs: view.valueMs === 0n ? null : Number(view.valueMs),
            visibility: visibilityFromUint8(Number(view.visibility)),
            encryptedHandle: encrypted as string,
            submittedAt: Number(view.submittedAt),
            rounds: Number(view.rounds),
            eventId: Number(view.eventId),
            verified: Boolean(view.verified),
            certificateTokenId:
              view.certificateTokenId && view.certificateTokenId > 0n
                ? Number(view.certificateTokenId)
                : undefined,
          } satisfies ReflexResult;
        })
      );
      setResults(fetched);
    } catch (error) {
      console.error(error);
      setMessage("Unable to refresh results from ReflexProof.");
    } finally {
      setIsRefreshing(false);
    }
  }, [readonlyContract]);

  useEffect(() => {
    refreshResults();
  }, [refreshResults]);

  const refreshEvents = useCallback(async () => {
    if (!readonlyContract) {
      return;
    }
    try {
      setIsRefreshingEvents(true);
      const totalEvents: bigint = await readonlyContract.totalEvents();
      const totalNumber = Number(totalEvents);
      const fetchCount = Math.min(8, totalNumber);
      const ids = Array.from({ length: fetchCount }, (_, i) => totalNumber - i).filter((id) => id > 0);

      const getEventFunc = readonlyContract.getFunction("getEvent");
      const fetched = await Promise.all(
        ids.map(async (id) => {
          const raw = await getEventFunc(id);
          return {
            id,
            organizer: raw.organizer as string,
            eventCID: raw.eventCID as string,
            startTime: Number(raw.startTime),
            endTime: raw.endTime ? Number(raw.endTime) : null,
            rulesHash: raw.rulesHash as string,
          } satisfies ReflexEventInfo;
        })
      );
      setEvents(fetched);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefreshingEvents(false);
    }
  }, [readonlyContract]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  useEffect(() => {
    if (!readonlyContract) {
      return;
    }

    const handler = async () => {
      await refreshResults();
    };

    readonlyContract.on("ResultSubmitted", handler);
    return () => {
      readonlyContract.off("ResultSubmitted", handler);
    };
  }, [readonlyContract, refreshResults]);

  useEffect(() => {
    if (!readonlyContract) {
      return;
    }

    const handler = async () => {
      await refreshEvents();
    };

    readonlyContract.on("EventCreated", handler);
    return () => {
      readonlyContract.off("EventCreated", handler);
    };
  }, [readonlyContract, refreshEvents]);

  const submitResult = useCallback(
    async (options: SubmitOptions): Promise<SubmitResultPayload | undefined> => {
      if (!instance || !ethersSigner || !contractInfo.address) {
        setMessage("FHEVM or signer is not ready.");
        return undefined;
      }

      if (!options.rounds.length) {
        setMessage("请先完成一次有效测试。");
        return undefined;
      }

      setIsSubmitting(true);
      try {
        const stats = computeStats(options.rounds);
        const addr = await ethersSigner.getAddress();
        const timestamp = Date.now();
        const device = fingerprintDevice(options.frameRate);
        const payload = {
          version: "1.0.0",
          wallet: addr,
          chainId,
          timestamp,
          mode: options.mode,
          rounds: options.rounds,
          stats,
          visibility: options.visibility,
          device,
        };

        const payloadJSON = JSON.stringify(payload);
        const payloadHash = ethers.keccak256(ethers.toUtf8Bytes(payloadJSON));
        const deviceHash = ethers.keccak256(
          ethers.toUtf8Bytes(JSON.stringify(device))
        );

        const roundsCount = BigInt(options.rounds.length);
        const averageRounded = Math.round(stats.average);
        const valueMs = options.visibility === "public" ? BigInt(averageRounded) : 0n;
        const eventId = options.eventId ?? 0n;

        const input = instance.createEncryptedInput(contractInfo.address, addr as `0x${string}`);
        input.add64(BigInt(averageRounded));
        const encrypted = await input.encrypt();

        let resultCID = "";
        let encryptionArtifacts: {
          ciphertext: string;
          key: string;
          iv: string;
        } | undefined;

        if (options.visibility === "public") {
          resultCID = `ipfs://public-${payloadHash.slice(2, 10)}`;
        } else if (options.visibility === "encrypted") {
          const enc = await encryptPayload(payloadJSON);
          encryptionArtifacts = enc;
          resultCID = `ipfs://enc-${ethers.keccak256(ethers.toUtf8Bytes(enc.ciphertext)).slice(2, 10)}`;
        } else {
          if (typeof window !== "undefined") {
            try {
              window.localStorage.setItem(`reflexproof:${payloadHash}`, payloadJSON);
            } catch (error) {
              console.warn("Failed to store private payload locally", error);
            }
          }
        }

        const contract = readonlyContract
          ? readonlyContract.connect(ethersSigner)
          : new ethers.Contract(contractInfo.address, contractInfo.abi, ethersSigner);

        const submitFn = contract.getFunction("submitResult");
        const tx = await submitFn({
          resultHash: payloadHash,
          resultCID,
          valueMs,
          mode: options.mode,
          visibility: visibilityToUint8(options.visibility),
          eventId,
          deviceHash,
          rounds: roundsCount,
          encryptedValue: encrypted.handles[0],
          encryptedProof: encrypted.inputProof,
        });

        setMessage(`交易发送中… ${tx.hash}`);
        const receipt = await tx.wait();
        setMessage(`成绩已上链，交易哈希 ${tx.hash}`);

        let resultId: number | undefined;
        for (const log of receipt.logs ?? []) {
          try {
            const parsed = contractInterface.parseLog(log);
            if (parsed?.name === "ResultSubmitted") {
              resultId = Number(parsed.args.resultId ?? parsed.args[0]);
            }
          } catch {
            // ignore
          }
        }

        await refreshResults();

        return {
          resultId,
          txHash: tx.hash,
          resultHash: payloadHash,
          resultCID,
          payloadJSON,
          encryptionKey: encryptionArtifacts?.key,
          encryptionIv: encryptionArtifacts?.iv,
          ciphertext: encryptionArtifacts?.ciphertext,
        };
      } catch (error) {
        console.error(error);
        setMessage("提交成绩失败，请重试。");
        return undefined;
      } finally {
        setIsSubmitting(false);
      }
    },
    [instance, ethersSigner, contractInfo.address, contractInfo.abi, chainId, readonlyContract, refreshResults, contractInterface, setMessage]
  );

  const decryptResult = useCallback(
    async (resultId: number) => {
      const current = resultsRef.current.find((item) => item.id === resultId);
      if (!current || !instance || !ethersSigner || !contractInfo.address) {
        return;
      }
      if (current.decryptedValue !== undefined) {
        return;
      }
      if (decryptingIds.has(resultId)) {
        return;
      }

      setDecryptingIds((prev) => new Set(prev).add(resultId));

      try {
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [contractInfo.address],
          ethersSigner,
          fhevmDecryptionSignatureStorage
        );

        if (!sig) {
          setMessage("无法生成解密签名。");
          return;
        }

        const res = await instance.userDecrypt(
          [{ handle: current.encryptedHandle, contractAddress: contractInfo.address }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        const decrypted = res[current.encryptedHandle as `0x${string}`];
        if (decrypted === undefined) {
          setMessage("解密结果无效。");
          return;
        }

        const decryptedNumber = Number(decrypted);
        setResults((prev) =>
          prev.map((item) =>
            item.id === resultId ? { ...item, decryptedValue: decryptedNumber } : item
          )
        );
      } finally {
        setDecryptingIds((prev) => {
          const copy = new Set(prev);
          copy.delete(resultId);
          return copy;
        });
      }
    },
    [
      contractInfo.address,
      decryptingIds,
      ethersSigner,
      fhevmDecryptionSignatureStorage,
      instance,
      setMessage,
    ]
  );

  const loadResult = useCallback(
    async (resultId: number): Promise<ReflexResult | null> => {
      if (!readonlyContract) {
        return null;
      }
      try {
        const view = await readonlyContract.getResult(resultId);
        const encrypted = await readonlyContract.getEncryptedValue(resultId);
        const mapped: ReflexResult = {
          id: resultId,
          player: view.player as string,
          valueMs: view.valueMs === 0n ? null : Number(view.valueMs),
          visibility: visibilityFromUint8(Number(view.visibility)),
          encryptedHandle: encrypted as string,
          submittedAt: Number(view.submittedAt),
          rounds: Number(view.rounds),
          eventId: Number(view.eventId),
          verified: Boolean(view.verified),
          certificateTokenId:
            view.certificateTokenId && view.certificateTokenId > 0n
              ? Number(view.certificateTokenId)
              : undefined,
        };
        setResults((prev) => {
          const exists = prev.some((item) => item.id === resultId);
          if (exists) {
            return prev.map((item) => (item.id === resultId ? { ...item, ...mapped } : item));
          }
          return [...prev, mapped].sort((a, b) => b.id - a.id);
        });
        return mapped;
      } catch (error) {
        console.error(error);
        return null;
      }
    },
    [readonlyContract]
  );

  const createEvent = useCallback(
    async (options: CreateEventOptions) => {
      if (!contractInfo.address || !ethersSigner) {
        setMessage("钱包或网络未准备好。");
        return undefined;
      }
      try {
        const normalize = (value?: number | Date) => {
          if (!value) return 0n;
          if (value instanceof Date) {
            return BigInt(Math.floor(value.getTime() / 1000));
          }
          return BigInt(Math.floor(value / 1000));
        };
        const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, ethersSigner);
        const tx = await contract.createEvent(
          options.eventCID,
          normalize(options.startTime),
          normalize(options.endTime),
          options.rulesHash
        );
        setMessage("赛事创建交易已发送。");
        await tx.wait();
        setMessage("赛事已创建成功。");
        await refreshEvents();
        return tx.hash;
      } catch (error) {
        console.error(error);
        setMessage("创建赛事失败，请检查权限。");
        return undefined;
      }
    },
    [contractInfo.address, contractInfo.abi, ethersSigner, refreshEvents]
  );

  const requestOrganizerRole = useCallback(async () => {
    if (!contractInfo.address || !ethersSigner) {
      setMessage("当前钱包或网络未准备好。");
      return undefined;
    }
    try {
      const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, ethersSigner);
      const role: string = await contract.ORGANIZER_ROLE();
      const address = await ethersSigner.getAddress();
      const tx = await contract.grantRole(role, address);
      setMessage("请求授权交易已发送，等待确认...");
      await tx.wait();
      setMessage("已成功获取 Organizer 授权。");
      return tx.hash;
    } catch (error) {
      console.error(error);
      setMessage("请求授权失败，请确认当前账户具备管理员权限。");
      return undefined;
    }
  }, [contractInfo.address, contractInfo.abi, ethersSigner]);

  const canSubmit = useMemo(() => {
    return Boolean(instance && ethersSigner && contractInfo.address && !isSubmitting);
  }, [instance, ethersSigner, contractInfo.address, isSubmitting]);

  return {
    contractAddress: contractInfo.address,
    isDeployed: Boolean(contractInfo.address && contractInfo.address !== ethers.ZeroAddress),
    canSubmit,
    submitResult,
    isSubmitting,
    message,
    results,
    refreshResults,
    decryptResult,
    decryptingIds,
    isRefreshing,
    events,
    refreshEvents,
    createEvent,
    isRefreshingEvents,
    loadResult,
    requestOrganizerRole,
  };
};

