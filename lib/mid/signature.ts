import { ExtArticle, Middleware } from "../ware.ts";

const ware: Middleware = {
  article(a: ExtArticle) {
    const marker = a.body.indexOf("\n-- \n");
    if (marker <= 0) {
      return;
    }

    a.ext.sig = a.body.slice(marker + 1);
    a.body = a.body.slice(0, marker);
  },
};

export default ware;
