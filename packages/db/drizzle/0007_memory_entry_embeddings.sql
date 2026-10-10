CREATE TABLE "memory_entry_embeddings" (
	"entry_id" uuid PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memory_entry_embeddings" ADD CONSTRAINT "memory_entry_embeddings_entry_id_memory_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."memory_entries"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "memory_entry_embeddings_model_idx" ON "memory_entry_embeddings" USING btree ("model");
