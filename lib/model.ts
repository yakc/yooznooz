import { NNTPOptions } from "nntp";
import { Article, From } from "./usenet.ts";

/** Stateless async back-end API; e.g. REST or in-process */
export interface NewsBack {
  groups(origin: NewsOrigin): Promise<NewsGroupInfo[]>;
  overview(group: NewsGroup, range: NewsRange): Promise<NewsOverview[]>;
  articles(
    origin: NewsOrigin,
    articles: Iterable<[NewsGroup, NewsArticleID]>,
  ): AsyncGenerator<NewsGroupArticle>;
}

export interface NewsOrigin extends NNTPOptions {
  alias?: string;
}

export function originAlias(origin: NewsOrigin) {
  const alias = origin.alias || origin.host || "localHost";
  if (origin.username) {
    // TODO don't mixup connections with same username but different password
    return `${origin.username}@${alias}`;
  }
  return alias;
}

export interface NewsGroup {
  readonly origin: NewsOrigin;
  readonly name: string;
}

export interface NewsGroupInfo extends NewsGroup {
  high: number;
  low: number;
  count?: number;
  posting?: boolean;
}

export interface NewsRange {
  low?: number;
  high?: number;
  slice?: number;
}

export function rangeValidate(range: NewsRange, active: NewsGroupInfo): string {
  let { low, high, slice } = range;
  if (low) {
    low = Math.max(low, active.low);
  } else {
    low = active.low;
  }
  if (high) {
    if (high < low) {
      high = low;
    } else {
      high = Math.min(high, active.high);
    }
  } else {
    high = active.high;
  }
  if (slice && high - low + 1 > Math.abs(slice)) {
    if (slice < 0) {
      low = high + slice + 1;
    } else {
      high = low + slice - 1;
    }
  }
  return `${low}-${high}`;
}

export type NewsArticleID = string;

export function unquoteName(from: From) {
  return (/^"?(.*?)"?$/.exec(from.name) as string[])[1];
}

export interface NewsOverview {
  readonly id: NewsArticleID;
  from: From;
  date: Date;
  subject: string;
  references: NewsArticleID[];
}

export interface NewsArticle extends NewsOverview {
  body: string;
}

export interface NewsGroupArticle extends NewsArticle {
  group: NewsGroup;
}

export function composeArticle(
  article: Article,
  group: NewsGroup,
): NewsGroupArticle {
  const { id, from, date, subject, references } = article.headers;
  return {
    group,
    id,
    from,
    date,
    subject,
    references,
    body: article.body,
  };
}

export interface NewsSubscription {
  alias: string;
  group: string;
  lastNumber?: number;
  lastID?: NewsArticleID;
}

export default class NewsModel {
  #servers: { [alias: string]: NewsOrigin } = {};
  #groups: { [alias: string]: Promise<NewsGroupInfo[]> } = {};
  #subs: NewsSubscription[] = [];

  constructor(readonly back: NewsBack) {}

  /** Adds or updates a news server; keyed on alias */
  registerServer(server: NewsOrigin) {
    const alias = originAlias(server);
    this.#servers[alias] = server;
    this.#groups[alias] = this.back.groups(server);
    return alias;
  }

  #server(alias: string): NewsOrigin {
    const server = this.#servers[alias];
    if (!server) {
      throw new Error(`unknown server alias: ${alias}`);
    }
    return server;
  }

  /** Active groups at the named server */
  groups(alias: string): Promise<NewsGroupInfo[]> {
    return this.#groups[alias];
  }

  async subscribe(alias: string, group: string): Promise<boolean> {
    if (this.#subs.find((sub) => sub.alias === alias && sub.group === group)) {
      return false;
    }
    const info = (await this.#groups[alias]).find((g) => g.name === group);
    if (info) {
      this.#subs.push({ alias, group });
      return true;
    }
    throw new Error(`no (active) group named ${group} at alias ${alias}`);
  }

  async *pull(slice?: number): AsyncGenerator<NewsGroupArticle> {
    for (const sub of this.#subs) {
      const origin = this.#server(sub.alias);
      const group = { origin, name: sub.group };
      const over = await this.back.overview(group, {
        low: sub.lastNumber && sub.lastNumber + 1,
        slice,
      });
      const articles: [NewsGroup, NewsArticleID][] = over.map(
        (o) => [group, o.id],
      );
      yield* this.back.articles(origin, articles);
    }
  }
}
