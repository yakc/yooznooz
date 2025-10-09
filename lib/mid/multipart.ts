import { unquoteString } from "yooznooz/lib/format.ts";
import { NewsAttachment } from "yooznooz/lib/model.ts";
import { ExtArticle, Middleware } from "yooznooz/lib/ware.ts";

interface Header {
  name: string;
  value: string;
  extra: Record<string, string>;
}

interface Part {
  headers: Record<string, Header>;
  contentType: string;
  contentEncoding: string;
  contentDisposition: string;
  lines: string[];
}

function parseHeader(line: string): Header {
  const colon = line.indexOf(":");
  if (colon < 0) {
    return {
      name: line,
      value: "",
      extra: {},
    };
  }
  const name = line.slice(0, colon).toLowerCase();
  const rest = line.slice(colon + 1).trim().split(/;\s*/); //TODO quoted semicolons?
  const value = rest.shift() || "";
  const extra = rest.reduce<Record<string, string>>((a, x) => {
    const equal = x.indexOf("=");
    if (equal < 0) {
      a[x] = "";
    } else {
      a[x.slice(0, equal)] = x.slice(equal + 1);
    }
    return a;
  }, {});
  return { name, value, extra };
}

export default {
  article(a: ExtArticle) {
    if (!a.contentType?.boundary) {
      return;
    }
    const boundary = "--" + a.contentType?.boundary;

    const lines = a.body.split("\n");
    let i = 0;
    while (i < lines.length) {
      if (lines[i++].startsWith(boundary)) {
        break;
      }
    }

    const parts: Part[] = [];

    function extractPart(boundary: string, lines: string[], i: number) : {part: Part, i: number} {
      const p: Part = {
        headers: {},
        contentType: "",
        contentEncoding: "",
        contentDisposition: "",
        lines: [],
      };
      let h = "";
      let t = lines[i++];
      while (t) {
        if (h) {
          if (/^\s/.test(t)) {
            h += t;
          } else {
            const header = parseHeader(h);
            p.headers[header.name] = header;
            h = t;
          }
        } else {
          h = t;
        }
        t = lines[i++];
      }
      if (h) {
        const header = parseHeader(h);
        p.headers[header.name] = header;
      }

      p.contentType = p.headers["content-type"]?.value || "";
      p.contentEncoding = p.headers["content-transfer-encoding"]?.value || "";
      p.contentDisposition = p.headers["content-disposition"]?.value || "";

      const start = i;
      while (i < lines.length) {
        if (lines[i].startsWith(boundary)) {
          break;
        }
        ++i;
      }

      p.lines = lines.slice(start, i);
      ++i;

      return {part: p, i};
    }

    while (i < lines.length) {
      let part: Part;
      ({ part, i} = extractPart(boundary, lines, i));
      parts.push(part);
    }

    let text: Part;
    const images: Part[] = [];
    const attachments: Part[] = [];
    for (const p of parts) {
      if (p.contentType.startsWith("text/")) {
        if (p.contentDisposition) {
          attachments.push(p);
        } else if (!text!) {
          text = p;
        }
      } else if (p.contentType.startsWith("image/")) {
        images.push(p);
      } else if (p.contentType.startsWith("application/")) {
        attachments.push(p);
      } else if (p.contentType === "multipart/alternative") {
        let altBoundary = unquoteString(p.headers["content-type"]?.extra.boundary);
        const alts: Record<string, Part> = {};
        if (altBoundary) {
          altBoundary = "--" + altBoundary;
          let part: Part;
          i = 0;
          while (i < p.lines.length) {
            ({part, i} = extractPart(altBoundary, p.lines, i));
            alts[part.contentType] = part;
          }
        }
        text = alts["text/plain"];
        if (!text) {
          text = alts["text/html"];
          if (!text) {
            console.log("could not find preferred multipart/alternative among", Object.keys(alts));
            text = p;
          }
        }
      } else {
        console.log(
          "unsupported multipart content",
          p.headers["content-type"],
        );
      }
    }

    if (text!) {
      a.body = text.lines.join("\n"); // LF for body which turns into HTML
    }

    function attach(p: Part): NewsAttachment {
      const disposition = p.headers["content-disposition"]?.extra["filename"];
      const name = disposition || p.headers["content-type"]?.extra["name"];
      const { contentType, contentEncoding } = p;
      const data = p.lines.join("\r\n"); // CRLF to preserve binary data, if any
      return {
        name: unquoteString(name),
        contentType,
        contentEncoding,
        data,
      };
    }

    if (images.length) {
      a.ext.img = images.map(attach);
    }
    if (attachments.length) {
      a.ext.attach = attachments.map(attach);
    }

    a.ext.multipart = true;
  },
} as Middleware;
