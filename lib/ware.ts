import {
  NewsArticleID,
  NewsAttachment,
  NewsBack,
  NewsGroup,
  NewsGroupArticle,
  NewsGroupInfo,
  NewsImage,
  NewsOrigin,
  NewsOverview,
  NewsRange,
} from "./model.ts";

export type NewsExt = Record<string, unknown>;

/** the known extensions for an Article */
export interface ArticleExt {
  multipart?: boolean;
  img?: NewsImage[];
  attach?: NewsAttachment[];
  sig?: string;
}

export interface WareExt<T> {
  ext: T;
}

export type ExtOverview = NewsOverview & WareExt<NewsExt>;

/** an Article with extensions */
export type ExtArticle = NewsGroupArticle & WareExt<ArticleExt & NewsExt>;

export interface Coded {
  code: string;
}

export interface Wrapped<T> {
  value: T;
  err?: Error | Coded;
}

export type WrappedGroups = Wrapped<NewsGroupInfo[]>;

export type WrappedOverview = Wrapped<ExtOverview[]>;

export type WrappedArticle = Wrapped<ExtArticle | null>;

export interface Middleware {
  overview?: (overview: ExtOverview) => void;
  article?: (article: ExtArticle) => void;
}

const overviewWare: ((overview: ExtOverview) => void)[] = [];
const articleWare: ((article: ExtArticle) => void)[] = [];

export function register(ware: Middleware) {
  if (ware.overview) {
    overviewWare.push(ware.overview);
  }
  if (ware.article) {
    articleWare.push(ware.article);
  }
}

function extOverview(overview: NewsOverview): ExtOverview {
  const wrap = overview as ExtOverview;
  wrap.ext = {};
  for (const w of overviewWare) {
    w(wrap);
  }
  return wrap;
}

function extArticle(article: NewsGroupArticle): ExtArticle {
  const wrap = article as ExtArticle;
  wrap.ext = {};
  for (const w of articleWare) {
    w(wrap);
  }
  return wrap;
}

const waitMillis = 7500;
const codedTimeout = Object.freeze({
  code: "TIMEOUT",
  waitMillis,
  toString: function () {
    return JSON.stringify(this);
  },
});

function log(...args: unknown[]) {
  console.log(new Date().toISOString(), ...args);
}

function race<T>(
  promise: Promise<T>,
  message: (result?: T) => string,
  fail: T,
): Promise<Wrapped<T>> {
  const start = Date.now();
  let timer = 0; //TODO do unfulfilled promises leak?
  return Promise.race([
    new Promise<Wrapped<T>>((resolve) =>
      timer = setTimeout(() => {
        log(`waiting too long (${waitMillis} ms) for`, message());
        resolve({ value: fail, err: codedTimeout });
      }, waitMillis)
    ),
    promise.then((t) => {
      log(`resolve (${Date.now() - start} ms)`, message(t));
      clearTimeout(timer);
      return { value: t };
    }).catch((x) => {
      log(`reject  (${Date.now() - start} ms)`, message(), String(x));
      clearTimeout(timer);
      return { value: fail, err: x };
    }),
  ]);
}

export class WrappedBack {
  constructor(readonly newsBack: NewsBack) {}

  groups(origin: NewsOrigin, control?: boolean): Promise<WrappedGroups> {
    return race(
      this.newsBack.groups(origin),
      (g) =>
        g
          ? `groups for origin ${origin.host}: ${g.length}`
          : `groups for origin ${origin.host}`,
      [],
    ).then(({ value, err }) => ({
      value: control
        ? value
        : value.filter((g) => !g.name.startsWith("control.")),
      err,
    }));
  }

  overview(group: NewsGroup, range: NewsRange): Promise<WrappedOverview> {
    return race(
      this.newsBack.overview(group, range),
      (o) =>
        o
          ? `overview for ${group.name} from origin ${group.origin.host}: ${o.length}`
          : `overview for ${group.name} from origin ${group.origin.host}`,
      [],
    ).then(({ value, err }) => ({
      value: value.map(extOverview),
      err,
    }));
  }

  article(
    origin: NewsOrigin,
    group: NewsGroup,
    id: NewsArticleID,
  ): Promise<WrappedArticle> {
    const generator = this.articles(origin, [[group, id]]);
    return race(
      generator.next().then((i) => i.value),
      (a) =>
        a
          ? `article ${id} in ${group.name} from origin ${origin.host}: ${a
            ?.body?.length}`
          : `article ${id} in ${group.name} from origin ${origin.host}`,
      null,
    ).finally(() => generator.return(undefined));
  }

  async *articles(
    origin: NewsOrigin,
    articles: Iterable<[NewsGroup, NewsArticleID]>,
  ): AsyncGenerator<ExtArticle> {
    for await (const a of this.newsBack.articles(origin, articles)) {
      yield extArticle(a);
    }
  }
}
