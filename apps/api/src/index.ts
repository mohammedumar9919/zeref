import { PHASE0_CONTRACT_VERSION } from "@zeref/contracts";
import { getDomainPhase } from "@zeref/domain";

export function createApiApp() {
  return {
    name: "@zeref/api",
    contractVersion: PHASE0_CONTRACT_VERSION,
    domainPhase: getDomainPhase(),
  };
}