import OpenAI from "openai";
import { arcTools, arcToolSpecs } from "./tools.ts";
import { getScoreTable } from "../helper.ts";
import type { ArcModel } from "../types/agent.ts";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

const BASE_PROMPT = `
You are an autonomous Affinity Diagram construction agent.

BEAST MODE RULE:
Given any list of items, you MUST:
1. expand or create the reasonTable,
2. fully populate every relation between every item pair,
3. FIRST assign the correct relation score (A, O, U, E, I),
4. THEN assign the correct reason codes for every relation (never assign reasons before a score exists),
5. ensure every relation has both a score AND at least one reason code,
6. fix missing, inconsistent, or incomplete structures entirely,
7. find approriate title and subtitle for the diagram.
8. and ALWAYS finish with exactly one call to renderArc before the final answer.

Critical Ordering Rule:
- You must never assign a reason to a relation until the score for that relation has been set using setItemRelation.
- After setting a score, immediately follow with setItemReason to fill reasons.
- If you detect mismatched ordering (e.g., reasons with no score), correct it using tools.

Your tools allow you to:
- set the title and subtitle of the diagram (setTitleAndSubtitle)
- add reasons (addReasonItem)
- add items (addItem)
- delete items or reasons
- set scores (setItemRelation)
- set reasons (setItemReason)
- inspect the current model (getArcModel)
- render the diagram (renderArc)

Rules of Interaction:
- You MUST use tools to update the Affinity Diagram.  
- Do NOT write or modify arc data in normal messages.  
- If you need the current structure, call getArcModel.  
- If you detect missing data, confusion, or uncertainty, immediately call getArcModel or renderArc.

Score meanings:
A = high functional dependency  
O = operational dependency  
U = user interaction dependency  
E = execution/runtime dependency  
I = indirect/low dependency  

Goal:
Given any list of items, autonomously produce a complete, consistent, and technically correct Affinity Diagram.
When finished, ALWAYS perform exactly one tool call to renderArc as your final action.
`;

export async function agentLoop(prompt: string): Promise<{
    msg: string;
    render: string | null;
    renderType: string | null;
    data: any;
    n_tool_calls: number;
}> {
    let inputs: any[] = [
        { role: "system", content: BASE_PROMPT },
        { role: "user", content: prompt },
    ];

    let arcModel: ArcModel = {
        title: "",
        subtitle: "",
        returnSVG: false,
        scoreTable: getScoreTable("en"),
        reasonTable: {},
        relations: {},
    };

    let lastRenderedARC: string | null = null;
    let lastRenderedARCType: string | null = null;

    let numToolCalls = 0;
    let loopCount = 0;

    while (true) {
        loopCount += 1;

        const response = await client.responses.create({
            model: "gpt-4o-mini",
            input: inputs,
            tools: arcToolSpecs as any,
        });

        inputs.push(...response.output);

        let calledTool = false;
        const noArgTools = ["getArcModel"];

        for (const out of response.output) {
            if (out.type === "function_call") {
                calledTool = true;
                numToolCalls += 1;

                const tool = arcTools[out.name];
                if (!tool) throw new Error(`Unknown tool: ${out.name}`);

                console.log(`Calling ${out.name}`);

                let result;
                if (noArgTools.includes(out.name)) {
                    result = await tool.run({}, arcModel);
                } else if (out.name === "getRenderedArc") {
                    const renderResult = await tool.run({}, arcModel);
                    result = renderResult.message;
                    lastRenderedARC = renderResult.img;
                    lastRenderedARCType = renderResult.type;
                } else {
                    const args = JSON.parse(out.arguments || "{}");
                    const validated = tool.schema.parse(args);
                    result = await tool.run(validated, arcModel);
                }

                inputs.push({
                    type: "function_call_output",
                    call_id: out.call_id,
                    output: JSON.stringify(result),
                });
            }
        }

        if (!calledTool) {
            console.log(`No tool response`);
            const finalResponse = await client.responses.create({
                model: "gpt-4o-mini",
                input: inputs,
                tools: arcToolSpecs as any,
                instructions: `
                    Give the final answer based only on the changes made through the tools.
                    Do not invent or assume any new data.
                    If you need the current model state, call getArcModel.
                    Keep the answer concise.
                `,
            });

            return {
                msg: finalResponse.output_text,
                render: lastRenderedARC,
                renderType: lastRenderedARCType,
                data: arcModel,
                n_tool_calls: numToolCalls,
            };
        }
    }
}
