import { describe, expect, it } from "vitest";
import { translations } from "../lib/i18n/dictionary";

const en = translations.en;
const fr = translations.fr;

// The chat rail is bilingual by rule, and a missing French string is the one
// defect no type checker catches: both dictionaries are plain object literals,
// so dropping a key from one side still compiles and still renders. These tests
// are the guard for that.

describe("Translation dictionary parity", () => {
  it("covers: AC-12 en and fr define exactly the same keys", () => {
    const enKeys = Object.keys(en).sort();
    const frKeys = Object.keys(fr).sort();
    const missingInFrench = enKeys.filter((key) => !frKeys.includes(key));
    const missingInEnglish = frKeys.filter((key) => !enKeys.includes(key));
    expect({ missingInFrench, missingInEnglish }).toEqual({
      missingInFrench: [],
      missingInEnglish: [],
    });
  });

  it("covers: AC-12 no value is blank in either language", () => {
    const blank: string[] = [];
    for (const [language, dictionary] of Object.entries(translations)) {
      for (const [key, value] of Object.entries(dictionary)) {
        if (typeof value === "string" && value.trim() === "") blank.push(`${language}.${key}`);
      }
    }
    expect(blank).toEqual([]);
  });

  it("covers: AC-12 the rail keys added for the action menu exist in both languages", () => {
    const keys = [
      "chatDelete",
      "chatPinnedCheck",
      "chatPinnedFolder",
      "chatRenameFailed",
      "chatFolderCheckCount",
      "chatFolderCheckCountOne",
      "chatFolderCheckCountMore",
    ] as const;
    for (const key of keys) {
      expect(en[key], `en.${key}`).toBeTruthy();
      expect(fr[key], `fr.${key}`).toBeTruthy();
      expect(fr[key], `fr.${key} must not be the English string`).not.toBe(en[key]);
    }
  });

  it("covers: AC-12 the folder delete count keeps its placeholders in both languages", () => {
    for (const dictionary of [en, fr]) {
      for (const key of ["chatFolderCheckCount", "chatFolderCheckCountOne"] as const) {
        expect(dictionary[key], key).toContain("{count}");
        expect(dictionary[key], key).toContain("{more}");
      }
      expect(dictionary.chatFolderCheckCountMore).toBeTruthy();
    }
  });

  it("covers: AC-12 the folder count has a singular form distinct from the plural", () => {
    expect(en.chatFolderCheckCountOne).not.toBe(en.chatFolderCheckCount);
    expect(fr.chatFolderCheckCountOne).not.toBe(fr.chatFolderCheckCount);
  });

  it("covers: AC-3 the delete menu label is an imperative, not the dialog question", () => {
    // The menu item and the confirmation dialog ask different things, so they
    // must not be the same string. Sharing one key made the dropdown read
    // "Delete this check?", which is a question with no menu in it.
    expect(en.chatDelete).toBe("Delete");
    expect(fr.chatDelete).toBe("Supprimer");
    expect(en.chatDeleteSession).not.toBe(en.chatDelete);
    expect(fr.chatDeleteSession).not.toBe(fr.chatDelete);
    expect(en.chatDeleteSession.endsWith("?")).toBe(true);
    expect(en.chatDelete.endsWith("?")).toBe(false);
  });

  it("covers: AC-3 the two delete failure messages are different strings", () => {
    // An empty title and a save that did not land are different problems, and a
    // reader who fixed the first one must not think the second one happened.
    expect(en.chatRenameEmpty).not.toBe(en.chatRenameFailed);
    expect(fr.chatRenameEmpty).not.toBe(fr.chatRenameFailed);
  });

  it("covers: AC-5 the buttonless rename left no Save key behind", () => {
    // Renaming commits on blur or Enter and has no buttons, so the Save string
    // has no caller. A leftover key is dead weight that suggests a button
    // someone expects to find.
    expect("chatSave" in en).toBe(false);
    expect("chatSave" in fr).toBe(false);
  });
});
