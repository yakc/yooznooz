import { useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import {
  groupComparator,
  NewsGroupInfo,
  NewsOrigin,
  NewsSubscription,
  originAlias,
} from "yooznooz/lib/model.ts";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import { IS_BROWSER } from "$fresh/runtime.ts";

function fetchGroups(origin: NewsOrigin): Promise<NewsGroupInfo[]> {
  return fetch(`/api/servers/${origin.host}`)
    .then((res) => Promise.all([res.status, res.json()]))
    .then(([status, json]) => {
      if (status !== 200) {
        throw json.error?.code || "bad host name";
      }
      return json;
    }).then((json) =>
      (json.items as NewsGroupInfo[])
        .map<NewsGroupInfo>(({ name, high, low, count }) => ({
          origin,
          name,
          high,
          low,
          count,
        }))
    );
}

interface OpProps {
  op: string;
  text: string;
  onClick: JSX.MouseEventHandler<HTMLButtonElement>;
}

function OpButton(props: OpProps) {
  const btn = `px-1 py-1 border(gray-100 1) hover:bg-gray-200`;
  return (
    <button
      class={btn}
      data-op={props.op}
      onClick={props.onClick}
    >
      <span class="inline-block w-6 text-center">{props.op}</span>
      <span class="inline-block w-10 text-left">{props.text}</span>
    </button>
  );
}

interface NewLastProps {
  my: MyCookies;
  renderTime: Date;
  group: NewsGroupInfo;
}

function NewLast(props: NewLastProps) {
  let value = "";
  if (IS_BROWSER) {
    const last = localStorage.getItem(`last:${props.group.name}`);
    if (last && props.group.high) {
      const split = last.split(";");
      const high = parseInt(split[0]);
      const diff = props.group.high - high;
      if (diff > 0) {
        value = `${MyCookies.formatter(props.my.lang).num(diff)}\u00a0new`;
      } else {
        value = MyCookies.formatter(props.my.lang).ago(
          new Date(split[1]),
          props.renderTime,
        );
      }
    }
  }
  return <td class="pl-2 text-right">{value}</td>;
}

export interface GroupsProps {
  my: MyCookies;
  origins: NewsOrigin[];
  groups: NewsGroupInfo[];
  subs: NewsSubscription[];
}

export default function Groups(props: GroupsProps) {
  const { my } = props;
  const [origins, setOrigins] = useState(props.origins);
  const [addHost, setAddHost] = useState("");
  const [addError, setAddError] = useState("");
  const [groups, setGroups] = useState(props.groups);
  const [subs] = useState(props.subs);
  const tbl = `mx-2`;
  const thd = `border(dotted b-2)`;
  const renderTime = new Date();
  return (
    <>
      <table class={tbl}>
        <thead class={thd}>
          <tr>
            {/* <th class="w-8">Sub</th> */}
            <th class="w-auto">Group</th>
            <th>Articles</th>
            <th class="pl-2">New/Last</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.name + originAlias(group.origin)}>
              {
                /* <td class="text-center">
                  <input type="checkbox" />
                </td> */
              }
              <td>
                <a href={`/groups/${group.name}`}>
                  {group.name}
                </a>
              </td>
              <td class="pl-2 text-right">
                {MyCookies.formatter(my.lang).num(
                  group.count || group.high - group.low + 1,
                )}
              </td>
              <NewLast my={my} renderTime={renderTime} group={group} />
            </tr>
          ))}
        </tbody>
      </table>
      <hr class="my-2" />
      <table class="mx-2">
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
              <td class="align-top">
                <OpButton
                  op="&minus;"
                  text="Del"
                  onClick={(e) => {
                    const deleted = origins.splice(i, 1)[0];
                    document.cookie = MyCookies.origins(origins);
                    setGroups(
                      groups.filter((g) =>
                        originAlias(g.origin) !== originAlias(deleted)
                      ),
                    );
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
                class="-ml-1.5"
                style="padding: 6px"
                placeholder="host name or IP"
                type="url"
                value={addHost}
                onChange={(e) => {
                  setAddHost(e.currentTarget.value.trim());
                }}
                onKeyPress={(e) => {
                  if (e.key == "Enter") {
                    const self = e.currentTarget;
                    const row = self.closest("tr");
                    const b = row!.querySelector(
                      `button[data-op="+"]`,
                    ) as HTMLButtonElement;
                    self.blur();
                    setTimeout(() => {
                      b.click();
                      setTimeout(() => self.focus());
                    });
                  }
                }}
              />
              <div class="text-red-600">{addError}</div>
            </td>
            <td class="align-top">
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
                  const index = origins.push(addOrigin) - 1;
                  setAddHost("");
                  fetchGroups(addOrigin).then((g) =>
                    groups.concat(g).sort(groupComparator)
                  ).then(setGroups).then(() => {
                    document.cookie = MyCookies.origins(origins);
                    setOrigins(origins);
                  }).catch((x) => {
                    origins.splice(index, 1);
                    setAddHost(addHost);
                    setAddError(String(x));
                  });
                }}
              />
            </td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}
