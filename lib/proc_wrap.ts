import { register, WrappedBack } from "./ware.ts";
import { default as newsBack } from "./proc_back.ts";

import { default as multipart } from "./mid/multipart.ts";
register(multipart);

import { default as windows1252 } from "./mid/windows1252.ts";
register(windows1252);

import { default as rfc2047 } from "./mid/rfc2047.ts";
register(rfc2047);  // MIME encoding

import { default as quoted_printable } from "./mid/quoted_printable.ts";
register(quoted_printable);  // after MIME encoding, which also uses =HEX

import { default as signature } from "./mid/signature.ts";
register(signature);

export default new WrappedBack(newsBack);
