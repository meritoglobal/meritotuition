import { writeFileSync, mkdirSync } from "node:fs";
import { seedLibrary } from "../content";
const lib = seedLibrary();
mkdirSync("out", { recursive: true });
writeFileSync("out/sample-sheet.html", lib.sheetHtml("topic_c9_phy_ch2_t2", undefined, undefined, true));
writeFileSync("out/sample-slides.json", JSON.stringify(lib.slides("topic_c9_phy_ch2_t2"), null, 2));
const exam = lib.makeExam({ teacherId: "demo", topicIds: ["topic_c9_phy_ch2_t2"], preset: "QUICK_QUIZ", seed: 11 });
writeFileSync("out/sample-exam.json", JSON.stringify(exam, null, 2));
console.log("ok", exam.items.length);
