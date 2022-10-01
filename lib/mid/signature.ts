import { ExtArticle, Middleware } from "../ware.ts";

export default {
  article(a: ExtArticle) {
    const marker = a.body.indexOf("\n-- \n");
    if (marker <= 0) {
      return;
    }

    a.ext.sig = a.body.slice(marker + 1);
    a.body = a.body.slice(0, marker);
  },
} as Middleware;
