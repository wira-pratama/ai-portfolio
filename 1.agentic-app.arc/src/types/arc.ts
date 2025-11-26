import { z } from "zod";

export const TableSchema = z.record(z.string(), z.string());

export const RelationSchema = z.object({
    score: z.string(),
    reasons: z.array(z.string()),
});

export const RelationsSchema = z.record(
    z.string(),
    z.record(z.string(), RelationSchema)
);

export type Table = z.infer<typeof TableSchema>;
export type Relation = z.infer<typeof RelationSchema>;
export type Relations = z.infer<typeof RelationsSchema>;
