import { describe, expect, it } from "vitest";
import {
  bookmarkToAnchorId,
  itemAnchorId,
  sectionAnchorId,
  sectionBookmark,
  sectionFromBookmark,
  toBookmarkToken,
  toCompanyCode,
  topicBookmark,
} from "./bookmarks";
import { SECTION_DEFINITIONS, SECTION_KEYS } from "./sections";

describe("toCompanyCode", () => {
  it("upper-cases and joins words with underscores", () => {
    expect(toCompanyCode("ISB Vietnam")).toBe("ISB_VIETNAM");
    expect(toCompanyCode("isb")).toBe("ISB");
  });

  it("strips Vietnamese diacritics including đ/Đ", () => {
    expect(toCompanyCode("Công ty Cổ phần Đất Việt")).toBe("CONG_TY_CO_PHAN_DAT_VIET");
    expect(toCompanyCode("Tiki – Thương mại điện tử")).toBe("TIKI_THUONG_MAI_DIEN_TU");
    expect(toCompanyCode("Ngân hàng Á Châu")).toBe("NGAN_HANG_A_CHAU");
  });

  it("collapses punctuation and trims leading/trailing separators", () => {
    expect(toCompanyCode("  --Acme, Inc.!!  ")).toBe("ACME_INC");
    expect(toCompanyCode("A&B   Co")).toBe("A_B_CO");
    expect(toCompanyCode("web3.0 labs")).toBe("WEB3_0_LABS");
  });

  it("falls back to COMPANY when nothing usable remains", () => {
    expect(toCompanyCode("")).toBe("COMPANY");
    expect(toCompanyCode("!!!")).toBe("COMPANY");
  });

  it("is idempotent", () => {
    const once = toCompanyCode("Đông Á Bank");
    expect(toCompanyCode(once)).toBe(once);
  });
});

describe("section and topic bookmarks", () => {
  it("builds BOOKMARK_[COMPANY]_[SECTION]", () => {
    expect(sectionBookmark("ISB", "jd")).toBe("BOOKMARK_ISB_JD");
    expect(sectionBookmark("ISB", "systemDesign")).toBe("BOOKMARK_ISB_SYSTEM_DESIGN");
    expect(sectionBookmark("isb vietnam", "star")).toBe("BOOKMARK_ISB_VIETNAM_STAR");
  });

  it("builds topic bookmarks from free-form topic codes", () => {
    expect(topicBookmark("ISB", "REACT")).toBe("BOOKMARK_ISB_REACT");
    expect(topicBookmark("ISB", "js-ts")).toBe("BOOKMARK_ISB_JS_TS");
    expect(toBookmarkToken("Web Socket")).toBe("WEB_SOCKET");
  });

  it("produces unique bookmarks for all 16 sections", () => {
    const all = SECTION_KEYS.map((k) => sectionBookmark("ISB", k));
    expect(new Set(all).size).toBe(16);
  });
});

describe("anchors", () => {
  it("converts bookmarks to lower-case kebab anchor ids", () => {
    expect(bookmarkToAnchorId("BOOKMARK_ISB_SYSTEM_DESIGN")).toBe("bookmark-isb-system-design");
    expect(sectionAnchorId("ISB", "studyPlan")).toBe("bookmark-isb-study-plan");
    expect(bookmarkToAnchorId(topicBookmark("ISB", "REACT"))).toBe("bookmark-isb-react");
  });

  it("produces URL-safe item anchors", () => {
    expect(itemAnchorId("isb-q07")).toBe("item-isb-q07");
    expect(itemAnchorId("ISB_Q 7")).toBe("item-isb-q-7");
    expect(itemAnchorId("sd.1/2")).toMatch(/^item-[a-z0-9-]+$/);
  });
});

describe("sectionFromBookmark", () => {
  it.each(SECTION_KEYS)("round-trips %s through bookmark and anchor forms", (key) => {
    expect(sectionFromBookmark("ISB", sectionBookmark("ISB", key))).toBe(key);
    expect(sectionFromBookmark("ISB", sectionAnchorId("ISB", key))).toBe(key);
  });

  it("round-trips multi-word company codes", () => {
    const anchor = sectionAnchorId("ISB Vietnam", "cheatsheet");
    expect(anchor).toBe("bookmark-isb-vietnam-cheatsheet");
    expect(sectionFromBookmark("ISB Vietnam", anchor)).toBe("cheatsheet");
  });

  it("returns null for other companies, topics and unknown codes", () => {
    expect(sectionFromBookmark("ACME", "BOOKMARK_ISB_JD")).toBeNull();
    expect(sectionFromBookmark("ISB", "BOOKMARK_ISB_REACT")).toBeNull();
    expect(sectionFromBookmark("ISB", "item-isb-q01")).toBeNull();
    expect(sectionFromBookmark("ISB", "")).toBeNull();
  });

  it("keeps section codes consistent with definitions", () => {
    for (const key of SECTION_KEYS) {
      expect(sectionBookmark("X", key).endsWith(`_${SECTION_DEFINITIONS[key].code}`)).toBe(true);
    }
  });
});
