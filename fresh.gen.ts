// DO NOT EDIT. This file is generated by fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import config from "./deno.json" assert { type: "json" };
import * as $0 from "./routes/api/servers/[host].ts";
import * as $1 from "./routes/groups/[name].tsx";
import * as $2 from "./routes/groups/[name]/articles/[id].tsx";
import * as $3 from "./routes/groups/[name]/articles/[id]/attachments/[file].tsx";
import * as $4 from "./routes/groups/[name]/raw/[id].tsx";
import * as $5 from "./routes/index.tsx";
import * as $6 from "./routes/servers.tsx";
import * as $$0 from "./islands/Groups.tsx";

const manifest = {
  routes: {
    "./routes/api/servers/[host].ts": $0,
    "./routes/groups/[name].tsx": $1,
    "./routes/groups/[name]/articles/[id].tsx": $2,
    "./routes/groups/[name]/articles/[id]/attachments/[file].tsx": $3,
    "./routes/groups/[name]/raw/[id].tsx": $4,
    "./routes/index.tsx": $5,
    "./routes/servers.tsx": $6,
  },
  islands: {
    "./islands/Groups.tsx": $$0,
  },
  baseUrl: import.meta.url,
  config,
};

export default manifest;
