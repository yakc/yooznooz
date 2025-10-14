import { default as NNTP, MessageLines, OverviewFieldIsFullDict } from "nntp";
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
  #connected = false;
  #recycleTimer = 0;
  lock?: Promise<void>;
  overviewFormat: OverviewFieldIsFullDict = {};

  constructor(readonly nntp: NNTP) {}

  async #init() {
    await this.nntp.connectAndAuthenticate();
    this.#connected = true;
    this.overviewFormat = await this.nntp.overviewFormat();
    this.#recycleTimer = setTimeout(async () => {
      const give = await this.take();
      try {
        this.#recycleTimer = 0;
        await this.nntp.disconnect();
        this.#connected = false;
      } finally {
        give();
      }
    }, 55 * 1000);
  }

  async take(): Promise<Resolver> {
    let lock;
    while ((lock = this.lock)) {
      await lock;
    }
    if (!this.#connected) {
      await this.#init();
    }
    let give: unknown;
    this.lock = new Promise((resolve) => give = resolve).then(() => {
      this.lock = undefined;
    });
    return give as Resolver;
  }

  disconnect(): Promise<void> {
    if (this.#recycleTimer) {
      clearTimeout(this.#recycleTimer);
    }
    return this.nntp.disconnect();
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
      range = rangeValidate(range, active);
      // actually want to allow desired to be undefined for further
      // comparisons with over.length, which will be false in both
      // directions. But TypeScript doesn't allow that, so assert
      // non-null to simplify code that follows (it's a lie either way)
      const desired = range.slice! && range.high! - range.low! + 1;
      // desired is smaller than slice only if initial range hit active boundary
      let over =
        (await nntp.xover(`${range.low}-${range.high}`, overviewFormat))
          .map(parseOverview);
      while (over.length < desired) {
        range.low! += range.slice!;
        range.high! += range.slice!;
        if (range.high! < active.low || range.low! > active.high) {
          break;
        }
        range = rangeValidate(range, active);
        const more =
          (await nntp.xover(`${range.low}-${range.high}`, overviewFormat))
            .map(parseOverview);
        if (range.slice! < 0) {
          over = more.concat(over);
        } else {
          over = over.concat(more);
        }
      }
      if (over.length > desired) {
        if (range.slice! < 0) {
          over = over.slice(-desired);
        } else {
          over = over.slice(0, desired);
        }
      }
      return over;
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

  async raw(origin: NewsOrigin, id: NewsArticleID): Promise<MessageLines> {
    const [nntp, give] = await this.#conn(origin);
    try {
      return await nntp.article(id);
    } finally {
      give();
    }
  }

  async post(origin: NewsOrigin, msg: MessageLines): Promise<boolean> {
    const [nntp, give] = await this.#conn(origin);
    try {
      return await nntp.post(msg);
    } finally {
      give();
    }
  }

  async stop() {
    await Promise.all(
      Object.values(this.#connections).map((conn) => conn.disconnect()),
    );
  }
}

export default new ProcBack();
