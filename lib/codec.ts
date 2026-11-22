export interface Codec {
  name: string;
  estimateLengthDecoded: (enc: string) => number;
  decode: (enc: string) => Uint8Array<ArrayBuffer>;
}

export const base64: Codec = {
  name: "base64",
  estimateLengthDecoded: (enc: string): number => {
    return Math.ceil(enc.length * 3 / 4);
  },
  decode: (enc: string): Uint8Array<ArrayBuffer> => {
    const bin = atob(enc.replace(/\s+/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  },
};

export const eightBit: Codec = {
  name: "8bit",
  estimateLengthDecoded: (enc: string): number => {
    return enc.length;
  },
  decode: (enc: string): Uint8Array<ArrayBuffer> => {
    const bytes = new Uint8Array(enc.length);
    for (let i = 0; i < enc.length; i++) {
      bytes[i] = enc.charCodeAt(i) & 0xff;
    }
    return bytes;
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
