import { default as NNTP, OverviewFieldIsFullDict } from "nntp";
import {
  composeArticle,
  NewsArticleID,
  NewsBack,
  NewsGroup,
  NewsGroupArticle,
  NewsGroupInfo,
  NewsOrigin,
  NewsOverview,
  NewsRange,
  originAlias,
  rangeValidate,
} from "./model.ts";
import { parseArticle, parseOverview } from "./usenet.ts";

type Resolver = (value: void | PromiseLike<void>) => void;

class Connection {
  lock?: Promise<void>;
  overviewFormat: OverviewFieldIsFullDict = {};

  constructor(readonly nntp: NNTP) {}

  async init() {
    await this.nntp.connectAndAuthenticate();
    this.overviewFormat = await this.nntp.overviewFormat();
  }

  async take(): Promise<Resolver> {
    let lock;
    while ((lock = this.lock)) {
      await lock;
    }
    let give: unknown;
    this.lock = new Promise((resolve) => give = resolve).then(() => {
      this.lock = undefined;
    });
    return give as Resolver;
  }
}

class ProcBack implements NewsBack {
  #connections: { [alias: string]: Connection } = {};

  async #conn(
    origin: NewsOrigin,
  ): Promise<[NNTP, Resolver, OverviewFieldIsFullDict]> {
    const alias = originAlias(origin);
    let conn = this.#connections[alias];
    if (conn) {
      return [conn.nntp, await conn.take(), conn.overviewFormat];
    } else {
      conn = new Connection(new NNTP(origin));
      const give = await conn.take(); // take without waiting
      this.#connections[alias] = conn; // then make it known
      await conn.init();
      return [conn.nntp, give, conn.overviewFormat];
    }
  }

  async groups(origin: NewsOrigin): Promise<NewsGroupInfo[]> {
    const [nntp, give] = await this.#conn(origin);
    try {
      return Object.entries(await nntp.listActiveGroups()).map((
        [name, { high, low, posting }],
      ) => ({
        origin,
        name,
        high,
        low,
        posting,
      }));
    } finally {
      give();
    }
  }

  async overview(group: NewsGroup, range: NewsRange): Promise<NewsOverview[]> {
    const [nntp, give, overviewFormat] = await this.#conn(group.origin);
    try {
      const active = Object.assign(await nntp.group(group.name), group);
      return (await nntp.xover(rangeValidate(range, active), overviewFormat))
        .map(parseOverview);
    } finally {
      give();
    }
  }

  async *articles(
    origin: NewsOrigin,
    articles: Iterable<[NewsGroup, NewsArticleID]>,
  ): AsyncGenerator<NewsGroupArticle> {
    const [nntp, give] = await this.#conn(origin);
    try {
      for (const [group, id] of articles) {
        yield composeArticle(parseArticle(await nntp.article(id)), group);
      }
    } finally {
      give();
    }
  }

  async stop() {
    await Promise.all(
      Object.values(this.#connections).map((conn) => conn.nntp.disconnect()),
    );
  }
}

export default new ProcBack();
