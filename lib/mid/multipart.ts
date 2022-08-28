import { NewsImage } from "../model.ts";
import { ExtArticle, Middleware } from "../ware.ts";

interface Header {
  name: string;
  value: string;
  extra: Record<string, string>;
}

interface Part {
  headers: Record<string, Header>;
  contentType: string;
  contentEncoding: string;
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

const ware: Middleware = {
  article(a: ExtArticle) {
    if (!a.body.startsWith("This is a multi-part message in MIME format")) {
      return;
    }

    const lines = a.body.split("\n");
    let i = 1;
    if (!lines[i]) {
      ++i; // Sometimes there is a blank line before boundary -- skip it
    }
    const boundary = lines[i++];
    const parts: Part[] = [];

    function extractPart(): Part {
      const p: Part = {
        headers: {},
        contentType: "",
        contentEncoding: "",
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

      const start = i;
      while (i < lines.length) {
        if (lines[i].startsWith(boundary)) {
          break;
        }
        ++i;
      }

      p.lines = lines.slice(start, i);
      ++i;

      return p;
    }

    while (i < lines.length) {
      parts.push(extractPart());
    }

    let text: Part;
    const images: Part[] = [];
    for (const p of parts) {
      if (p.contentType.startsWith("text/")) {
        text = p;
      } else if (p.contentType.startsWith("image/")) {
        images.push(p);
      } else {
        console.log(
          "unsupported multipart content",
          p.headers["content-type"],
        );
      }
    }

    if (text!) {
      a.body = text.lines.join("\n");
    }

    if (images.length) {
      a.ext.img = images.map<NewsImage>((p) => {
        const disposition = p.headers["content-disposition"]?.extra["filename"];
        const name = disposition || p.headers["content-type"]?.extra["name"];
        const { contentType, contentEncoding } = p;
        const data = p.lines.join("");
        return {
          name,
          contentType,
          contentEncoding,
          data,
        };
      });
    }

    a.ext.multipart = true;
  },
};

export default ware;
