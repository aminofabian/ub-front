"use client";

import {
  ReceiveMpesaFlow,
  type ReceiveDestinationKind,
} from "@/components/payments/receive-mpesa-flow";

export type { ReceiveDestinationKind };

type Props = {
  ownerPhone: string;
  countryCode?: string | null;
  onSkip: () => void;
  onDone: () => void;
};

/**
 * Onboarding wrapper — soft cream/teal language around the shared receive flow.
 */
export function OnboardingReceiveMpesaStep({
  ownerPhone,
  countryCode,
  onSkip,
  onDone,
}: Props) {
  return (
    <ReceiveMpesaFlow
      appearance="soft"
      ownerPhone={ownerPhone}
      countryCode={countryCode}
      showSkip
      skipLabel="Skip for now"
      onSkip={onSkip}
      onDone={onDone}
    />
  );
}
