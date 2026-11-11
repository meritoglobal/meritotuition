/** Platform seed content. Each file = one topic (sheet + questions). */
import { ContentLibrary } from "../src/library";
import * as c9PhyCh2T2 from "./class9-physics-ch2-velocity-acceleration";

export function seedLibrary(lib = new ContentLibrary()): ContentLibrary {
  lib.addTopic(
    { id: "topic_c9_phy_ch2_t2", trackCode: "CLASS_9", subjectCode: "PHYSICS", chapter: 2, chapterTitle: "গতি", title: "বেগ ও ত্বরণ" },
    c9PhyCh2T2.sheet,
    c9PhyCh2T2.questions,
  );
  return lib;
}
