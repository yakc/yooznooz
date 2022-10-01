import { decode } from "rfc2047";
import { From } from "yooznooz/lib/usenet.ts";
import { ExtArticle, ExtOverview, Middleware } from "yooznooz/lib/ware.ts";

function decodeFrom(from: From) {
  from.name = decode(from.name);
}

export default {
  overview: (o: ExtOverview) => {
    decodeFrom(o.from);
    o.subject = decode(o.subject);
  },
  article: (a: ExtArticle) => {
    decodeFrom(a.from);
    a.subject = decode(a.subject);
  },
} as Middleware;
