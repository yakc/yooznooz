import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import { name2Group } from "yooznooz/routes/groups/[name].tsx";
import { default as Compose, ComposeProps } from "yooznooz/islands/Compose.tsx";


export const handler: Handlers = {
  async GET(req: Request, ctx: FreshContext) {
    const my = new MyCookies(req);
    if (!my.origins.length) {
      const url = new URL("/servers", req.url);
      return Response.redirect(url);
    }
    const [origin, group] = name2Group(my, ctx);
    const compose: ComposeProps = {
      host: origin.host!,
      group: group.name,
      references: [],
    };
    const response = await ctx.render({ my, compose });
    return response;
  },
};

export interface NewProps {
  my: MyCookies;
  compose: ComposeProps;
}

export default function New(props: PageProps<NewProps>) {
  const { compose } = props.data;
  return (
    <>
      <Head>
        <title>
          New in {compose.group}@{compose.host} | YoozNooz
        </title>
      </Head>
      <Compose
        host={compose.host}
        group={compose.group}
        subject=""
        references={[]}
      />
    </>
  );
}
