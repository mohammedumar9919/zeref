import { PHASE10_CONTRACT_VERSION } from "@zeref/contracts";

export function getActivePhaseLabel(): string {
  const major = PHASE10_CONTRACT_VERSION.split(".")[0] ?? PHASE10_CONTRACT_VERSION;
  return `Phase ${major}`;
}

export function getWebPhaseMarker(): string {
  return `web@${PHASE10_CONTRACT_VERSION}`;
}
