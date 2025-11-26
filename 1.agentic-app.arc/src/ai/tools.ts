import { z } from "zod";
import type { ToolEntry, ArcModel } from "../types/agent.ts";

export const arcTools: Record<string, ToolEntry> = {
    getRenderedArc: {
        schema: z.object({}),
        spec: {
            type: "function",
            name: "getRenderedArc",
            description:
                "Render the current Affinity Diagram and send it to user.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
                additionalProperties: false,
            },
        },

        run: async (_args, arcModel: ArcModel) => {
            try {
                const res = await fetch("http://localhost:3000/arc", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: arcModel.title,
                        subtitle: arcModel.subtitle,
                        returnSVG: arcModel.returnSVG,
                        scoreTable: "en",
                        reasonTable: arcModel.reasonTable,
                        relations: arcModel.relations,
                    }),
                });

                console.log(res);

                if (!res.ok) {
                    return {
                        message: `✗ Failed to render diagram: ${res.statusText}`,
                        img: null,
                    };
                }

                let imgBase64;
                let type;

                if (arcModel.returnSVG) {
                    const svg = await res.text();
                    imgBase64 = Buffer.from(svg, "utf8").toString("base64");
                    type = "svg-base64";
                } else {
                    const buf = Buffer.from(await res.arrayBuffer());
                    imgBase64 = buf.toString("base64");
                    type = "png-base64";
                }

                return {
                    img: imgBase64,
                    type,
                    message: "✓ Rendered the Affinity Diagram successfully.",
                };
            } catch (err: any) {
                return {
                    message: `✗ Rendering error: ${err.message}`,
                    img: null,
                };
            }
        },
    },

    getArcModel: {
        schema: z.object({}),
        spec: {
            type: "function",
            name: "getArcModel",
            description:
                "Return the full Affinity Diagram model (reasonTable and relations).",
            parameters: {
                type: "object",
                properties: {},
                required: [],
                additionalProperties: false,
            },
        },
        run: async (_args, arcModel: ArcModel) => {
            return {
                arcModel,
            };
        },
    },

    setTitleAndSubtitle: {
        schema: z.object({
            title: z.string(),
            subtitle: z.string(),
        }),
        spec: {
            type: "function",
            name: "setTitleAndSubtitle",
            description: "Set the title and subtitle to the Affinity Diagram.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    subtitle: { type: "string" },
                },
                required: ["title", "subtitle"],
                additionalProperties: false,
            },
        },
        run: async ({ title, subtitle }, arcModel: ArcModel) => {
            arcModel.title = title;
            arcModel.subtitle = subtitle;

            return `✓ Changed title to "${arcModel.title}" with subtitle "${arcModel.subtitle}".`;
        },
    },

    addReasonItem: {
        schema: z.object({
            reasonDescription: z.string(),
        }),
        spec: {
            type: "function",
            name: "addReasonItem",
            description: "Add a new reason to reasonTable.",
            parameters: {
                type: "object",
                properties: {
                    reasonDescription: { type: "string" },
                },
                required: ["reasonDescription"],
                additionalProperties: false,
            },
        },
        run: async ({ reasonDescription }, arcModel: ArcModel) => {
            if (
                Object.values(arcModel.reasonTable).includes(reasonDescription)
            ) {
                return { success: false, error: "Reason already exists." };
            }

            const newKey = String(Object.keys(arcModel.reasonTable).length + 1);
            arcModel.reasonTable[newKey] = reasonDescription;

            return `✓ Added reason "${reasonDescription}" with code "${newKey}".`;
        },
    },

    deleteReasonItem: {
        schema: z.object({
            reasonCode: z.string(),
        }),
        spec: {
            type: "function",
            name: "deleteReasonItem",
            description:
                "Delete a reason and shift remaining reason codes down.",
            parameters: {
                type: "object",
                properties: {
                    reasonCode: { type: "string" },
                },
                required: ["reasonCode"],
                additionalProperties: false,
            },
        },
        run: async ({ reasonCode }, arcModel: ArcModel) => {
            if (!(reasonCode in arcModel.reasonTable)) {
                return `✗ Reason code "${reasonCode}" not found.`;
            }

            const total = Object.keys(arcModel.reasonTable).length;
            const shifted: string[] = [];

            // Shift reason codes down
            for (let i = Number(reasonCode); i < total; i++) {
                arcModel.reasonTable[String(i)] =
                    arcModel.reasonTable[String(i + 1)] ?? "";
                shifted.push(`${i + 1}→${i}`);
            }

            delete arcModel.reasonTable[String(total)];

            // Remove reason reference from all relation entries
            for (const pKey of Object.keys(arcModel.relations)) {
                for (const sKey of Object.keys(arcModel.relations)) {
                    if (pKey === sKey) continue;

                    const rel = arcModel.relations[pKey]?.[sKey];
                    if (!rel) continue;

                    const idx = rel.reasons.indexOf(reasonCode);
                    if (idx !== -1) rel.reasons.splice(idx, 1);
                }
            }

            return `✓ Deleted reason "${reasonCode}". Shifted: ${shifted.join(
                ", "
            )}.`;
        },
    },

    addItem: {
        schema: z.object({
            itemName: z.string(),
        }),
        spec: {
            type: "function",
            name: "addItem",
            description: "Add a new item to the relations matrix.",
            parameters: {
                type: "object",
                properties: {
                    itemName: { type: "string" },
                },
                required: ["itemName"],
                additionalProperties: false,
            },
        },
        run: async ({ itemName }, arcModel: ArcModel) => {
            if (itemName in arcModel.relations) {
                return `✗ Item "${itemName}" already exists.`;
            }

            // Add new row
            arcModel.relations[itemName] = {};

            const keys = Object.keys(arcModel.relations);
            const newRelations: string[] = [];

            for (const pKey of keys) {
                for (const sKey of keys) {
                    if (pKey === sKey) continue;

                    // Ensure parent row exists
                    arcModel.relations[pKey] ??= {};

                    // If this relation cell is newly created, track it
                    if (!arcModel.relations[pKey][sKey]) {
                        arcModel.relations[pKey][sKey] = {
                            score: "0",
                            reasons: [],
                        };
                        newRelations.push(`${pKey}→${sKey}`);
                    }
                }
            }

            return `✓ Added item "${itemName}". Initialized relations: ${newRelations.join(
                ", "
            )}.
            `;
        },
    },

    deleteItem: {
        schema: z.object({
            itemName: z.string(),
        }),
        spec: {
            type: "function",
            name: "deleteItem",
            description: "Delete an item from relations matrix.",
            parameters: {
                type: "object",
                properties: {
                    itemName: { type: "string" },
                },
                required: ["itemName"],
                additionalProperties: false,
            },
        },
        run: async ({ itemName }, arcModel: ArcModel) => {
            if (!(itemName in arcModel.relations)) {
                return `✗ Item "${itemName}" not found.`;
            }

            const removedRelations: string[] = [];

            // Remove row
            delete arcModel.relations[itemName];

            // Remove column
            for (const pKey of Object.keys(arcModel.relations)) {
                if (arcModel.relations[pKey]?.[itemName] !== undefined) {
                    delete arcModel.relations[pKey][itemName];
                    removedRelations.push(`${pKey}→${itemName}`);
                }
            }

            return `✓ Deleted item "${itemName}". Removed relations: ${
                removedRelations.join(", ") || "none"
            }.`;
        },
    },

    setItemRelation: {
        schema: z.object({
            item1: z.string(),
            item2: z.string(),
            score: z.string(),
        }),
        spec: {
            type: "function",
            name: "setItemRelation",
            description: "Set a score between two items.",
            parameters: {
                type: "object",
                properties: {
                    item1: { type: "string" },
                    item2: { type: "string" },
                    score: { type: "string" },
                },
                required: ["item1", "item2", "score"],
                additionalProperties: false,
            },
        },
        run: async ({ item1, item2, score }, arcModel: ArcModel) => {
            if (
                !(item1 in arcModel.relations) ||
                !(item2 in arcModel.relations)
            ) {
                return `✗ Either "${item1}" or "${item2}" does not exist.`;
            }

            if (!(score in arcModel.scoreTable)) {
                return `✗ "${score}" is not a valid score symbol.`;
            }

            const rel12 = arcModel.relations[item1]?.[item2];
            const rel21 = arcModel.relations[item2]?.[item1];

            if (!rel12 || !rel21) {
                return `✗ Relation entry missing between "${item1}" and "${item2}".`;
            }

            rel12.score = score;
            rel21.score = score;

            // SAFE NARROWING
            const row = arcModel.relations[item1];
            if (!row) return `✗ Relation row missing for "${item1}".`;

            const remaining = Object.entries(row)
                .filter(([target, r]) => target !== item1 && r.score === "0")
                .map(([target]) => `${item1}→${target}`);

            return `✓ Set relation ${item1}→${item2} to "${score}". Remaining unset: ${
                remaining.join(", ") || "none"
            }.`;
        },
    },

    setItemReason: {
        schema: z.object({
            item1: z.string(),
            item2: z.string(),
            reason: z.string(),
        }),
        spec: {
            type: "function",
            name: "setItemReason",
            description: "Add a reason to a relation.",
            parameters: {
                type: "object",
                properties: {
                    item1: { type: "string" },
                    item2: { type: "string" },
                    reason: { type: "string" },
                },
                required: ["item1", "item2", "reason"],
                additionalProperties: false,
            },
        },
        run: async ({ item1, item2, reason }, arcModel: ArcModel) => {
            if (!(reason in arcModel.reasonTable)) {
                return `✗ Reason code "${reason}" does not exist.`;
            }

            const rel12 = arcModel.relations[item1]?.[item2];
            const rel21 = arcModel.relations[item2]?.[item1];

            if (!rel12 || !rel21) {
                return `✗ Relation entry missing between "${item1}" and "${item2}".`;
            }

            if (rel12.reasons.includes(reason)) {
                return `✗ Reason "${reason}" already assigned to ${item1}→${item2}.`;
            }

            rel12.reasons.push(reason);
            rel21.reasons.push(reason);

            const missing = Object.keys(arcModel.reasonTable).filter(
                (code) => !rel12.reasons.includes(code)
            );

            return `✓ Added reason "${reason}" to ${item1}→${item2}.`;
        },
    },

    unsetItemReason: {
        schema: z.object({
            item1: z.string(),
            item2: z.string(),
            reason: z.string(),
        }),
        spec: {
            type: "function",
            name: "unsetItemReason",
            description: "Remove a reason from a relation.",
            parameters: {
                type: "object",
                properties: {
                    item1: { type: "string" },
                    item2: { type: "string" },
                    reason: { type: "string" },
                },
                required: ["item1", "item2", "reason"],
                additionalProperties: false,
            },
        },
        run: async ({ item1, item2, reason }, arcModel: ArcModel) => {
            if (!(reason in arcModel.reasonTable)) {
                return `✗ Reason code "${reason}" does not exist.`;
            }

            const rel12 = arcModel.relations[item1]?.[item2];
            const rel21 = arcModel.relations[item2]?.[item1];

            if (!rel12 || !rel21) {
                return `✗ Relation entry missing between "${item1}" and "${item2}".`;
            }

            const before = rel12.reasons.length;

            rel12.reasons = rel12.reasons.filter((r) => r !== reason);
            rel21.reasons = rel21.reasons.filter((r) => r !== reason);

            if (rel12.reasons.length === before) {
                return `✗ Reason "${reason}" was not assigned to ${item1}→${item2}.`;
            }

            return `✓ Removed reason "${reason}" from ${item1}→${item2}.`;
        },
    },
};

export const arcToolSpecs = Object.values(arcTools).map((t) => t.spec);
