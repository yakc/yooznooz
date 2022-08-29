const nbsp = "\u00a0";

export function date(arg: Date, lang: string[]) {
  const f = new Intl.DateTimeFormat(lang, {
    dateStyle: "short",
    timeStyle: "short",
  });
  const ret = f.format(arg);
  // 8/28/22, 11:42 PM should not wrap on space before PM, but should after comma
  return ret.replace(/ ([a-z]+)/i, nbsp + "$1");
}
