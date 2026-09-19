/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as applicants from "../applicants.js";
import type * as audit from "../audit.js";
import type * as check from "../check.js";
import type * as enrichment from "../enrichment.js";
import type * as handoff from "../handoff.js";
import type * as http from "../http.js";
import type * as lib_checks from "../lib/checks.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_fallback from "../lib/fallback.js";
import type * as lib_questions from "../lib/questions.js";
import type * as lib_token from "../lib/token.js";
import type * as lib_verdict from "../lib/verdict.js";
import type * as recruiter from "../recruiter.js";
import type * as seed from "../seed.js";
import type * as verify from "../verify.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  applicants: typeof applicants;
  audit: typeof audit;
  check: typeof check;
  enrichment: typeof enrichment;
  handoff: typeof handoff;
  http: typeof http;
  "lib/checks": typeof lib_checks;
  "lib/constants": typeof lib_constants;
  "lib/fallback": typeof lib_fallback;
  "lib/questions": typeof lib_questions;
  "lib/token": typeof lib_token;
  "lib/verdict": typeof lib_verdict;
  recruiter: typeof recruiter;
  seed: typeof seed;
  verify: typeof verify;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
