/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { HandlerContext, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { default as Groups, GroupsProps } from "yooznooz/islands/Groups.tsx";
import { default as newsBack } from "yooznooz/lib/proc_wrap.ts";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import { NewsGroupInfo, NewsOrigin } from "yooznooz/lib/model.ts";

const noOrigin: NewsOrigin = { host: "fake.example.com" };
const noGroups: NewsGroupInfo[] = [
  { origin: noOrigin, name: "one", high: 100, low: 1 },
  { origin: noOrigin, name: "two", high: 20, low: 1 },
];

export async function handler(
  req: Request,
  ctx: HandlerContext,
): Promise<Response> {
  const my = new MyCookies(req);
  const groups = (await Promise.all(
    my.origins.map((origin) => newsBack.groups(origin)),
  )).flatMap((w) => w.value);
  const data: GroupsProps = {
    my,
    origins: my.origins,
    groups,
    subs: [],
  };
  const response = await ctx.render(data);
  // responseCookies(response, {})
  return response;
}

export default function Servers(props: PageProps<GroupsProps>) {
  return (
    <>
      <Head>
        <title>YoozNooz Groups &amp; Servers</title>
      </Head>
      <p>Subscribed Groups and Servers {props.params.name}</p>
      <Groups
        my={props.data.my}
        origins={props.data.origins}
        groups={props.data.groups}
        subs={props.data.subs}
      />
    </>
  );
}
