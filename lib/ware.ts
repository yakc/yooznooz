import {
  NewsArticleID,
  NewsBack,
  NewsGroup,
  NewsGroupArticle,
  NewsOrigin,
  NewsOverview,
  NewsRange,
} from "./model.ts";

export interface WareExt {
  ext: Record<string, unknown>;
}

export type WrappedOverview = NewsOverview & WareExt;

export type WrappedArticle = NewsGroupArticle & WareExt;

export interface Middleware {
  overview?: (overview: WrappedOverview) => void;
  article?: (article: WrappedArticle) => void;
}

const overviewWare: ((overview: WrappedOverview) => void)[] = [];
const articleWare: ((article: WrappedArticle) => void)[] = [];

export function register(ware: Middleware) {
  if (ware.overview) {
    overviewWare.push(ware.overview);
  }
  if (ware.article) {
    articleWare.push(ware.article);
  }
}

export function wrapOverview(overview: NewsOverview): WrappedOverview {
  const wrap = overview as WrappedOverview;
  wrap.ext = {};
  for (const w of overviewWare) {
    w(wrap);
  }
  return wrap;
}

export function wrapArticle(article: NewsGroupArticle): WrappedArticle {
  const wrap = article as WrappedArticle;
  wrap.ext = {};
  for (const w of articleWare) {
    w(wrap);
  }
  return wrap;
}

export class WrappedBack {
  constructor(readonly newsBack: NewsBack) {}

  // groups(origin: NewsOrigin): Promise<NewsGroupInfo[]>;

  overview(group: NewsGroup, range: NewsRange): Promise<WrappedOverview[]> {
    return this.newsBack.overview(group, range).then((o) =>
      o.map(wrapOverview)
    );
  }

  async *articles(
    origin: NewsOrigin,
    articles: Iterable<[NewsGroup, NewsArticleID]>,
  ): AsyncGenerator<WrappedArticle> {
    for await (const a of this.newsBack.articles(origin, articles)) {
      yield wrapArticle(a);
    }
  }
}
