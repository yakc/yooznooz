/** @jsx h */
import { h } from "preact";
import { tw } from "@twind";
import { HandlerContext } from "$fresh/server.ts";
import Counter from "../islands/Counter.tsx";

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
        alt="the fresh logo: a sliced lemon dripping with juice"
      />
      <p class={tw`my-6`}>
        Welcome to `fresh`. Try update this message in the ./routes/index.tsx
        file, and refresh.
      </p>
      <Counter start={3} />
    </div>
  );
}
