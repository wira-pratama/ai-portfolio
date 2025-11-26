import paper from "paper";
import { JSDOM } from "jsdom";

export function initializePaper(width = 400, height = 400) {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");

    global.window = dom.window as any;
    global.document = dom.window.document;

    paper.setup(new paper.Size(width, height));
    paper.project.clear();
}

export function getScoreTable(language: string = "en") {
    switch (language) {
        case "en":
            return {
                A: "Absolutely Necessary",
                E: "Especially Important",
                I: "Important",
                O: "Ordinary Closeness",
                U: "Unnecessary",
                X: "Avoid Closeness",
                "0": "Relation Not Set",
            };

        case "id":
            return {
                A: "Sangat Diperlukan",
                E: "Sangat Penting",
                I: "Penting",
                O: "Kedekatan Biasa",
                U: "Tidak Diperlukan",
                X: "Hindari Kedekatan",
                "0": "Belum Diatur",
            };

        default:
            return {
                A: "Absolutely Necessary",
                E: "Especially Important",
                I: "Important",
                O: "Ordinary Closeness",
                U: "Unnecessary",
                X: "Avoid Closeness",
                "0": "Relation Not Set",
            };
    }
}
