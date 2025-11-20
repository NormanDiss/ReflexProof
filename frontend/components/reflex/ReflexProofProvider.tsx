"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useReflexProof } from "@/hooks/useReflexProof";

type ReflexProofContextValue = ReturnType<typeof useReflexProofContextValue>;

const ReflexProofContext = createContext<ReflexProofContextValue | undefined>(undefined);

function useReflexProofContextValue() {
  const meta = useMetaMaskEthersSigner();
  const { storage } = useInMemoryStorage();
  const fhevm = useFhevm({
    provider: meta.provider,
    chainId: meta.chainId,
    initialMockChains: meta.initialMockChains,
    enabled: true,
  });
  const reflex = useReflexProof({
    instance: fhevm.instance,
    fhevmDecryptionSignatureStorage: storage,
    eip1193Provider: meta.provider,
    chainId: meta.chainId,
    ethersSigner: meta.ethersSigner,
    ethersReadonlyProvider: meta.ethersReadonlyProvider,
    sameChain: meta.sameChain,
    sameSigner: meta.sameSigner,
  });

  const isMockNetwork =
    meta.chainId && Object.keys(meta.initialMockChains ?? {}).includes(String(meta.chainId));

  return {
    meta,
    fhevm,
    reflex,
    mode: isMockNetwork ? "mock" : "relayer",
  } as const;
}

export function ReflexProofProvider({ children }: { children: ReactNode }) {
  const value = useReflexProofContextValue();

  return (
    <ReflexProofContext.Provider value={value}>
      {children}
    </ReflexProofContext.Provider>
  );
}

export function useReflexProofApp() {
  const context = useContext(ReflexProofContext);
  if (!context) {
    throw new Error(
      "useReflexProofApp must be used within ReflexProofProvider"
    );
  }
  return context;
}

