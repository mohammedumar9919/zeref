import { PHASE0_CONTRACT_VERSION } from "@zeref/contracts";

export function getWebPhaseMarker(): string {
  return `web@${PHASE0_CONTRACT_VERSION}`;
}