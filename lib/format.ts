export const nbsp = "\u00a0";
export const bullet = "\u2022";

export default function format(lang: string[]) {
  return {
    num: num.bind(undefined, lang),
    date: date.bind(undefined, lang),
    ago: ago.bind(undefined, lang),
    agoLongTerm: agoLongTerm.bind(undefined, lang),
  };
}

export function num(lang: string[], n: number, zero?: boolean) {
  const f = new Intl.NumberFormat(lang);
  if (n || zero) {
    return f.format(+n);
  }
  return "";
}

export function date(lang: string[], arg: Date) {
  const f = new Intl.DateTimeFormat(lang, {
    dateStyle: "short",
    timeStyle: "short",
  });
  // handle e.g. new Date(''), which becomes "Invalid Date"
  const ret = isNaN(arg.valueOf()) ? String(arg) : f.format(arg);
  // 8/28/22, 11:42 PM should not wrap on space before PM, but should after comma
  return ret.replace(/ ([a-z]+)/i, nbsp + "$1");
}

export function ago(lang: string[], arg: Date, now?: Date) {
  if (!now) {
    now = new Date();
  }
  const millis = now.getTime() - arg.getTime();
  if (millis < 5000) {
    return `just${nbsp}now`;
  }
  const seconds = (millis - (millis % 1000)) / 1000;
  if (seconds < 90) {
    return `${seconds}${nbsp}sec${nbsp}ago`;
  }
  const minutes = (seconds - (seconds % 60)) / 60;
  if (minutes < 90) {
    return `${minutes}${nbsp}min${nbsp}ago`;
  }
  const hours = (minutes - (minutes % 60)) / 60;
  if (hours < 30) {
    return `${hours}${nbsp}hr${nbsp}ago`;
  }
  const days = (hours - (hours % 24)) / 24;
  if (days <= 3) {
    return `${days}${nbsp}dy${nbsp}ago`;
  }
  let options: Intl.DateTimeFormatOptions;
  if (now.getFullYear() === arg.getFullYear() || hours / 24 < 90) {
    options = {
      month: "short",
      day: "numeric",
    };
  } else {
    options = {
      month: "short",
      year: "numeric",
    };
  }
  const f = new Intl.DateTimeFormat(lang, options);
  return f.format(arg).replaceAll(/\s+/g, nbsp);
}

export function agoLongTerm(lang: string[], arg: Date, now?: Date) {
  if (!now) {
    now = new Date();
  }
  const millis = now.getTime() - arg.getTime();
  const seconds = (millis - (millis % 1000)) / 1000;
  const minutes = (seconds - (seconds % 60)) / 60;
  const hours = (minutes - (minutes % 60)) / 60;
  const days = (hours - (hours % 24)) / 24;
  if (days < 14) {
    if (days < 10) {
      return "";
    } else {
      return `${days}${nbsp}days${nbsp}ago`;
    }
  }
  let weeks = (days - (days % 7)) / 7;
  if (weeks <= 6) {
      return `${weeks}${nbsp}weeks${nbsp}ago`;
  }
  const quarters = (weeks - (weeks % 13)) / 13;
  if (quarters <= 4) {
    weeks -= quarters * 13;
    ++weeks;  // round up: 7 weeks is two months
    let months = (weeks - (weeks % 4)) / 4;
    months += quarters * 3;
    return `${months}${nbsp}months${nbsp}ago`;
  }
  const f = new Intl.DateTimeFormat(lang, {
    month: "short",
    year: "numeric",
  });
  return f.format(arg).replaceAll(/\s+/g, nbsp);
}

export function unquoteString(s: string | undefined) {
  if (!s) {
    return "";
  }
  return (/^"?(.*?)"?$/.exec(s) as string[])[1];
}

export function nonbreak(s: string) {
  return s.replaceAll(/\s+/g, nbsp);
}
