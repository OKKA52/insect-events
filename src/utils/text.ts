/**
 * 全角文字を半角に変換（主に英数字と記号）、および全角スペースを半角スペースに変換
 */
export const toHalfWidth = (str: string): string => {
  return str
    .replace(/[！-～]/g, (ch: string) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ');
};

/**
 * カタカナをひらがなに変換（濁点や小文字も含めて対応）
 */
export const katakanaToHiragana = (str: string): string => {
  return str.replace(/[ァ-ヶ]/g, (ch: string) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
};
