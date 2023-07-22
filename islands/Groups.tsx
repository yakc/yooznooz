import { Head, IS_BROWSER } from "$fresh/runtime.ts";
import { useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import { nbsp } from "yooznooz/lib/format.ts";
import {
  groupAtOrigin,
  groupComparator,
  NewsGroupInfo,
  NewsOrigin,
  NewsSubscription,
  originAlias,
} from "yooznooz/lib/model.ts";

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
  const styles = ["pl-2", "text-right"];
  if (IS_BROWSER) {
    const last = localStorage.getItem(`last:${groupAtOrigin(props.group)}`) ||
      localStorage.getItem(`last:${props.group.name}`);
    if (last && props.group.high) {
      const split = last.split(";");
      const high = parseInt(split[0]);
      const diff = props.group.high - high;
      if (diff > 0) {
        value = `${MyCookies.formatter(props.my.lang).num(diff)}\u00a0new`;
        styles.push("italic");
      } else {
        value = MyCookies.formatter(props.my.lang).ago(
          new Date(split[1]),
          props.renderTime,
        );
      }
    }
  }
  return <td class={styles.join(" ")}>{value}</td>;
}

const loadingGroups = new Set<string>();

// mostly from https://codepen.io/mandelid/pen/kNBYLJ
const loadingCss = `
.loading {
  display: inline-block;
  margin-left: 6px;
  margin-bottom: -2px;
  width: 15px;
  height: 15px;
  border: 3px solid rgba(155,55,255,.6);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
  -webkit-animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { -webkit-transform: rotate(360deg); }
}
@-webkit-keyframes spin {
  to { -webkit-transform: rotate(360deg); }
}
`;

interface Annotation<T> {
  note: T;
}

type Annotated<T, V> = T & Annotation<V>;

type AnnotatedOrigin = Annotated<NewsOrigin, number>;
type AnnotatedGroup = Annotated<NewsGroupInfo, number> & {
  origin: AnnotatedOrigin;
};

function annotate(
  groups: NewsGroupInfo[],
  origins: NewsOrigin[],
): [AnnotatedGroup[], AnnotatedOrigin[]] {
  const ao = origins.map((o, i) => Object.assign(o, { note: i + 1 }));
  const ag = groups.map((g, i) => {
    const alias = originAlias(g.origin);
    let o = ao.find((o) => alias === originAlias(o));
    if (!o) {
      o = Object.assign(g.origin, { note: ao.length + 1 });
      ao.push(o);
    }
    return Object.assign(g, { note: 0, origin: o });
  });
  ag.sort((a, b) => {
    const d = groupComparator(a, b);
    if (d) {
      return d;
    }
    return a.note - b.note;
  });
  for (let i = 1; i < ag.length; ++i) {
    if (ag[i - 1].name === ag[i].name) {
      ag[i - 1].note = ag[i - 1].origin.note;
      ag[i].note = ag[i].origin.note;
    }
  }
  return [ag, ao];
}

export interface GroupsProps {
  my: MyCookies;
  origins: NewsOrigin[];
  groups: NewsGroupInfo[];
  subs: NewsSubscription[];
}

export default function Groups(props: GroupsProps) {
  const { my } = props;
  const [ag, ao] = annotate(props.groups, props.origins);
  const [origins, setOrigins] = useState(ao);
  const [addHost, setAddHost] = useState("");
  const [addError, setAddError] = useState("");
  const [groups, setGroups] = useState(ag);
  const [subs] = useState(props.subs);
  const tbl = `mx-2`;
  const thd = `border(dotted b-2)`;
  const renderTime = new Date();
  return (
    <>
      <Head>
        <style>{loadingCss}</style>
      </Head>
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
            <tr key={group.name + group.note + originAlias(group.origin)}>
              {
                /* <td class="text-center">
                  <input type="checkbox" />
                </td> */
              }
              <td>
                <a href={`/groups/${groupAtOrigin(group)}`}>
                  {group.note > 0 && <sup>{group.note}</sup>}
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
            <tr key={origin.note + originAlias(origin)}>
              <td>
                {origins.length - loadingGroups.size > 0 &&
                  !loadingGroups.has(originAlias(origin)) && (
                  <sup>{origin.note}</sup>
                )}
                {originAlias(origin)}
                {loadingGroups.has(originAlias(origin)) && (
                  <div class="loading"></div>
                )}
              </td>
              <td class="align-top">
                <OpButton
                  op="&minus;"
                  text="Del"
                  onClick={(e) => {
                    const deleted = origins.splice(i, 1)[0];
                    document.cookie = MyCookies.origins(origins);
                    const [ag, ao] = annotate(
                      groups.filter((g) =>
                        originAlias(g.origin) !== originAlias(deleted)
                      ),
                      origins,
                    );
                    setGroups(ag);
                    setOrigins(ao);
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
              <div class="text-red-600">{addError || nbsp}</div>
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
                  const addOrigin = { host: addHost, note: origins.length + 1 };
                  const index = origins.push(addOrigin) - 1;
                  setAddHost("");
                  loadingGroups.add(addOrigin.host);
                  fetchGroups(addOrigin).then((g) =>
                    groups.concat(
                      annotate(g, origins)[0],
                    ).sort(groupComparator)
                  ).then(setGroups).then(() => {
                    document.cookie = MyCookies.origins(origins);
                    setOrigins(origins);
                  }).catch((x) => {
                    origins.splice(index, 1);
                    setAddHost(addOrigin.host);
                    setAddError(String(x));
                  }).finally(() => loadingGroups.delete(addOrigin.host));
                }}
              />
            </td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}
