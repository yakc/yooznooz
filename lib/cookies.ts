import { getCookies } from "$std/http/cookie.ts";
import { NewsOrigin } from "./model.ts";

type Names = "ORIGINS";

export class MyCookies {
  /** NewsOrigin encoded as protocol-less URL */
  origins: NewsOrigin[];
  lang: string[];

  constructor(req: Request) {
    const cookies = getCookies(req.headers);
    const urls = (cookies.ORIGINS || "").split(",").filter((x) => x).map((u) =>
      new URL(`http://${u}`)
    );
    this.origins = urls.map(MyCookies.url2Origin);
    this.lang = (req.headers.get("accept-language") || "").split(",").map(
      // e.g. Accept-Language: en-US,en;q=0.9
      (al) => al.split(";")[0],
    );
  }

  private static url2Origin(url: URL): NewsOrigin {
    return {
      host: url.hostname,
      port: parseInt(url.port) || 119,
      username: url.username,
      // password: url.password,
      alias: url.searchParams.get("alias") || undefined,
    };
  }

  private static origin2Url(origin: NewsOrigin): URL {
    const user = origin.username ? `${origin.username}@` : "";
    const port = origin.port ? `:${origin.port}` : "";
    const alias = origin.alias ? `?alias=${origin.alias}` : "";
    // URL hostname doesn't work without http-ish protocol
    return new URL(`http://${user}${origin.host}${port}${alias}`);
  }

  static origins(origins: NewsOrigin[]): string {
    const values = origins.map(MyCookies.origin2Url).map((url) =>
      encodeURI(url.toString()).slice(7)
    );
    return `ORIGINS=${values.join(",")}`;
  }
}
