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

export default function Groups(props: GroupsProps) {
  const [counter, setCounter] = useState(0);
  const [origins] = useState(props.origins);
  const [addHost, setAddHost] = useState("");
  const [addError, setAddError] = useState("");
  const [groups] = useState(props.groups);
  const [subs] = useState(props.subs);
  const tbl = tw`w-full`;
  const thd = tw`border(dotted b-2)`;
  const btn = tw`px-2 py-1 border(gray-100 1) hover:bg-gray-200`;
  return (
    <>
      <div class={tw`container px-2`}>
        <table class={tbl} style="table-layout: fixed;">
          <thead class={thd}>
            <tr>
              <th class={tw`w-8`}>Sub</th>
              <th class={tw`w-auto`}>Group</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.name + originAlias(group.origin)}>
                <td class={tw`text-center`}>
                  <input type="checkbox" />
                </td>
                <td>
                  <a href={`/groups/${group.name}`}>{group.name}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <hr />
      <table class={tbl}>
        <thead class={thd}>
          <tr>
            <th>Server</th>
            <th>+/-</th>
          </tr>
        </thead>
        <tbody>
          {origins.map((origin, i) => (
            <tr key={originAlias(origin)}>
              <td>
                {originAlias(origin)}
              </td>
              <td>
                <button
                  class={btn}
                  onClick={(e) => {
                    setCounter(counter + 13);
                    origins.splice(i, 1);
                    document.cookie = MyCookies.origins(origins);
                  }}
                >
                  - Del
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>
              <input
                style="padding: 6px"
                placeholder="host name or IP"
                value={addHost}
                onChange={(e) => {
                  setAddHost(e.currentTarget.value.trim());
                }}
              />
              <div>{addError}</div>
            </td>
            <td>
              <button
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
                class={btn}
              >
                + Add
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}
