import { Buffer } from "$std/node/buffer.ts";

export interface Codec {
  name: string;
  estimateLengthDecoded: (enc: string) => number;
  decode: (enc: string) => Buffer;
}

export const base64: Codec = {
  name: "base64",
  estimateLengthDecoded: (enc: string): number => {
    return Math.ceil(enc.length * 3 / 4);
  },
  decode: (enc: string): Buffer => {
    return Buffer.from(enc, "base64");
  },
};

export const eightBit: Codec = {
  name: "8bit",
  estimateLengthDecoded: (enc: string): number => {
    return enc.length;
  },
  decode: (enc: string): Buffer => {
    return Buffer.from(enc, "latin1");
  },
};

const map: Record<string, Codec> = {
  base64,
  "8bit": eightBit,
};

/** Codec or reason-string */
export default function (name: string): Codec | string {
  const c = map[name];
  return c || `unsupported Content-Encoding: ${name}`;
}
