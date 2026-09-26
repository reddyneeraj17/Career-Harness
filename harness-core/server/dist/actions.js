// @bun
// ../node_modules/zod/v4/core/core.js
var _a;
function $constructor(name, initializer, params) {
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _,
          traits: new Set
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer(inst, def);
    const proto = _.prototype;
    const keys = Object.keys(proto);
    for (let i = 0;i < keys.length; i++) {
      const k = keys[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;

  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a;
    const inst = params?.Parent ? new Definition : this;
    init(inst, def);
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
var $brand = Symbol("zod_brand");

class $ZodAsyncError extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
}

class $ZodEncodeError extends Error {
  constructor(name) {
    super(`Encountered unidirectional transform during encode: ${name}`);
    this.name = "ZodEncodeError";
  }
}
(_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
var globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}
// ../node_modules/zod/v4/core/util.js
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  const set = false;
  return {
    get value() {
      if (!set) {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function nullish(input) {
  return input === null || input === undefined;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const ratio = val / step;
  const roundedRatio = Math.round(ratio);
  const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
  if (Math.abs(ratio - roundedRatio) < tolerance)
    return 0;
  return ratio - roundedRatio;
}
var EVALUATING = /* @__PURE__ */ Symbol("evaluating");
function defineLazy(object, key, getter) {
  let value = undefined;
  Object.defineProperty(object, key, {
    get() {
      if (value === EVALUATING) {
        return;
      }
      if (value === undefined) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object, key, {
        value: v
      });
    },
    configurable: true
  });
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
var allowsEval = /* @__PURE__ */ cached(() => {
  if (globalConfig.jitless) {
    return false;
  }
  if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
    return false;
  }
  try {
    const F = Function;
    new F("");
    return true;
  } catch (_) {
    return false;
  }
});
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === undefined)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  if (o instanceof Map)
    return new Map(o);
  if (o instanceof Set)
    return new Set(o);
  return o;
}
var propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== undefined) {
    if (params?.error !== undefined)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
var NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-340282346638528860000000000000000000000, 340282346638528860000000000000000000000],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = {};
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        newShape[key] = currDef.shape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = { ...schema._zod.def.shape };
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        delete newShape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    const existingShape = schema._zod.def.shape;
    for (const key in shape) {
      if (Object.getOwnPropertyDescriptor(existingShape, key) !== undefined) {
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
      }
    }
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function merge(a, b) {
  if (a._zod.def.checks?.length) {
    throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
  }
  const def = mergeDefs(a._zod.def, {
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: b._zod.def.checks ?? []
  });
  return clone(a, def);
}
function partial(Class, schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".partial() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in oldShape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      } else {
        for (const key in oldShape) {
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function required(Class, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      } else {
        for (const key in oldShape) {
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    }
  });
  return clone(schema, def);
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex;i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex;i < x.issues.length; i++) {
    if (x.issues[i]?.continue === false) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a;
    (_a = iss).path ?? (_a.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config) {
  const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
  const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
  rest.path ?? (rest.path = []);
  rest.message = message;
  if (ctx?.reportInput) {
    rest.input = _input;
  }
  return rest;
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}

// ../node_modules/zod/v4/core/errors.js
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
var $ZodError = $constructor("$ZodError", initializer);
var $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
function flattenError(error, mapper = (issue) => issue.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error, mapper = (issue) => issue.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error, path = []) => {
    for (const issue of error.issues) {
      if (issue.code === "invalid_union" && issue.errors.length) {
        issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
      } else if (issue.code === "invalid_key") {
        processError({ issues: issue.issues }, [...path, ...issue.path]);
      } else if (issue.code === "invalid_element") {
        processError({ issues: issue.issues }, [...path, ...issue.path]);
      } else {
        const fullpath = [...path, ...issue.path];
        if (fullpath.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < fullpath.length) {
            const el = fullpath[i];
            const terminal = i === fullpath.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    }
  };
  processError(error);
  return fieldErrors;
}

// ../node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
};
var _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
};
var _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);
var _encode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _parse(_Err)(schema, value, ctx);
};
var _decode = (_Err) => (schema, value, _ctx) => {
  return _parse(_Err)(schema, value, _ctx);
};
var _encodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _parseAsync(_Err)(schema, value, ctx);
};
var _decodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _parseAsync(_Err)(schema, value, _ctx);
};
var _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
};
var _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
};
var _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
};
var _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
};
// ../node_modules/zod/v4/core/regexes.js
var cuid = /^[cC][0-9a-z]{6,}$/;
var cuid2 = /^[0-9a-z]+$/;
var ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
var xid = /^[0-9a-vA-V]{20}$/;
var ksuid = /^[A-Za-z0-9]{27}$/;
var nanoid = /^[a-zA-Z0-9_-]{21}$/;
var duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
var guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
var uuid = (version) => {
  if (!version)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
var email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
var _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
  return new RegExp(_emoji, "u");
}
var ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
var cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
var cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
var base64url = /^[A-Za-z0-9_-]*$/;
var httpProtocol = /^https?$/;
var e164 = /^\+[1-9]\d{6,14}$/;
var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
var date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime(args) {
  const time = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const timeRegex = `${time}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
var string = (params) => {
  const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
};
var integer = /^-?\d+$/;
var number = /^-?\d+(?:\.\d+)?$/;
var boolean = /^(?:true|false)$/i;
var _null = /^null$/i;
var lowercase = /^[^A-Z]*$/;
var uppercase = /^[^a-z]*$/;

// ../node_modules/zod/v4/core/checks.js
var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a = inst._zod).onattach ?? (_a.onattach = []);
});
var numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
var $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst) => {
    const bag = inst._zod.bag;
    const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (def.value < curr) {
      if (def.inclusive)
        bag.maximum = def.value;
      else
        bag.exclusiveMaximum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst) => {
    const bag = inst._zod.bag;
    const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (def.value > curr) {
      if (def.inclusive)
        bag.minimum = def.value;
      else
        bag.exclusiveMinimum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst) => {
    var _a;
    (_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
  });
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
    if (isMultiple)
      return;
    payload.issues.push({
      origin: typeof payload.value,
      code: "not_multiple_of",
      divisor: def.value,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = def.format?.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst) => {
    const bag = inst._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
    if (isInt)
      bag.pattern = integer;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== undefined;
  });
  inst._zod.onattach.push((inst) => {
    const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length <= def.maximum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== undefined;
  });
  inst._zod.onattach.push((inst) => {
    const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length >= def.minimum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== undefined;
  });
  inst._zod.onattach.push((inst) => {
    const bag = inst._zod.bag;
    bag.minimum = def.length;
    bag.maximum = def.length;
    bag.length = def.length;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length === def.length)
      return;
    const origin = getLengthableOrigin(input);
    const tooBig = length > def.length;
    payload.issues.push({
      origin,
      ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
  var _a, _b;
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst) => {
    const bag = inst._zod.bag;
    bag.format = def.format;
    if (def.pattern) {
      bag.patterns ?? (bag.patterns = new Set);
      bag.patterns.add(def.pattern);
    }
  });
  if (def.pattern)
    (_a = inst._zod).check ?? (_a.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        ...def.pattern ? { pattern: def.pattern.toString() } : {},
        inst,
        continue: !def.abort
      });
    });
  else
    (_b = inst._zod).check ?? (_b.check = () => {});
});
var $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    def.pattern.lastIndex = 0;
    if (def.pattern.test(payload.value))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: payload.value,
      pattern: def.pattern.toString(),
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
  def.pattern ?? (def.pattern = lowercase);
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
  def.pattern ?? (def.pattern = uppercase);
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
  $ZodCheck.init(inst, def);
  const escapedRegex = escapeRegex(def.includes);
  const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
  def.pattern = pattern;
  inst._zod.onattach.push((inst) => {
    const bag = inst._zod.bag;
    bag.patterns ?? (bag.patterns = new Set);
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.includes(def.includes, def.position))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: def.includes,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst) => {
    const bag = inst._zod.bag;
    bag.patterns ?? (bag.patterns = new Set);
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.startsWith(def.prefix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: def.prefix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst) => {
    const bag = inst._zod.bag;
    bag.patterns ?? (bag.patterns = new Set);
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.endsWith(def.suffix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: def.suffix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});

// ../node_modules/zod/v4/core/doc.js
class Doc {
  constructor(args = []) {
    this.content = [];
    this.indent = 0;
    if (this)
      this.args = args;
  }
  indented(fn) {
    this.indent += 1;
    fn(this);
    this.indent -= 1;
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split(`
`).filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const args = this?.args;
    const content = this?.content ?? [``];
    const lines = [...content.map((x) => `  ${x}`)];
    return new F(...args, lines.join(`
`));
  }
}

// ../node_modules/zod/v4/core/versions.js
var version = {
  major: 4,
  minor: 4,
  patch: 3
};

// ../node_modules/zod/v4/core/schemas.js
var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...inst._zod.def.checks ?? []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks) {
        if (ch._zod.def.when) {
          if (explicitlyAborted(payload))
            continue;
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError;
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError;
        return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary) => {
            return handleCanaryResult(canary, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError;
        return result.then((result) => runChecks(result, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  defineLazy(inst, "~standard", () => ({
    validate: (value) => {
      try {
        const r = safeParse(inst, value);
        return r.success ? { value: r.data } : { issues: r.error?.issues };
      } catch (_) {
        return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  }));
});
var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string(inst._zod.bag);
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_) {}
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  $ZodString.init(inst, def);
});
var $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
  def.pattern ?? (def.pattern = guid);
  $ZodStringFormat.init(inst, def);
});
var $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
  if (def.version) {
    const versionMap = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    };
    const v = versionMap[def.version];
    if (v === undefined)
      throw new Error(`Invalid UUID version: "${def.version}"`);
    def.pattern ?? (def.pattern = uuid(v));
  } else
    def.pattern ?? (def.pattern = uuid());
  $ZodStringFormat.init(inst, def);
});
var $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
  def.pattern ?? (def.pattern = email);
  $ZodStringFormat.init(inst, def);
});
var $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    try {
      const trimmed = payload.value.trim();
      if (!def.normalize && def.protocol?.source === httpProtocol.source) {
        if (!/^https?:\/\//i.test(trimmed)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid URL format",
            input: payload.value,
            inst,
            continue: !def.abort
          });
          return;
        }
      }
      const url = new URL(trimmed);
      if (def.hostname) {
        def.hostname.lastIndex = 0;
        if (!def.hostname.test(url.hostname)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid hostname",
            pattern: def.hostname.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.protocol) {
        def.protocol.lastIndex = 0;
        if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid protocol",
            pattern: def.protocol.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.normalize) {
        payload.value = url.href;
      } else {
        payload.value = trimmed;
      }
      return;
    } catch (_) {
      payload.issues.push({
        code: "invalid_format",
        format: "url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
  def.pattern ?? (def.pattern = emoji());
  $ZodStringFormat.init(inst, def);
});
var $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
  def.pattern ?? (def.pattern = nanoid);
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
  def.pattern ?? (def.pattern = cuid);
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
  def.pattern ?? (def.pattern = cuid2);
  $ZodStringFormat.init(inst, def);
});
var $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
  def.pattern ?? (def.pattern = ulid);
  $ZodStringFormat.init(inst, def);
});
var $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
  def.pattern ?? (def.pattern = xid);
  $ZodStringFormat.init(inst, def);
});
var $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
  def.pattern ?? (def.pattern = ksuid);
  $ZodStringFormat.init(inst, def);
});
var $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
  def.pattern ?? (def.pattern = datetime(def));
  $ZodStringFormat.init(inst, def);
});
var $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
  def.pattern ?? (def.pattern = date);
  $ZodStringFormat.init(inst, def);
});
var $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
  def.pattern ?? (def.pattern = time(def));
  $ZodStringFormat.init(inst, def);
});
var $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
  def.pattern ?? (def.pattern = duration);
  $ZodStringFormat.init(inst, def);
});
var $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
  def.pattern ?? (def.pattern = ipv4);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv4`;
});
var $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
  def.pattern ?? (def.pattern = ipv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv6`;
  inst._zod.check = (payload) => {
    try {
      new URL(`http://[${payload.value}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv4);
  $ZodStringFormat.init(inst, def);
});
var $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    const parts = payload.value.split("/");
    try {
      if (parts.length !== 2)
        throw new Error;
      const [address, prefix] = parts;
      if (!prefix)
        throw new Error;
      const prefixNum = Number(prefix);
      if (`${prefixNum}` !== prefix)
        throw new Error;
      if (prefixNum < 0 || prefixNum > 128)
        throw new Error;
      new URL(`http://[${address}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
function isValidBase64(data) {
  if (data === "")
    return true;
  if (/\s/.test(data))
    return false;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
var $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
  def.pattern ?? (def.pattern = base64);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64";
  inst._zod.check = (payload) => {
    if (isValidBase64(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function isValidBase64URL(data) {
  if (!base64url.test(data))
    return false;
  const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return isValidBase64(padded);
}
var $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
  def.pattern ?? (def.pattern = base64url);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64url";
  inst._zod.check = (payload) => {
    if (isValidBase64URL(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
  def.pattern ?? (def.pattern = e164);
  $ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
var $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (isValidJWT(payload.value, def.alg))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {}
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : undefined : undefined;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
var $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
var $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Boolean(payload.value);
      } catch (_) {}
    const input = payload.value;
    if (typeof input === "boolean")
      return payload;
    payload.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = _null;
  inst._zod.values = new Set([null]);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (input === null)
      return payload;
    payload.issues.push({
      expected: "null",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = Array(input.length);
    const proms = [];
    for (let i = 0;i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result) => handleArrayResult(result, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
  const isPresent = key in input;
  if (result.issues.length) {
    if (isOptionalIn && isOptionalOut && !isPresent) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (!isPresent && !isOptionalIn) {
    if (!result.issues.length) {
      final.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: undefined,
        path: [key]
      });
    }
    return;
  }
  if (result.value === undefined) {
    if (isPresent) {
      final.value[key] = undefined;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const isOptionalIn = _catchall.optin === "optional";
  const isOptionalOut = _catchall.optout === "optional";
  for (const key in input) {
    if (key === "__proto__")
      continue;
    if (keySet.has(key))
      continue;
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
    } else {
      handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  if (!desc?.get) {
    const sh = def.shape;
    Object.defineProperty(def, "shape", {
      get: () => {
        const newSh = { ...sh };
        Object.defineProperty(def, "shape", {
          value: newSh
        });
        return newSh;
      }
    });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazy(inst._zod, "propValues", () => {
    const shape = def.shape;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        propValues[key] ?? (propValues[key] = new Set);
        for (const v of field.values)
          propValues[key].add(v);
      }
    }
    return propValues;
  });
  const isObject2 = isObject;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = {};
    const proms = [];
    const shape = value.shape;
    for (const key of value.keys) {
      const el = shape[key];
      const isOptionalIn = el._zod.optin === "optional";
      const isOptionalOut = el._zod.optout === "optional";
      const r = el._zod.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
      } else {
        handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
  };
});
var $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
  $ZodObject.init(inst, def);
  const superParse = inst._zod.parse;
  const _normalized = cached(() => normalizeDef(def));
  const generateFastpass = (shape) => {
    const doc = new Doc(["shape", "payload", "ctx"]);
    const normalized = _normalized.value;
    const parseStr = (key) => {
      const k = esc(key);
      return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
    };
    doc.write(`const input = payload.value;`);
    const ids = Object.create(null);
    let counter = 0;
    for (const key of normalized.keys) {
      ids[key] = `key_${counter++}`;
    }
    doc.write(`const newResult = {};`);
    for (const key of normalized.keys) {
      const id = ids[key];
      const k = esc(key);
      const schema = shape[key];
      const isOptionalIn = schema?._zod?.optin === "optional";
      const isOptionalOut = schema?._zod?.optout === "optional";
      doc.write(`const ${id} = ${parseStr(key)};`);
      if (isOptionalIn && isOptionalOut) {
        doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      } else if (!isOptionalIn) {
        doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
      } else {
        doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      }
    }
    doc.write(`payload.value = newResult;`);
    doc.write(`return payload;`);
    const fn = doc.compile();
    return (payload, ctx) => fn(shape, payload, ctx);
  };
  let fastpass;
  const isObject2 = isObject;
  const jit = !globalConfig.jitless;
  const allowsEval2 = allowsEval;
  const fastEnabled = jit && allowsEval2.value;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
      if (!fastpass)
        fastpass = generateFastpass(def.shape);
      payload = fastpass(payload, ctx);
      if (!catchall)
        return payload;
      return handleCatchall([], input, payload, ctx, value, inst);
    }
    return superParse(payload, ctx);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : undefined);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return;
  });
  defineLazy(inst._zod, "pattern", () => {
    if (def.options.every((o) => o._zod.pattern)) {
      const patterns = def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return;
  });
  const first = def.options.length === 1 ? def.options[0]._zod.run : null;
  inst._zod.parse = (payload, ctx) => {
    if (first) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results) => {
      return handleUnionResults(results, payload, inst, ctx);
    });
  };
});
var $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    const left = def.left._zod.run({ value: input, issues: [] }, ctx);
    const right = def.right._zod.run({ value: input, issues: [] }, ctx);
    const async = left instanceof Promise || right instanceof Promise;
    if (async) {
      return Promise.all([left, right]).then(([left, right]) => {
        return handleIntersectionResults(payload, left, right);
      });
    }
    return handleIntersectionResults(payload, left, right);
  };
});
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  const unrecKeys = new Map;
  let unrecIssue;
  for (const iss of left.issues) {
    if (iss.code === "unrecognized_keys") {
      unrecIssue ?? (unrecIssue = iss);
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).l = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  for (const iss of right.issues) {
    if (iss.code === "unrecognized_keys") {
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).r = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
  if (bothKeys.length && unrecIssue) {
    result.issues.push({ ...unrecIssue, keys: bothKeys });
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ` + `${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
var $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isPlainObject(input)) {
      payload.issues.push({
        expected: "record",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    const values = def.keyType._zod.values;
    if (values) {
      payload.value = {};
      const recordKeys = new Set;
      for (const key of values) {
        if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
          recordKeys.add(typeof key === "number" ? key.toString() : key);
          const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
          if (keyResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (keyResult.issues.length) {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key,
              path: [key],
              inst
            });
            continue;
          }
          const outKey = keyResult.value;
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result) => {
              if (result.issues.length) {
                payload.issues.push(...prefixIssues(key, result.issues));
              }
              payload.value[outKey] = result.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[outKey] = result.value;
          }
        }
      }
      let unrecognized;
      for (const key in input) {
        if (!recordKeys.has(key)) {
          unrecognized = unrecognized ?? [];
          unrecognized.push(key);
        }
      }
      if (unrecognized && unrecognized.length > 0) {
        payload.issues.push({
          code: "unrecognized_keys",
          input,
          inst,
          keys: unrecognized
        });
      }
    } else {
      payload.value = {};
      for (const key of Reflect.ownKeys(input)) {
        if (key === "__proto__")
          continue;
        if (!Object.prototype.propertyIsEnumerable.call(input, key))
          continue;
        let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
        if (keyResult instanceof Promise) {
          throw new Error("Async schemas not supported in object keys currently");
        }
        const checkNumericKey = typeof key === "string" && number.test(key) && keyResult.issues.length;
        if (checkNumericKey) {
          const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
          if (retryResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (retryResult.issues.length === 0) {
            keyResult = retryResult;
          }
        }
        if (keyResult.issues.length) {
          if (def.mode === "loose") {
            payload.value[key] = input[key];
          } else {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key,
              path: [key],
              inst
            });
          }
          continue;
        }
        const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result) => {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[keyResult.value] = result.value;
          }));
        } else {
          if (result.issues.length) {
            payload.issues.push(...prefixIssues(key, result.issues));
          }
          payload.value[keyResult.value] = result.value;
        }
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
var $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values = getEnumValues(def.entries);
  const valuesSet = new Set(values);
  inst._zod.values = valuesSet;
  inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (valuesSet.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  if (def.values.length === 0) {
    throw new Error("Cannot create literal schema with no valid values");
  }
  const values = new Set(def.values);
  inst._zod.values = values;
  inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (values.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: def.values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    const _out = def.transform(payload.value, payload);
    if (ctx.async) {
      const output = _out instanceof Promise ? _out : Promise.resolve(_out);
      return output.then((output) => {
        payload.value = output;
        payload.fallback = true;
        return payload;
      });
    }
    if (_out instanceof Promise) {
      throw new $ZodAsyncError;
    }
    payload.value = _out;
    payload.fallback = true;
    return payload;
  };
});
function handleOptionalResult(result, input) {
  if (input === undefined && (result.issues.length || result.fallback)) {
    return { issues: [], value: undefined };
  }
  return result;
}
var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? new Set([...def.innerType._zod.values, undefined]) : undefined;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : undefined;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      const input = payload.value;
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((r) => handleOptionalResult(r, input));
      return handleOptionalResult(result, input);
    }
    if (payload.value === undefined) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
  inst._zod.parse = (payload, ctx) => {
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : undefined;
  });
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : undefined;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null)
      return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === undefined) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result) => handleDefaultResult(result, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === undefined) {
    payload.value = def.defaultValue;
  }
  return payload;
}
var $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === undefined) {
      payload.value = def.defaultValue;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => {
    const v = def.innerType._zod.values;
    return v ? new Set([...v].filter((x) => x !== undefined)) : undefined;
  });
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result) => handleNonOptionalResult(result, inst));
    }
    return handleNonOptionalResult(result, inst);
  };
});
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === undefined) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
var $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result) => {
        payload.value = result.value;
        if (result.issues.length) {
          payload.value = def.catchValue({
            ...payload,
            error: {
              issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
            },
            input: payload.value
          });
          payload.issues = [];
          payload.fallback = true;
        }
        return payload;
      });
    }
    payload.value = result.value;
    if (result.issues.length) {
      payload.value = def.catchValue({
        ...payload,
        error: {
          issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        },
        input: payload.value
      });
      payload.issues = [];
      payload.fallback = true;
    }
    return payload;
  };
});
var $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right) => handlePipeResult(right, def.in, ctx));
      }
      return handlePipeResult(right, def.in, ctx);
    }
    const left = def.in._zod.run(payload, ctx);
    if (left instanceof Promise) {
      return left.then((left) => handlePipeResult(left, def.out, ctx));
    }
    return handlePipeResult(left, def.out, ctx);
  };
});
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues, fallback: left.fallback }, ctx);
}
var $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
  defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
var $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => {
    return payload;
  };
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r) => handleRefineResult(r, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      path: [...inst._zod.def.path ?? []],
      continue: !inst._zod.def.abort
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
// ../node_modules/zod/v4/core/registries.js
var _a2;
var $output = Symbol("ZodOutput");
var $input = Symbol("ZodInput");

class $ZodRegistry {
  constructor() {
    this._map = new WeakMap;
    this._idmap = new Map;
  }
  add(schema, ..._meta) {
    const meta = _meta[0];
    this._map.set(schema, meta);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.set(meta.id, schema);
    }
    return this;
  }
  clear() {
    this._map = new WeakMap;
    this._idmap = new Map;
    return this;
  }
  remove(schema) {
    const meta = this._map.get(schema);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.delete(meta.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : undefined;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
}
function registry() {
  return new $ZodRegistry;
}
(_a2 = globalThis).__zod_globalRegistry ?? (_a2.__zod_globalRegistry = registry());
var globalRegistry = globalThis.__zod_globalRegistry;
// ../node_modules/zod/v4/core/api.js
function _string(Class, params) {
  return new Class({
    type: "string",
    ...normalizeParams(params)
  });
}
function _email(Class, params) {
  return new Class({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _guid(Class, params) {
  return new Class({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuid(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuidv4(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
function _uuidv6(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
function _uuidv7(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
function _url(Class, params) {
  return new Class({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _emoji2(Class, params) {
  return new Class({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _nanoid(Class, params) {
  return new Class({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid(Class, params) {
  return new Class({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid2(Class, params) {
  return new Class({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ulid(Class, params) {
  return new Class({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _xid(Class, params) {
  return new Class({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ksuid(Class, params) {
  return new Class({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv4(Class, params) {
  return new Class({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv6(Class, params) {
  return new Class({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv4(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv6(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64(Class, params) {
  return new Class({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64url(Class, params) {
  return new Class({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _e164(Class, params) {
  return new Class({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _jwt(Class, params) {
  return new Class({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _isoDateTime(Class, params) {
  return new Class({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDate(Class, params) {
  return new Class({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _isoTime(Class, params) {
  return new Class({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDuration(Class, params) {
  return new Class({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _number(Class, params) {
  return new Class({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
function _int(Class, params) {
  return new Class({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
function _boolean(Class, params) {
  return new Class({
    type: "boolean",
    ...normalizeParams(params)
  });
}
function _null2(Class, params) {
  return new Class({
    type: "null",
    ...normalizeParams(params)
  });
}
function _unknown(Class) {
  return new Class({
    type: "unknown"
  });
}
function _never(Class, params) {
  return new Class({
    type: "never",
    ...normalizeParams(params)
  });
}
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
function _normalize(form) {
  return _overwrite((input) => input.normalize(form));
}
function _trim() {
  return _overwrite((input) => input.trim());
}
function _toLowerCase() {
  return _overwrite((input) => input.toLowerCase());
}
function _toUpperCase() {
  return _overwrite((input) => input.toUpperCase());
}
function _slugify() {
  return _overwrite((input) => slugify(input));
}
function _array(Class, element, params) {
  return new Class({
    type: "array",
    element,
    ...normalizeParams(params)
  });
}
function _refine(Class, fn, _params) {
  const schema = new Class({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
function _superRefine(fn, params) {
  const ch = _check((payload) => {
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(issue(issue2, payload.value, ch._zod.def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  }, params);
  return ch;
}
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
// ../node_modules/zod/v4/core/to-json-schema.js
function initializeContext(params) {
  let target = params?.target ?? "draft-2020-12";
  if (target === "draft-4")
    target = "draft-04";
  if (target === "draft-7")
    target = "draft-07";
  return {
    processors: params.processors ?? {},
    metadataRegistry: params?.metadata ?? globalRegistry,
    target,
    unrepresentable: params?.unrepresentable ?? "throw",
    override: params?.override ?? (() => {}),
    io: params?.io ?? "output",
    counter: 0,
    seen: new Map,
    cycles: params?.cycles ?? "ref",
    reused: params?.reused ?? "inline",
    external: params?.external ?? undefined
  };
}
function process(schema, ctx, _params = { path: [], schemaPath: [] }) {
  var _a;
  const def = schema._zod.def;
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count++;
    const isCycle = _params.schemaPath.includes(schema);
    if (isCycle) {
      seen.cycle = _params.path;
    }
    return seen.schema;
  }
  const result = { schema: {}, count: 1, cycle: undefined, path: _params.path };
  ctx.seen.set(schema, result);
  const overrideSchema = schema._zod.toJSONSchema?.();
  if (overrideSchema) {
    result.schema = overrideSchema;
  } else {
    const params = {
      ..._params,
      schemaPath: [..._params.schemaPath, schema],
      path: _params.path
    };
    if (schema._zod.processJSONSchema) {
      schema._zod.processJSONSchema(ctx, result.schema, params);
    } else {
      const _json = result.schema;
      const processor = ctx.processors[def.type];
      if (!processor) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      }
      processor(schema, ctx, _json, params);
    }
    const parent = schema._zod.parent;
    if (parent) {
      if (!result.ref)
        result.ref = parent;
      process(parent, ctx, params);
      ctx.seen.get(parent).isParent = true;
    }
  }
  const meta = ctx.metadataRegistry.get(schema);
  if (meta)
    Object.assign(result.schema, meta);
  if (ctx.io === "input" && isTransforming(schema)) {
    delete result.schema.examples;
    delete result.schema.default;
  }
  if (ctx.io === "input" && "_prefault" in result.schema)
    (_a = result.schema).default ?? (_a.default = result.schema._prefault);
  delete result.schema._prefault;
  const _result = ctx.seen.get(schema);
  return _result.schema;
}
function extractDefs(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const idToSchema = new Map;
  for (const entry of ctx.seen.entries()) {
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      const existing = idToSchema.get(id);
      if (existing && existing !== entry[0]) {
        throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      }
      idToSchema.set(id, entry[0]);
    }
  }
  const makeURI = (entry) => {
    const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
    if (ctx.external) {
      const externalId = ctx.external.registry.get(entry[0])?.id;
      const uriGenerator = ctx.external.uri ?? ((id) => id);
      if (externalId) {
        return { ref: uriGenerator(externalId) };
      }
      const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
    }
    if (entry[1] === root) {
      return { ref: "#" };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
    return { defId, ref: defUriPrefix + defId };
  };
  const extractToDef = (entry) => {
    if (entry[1].schema.$ref) {
      return;
    }
    const seen = entry[1];
    const { ref, defId } = makeURI(entry);
    seen.def = { ...seen.schema };
    if (defId)
      seen.defId = defId;
    const schema = seen.schema;
    for (const key in schema) {
      delete schema[key];
    }
    schema.$ref = ref;
  };
  if (ctx.cycles === "throw") {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.cycle) {
        throw new Error("Cycle detected: " + `#/${seen.cycle?.join("/")}/<root>` + '\n\nSet the `cycles` parameter to `"ref"` to resolve cyclical schemas with defs.');
      }
    }
  }
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (schema === entry[0]) {
      extractToDef(entry);
      continue;
    }
    if (ctx.external) {
      const ext = ctx.external.registry.get(entry[0])?.id;
      if (schema !== entry[0] && ext) {
        extractToDef(entry);
        continue;
      }
    }
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      extractToDef(entry);
      continue;
    }
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }
    if (seen.count > 1) {
      if (ctx.reused === "ref") {
        extractToDef(entry);
        continue;
      }
    }
  }
}
function finalize(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const flattenRef = (zodSchema) => {
    const seen = ctx.seen.get(zodSchema);
    if (seen.ref === null)
      return;
    const schema = seen.def ?? seen.schema;
    const _cached = { ...schema };
    const ref = seen.ref;
    seen.ref = null;
    if (ref) {
      flattenRef(ref);
      const refSeen = ctx.seen.get(ref);
      const refSchema = refSeen.schema;
      if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
        schema.allOf = schema.allOf ?? [];
        schema.allOf.push(refSchema);
      } else {
        Object.assign(schema, refSchema);
      }
      Object.assign(schema, _cached);
      const isParentRef = zodSchema._zod.parent === ref;
      if (isParentRef) {
        for (const key in schema) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (!(key in _cached)) {
            delete schema[key];
          }
        }
      }
      if (refSchema.$ref && refSeen.def) {
        for (const key in schema) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) {
            delete schema[key];
          }
        }
      }
    }
    const parent = zodSchema._zod.parent;
    if (parent && parent !== ref) {
      flattenRef(parent);
      const parentSeen = ctx.seen.get(parent);
      if (parentSeen?.schema.$ref) {
        schema.$ref = parentSeen.schema.$ref;
        if (parentSeen.def) {
          for (const key in schema) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) {
              delete schema[key];
            }
          }
        }
      }
    }
    ctx.override({
      zodSchema,
      jsonSchema: schema,
      path: seen.path ?? []
    });
  };
  for (const entry of [...ctx.seen.entries()].reverse()) {
    flattenRef(entry[0]);
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else if (ctx.target === "openapi-3.0") {}
  if (ctx.external?.uri) {
    const id = ctx.external.registry.get(schema)?.id;
    if (!id)
      throw new Error("Schema is missing an `id` property");
    result.$id = ctx.external.uri(id);
  }
  Object.assign(result, root.def ?? root.schema);
  const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
  if (rootMetaId !== undefined && result.id === rootMetaId)
    delete result.id;
  const defs = ctx.external?.defs ?? {};
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (seen.def && seen.defId) {
      if (seen.def.id === seen.defId)
        delete seen.def.id;
      defs[seen.defId] = seen.def;
    }
  }
  if (ctx.external) {} else {
    if (Object.keys(defs).length > 0) {
      if (ctx.target === "draft-2020-12") {
        result.$defs = defs;
      } else {
        result.definitions = defs;
      }
    }
  }
  try {
    const finalized = JSON.parse(JSON.stringify(result));
    Object.defineProperty(finalized, "~standard", {
      value: {
        ...schema["~standard"],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
          output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return finalized;
  } catch (_err) {
    throw new Error("Error converting schema to JSON.");
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: new Set };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    if (_schema._zod.traits.has("$ZodCodec"))
      return true;
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key in def.shape) {
      if (isTransforming(def.shape[key], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
var createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
  const ctx = initializeContext({ ...params, processors });
  process(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
var createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
  const { libraryOptions, target } = params ?? {};
  const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
  process(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
// ../node_modules/zod/v4/core/json-schema-processors.js
var formatMap = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: ""
};
var stringProcessor = (schema, ctx, _json, _params) => {
  const json = _json;
  json.type = "string";
  const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
  if (typeof minimum === "number")
    json.minLength = minimum;
  if (typeof maximum === "number")
    json.maxLength = maximum;
  if (format) {
    json.format = formatMap[format] ?? format;
    if (json.format === "")
      delete json.format;
    if (format === "time") {
      delete json.format;
    }
  }
  if (contentEncoding)
    json.contentEncoding = contentEncoding;
  if (patterns && patterns.size > 0) {
    const regexes = [...patterns];
    if (regexes.length === 1)
      json.pattern = regexes[0].source;
    else if (regexes.length > 1) {
      json.allOf = [
        ...regexes.map((regex) => ({
          ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
          pattern: regex.source
        }))
      ];
    }
  }
};
var numberProcessor = (schema, ctx, _json, _params) => {
  const json = _json;
  const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
  if (typeof format === "string" && format.includes("int"))
    json.type = "integer";
  else
    json.type = "number";
  const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
  const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
  const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
  if (exMin) {
    if (legacy) {
      json.minimum = exclusiveMinimum;
      json.exclusiveMinimum = true;
    } else {
      json.exclusiveMinimum = exclusiveMinimum;
    }
  } else if (typeof minimum === "number") {
    json.minimum = minimum;
  }
  if (exMax) {
    if (legacy) {
      json.maximum = exclusiveMaximum;
      json.exclusiveMaximum = true;
    } else {
      json.exclusiveMaximum = exclusiveMaximum;
    }
  } else if (typeof maximum === "number") {
    json.maximum = maximum;
  }
  if (typeof multipleOf === "number")
    json.multipleOf = multipleOf;
};
var booleanProcessor = (_schema, _ctx, json, _params) => {
  json.type = "boolean";
};
var nullProcessor = (_schema, ctx, json, _params) => {
  if (ctx.target === "openapi-3.0") {
    json.type = "string";
    json.nullable = true;
    json.enum = [null];
  } else {
    json.type = "null";
  }
};
var neverProcessor = (_schema, _ctx, json, _params) => {
  json.not = {};
};
var unknownProcessor = (_schema, _ctx, _json, _params) => {};
var enumProcessor = (schema, _ctx, json, _params) => {
  const def = schema._zod.def;
  const values = getEnumValues(def.entries);
  if (values.every((v) => typeof v === "number"))
    json.type = "number";
  if (values.every((v) => typeof v === "string"))
    json.type = "string";
  json.enum = values;
};
var literalProcessor = (schema, ctx, json, _params) => {
  const def = schema._zod.def;
  const vals = [];
  for (const val of def.values) {
    if (val === undefined) {
      if (ctx.unrepresentable === "throw") {
        throw new Error("Literal `undefined` cannot be represented in JSON Schema");
      }
    } else if (typeof val === "bigint") {
      if (ctx.unrepresentable === "throw") {
        throw new Error("BigInt literals cannot be represented in JSON Schema");
      } else {
        vals.push(Number(val));
      }
    } else {
      vals.push(val);
    }
  }
  if (vals.length === 0) {} else if (vals.length === 1) {
    const val = vals[0];
    json.type = val === null ? "null" : typeof val;
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json.enum = [val];
    } else {
      json.const = val;
    }
  } else {
    if (vals.every((v) => typeof v === "number"))
      json.type = "number";
    if (vals.every((v) => typeof v === "string"))
      json.type = "string";
    if (vals.every((v) => typeof v === "boolean"))
      json.type = "boolean";
    if (vals.every((v) => v === null))
      json.type = "null";
    json.enum = vals;
  }
};
var customProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Custom types cannot be represented in JSON Schema");
  }
};
var transformProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Transforms cannot be represented in JSON Schema");
  }
};
var arrayProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json.minItems = minimum;
  if (typeof maximum === "number")
    json.maxItems = maximum;
  json.type = "array";
  json.items = process(def.element, ctx, {
    ...params,
    path: [...params.path, "items"]
  });
};
var objectProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  json.type = "object";
  json.properties = {};
  const shape = def.shape;
  for (const key in shape) {
    json.properties[key] = process(shape[key], ctx, {
      ...params,
      path: [...params.path, "properties", key]
    });
  }
  const allKeys = new Set(Object.keys(shape));
  const requiredKeys = new Set([...allKeys].filter((key) => {
    const v = def.shape[key]._zod;
    if (ctx.io === "input") {
      return v.optin === undefined;
    } else {
      return v.optout === undefined;
    }
  }));
  if (requiredKeys.size > 0) {
    json.required = Array.from(requiredKeys);
  }
  if (def.catchall?._zod.def.type === "never") {
    json.additionalProperties = false;
  } else if (!def.catchall) {
    if (ctx.io === "output")
      json.additionalProperties = false;
  } else if (def.catchall) {
    json.additionalProperties = process(def.catchall, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
};
var unionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const isExclusive = def.inclusive === false;
  const options = def.options.map((x, i) => process(x, ctx, {
    ...params,
    path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
  }));
  if (isExclusive) {
    json.oneOf = options;
  } else {
    json.anyOf = options;
  }
};
var intersectionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const a = process(def.left, ctx, {
    ...params,
    path: [...params.path, "allOf", 0]
  });
  const b = process(def.right, ctx, {
    ...params,
    path: [...params.path, "allOf", 1]
  });
  const isSimpleIntersection = (val) => ("allOf" in val) && Object.keys(val).length === 1;
  const allOf = [
    ...isSimpleIntersection(a) ? a.allOf : [a],
    ...isSimpleIntersection(b) ? b.allOf : [b]
  ];
  json.allOf = allOf;
};
var recordProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  json.type = "object";
  const keyType = def.keyType;
  const keyBag = keyType._zod.bag;
  const patterns = keyBag?.patterns;
  if (def.mode === "loose" && patterns && patterns.size > 0) {
    const valueSchema = process(def.valueType, ctx, {
      ...params,
      path: [...params.path, "patternProperties", "*"]
    });
    json.patternProperties = {};
    for (const pattern of patterns) {
      json.patternProperties[pattern.source] = valueSchema;
    }
  } else {
    if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
      json.propertyNames = process(def.keyType, ctx, {
        ...params,
        path: [...params.path, "propertyNames"]
      });
    }
    json.additionalProperties = process(def.valueType, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
  const keyValues = keyType._zod.values;
  if (keyValues) {
    const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
    if (validKeyValues.length > 0) {
      json.required = validKeyValues;
    }
  }
};
var nullableProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const inner = process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json.nullable = true;
  } else {
    json.anyOf = [inner, { type: "null" }];
  }
};
var nonoptionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
var defaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.default = JSON.parse(JSON.stringify(def.defaultValue));
};
var prefaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  if (ctx.io === "input")
    json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
var catchProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue(undefined);
  } catch {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  json.default = catchValue;
};
var pipeProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  const inIsTransform = def.in._zod.traits.has("$ZodTransform");
  const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
  process(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
};
var readonlyProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.readOnly = true;
};
var optionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
// ../node_modules/zod/v4/classic/iso.js
var ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
  $ZodISODateTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function datetime2(params) {
  return _isoDateTime(ZodISODateTime, params);
}
var ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
  $ZodISODate.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function date2(params) {
  return _isoDate(ZodISODate, params);
}
var ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
  $ZodISOTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function time2(params) {
  return _isoTime(ZodISOTime, params);
}
var ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
  $ZodISODuration.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function duration2(params) {
  return _isoDuration(ZodISODuration, params);
}

// ../node_modules/zod/v4/classic/errors.js
var initializer2 = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
    },
    addIssue: {
      value: (issue) => {
        inst.issues.push(issue);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
    },
    addIssues: {
      value: (issues) => {
        inst.issues.push(...issues);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
    }
  });
};
var ZodRealError = /* @__PURE__ */ $constructor("ZodError", initializer2, {
  Parent: Error
});

// ../node_modules/zod/v4/classic/parse.js
var parse3 = /* @__PURE__ */ _parse(ZodRealError);
var parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
var safeParse2 = /* @__PURE__ */ _safeParse(ZodRealError);
var safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
var encode = /* @__PURE__ */ _encode(ZodRealError);
var decode = /* @__PURE__ */ _decode(ZodRealError);
var encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
var decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
var safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
var safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
var safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
var safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);

// ../node_modules/zod/v4/classic/schemas.js
var _installedGroups = /* @__PURE__ */ new WeakMap;
function _installLazyMethods(inst, group, methods) {
  const proto = Object.getPrototypeOf(inst);
  let installed = _installedGroups.get(proto);
  if (!installed) {
    installed = new Set;
    _installedGroups.set(proto, installed);
  }
  if (installed.has(group))
    return;
  installed.add(group);
  for (const key in methods) {
    const fn = methods[key];
    Object.defineProperty(proto, key, {
      configurable: true,
      enumerable: false,
      get() {
        const bound = fn.bind(this);
        Object.defineProperty(this, key, {
          configurable: true,
          writable: true,
          enumerable: true,
          value: bound
        });
        return bound;
      },
      set(v) {
        Object.defineProperty(this, key, {
          configurable: true,
          writable: true,
          enumerable: true,
          value: v
        });
      }
    });
  }
}
var ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
  $ZodType.init(inst, def);
  Object.assign(inst["~standard"], {
    jsonSchema: {
      input: createStandardJSONSchemaMethod(inst, "input"),
      output: createStandardJSONSchemaMethod(inst, "output")
    }
  });
  inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
  inst.def = def;
  inst.type = def.type;
  Object.defineProperty(inst, "_def", { value: def });
  inst.parse = (data, params) => parse3(inst, data, params, { callee: inst.parse });
  inst.safeParse = (data, params) => safeParse2(inst, data, params);
  inst.parseAsync = async (data, params) => parseAsync2(inst, data, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data, params) => safeParseAsync2(inst, data, params);
  inst.spa = inst.safeParseAsync;
  inst.encode = (data, params) => encode(inst, data, params);
  inst.decode = (data, params) => decode(inst, data, params);
  inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
  inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
  inst.safeEncode = (data, params) => safeEncode(inst, data, params);
  inst.safeDecode = (data, params) => safeDecode(inst, data, params);
  inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
  inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
  _installLazyMethods(inst, "ZodType", {
    check(...chks) {
      const def = this.def;
      return this.clone(mergeDefs(def, {
        checks: [
          ...def.checks ?? [],
          ...chks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
        ]
      }), { parent: true });
    },
    with(...chks) {
      return this.check(...chks);
    },
    clone(def, params) {
      return clone(this, def, params);
    },
    brand() {
      return this;
    },
    register(reg, meta) {
      reg.add(this, meta);
      return this;
    },
    refine(check, params) {
      return this.check(refine(check, params));
    },
    superRefine(refinement, params) {
      return this.check(superRefine(refinement, params));
    },
    overwrite(fn) {
      return this.check(_overwrite(fn));
    },
    optional() {
      return optional(this);
    },
    exactOptional() {
      return exactOptional(this);
    },
    nullable() {
      return nullable(this);
    },
    nullish() {
      return optional(nullable(this));
    },
    nonoptional(params) {
      return nonoptional(this, params);
    },
    array() {
      return array(this);
    },
    or(arg) {
      return union([this, arg]);
    },
    and(arg) {
      return intersection(this, arg);
    },
    transform(tx) {
      return pipe(this, transform(tx));
    },
    default(d) {
      return _default(this, d);
    },
    prefault(d) {
      return prefault(this, d);
    },
    catch(params) {
      return _catch(this, params);
    },
    pipe(target) {
      return pipe(this, target);
    },
    readonly() {
      return readonly(this);
    },
    describe(description) {
      const cl = this.clone();
      globalRegistry.add(cl, { description });
      return cl;
    },
    meta(...args) {
      if (args.length === 0)
        return globalRegistry.get(this);
      const cl = this.clone();
      globalRegistry.add(cl, args[0]);
      return cl;
    },
    isOptional() {
      return this.safeParse(undefined).success;
    },
    isNullable() {
      return this.safeParse(null).success;
    },
    apply(fn) {
      return fn(this);
    }
  });
  Object.defineProperty(inst, "description", {
    get() {
      return globalRegistry.get(inst)?.description;
    },
    configurable: true
  });
  return inst;
});
var _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
  const bag = inst._zod.bag;
  inst.format = bag.format ?? null;
  inst.minLength = bag.minimum ?? null;
  inst.maxLength = bag.maximum ?? null;
  _installLazyMethods(inst, "_ZodString", {
    regex(...args) {
      return this.check(_regex(...args));
    },
    includes(...args) {
      return this.check(_includes(...args));
    },
    startsWith(...args) {
      return this.check(_startsWith(...args));
    },
    endsWith(...args) {
      return this.check(_endsWith(...args));
    },
    min(...args) {
      return this.check(_minLength(...args));
    },
    max(...args) {
      return this.check(_maxLength(...args));
    },
    length(...args) {
      return this.check(_length(...args));
    },
    nonempty(...args) {
      return this.check(_minLength(1, ...args));
    },
    lowercase(params) {
      return this.check(_lowercase(params));
    },
    uppercase(params) {
      return this.check(_uppercase(params));
    },
    trim() {
      return this.check(_trim());
    },
    normalize(...args) {
      return this.check(_normalize(...args));
    },
    toLowerCase() {
      return this.check(_toLowerCase());
    },
    toUpperCase() {
      return this.check(_toUpperCase());
    },
    slugify() {
      return this.check(_slugify());
    }
  });
});
var ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  _ZodString.init(inst, def);
  inst.email = (params) => inst.check(_email(ZodEmail, params));
  inst.url = (params) => inst.check(_url(ZodURL, params));
  inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
  inst.emoji = (params) => inst.check(_emoji2(ZodEmoji, params));
  inst.guid = (params) => inst.check(_guid(ZodGUID, params));
  inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
  inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
  inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
  inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
  inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
  inst.guid = (params) => inst.check(_guid(ZodGUID, params));
  inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
  inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
  inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
  inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
  inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
  inst.xid = (params) => inst.check(_xid(ZodXID, params));
  inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
  inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
  inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
  inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
  inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
  inst.e164 = (params) => inst.check(_e164(ZodE164, params));
  inst.datetime = (params) => inst.check(datetime2(params));
  inst.date = (params) => inst.check(date2(params));
  inst.time = (params) => inst.check(time2(params));
  inst.duration = (params) => inst.check(duration2(params));
});
function string2(params) {
  return _string(ZodString, params);
}
var ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  _ZodString.init(inst, def);
});
var ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
  $ZodEmail.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
  $ZodGUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
  $ZodUUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
  $ZodURL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
  $ZodEmoji.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
  $ZodNanoID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
  $ZodCUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
  $ZodCUID2.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
  $ZodULID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
  $ZodXID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
  $ZodKSUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
  $ZodIPv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
  $ZodIPv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
  $ZodCIDRv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
  $ZodCIDRv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
  $ZodBase64.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
  $ZodBase64URL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
  $ZodE164.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
  $ZodJWT.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
  _installLazyMethods(inst, "ZodNumber", {
    gt(value, params) {
      return this.check(_gt(value, params));
    },
    gte(value, params) {
      return this.check(_gte(value, params));
    },
    min(value, params) {
      return this.check(_gte(value, params));
    },
    lt(value, params) {
      return this.check(_lt(value, params));
    },
    lte(value, params) {
      return this.check(_lte(value, params));
    },
    max(value, params) {
      return this.check(_lte(value, params));
    },
    int(params) {
      return this.check(int(params));
    },
    safe(params) {
      return this.check(int(params));
    },
    positive(params) {
      return this.check(_gt(0, params));
    },
    nonnegative(params) {
      return this.check(_gte(0, params));
    },
    negative(params) {
      return this.check(_lt(0, params));
    },
    nonpositive(params) {
      return this.check(_lte(0, params));
    },
    multipleOf(value, params) {
      return this.check(_multipleOf(value, params));
    },
    step(value, params) {
      return this.check(_multipleOf(value, params));
    },
    finite() {
      return this;
    }
  });
  const bag = inst._zod.bag;
  inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
  inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
  inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
  inst.isFinite = true;
  inst.format = bag.format ?? null;
});
function number2(params) {
  return _number(ZodNumber, params);
}
var ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
function int(params) {
  return _int(ZodNumberFormat, params);
}
var ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
});
function boolean2(params) {
  return _boolean(ZodBoolean, params);
}
var ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
  $ZodNull.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nullProcessor(inst, ctx, json, params);
});
function _null3(params) {
  return _null2(ZodNull, params);
}
var ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor(inst, ctx, json, params);
});
function unknown() {
  return _unknown(ZodUnknown);
}
var ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
});
function never(params) {
  return _never(ZodNever, params);
}
var ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
  inst.element = def.element;
  _installLazyMethods(inst, "ZodArray", {
    min(n, params) {
      return this.check(_minLength(n, params));
    },
    nonempty(params) {
      return this.check(_minLength(1, params));
    },
    max(n, params) {
      return this.check(_maxLength(n, params));
    },
    length(n, params) {
      return this.check(_length(n, params));
    },
    unwrap() {
      return this.element;
    }
  });
});
function array(element, params) {
  return _array(ZodArray, element, params);
}
var ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
  $ZodObjectJIT.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
  defineLazy(inst, "shape", () => {
    return def.shape;
  });
  _installLazyMethods(inst, "ZodObject", {
    keyof() {
      return _enum(Object.keys(this._zod.def.shape));
    },
    catchall(catchall) {
      return this.clone({ ...this._zod.def, catchall });
    },
    passthrough() {
      return this.clone({ ...this._zod.def, catchall: unknown() });
    },
    loose() {
      return this.clone({ ...this._zod.def, catchall: unknown() });
    },
    strict() {
      return this.clone({ ...this._zod.def, catchall: never() });
    },
    strip() {
      return this.clone({ ...this._zod.def, catchall: undefined });
    },
    extend(incoming) {
      return extend(this, incoming);
    },
    safeExtend(incoming) {
      return safeExtend(this, incoming);
    },
    merge(other) {
      return merge(this, other);
    },
    pick(mask) {
      return pick(this, mask);
    },
    omit(mask) {
      return omit(this, mask);
    },
    partial(...args) {
      return partial(ZodOptional, this, args[0]);
    },
    required(...args) {
      return required(ZodNonOptional, this, args[0]);
    }
  });
});
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...normalizeParams(params)
  };
  return new ZodObject(def);
}
var ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
  inst.options = def.options;
});
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
var ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
  $ZodIntersection.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
});
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
var ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
  $ZodRecord.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
  inst.keyType = def.keyType;
  inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
  if (!valueType || !valueType._zod) {
    return new ZodRecord({
      type: "record",
      keyType: string2(),
      valueType: keyType,
      ...normalizeParams(valueType)
    });
  }
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
var ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
  inst.enum = def.entries;
  inst.options = Object.values(def.entries);
  const keys = new Set(Object.keys(def.entries));
  inst.extract = (values, params) => {
    const newEntries = {};
    for (const value of values) {
      if (keys.has(value)) {
        newEntries[value] = def.entries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...normalizeParams(params),
      entries: newEntries
    });
  };
  inst.exclude = (values, params) => {
    const newEntries = { ...def.entries };
    for (const value of values) {
      if (keys.has(value)) {
        delete newEntries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...normalizeParams(params),
      entries: newEntries
    });
  };
});
function _enum(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
var ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
  $ZodLiteral.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
  inst.values = new Set(def.values);
  Object.defineProperty(inst, "value", {
    get() {
      if (def.values.length > 1) {
        throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
      }
      return def.values[0];
    }
  });
});
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
var ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
  $ZodTransform.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
  inst._zod.parse = (payload, _ctx) => {
    if (_ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(issue(issue2, payload.value, def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = inst);
        payload.issues.push(issue(_issue));
      }
    };
    const output = def.transform(payload.value, payload);
    if (output instanceof Promise) {
      return output.then((output) => {
        payload.value = output;
        payload.fallback = true;
        return payload;
      });
    }
    payload.value = output;
    payload.fallback = true;
    return payload;
  };
});
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
var ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
var ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
  $ZodExactOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType
  });
}
var ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
  $ZodNullable.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
var ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
var ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
  $ZodPrefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
var ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
  $ZodNonOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params)
  });
}
var ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
  $ZodCatch.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
var ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
  inst.in = def.in;
  inst.out = def.out;
});
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
  });
}
var ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
var ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
});
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
  return _superRefine(fn, params);
}

// ../node_modules/zod/v4/classic/compat.js
var ZodIssueCode = {
  invalid_type: "invalid_type",
  too_big: "too_big",
  too_small: "too_small",
  invalid_format: "invalid_format",
  not_multiple_of: "not_multiple_of",
  unrecognized_keys: "unrecognized_keys",
  invalid_union: "invalid_union",
  invalid_key: "invalid_key",
  invalid_element: "invalid_element",
  invalid_value: "invalid_value",
  custom: "custom"
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind) {})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
// ../node_modules/@hatch/space-sdk/dist/server-contract.js
var PRIVILEGED_CONTRACT_BRAND = "@hatch/space-sdk/privileged-contract/v1";
function definePrivilegedContracts(specs) {
  const contracts = {};
  for (const [name, spec] of Object.entries(specs)) {
    contracts[name] = {
      __brand: PRIVILEGED_CONTRACT_BRAND,
      name,
      request: spec.request,
      response: spec.response,
      ...spec.capabilities !== undefined ? { capabilities: spec.capabilities } : {},
      ...spec.timeoutMs !== undefined ? { timeoutMs: spec.timeoutMs } : {}
    };
  }
  return contracts;
}
var ACTION_BRAND = "@hatch/space-sdk/action/v1";
var LEGACY_ACTION_BRAND = Symbol.for("@hatch/space-sdk/action");
function createDefineAction() {
  return function defineAction(spec) {
    return {
      __brand: ACTION_BRAND,
      request: spec.request,
      response: spec.response,
      ...spec.privileged !== undefined ? { privileged: spec.privileged } : {},
      handler: spec.handler
    };
  };
}
// ../node_modules/@hatch/space-sdk/dist/index.js
var defineAction = createDefineAction();

// .generated/privileged.contract.ts
var privileged = definePrivilegedContracts({
  readApplicationEvidence: {
    request: object({ appId: string2().regex(/^[A-Za-z0-9_-]+$/), campaignId: string2().regex(/^[A-Za-z0-9_-]+$/), runId: string2().regex(/^[A-Za-z0-9_-]+$/), kind: _enum(["resume", "screenshot", "confirmation"]), filename: string2().regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*$/) }),
    response: object({ filename: string2(), bytesBase64: string2(), contentType: _enum(["application/pdf", "image/png", "text/plain"]) }),
    timeoutMs: 15000
  },
  applicationEvidenceExists: {
    request: object({ appId: string2().regex(/^[A-Za-z0-9_-]+$/), campaignId: string2().regex(/^[A-Za-z0-9_-]+$/), runId: string2().regex(/^[A-Za-z0-9_-]+$/), kind: _enum(["resume", "screenshot", "confirmation"]), filename: string2().regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*$/) }),
    response: object({ exists: boolean2() }),
    timeoutMs: 5000
  },
  readRegisteredResume: {
    request: object({ filename: string2().regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*\.pdf$/i), location: _enum(["user_files", "user_file_resumes", "workspace_resumes"]) }),
    response: object({ filename: string2(), bytesBase64: string2(), contentType: literal("application/pdf") }),
    timeoutMs: 15000
  },
  writeResumeUpload: {
    request: object({ filename: string2().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/i), bytes_base64: string2().min(1) }),
    response: object({ path: string2(), filename: string2() }),
    timeoutMs: 20000
  },
  trashResumeFile: {
    request: object({ variant_id: string2().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/), filename: string2().regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*\.pdf$/i), location: _enum(["user_files", "user_file_resumes", "workspace_resumes"]) }),
    response: object({ file_moved: boolean2(), trashed_path: string2().nullable() }),
    timeoutMs: 15000
  },
  readTrashedResume: {
    request: object({ variant_id: string2().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/), filename: string2().regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*\.pdf$/i), sha256: string2().regex(/^[a-f0-9]{64}$/i).nullable().optional() }),
    response: object({ found: boolean2(), filename: string2().optional(), bytesBase64: string2().optional(), contentType: literal("application/pdf").optional() }),
    timeoutMs: 15000
  },
  renderPdfPreview: {
    request: object({ bytesBase64: string2().min(1), maxPages: number2().int().min(1).max(8) }),
    response: object({ pages: array(object({ page: number2().int().positive(), bytesBase64: string2() })), truncated: boolean2() }),
    timeoutMs: 30000
  },
  readSchedulesManifest: {
    request: object({}),
    response: object({ manifestText: string2().nullable() }),
    timeoutMs: 5000
  },
  readProfileYaml: {
    request: object({}),
    response: object({ yamlText: string2() }),
    timeoutMs: 5000
  },
  parseProfileYaml: {
    request: object({ yamlText: string2().min(1) }),
    response: object({ parsed: unknown() }),
    timeoutMs: 5000
  },
  writeProfileYaml: {
    request: object({ yaml_text: string2().min(1) }),
    response: object({ ok: literal(true), bytes_written: number2().int().nonnegative() }),
    timeoutMs: 5000
  }
});

// ../node_modules/drizzle-orm/entity.js
var entityKind = Symbol.for("drizzle:entityKind");
var hasOwnEntityKind = Symbol.for("drizzle:hasOwnEntityKind");
function is(value, type) {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (value instanceof type) {
    return true;
  }
  if (!Object.prototype.hasOwnProperty.call(type, entityKind)) {
    throw new Error(`Class "${type.name ?? "<unknown>"}" doesn't look like a Drizzle entity. If this is incorrect and the class is provided by Drizzle, please report this as a bug.`);
  }
  let cls = Object.getPrototypeOf(value).constructor;
  if (cls) {
    while (cls) {
      if (entityKind in cls && cls[entityKind] === type[entityKind]) {
        return true;
      }
      cls = Object.getPrototypeOf(cls);
    }
  }
  return false;
}

// ../node_modules/drizzle-orm/column.js
class Column {
  constructor(table, config) {
    this.table = table;
    this.config = config;
    this.name = config.name;
    this.keyAsName = config.keyAsName;
    this.notNull = config.notNull;
    this.default = config.default;
    this.defaultFn = config.defaultFn;
    this.onUpdateFn = config.onUpdateFn;
    this.hasDefault = config.hasDefault;
    this.primary = config.primaryKey;
    this.isUnique = config.isUnique;
    this.uniqueName = config.uniqueName;
    this.uniqueType = config.uniqueType;
    this.dataType = config.dataType;
    this.columnType = config.columnType;
    this.generated = config.generated;
    this.generatedIdentity = config.generatedIdentity;
  }
  static [entityKind] = "Column";
  name;
  keyAsName;
  primary;
  notNull;
  default;
  defaultFn;
  onUpdateFn;
  hasDefault;
  isUnique;
  uniqueName;
  uniqueType;
  dataType;
  columnType;
  enumValues = undefined;
  generated = undefined;
  generatedIdentity = undefined;
  config;
  mapFromDriverValue(value) {
    return value;
  }
  mapToDriverValue(value) {
    return value;
  }
  shouldDisableInsert() {
    return this.config.generated !== undefined && this.config.generated.type !== "byDefault";
  }
}

// ../node_modules/drizzle-orm/column-builder.js
class ColumnBuilder {
  static [entityKind] = "ColumnBuilder";
  config;
  constructor(name, dataType, columnType) {
    this.config = {
      name,
      keyAsName: name === "",
      notNull: false,
      default: undefined,
      hasDefault: false,
      primaryKey: false,
      isUnique: false,
      uniqueName: undefined,
      uniqueType: undefined,
      dataType,
      columnType,
      generated: undefined
    };
  }
  $type() {
    return this;
  }
  notNull() {
    this.config.notNull = true;
    return this;
  }
  default(value) {
    this.config.default = value;
    this.config.hasDefault = true;
    return this;
  }
  $defaultFn(fn) {
    this.config.defaultFn = fn;
    this.config.hasDefault = true;
    return this;
  }
  $default = this.$defaultFn;
  $onUpdateFn(fn) {
    this.config.onUpdateFn = fn;
    this.config.hasDefault = true;
    return this;
  }
  $onUpdate = this.$onUpdateFn;
  primaryKey() {
    this.config.primaryKey = true;
    this.config.notNull = true;
    return this;
  }
  setName(name) {
    if (this.config.name !== "")
      return;
    this.config.name = name;
  }
}

// ../node_modules/drizzle-orm/table.utils.js
var TableName = Symbol.for("drizzle:Name");

// ../node_modules/drizzle-orm/tracing-utils.js
function iife(fn, ...args) {
  return fn(...args);
}

// ../node_modules/drizzle-orm/pg-core/columns/enum.js
var isPgEnumSym = Symbol.for("drizzle:isPgEnum");
function isPgEnum(obj) {
  return !!obj && typeof obj === "function" && isPgEnumSym in obj && obj[isPgEnumSym] === true;
}

// ../node_modules/drizzle-orm/subquery.js
class Subquery {
  static [entityKind] = "Subquery";
  constructor(sql, fields, alias, isWith = false, usedTables = []) {
    this._ = {
      brand: "Subquery",
      sql,
      selectedFields: fields,
      alias,
      isWith,
      usedTables
    };
  }
}

// ../node_modules/drizzle-orm/version.js
var version2 = "0.45.2";

// ../node_modules/drizzle-orm/tracing.js
var otel;
var rawTracer;
var tracer = {
  startActiveSpan(name, fn) {
    if (!otel) {
      return fn();
    }
    if (!rawTracer) {
      rawTracer = otel.trace.getTracer("drizzle-orm", version2);
    }
    return iife((otel2, rawTracer2) => rawTracer2.startActiveSpan(name, (span) => {
      try {
        return fn(span);
      } catch (e) {
        span.setStatus({
          code: otel2.SpanStatusCode.ERROR,
          message: e instanceof Error ? e.message : "Unknown error"
        });
        throw e;
      } finally {
        span.end();
      }
    }), otel, rawTracer);
  }
};

// ../node_modules/drizzle-orm/view-common.js
var ViewBaseConfig = Symbol.for("drizzle:ViewBaseConfig");

// ../node_modules/drizzle-orm/table.js
var Schema = Symbol.for("drizzle:Schema");
var Columns = Symbol.for("drizzle:Columns");
var ExtraConfigColumns = Symbol.for("drizzle:ExtraConfigColumns");
var OriginalName = Symbol.for("drizzle:OriginalName");
var BaseName = Symbol.for("drizzle:BaseName");
var IsAlias = Symbol.for("drizzle:IsAlias");
var ExtraConfigBuilder = Symbol.for("drizzle:ExtraConfigBuilder");
var IsDrizzleTable = Symbol.for("drizzle:IsDrizzleTable");

class Table {
  static [entityKind] = "Table";
  static Symbol = {
    Name: TableName,
    Schema,
    OriginalName,
    Columns,
    ExtraConfigColumns,
    BaseName,
    IsAlias,
    ExtraConfigBuilder
  };
  [TableName];
  [OriginalName];
  [Schema];
  [Columns];
  [ExtraConfigColumns];
  [BaseName];
  [IsAlias] = false;
  [IsDrizzleTable] = true;
  [ExtraConfigBuilder] = undefined;
  constructor(name, schema, baseName) {
    this[TableName] = this[OriginalName] = name;
    this[Schema] = schema;
    this[BaseName] = baseName;
  }
}

// ../node_modules/drizzle-orm/sql/sql.js
function isSQLWrapper(value) {
  return value !== null && value !== undefined && typeof value.getSQL === "function";
}
function mergeQueries(queries) {
  const result = { sql: "", params: [] };
  for (const query of queries) {
    result.sql += query.sql;
    result.params.push(...query.params);
    if (query.typings?.length) {
      if (!result.typings) {
        result.typings = [];
      }
      result.typings.push(...query.typings);
    }
  }
  return result;
}

class StringChunk {
  static [entityKind] = "StringChunk";
  value;
  constructor(value) {
    this.value = Array.isArray(value) ? value : [value];
  }
  getSQL() {
    return new SQL([this]);
  }
}

class SQL {
  constructor(queryChunks) {
    this.queryChunks = queryChunks;
    for (const chunk of queryChunks) {
      if (is(chunk, Table)) {
        const schemaName = chunk[Table.Symbol.Schema];
        this.usedTables.push(schemaName === undefined ? chunk[Table.Symbol.Name] : schemaName + "." + chunk[Table.Symbol.Name]);
      }
    }
  }
  static [entityKind] = "SQL";
  decoder = noopDecoder;
  shouldInlineParams = false;
  usedTables = [];
  append(query) {
    this.queryChunks.push(...query.queryChunks);
    return this;
  }
  toQuery(config) {
    return tracer.startActiveSpan("drizzle.buildSQL", (span) => {
      const query = this.buildQueryFromSourceParams(this.queryChunks, config);
      span?.setAttributes({
        "drizzle.query.text": query.sql,
        "drizzle.query.params": JSON.stringify(query.params)
      });
      return query;
    });
  }
  buildQueryFromSourceParams(chunks, _config) {
    const config = Object.assign({}, _config, {
      inlineParams: _config.inlineParams || this.shouldInlineParams,
      paramStartIndex: _config.paramStartIndex || { value: 0 }
    });
    const {
      casing,
      escapeName,
      escapeParam,
      prepareTyping,
      inlineParams,
      paramStartIndex
    } = config;
    return mergeQueries(chunks.map((chunk) => {
      if (is(chunk, StringChunk)) {
        return { sql: chunk.value.join(""), params: [] };
      }
      if (is(chunk, Name)) {
        return { sql: escapeName(chunk.value), params: [] };
      }
      if (chunk === undefined) {
        return { sql: "", params: [] };
      }
      if (Array.isArray(chunk)) {
        const result = [new StringChunk("(")];
        for (const [i, p] of chunk.entries()) {
          result.push(p);
          if (i < chunk.length - 1) {
            result.push(new StringChunk(", "));
          }
        }
        result.push(new StringChunk(")"));
        return this.buildQueryFromSourceParams(result, config);
      }
      if (is(chunk, SQL)) {
        return this.buildQueryFromSourceParams(chunk.queryChunks, {
          ...config,
          inlineParams: inlineParams || chunk.shouldInlineParams
        });
      }
      if (is(chunk, Table)) {
        const schemaName = chunk[Table.Symbol.Schema];
        const tableName = chunk[Table.Symbol.Name];
        return {
          sql: schemaName === undefined || chunk[IsAlias] ? escapeName(tableName) : escapeName(schemaName) + "." + escapeName(tableName),
          params: []
        };
      }
      if (is(chunk, Column)) {
        const columnName = casing.getColumnCasing(chunk);
        if (_config.invokeSource === "indexes") {
          return { sql: escapeName(columnName), params: [] };
        }
        const schemaName = chunk.table[Table.Symbol.Schema];
        return {
          sql: chunk.table[IsAlias] || schemaName === undefined ? escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName) : escapeName(schemaName) + "." + escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName),
          params: []
        };
      }
      if (is(chunk, View)) {
        const schemaName = chunk[ViewBaseConfig].schema;
        const viewName = chunk[ViewBaseConfig].name;
        return {
          sql: schemaName === undefined || chunk[ViewBaseConfig].isAlias ? escapeName(viewName) : escapeName(schemaName) + "." + escapeName(viewName),
          params: []
        };
      }
      if (is(chunk, Param)) {
        if (is(chunk.value, Placeholder)) {
          return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
        }
        const mappedValue = chunk.value === null ? null : chunk.encoder.mapToDriverValue(chunk.value);
        if (is(mappedValue, SQL)) {
          return this.buildQueryFromSourceParams([mappedValue], config);
        }
        if (inlineParams) {
          return { sql: this.mapInlineParam(mappedValue, config), params: [] };
        }
        let typings = ["none"];
        if (prepareTyping) {
          typings = [prepareTyping(chunk.encoder)];
        }
        return { sql: escapeParam(paramStartIndex.value++, mappedValue), params: [mappedValue], typings };
      }
      if (is(chunk, Placeholder)) {
        return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
      }
      if (is(chunk, SQL.Aliased) && chunk.fieldAlias !== undefined) {
        return { sql: escapeName(chunk.fieldAlias), params: [] };
      }
      if (is(chunk, Subquery)) {
        if (chunk._.isWith) {
          return { sql: escapeName(chunk._.alias), params: [] };
        }
        return this.buildQueryFromSourceParams([
          new StringChunk("("),
          chunk._.sql,
          new StringChunk(") "),
          new Name(chunk._.alias)
        ], config);
      }
      if (isPgEnum(chunk)) {
        if (chunk.schema) {
          return { sql: escapeName(chunk.schema) + "." + escapeName(chunk.enumName), params: [] };
        }
        return { sql: escapeName(chunk.enumName), params: [] };
      }
      if (isSQLWrapper(chunk)) {
        if (chunk.shouldOmitSQLParens?.()) {
          return this.buildQueryFromSourceParams([chunk.getSQL()], config);
        }
        return this.buildQueryFromSourceParams([
          new StringChunk("("),
          chunk.getSQL(),
          new StringChunk(")")
        ], config);
      }
      if (inlineParams) {
        return { sql: this.mapInlineParam(chunk, config), params: [] };
      }
      return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
    }));
  }
  mapInlineParam(chunk, { escapeString }) {
    if (chunk === null) {
      return "null";
    }
    if (typeof chunk === "number" || typeof chunk === "boolean") {
      return chunk.toString();
    }
    if (typeof chunk === "string") {
      return escapeString(chunk);
    }
    if (typeof chunk === "object") {
      const mappedValueAsString = chunk.toString();
      if (mappedValueAsString === "[object Object]") {
        return escapeString(JSON.stringify(chunk));
      }
      return escapeString(mappedValueAsString);
    }
    throw new Error("Unexpected param value: " + chunk);
  }
  getSQL() {
    return this;
  }
  as(alias) {
    if (alias === undefined) {
      return this;
    }
    return new SQL.Aliased(this, alias);
  }
  mapWith(decoder) {
    this.decoder = typeof decoder === "function" ? { mapFromDriverValue: decoder } : decoder;
    return this;
  }
  inlineParams() {
    this.shouldInlineParams = true;
    return this;
  }
  if(condition) {
    return condition ? this : undefined;
  }
}

class Name {
  constructor(value) {
    this.value = value;
  }
  static [entityKind] = "Name";
  brand;
  getSQL() {
    return new SQL([this]);
  }
}
function isDriverValueEncoder(value) {
  return typeof value === "object" && value !== null && "mapToDriverValue" in value && typeof value.mapToDriverValue === "function";
}
var noopDecoder = {
  mapFromDriverValue: (value) => value
};
var noopEncoder = {
  mapToDriverValue: (value) => value
};
var noopMapper = {
  ...noopDecoder,
  ...noopEncoder
};

class Param {
  constructor(value, encoder = noopEncoder) {
    this.value = value;
    this.encoder = encoder;
  }
  static [entityKind] = "Param";
  brand;
  getSQL() {
    return new SQL([this]);
  }
}
function sql(strings, ...params) {
  const queryChunks = [];
  if (params.length > 0 || strings.length > 0 && strings[0] !== "") {
    queryChunks.push(new StringChunk(strings[0]));
  }
  for (const [paramIndex, param2] of params.entries()) {
    queryChunks.push(param2, new StringChunk(strings[paramIndex + 1]));
  }
  return new SQL(queryChunks);
}
((sql2) => {
  function empty() {
    return new SQL([]);
  }
  sql2.empty = empty;
  function fromList(list) {
    return new SQL(list);
  }
  sql2.fromList = fromList;
  function raw(str) {
    return new SQL([new StringChunk(str)]);
  }
  sql2.raw = raw;
  function join(chunks, separator) {
    const result = [];
    for (const [i, chunk] of chunks.entries()) {
      if (i > 0 && separator !== undefined) {
        result.push(separator);
      }
      result.push(chunk);
    }
    return new SQL(result);
  }
  sql2.join = join;
  function identifier(value) {
    return new Name(value);
  }
  sql2.identifier = identifier;
  function placeholder2(name2) {
    return new Placeholder(name2);
  }
  sql2.placeholder = placeholder2;
  function param2(value, encoder) {
    return new Param(value, encoder);
  }
  sql2.param = param2;
})(sql || (sql = {}));
((SQL2) => {

  class Aliased {
    constructor(sql2, fieldAlias) {
      this.sql = sql2;
      this.fieldAlias = fieldAlias;
    }
    static [entityKind] = "SQL.Aliased";
    isSelectionField = false;
    getSQL() {
      return this.sql;
    }
    clone() {
      return new Aliased(this.sql, this.fieldAlias);
    }
  }
  SQL2.Aliased = Aliased;
})(SQL || (SQL = {}));

class Placeholder {
  constructor(name2) {
    this.name = name2;
  }
  static [entityKind] = "Placeholder";
  getSQL() {
    return new SQL([this]);
  }
}
var IsDrizzleView = Symbol.for("drizzle:IsDrizzleView");

class View {
  static [entityKind] = "View";
  [ViewBaseConfig];
  [IsDrizzleView] = true;
  constructor({ name: name2, schema, selectedFields, query }) {
    this[ViewBaseConfig] = {
      name: name2,
      originalName: name2,
      schema,
      selectedFields,
      query,
      isExisting: !query,
      isAlias: false
    };
  }
  getSQL() {
    return new SQL([this]);
  }
}
Column.prototype.getSQL = function() {
  return new SQL([this]);
};
Table.prototype.getSQL = function() {
  return new SQL([this]);
};
Subquery.prototype.getSQL = function() {
  return new SQL([this]);
};

// ../node_modules/drizzle-orm/utils.js
function getColumnNameAndConfig(a, b) {
  return {
    name: typeof a === "string" && a.length > 0 ? a : "",
    config: typeof a === "object" ? a : b
  };
}
var textDecoder = typeof TextDecoder === "undefined" ? null : new TextDecoder;

// ../node_modules/drizzle-orm/sql/expressions/conditions.js
function bindIfParam(value, column) {
  if (isDriverValueEncoder(column) && !isSQLWrapper(value) && !is(value, Param) && !is(value, Placeholder) && !is(value, Column) && !is(value, Table) && !is(value, View)) {
    return new Param(value, column);
  }
  return value;
}
var eq = (left, right) => {
  return sql`${left} = ${bindIfParam(right, left)}`;
};
function and(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter((c) => c !== undefined);
  if (conditions.length === 0) {
    return;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" and ")),
    new StringChunk(")")
  ]);
}
function or(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter((c) => c !== undefined);
  if (conditions.length === 0) {
    return;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" or ")),
    new StringChunk(")")
  ]);
}
var gte = (left, right) => {
  return sql`${left} >= ${bindIfParam(right, left)}`;
};
var lt = (left, right) => {
  return sql`${left} < ${bindIfParam(right, left)}`;
};
function inArray(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return sql`false`;
    }
    return sql`${column} in ${values.map((v) => bindIfParam(v, column))}`;
  }
  return sql`${column} in ${bindIfParam(values, column)}`;
}
function isNull(value) {
  return sql`${value} is null`;
}

// ../node_modules/drizzle-orm/sql/expressions/select.js
function asc(column) {
  return sql`${column} asc`;
}
function desc(column) {
  return sql`${column} desc`;
}

// ../node_modules/drizzle-orm/sqlite-core/foreign-keys.js
class ForeignKeyBuilder {
  static [entityKind] = "SQLiteForeignKeyBuilder";
  reference;
  _onUpdate;
  _onDelete;
  constructor(config, actions) {
    this.reference = () => {
      const { name, columns, foreignColumns } = config();
      return { name, columns, foreignTable: foreignColumns[0].table, foreignColumns };
    };
    if (actions) {
      this._onUpdate = actions.onUpdate;
      this._onDelete = actions.onDelete;
    }
  }
  onUpdate(action) {
    this._onUpdate = action;
    return this;
  }
  onDelete(action) {
    this._onDelete = action;
    return this;
  }
  build(table) {
    return new ForeignKey(table, this);
  }
}

class ForeignKey {
  constructor(table, builder) {
    this.table = table;
    this.reference = builder.reference;
    this.onUpdate = builder._onUpdate;
    this.onDelete = builder._onDelete;
  }
  static [entityKind] = "SQLiteForeignKey";
  reference;
  onUpdate;
  onDelete;
  getName() {
    const { name, columns, foreignColumns } = this.reference();
    const columnNames = columns.map((column) => column.name);
    const foreignColumnNames = foreignColumns.map((column) => column.name);
    const chunks = [
      this.table[TableName],
      ...columnNames,
      foreignColumns[0].table[TableName],
      ...foreignColumnNames
    ];
    return name ?? `${chunks.join("_")}_fk`;
  }
}

// ../node_modules/drizzle-orm/sqlite-core/unique-constraint.js
function uniqueKeyName(table, columns) {
  return `${table[TableName]}_${columns.join("_")}_unique`;
}

// ../node_modules/drizzle-orm/sqlite-core/columns/common.js
class SQLiteColumnBuilder extends ColumnBuilder {
  static [entityKind] = "SQLiteColumnBuilder";
  foreignKeyConfigs = [];
  references(ref, actions = {}) {
    this.foreignKeyConfigs.push({ ref, actions });
    return this;
  }
  unique(name) {
    this.config.isUnique = true;
    this.config.uniqueName = name;
    return this;
  }
  generatedAlwaysAs(as, config) {
    this.config.generated = {
      as,
      type: "always",
      mode: config?.mode ?? "virtual"
    };
    return this;
  }
  buildForeignKeys(column, table) {
    return this.foreignKeyConfigs.map(({ ref, actions }) => {
      return ((ref2, actions2) => {
        const builder = new ForeignKeyBuilder(() => {
          const foreignColumn = ref2();
          return { columns: [column], foreignColumns: [foreignColumn] };
        });
        if (actions2.onUpdate) {
          builder.onUpdate(actions2.onUpdate);
        }
        if (actions2.onDelete) {
          builder.onDelete(actions2.onDelete);
        }
        return builder.build(table);
      })(ref, actions);
    });
  }
}

class SQLiteColumn extends Column {
  constructor(table, config) {
    if (!config.uniqueName) {
      config.uniqueName = uniqueKeyName(table, [config.name]);
    }
    super(table, config);
    this.table = table;
  }
  static [entityKind] = "SQLiteColumn";
}

// ../node_modules/drizzle-orm/sqlite-core/columns/blob.js
class SQLiteBigIntBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteBigIntBuilder";
  constructor(name) {
    super(name, "bigint", "SQLiteBigInt");
  }
  build(table) {
    return new SQLiteBigInt(table, this.config);
  }
}

class SQLiteBigInt extends SQLiteColumn {
  static [entityKind] = "SQLiteBigInt";
  getSQLType() {
    return "blob";
  }
  mapFromDriverValue(value) {
    if (typeof Buffer !== "undefined" && Buffer.from) {
      const buf = Buffer.isBuffer(value) ? value : value instanceof ArrayBuffer ? Buffer.from(value) : value.buffer ? Buffer.from(value.buffer, value.byteOffset, value.byteLength) : Buffer.from(value);
      return BigInt(buf.toString("utf8"));
    }
    return BigInt(textDecoder.decode(value));
  }
  mapToDriverValue(value) {
    return Buffer.from(value.toString());
  }
}

class SQLiteBlobJsonBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteBlobJsonBuilder";
  constructor(name) {
    super(name, "json", "SQLiteBlobJson");
  }
  build(table) {
    return new SQLiteBlobJson(table, this.config);
  }
}

class SQLiteBlobJson extends SQLiteColumn {
  static [entityKind] = "SQLiteBlobJson";
  getSQLType() {
    return "blob";
  }
  mapFromDriverValue(value) {
    if (typeof Buffer !== "undefined" && Buffer.from) {
      const buf = Buffer.isBuffer(value) ? value : value instanceof ArrayBuffer ? Buffer.from(value) : value.buffer ? Buffer.from(value.buffer, value.byteOffset, value.byteLength) : Buffer.from(value);
      return JSON.parse(buf.toString("utf8"));
    }
    return JSON.parse(textDecoder.decode(value));
  }
  mapToDriverValue(value) {
    return Buffer.from(JSON.stringify(value));
  }
}

class SQLiteBlobBufferBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteBlobBufferBuilder";
  constructor(name) {
    super(name, "buffer", "SQLiteBlobBuffer");
  }
  build(table) {
    return new SQLiteBlobBuffer(table, this.config);
  }
}

class SQLiteBlobBuffer extends SQLiteColumn {
  static [entityKind] = "SQLiteBlobBuffer";
  mapFromDriverValue(value) {
    if (Buffer.isBuffer(value)) {
      return value;
    }
    return Buffer.from(value);
  }
  getSQLType() {
    return "blob";
  }
}
function blob(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (config?.mode === "json") {
    return new SQLiteBlobJsonBuilder(name);
  }
  if (config?.mode === "bigint") {
    return new SQLiteBigIntBuilder(name);
  }
  return new SQLiteBlobBufferBuilder(name);
}

// ../node_modules/drizzle-orm/sqlite-core/columns/custom.js
class SQLiteCustomColumnBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteCustomColumnBuilder";
  constructor(name, fieldConfig, customTypeParams) {
    super(name, "custom", "SQLiteCustomColumn");
    this.config.fieldConfig = fieldConfig;
    this.config.customTypeParams = customTypeParams;
  }
  build(table) {
    return new SQLiteCustomColumn(table, this.config);
  }
}

class SQLiteCustomColumn extends SQLiteColumn {
  static [entityKind] = "SQLiteCustomColumn";
  sqlName;
  mapTo;
  mapFrom;
  constructor(table, config) {
    super(table, config);
    this.sqlName = config.customTypeParams.dataType(config.fieldConfig);
    this.mapTo = config.customTypeParams.toDriver;
    this.mapFrom = config.customTypeParams.fromDriver;
  }
  getSQLType() {
    return this.sqlName;
  }
  mapFromDriverValue(value) {
    return typeof this.mapFrom === "function" ? this.mapFrom(value) : value;
  }
  mapToDriverValue(value) {
    return typeof this.mapTo === "function" ? this.mapTo(value) : value;
  }
}
function customType(customTypeParams) {
  return (a, b) => {
    const { name, config } = getColumnNameAndConfig(a, b);
    return new SQLiteCustomColumnBuilder(name, config, customTypeParams);
  };
}

// ../node_modules/drizzle-orm/sqlite-core/columns/integer.js
class SQLiteBaseIntegerBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteBaseIntegerBuilder";
  constructor(name, dataType, columnType) {
    super(name, dataType, columnType);
    this.config.autoIncrement = false;
  }
  primaryKey(config) {
    if (config?.autoIncrement) {
      this.config.autoIncrement = true;
    }
    this.config.hasDefault = true;
    return super.primaryKey();
  }
}

class SQLiteBaseInteger extends SQLiteColumn {
  static [entityKind] = "SQLiteBaseInteger";
  autoIncrement = this.config.autoIncrement;
  getSQLType() {
    return "integer";
  }
}

class SQLiteIntegerBuilder extends SQLiteBaseIntegerBuilder {
  static [entityKind] = "SQLiteIntegerBuilder";
  constructor(name) {
    super(name, "number", "SQLiteInteger");
  }
  build(table) {
    return new SQLiteInteger(table, this.config);
  }
}

class SQLiteInteger extends SQLiteBaseInteger {
  static [entityKind] = "SQLiteInteger";
}

class SQLiteTimestampBuilder extends SQLiteBaseIntegerBuilder {
  static [entityKind] = "SQLiteTimestampBuilder";
  constructor(name, mode) {
    super(name, "date", "SQLiteTimestamp");
    this.config.mode = mode;
  }
  defaultNow() {
    return this.default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`);
  }
  build(table) {
    return new SQLiteTimestamp(table, this.config);
  }
}

class SQLiteTimestamp extends SQLiteBaseInteger {
  static [entityKind] = "SQLiteTimestamp";
  mode = this.config.mode;
  mapFromDriverValue(value) {
    if (this.config.mode === "timestamp") {
      return new Date(value * 1000);
    }
    return new Date(value);
  }
  mapToDriverValue(value) {
    const unix = value.getTime();
    if (this.config.mode === "timestamp") {
      return Math.floor(unix / 1000);
    }
    return unix;
  }
}

class SQLiteBooleanBuilder extends SQLiteBaseIntegerBuilder {
  static [entityKind] = "SQLiteBooleanBuilder";
  constructor(name, mode) {
    super(name, "boolean", "SQLiteBoolean");
    this.config.mode = mode;
  }
  build(table) {
    return new SQLiteBoolean(table, this.config);
  }
}

class SQLiteBoolean extends SQLiteBaseInteger {
  static [entityKind] = "SQLiteBoolean";
  mode = this.config.mode;
  mapFromDriverValue(value) {
    return Number(value) === 1;
  }
  mapToDriverValue(value) {
    return value ? 1 : 0;
  }
}
function integer2(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (config?.mode === "timestamp" || config?.mode === "timestamp_ms") {
    return new SQLiteTimestampBuilder(name, config.mode);
  }
  if (config?.mode === "boolean") {
    return new SQLiteBooleanBuilder(name, config.mode);
  }
  return new SQLiteIntegerBuilder(name);
}

// ../node_modules/drizzle-orm/sqlite-core/columns/numeric.js
class SQLiteNumericBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteNumericBuilder";
  constructor(name) {
    super(name, "string", "SQLiteNumeric");
  }
  build(table) {
    return new SQLiteNumeric(table, this.config);
  }
}

class SQLiteNumeric extends SQLiteColumn {
  static [entityKind] = "SQLiteNumeric";
  mapFromDriverValue(value) {
    if (typeof value === "string")
      return value;
    return String(value);
  }
  getSQLType() {
    return "numeric";
  }
}

class SQLiteNumericNumberBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteNumericNumberBuilder";
  constructor(name) {
    super(name, "number", "SQLiteNumericNumber");
  }
  build(table) {
    return new SQLiteNumericNumber(table, this.config);
  }
}

class SQLiteNumericNumber extends SQLiteColumn {
  static [entityKind] = "SQLiteNumericNumber";
  mapFromDriverValue(value) {
    if (typeof value === "number")
      return value;
    return Number(value);
  }
  mapToDriverValue = String;
  getSQLType() {
    return "numeric";
  }
}

class SQLiteNumericBigIntBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteNumericBigIntBuilder";
  constructor(name) {
    super(name, "bigint", "SQLiteNumericBigInt");
  }
  build(table) {
    return new SQLiteNumericBigInt(table, this.config);
  }
}

class SQLiteNumericBigInt extends SQLiteColumn {
  static [entityKind] = "SQLiteNumericBigInt";
  mapFromDriverValue = BigInt;
  mapToDriverValue = String;
  getSQLType() {
    return "numeric";
  }
}
function numeric(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  const mode = config?.mode;
  return mode === "number" ? new SQLiteNumericNumberBuilder(name) : mode === "bigint" ? new SQLiteNumericBigIntBuilder(name) : new SQLiteNumericBuilder(name);
}

// ../node_modules/drizzle-orm/sqlite-core/columns/real.js
class SQLiteRealBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteRealBuilder";
  constructor(name) {
    super(name, "number", "SQLiteReal");
  }
  build(table) {
    return new SQLiteReal(table, this.config);
  }
}

class SQLiteReal extends SQLiteColumn {
  static [entityKind] = "SQLiteReal";
  getSQLType() {
    return "real";
  }
}
function real(name) {
  return new SQLiteRealBuilder(name ?? "");
}

// ../node_modules/drizzle-orm/sqlite-core/columns/text.js
class SQLiteTextBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteTextBuilder";
  constructor(name, config) {
    super(name, "string", "SQLiteText");
    this.config.enumValues = config.enum;
    this.config.length = config.length;
  }
  build(table) {
    return new SQLiteText(table, this.config);
  }
}

class SQLiteText extends SQLiteColumn {
  static [entityKind] = "SQLiteText";
  enumValues = this.config.enumValues;
  length = this.config.length;
  constructor(table, config) {
    super(table, config);
  }
  getSQLType() {
    return `text${this.config.length ? `(${this.config.length})` : ""}`;
  }
}

class SQLiteTextJsonBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteTextJsonBuilder";
  constructor(name) {
    super(name, "json", "SQLiteTextJson");
  }
  build(table) {
    return new SQLiteTextJson(table, this.config);
  }
}

class SQLiteTextJson extends SQLiteColumn {
  static [entityKind] = "SQLiteTextJson";
  getSQLType() {
    return "text";
  }
  mapFromDriverValue(value) {
    return JSON.parse(value);
  }
  mapToDriverValue(value) {
    return JSON.stringify(value);
  }
}
function text(a, b = {}) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (config.mode === "json") {
    return new SQLiteTextJsonBuilder(name);
  }
  return new SQLiteTextBuilder(name, config);
}

// ../node_modules/drizzle-orm/sqlite-core/columns/all.js
function getSQLiteColumnBuilders() {
  return {
    blob,
    customType,
    integer: integer2,
    numeric,
    real,
    text
  };
}

// ../node_modules/drizzle-orm/sqlite-core/table.js
var InlineForeignKeys = Symbol.for("drizzle:SQLiteInlineForeignKeys");

class SQLiteTable extends Table {
  static [entityKind] = "SQLiteTable";
  static Symbol = Object.assign({}, Table.Symbol, {
    InlineForeignKeys
  });
  [Table.Symbol.Columns];
  [InlineForeignKeys] = [];
  [Table.Symbol.ExtraConfigBuilder] = undefined;
}
function sqliteTableBase(name, columns, extraConfig, schema, baseName = name) {
  const rawTable = new SQLiteTable(name, schema, baseName);
  const parsedColumns = typeof columns === "function" ? columns(getSQLiteColumnBuilders()) : columns;
  const builtColumns = Object.fromEntries(Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
    const colBuilder = colBuilderBase;
    colBuilder.setName(name2);
    const column = colBuilder.build(rawTable);
    rawTable[InlineForeignKeys].push(...colBuilder.buildForeignKeys(column, rawTable));
    return [name2, column];
  }));
  const table = Object.assign(rawTable, builtColumns);
  table[Table.Symbol.Columns] = builtColumns;
  table[Table.Symbol.ExtraConfigColumns] = builtColumns;
  if (extraConfig) {
    table[SQLiteTable.Symbol.ExtraConfigBuilder] = extraConfig;
  }
  return table;
}
var sqliteTable = (name, columns, extraConfig) => {
  return sqliteTableBase(name, columns, extraConfig);
};

// ../node_modules/drizzle-orm/sqlite-core/indexes.js
class IndexBuilderOn {
  constructor(name, unique) {
    this.name = name;
    this.unique = unique;
  }
  static [entityKind] = "SQLiteIndexBuilderOn";
  on(...columns) {
    return new IndexBuilder(this.name, columns, this.unique);
  }
}

class IndexBuilder {
  static [entityKind] = "SQLiteIndexBuilder";
  config;
  constructor(name, columns, unique) {
    this.config = {
      name,
      columns,
      unique,
      where: undefined
    };
  }
  where(condition) {
    this.config.where = condition;
    return this;
  }
  build(table) {
    return new Index(this.config, table);
  }
}

class Index {
  static [entityKind] = "SQLiteIndex";
  config;
  constructor(config, table) {
    this.config = { ...config, table };
  }
}
function uniqueIndex(name) {
  return new IndexBuilderOn(name, true);
}

// src/schema.ts
var profile = sqliteTable("profile", {
  id: integer2("id").primaryKey().default(1),
  identity: text("identity", { mode: "json" }).notNull().default({}),
  workAuth: text("work_auth", { mode: "json" }).notNull().default({}),
  roleTypes: text("role_types", { mode: "json" }).notNull().default([]),
  locations: text("locations", { mode: "json" }).notNull().default([]),
  targeting: text("targeting", { mode: "json" }).notNull().default({}),
  comp: text("comp", { mode: "json" }).notNull().default({}),
  startDate: text("start_date"),
  answers: text("answers", { mode: "json" }).notNull().default({}),
  caps: text("caps", { mode: "json" }).notNull().default({}),
  replyTiers: text("reply_tiers", { mode: "json" }).notNull().default({}),
  updatedAt: integer2("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date)
});
var resumeVariants = sqliteTable("resume_variants", {
  variantId: text("variant_id").primaryKey(),
  path: text("path").notNull(),
  sha256: text("sha256").notNull(),
  roleFamily: text("role_family").notNull(),
  industryTags: text("industry_tags", { mode: "json" }).notNull().default([]),
  yearsMatrix: text("years_matrix", { mode: "json" }).notNull().default({}),
  keywordVector: text("keyword_vector", { mode: "json" }).notNull().default({}),
  timesPicked: integer2("times_picked").notNull().default(0),
  approvalRate: real("approval_rate").notNull().default(0),
  lastPickedAt: integer2("last_picked_at", { mode: "timestamp_ms" })
});
var campaigns = sqliteTable("campaigns", {
  campaignId: text("campaign_id").primaryKey(),
  type: text("type").notNull(),
  cadence: text("cadence").notNull(),
  capPerRun: integer2("cap_per_run").notNull(),
  capPerDay: integer2("cap_per_day").notNull(),
  gates: text("gates", { mode: "json" }).notNull().default({}),
  sources: text("sources", { mode: "json" }).notNull().default([]),
  cronId: text("cron_id")
});
var postings = sqliteTable("postings", {
  postingId: text("posting_id").primaryKey(),
  company: text("company").notNull(),
  companyNorm: text("company_norm").notNull(),
  role: text("role").notNull(),
  roleNorm: text("role_norm").notNull(),
  url: text("url").notNull(),
  source: text("source").notNull(),
  jdPath: text("jd_path"),
  jdHash: text("jd_hash"),
  firstSeen: integer2("first_seen", { mode: "timestamp_ms" }).notNull(),
  lastSeen: integer2("last_seen", { mode: "timestamp_ms" }).notNull()
}, (t) => [uniqueIndex("postings_company_role_unique").on(t.companyNorm, t.roleNorm)]);
var applications = sqliteTable("applications", {
  appId: text("app_id").primaryKey(),
  postingId: text("posting_id").notNull(),
  companyNorm: text("company_norm").notNull(),
  roleNorm: text("role_norm").notNull(),
  state: text("state").notNull().default("discovered"),
  campaignId: text("campaign_id").notNull(),
  runId: text("run_id"),
  variantId: text("variant_id"),
  resumePath: text("resume_path"),
  resumeHash: text("resume_hash"),
  screenshotPath: text("screenshot_path"),
  confirmation: text("confirmation"),
  confirmationPath: text("confirmation_path"),
  intentId: text("intent_id"),
  evidencePath: text("evidence_path"),
  blocker: text("blocker"),
  outcome: text("outcome"),
  createdAt: integer2("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date),
  updatedAt: integer2("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date),
  submittedAt: integer2("submitted_at", { mode: "timestamp_ms" }),
  kitVersion: text("kit_version")
}, (t) => [uniqueIndex("applications_company_role_unique").on(t.companyNorm, t.roleNorm)]);
var reviews = sqliteTable("reviews", {
  id: integer2("id").primaryKey({ autoIncrement: true }),
  jdHash: text("jd_hash").notNull(),
  resumeHash: text("resume_hash").notNull(),
  verdict: text("verdict").notNull(),
  notes: text("notes"),
  reviewerVersion: text("reviewer_version").notNull(),
  decidedAt: integer2("decided_at", { mode: "timestamp_ms" }).notNull()
}, (t) => [uniqueIndex("reviews_jd_resume_unique").on(t.jdHash, t.resumeHash)]);
var runs = sqliteTable("runs", {
  runId: text("run_id").primaryKey(),
  campaignId: text("campaign_id").notNull(),
  kitVersion: text("kit_version"),
  started: integer2("started", { mode: "timestamp_ms" }).notNull(),
  ended: integer2("ended", { mode: "timestamp_ms" }),
  status: text("status").notNull(),
  counts: text("counts", { mode: "json" }).notNull().default({}),
  tokens: text("tokens", { mode: "json" }).notNull().default({}),
  tokensInput: integer2("tokens_input").notNull().default(0),
  tokensOutput: integer2("tokens_output").notNull().default(0),
  tokensTotal: integer2("tokens_total").notNull().default(0),
  tokensReported: integer2("tokens_reported", { mode: "boolean" }).notNull().default(false),
  needsMe: integer2("needs_me", { mode: "boolean" }).notNull().default(false),
  compiledConfig: text("compiled_config", { mode: "json" }).notNull().default({}),
  liveConfig: text("live_config", { mode: "json" }).notNull().default({}),
  blocker: text("blocker")
});
var events = sqliteTable("events", {
  id: integer2("id").primaryKey({ autoIncrement: true }),
  runId: text("run_id"),
  appId: text("app_id"),
  type: text("type").notNull(),
  payload: text("payload", { mode: "json" }).notNull().default({}),
  at: integer2("at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date)
});
var approvals = sqliteTable("approvals", {
  approvalId: text("approval_id").primaryKey(),
  kind: text("kind").notNull(),
  appId: text("app_id"),
  question: text("question").notNull(),
  options: text("options", { mode: "json" }).notNull().default([]),
  judgedBy: text("judged_by"),
  createdAt: integer2("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date),
  resolvedAt: integer2("resolved_at", { mode: "timestamp_ms" }),
  answer: text("answer")
});
var h1bSponsors = sqliteTable("h1b_sponsors", {
  companyNorm: text("company_norm").primaryKey(),
  statsByYear: text("stats_by_year", { mode: "json" }).notNull().default({}),
  lcaCount: integer2("lca_count").notNull().default(0),
  lastRefreshed: integer2("last_refreshed", { mode: "timestamp_ms" }).notNull()
});
var companies = sqliteTable("companies", {
  companyNorm: text("company_norm").primaryKey(),
  tier: integer2("tier").notNull().default(3),
  industry: text("industry"),
  hqState: text("hq_state"),
  careersUrl: text("careers_url"),
  atsType: text("ats_type"),
  parkCount: integer2("park_count").notNull().default(0),
  skipFlag: integer2("skip_flag", { mode: "boolean" }).notNull().default(false),
  skipReason: text("skip_reason")
});
var contacts = sqliteTable("contacts", {
  contactId: text("contact_id").primaryKey(),
  name: text("name").notNull(),
  pageUrl: text("page_url"),
  companyNorm: text("company_norm")
});
var conversations = sqliteTable("conversations", {
  threadId: text("thread_id").primaryKey(),
  channel: text("channel").notNull(),
  contactId: text("contact_id"),
  appId: text("app_id"),
  classification: text("classification"),
  state: text("state").notNull(),
  watermark: text("watermark"),
  updatedAt: integer2("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date)
});
var replies = sqliteTable("replies", {
  replyId: text("reply_id").primaryKey(),
  threadId: text("thread_id").notNull(),
  direction: text("direction").notNull(),
  action: text("action", { enum: ["sent", "held", "auto_sent", "skipped"] }).notNull(),
  ruleId: text("rule_id"),
  draftPath: text("draft_path"),
  reason: text("reason"),
  runId: text("run_id"),
  approvalId: text("approval_id"),
  attachmentName: text("attachment_name"),
  at: integer2("at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date)
});
var tokenUsage = sqliteTable("token_usage", {
  runId: text("run_id").primaryKey(),
  date: text("date").notNull(),
  campaignId: text("campaign_id").notNull(),
  inputTokens: integer2("input_tokens").notNull(),
  outputTokens: integer2("output_tokens").notNull(),
  totalTokens: integer2("total_tokens").notNull(),
  stages: text("stages", { mode: "json" }).notNull().default({})
});
var purgeStage = sqliteTable("purge_stage", {
  batchId: text("batch_id").notNull(),
  tableName: text("table_name").notNull(),
  rowId: text("row_id").notNull()
}, (t) => [uniqueIndex("purge_stage_batch_table_row_unique").on(t.batchId, t.tableName, t.rowId)]);
var purgeGuard = sqliteTable("purge_guard", {
  batchId: text("batch_id").primaryKey(),
  offenderCount: integer2("offender_count").notNull()
});

// src/actions.ts
var jsonValue = unknown();
var emptyRequest = object({});
var okResponse = object({ ok: boolean2(), message: string2().optional() });
var now = () => new Date;
var iso = (d) => d ? d.toISOString() : null;
var norm = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
var id = (prefix) => `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
var countNumber = (value) => Number(value ?? 0);
var chicagoDay = (date = new Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
var jsonObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
var jsonArray = (value) => Array.isArray(value) ? value : [];
var postingRow = object({
  posting_id: string2().min(1),
  company: string2().min(1),
  role: string2().min(1),
  url: string2().min(1),
  source: string2().min(1),
  jd_path: string2().nullable().optional(),
  jd_hash: string2().nullable().optional(),
  first_seen: string2().datetime().optional(),
  last_seen: string2().datetime().optional()
});
var profilePayload = object({
  identity: jsonValue,
  work_auth: jsonValue,
  role_types: jsonValue,
  locations: jsonValue,
  targeting: jsonValue,
  comp: jsonValue,
  start_date: string2().nullable(),
  answers: jsonValue,
  caps: jsonValue,
  reply_tiers: jsonValue
});
var campaignPayload = record(string2().min(1), object({
  cadence: string2().min(1),
  type: string2().min(1).optional(),
  group: string2().min(1).optional(),
  gates: jsonValue.optional(),
  sources: array(jsonValue).optional(),
  cron_id: string2().nullable().optional()
}));
var profilePutPayload = profilePayload.extend({ campaigns: campaignPayload.optional() }).superRefine((value, ctx) => {
  if (!value.campaigns || Object.keys(value.campaigns).length === 0)
    return;
  const caps = jsonObject(value.caps);
  const perRun = Number(caps.per_run);
  const perDay = Number(caps.per_day);
  if (!Number.isInteger(perRun) || perRun < 1)
    ctx.addIssue({ code: ZodIssueCode.custom, path: ["caps", "per_run"], message: "A positive integer is required when campaigns are provided." });
  if (!Number.isInteger(perDay) || perDay < 1)
    ctx.addIssue({ code: ZodIssueCode.custom, path: ["caps", "per_day"], message: "A positive integer is required when campaigns are provided." });
});
var workStatus = _enum(["H-1B", "H1B", "US citizen", "Green card", "OPT", "STEM OPT", "TN", "EAD"]);
var roleType = _enum(["full_time", "part_time", "w2_contract", "c2c_contract", "internship"]);
var seniority = _enum(["junior", "mid", "senior", "staff", "architect", "principal", "lead", "director"]);
var answerValue = union([string2(), number2(), boolean2(), _null3()]);
var placeholderPattern = /\[FILL IN\]/i;
var bracketPlaceholderPattern = /^\[.*\]$/;
var isPlaceholderString = (value) => placeholderPattern.test(value.trim()) || bracketPlaceholderPattern.test(value.trim());
var strictProfile = object({
  identity: object({ name: string2().trim().min(1), email: string2().email(), phone: string2().trim().min(1), location: string2().trim().min(1), linkedin: string2().url(), timezone: string2().trim().min(1) }).catchall(jsonValue),
  work_auth: object({ status: workStatus, sponsor_required: boolean2(), h1b_gate: _enum(["hard", "soft"]) }).catchall(jsonValue),
  role_types: array(roleType).min(1, "Select at least one employment type."),
  locations: object({ priority: array(string2().trim().min(1)).min(1), relocation: string2().trim().min(1) }).catchall(jsonValue),
  targeting: object({ industries: array(string2().trim().min(1)).min(1), seniority: array(seniority).min(1), tiers: array(number2().int().min(1).max(3)).min(1), titles: array(string2().trim().min(1)).min(1) }).catchall(jsonValue),
  comp: object({ floor: union([number2().nonnegative(), string2().trim().min(1), _null3()]), note: string2().trim().min(1) }).catchall(jsonValue),
  start_date: string2().regex(/^\d{4}-\d{2}-\d{2}$/),
  answers: object({ relocate: string2().trim().min(1), covenants: string2().trim().min(1), drivers_license: string2().trim().min(1), degree_dates: string2().trim().min(1), home_zip: string2().trim().min(1), work_authorized_us: string2().trim().min(1) }).catchall(answerValue),
  caps: object({ per_run: number2().int().min(1), per_day: number2().int().min(1), appliers: number2().int().min(1) }).catchall(jsonValue),
  reply_tiers: object({ auto_send: array(string2().regex(/^R[1-8]$/)).min(1), draft_for_review: array(string2().trim().min(1)).min(1), never: array(string2().trim().min(1)).min(1) }).catchall(jsonValue)
}).superRefine((value, ctx) => {
  const requiredStrings = [
    ...Object.entries(value.identity).filter(([key]) => ["name", "email", "phone", "location", "linkedin", "timezone"].includes(key)).map(([key, text]) => ({ path: ["identity", key], value: String(text) })),
    { path: ["work_auth", "status"], value: value.work_auth.status },
    { path: ["work_auth", "h1b_gate"], value: value.work_auth.h1b_gate },
    ...value.locations.priority.map((text, index) => ({ path: ["locations", "priority", index], value: text })),
    { path: ["locations", "relocation"], value: value.locations.relocation },
    ...value.targeting.industries.map((text, index) => ({ path: ["targeting", "industries", index], value: text })),
    ...value.targeting.titles.map((text, index) => ({ path: ["targeting", "titles", index], value: text })),
    ...typeof value.comp.floor === "string" ? [{ path: ["comp", "floor"], value: value.comp.floor }] : [],
    { path: ["comp", "note"], value: value.comp.note },
    { path: ["start_date"], value: value.start_date },
    ...["relocate", "covenants", "drivers_license", "degree_dates", "home_zip", "work_authorized_us"].map((key) => ({ path: ["answers", key], value: String(value.answers[key] ?? "") })),
    ...value.reply_tiers.auto_send.map((text, index) => ({ path: ["reply_tiers", "auto_send", index], value: text })),
    ...value.reply_tiers.draft_for_review.map((text, index) => ({ path: ["reply_tiers", "draft_for_review", index], value: text })),
    ...value.reply_tiers.never.map((text, index) => ({ path: ["reply_tiers", "never", index], value: text }))
  ];
  for (const field of requiredStrings) {
    if (isPlaceholderString(field.value))
      ctx.addIssue({ code: ZodIssueCode.custom, path: field.path, message: "Replace the placeholder with the real value." });
  }
});
var yamlProfileSchema = object({
  identity: object({ name: string2().min(1), email: string2().email(), phone: string2().min(1), city: string2().min(1), state: string2().min(1), linkedin_url: string2().url() }),
  work_auth: object({ status: workStatus, sponsor_required: boolean2(), h1b_gate: _enum(["hard", "soft"]) }),
  role_types: array(roleType).min(1, "Select at least one employment type."),
  locations: object({ us_only: boolean2(), remote: _enum(["ok", "only", "no"]), metros: array(string2()).optional() }),
  targeting: object({ tiers: array(number2().int().min(1).max(3)), industries: array(string2()).min(1), seniority: array(seniority).min(1), titles: array(string2()).min(1) }),
  comp: object({ floor: union([number2(), string2(), _null3()]), negotiable_answer: string2().min(1), zero_ok: boolean2() }),
  start_date: string2().regex(/^\d{4}-\d{2}-\d{2}$/),
  answers: object({ relocate: string2(), restrictive_covenants: string2(), drivers_license: string2(), degree_dates: string2() }).catchall(answerValue),
  caps: object({ per_run: number2().int().min(1), per_day: number2().int().min(1), appliers: number2().int().min(1), linkedin_actions_per_hour: number2().int().min(1) }),
  reply_tiers: object({ auto_send: array(string2().regex(/^R[1-8]$/)).min(1), draft_for_review: array(string2()).min(1), never: array(string2()).min(1) }),
  resumes: object({ dir: string2().min(1), filename_rule: string2().min(1) }),
  campaigns: record(string2(), object({ cadence: string2().min(1), enabled: boolean2().optional() }).catchall(unknown()))
});
var q = (value) => JSON.stringify(value);
var yamlList = (values) => `[${values.map((value) => typeof value === "number" ? String(value) : q(value)).join(", ")}]`;
var rootSection = (text, name) => {
  const lines = text.split(`
`);
  const start = lines.findIndex((line) => line.startsWith(`${name}:`));
  if (start < 0)
    return null;
  let end = lines.length;
  for (let index = start + 1;index < lines.length; index += 1) {
    if (/^[A-Za-z_][A-Za-z0-9_-]*:/.test(lines[index] ?? "")) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join(`
`).trimEnd();
};
var headerBlock = (text) => {
  const first = text.match(/^[A-Za-z_][A-Za-z0-9_-]*:/m);
  return first && first.index !== undefined ? text.slice(0, first.index).trimEnd() : "";
};
function splitLocation(location) {
  const match = location.trim().match(/^(.+?),\s*([A-Za-z]{2})$/);
  return match && match[1] && match[2] ? { city: match[1].trim(), state: match[2].toUpperCase() } : null;
}
function deriveYamlLocations(locations, previous) {
  const values = locations.priority.map((entry) => entry.trim()).filter(Boolean);
  const remote = values.filter((entry) => /(^|[\s_-])remote([\s_-]|$)/i.test(entry));
  const generic = values.filter((entry) => /^(u\.?s\.?|united states|us[- ]wide(?: onsite)?|nationwide|anywhere in (?:the )?us)$/i.test(entry));
  const metro = values.filter((entry) => !remote.includes(entry) && !generic.includes(entry) && /^[A-Za-z .'-]+(?:,\s*[A-Z]{2})?$/.test(entry));
  const recognized = remote.length + generic.length + metro.length === values.length;
  if (!recognized || values.length === 0) {
    return {
      block: previous ?? `locations:
  us_only: true
  remote: no
  metros: []`,
      warning: { field: "locations.priority", message: "One or more priority entries could not be mapped safely, so the previous YAML locations block was kept." }
    };
  }
  const onlyRemote = remote.length > 0 && remote.length === values.length;
  const remoteValue = onlyRemote ? "only" : remote.length > 0 ? "ok" : "no";
  const outsideUs = /international|outside (?:the )?us|worldwide|global/i.test(locations.relocation);
  const metroNames = metro.map((entry) => entry.replace(/,\s*[A-Z]{2}$/, ""));
  return { block: `locations:
  us_only: ${outsideUs ? "false" : "true"}
  remote: ${q(remoteValue)}
  metros: ${yamlList(metroNames)}` };
}
function renderProfileYaml(profile2, existing, existingParsed) {
  const place = splitLocation(profile2.identity.location);
  if (!place)
    throw new Error("identity.location must use the format City, ST.");
  const previousComp = jsonObject(existingParsed.comp);
  const previousCaps = jsonObject(existingParsed.caps);
  const zeroOk = typeof previousComp.zero_ok === "boolean" ? previousComp.zero_ok : true;
  const linkedInActions = Number(profile2.caps.linkedin_actions_per_hour ?? previousCaps.linkedin_actions_per_hour);
  if (!Number.isInteger(linkedInActions) || linkedInActions < 1)
    throw new Error("caps.linkedin_actions_per_hour is missing or invalid in both the profile and existing YAML.");
  const resumes = rootSection(existing, "resumes");
  const campaigns2 = rootSection(existing, "campaigns");
  if (!resumes)
    throw new Error("resumes section is missing from the existing YAML.");
  if (!campaigns2)
    throw new Error("campaigns section is missing from the existing YAML.");
  const locations = deriveYamlLocations(profile2.locations, rootSection(existing, "locations"));
  const answerLines = Object.entries(profile2.answers).map(([key, value]) => {
    const yamlKey = key === "covenants" ? "restrictive_covenants" : key;
    const scalar = value === null ? "null" : typeof value === "boolean" || typeof value === "number" ? String(value) : q(String(value));
    return `  ${yamlKey}: ${scalar}`;
  });
  const floor = profile2.comp.floor === null ? "null" : typeof profile2.comp.floor === "number" ? String(profile2.comp.floor) : q(profile2.comp.floor);
  const header = headerBlock(existing);
  const body = [
    "identity:",
    `  name: ${q(profile2.identity.name)}`,
    `  email: ${q(profile2.identity.email)}`,
    `  phone: ${q(profile2.identity.phone)}`,
    `  city: ${q(place.city)}`,
    `  state: ${q(place.state)}`,
    `  linkedin_url: ${q(profile2.identity.linkedin)}`,
    "",
    "work_auth:",
    `  status: ${q(profile2.work_auth.status)}`,
    `  sponsor_required: ${profile2.work_auth.sponsor_required}`,
    `  h1b_gate: ${q(profile2.work_auth.h1b_gate)}`,
    "",
    `role_types: ${yamlList(profile2.role_types)}`,
    "",
    locations.block,
    "",
    "targeting:",
    `  tiers: ${yamlList(profile2.targeting.tiers)}`,
    `  industries: ${yamlList(profile2.targeting.industries)}`,
    `  seniority: ${yamlList(profile2.targeting.seniority)}`,
    `  titles: ${yamlList(profile2.targeting.titles)}`,
    "",
    "comp:",
    `  floor: ${floor}`,
    `  negotiable_answer: ${q(profile2.comp.note)}`,
    `  zero_ok: ${zeroOk}`,
    "",
    `start_date: ${q(profile2.start_date)}`,
    "",
    "answers:",
    ...answerLines,
    "",
    "caps:",
    `  per_run: ${profile2.caps.per_run}`,
    `  per_day: ${profile2.caps.per_day}`,
    `  appliers: ${profile2.caps.appliers}`,
    `  linkedin_actions_per_hour: ${linkedInActions}`,
    "",
    "reply_tiers:",
    `  auto_send: ${yamlList(profile2.reply_tiers.auto_send)}`,
    `  draft_for_review: ${yamlList(profile2.reply_tiers.draft_for_review)}`,
    `  never: ${yamlList(profile2.reply_tiers.never)}`,
    "",
    resumes,
    "",
    campaigns2
  ].join(`
`);
  return { text: `${header ? `${header}

` : ""}${body.trim()}
`, warnings: locations.warning ? [locations.warning] : [] };
}
async function putProfileRow(ctx, args) {
  const updated = now();
  await ctx.db().insert(profile).values({ id: 1, identity: args.identity, workAuth: args.work_auth, roleTypes: args.role_types, locations: args.locations, targeting: args.targeting, comp: args.comp, startDate: args.start_date, answers: args.answers, caps: args.caps, replyTiers: args.reply_tiers, updatedAt: updated }).onConflictDoUpdate({ target: profile.id, set: { identity: args.identity, workAuth: args.work_auth, roleTypes: args.role_types, locations: args.locations, targeting: args.targeting, comp: args.comp, startDate: args.start_date, answers: args.answers, caps: args.caps, replyTiers: args.reply_tiers, updatedAt: updated } });
  ctx.invalidateQueries();
  return updated.toISOString();
}
var profileSaveResponse = union([
  object({ ok: literal(true), updated_at: string2(), yaml_bytes: number2(), warnings: array(object({ field: string2(), message: string2() })) }),
  object({ ok: literal(false), step: _enum(["validation", "yaml_write", "database"]), field: string2().optional(), message: string2() })
]);
var manifestJobSchema = object({
  job_id: string2().min(1),
  title: string2().min(1),
  campaign: string2().min(1),
  cadence: string2().min(1),
  schedule: string2().min(1),
  enabled: boolean2(),
  body_hash: string2().min(1)
});
var schedulesManifestSchema = object({ jobs: array(manifestJobSchema) });
var scheduleStatusRowSchema = manifestJobSchema.extend({
  manifest_body_hash: string2(),
  last_run_at: string2().nullable(),
  last_run_status: string2().nullable(),
  live_body_hash: string2().nullable(),
  drift: _enum(["in_sync", "drift", "unknown"])
});
var schedulesStatusResponse = object({
  generated_at: string2(),
  manifest_missing: boolean2(),
  rows: array(scheduleStatusRowSchema)
});
var SCHEDULE_CAMPAIGNS = ["morning_run", "linkedin_feed", "career_portal", "job_board", "email_scan", "linkedin_replies", "approval_judge", "daily_report", "token_usage", "weekly_review", "harness_doctor", "profile_watch"];
var scheduleJobId = (campaign) => `harness-${campaign.replace(/_/g, "-")}`;
function jobIdToCampaign(jobId) {
  if (!jobId.startsWith("harness-"))
    return null;
  const campaign = jobId.slice("harness-".length).replace(/-/g, "_");
  return SCHEDULE_CAMPAIGNS.includes(campaign) ? campaign : null;
}
var CADENCE_ACCEPTED = 'Accepted cadence formats: "daily HH:MM" (e.g. "daily 07:00"), "nightly HH:MM" (e.g. "nightly 23:20"), "hourly", "hourly weekdays", "every Nm" (e.g. "every 15m"), "every Nh" (e.g. "every 2h"), "Nh weekdays" (e.g. "2h weekdays"), "H:MMam/pm CT" (e.g. "9:00am CT"), "Weekday H:MMam/pm CT" (e.g. "Friday 5:00pm CT").';
function cadenceError(value) {
  const text = value.trim();
  if (!text)
    return `Cadence must not be empty. ${CADENCE_ACCEPTED}`;
  const weekday = "(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)";
  const patterns = [
    /^(?:daily|nightly) (?:[01][0-9]|2[0-3]):[0-5][0-9]$/,
    /^hourly$/,
    /^hourly weekdays$/,
    /^every [1-9][0-9]*(?:m|h)$/,
    /^[1-9][0-9]*h weekdays$/,
    /^(?:[1-9]|1[0-2]):[0-5][0-9](?:am|pm) CT$/,
    new RegExp(`^${weekday} (?:[1-9]|1[0-2]):[0-5][0-9](?:am|pm) CT$`, "i")
  ];
  if (patterns.some((pattern) => pattern.test(text)))
    return null;
  return `Cadence ${q(text)} is not a recognized schedule. ${CADENCE_ACCEPTED}`;
}
function campaignEntryLine(campaign, fields) {
  const keys = ["cadence", "enabled", ...Object.keys(fields).filter((key) => key !== "cadence" && key !== "enabled")];
  const parts = [];
  for (const key of keys) {
    const value = fields[key];
    if (value === undefined)
      continue;
    if (key === "enabled" && value === true)
      continue;
    parts.push(`${key}: ${value === null ? "null" : typeof value === "boolean" || typeof value === "number" ? String(value) : q(String(value))}`);
  }
  return `  ${campaign}: {${parts.join(", ")}}`;
}
function spliceCampaignEntry(yamlText, campaign, line) {
  const lines = yamlText.split(`
`);
  const start = lines.findIndex((text) => text === "campaigns:");
  if (start < 0)
    throw new Error("The campaigns section is missing from profile.yaml.");
  let end = lines.length;
  for (let index = start + 1;index < lines.length; index += 1) {
    if (/^[A-Za-z_][A-Za-z0-9_-]*:/.test(lines[index] ?? "")) {
      end = index;
      break;
    }
  }
  const section = lines.slice(start + 1, end);
  const flowRe = new RegExp(`^\\s*${campaign}:\\s*\\{[^}]*\\}\\s*(?:#.*)?$`);
  const headRe = new RegExp(`^\\s*${campaign}:\\s*(?:#.*)?$`);
  const before = lines.slice(0, start + 1);
  const after = lines.slice(end);
  for (let index = 0;index < section.length; index += 1) {
    const text = section[index] ?? "";
    if (flowRe.test(text)) {
      const indent = text.match(/^\s*/)?.[0] ?? "  ";
      return [...before, ...section.slice(0, index), `${indent}${line.trimStart()}`, ...section.slice(index + 1), ...after].join(`
`);
    }
    const head = text.match(headRe);
    if (head) {
      const indent = text.match(/^\s*/)?.[0] ?? "";
      let stop = index + 1;
      while (stop < section.length) {
        const next = section[stop] ?? "";
        if (next.trim() === "") {
          stop += 1;
          continue;
        }
        if (next.length > indent.length && next.startsWith(indent) && /^\s/.test(next.slice(indent.length))) {
          stop += 1;
          continue;
        }
        break;
      }
      return [...before, ...section.slice(0, index), `${indent}${line.trimStart()}`, ...section.slice(stop), ...after].join(`
`);
    }
  }
  let insertAt = section.length;
  while (insertAt > 0 && (section[insertAt - 1] ?? "").trim() === "")
    insertAt -= 1;
  return [...before, ...section.slice(0, insertAt), line, ...section.slice(insertAt), ...after].join(`
`);
}
var scheduleUpdateResponse = union([
  object({ ok: literal(true), job_id: string2(), campaign: string2(), cadence: string2(), enabled: boolean2(), note: string2() }),
  object({ ok: literal(false), error: string2() })
]);
var hashPattern = /^[a-f0-9]{64}$/i;
function findBodyHash(value, depth = 0) {
  if (depth > 4 || !value || typeof value !== "object")
    return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findBodyHash(item, depth + 1);
      if (found)
        return found;
    }
    return null;
  }
  const record2 = value;
  for (const key of ["body_hash", "bodyHash"]) {
    const candidate = record2[key];
    if (typeof candidate === "string" && hashPattern.test(candidate))
      return candidate.toLowerCase();
  }
  for (const nested of Object.values(record2)) {
    const found = findBodyHash(nested, depth + 1);
    if (found)
      return found;
  }
  return null;
}
var LEGAL = {
  discovered: ["screened", "rejected"],
  screened: ["resume_picked"],
  resume_picked: ["tailored"],
  tailored: ["reviewed", "parked"],
  reviewed: ["applying"],
  applying: ["submitted", "blocked", "parked", "needs_me"],
  submitted: ["confirmed"],
  needs_me: ["reviewed"],
  parked: ["reviewed"],
  blocked: ["discovered"]
};
var STATE_EDGE_DOCS = Object.entries(LEGAL).flatMap(([from, destinations]) => destinations.map((to) => ({
  from,
  to,
  gate: from === "reviewed" && to === "applying" ? "Requires intent_id" : from === "applying" && to === "submitted" ? "Requires evidence.resume_path and evidence.resume_hash" : from === "blocked" && to === "discovered" ? "Requires coordinator_correction=true, a matching coordinator_correction event_log id, and a reason" : "Standard transition"
})));
var purgeCounts = object({
  applications: number2(),
  resumes: number2(),
  runs: number2(),
  profiles: number2(),
  approvals: number2(),
  reviews: number2(),
  conversations: number2(),
  replies: number2(),
  token_usage: number2()
});
var purgeIds = object({
  applications: array(string2()),
  resumes: array(string2()),
  runs: array(string2()),
  profiles: array(number2()),
  approvals: array(string2()),
  reviews: array(number2()),
  conversations: array(string2()),
  replies: array(string2()),
  token_usage: array(string2())
});
var purgeResponse = union([
  object({ ok: literal(true), purged: purgeCounts, ids: purgeIds }),
  object({ ok: literal(false), error: string2(), offending_ids: array(string2()).optional() })
]);
var sha256Hex = string2().regex(/^[a-f0-9]{64}$/i, "resume_hash must be a full 64-character SHA-256 hex value.");
var submissionEvidenceSchema = object({
  resume_path: string2().trim().min(1),
  resume_hash: sha256Hex,
  variant_id: string2().trim().min(1).nullable().optional(),
  screenshot_path: string2().trim().min(1).nullable().optional(),
  confirmation: string2().trim().min(1).nullable().optional(),
  confirmation_path: string2().trim().min(1).nullable().optional()
});
function parseSubmissionEvidence(value) {
  if (!value)
    return { error: "Submission evidence is required; missing resume_path and resume_hash." };
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { error: "Submission evidence must be JSON containing resume_path and resume_hash." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return { error: "Submission evidence must contain resume_path and resume_hash." };
  const record2 = parsed;
  const missing = [];
  if (typeof record2.resume_path !== "string" || !record2.resume_path.trim())
    missing.push("resume_path");
  if (typeof record2.resume_hash !== "string" || !record2.resume_hash.trim())
    missing.push("resume_hash");
  if (missing.length)
    return { error: `Submission evidence is missing ${missing.join(" and ")}.` };
  const checked = submissionEvidenceSchema.safeParse(record2);
  if (!checked.success)
    return { error: checked.error.issues[0]?.message ?? "Submission evidence is invalid." };
  return { data: checked.data };
}
function canonicalConfirmationPath(row) {
  const safe = (value) => value !== null && /^[A-Za-z0-9_-]+$/.test(value);
  if (!safe(row.campaignId) || !safe(row.runId) || !safe(row.appId) || row.runId === null)
    return null;
  return `goals/${row.campaignId}/hidden_files/${row.runId}/screenshots/${row.appId}_confirmation.txt`;
}
async function publishFilePayload(ctx, result) {
  const bytes = Buffer.from(result.bytesBase64, "base64");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const fingerprint = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
  const extension = result.filename.includes(".") ? result.filename.slice(result.filename.lastIndexOf(".")).toLowerCase() : "";
  const key = `dashboard-files/${fingerprint}${extension}`;
  await ctx.blobs.put(key, bytes, { contentType: result.contentType });
  return { filename: result.filename, file_url: await ctx.blobs.getUrl(key, { expiresInSeconds: 900 }), content_type: result.contentType };
}
async function publishFileWithPreview(ctx, result) {
  const published = await publishFilePayload(ctx, result);
  if (result.contentType !== "application/pdf")
    return { ...published, preview_pages: [], preview_truncated: false };
  try {
    const preview = await ctx.executePrivileged(privileged.renderPdfPreview, { bytesBase64: result.bytesBase64, maxPages: 8 });
    const previewPages = await Promise.all(preview.pages.map(async (page) => {
      const image = await publishFilePayload(ctx, { filename: `page-${page.page}.png`, bytesBase64: page.bytesBase64, contentType: "image/png" });
      return { page: page.page, file_url: image.file_url };
    }));
    return { ...published, preview_pages: previewPages, preview_truncated: preview.truncated };
  } catch {
    return { ...published, preview_pages: [], preview_truncated: false };
  }
}
function pathFilename(path) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? "";
}
function registeredResumeLocation(path) {
  const normalized = path.replaceAll("\\", "/").replace(/^\/home\/hatch\//, "");
  if (normalized.startsWith("workspace/user/files/resumes/"))
    return "user_file_resumes";
  if (normalized.startsWith("workspace/user/files/"))
    return "user_files";
  if (normalized.startsWith("workspace/resumes/"))
    return "workspace_resumes";
  return null;
}
function parseCorrectionEvidence(value) {
  if (!value)
    return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return null;
    const record2 = parsed;
    if (record2.coordinator_correction !== true || !Number.isInteger(record2.event_log_id) || Number(record2.event_log_id) < 1)
      return null;
    if (typeof record2.reason !== "string" || record2.reason.trim().length === 0)
      return null;
    return { coordinator_correction: true, event_log_id: Number(record2.event_log_id), reason: record2.reason };
  } catch {
    return null;
  }
}
var markerText = (value) => typeof value === "string" ? value : JSON.stringify(value) ?? "";
var hasSmokeMarker = (value) => /(^|[-_:/.\\\[\]\s])smoke($|[-_:/.\\\[\]\s])/i.test(markerText(value));
var hasSmokeTestLabel = (value) => markerText(value).toUpperCase().includes("[SMOKE TEST]");
var sqlSmokeMarker = (column) => sql`instr(
  ' ' || replace(replace(replace(replace(replace(replace(replace(replace(lower(coalesce(CAST(${column} AS TEXT), '')), '-', ' '), '_', ' '), ':', ' '), '/', ' '), char(92), ' '), '[', ' '), ']', ' '), '.', ' ') || ' ',
  ' smoke '
) > 0`;
function csvRows(csv) {
  const out = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0;i < csv.length; i += 1) {
    const c = csv[i] ?? "";
    if (c === '"' && quoted && csv[i + 1] === '"') {
      cell += '"';
      i += 1;
    } else if (c === '"')
      quoted = !quoted;
    else if (c === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((c === `
` || c === "\r") && !quoted) {
      if (c === "\r" && csv[i + 1] === `
`)
        i += 1;
      row.push(cell.trim());
      if (row.some(Boolean))
        out.push(row);
      row = [];
      cell = "";
    } else
      cell += c;
  }
  row.push(cell.trim());
  if (row.some(Boolean))
    out.push(row);
  return out;
}
function recordsFromCsv(csv) {
  const rows = csvRows(csv);
  const headers = (rows[0] ?? []).map((x) => norm(x).replaceAll(" ", "_"));
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""])));
}
var safeResumeFilenamePattern = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/i;
var safeResumeVariantPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
var resumeUploadResponse = union([
  object({ ok: literal(true), variant_id: string2(), path: string2(), filename: string2(), sha256: string2() }),
  object({ ok: literal(false), message: string2() })
]);
var resumeDeleteResponse = union([
  object({ ok: literal(true), variant_id: string2(), usage_count: number2(), trashed_path: string2().nullable(), file_moved: boolean2() }),
  object({ ok: literal(false), message: string2() })
]);
function decodeBase64(value) {
  const text = value.trim();
  if (!text || text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text))
    return null;
  try {
    const bytes = Buffer.from(text, "base64");
    const canonical = bytes.toString("base64");
    return canonical === text ? bytes : null;
  } catch {
    return null;
  }
}
function pdfBytes(bytes) {
  return bytes.length >= 5 && bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70 && bytes[4] === 45;
}
async function bytesSha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}
function profileYearsMatrix(row) {
  if (!row)
    return {};
  for (const section of [row.identity, row.workAuth, row.locations, row.targeting, row.comp, row.answers, row.caps, row.replyTiers]) {
    const candidate = jsonObject(section).years_matrix;
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate))
      return candidate;
  }
  return {};
}
var Actions = {
  profile_get: defineAction({
    request: emptyRequest,
    response: object({ profile: profilePayload.nullable(), updated_at: string2().nullable() }),
    async handler(ctx) {
      const row = (await ctx.db().select().from(profile).where(eq(profile.id, 1)).limit(1))[0];
      if (!row)
        return { profile: null, updated_at: null };
      return { profile: { identity: row.identity, work_auth: row.workAuth, role_types: row.roleTypes, locations: row.locations, targeting: row.targeting, comp: row.comp, start_date: row.startDate, answers: row.answers, caps: row.caps, reply_tiers: row.replyTiers }, updated_at: row.updatedAt.toISOString() };
    }
  }),
  profile_put: defineAction({
    request: profilePutPayload,
    response: object({ ok: literal(true), updated_at: string2() }),
    async handler(ctx, args) {
      const updatedAt = await putProfileRow(ctx, args);
      const db = ctx.db();
      const caps = jsonObject(args.caps);
      const capPerRun = Number(caps.per_run);
      const capPerDay = Number(caps.per_day);
      for (const [campaignId, campaign] of Object.entries(args.campaigns ?? {})) {
        const type = campaign.type ?? campaign.group ?? campaignId;
        await db.insert(campaigns).values({ campaignId, type, cadence: campaign.cadence, capPerRun, capPerDay, gates: campaign.gates ?? {}, sources: campaign.sources ?? [], cronId: campaign.cron_id ?? null }).onConflictDoUpdate({ target: campaigns.campaignId, set: { type, cadence: campaign.cadence, capPerRun, capPerDay, gates: campaign.gates ?? {}, sources: campaign.sources ?? [], cronId: campaign.cron_id ?? null } });
      }
      ctx.invalidateQueries();
      return { ok: true, updated_at: updatedAt };
    }
  }),
  profile_save: defineAction({
    request: profilePayload,
    response: profileSaveResponse,
    privileged: [privileged.readProfileYaml, privileged.parseProfileYaml, privileged.writeProfileYaml],
    async handler(ctx, args) {
      const checked = strictProfile.safeParse(args);
      if (!checked.success) {
        const issue = checked.error.issues[0];
        return { ok: false, step: "validation", field: issue?.path.join(".") || "profile", message: issue?.message ?? "The profile is invalid." };
      }
      let existingText;
      let existingParsed;
      try {
        const existing = await ctx.executePrivileged(privileged.readProfileYaml, {});
        existingText = existing.yamlText;
        const parsed = await ctx.executePrivileged(privileged.parseProfileYaml, { yamlText: existingText });
        existingParsed = jsonObject(parsed.parsed);
      } catch {
        return { ok: false, step: "validation", field: "profile.yaml", message: "The existing profile.yaml could not be read or parsed." };
      }
      let rendered;
      try {
        rendered = renderProfileYaml(checked.data, existingText, existingParsed);
        const reparsed = await ctx.executePrivileged(privileged.parseProfileYaml, { yamlText: rendered.text });
        const validated = yamlProfileSchema.safeParse(reparsed.parsed);
        if (!validated.success) {
          const issue = validated.error.issues[0];
          return { ok: false, step: "validation", field: issue?.path.join(".") || "profile.yaml", message: issue?.message ?? "The rendered YAML did not pass validation." };
        }
      } catch (error) {
        return { ok: false, step: "validation", field: "profile.yaml", message: error instanceof Error ? error.message : "The rendered YAML could not be validated." };
      }
      let bytes;
      try {
        const result = await ctx.executePrivileged(privileged.writeProfileYaml, { yaml_text: rendered.text });
        bytes = result.bytes_written;
      } catch {
        return { ok: false, step: "yaml_write", field: "profile.yaml", message: "The YAML file could not be written. The database was not changed." };
      }
      try {
        const updatedAt = await putProfileRow(ctx, checked.data);
        return { ok: true, updated_at: updatedAt, yaml_bytes: bytes, warnings: rendered.warnings };
      } catch {
        return { ok: false, step: "database", field: "profile", message: "profile.yaml was written, but the live database update failed. The next compile-schedules run will restore convergence." };
      }
    }
  }),
  posting_upsert: defineAction({
    request: object({ rows: array(postingRow).max(500) }),
    response: object({ new_ids: array(string2()), seen: number2() }),
    async handler(ctx, args) {
      const db = ctx.db();
      const newIds = [];
      for (const row of args.rows) {
        const companyNorm = norm(row.company);
        const roleNorm = norm(row.role);
        const existing = (await db.select({ id: postings.postingId }).from(postings).where(or(eq(postings.postingId, row.posting_id), and(eq(postings.companyNorm, companyNorm), eq(postings.roleNorm, roleNorm)))).limit(1))[0];
        const lastSeen = row.last_seen ? new Date(row.last_seen) : now();
        if (existing) {
          await db.update(postings).set({ company: row.company, role: row.role, url: row.url, source: row.source, jdPath: row.jd_path ?? null, jdHash: row.jd_hash ?? null, lastSeen }).where(eq(postings.postingId, existing.id));
        } else {
          await db.insert(postings).values({ postingId: row.posting_id, company: row.company, companyNorm, role: row.role, roleNorm, url: row.url, source: row.source, jdPath: row.jd_path ?? null, jdHash: row.jd_hash ?? null, firstSeen: row.first_seen ? new Date(row.first_seen) : lastSeen, lastSeen });
          newIds.push(row.posting_id);
        }
      }
      if (args.rows.length)
        ctx.invalidateQueries();
      return { new_ids: newIds, seen: args.rows.length };
    }
  }),
  app_claim: defineAction({
    request: object({ posting_id: string2(), campaign_id: string2() }),
    response: object({ ok: boolean2(), app_id: string2().optional(), reason: string2().optional() }),
    async handler(ctx, args) {
      const db = ctx.db();
      const appId = id("app");
      const created = Date.now();
      const day = chicagoDay();
      const openRun = (await db.select().from(runs).where(and(eq(runs.campaignId, args.campaign_id), eq(runs.status, "running"))).orderBy(desc(runs.started)).limit(1))[0];
      if (!openRun)
        return { ok: false, reason: "No open run exists for this campaign." };
      await db.run(sql`INSERT INTO applications (app_id, posting_id, company_norm, role_norm, state, campaign_id, run_id, created_at, updated_at, kit_version)
        SELECT ${appId}, p.posting_id, p.company_norm, p.role_norm, 'discovered', c.campaign_id, ${openRun.runId}, ${created}, ${created}, ${openRun.kitVersion}
        FROM postings p JOIN campaigns c ON c.campaign_id = ${args.campaign_id}
        WHERE p.posting_id = ${args.posting_id}
          AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.company_norm=p.company_norm AND a.role_norm=p.role_norm)
          AND (SELECT COUNT(*) FROM applications a WHERE a.run_id=${openRun.runId}) < c.cap_per_run
          AND (SELECT COUNT(*) FROM applications a WHERE a.campaign_id=c.campaign_id AND strftime('%Y-%m-%d', a.created_at/1000, 'unixepoch', '-5 hours')=${day}) < c.cap_per_day
        ON CONFLICT DO NOTHING`);
      const inserted = (await db.select({ appId: applications.appId }).from(applications).where(eq(applications.appId, appId)).limit(1))[0];
      if (!inserted) {
        const duplicate = (await db.select({ id: applications.appId }).from(applications).innerJoin(postings, and(eq(applications.companyNorm, postings.companyNorm), eq(applications.roleNorm, postings.roleNorm))).where(eq(postings.postingId, args.posting_id)).limit(1))[0];
        return { ok: false, reason: duplicate ? "Duplicate company and role." : "Campaign cap reached, or posting/campaign is unavailable." };
      }
      await db.insert(events).values({ runId: openRun.runId, appId, type: "application_claimed", payload: { posting_id: args.posting_id, campaign_id: args.campaign_id } });
      ctx.invalidateQueries();
      return { ok: true, app_id: appId };
    }
  }),
  evidence_attach: defineAction({
    request: object({
      app_id: string2().min(1),
      resume_path: string2().trim().min(1),
      resume_hash: sha256Hex,
      variant_id: string2().trim().min(1).optional(),
      screenshot_path: string2().trim().min(1).nullable().optional(),
      confirmation: string2().trim().min(1).optional()
    }),
    response: object({ ok: boolean2(), message: string2().optional(), confirmation_path: string2().nullable().optional() }),
    async handler(ctx, args) {
      const db = ctx.db();
      const row = (await db.select().from(applications).where(eq(applications.appId, args.app_id)).limit(1))[0];
      if (!row)
        return { ok: false, message: "Application not found." };
      const changed = now();
      const confirmationPath = args.confirmation ? canonicalConfirmationPath(row) : row.confirmationPath;
      await db.batch([
        db.update(applications).set({
          resumePath: args.resume_path,
          resumeHash: args.resume_hash.toLowerCase(),
          variantId: args.variant_id ?? row.variantId,
          screenshotPath: args.screenshot_path === undefined ? row.screenshotPath : args.screenshot_path,
          confirmation: args.confirmation ?? row.confirmation,
          confirmationPath,
          updatedAt: changed
        }).where(eq(applications.appId, args.app_id)),
        db.insert(events).values({
          runId: row.runId,
          appId: row.appId,
          type: "evidence_attached",
          payload: {
            resume_path: args.resume_path,
            resume_hash: args.resume_hash.toLowerCase(),
            variant_id: args.variant_id ?? row.variantId,
            screenshot_path: args.screenshot_path === undefined ? row.screenshotPath : args.screenshot_path,
            confirmation: args.confirmation ?? row.confirmation,
            confirmation_path: confirmationPath
          },
          at: changed
        })
      ]);
      ctx.invalidateQueries();
      return { ok: true, confirmation_path: confirmationPath };
    }
  }),
  app_transition: defineAction({
    request: object({ app_id: string2(), from: string2(), to: string2(), evidence: string2().nullable(), intent_id: string2().nullable().optional() }),
    response: okResponse,
    async handler(ctx, args) {
      const allowed = LEGAL[args.from] ?? [];
      if (!allowed.includes(args.to))
        return { ok: false, message: `Illegal transition: ${args.from} \u2192 ${args.to}.` };
      if (args.from === "reviewed" && args.to === "applying" && !args.intent_id)
        return { ok: false, message: "An intent_id is required before applying." };
      const submittedEvidence = args.to === "submitted" ? parseSubmissionEvidence(args.evidence) : null;
      if (submittedEvidence?.error)
        return { ok: false, message: submittedEvidence.error };
      const db = ctx.db();
      const row = (await db.select().from(applications).where(eq(applications.appId, args.app_id)).limit(1))[0];
      if (!row || row.state !== args.from)
        return { ok: false, message: row ? `Current state is ${row.state}, not ${args.from}.` : "Application not found." };
      if (args.from === "blocked" && args.to === "discovered") {
        const correction = parseCorrectionEvidence(args.evidence);
        if (!correction)
          return { ok: false, message: "Blocked \u2192 discovered requires JSON evidence with coordinator_correction=true, a valid event_log_id, and a reason." };
        const correctionEvent = (await db.select({ id: events.id, appId: events.appId, type: events.type }).from(events).where(eq(events.id, correction.event_log_id)).limit(1))[0];
        if (!correctionEvent || correctionEvent.type !== "coordinator_correction" || correctionEvent.appId !== row.appId)
          return { ok: false, message: "The event_log_id must reference a coordinator_correction event for this application." };
      }
      const changed = now();
      const evidence = submittedEvidence?.data;
      const confirmationPath = evidence?.confirmation ? evidence.confirmation_path ?? canonicalConfirmationPath(row) : evidence?.confirmation_path ?? row.confirmationPath;
      await db.batch([
        db.update(applications).set({
          state: args.to,
          evidencePath: args.evidence,
          intentId: args.intent_id ?? row.intentId,
          resumePath: evidence?.resume_path ?? row.resumePath,
          resumeHash: evidence?.resume_hash.toLowerCase() ?? row.resumeHash,
          variantId: evidence?.variant_id ?? row.variantId,
          screenshotPath: evidence ? evidence.screenshot_path ?? null : row.screenshotPath,
          confirmation: evidence?.confirmation ?? row.confirmation,
          confirmationPath,
          updatedAt: changed,
          submittedAt: args.to === "submitted" ? changed : row.submittedAt
        }).where(and(eq(applications.appId, args.app_id), eq(applications.state, args.from))),
        db.insert(events).values({ runId: row.runId, appId: row.appId, type: "state_transition", payload: { from: args.from, to: args.to, evidence: args.evidence, intent_id: args.intent_id ?? null }, at: changed })
      ]);
      ctx.invalidateQueries();
      return { ok: true };
    }
  }),
  review_get: defineAction({
    request: object({ jd_hash: string2(), resume_hash: string2() }),
    response: object({ review: unknown().nullable() }),
    async handler(ctx, args) {
      const row = (await ctx.db().select().from(reviews).where(and(eq(reviews.jdHash, args.jd_hash), eq(reviews.resumeHash, args.resume_hash))).limit(1))[0];
      return { review: row ? { ...row, decidedAt: row.decidedAt.toISOString() } : null };
    }
  }),
  review_put: defineAction({
    request: object({ jd_hash: string2(), resume_hash: string2(), verdict: string2(), notes: string2().nullable().optional(), reviewer_version: string2() }),
    response: okResponse,
    async handler(ctx, args) {
      const db = ctx.db();
      const decidedAt = now();
      await db.insert(reviews).values({ jdHash: args.jd_hash, resumeHash: args.resume_hash, verdict: args.verdict, notes: args.notes ?? null, reviewerVersion: args.reviewer_version, decidedAt }).onConflictDoUpdate({ target: [reviews.jdHash, reviews.resumeHash], set: { verdict: args.verdict, notes: args.notes ?? null, reviewerVersion: args.reviewer_version, decidedAt } });
      ctx.invalidateQueries();
      return { ok: true };
    }
  }),
  resume_register: defineAction({
    request: object({
      variant_id: string2().min(1),
      path: string2().min(1),
      sha256: string2().min(1),
      role_family: string2().min(1),
      industry_tags: array(string2()),
      years_matrix: jsonValue,
      keyword_vector: jsonValue
    }),
    response: object({ ok: literal(true) }),
    async handler(ctx, args) {
      const db = ctx.db();
      await db.insert(resumeVariants).values({ variantId: args.variant_id, path: args.path, sha256: args.sha256, roleFamily: args.role_family, industryTags: args.industry_tags, yearsMatrix: args.years_matrix, keywordVector: args.keyword_vector }).onConflictDoUpdate({ target: resumeVariants.variantId, set: { path: args.path, sha256: args.sha256, roleFamily: args.role_family, industryTags: args.industry_tags, yearsMatrix: args.years_matrix, keywordVector: args.keyword_vector } });
      ctx.invalidateQueries();
      return { ok: true };
    }
  }),
  resume_upload: defineAction({
    request: object({ filename: string2(), bytes_base64: string2(), variant_id: string2(), role_family: string2(), industry_tags: array(string2()).optional() }),
    response: resumeUploadResponse,
    privileged: [privileged.writeResumeUpload, privileged.trashResumeFile],
    async handler(ctx, args) {
      const bytes = decodeBase64(args.bytes_base64);
      if (!bytes)
        return { ok: false, message: "The uploaded file could not be decoded." };
      if (bytes.byteLength > 15 * 1024 * 1024)
        return { ok: false, message: "The uploaded PDF is larger than the 15 MB limit." };
      if (!pdfBytes(bytes))
        return { ok: false, message: "The uploaded file is not a PDF." };
      const filename = args.filename.split(/[\\/]/).filter(Boolean).at(-1) ?? "";
      if (!safeResumeFilenamePattern.test(filename))
        return { ok: false, message: "Use a PDF filename that starts with a letter or number and contains only letters, numbers, dots, underscores, or hyphens." };
      const variantId = args.variant_id.trim();
      if (!variantId || !safeResumeVariantPattern.test(variantId))
        return { ok: false, message: "Variant id is required and may contain only letters, numbers, dots, underscores, or hyphens." };
      const roleFamily = args.role_family.trim();
      if (!roleFamily)
        return { ok: false, message: "Role family is required." };
      const db = ctx.db();
      const existing = (await db.select({ variantId: resumeVariants.variantId }).from(resumeVariants).where(eq(resumeVariants.variantId, variantId)).limit(1))[0];
      if (existing)
        return { ok: false, message: `Variant id '${variantId}' is already registered. Choose a different id.` };
      const profileRow = (await db.select().from(profile).where(eq(profile.id, 1)).limit(1))[0];
      let written;
      try {
        written = await ctx.executePrivileged(privileged.writeResumeUpload, { filename, bytes_base64: args.bytes_base64 });
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "The PDF could not be saved to the resume library." };
      }
      const sha256 = await bytesSha256(bytes);
      try {
        await db.insert(resumeVariants).values({
          variantId,
          path: written.path,
          sha256,
          roleFamily,
          industryTags: args.industry_tags ?? [],
          yearsMatrix: profileYearsMatrix(profileRow),
          keywordVector: {}
        });
      } catch {
        try {
          await ctx.executePrivileged(privileged.trashResumeFile, { variant_id: variantId, filename: written.filename, location: "user_files" });
        } catch {}
        const duplicate = (await db.select({ variantId: resumeVariants.variantId }).from(resumeVariants).where(eq(resumeVariants.variantId, variantId)).limit(1))[0];
        return { ok: false, message: duplicate ? `Variant id '${variantId}' is already registered. Choose a different id.` : "The PDF was saved but could not be registered. It was moved to recoverable trash when possible." };
      }
      ctx.invalidateQueries();
      return { ok: true, variant_id: variantId, path: written.path, filename: written.filename, sha256 };
    }
  }),
  resume_delete: defineAction({
    request: object({ variant_id: string2().min(1) }),
    response: resumeDeleteResponse,
    privileged: [privileged.trashResumeFile],
    async handler(ctx, args) {
      const variantId = args.variant_id.trim();
      const db = ctx.db();
      const row = (await db.select().from(resumeVariants).where(eq(resumeVariants.variantId, variantId)).limit(1))[0];
      if (!row)
        return { ok: false, message: `Variant '${variantId}' is not in the library.` };
      const usage = (await db.select({ count: sql`count(*)` }).from(applications).where(eq(applications.variantId, variantId)))[0];
      const usageCount = countNumber(usage?.count);
      const location = registeredResumeLocation(row.path);
      const filename = pathFilename(row.path);
      if (!location || !filename)
        return { ok: false, message: "This resume is outside the registered library locations and was not removed." };
      let moved;
      try {
        moved = await ctx.executePrivileged(privileged.trashResumeFile, { variant_id: variantId, filename, location });
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "The PDF could not be moved to recoverable trash. The library entry was kept." };
      }
      await db.delete(resumeVariants).where(eq(resumeVariants.variantId, variantId));
      ctx.invalidateQueries();
      return { ok: true, variant_id: variantId, usage_count: usageCount, trashed_path: moved.trashed_path, file_moved: moved.file_moved };
    }
  }),
  resume_pick: defineAction({
    request: object({ jd_text: string2().min(1), role_family: string2().optional() }),
    response: object({ results: array(object({ variant_id: string2(), score: number2(), breakdown: record(string2(), number2()) })) }),
    async handler(ctx, args) {
      const rows = await ctx.db().select().from(resumeVariants);
      const text = args.jd_text.toLowerCase();
      const targetRole = norm(args.role_family ?? "");
      const scored = rows.map((row) => {
        const vector = jsonObject(row.keywordVector);
        const keys = Object.keys(vector);
        const keyword = keys.length ? keys.filter((key) => text.includes(key.toLowerCase())).length / keys.length : 0;
        const tags = jsonArray(row.industryTags).filter((x) => typeof x === "string");
        const tagPool = [row.roleFamily, ...tags];
        const tag = tagPool.length ? tagPool.filter((x) => text.includes(x.toLowerCase()) || targetRole && norm(x) === targetRole).length / tagPool.length : 0;
        const approval = Math.max(0, Math.min(1, row.approvalRate > 1 ? row.approvalRate / 100 : row.approvalRate));
        const days = row.lastPickedAt ? (Date.now() - row.lastPickedAt.getTime()) / 86400000 : 90;
        const recency = Math.max(0, Math.min(1, days / 30));
        const score = 0.45 * keyword + 0.25 * tag + 0.2 * approval + 0.1 * recency;
        return { variant_id: row.variantId, score: Number(score.toFixed(4)), breakdown: { keyword: Number(keyword.toFixed(4)), tag: Number(tag.toFixed(4)), approval_rate: Number(approval.toFixed(4)), recency: Number(recency.toFixed(4)) } };
      }).sort((a, b) => b.score - a.score).slice(0, 3);
      return { results: scored };
    }
  }),
  h1b_lookup: defineAction({
    request: object({ company: string2() }),
    response: object({ found: boolean2(), score: number2(), evidence_years: array(string2()), lca_count: number2(), last_refreshed: string2().nullable() }),
    async handler(ctx, args) {
      const row = (await ctx.db().select().from(h1bSponsors).where(eq(h1bSponsors.companyNorm, norm(args.company))).limit(1))[0];
      if (!row)
        return { found: false, score: 0, evidence_years: [], lca_count: 0, last_refreshed: null };
      const years = Object.keys(jsonObject(row.statsByYear)).sort().reverse();
      const score = Math.max(0, Math.min(100, Math.round(25 * Math.log10(row.lcaCount + 1) + Math.min(40, years.length * 8))));
      return { found: true, score, evidence_years: years, lca_count: row.lcaCount, last_refreshed: row.lastRefreshed.toISOString() };
    }
  }),
  companies_update: defineAction({
    request: object({ rows: array(object({ company: string2(), tier: number2().int().optional(), industry: string2().nullable().optional(), hq_state: string2().nullable().optional(), careers_url: string2().nullable().optional(), ats_type: string2().nullable().optional(), park_count: number2().int().optional(), skip_flag: boolean2().optional(), skip_reason: string2().nullable().optional() })).max(500) }),
    response: object({ updated: number2() }),
    async handler(ctx, args) {
      const db = ctx.db();
      for (const row of args.rows)
        await db.insert(companies).values({ companyNorm: norm(row.company), tier: row.tier ?? 3, industry: row.industry ?? null, hqState: row.hq_state ?? null, careersUrl: row.careers_url ?? null, atsType: row.ats_type ?? null, parkCount: row.park_count ?? 0, skipFlag: row.skip_flag ?? false, skipReason: row.skip_reason ?? null }).onConflictDoUpdate({ target: companies.companyNorm, set: { tier: row.tier ?? 3, industry: row.industry ?? null, hqState: row.hq_state ?? null, careersUrl: row.careers_url ?? null, atsType: row.ats_type ?? null, parkCount: row.park_count ?? 0, skipFlag: row.skip_flag ?? false, skipReason: row.skip_reason ?? null } });
      if (args.rows.length)
        ctx.invalidateQueries();
      return { updated: args.rows.length };
    }
  }),
  approval_enqueue: defineAction({
    request: object({ approval_id: string2().optional(), kind: string2(), app_id: string2().nullable().optional(), question: string2(), options: array(string2()) }),
    response: object({ approval_id: string2() }),
    async handler(ctx, args) {
      const approvalId = args.approval_id ?? id("approval");
      await ctx.db().insert(approvals).values({ approvalId, kind: args.kind, appId: args.app_id ?? null, question: args.question, options: args.options });
      ctx.invalidateQueries();
      return { approval_id: approvalId };
    }
  }),
  approval_resolve: defineAction({
    request: object({ approval_id: string2(), answer: string2(), judged_by: string2() }),
    response: okResponse,
    async handler(ctx, args) {
      const db = ctx.db();
      const found = (await db.select().from(approvals).where(eq(approvals.approvalId, args.approval_id)).limit(1))[0];
      if (!found || found.resolvedAt)
        return { ok: false, message: found ? "Approval is already resolved." : "Approval not found." };
      await db.update(approvals).set({ answer: args.answer, judgedBy: args.judged_by, resolvedAt: now() }).where(eq(approvals.approvalId, args.approval_id));
      ctx.invalidateQueries();
      return { ok: true };
    }
  }),
  run_open: defineAction({
    request: object({ run_id: string2().optional(), campaign_id: string2(), kit_version: string2().nullable().optional(), compiled_config: jsonValue.optional(), live_config: jsonValue.optional() }),
    response: object({ run_id: string2() }),
    async handler(ctx, args) {
      const runId = args.run_id ?? id("run");
      await ctx.db().insert(runs).values({ runId, campaignId: args.campaign_id, kitVersion: args.kit_version ?? null, started: now(), status: "running", compiledConfig: args.compiled_config ?? {}, liveConfig: args.live_config ?? {} });
      ctx.invalidateQueries();
      return { run_id: runId };
    }
  }),
  run_close: defineAction({
    request: object({ run_id: string2(), status: string2(), counts: jsonValue.optional(), tokens: jsonValue.optional(), needs_me: boolean2().optional(), blocker: string2().nullable().optional() }),
    response: okResponse,
    async handler(ctx, args) {
      const db = ctx.db();
      const pending = (await db.select({ count: sql`count(*)` }).from(applications).where(and(eq(applications.runId, args.run_id), eq(applications.state, "applying"), or(isNull(applications.outcome), eq(applications.outcome, "")))))[0];
      if (countNumber(pending?.count) > 0)
        return { ok: false, message: "Run cannot close while applying rows lack an outcome." };
      await db.update(runs).set({ ended: now(), status: args.status, counts: args.counts ?? {}, tokens: args.tokens ?? {}, needsMe: args.needs_me ?? false, blocker: args.blocker ?? null }).where(eq(runs.runId, args.run_id));
      ctx.invalidateQueries();
      return { ok: true };
    }
  }),
  event_log: defineAction({
    request: object({ run_id: string2().nullable().optional(), app_id: string2().nullable().optional(), type: string2(), payload: jsonValue.optional(), at: string2().datetime().optional() }),
    response: object({ id: number2() }),
    async handler(ctx, args) {
      const result = await ctx.db().insert(events).values({ runId: args.run_id ?? null, appId: args.app_id ?? null, type: args.type, payload: args.payload ?? {}, at: args.at ? new Date(args.at) : now() }).returning({ id: events.id });
      const inserted = result[0];
      if (!inserted)
        throw new Error("Event could not be logged.");
      ctx.invalidateQueries();
      return { id: inserted.id };
    }
  }),
  test_data_purge: defineAction({
    request: emptyRequest,
    response: purgeResponse,
    async handler(ctx) {
      const db = ctx.db();
      const appCandidates = await db.select({ appId: applications.appId, source: postings.source, url: postings.url }).from(applications).leftJoin(postings, eq(applications.postingId, postings.postingId)).where(or(eq(postings.source, "smoke"), sqlSmokeMarker(sql`${applications.appId}`)));
      const resumeCandidates = await db.select().from(resumeVariants).where(or(sqlSmokeMarker(sql`${resumeVariants.variantId}`), sqlSmokeMarker(sql`${resumeVariants.path}`), sqlSmokeMarker(sql`${resumeVariants.sha256}`)));
      const runCandidates = await db.select().from(runs).where(or(sqlSmokeMarker(sql`${runs.campaignId}`), sqlSmokeMarker(sql`${runs.runId}`)));
      const profileCandidates = await db.select().from(profile).where(or(sql`${profile.identity} LIKE ${"%SMOKE TEST%"}`, sql`${profile.workAuth} LIKE ${"%SMOKE TEST%"}`, sql`${profile.roleTypes} LIKE ${"%SMOKE TEST%"}`, sql`${profile.locations} LIKE ${"%SMOKE TEST%"}`, sql`${profile.targeting} LIKE ${"%SMOKE TEST%"}`, sql`${profile.comp} LIKE ${"%SMOKE TEST%"}`, sql`${profile.startDate} LIKE ${"%SMOKE TEST%"}`, sql`${profile.answers} LIKE ${"%SMOKE TEST%"}`, sql`${profile.caps} LIKE ${"%SMOKE TEST%"}`, sql`${profile.replyTiers} LIKE ${"%SMOKE TEST%"}`));
      const rootApplicationIds = new Set(appCandidates.map((row) => row.appId));
      const resumeIds = resumeCandidates.map((row) => row.variantId);
      const resumeHashes = new Set(resumeCandidates.map((row) => row.sha256));
      const runIds = runCandidates.map((row) => row.runId);
      const resumeIdSet = new Set(resumeIds);
      const runIdSet = new Set(runIds);
      const allApplications = await db.select({
        appId: applications.appId,
        postingId: applications.postingId,
        runId: applications.runId,
        variantId: applications.variantId,
        resumeHash: applications.resumeHash,
        source: postings.source,
        url: postings.url,
        jdHash: postings.jdHash
      }).from(applications).leftJoin(postings, eq(applications.postingId, postings.postingId));
      const applicationsToDelete = allApplications.filter((row) => rootApplicationIds.has(row.appId) || row.runId !== null && runIdSet.has(row.runId) || row.variantId !== null && resumeIdSet.has(row.variantId) || row.resumeHash !== null && resumeHashes.has(row.resumeHash));
      const applicationIds = applicationsToDelete.map((row) => row.appId);
      const applicationIdSet = new Set(applicationIds);
      const allApprovals = await db.select().from(approvals);
      const approvalCandidates = allApprovals.filter((row) => row.appId !== null && applicationIdSet.has(row.appId));
      const approvalIds = approvalCandidates.map((row) => row.approvalId);
      const approvalIdSet = new Set(approvalIds);
      const allConversations = await db.select().from(conversations);
      const conversationCandidates = allConversations.filter((row) => row.appId !== null && applicationIdSet.has(row.appId));
      const conversationIds = conversationCandidates.map((row) => row.threadId);
      const conversationIdSet = new Set(conversationIds);
      const reviewKeys = new Set(applicationsToDelete.filter((row) => row.jdHash !== null && row.resumeHash !== null).map((row) => `${row.jdHash}\x00${row.resumeHash}`));
      const allReviews = await db.select().from(reviews);
      const reviewCandidates = allReviews.filter((row) => resumeHashes.has(row.resumeHash) || reviewKeys.has(`${row.jdHash}\x00${row.resumeHash}`));
      const allReplies = await db.select().from(replies);
      const replyCandidates = allReplies.filter((row) => conversationIdSet.has(row.threadId) || row.runId !== null && runIdSet.has(row.runId) || row.approvalId !== null && approvalIdSet.has(row.approvalId));
      const allTokenUsage = await db.select().from(tokenUsage);
      const tokenUsageCandidates = allTokenUsage.filter((row) => runIdSet.has(row.runId));
      const offending = [];
      for (const row of applicationsToDelete) {
        if (!(row.source === "smoke" || hasSmokeMarker(row.appId)))
          offending.push(`applications:${row.appId}`);
      }
      for (const row of resumeCandidates) {
        if (![row.variantId, row.path, row.sha256].some(hasSmokeMarker))
          offending.push(`resumes:${row.variantId}`);
      }
      for (const row of runCandidates) {
        if (![row.campaignId, row.runId].some(hasSmokeMarker))
          offending.push(`runs:${row.runId}`);
      }
      for (const row of profileCandidates) {
        const textColumns = [row.identity, row.workAuth, row.roleTypes, row.locations, row.targeting, row.comp, row.startDate, row.answers, row.caps, row.replyTiers];
        if (!textColumns.some(hasSmokeTestLabel))
          offending.push(`profiles:${row.id}`);
      }
      for (const row of approvalCandidates) {
        if (![row.approvalId, row.kind, row.question, row.judgedBy].some(hasSmokeMarker))
          offending.push(`approvals:${row.approvalId}`);
      }
      for (const row of reviewCandidates) {
        if (![row.jdHash, row.resumeHash, row.notes, row.reviewerVersion].some(hasSmokeMarker))
          offending.push(`reviews:${row.id}`);
      }
      for (const row of conversationCandidates) {
        if (![row.threadId, row.channel, row.classification, row.state, row.watermark].some(hasSmokeMarker))
          offending.push(`conversations:${row.threadId}`);
      }
      for (const row of replyCandidates) {
        if (![row.replyId, row.ruleId, row.draftPath, row.reason, row.attachmentName].some(hasSmokeMarker))
          offending.push(`replies:${row.replyId}`);
      }
      for (const row of tokenUsageCandidates) {
        if (![row.runId, row.campaignId].some(hasSmokeMarker))
          offending.push(`token_usage:${row.runId}`);
      }
      if (offending.length > 0)
        return {
          ok: false,
          error: `Purge refused; candidates failed strict marker verification: ${offending.join(", ")}`,
          offending_ids: offending
        };
      const batchId = id("purge");
      const stageRows = (tableName, rowId) => ({
        batchId: sql`${batchId}`.as("batch_id"),
        tableName: sql`${tableName}`.as("table_name"),
        rowId: rowId.as("row_id")
      });
      const stageApplications = db.insert(purgeStage).select(db.select(stageRows("applications", sql`${applications.appId}`)).from(applications).leftJoin(postings, eq(applications.postingId, postings.postingId)).where(or(eq(postings.source, "smoke"), sqlSmokeMarker(sql`${applications.appId}`), sql`${applications.runId} IN (SELECT run_id FROM runs WHERE ${sqlSmokeMarker(sql`campaign_id`)} OR ${sqlSmokeMarker(sql`run_id`)})`, sql`${applications.variantId} IN (SELECT variant_id FROM resume_variants WHERE ${sqlSmokeMarker(sql`variant_id`)} OR ${sqlSmokeMarker(sql`path`)} OR ${sqlSmokeMarker(sql`sha256`)})`, sql`${applications.resumeHash} IN (SELECT sha256 FROM resume_variants WHERE ${sqlSmokeMarker(sql`variant_id`)} OR ${sqlSmokeMarker(sql`path`)} OR ${sqlSmokeMarker(sql`sha256`)})`))).onConflictDoNothing();
      const stageResumes = db.insert(purgeStage).select(db.select(stageRows("resumes", sql`${resumeVariants.variantId}`)).from(resumeVariants).where(or(sqlSmokeMarker(sql`${resumeVariants.variantId}`), sqlSmokeMarker(sql`${resumeVariants.path}`), sqlSmokeMarker(sql`${resumeVariants.sha256}`)))).onConflictDoNothing();
      const stageRuns = db.insert(purgeStage).select(db.select(stageRows("runs", sql`${runs.runId}`)).from(runs).where(or(sqlSmokeMarker(sql`${runs.campaignId}`), sqlSmokeMarker(sql`${runs.runId}`)))).onConflictDoNothing();
      const stageProfiles = db.insert(purgeStage).select(db.select({
        batchId: sql`${batchId}`.as("batch_id"),
        tableName: sql`${"profiles"}`.as("table_name"),
        rowId: sql`CAST(${profile.id} AS TEXT)`.as("row_id")
      }).from(profile).where(or(sql`${profile.identity} LIKE ${"%SMOKE TEST%"}`, sql`${profile.workAuth} LIKE ${"%SMOKE TEST%"}`, sql`${profile.roleTypes} LIKE ${"%SMOKE TEST%"}`, sql`${profile.locations} LIKE ${"%SMOKE TEST%"}`, sql`${profile.targeting} LIKE ${"%SMOKE TEST%"}`, sql`${profile.comp} LIKE ${"%SMOKE TEST%"}`, sql`${profile.startDate} LIKE ${"%SMOKE TEST%"}`, sql`${profile.answers} LIKE ${"%SMOKE TEST%"}`, sql`${profile.caps} LIKE ${"%SMOKE TEST%"}`, sql`${profile.replyTiers} LIKE ${"%SMOKE TEST%"}`))).onConflictDoNothing();
      const stageApprovals = db.insert(purgeStage).select(db.select(stageRows("approvals", sql`${approvals.approvalId}`)).from(approvals).where(sql`${approvals.appId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'applications')`)).onConflictDoNothing();
      const stageConversations = db.insert(purgeStage).select(db.select(stageRows("conversations", sql`${conversations.threadId}`)).from(conversations).where(sql`${conversations.appId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'applications')`)).onConflictDoNothing();
      const stageReviews = db.insert(purgeStage).select(db.select({
        batchId: sql`${batchId}`.as("batch_id"),
        tableName: sql`${"reviews"}`.as("table_name"),
        rowId: sql`CAST(${reviews.id} AS TEXT)`.as("row_id")
      }).from(reviews).where(or(sql`${reviews.resumeHash} IN (SELECT rv.sha256 FROM resume_variants rv JOIN purge_stage ps ON ps.row_id = rv.variant_id WHERE ps.batch_id = ${batchId} AND ps.table_name = 'resumes')`, sql`EXISTS (SELECT 1 FROM applications a JOIN postings p ON p.posting_id = a.posting_id JOIN purge_stage ps ON ps.row_id = a.app_id WHERE ps.batch_id = ${batchId} AND ps.table_name = 'applications' AND p.jd_hash = ${reviews.jdHash} AND a.resume_hash = ${reviews.resumeHash})`))).onConflictDoNothing();
      const stageReplies = db.insert(purgeStage).select(db.select(stageRows("replies", sql`${replies.replyId}`)).from(replies).where(or(sql`${replies.threadId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'conversations')`, sql`${replies.runId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'runs')`, sql`${replies.approvalId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'approvals')`))).onConflictDoNothing();
      const stageTokenUsage = db.insert(purgeStage).select(db.select(stageRows("token_usage", sql`${tokenUsage.runId}`)).from(tokenUsage).where(sql`${tokenUsage.runId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'runs')`)).onConflictDoNothing();
      const stageRetainedEvents = db.insert(purgeStage).select(db.select({
        batchId: sql`${batchId}`.as("batch_id"),
        tableName: sql`${"retained_events"}`.as("table_name"),
        rowId: sql`CAST(${events.id} AS TEXT)`.as("row_id")
      }).from(events).where(or(sql`${events.runId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'runs')`, sql`${events.appId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'applications')`))).onConflictDoNothing();
      const markerFailures = sql`(
        (SELECT COUNT(*) FROM purge_stage ps JOIN applications a ON a.app_id = ps.row_id LEFT JOIN postings p ON p.posting_id = a.posting_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'applications' AND NOT (p.source = 'smoke' OR ${sqlSmokeMarker(sql`a.app_id`)}))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN resume_variants r ON r.variant_id = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'resumes' AND NOT (${sqlSmokeMarker(sql`r.variant_id`)} OR ${sqlSmokeMarker(sql`r.path`)} OR ${sqlSmokeMarker(sql`r.sha256`)}))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN runs r ON r.run_id = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'runs' AND NOT (${sqlSmokeMarker(sql`r.campaign_id`)} OR ${sqlSmokeMarker(sql`r.run_id`)}))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN profile p ON CAST(p.id AS TEXT) = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'profiles' AND NOT (p.identity LIKE '%[SMOKE TEST]%' OR p.work_auth LIKE '%[SMOKE TEST]%' OR p.role_types LIKE '%[SMOKE TEST]%' OR p.locations LIKE '%[SMOKE TEST]%' OR p.targeting LIKE '%[SMOKE TEST]%' OR p.comp LIKE '%[SMOKE TEST]%' OR coalesce(p.start_date,'') LIKE '%[SMOKE TEST]%' OR p.answers LIKE '%[SMOKE TEST]%' OR p.caps LIKE '%[SMOKE TEST]%' OR p.reply_tiers LIKE '%[SMOKE TEST]%'))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN approvals a ON a.approval_id = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'approvals' AND NOT (${sqlSmokeMarker(sql`a.approval_id`)} OR ${sqlSmokeMarker(sql`a.kind`)} OR ${sqlSmokeMarker(sql`a.question`)} OR ${sqlSmokeMarker(sql`a.judged_by`)}))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN reviews r ON CAST(r.id AS TEXT) = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'reviews' AND NOT (${sqlSmokeMarker(sql`r.jd_hash`)} OR ${sqlSmokeMarker(sql`r.resume_hash`)} OR ${sqlSmokeMarker(sql`r.notes`)} OR ${sqlSmokeMarker(sql`r.reviewer_version`)}))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN conversations c ON c.thread_id = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'conversations' AND NOT (${sqlSmokeMarker(sql`c.thread_id`)} OR ${sqlSmokeMarker(sql`c.channel`)} OR ${sqlSmokeMarker(sql`c.classification`)} OR ${sqlSmokeMarker(sql`c.state`)} OR ${sqlSmokeMarker(sql`c.watermark`)}))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN replies r ON r.reply_id = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'replies' AND NOT (${sqlSmokeMarker(sql`r.reply_id`)} OR ${sqlSmokeMarker(sql`r.rule_id`)} OR ${sqlSmokeMarker(sql`r.draft_path`)} OR ${sqlSmokeMarker(sql`r.reason`)} OR ${sqlSmokeMarker(sql`r.attachment_name`)}))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN token_usage t ON t.run_id = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'token_usage' AND NOT (${sqlSmokeMarker(sql`t.run_id`)} OR ${sqlSmokeMarker(sql`t.campaign_id`)}))
      )`;
      const auditPayload = sql`json_object(
        'batch_id', ${batchId},
        'purged', json_object(
          'applications', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'applications'),
          'resumes', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'resumes'),
          'runs', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'runs'),
          'profiles', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'profiles'),
          'approvals', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'approvals'),
          'reviews', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'reviews'),
          'conversations', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'conversations'),
          'replies', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'replies'),
          'token_usage', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'token_usage')
        ),
        'ids', json_object(
          'applications', json(COALESCE((SELECT json_group_array(row_id) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'applications' ORDER BY row_id)), '[]')),
          'resumes', json(COALESCE((SELECT json_group_array(row_id) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'resumes' ORDER BY row_id)), '[]')),
          'runs', json(COALESCE((SELECT json_group_array(row_id) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'runs' ORDER BY row_id)), '[]')),
          'profiles', json(COALESCE((SELECT json_group_array(CAST(row_id AS INTEGER)) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'profiles' ORDER BY row_id)), '[]')),
          'approvals', json(COALESCE((SELECT json_group_array(row_id) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'approvals' ORDER BY row_id)), '[]')),
          'reviews', json(COALESCE((SELECT json_group_array(CAST(row_id AS INTEGER)) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'reviews' ORDER BY CAST(row_id AS INTEGER))), '[]')),
          'conversations', json(COALESCE((SELECT json_group_array(row_id) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'conversations' ORDER BY row_id)), '[]')),
          'replies', json(COALESCE((SELECT json_group_array(row_id) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'replies' ORDER BY row_id)), '[]')),
          'token_usage', json(COALESCE((SELECT json_group_array(row_id) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'token_usage' ORDER BY row_id)), '[]'))
        ),
        'retained_event_ids', json(COALESCE((SELECT json_group_array(CAST(row_id AS INTEGER)) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'retained_events' ORDER BY CAST(row_id AS INTEGER))), '[]'))
      )`;
      try {
        await db.batch([
          db.delete(purgeStage).where(eq(purgeStage.batchId, batchId)),
          db.delete(purgeGuard).where(eq(purgeGuard.batchId, batchId)),
          stageApplications,
          stageResumes,
          stageRuns,
          stageProfiles,
          stageApprovals,
          stageConversations,
          stageReviews,
          stageReplies,
          stageTokenUsage,
          stageRetainedEvents,
          db.insert(purgeGuard).values({ batchId, offenderCount: markerFailures }),
          db.delete(replies).where(sql`${replies.replyId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'replies')`),
          db.delete(approvals).where(sql`${approvals.approvalId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'approvals')`),
          db.delete(conversations).where(sql`${conversations.threadId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'conversations')`),
          db.delete(reviews).where(sql`CAST(${reviews.id} AS TEXT) IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'reviews')`),
          db.delete(tokenUsage).where(sql`${tokenUsage.runId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'token_usage')`),
          db.delete(applications).where(sql`${applications.appId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'applications')`),
          db.delete(runs).where(sql`${runs.runId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'runs')`),
          db.delete(resumeVariants).where(sql`${resumeVariants.variantId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'resumes')`),
          db.delete(profile).where(sql`CAST(${profile.id} AS TEXT) IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'profiles')`),
          db.insert(events).values({ type: "test_data_purge", payload: auditPayload, at: now() }),
          db.delete(purgeGuard).where(eq(purgeGuard.batchId, batchId)),
          db.delete(purgeStage).where(eq(purgeStage.batchId, batchId))
        ]);
      } catch {
        return { ok: false, error: "Purge refused; data changed during atomic verification. No rows were deleted." };
      }
      const auditEvent = (await db.select({ payload: events.payload }).from(events).where(and(eq(events.type, "test_data_purge"), sql`json_extract(${events.payload}, '$.batch_id') = ${batchId}`)).limit(1))[0];
      if (!auditEvent)
        return { ok: false, error: "Purge audit record was not written; no successful result can be reported." };
      const payload = jsonObject(auditEvent.payload);
      const parsed = purgeResponse.safeParse({ ok: true, purged: payload.purged, ids: payload.ids });
      if (!parsed.success || !parsed.data.ok)
        return { ok: false, error: "Purge audit record could not be validated." };
      ctx.invalidateQueries();
      return parsed.data;
    }
  }),
  schedules_status: defineAction({
    request: emptyRequest,
    response: schedulesStatusResponse,
    privileged: [privileged.readSchedulesManifest],
    async handler(ctx) {
      const generatedAt = now().toISOString();
      const result = await ctx.executePrivileged(privileged.readSchedulesManifest, {});
      if (!result.manifestText)
        return { generated_at: generatedAt, manifest_missing: true, rows: [] };
      let parsed = null;
      try {
        const checked = schedulesManifestSchema.safeParse(JSON.parse(result.manifestText));
        parsed = checked.success ? checked.data : null;
      } catch {
        parsed = null;
      }
      if (!parsed)
        return { generated_at: generatedAt, manifest_missing: true, rows: [] };
      const runRows = await ctx.db().select().from(runs).orderBy(desc(runs.started));
      const latestByCampaign = new Map;
      for (const run of runRows)
        if (!latestByCampaign.has(run.campaignId))
          latestByCampaign.set(run.campaignId, run);
      const rows = parsed.jobs.map((job) => {
        const latest = latestByCampaign.get(job.campaign);
        const liveBodyHash = latest ? findBodyHash(latest.liveConfig) ?? findBodyHash(latest.compiledConfig) : null;
        const latestRunDrift = latest ? JSON.stringify(latest.compiledConfig) === JSON.stringify(latest.liveConfig) ? "in_sync" : "drift" : null;
        const hashDrift = liveBodyHash && job.body_hash ? liveBodyHash === job.body_hash.toLowerCase() ? "in_sync" : "drift" : null;
        return {
          ...job,
          manifest_body_hash: job.body_hash,
          last_run_at: latest ? latest.started.toISOString() : null,
          last_run_status: latest?.status ?? null,
          live_body_hash: liveBodyHash,
          drift: latest ? latestRunDrift ?? hashDrift ?? "unknown" : "unknown"
        };
      });
      return { generated_at: generatedAt, manifest_missing: false, rows };
    }
  }),
  schedule_update: defineAction({
    request: object({ job_id: string2().min(1), cadence: string2().optional(), enabled: boolean2().optional() }).superRefine((value, ctx) => {
      if (value.cadence === undefined && value.enabled === undefined) {
        ctx.addIssue({ code: ZodIssueCode.custom, message: "Provide at least one of cadence or enabled." });
      }
    }),
    response: scheduleUpdateResponse,
    privileged: [privileged.readProfileYaml, privileged.parseProfileYaml, privileged.writeProfileYaml, privileged.readSchedulesManifest],
    async handler(ctx, args) {
      const jobId = args.job_id.trim();
      const campaign = jobIdToCampaign(jobId);
      if (!campaign) {
        return { ok: false, error: `Unknown job_id ${q(jobId)}. Known job ids: ${SCHEDULE_CAMPAIGNS.map(scheduleJobId).join(", ")}.` };
      }
      let cadence;
      if (args.cadence !== undefined) {
        const problem = cadenceError(args.cadence);
        if (problem)
          return { ok: false, error: problem };
        cadence = args.cadence.trim();
      }
      let originalText;
      let parsed;
      try {
        originalText = (await ctx.executePrivileged(privileged.readProfileYaml, {})).yamlText;
        parsed = jsonObject((await ctx.executePrivileged(privileged.parseProfileYaml, { yamlText: originalText })).parsed);
      } catch {
        return { ok: false, error: "profile.yaml could not be read or parsed; nothing was changed." };
      }
      const campaigns2 = jsonObject(parsed.campaigns);
      const rawExisting = campaigns2[campaign];
      if (rawExisting !== undefined && (typeof rawExisting !== "object" || rawExisting === null || Array.isArray(rawExisting))) {
        return { ok: false, error: `campaigns.${campaign} is malformed in profile.yaml; fix it by hand before editing from the dashboard.` };
      }
      const existing = rawExisting ? rawExisting : null;
      let nextCadence = cadence ?? (typeof existing?.cadence === "string" && existing.cadence.trim() ? existing.cadence.trim() : undefined);
      if (!nextCadence) {
        try {
          const manifest = await ctx.executePrivileged(privileged.readSchedulesManifest, {});
          if (manifest.manifestText) {
            const jobs = jsonArray(JSON.parse(manifest.manifestText).jobs);
            const row = jobs.map(jsonObject).find((job) => job.job_id === jobId);
            const found = row && typeof row.cadence === "string" ? row.cadence.trim() : "";
            if (found)
              nextCadence = found;
          }
        } catch {}
        if (!nextCadence)
          return { ok: false, error: `campaigns.${campaign} has no cadence yet and the manifest has no row for ${q(jobId)}; pass cadence explicitly.` };
      }
      const nextFields = { ...existing ?? {}, cadence: nextCadence };
      if (args.enabled !== undefined)
        nextFields.enabled = args.enabled;
      let updatedText;
      try {
        updatedText = spliceCampaignEntry(originalText, campaign, campaignEntryLine(campaign, nextFields));
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "The campaigns section could not be edited." };
      }
      try {
        const reparsed = jsonObject((await ctx.executePrivileged(privileged.parseProfileYaml, { yamlText: updatedText })).parsed);
        const checked = yamlProfileSchema.safeParse(reparsed);
        if (!checked.success)
          throw new Error(checked.error.issues[0]?.message ?? "The edited profile did not validate.");
      } catch (error) {
        try {
          await ctx.executePrivileged(privileged.writeProfileYaml, { yaml_text: originalText });
        } catch {}
        return { ok: false, error: `Edited profile failed validation; the previous profile.yaml was restored. ${error instanceof Error ? error.message : ""}`.trim() };
      }
      try {
        await ctx.executePrivileged(privileged.writeProfileYaml, { yaml_text: updatedText });
      } catch {
        return { ok: false, error: "profile.yaml could not be written; nothing was changed." };
      }
      ctx.invalidateQueries();
      const enabled = nextFields.enabled === false ? false : true;
      return {
        ok: true,
        job_id: jobId,
        campaign,
        cadence: nextCadence,
        enabled,
        note: `Saved to profile.yaml campaigns.${campaign}. Recompiles within ~15 min via profile_watch \u2014 the job is never deleted.`
      };
    }
  }),
  snapshot: defineAction({
    request: object({ view: _enum(["overview", "applications", "resumes", "runs", "replies", "health", "ask"]), query: string2().optional() }),
    response: object({ view: string2(), generated_at: string2(), data: unknown() }),
    privileged: [privileged.applicationEvidenceExists],
    async handler(ctx, args) {
      const db = ctx.db();
      const generatedAt = now();
      const cutoff24 = new Date(Date.now() - 86400000);
      const cutoff7 = new Date(Date.now() - 7 * 86400000);
      const cutoff30 = new Date(Date.now() - 30 * 86400000);
      const appCounts = async () => {
        const rows = await db.select({ state: applications.state, count: sql`count(*)` }).from(applications).groupBy(applications.state);
        const byState = Object.fromEntries(rows.map((r) => [r.state, countNumber(r.count)]));
        const todayRows = await db.select({ createdAt: applications.createdAt, submittedAt: applications.submittedAt }).from(applications);
        return { total: Object.values(byState).reduce((a, b) => a + b, 0), by_state: byState, today_applied: todayRows.filter((r) => r.submittedAt && chicagoDay(r.submittedAt) === chicagoDay()).length, submitted_7d: todayRows.filter((r) => r.submittedAt && r.submittedAt >= cutoff7).length, submitted_30d: todayRows.filter((r) => r.submittedAt && r.submittedAt >= cutoff30).length };
      };
      if (args.view === "applications" || args.view === "resumes") {
        const counts = await appCounts();
        const apps = await db.select().from(applications).orderBy(desc(applications.updatedAt)).limit(500);
        const posts = await db.select().from(postings);
        const postMap = new Map(posts.map((p) => [p.postingId, p]));
        const usage = await db.select({ variantId: applications.variantId, count: sql`count(*)` }).from(applications).where(sql`${applications.variantId} IS NOT NULL`).groupBy(applications.variantId);
        const usageMap = new Map(usage.map((u) => [u.variantId, countNumber(u.count)]));
        const resumes = (await db.select().from(resumeVariants).orderBy(desc(resumeVariants.timesPicked))).map((r) => ({ variant_id: r.variantId, path: r.path, sha256: r.sha256, role_family: r.roleFamily, industry_tags: r.industryTags, times_picked: r.timesPicked, exact_usage: usageMap.get(r.variantId) ?? 0, approval_rate: r.approvalRate, last_picked_at: iso(r.lastPickedAt) }));
        const screenshotChecks = await Promise.all(apps.filter((app) => app.screenshotPath && app.runId).map(async (app) => {
          const result = await ctx.executePrivileged(privileged.applicationEvidenceExists, { appId: app.appId, campaignId: app.campaignId, runId: app.runId ?? "", kind: "screenshot", filename: pathFilename(app.screenshotPath ?? "") });
          return [app.appId, result.exists];
        }));
        const screenshotExists = new Map(screenshotChecks);
        const ledger = apps.map((a) => {
          const p = postMap.get(a.postingId);
          return {
            app_id: a.appId,
            company: p?.company ?? a.companyNorm,
            role: p?.role ?? a.roleNorm,
            source: p?.source ?? "unavailable",
            url: p?.url ?? null,
            state: a.state,
            campaign_id: a.campaignId,
            run_id: a.runId,
            variant_id: a.variantId,
            resume_path: a.resumePath,
            resume_hash: a.resumeHash,
            screenshot_path: a.screenshotPath,
            screenshot_exists: a.screenshotPath ? screenshotExists.get(a.appId) === true : false,
            confirmation: a.confirmation,
            confirmation_path: a.confirmationPath,
            blocker: a.blocker,
            outcome: a.outcome,
            created_at: a.createdAt.toISOString(),
            updated_at: a.updatedAt.toISOString(),
            submitted_at: iso(a.submittedAt)
          };
        });
        return { view: args.view, generated_at: generatedAt.toISOString(), data: { counts, ledger, resumes } };
      }
      if (args.view === "runs") {
        const runRows = await db.select().from(runs).orderBy(desc(runs.started)).limit(200);
        const rows = runRows.map((r) => ({
          run_id: r.runId,
          campaign_id: r.campaignId,
          kit_version: r.kitVersion,
          started: r.started.toISOString(),
          ended: iso(r.ended),
          status: r.status,
          counts: r.counts,
          tokens: r.tokens,
          tokens_input: r.tokensInput,
          tokens_output: r.tokensOutput,
          tokens_total: r.tokensTotal,
          tokens_reported: r.tokensReported,
          needs_me: r.needsMe,
          blocker: r.blocker,
          drift: JSON.stringify(r.compiledConfig) === JSON.stringify(r.liveConfig) ? "in_sync" : "drift",
          compiled_config: r.compiledConfig,
          live_config: r.liveConfig
        }));
        const totalTokens = runRows.reduce((sum, r) => r.tokensReported ? sum + r.tokensTotal : sum, 0);
        return { view: args.view, generated_at: generatedAt.toISOString(), data: { hero: runRows.length, running: runRows.filter((r) => r.status === "running").length, blocked: runRows.filter((r) => Boolean(r.blocker)).length, needs_me: runRows.filter((r) => r.needsMe).length, total_tokens: totalTokens, rows } };
      }
      if (args.view === "replies") {
        const threads = await db.select().from(conversations).orderBy(desc(conversations.updatedAt)).limit(300);
        const replyRows = await db.select().from(replies).orderBy(desc(replies.at)).limit(500);
        const apps = await db.select().from(applications);
        const perWeek = replyRows.filter((r) => r.at >= cutoff7).reduce((acc, r) => {
          if (r.action === "sent" || r.action === "auto_sent")
            acc.sent += 1;
          if (r.action === "held")
            acc.held += 1;
          return acc;
        }, { sent: 0, held: 0 });
        const repliedApps = new Set(threads.map((t) => t.appId).filter(Boolean));
        const interviewed = apps.filter((a) => (a.outcome ?? "").toLowerCase().includes("interview")).length;
        return { view: args.view, generated_at: generatedAt.toISOString(), data: { hero: threads.length, sent_7d: perWeek.sent, held_7d: perWeek.held, awaiting_me: threads.filter((t) => ["awaiting_me", "needs_me", "held"].includes(t.state)), funnel: { applied: apps.length, replied: repliedApps.size, interview: interviewed }, threads: threads.map((t) => ({ thread_id: t.threadId, channel: t.channel, contact_id: t.contactId, app_id: t.appId, classification: t.classification, state: t.state, watermark: t.watermark, updated_at: t.updatedAt.toISOString() })), replies: replyRows.map((r) => ({ ...r, at: r.at.toISOString() })) } };
      }
      if (args.view === "health") {
        const runRows = await db.select().from(runs).orderBy(desc(runs.started)).limit(100);
        const aged = await db.select().from(approvals).where(and(isNull(approvals.resolvedAt), lt(approvals.createdAt, cutoff24))).orderBy(asc(approvals.createdAt));
        const stale = await db.select().from(applications).where(and(eq(applications.state, "applying"), lt(applications.updatedAt, cutoff24)));
        const drift = runRows.filter((r) => JSON.stringify(r.compiledConfig) !== JSON.stringify(r.liveConfig)).map((r) => ({ run_id: r.runId, campaign_id: r.campaignId, compiled: r.compiledConfig, live: r.liveConfig }));
        const last = runRows[0];
        return { view: args.view, generated_at: generatedAt.toISOString(), data: { status: !last ? "no_runs" : last.status === "running" || last.ended && last.ended >= cutoff24 ? "healthy" : "attention", runs_24h: runRows.filter((r) => r.started >= cutoff24).length, drift, stale_intents: stale.map((a) => ({ app_id: a.appId, updated_at: a.updatedAt.toISOString(), intent_id: a.intentId })), aged_approvals: aged.map((a) => ({ approval_id: a.approvalId, question: a.question, created_at: a.createdAt.toISOString() })), state_edges: STATE_EDGE_DOCS, disk: { available: false, message: "Disk telemetry source unavailable." } } };
      }
      if (args.view === "overview") {
        const counts = await appCounts();
        const recentRuns = await db.select().from(runs).where(gte(runs.started, cutoff24)).orderBy(desc(runs.started));
        const pending = await db.select().from(approvals).where(isNull(approvals.resolvedAt)).orderBy(asc(approvals.createdAt)).limit(20);
        const recentEvents = await db.select({ count: sql`count(*)` }).from(events).where(gte(events.at, cutoff24));
        return { view: args.view, generated_at: generatedAt.toISOString(), data: { counts, runs_24h: recentRuns.length, healthy_runs_24h: recentRuns.filter((r) => r.status === "completed").length, events_24h: countNumber(recentEvents[0]?.count), approvals: pending.map((a) => ({ approval_id: a.approvalId, kind: a.kind, app_id: a.appId, question: a.question, options: a.options, created_at: a.createdAt.toISOString() })) } };
      }
      const query = (args.query ?? "").trim().toLowerCase();
      const route = query.match(/resume|variant/) ? "resumes" : query.match(/reply|thread|message/) ? "replies" : query.match(/token|cost/) ? "tokens" : query.match(/block|stuck/) ? "blockers" : query.match(/schedule|cron|cadence/) ? "schedules" : query.match(/health|doctor|drift|stale|disk/) ? "health" : query.match(/run|campaign/) ? "runs" : query.match(/application|applied|submit|reject|park/) ? "applications" : "unknown";
      let answer = "I couldn\u2019t map that question to a ledger. Try applications, resumes, replies, runs, tokens, blockers, schedules, or health.";
      let sources = [];
      if (route === "applications") {
        const c = await appCounts();
        answer = `${c.total.toLocaleString()} applications are recorded; ${countNumber(c.by_state.submitted).toLocaleString()} are submitted and ${countNumber(c.by_state.blocked).toLocaleString()} are blocked.`;
        sources = ["applications"];
      } else if (route === "resumes") {
        const rows = await db.select({ count: sql`count(*)` }).from(resumeVariants);
        answer = `${countNumber(rows[0]?.count).toLocaleString()} resume variants are available.`;
        sources = ["resume_variants", "applications.variant_id"];
      } else if (route === "replies") {
        const rows = await db.select({ action: replies.action, count: sql`count(*)` }).from(replies).groupBy(replies.action);
        answer = rows.length ? rows.map((r) => `${r.action}: ${countNumber(r.count).toLocaleString()}`).join(" \xB7 ") : "The replies ledger is available but empty.";
        sources = ["replies"];
      } else if (route === "runs") {
        const rows = await db.select({ status: runs.status, count: sql`count(*)` }).from(runs).groupBy(runs.status);
        answer = rows.length ? rows.map((r) => `${r.status}: ${countNumber(r.count).toLocaleString()}`).join(" \xB7 ") : "The runs ledger is available but empty.";
        sources = ["runs"];
      } else if (route === "tokens") {
        const rows = await db.select({ total: sql`coalesce(sum(${tokenUsage.totalTokens}),0)` }).from(tokenUsage);
        answer = `${countNumber(rows[0]?.total).toLocaleString()} total tokens are recorded.`;
        sources = ["token_usage"];
      } else if (route === "blockers") {
        const apps = await db.select({ count: sql`count(*)` }).from(applications).where(or(eq(applications.state, "blocked"), sql`${applications.blocker} IS NOT NULL`));
        const runs2 = await db.select({ count: sql`count(*)` }).from(runs).where(sql`${runs.blocker} IS NOT NULL`);
        answer = `${countNumber(apps[0]?.count).toLocaleString()} application blockers and ${countNumber(runs2[0]?.count).toLocaleString()} run blockers are recorded.`;
        sources = ["applications", "runs"];
      } else if (route === "schedules") {
        const rows = await db.select().from(campaigns);
        answer = rows.length ? rows.map((r) => `${r.campaignId}: ${r.cadence}`).join(" \xB7 ") : "The campaigns schedule ledger is available but empty.";
        sources = ["campaigns"];
      } else if (route === "health") {
        const aged = await db.select({ count: sql`count(*)` }).from(approvals).where(and(isNull(approvals.resolvedAt), lt(approvals.createdAt, cutoff24)));
        answer = `${countNumber(aged[0]?.count).toLocaleString()} approvals have been waiting more than 24 hours. Disk telemetry is unavailable.`;
        sources = ["approvals", "runs"];
      }
      return { view: args.view, generated_at: generatedAt.toISOString(), data: { route, answer, sources } };
    }
  }),
  conversation_upsert: defineAction({
    request: object({ thread_id: string2(), channel: string2(), contact_id: string2().nullable().optional(), app_id: string2().nullable().optional(), classification: string2().nullable().optional(), state: string2(), watermark: string2().nullable().optional() }),
    response: okResponse,
    async handler(ctx, args) {
      const db = ctx.db();
      const updatedAt = now();
      await db.insert(conversations).values({ threadId: args.thread_id, channel: args.channel, contactId: args.contact_id ?? null, appId: args.app_id ?? null, classification: args.classification ?? null, state: args.state, watermark: args.watermark ?? null, updatedAt }).onConflictDoUpdate({ target: conversations.threadId, set: { channel: args.channel, contactId: args.contact_id ?? null, appId: args.app_id ?? null, classification: args.classification ?? null, state: args.state, watermark: args.watermark ?? null, updatedAt } });
      ctx.invalidateQueries();
      return { ok: true };
    }
  }),
  reply_log: defineAction({
    request: object({ reply_id: string2().optional(), thread_id: string2(), direction: string2(), action: _enum(["sent", "held", "auto_sent", "skipped"]), rule_id: string2().nullable().optional(), draft_path: string2().nullable().optional(), reason: string2().nullable().optional(), run_id: string2().nullable().optional(), approval_id: string2().nullable().optional(), attachment_name: string2().nullable().optional() }),
    response: object({ ok: boolean2(), reply_id: string2().optional(), message: string2().optional() }),
    async handler(ctx, args) {
      const db = ctx.db();
      const thread = (await db.select().from(conversations).where(eq(conversations.threadId, args.thread_id)).limit(1))[0];
      if (!thread)
        return { ok: false, message: "Conversation not found." };
      if (thread.channel.toLowerCase() === "linkedin" && (args.attachment_name ?? "").toLowerCase().endsWith(".pdf"))
        return { ok: false, message: "PDF attachments are not permitted on LinkedIn replies." };
      const replyId = args.reply_id ?? id("reply");
      await db.insert(replies).values({ replyId, threadId: args.thread_id, direction: args.direction, action: args.action, ruleId: args.rule_id ?? null, draftPath: args.draft_path ?? null, reason: args.reason ?? null, runId: args.run_id ?? null, approvalId: args.approval_id ?? null, attachmentName: args.attachment_name ?? null });
      ctx.invalidateQueries();
      return { ok: true, reply_id: replyId };
    }
  }),
  spillover_replay: defineAction({
    request: object({ run_id: string2() }),
    response: object({ replayed: boolean2(), count: number2() }),
    async handler(ctx, args) {
      const db = ctx.db();
      const prior = (await db.select({ id: events.id }).from(events).where(and(eq(events.runId, args.run_id), eq(events.type, "spillover_replayed"))).limit(1))[0];
      if (prior)
        return { replayed: false, count: 0 };
      const parked = await db.select().from(applications).where(and(eq(applications.runId, args.run_id), inArray(applications.state, ["parked", "blocked"])));
      await db.insert(events).values({ runId: args.run_id, type: "spillover_replayed", payload: { app_ids: parked.map((a) => a.appId), count: parked.length } });
      ctx.invalidateQueries();
      return { replayed: true, count: parked.length };
    }
  }),
  file_open: defineAction({
    request: union([
      object({ app_id: string2().min(1), kind: _enum(["resume", "screenshot", "confirmation"]) }),
      object({ variant_id: string2().min(1) })
    ]),
    response: object({ filename: string2(), file_url: string2(), content_type: _enum(["application/pdf", "image/png", "text/plain"]), preview_pages: array(object({ page: number2().int().positive(), file_url: string2() })), preview_truncated: boolean2() }),
    privileged: [privileged.readApplicationEvidence, privileged.readRegisteredResume, privileged.readTrashedResume, privileged.renderPdfPreview],
    async handler(ctx, args) {
      const db = ctx.db();
      if ("variant_id" in args) {
        const row = (await db.select({ path: resumeVariants.path }).from(resumeVariants).where(eq(resumeVariants.variantId, args.variant_id)).limit(1))[0];
        const location = row ? registeredResumeLocation(row.path) : null;
        const filename = row ? pathFilename(row.path) : "";
        if (!row || !location || !filename)
          throw new Error("The requested resume is not available from a registered location.");
        const result = await ctx.executePrivileged(privileged.readRegisteredResume, { filename, location });
        return publishFileWithPreview(ctx, result);
      }
      const row = (await db.select({ appId: applications.appId, campaignId: applications.campaignId, runId: applications.runId, variantId: applications.variantId, resumePath: applications.resumePath, resumeHash: applications.resumeHash, screenshotPath: applications.screenshotPath, confirmationPath: applications.confirmationPath }).from(applications).where(eq(applications.appId, args.app_id)).limit(1))[0];
      const path = row ? args.kind === "resume" ? row.resumePath : args.kind === "screenshot" ? row.screenshotPath : row.confirmationPath : null;
      if (!row || !path)
        throw new Error("The requested file is not attached to this application.");
      if (args.kind === "resume") {
        const location = registeredResumeLocation(path);
        const filename = pathFilename(path);
        if (location) {
          const registered = row.variantId ? (await db.select({ path: resumeVariants.path }).from(resumeVariants).where(and(eq(resumeVariants.variantId, row.variantId), eq(resumeVariants.path, path))).limit(1))[0] : null;
          if (registered)
            return publishFileWithPreview(ctx, await ctx.executePrivileged(privileged.readRegisteredResume, { filename, location }));
          if (!row.variantId)
            throw new Error("The application resume has no recorded variant id.");
          const trashed = await ctx.executePrivileged(privileged.readTrashedResume, { variant_id: row.variantId, filename, sha256: row.resumeHash });
          if (!trashed.found || !trashed.filename || !trashed.bytesBase64 || !trashed.contentType)
            throw new Error(`Removed resume variant '${row.variantId}' is no longer available in recoverable trash.`);
          return publishFileWithPreview(ctx, { filename: trashed.filename, bytesBase64: trashed.bytesBase64, contentType: trashed.contentType });
        }
      }
      if (!row.runId)
        throw new Error("The application has no run-bound evidence directory.");
      const result = await ctx.executePrivileged(privileged.readApplicationEvidence, { appId: row.appId, campaignId: row.campaignId, runId: row.runId, kind: args.kind, filename: pathFilename(path) });
      return publishFileWithPreview(ctx, result);
    }
  }),
  get_resume: defineAction({
    request: object({ filename: string2().min(1) }),
    response: object({ filename: string2(), bytes_base64: string2(), content_type: literal("application/pdf") }),
    privileged: [privileged.readApplicationEvidence, privileged.readRegisteredResume],
    async handler(ctx, args) {
      const db = ctx.db();
      const registered = (await db.select({ path: resumeVariants.path }).from(resumeVariants).where(eq(resumeVariants.path, args.filename)).limit(1))[0];
      if (registered) {
        const location = registeredResumeLocation(registered.path);
        const filename = pathFilename(registered.path);
        if (!location || !filename)
          throw new Error("The registered PDF location is unavailable.");
        const result = await ctx.executePrivileged(privileged.readRegisteredResume, { filename, location });
        return { filename: result.filename, bytes_base64: result.bytesBase64, content_type: result.contentType };
      }
      const attached = (await db.select({ appId: applications.appId, campaignId: applications.campaignId, runId: applications.runId, path: applications.resumePath }).from(applications).where(eq(applications.resumePath, args.filename)).limit(1))[0];
      if (!attached?.path || !attached.runId)
        throw new Error("The requested PDF is not registered or attached to an application.");
      const result = await ctx.executePrivileged(privileged.readApplicationEvidence, { appId: attached.appId, campaignId: attached.campaignId, runId: attached.runId, kind: "resume", filename: pathFilename(attached.path) });
      if (result.contentType !== "application/pdf")
        throw new Error("The attached resume is not a PDF.");
      return { filename: result.filename, bytes_base64: result.bytesBase64, content_type: result.contentType };
    }
  }),
  h1b_import: defineAction({
    request: object({ csv: string2().min(1) }),
    response: object({ imported: number2(), skipped: number2() }),
    async handler(ctx, args) {
      const db = ctx.db();
      const records = recordsFromCsv(args.csv);
      let imported = 0;
      let skipped = 0;
      for (const r of records) {
        const company = r.company_norm || r.company || r.employer;
        if (!company) {
          skipped += 1;
          continue;
        }
        const stats = r.stats_by_year ? (() => {
          try {
            return JSON.parse(r.stats_by_year);
          } catch {
            return {};
          }
        })() : {};
        const lca = Number(r.lca_count ?? 0);
        await db.insert(h1bSponsors).values({ companyNorm: norm(company), statsByYear: stats, lcaCount: Number.isFinite(lca) ? lca : 0, lastRefreshed: r.last_refreshed ? new Date(r.last_refreshed) : now() }).onConflictDoUpdate({ target: h1bSponsors.companyNorm, set: { statsByYear: stats, lcaCount: Number.isFinite(lca) ? lca : 0, lastRefreshed: r.last_refreshed ? new Date(r.last_refreshed) : now() } });
        imported += 1;
      }
      if (imported)
        ctx.invalidateQueries();
      return { imported, skipped };
    }
  }),
  companies_import: defineAction({
    request: object({ csv: string2().min(1) }),
    response: object({ imported: number2(), skipped: number2() }),
    async handler(ctx, args) {
      const db = ctx.db();
      const records = recordsFromCsv(args.csv);
      let imported = 0;
      let skipped = 0;
      for (const r of records) {
        const company = r.company_norm || r.company;
        if (!company) {
          skipped += 1;
          continue;
        }
        await db.insert(companies).values({ companyNorm: norm(company), tier: Number(r.tier || 3), industry: r.industry || null, hqState: r.hq_state || null, careersUrl: r.careers_url || null, atsType: r.ats_type || null, parkCount: Number(r.park_count || 0), skipFlag: ["1", "true", "yes"].includes((r.skip_flag ?? "").toLowerCase()), skipReason: r.skip_reason || null }).onConflictDoUpdate({ target: companies.companyNorm, set: { tier: Number(r.tier || 3), industry: r.industry || null, hqState: r.hq_state || null, careersUrl: r.careers_url || null, atsType: r.ats_type || null, parkCount: Number(r.park_count || 0), skipFlag: ["1", "true", "yes"].includes((r.skip_flag ?? "").toLowerCase()), skipReason: r.skip_reason || null } });
        imported += 1;
      }
      if (imported)
        ctx.invalidateQueries();
      return { imported, skipped };
    }
  }),
  token_record: defineAction({
    request: object({ run_id: string2(), campaign_id: string2(), date: string2(), input_tokens: number2().int().nonnegative(), output_tokens: number2().int().nonnegative(), total_tokens: number2().int().nonnegative(), stages: jsonValue, usage_reported: boolean2().optional().default(true) }),
    response: okResponse,
    async handler(ctx, args) {
      const db = ctx.db();
      await db.batch([
        db.insert(tokenUsage).values({ runId: args.run_id, campaignId: args.campaign_id, date: args.date, inputTokens: args.input_tokens, outputTokens: args.output_tokens, totalTokens: args.total_tokens, stages: args.stages }).onConflictDoUpdate({ target: tokenUsage.runId, set: { campaignId: args.campaign_id, date: args.date, inputTokens: args.input_tokens, outputTokens: args.output_tokens, totalTokens: args.total_tokens, stages: args.stages } }),
        db.update(runs).set({ tokens: args.stages, tokensInput: args.input_tokens, tokensOutput: args.output_tokens, tokensTotal: args.total_tokens, tokensReported: args.usage_reported }).where(eq(runs.runId, args.run_id))
      ]);
      ctx.invalidateQueries();
      return { ok: true };
    }
  })
};
export {
  Actions
};
