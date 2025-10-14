import { FreshContext } from "$fresh/server.ts";
import { STATUS_CODE } from "@std/http/status";
import { default as wrappedBack } from "yooznooz/lib/proc_wrap.ts";
import { Composed, Draft } from "yooznooz/lib/usenet.ts";

export interface PostResponse {
  ok: boolean;
  message?: string;
  missing?: string[];
  empty?: string[];
  invalid?: string[];
}

export const handler = async (
  req: Request,
  ctx: FreshContext,
): Promise<Response> => {
  const [ reqStatus, composed, postResp ] = await parseRequest(req);
  let status = reqStatus;
  if (composed) {
    if (!composed.body) {
      postResp.message = "body is empty";
    } else if (postResp.ok) {
      const host = ctx.params.host;
      const msg = {
        //TODO fold header lines exceeding 998 octets as per RFC 5536 2.2
        headers: [
          // First header line displayed in activity log
          `Subject: ${composed.headers.subject}`,
          `From: ${composed.headers.from.name} <${composed.headers.from.email}>`,
          `Newsgroups: ${composed.headers.newsgroup}`,
          `User-Agent: MyNNTPAgent/0.10.1`,
        ],
        body: composed.body.split(/\r?\n/),
      }
      console.log("posting", msg);
      const success = await wrappedBack.post({host}, msg);
      if (success.value) {
        status = STATUS_CODE.Created;
      } else if (success.err) {
        postResp.ok = false;
        postResp.message = (success.err as Error).message;
      }
    }
  }
  return new Response(JSON.stringify(postResp) + "\n", {
    status,
    headers: { "content-type": "application/json" },
  });
};

async function parseRequest(req: Request): Promise<[number, Composed | undefined, PostResponse]> {
  let status: number = STATUS_CODE.BadRequest;
  let composed: Composed | undefined;
  const postResp: PostResponse = { ok: false };
  if (req.method === "POST") {
    const contentType = (req.headers.get("content-type") || "").split(";").map(t => t.trim())[0];
    switch (contentType) {
      case "text/plain":
        composed = await plainText(req, postResp);
        break;
      case "":
        status = STATUS_CODE.UnsupportedMediaType;
        postResp.message = "missing Content-Type";
        break;
      default:
        status = STATUS_CODE.UnsupportedMediaType;
        postResp.message = `unsupported Content-Type: ${contentType}`;
        break;
    }
  } else {
    status = STATUS_CODE.MethodNotAllowed;
    postResp.message = `POST only, not: ${req.method}`;
  }
  return [ status, composed, postResp ];
}

async function plainText(req: Request, postResp: PostResponse): Promise<Composed> {
  const params = new URL(req.url).searchParams;
  function p(h: string) {
    const v = params.get(h);
    if (v !== null) {
      if (v.length) {
        return v;
      }
      if (!postResp.empty) {
        postResp.empty = [];
      }
      postResp.empty.push(h);
    } else {
      if (!postResp.missing) {
        postResp.missing = [];
      }
      postResp.missing.push(h);
    }
    return "";
  }
  const newsgroup = p("group");
  const name = p("name");
  const email = p("email");
  const subject = p("subject");
  const headers: Draft = {
    newsgroup,
    from: {
      name,
      email,
    },
    date: new Date(),
    subject,
    references: params.getAll("ref").map(v => v.trim()),
  };
  const body = (await req.text()).trimEnd();
  postResp.ok = !!(newsgroup && name && email && subject && body);
  return {
    headers,
    body,
  };
}
