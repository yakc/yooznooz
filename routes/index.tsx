/** @jsx h */
import { h } from "preact";
import { tw } from "@twind";
import { HandlerContext } from "$fresh/server.ts";

export function handler(
  req: Request,
  _ctx: HandlerContext,
): Response {
  // Temporary hard redirect to configure servers and groups
  const url = new URL("/servers", req.url);
  return Response.redirect(url, 307);
}

export default function Home() {
  return (
    <div class={tw`p-4 mx-auto max-w-screen-md`}>
      <img
        src="/logo.svg"
        height="100px"
        alt="the YoozNooz logo: a simplified newspaper front page"
      />
      <p class={tw`mt-6`}>
        YoozNooz: a host-it-yourself Usenet newsreader; someday
        <ul class={tw`ml-6 list-disc`}>
          <li>offline</li>
          <li>PWA</li>
          <li>with replies</li>
        </ul>
      </p>
    </div>
  );
}
