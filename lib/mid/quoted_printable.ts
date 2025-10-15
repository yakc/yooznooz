import { ExtArticle, Middleware } from "../ware.ts";

const decoder = new TextDecoder(); // defaults to "utf-8"

export default {
  article(a: ExtArticle) {
    if (
      a.contentType?.transferEncoding === "quoted-printable" &&
      a.contentType?.charset === "UTF-8"
    ) {
      a.body = a.body.replaceAll(/(?:=[0123456789ABCDEF]{2})+/g, (sub) => {
        const bytes = sub.split("=").filter((v) => v).map((v) =>
          parseInt(v, 16)
        );
        return decoder.decode(new Uint8Array(bytes));
      });
    }
  },
} as Middleware;
