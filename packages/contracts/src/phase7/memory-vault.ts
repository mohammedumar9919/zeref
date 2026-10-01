import { z } from "zod";

/** Vault items are `memory_entries` rows with `source = 'vault'` and `metadata_json.kind` (CLOUD-C3). */
export const VaultKindSchema = z.enum([
  "confirmed_turn",
  "rejection",
  "correction",
  "pin",
]);

export const VaultItemSchema = z
  .object({
    id: z.string().uuid(),
    kind: VaultKindSchema,
    content: z.string().min(1),
    entityId: z.string().uuid().nullable().optional(),
    sourceTurnId: z.string().min(1).nullable().optional(),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const VaultForgetResultSchema = z
  .object({
    deleted: z.boolean(),
  })
  .strict();

export type VaultKind = z.infer<typeof VaultKindSchema>;
export type VaultItem = z.infer<typeof VaultItemSchema>;
export type VaultForgetResult = z.infer<typeof VaultForgetResultSchema>;
