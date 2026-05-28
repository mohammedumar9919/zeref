import { DOMAIN_PACKAGE_ID } from "@zeref/domain";

export function createWorkerApp() {
  return { name: "@zeref/worker", domainPackage: DOMAIN_PACKAGE_ID };
}