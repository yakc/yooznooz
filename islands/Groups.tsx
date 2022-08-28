/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { useState } from "preact/hooks";
import { tw } from "@twind";
import {
  NewsGroupInfo,
  NewsOrigin,
  NewsSubscription,
  originAlias,
} from "yooznooz/lib/model.ts";
import { MyCookies } from "../lib/cookies.ts";

export interface GroupsProps {
  origins: NewsOrigin[];
  groups: NewsGroupInfo[];
  subs: NewsSubscription[];
}

async function fetchGroups(origin: NewsOrigin) {
  await fetch("/api/servers");
}

const nf = new Intl.NumberFormat();
function formatNumber(n: number, zero?: boolean) {
  if (n || zero) {
    return nf.format(+n);
  }
  return "";
}

interface OpProps {
  op: string;
  text: string;
  onClick: h.JSX.MouseEventHandler<HTMLButtonElement>;
}

function OpButton(props: OpProps) {
  const btn = tw`px-1 py-1 border(gray-100 1) hover:bg-gray-200`;
  return (
    <button
      class={btn}
      onClick={props.onClick}
    >
      <span class={tw`inline-block w-6 text-center`}>{props.op}</span>
      <span class={tw`inline-block w-10 text-left`}>{props.text}</span>
    </button>
  );
}

export default function Groups(props: GroupsProps) {
  const [counter, setCounter] = useState(0);
  const [origins] = useState(props.origins);
  const [addHost, setAddHost] = useState("");
  const [addError, setAddError] = useState("");
  const [groups] = useState(props.groups);
  const [subs] = useState(props.subs);
  const tbl = tw`mx-2`;
  const thd = tw`border(dotted b-2)`;
  return (
    <>
      <table class={tbl}>
        <thead class={thd}>
          <tr>
            {/* <th class={tw`w-8`}>Sub</th> */}
            <th class={tw`w-auto`}>Group</th>
            <th>Articles</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.name + originAlias(group.origin)}>
              {
                /* <td class={tw`text-center`}>
                  <input type="checkbox" />
                </td> */
              }
              <td>
                <a href={`/groups/${group.name}`}>{group.name}</a>
              </td>
              <td class={tw`pl-2 text-right`}>
                {formatNumber(group.count || group.high - group.low)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr class={tw`my-2`} />
      <table class={tw`mx-2`}>
        <thead class={thd}>
          <tr>
            <th>Server</th>
            <th>+/&minus;</th>
          </tr>
        </thead>
        <tbody>
          {origins.map((origin, i) => (
            <tr key={originAlias(origin)}>
              <td>
                {originAlias(origin)}
              </td>
              <td class={tw`align-top`}>
                <OpButton
                  op="&minus;"
                  text="Del"
                  onClick={(e) => {
                    setCounter(counter + 13);
                    origins.splice(i, 1);
                    document.cookie = MyCookies.origins(origins);
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>
              <input
                class={tw`-ml-1.5`}
                style="padding: 6px"
                placeholder="host name or IP"
                value={addHost}
                onChange={(e) => {
                  setAddHost(e.currentTarget.value.trim());
                }}
              />
              <div class={tw`text-red-600`}>{addError}</div>
            </td>
            <td class={tw`align-top`}>
              <OpButton
                op="+"
                text="Add"
                onClick={() => {
                  if (addHost) {
                    if (
                      origins.find((o) =>
                        originAlias(o) === originAlias({ host: addHost })
                      )
                    ) {
                      setAddError("server is already listed");
                      return;
                    }
                    setAddError("");
                  } else {
                    setAddError("server name cannot be blank");
                    return;
                  }
                  const addOrigin = { host: addHost };
                  origins.push(addOrigin);
                  fetchGroups(addOrigin);
                  document.cookie = MyCookies.origins(origins);
                  setAddHost("");
                  // setOrigins(origins)
                  setCounter(counter + 7);
                }}
              />
            </td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}
