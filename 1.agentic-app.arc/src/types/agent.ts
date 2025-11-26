import { z } from "zod";

export interface ArcModel {
    title: string;
    subtitle: string;
    returnSVG: boolean;
    scoreTable: Record<string, string>;
    reasonTable: Record<string, string>;
    relations: Record<
        string,
        Record<
            string,
            {
                score: string;
                reasons: string[];
            }
        >
    >;
}

export interface AgentFunction {
    type: "function";
    name: string;
    description?: string;
    parameters: {
        type: "object";
        properties: Record<string, any>;
        required: string[];
        additionalProperties: boolean;
    };
}

export interface ToolEntry<Schema extends z.ZodTypeAny = any> {
    schema: Schema;
    spec: AgentFunction;
    run: (args: z.infer<Schema>, ...rest: any[]) => Promise<any>;
}
