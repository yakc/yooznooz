import { From } from "yooznooz/lib/usenet.ts";
import { patchWindows1252 as patch } from "nntp";
import { ExtArticle, ExtOverview } from "yooznooz/lib/ware.ts";

function patchFrom(from: From) {
  from.name = patch(from.name);
}

export default {
  overview: (o: ExtOverview) => {
    patchFrom(o.from);
    o.subject = patch(o.subject);
  },
  article: (a: ExtArticle) => {
    patchFrom(a.from);
    a.subject = patch(a.subject);
    a.body = patch(a.body);
  },
};
