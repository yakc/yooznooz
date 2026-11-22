import { FreshContext } from "$fresh/server.ts";
import { STATUS_CODE } from "@std/http/status";
import { Attachment, buildMimeMessage } from "nntp";
import { default as wrappedBack } from "yooznooz/lib/proc_wrap.ts";
import { Composed, Draft } from "yooznooz/lib/usenet.ts";
import { default as version } from "yooznooz/lib/version.ts";

export interface PostResponse {
  ok: boolean;
  message?: string;
  missing?: string[];
  empty?: string[];
  invalid?: string[];
}

export function buildPostMessage(composed: Composed) {
  const headers = [
    // First header line displayed in activity log
    `Subject: ${composed.headers.subject}`,
    `From: ${composed.headers.from.name} <${composed.headers.from.email}>`,
    `Newsgroups: ${composed.headers.newsgroup}`,
    `User-Agent: YoozNooz/${version}`,
  ];
  if (composed.headers.inReplyTo) {
    headers.push(`In-Reply-To: ${composed.headers.inReplyTo}`);
    if (!composed.headers.references.includes(composed.headers.inReplyTo)) {
      composed.headers.references.push(composed.headers.inReplyTo);
    }
  }
  if (composed.headers.references.length) {
    headers.push(`References: ${composed.headers.references.join(" ")}`);
  }
  //TODO fold header lines exceeding 998 octets as per RFC 5536 2.2
  return composed.attachments?.length
    ? buildMimeMessage({
      headers,
      text: composed.body,
      attachments: composed.attachments,
    })
    : {
      headers,
      body: composed.body.split(/\r?\n/),
    };
}

export const handler = async (
  req: Request,
  ctx: FreshContext,
): Promise<Response> => {
  const host = ctx.params.host;
  const [ reqStatus, composed, postResp ] = await parseRequest(req);
  let status = reqStatus;
  if (composed) {
    if (!composed.body && !composed.attachments?.length) {
      postResp.message = "body is empty";
    } else if (postResp.ok) {
      const msg = buildPostMessage(composed);
      // console.log("posting", msg);
      // const success = { value: true, err: undefined };
      const success = await wrappedBack.post({ host }, msg);
      if (!success.value) {
        status = STATUS_CODE.InternalServerError;
        postResp.ok = false;
        if (success.err) {
          postResp.message = (success.err as Error).message;
        }
      }
    }
  }
  if (postResp.ok && Math.trunc(status / 100) == 3) {
    const location = `/groups/${composed?.headers.newsgroup}@${host}`;
    return new Response(null, {
      status,
      headers: { location },
    });
  }
  return new Response(JSON.stringify(postResp) + "\n", {
    status,
    headers: { "content-type": "application/json" },
  });
};

export async function parseRequest(req: Request): Promise<[number, Composed | undefined, PostResponse]> {
  let status: number = STATUS_CODE.BadRequest;
  let composed: Composed | undefined;
  const postResp: PostResponse = { ok: false };
  if (req.method === "POST") {
    const contentType = (req.headers.get("content-type") || "").split(";").map(t => t.trim())[0];
    switch (contentType) {
      case "text/plain":
        composed = await plainText(req, postResp);
        if (postResp.ok) {
          status = STATUS_CODE.Accepted;
        }
        break;
      case "application/x-www-form-urlencoded":
      case "multipart/form-data":
        composed = await formEncoded(req, postResp);
        if (postResp.ok) {
          status = STATUS_CODE.SeeOther;
        }
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

function extractHeaders(postResp: PostResponse, p: (k: string) => string | null): [boolean, Draft] {
  function x(h: string, optional?: boolean) {
    const v = p(h);
    if (v?.length) {
      return v;
    }
    if (optional) {
      return "";
    }
    if (v !== null) {
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
  const newsgroup = x("group");
  const name = x("name");
  const email = x("email");
  const subject = x("subject");
  const headers: Draft = {
    newsgroup,
    from: {
      name,
      email,
    },
    date: new Date(),
    subject,
    references: [],
    inReplyTo: x("reply", true) || undefined,
  };
  const ok = !!(newsgroup && name && email && subject);
  return [ok, headers];
}

function headRefsBody(
  postResp: PostResponse,
  p: (k: string) => string | null,
  refs: string[],
  body: string,
  attachments?: Attachment[],
): Composed {
  const [ok, headers] = extractHeaders(postResp, p);
  headers.references = refs;
  postResp.ok = ok && (!!body || !!attachments?.length);
  return {
    headers,
    body,
    ...(attachments?.length ? { attachments } : {}),
  };
}

async function plainText(req: Request, postResp: PostResponse): Promise<Composed> {
  const params = new URL(req.url).searchParams;
  function p(k: string) {
    return params.get(k);
  }
  return headRefsBody(postResp, p, params.getAll("ref").map(v => v.trim()), (await req.text()).trimEnd());
}

async function formEncoded(req: Request, postResp: PostResponse): Promise<Composed> {
  const form = await req.formData();
  // console.log(form);
  function p(k: string) {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  }
  const attachments: Attachment[] = [];
  for (const entry of form.getAll("attachments")) {
    if (entry instanceof File && (entry.size > 0 || entry.name)) {
      attachments.push({
        filename: entry.name || "attachment",
        contentType: entry.type || undefined,
        data: new Uint8Array(await entry.arrayBuffer()),
      });
    }
  }
  const refs = p("references");
  return headRefsBody(postResp, p, refs ? refs.split(" ") : [], p("body"), attachments);
}
