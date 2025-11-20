"use client";

import type { ReactNode } from "react";

import { MetaMaskProvider } from "@/hooks/metamask/useMetaMaskProvider";
import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";
import { MetaMaskEthersSignerProvider } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { ReflexProofProvider } from "@/components/reflex/ReflexProofProvider";

type Props = {
  children: ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <MetaMaskProvider>
      <MetaMaskEthersSignerProvider initialMockChains={{ 31337: "http://localhost:8545" }}>
        <InMemoryStorageProvider>
          <ReflexProofProvider>{children}</ReflexProofProvider>
        </InMemoryStorageProvider>
      </MetaMaskEthersSignerProvider>
    </MetaMaskProvider>
  );
}
