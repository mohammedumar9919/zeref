import { PHASE0_CONTRACT_VERSION } from "@zeref/contracts";

export const DOMAIN_PACKAGE_ID = "@zeref/domain";

export function getDomainPhase(): string {
  return PHASE0_CONTRACT_VERSION;
}