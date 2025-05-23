import { MessageLines, MessageOverviewRaw } from "nntp";
import { unquoteString } from "./format.ts";

const identity = <T>(x: T) => x;
const idParse = (line: string) => (/<[^\s<>]+@[^\s>]+>/.exec(line) || [""])[0];
const emailParse = (line: string): From => {
  let match, name = "", email = "";
  // deno-lint-ignore no-cond-assign
  if (match = /(.+)\s+<([^@]+@[^@]+)>/.exec(line)) {
    name = match[1];
    email = match[2];
    // deno-lint-ignore no-cond-assign
  } else if (match = /([^@]+@[^@]+)\s+(.+)/.exec(line)) {
    name = match[2];
    email = match[1];
    // deno-lint-ignore no-cond-assign
  } else if (match = /([^@]+@[^@]+)/.exec(line)) {
    email = match[1];
    // deno-lint-ignore no-cond-assign
  } else if (match = /(.+)\s+<(.+)>/.exec(line)) {
    // not an actual valid email -- allowed for now
    name = match[1];
    email = match[2];
  }
  return { email, name };
};
const dateParse = (line: string) => new Date(line);
const contentTypeParse = (line: string): ContentType | undefined => {
  if (!line) {
    return;
  }
  const parts = line.split(";").map((p) => p.trim());
  const mime = parts[0];
  const boundary = parts.slice(1).map((p) => {
    const parts = p.split("=").map((p) => p.trim());
    if (parts[0] === "boundary") {
      return unquoteString(parts[1]);
    }
  }).filter(identity)[0];
  const charset = parts.slice(1).map((p) => {
    const parts = p.split("=").map((p) => p.trim());
    if (parts[0] === "charset") {
      return parts[1];
    }
  }).filter(identity)[0];
  return { mime, boundary, charset };
};

const punctSeparator = /[ -,/:-@[-`{-~]+/; // with space, but no dot or hyphen
const punctSplit = (line: string) => line ? line.split(punctSeparator) : [];
const commaSpaceSeparator = /[\s,]+/;
const commaSpaceSplit = (line: string) =>
  line ? line.split(commaSpaceSeparator) : [];

type requiredHeader =
  | "From"
  | "Date"
  | "Newsgroups"
  | "Subject"
  | "Message-ID"
  | "Path";
type optionalHeader = "References" | "In-Reply-To" | "User-Agent" | "Lines";
type headerField = requiredHeader | optionalHeader;

type Parser<T> = (line: string) => T;

// RFC 1036 (Dec 1987)
// deno-lint-ignore no-unused-vars
const headerParser: {
  [field in headerField]: Parser<string | string[] | number | Date | From>;
} = {
  "From": emailParse,
  "Date": dateParse,
  "Newsgroups": commaSpaceSplit,
  "Subject": identity,
  "Message-ID": idParse,
  "Path": punctSplit,
  "References": commaSpaceSplit,
  "In-Reply-To": identity,
  "User-Agent": identity,
  "Lines": (line: string) => parseInt(line, 10),
};

type Newsgroup = string;

export interface From {
  email: string;
  name: string;
}

export interface Overview {
  number?: number; // returned by XOVER (may be zero), but not ARTICLE
  id: string;
  from: From;
  date: Date;
  subject: string;
  references: string[];
  inReplyTo?: string;
}

export interface ContentType {
  mime: string;
  boundary?: string;
  charset?: string;
}

export interface Headers extends Overview {
  newgroups: Newsgroup[];
  path: string[];
  lines: number;
  contentType?: ContentType;
  userAgent?: string;
}

export interface Article {
  headers: Headers;
  body: string;
}

export function parseOverview(dict: MessageOverviewRaw): Overview {
  return {
    number: parseInt(dict.number) || undefined, // neither NaN nor zero
    id: dict["message-id"],
    from: emailParse(dict.from),
    date: dateParse(dict.date),
    subject: dict.subject,
    references: commaSpaceSplit(dict.references),
  };
}

export function parseHeaders(msg: MessageLines): Headers {
  const dict = msg.headers.reduce(
    (ac: { [key: string]: string }, line: string) => {
      const colon = line.indexOf(":");
      if (colon >= 0) {
        const key = line.slice(0, colon);
        const value = line.slice(colon + 1).trim();
        ac[key] = value;
      }
      return ac;
    },
    {},
  );

  return {
    id: idParse(dict["Message-ID"]),
    from: emailParse(dict["From"]),
    date: dateParse(dict["Date"]),
    subject: dict["Subject"],
    references: commaSpaceSplit(dict["References"]),
    inReplyTo: dict["In-Reply-To"],
    newgroups: commaSpaceSplit(dict["Newsgroups"]),
    path: punctSplit(dict["Path"]),
    lines: parseInt(dict["Lines"], 10),
    contentType: contentTypeParse(dict["Content-Type"]),
    userAgent: dict["User-Agent"],
  };
}

export function parseArticle(msg: MessageLines): Article {
  return {
    headers: parseHeaders(msg),
    body: msg.body.join("\n"),
  };
}
