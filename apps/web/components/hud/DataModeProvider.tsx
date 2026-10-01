"use client";

import { createContext, useContext } from "react";

export type DataMode = "fixture" | "live";

const DataModeContext = createContext<DataMode>("live");

export function DataModeProvider({
  mode,
  children,
}: {
  mode: DataMode;
  children: React.ReactNode;
}): React.ReactElement {
  return <DataModeContext.Provider value={mode}>{children}</DataModeContext.Provider>;
}

export function useDataMode(): DataMode {
  return useContext(DataModeContext);
}
