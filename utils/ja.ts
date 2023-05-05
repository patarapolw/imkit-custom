const CP_KATA_A = "ア".charCodeAt(0);
const CP_HIRA_A = "あ".charCodeAt(0);

export function toHiragana(s: string) {
  return s.replace(/\p{sc=Katakana}/gu, (c) =>
    String.fromCharCode(c.charCodeAt(0) - CP_KATA_A + CP_HIRA_A),
  );
}
