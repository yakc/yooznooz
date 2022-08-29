import { register, WrappedBack } from "./ware.ts";
import { default as newsBack } from "./proc_back.ts";

import { default as multipart } from "./mid/multipart.ts";
register(multipart);

import { default as signature } from "./mid/signature.ts";
register(signature);

// import { default as rfc2047 } from "./mid/rfc2047.js";
// register(rfc2047);

export default new WrappedBack(newsBack);
