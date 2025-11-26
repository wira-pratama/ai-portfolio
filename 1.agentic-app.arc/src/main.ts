import "dotenv/config";
import sharp from "sharp";
import express from "express";
import paper from "paper";

import AffinityDiagram from "./charts/arc.ts";
import { initializePaper, getScoreTable } from "./helper.ts";
import type { Table, Relations } from "./types/arc.ts";
import { agentLoop } from "./ai/agent.ts";

const app = express();
const port = 3000;

app.use(express.json());

app.post("/ai", async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ error: "Missing 'prompt' string" });
        }

        const result = await agentLoop(prompt);

        res.json({ ...result });
    } catch (err) {
        console.error("AI Error:", err);
        res.status(500).json({ error: "AI agent failure" });
    }
});

app.post("/ai/image", async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ error: "Missing 'prompt' string" });
        }

        const result = await agentLoop(prompt);

        if (result.render && result.renderType) {
            const buffer = Buffer.from(result.render, "base64");

            if (result.renderType === "png-base64") {
                res.setHeader("Content-Type", "image/png");
                return res.send(buffer);
            }

            if (result.renderType === "svg-base64") {
                res.setHeader("Content-Type", "image/svg+xml");
                return res.send(buffer);
            }
        }

        return res.json({ ...result });
    } catch (err) {
        console.error("AI Error:", err);
        res.status(500).json({ error: "AI agent failure" });
    }
});

app.post("/arc", async (req, res) => {
    try {
        /*
            JSON Payload should be:
            {
                returnSVG: bool,
                scoreTable: "en" | "id"
                reasonTable: Table
                relations: Relations
            }

            Params >>>
        */
        const body = req.body || {};

        const diagramTitle = String(body.title) ?? "Affinity Diagram";
        const diagramSubTitle =
            String(body.subtitle) ?? `${new Date().toDateString()}`;

        const returnSVG =
            req.query.returnSVG === "false" ? false : body.returnSVG ?? true;

        const scoreLang =
            typeof req.query.scoreTable === "string"
                ? req.query.scoreTable
                : body.scoreTable ?? "en";

        const scoreTable: Table = getScoreTable(scoreLang);

        const reasonTable: Table =
            (body.reasonTable ||
                (typeof req.query.reasonTable === "object"
                    ? req.query.reasonTable
                    : {})) ??
            {};

        const relations: Relations =
            (body.relations ||
                (typeof req.query.relations === "object"
                    ? req.query.relations
                    : {})) ??
            {};

        /*
            <<< Params
        */

        /*
            SVG Generation Sequence >>>
        */
        initializePaper();
        const tmp = new AffinityDiagram(
            paper,
            relations,
            scoreTable,
            reasonTable
        );
        tmp.drawDiagram(20, diagramTitle, diagramSubTitle);

        initializePaper(tmp.dimX + 20, tmp.dimY + 20);
        const diagram = new AffinityDiagram(
            paper,
            relations,
            scoreTable,
            reasonTable
        );
        diagram.drawDiagram(20, diagramTitle, diagramSubTitle);
        /*
            <<< SVG Generation Sequence
        */

        const svg = paper.project.exportSVG({ asString: true });
        if (returnSVG) {
            res.setHeader("Content-Type", "image/svg+xml");
            res.send(svg);
        } else {
            const png = await sharp(Buffer.from(svg as any))
                .png()
                .toBuffer();

            res.setHeader("Content-Type", "image/png");
            res.send(png);
        }

        console.log(`Rendered ARC ${returnSVG ? ".svg" : ".png"}`);
    } catch (error) {
        console.error("Error generating SVG:", error);
        res.status(500).json({ error: "Failed to generate SVG" });
    }
});

app.listen(port, () => {
    console.log(`Paper.js SVG server running at http://localhost:${port}`);
});
