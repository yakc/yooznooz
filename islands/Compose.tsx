export interface ComposeProps {
  host: string;
  group: string;
  subject?: string;
  body?: string;
  inReplyTo?: string;
  references: string[];
}

export default function Compose(props: ComposeProps) {
  const ruler = `font-mono col-span-6 text-gray-500 text-opacity-25`;
  const btn = `px-1 py-1 border(gray-100 1) hover:bg-gray-200 max-w-sm`;
  const lbl = `col-span-1 text-right`;
  const val = `col-start-2 col-span-2`;
  return (
    <form class="container grid gap-4 px-2 mt-1 pt-2" method="POST" action={"/api/post/" + props.host} >
      <label class={lbl}>Subject</label>
      <input class={val} name="subject" type="text" value={props.subject}/>
      <span class="col-span-3"></span>
      {props.inReplyTo && <>
        <label class={lbl + " text-xs"}>In-Reply-To</label>
        <span class={val + " font-mono text-xs"}>{props.inReplyTo}</span>
        <span class="col-span-3"></span>
      </>}
      <p class={ruler}>123456789 123456789 123456789 123456789 123456789 123456789 123456789 12</p>
      <textarea name="body" class="font-mono col-span-4 max-w-4xl h-64">{props.body}</textarea>
      <p class={ruler}>123456789 123456789 123456789 123456789 123456789 123456789 123456789 12</p>
      <button type="submit" class={btn}>Post</button>
      <input name="name" type="text" placeholder="name" class="colspan-2"/>
      <input name="email" type="email" placeholder="email" class="colspan-2"/>
      <input name="references" type="hidden" value={props.references.join(" ")}/>
      <input name="reply" type="hidden" value={props.inReplyTo}/>
      <input name="group" type="hidden" value={props.group}/>
    </form>
  );
}
