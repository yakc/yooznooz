import { assertEquals } from "https://deno.land/std@0.148.0/testing/asserts.ts";

type Nullable<T> = T | null;

const metaKey = "#StorJ#meta#";
const versionKey = "#StorJ#1";

class ItemMeta {
  constructor(
    readonly bin: string,
    readonly key: string,
    readonly weight: number,
    readonly date: Date,
    readonly size: number,
  ) {}

  metaKey() {
    return `${this.bin}#${this.key}`;
  }

  static comparator(a: ItemMeta, b: ItemMeta) {
    let diff = a.weight - b.weight;
    if (diff) {
      return diff;
    }
    const aTime = a.date.getTime();
    const bTime = b.date.getTime();
    diff = aTime - bTime;
    if (diff) {
      return diff;
    }
    if (Number.isNaN(aTime)) {
      if (Number.isNaN(bTime)) {
        return 0;
      }
      return -1;
    } else if (Number.isNaN(bTime)) {
      return 1;
    }
    return 0;
  }
}

class StorJ {
  #stor: Storage;
  #quota: number;
  #metaKey: string;
  #bins: { [name: string]: StorJBin } = {};
  #meta: { [key: string]: ItemMeta } = {};

  constructor(localOrSession: Storage) {
    this.#stor = localOrSession;
    this.#quota = 100;
    this.#metaKey = this.#loadMeta();
  }

  #loadMeta(): string {
    const key = this.#stor.getItem(metaKey);
    if (!key) {
      return versionKey;
    }
    const meta = this.#stor.getItem(key);
    if (!meta) {
      return key;
    }
    this.#bins["_"] = new StorJBin(this, key);
    return key;
  }

  bin(name: string): StorJBin {
    return this.#bins[name] = new StorJBin(
      this,
      `${this.#metaKey}#${name}`,
    );
  }

  put(meta: ItemMeta, value: string) {
    const metaKey = meta.metaKey();

    this.#stor.setItem(metaKey, value);
  }

  get(bin: string, key: string) {
    return this.#stor.getItem(`${bin}#${key}`);
  }
}

class StorJBin {
  #parent: StorJ;
  #key: string;
  #dateFields = ["date", "dob"];
  // deno-lint-ignore no-explicit-any
  #reviver?: (key: string, value: any) => any;

  constructor(parent: StorJ, key: string) {
    this.#parent = parent;
    this.#key = key;
    this.#loadMeta();
  }

  #loadMeta() {
    // deno-lint-ignore no-explicit-any
    this.#reviver = (key: string, value: any) => {
      if (this.#dateFields.indexOf(key) >= 0) {
        return new Date(value);
      }
      return value;
    };
  }

  // deno-lint-ignore no-explicit-any
  put(key: string, value: any) {
    const str = JSON.stringify(value);
    const meta = new ItemMeta(
      this.#key,
      key,
      0,
      value.date || new Date(),
      str.length,
    );
    this.#parent.put(meta, str);
  }

  get<T>(key: string, thaw?: (x: Record<string, unknown>) => T): Nullable<T> {
    const x = this.#parent.get(this.#key, key);
    if (x === null) {
      return null;
    }
    if (thaw) {
      return thaw(JSON.parse(x, this.#reviver));
    }
    return JSON.parse(x, this.#reviver);
  }
}

interface Person {
  familyName: string;
  givenName: string;
  dob: Date;
}

Deno.test("basic io", () => {
  const s = new StorJ(sessionStorage).bin("one");
  const key = String(Date.now());
  const want: Person = {
    familyName: "Lee",
    givenName: "Loo",
    dob: new Date("1999-07-15"),
  };
  s.put(key, want);
  const got = s.get<Person>(key);
  assertEquals(got, want);
});
