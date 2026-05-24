"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/sql.js/dist/sql-wasm.js
var require_sql_wasm = __commonJS({
  "node_modules/sql.js/dist/sql-wasm.js"(exports2, module2) {
    var initSqlJsPromise = void 0;
    var initSqlJs = function(moduleConfig) {
      if (initSqlJsPromise) {
        return initSqlJsPromise;
      }
      initSqlJsPromise = new Promise(function(resolveModule, reject) {
        var Module = typeof moduleConfig !== "undefined" ? moduleConfig : {};
        var originalOnAbortFunction = Module["onAbort"];
        Module["onAbort"] = function(errorThatCausedAbort) {
          reject(new Error(errorThatCausedAbort));
          if (originalOnAbortFunction) {
            originalOnAbortFunction(errorThatCausedAbort);
          }
        };
        Module["postRun"] = Module["postRun"] || [];
        Module["postRun"].push(function() {
          resolveModule(Module);
        });
        module2 = void 0;
        var k;
        k ||= typeof Module != "undefined" ? Module : {};
        var aa = !!globalThis.window, ba = !!globalThis.WorkerGlobalScope, ca = globalThis.process?.versions?.node && "renderer" != globalThis.process?.type;
        k.onRuntimeInitialized = function() {
          function a(f, l) {
            switch (typeof l) {
              case "boolean":
                bc(f, l ? 1 : 0);
                break;
              case "number":
                cc(f, l);
                break;
              case "string":
                dc(f, l, -1, -1);
                break;
              case "object":
                if (null === l)
                  lb(f);
                else if (null != l.length) {
                  var n = da(l.length);
                  m.set(l, n);
                  ec(f, n, l.length, -1);
                  ea(n);
                } else
                  sa(f, "Wrong API use : tried to return a value of an unknown type (" + l + ").", -1);
                break;
              default:
                lb(f);
            }
          }
          function b(f, l) {
            for (var n = [], p = 0; p < f; p += 1) {
              var u = r(l + 4 * p, "i32"), v = fc(u);
              if (1 === v || 2 === v)
                u = gc(u);
              else if (3 === v)
                u = hc(u);
              else if (4 === v) {
                v = u;
                u = ic(v);
                v = jc(v);
                for (var K = new Uint8Array(u), I = 0; I < u; I += 1)
                  K[I] = m[v + I];
                u = K;
              } else
                u = null;
              n.push(u);
            }
            return n;
          }
          function c(f, l) {
            this.Qa = f;
            this.db = l;
            this.Oa = 1;
            this.mb = [];
          }
          function d(f, l) {
            this.db = l;
            this.fb = fa(f);
            if (null === this.fb)
              throw Error("Unable to allocate memory for the SQL string");
            this.lb = this.fb;
            this.$a = this.sb = null;
          }
          function e(f) {
            this.filename = "dbfile_" + (4294967295 * Math.random() >>> 0);
            if (null != f) {
              var l = this.filename, n = "/", p = l;
              n && (n = "string" == typeof n ? n : ha(n), p = l ? ia(n + "/" + l) : n);
              l = ja(true, true);
              p = ka(
                p,
                l
              );
              if (f) {
                if ("string" == typeof f) {
                  n = Array(f.length);
                  for (var u = 0, v = f.length; u < v; ++u)
                    n[u] = f.charCodeAt(u);
                  f = n;
                }
                la(p, l | 146);
                n = ma(p, 577);
                na(n, f, 0, f.length, 0);
                oa(n);
                la(p, l);
              }
            }
            this.handleError(q(this.filename, g));
            this.db = r(g, "i32");
            ob(this.db);
            this.gb = {};
            this.Sa = {};
          }
          var g = y(4), h = k.cwrap, q = h("sqlite3_open", "number", ["string", "number"]), w = h("sqlite3_close_v2", "number", ["number"]), t = h("sqlite3_exec", "number", ["number", "string", "number", "number", "number"]), x = h("sqlite3_changes", "number", ["number"]), D = h(
            "sqlite3_prepare_v2",
            "number",
            ["number", "string", "number", "number", "number"]
          ), pb = h("sqlite3_sql", "string", ["number"]), lc = h("sqlite3_normalized_sql", "string", ["number"]), qb = h("sqlite3_prepare_v2", "number", ["number", "number", "number", "number", "number"]), mc = h("sqlite3_bind_text", "number", ["number", "number", "number", "number", "number"]), rb = h("sqlite3_bind_blob", "number", ["number", "number", "number", "number", "number"]), nc = h("sqlite3_bind_double", "number", ["number", "number", "number"]), oc = h("sqlite3_bind_int", "number", [
            "number",
            "number",
            "number"
          ]), pc = h("sqlite3_bind_parameter_index", "number", ["number", "string"]), qc = h("sqlite3_step", "number", ["number"]), rc = h("sqlite3_errmsg", "string", ["number"]), sc = h("sqlite3_column_count", "number", ["number"]), tc = h("sqlite3_data_count", "number", ["number"]), uc = h("sqlite3_column_double", "number", ["number", "number"]), sb = h("sqlite3_column_text", "string", ["number", "number"]), vc = h("sqlite3_column_blob", "number", ["number", "number"]), wc = h("sqlite3_column_bytes", "number", ["number", "number"]), xc = h(
            "sqlite3_column_type",
            "number",
            ["number", "number"]
          ), yc = h("sqlite3_column_name", "string", ["number", "number"]), zc = h("sqlite3_reset", "number", ["number"]), Ac = h("sqlite3_clear_bindings", "number", ["number"]), Bc = h("sqlite3_finalize", "number", ["number"]), tb = h("sqlite3_create_function_v2", "number", "number string number number number number number number number".split(" ")), fc = h("sqlite3_value_type", "number", ["number"]), ic = h("sqlite3_value_bytes", "number", ["number"]), hc = h("sqlite3_value_text", "string", ["number"]), jc = h(
            "sqlite3_value_blob",
            "number",
            ["number"]
          ), gc = h("sqlite3_value_double", "number", ["number"]), cc = h("sqlite3_result_double", "", ["number", "number"]), lb = h("sqlite3_result_null", "", ["number"]), dc = h("sqlite3_result_text", "", ["number", "string", "number", "number"]), ec = h("sqlite3_result_blob", "", ["number", "number", "number", "number"]), bc = h("sqlite3_result_int", "", ["number", "number"]), sa = h("sqlite3_result_error", "", ["number", "string", "number"]), ub = h("sqlite3_aggregate_context", "number", ["number", "number"]), ob = h(
            "RegisterExtensionFunctions",
            "number",
            ["number"]
          ), vb = h("sqlite3_update_hook", "number", ["number", "number", "number"]);
          c.prototype.bind = function(f) {
            if (!this.Qa)
              throw "Statement closed";
            this.reset();
            return Array.isArray(f) ? this.Gb(f) : null != f && "object" === typeof f ? this.Hb(f) : true;
          };
          c.prototype.step = function() {
            if (!this.Qa)
              throw "Statement closed";
            this.Oa = 1;
            var f = qc(this.Qa);
            switch (f) {
              case 100:
                return true;
              case 101:
                return false;
              default:
                throw this.db.handleError(f);
            }
          };
          c.prototype.Ab = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            return uc(this.Qa, f);
          };
          c.prototype.Ob = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            f = sb(this.Qa, f);
            if ("function" !== typeof BigInt)
              throw Error("BigInt is not supported");
            return BigInt(f);
          };
          c.prototype.Tb = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            return sb(this.Qa, f);
          };
          c.prototype.getBlob = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            var l = wc(this.Qa, f);
            f = vc(this.Qa, f);
            for (var n = new Uint8Array(l), p = 0; p < l; p += 1)
              n[p] = m[f + p];
            return n;
          };
          c.prototype.get = function(f, l) {
            l = l || {};
            null != f && this.bind(f) && this.step();
            f = [];
            for (var n = tc(this.Qa), p = 0; p < n; p += 1)
              switch (xc(this.Qa, p)) {
                case 1:
                  var u = l.useBigInt ? this.Ob(p) : this.Ab(p);
                  f.push(u);
                  break;
                case 2:
                  f.push(this.Ab(p));
                  break;
                case 3:
                  f.push(this.Tb(p));
                  break;
                case 4:
                  f.push(this.getBlob(p));
                  break;
                default:
                  f.push(null);
              }
            return f;
          };
          c.prototype.qb = function() {
            for (var f = [], l = sc(this.Qa), n = 0; n < l; n += 1)
              f.push(yc(this.Qa, n));
            return f;
          };
          c.prototype.zb = function(f, l) {
            f = this.get(f, l);
            l = this.qb();
            for (var n = {}, p = 0; p < l.length; p += 1)
              n[l[p]] = f[p];
            return n;
          };
          c.prototype.Sb = function() {
            return pb(this.Qa);
          };
          c.prototype.Pb = function() {
            return lc(this.Qa);
          };
          c.prototype.run = function(f) {
            null != f && this.bind(f);
            this.step();
            return this.reset();
          };
          c.prototype.wb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            f = fa(f);
            this.mb.push(f);
            this.db.handleError(mc(this.Qa, l, f, -1, 0));
          };
          c.prototype.Fb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            var n = da(f.length);
            m.set(f, n);
            this.mb.push(n);
            this.db.handleError(rb(this.Qa, l, n, f.length, 0));
          };
          c.prototype.vb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            this.db.handleError((f === (f | 0) ? oc : nc)(
              this.Qa,
              l,
              f
            ));
          };
          c.prototype.Ib = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            rb(this.Qa, f, 0, 0, 0);
          };
          c.prototype.xb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            switch (typeof f) {
              case "string":
                this.wb(f, l);
                return;
              case "number":
                this.vb(f, l);
                return;
              case "bigint":
                this.wb(f.toString(), l);
                return;
              case "boolean":
                this.vb(f + 0, l);
                return;
              case "object":
                if (null === f) {
                  this.Ib(l);
                  return;
                }
                if (null != f.length) {
                  this.Fb(f, l);
                  return;
                }
            }
            throw "Wrong API use : tried to bind a value of an unknown type (" + f + ").";
          };
          c.prototype.Hb = function(f) {
            var l = this;
            Object.keys(f).forEach(function(n) {
              var p = pc(l.Qa, n);
              0 !== p && l.xb(f[n], p);
            });
            return true;
          };
          c.prototype.Gb = function(f) {
            for (var l = 0; l < f.length; l += 1)
              this.xb(f[l], l + 1);
            return true;
          };
          c.prototype.reset = function() {
            this.freemem();
            return 0 === Ac(this.Qa) && 0 === zc(this.Qa);
          };
          c.prototype.freemem = function() {
            for (var f; void 0 !== (f = this.mb.pop()); )
              ea(f);
          };
          c.prototype.Ya = function() {
            this.freemem();
            var f = 0 === Bc(this.Qa);
            delete this.db.gb[this.Qa];
            this.Qa = 0;
            return f;
          };
          d.prototype.next = function() {
            if (null === this.fb)
              return { done: true };
            null !== this.$a && (this.$a.Ya(), this.$a = null);
            if (!this.db.db)
              throw this.ob(), Error("Database closed");
            var f = pa(), l = y(4);
            qa(g);
            qa(l);
            try {
              this.db.handleError(qb(this.db.db, this.lb, -1, g, l));
              this.lb = r(l, "i32");
              var n = r(g, "i32");
              if (0 === n)
                return this.ob(), { done: true };
              this.$a = new c(n, this.db);
              this.db.gb[n] = this.$a;
              return { value: this.$a, done: false };
            } catch (p) {
              throw this.sb = z(this.lb), this.ob(), p;
            } finally {
              ra(f);
            }
          };
          d.prototype.ob = function() {
            ea(this.fb);
            this.fb = null;
          };
          d.prototype.Qb = function() {
            return null !== this.sb ? this.sb : z(this.lb);
          };
          "function" === typeof Symbol && "symbol" === typeof Symbol.iterator && (d.prototype[Symbol.iterator] = function() {
            return this;
          });
          e.prototype.run = function(f, l) {
            if (!this.db)
              throw "Database closed";
            if (l) {
              f = this.tb(f, l);
              try {
                f.step();
              } finally {
                f.Ya();
              }
            } else
              this.handleError(t(this.db, f, 0, 0, g));
            return this;
          };
          e.prototype.exec = function(f, l, n) {
            if (!this.db)
              throw "Database closed";
            var p = null, u = null, v = null;
            try {
              v = u = fa(f);
              var K = y(4);
              for (f = []; 0 !== r(v, "i8"); ) {
                qa(g);
                qa(K);
                this.handleError(qb(this.db, v, -1, g, K));
                var I = r(
                  g,
                  "i32"
                );
                v = r(K, "i32");
                if (0 !== I) {
                  var H = null;
                  p = new c(I, this);
                  for (null != l && p.bind(l); p.step(); )
                    null === H && (H = { columns: p.qb(), values: [] }, f.push(H)), H.values.push(p.get(null, n));
                  p.Ya();
                }
              }
              return f;
            } catch (L) {
              throw p && p.Ya(), L;
            } finally {
              u && ea(u);
            }
          };
          e.prototype.Mb = function(f, l, n, p, u) {
            "function" === typeof l && (p = n, n = l, l = void 0);
            f = this.tb(f, l);
            try {
              for (; f.step(); )
                n(f.zb(null, u));
            } finally {
              f.Ya();
            }
            if ("function" === typeof p)
              return p();
          };
          e.prototype.tb = function(f, l) {
            qa(g);
            this.handleError(D(this.db, f, -1, g, 0));
            f = r(g, "i32");
            if (0 === f)
              throw "Nothing to prepare";
            var n = new c(f, this);
            null != l && n.bind(l);
            return this.gb[f] = n;
          };
          e.prototype.Ub = function(f) {
            return new d(f, this);
          };
          e.prototype.Nb = function() {
            Object.values(this.gb).forEach(function(l) {
              l.Ya();
            });
            Object.values(this.Sa).forEach(A);
            this.Sa = {};
            this.handleError(w(this.db));
            var f = ta(this.filename);
            this.handleError(q(this.filename, g));
            this.db = r(g, "i32");
            ob(this.db);
            return f;
          };
          e.prototype.close = function() {
            null !== this.db && (Object.values(this.gb).forEach(function(f) {
              f.Ya();
            }), Object.values(this.Sa).forEach(A), this.Sa = {}, this.Za && (A(this.Za), this.Za = void 0), this.handleError(w(this.db)), ua("/" + this.filename), this.db = null);
          };
          e.prototype.handleError = function(f) {
            if (0 === f)
              return null;
            f = rc(this.db);
            throw Error(f);
          };
          e.prototype.Rb = function() {
            return x(this.db);
          };
          e.prototype.Kb = function(f, l) {
            Object.prototype.hasOwnProperty.call(this.Sa, f) && (A(this.Sa[f]), delete this.Sa[f]);
            var n = va(function(p, u, v) {
              u = b(u, v);
              try {
                var K = l.apply(null, u);
              } catch (I) {
                sa(p, I, -1);
                return;
              }
              a(p, K);
            }, "viii");
            this.Sa[f] = n;
            this.handleError(tb(
              this.db,
              f,
              l.length,
              1,
              0,
              n,
              0,
              0,
              0
            ));
            return this;
          };
          e.prototype.Jb = function(f, l) {
            var n = l.init || function() {
              return null;
            }, p = l.finalize || function(H) {
              return H;
            }, u = l.step;
            if (!u)
              throw "An aggregate function must have a step function in " + f;
            var v = {};
            Object.hasOwnProperty.call(this.Sa, f) && (A(this.Sa[f]), delete this.Sa[f]);
            l = f + "__finalize";
            Object.hasOwnProperty.call(this.Sa, l) && (A(this.Sa[l]), delete this.Sa[l]);
            var K = va(function(H, L, Pa) {
              var V = ub(H, 1);
              Object.hasOwnProperty.call(v, V) || (v[V] = n());
              L = b(L, Pa);
              L = [v[V]].concat(L);
              try {
                v[V] = u.apply(null, L);
              } catch (Dc) {
                delete v[V], sa(H, Dc, -1);
              }
            }, "viii"), I = va(function(H) {
              var L = ub(H, 1);
              try {
                var Pa = p(v[L]);
              } catch (V) {
                delete v[L];
                sa(H, V, -1);
                return;
              }
              a(H, Pa);
              delete v[L];
            }, "vi");
            this.Sa[f] = K;
            this.Sa[l] = I;
            this.handleError(tb(this.db, f, u.length - 1, 1, 0, 0, K, I, 0));
            return this;
          };
          e.prototype.Zb = function(f) {
            this.Za && (vb(this.db, 0, 0), A(this.Za), this.Za = void 0);
            if (!f)
              return this;
            this.Za = va(function(l, n, p, u, v) {
              switch (n) {
                case 18:
                  l = "insert";
                  break;
                case 23:
                  l = "update";
                  break;
                case 9:
                  l = "delete";
                  break;
                default:
                  throw "unknown operationCode in updateHook callback: " + n;
              }
              p = z(p);
              u = z(u);
              if (v > Number.MAX_SAFE_INTEGER)
                throw "rowId too big to fit inside a Number";
              f(l, p, u, Number(v));
            }, "viiiij");
            vb(this.db, this.Za, 0);
            return this;
          };
          c.prototype.bind = c.prototype.bind;
          c.prototype.step = c.prototype.step;
          c.prototype.get = c.prototype.get;
          c.prototype.getColumnNames = c.prototype.qb;
          c.prototype.getAsObject = c.prototype.zb;
          c.prototype.getSQL = c.prototype.Sb;
          c.prototype.getNormalizedSQL = c.prototype.Pb;
          c.prototype.run = c.prototype.run;
          c.prototype.reset = c.prototype.reset;
          c.prototype.freemem = c.prototype.freemem;
          c.prototype.free = c.prototype.Ya;
          d.prototype.next = d.prototype.next;
          d.prototype.getRemainingSQL = d.prototype.Qb;
          e.prototype.run = e.prototype.run;
          e.prototype.exec = e.prototype.exec;
          e.prototype.each = e.prototype.Mb;
          e.prototype.prepare = e.prototype.tb;
          e.prototype.iterateStatements = e.prototype.Ub;
          e.prototype["export"] = e.prototype.Nb;
          e.prototype.close = e.prototype.close;
          e.prototype.handleError = e.prototype.handleError;
          e.prototype.getRowsModified = e.prototype.Rb;
          e.prototype.create_function = e.prototype.Kb;
          e.prototype.create_aggregate = e.prototype.Jb;
          e.prototype.updateHook = e.prototype.Zb;
          k.Database = e;
        };
        var wa = "./this.program", xa = (a, b) => {
          throw b;
        }, ya = globalThis.document?.currentScript?.src;
        "undefined" != typeof __filename ? ya = __filename : ba && (ya = self.location.href);
        var za = "", Aa, Ba;
        if (ca) {
          var fs8 = require("node:fs");
          za = __dirname + "/";
          Ba = (a) => {
            a = Ca(a) ? new URL(a) : a;
            return fs8.readFileSync(a);
          };
          Aa = async (a) => {
            a = Ca(a) ? new URL(a) : a;
            return fs8.readFileSync(a, void 0);
          };
          1 < process.argv.length && (wa = process.argv[1].replace(/\\/g, "/"));
          process.argv.slice(2);
          "undefined" != typeof module2 && (module2.exports = k);
          xa = (a, b) => {
            process.exitCode = a;
            throw b;
          };
        } else if (aa || ba) {
          try {
            za = new URL(".", ya).href;
          } catch {
          }
          ba && (Ba = (a) => {
            var b = new XMLHttpRequest();
            b.open("GET", a, false);
            b.responseType = "arraybuffer";
            b.send(null);
            return new Uint8Array(b.response);
          });
          Aa = async (a) => {
            if (Ca(a))
              return new Promise((c, d) => {
                var e = new XMLHttpRequest();
                e.open("GET", a, true);
                e.responseType = "arraybuffer";
                e.onload = () => {
                  200 == e.status || 0 == e.status && e.response ? c(e.response) : d(e.status);
                };
                e.onerror = d;
                e.send(null);
              });
            var b = await fetch(a, { credentials: "same-origin" });
            if (b.ok)
              return b.arrayBuffer();
            throw Error(b.status + " : " + b.url);
          };
        }
        var Da = console.log.bind(console), B = console.error.bind(console), Ea, Fa = false, Ga, Ca = (a) => a.startsWith("file://"), m, C, Ha, E, F, Ia, Ja, G;
        function Ka() {
          var a = La.buffer;
          m = new Int8Array(a);
          Ha = new Int16Array(a);
          C = new Uint8Array(a);
          new Uint16Array(a);
          E = new Int32Array(a);
          F = new Uint32Array(a);
          Ia = new Float32Array(a);
          Ja = new Float64Array(a);
          G = new BigInt64Array(a);
          new BigUint64Array(a);
        }
        function Ma(a) {
          k.onAbort?.(a);
          a = "Aborted(" + a + ")";
          B(a);
          Fa = true;
          throw new WebAssembly.RuntimeError(a + ". Build with -sASSERTIONS for more info.");
        }
        var Na;
        async function Oa(a) {
          if (!Ea)
            try {
              var b = await Aa(a);
              return new Uint8Array(b);
            } catch {
            }
          if (a == Na && Ea)
            a = new Uint8Array(Ea);
          else if (Ba)
            a = Ba(a);
          else
            throw "both async and sync fetching of the wasm failed";
          return a;
        }
        async function Qa(a, b) {
          try {
            var c = await Oa(a);
            return await WebAssembly.instantiate(c, b);
          } catch (d) {
            B(`failed to asynchronously prepare wasm: ${d}`), Ma(d);
          }
        }
        async function Ra(a) {
          var b = Na;
          if (!Ea && !Ca(b) && !ca)
            try {
              var c = fetch(b, { credentials: "same-origin" });
              return await WebAssembly.instantiateStreaming(c, a);
            } catch (d) {
              B(`wasm streaming compile failed: ${d}`), B("falling back to ArrayBuffer instantiation");
            }
          return Qa(b, a);
        }
        class Sa {
          name = "ExitStatus";
          constructor(a) {
            this.message = `Program terminated with exit(${a})`;
            this.status = a;
          }
        }
        var Ta = (a) => {
          for (; 0 < a.length; )
            a.shift()(k);
        }, Ua = [], Va = [], Wa = () => {
          var a = k.preRun.shift();
          Va.push(a);
        }, J = 0, Xa = null;
        function r(a, b = "i8") {
          b.endsWith("*") && (b = "*");
          switch (b) {
            case "i1":
              return m[a];
            case "i8":
              return m[a];
            case "i16":
              return Ha[a >> 1];
            case "i32":
              return E[a >> 2];
            case "i64":
              return G[a >> 3];
            case "float":
              return Ia[a >> 2];
            case "double":
              return Ja[a >> 3];
            case "*":
              return F[a >> 2];
            default:
              Ma(`invalid type for getValue: ${b}`);
          }
        }
        var Ya = true;
        function qa(a) {
          var b = "i32";
          b.endsWith("*") && (b = "*");
          switch (b) {
            case "i1":
              m[a] = 0;
              break;
            case "i8":
              m[a] = 0;
              break;
            case "i16":
              Ha[a >> 1] = 0;
              break;
            case "i32":
              E[a >> 2] = 0;
              break;
            case "i64":
              G[a >> 3] = BigInt(0);
              break;
            case "float":
              Ia[a >> 2] = 0;
              break;
            case "double":
              Ja[a >> 3] = 0;
              break;
            case "*":
              F[a >> 2] = 0;
              break;
            default:
              Ma(`invalid type for setValue: ${b}`);
          }
        }
        var Za = new TextDecoder(), $a = (a, b, c, d) => {
          c = b + c;
          if (d)
            return c;
          for (; a[b] && !(b >= c); )
            ++b;
          return b;
        }, z = (a, b, c) => a ? Za.decode(C.subarray(a, $a(C, a, b, c))) : "", ab = (a, b) => {
          for (var c = 0, d = a.length - 1; 0 <= d; d--) {
            var e = a[d];
            "." === e ? a.splice(d, 1) : ".." === e ? (a.splice(d, 1), c++) : c && (a.splice(d, 1), c--);
          }
          if (b)
            for (; c; c--)
              a.unshift("..");
          return a;
        }, ia = (a) => {
          var b = "/" === a.charAt(0), c = "/" === a.slice(-1);
          (a = ab(a.split("/").filter((d) => !!d), !b).join("/")) || b || (a = ".");
          a && c && (a += "/");
          return (b ? "/" : "") + a;
        }, bb = (a) => {
          var b = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(a).slice(1);
          a = b[0];
          b = b[1];
          if (!a && !b)
            return ".";
          b &&= b.slice(0, -1);
          return a + b;
        }, cb = (a) => a && a.match(/([^\/]+|\/)\/*$/)[1], db = () => {
          if (ca) {
            var a = require("node:crypto");
            return (b) => a.randomFillSync(b);
          }
          return (b) => crypto.getRandomValues(b);
        }, eb = (a) => {
          (eb = db())(a);
        }, fb = (...a) => {
          for (var b = "", c = false, d = a.length - 1; -1 <= d && !c; d--) {
            c = 0 <= d ? a[d] : "/";
            if ("string" != typeof c)
              throw new TypeError("Arguments to path.resolve must be strings");
            if (!c)
              return "";
            b = c + "/" + b;
            c = "/" === c.charAt(0);
          }
          b = ab(b.split("/").filter((e) => !!e), !c).join("/");
          return (c ? "/" : "") + b || ".";
        }, gb = (a) => {
          var b = $a(a, 0);
          return Za.decode(a.buffer ? a.subarray(0, b) : new Uint8Array(a.slice(0, b)));
        }, hb = [], ib = (a) => {
          for (var b = 0, c = 0; c < a.length; ++c) {
            var d = a.charCodeAt(c);
            127 >= d ? b++ : 2047 >= d ? b += 2 : 55296 <= d && 57343 >= d ? (b += 4, ++c) : b += 3;
          }
          return b;
        }, M = (a, b, c, d) => {
          if (!(0 < d))
            return 0;
          var e = c;
          d = c + d - 1;
          for (var g = 0; g < a.length; ++g) {
            var h = a.codePointAt(g);
            if (127 >= h) {
              if (c >= d)
                break;
              b[c++] = h;
            } else if (2047 >= h) {
              if (c + 1 >= d)
                break;
              b[c++] = 192 | h >> 6;
              b[c++] = 128 | h & 63;
            } else if (65535 >= h) {
              if (c + 2 >= d)
                break;
              b[c++] = 224 | h >> 12;
              b[c++] = 128 | h >> 6 & 63;
              b[c++] = 128 | h & 63;
            } else {
              if (c + 3 >= d)
                break;
              b[c++] = 240 | h >> 18;
              b[c++] = 128 | h >> 12 & 63;
              b[c++] = 128 | h >> 6 & 63;
              b[c++] = 128 | h & 63;
              g++;
            }
          }
          b[c] = 0;
          return c - e;
        }, jb = [];
        function kb(a, b) {
          jb[a] = { input: [], output: [], eb: b };
          mb(a, nb);
        }
        var nb = { open(a) {
          var b = jb[a.node.rdev];
          if (!b)
            throw new N(43);
          a.tty = b;
          a.seekable = false;
        }, close(a) {
          a.tty.eb.fsync(a.tty);
        }, fsync(a) {
          a.tty.eb.fsync(a.tty);
        }, read(a, b, c, d) {
          if (!a.tty || !a.tty.eb.Bb)
            throw new N(60);
          for (var e = 0, g = 0; g < d; g++) {
            try {
              var h = a.tty.eb.Bb(a.tty);
            } catch (q) {
              throw new N(29);
            }
            if (void 0 === h && 0 === e)
              throw new N(6);
            if (null === h || void 0 === h)
              break;
            e++;
            b[c + g] = h;
          }
          e && (a.node.atime = Date.now());
          return e;
        }, write(a, b, c, d) {
          if (!a.tty || !a.tty.eb.ub)
            throw new N(60);
          try {
            for (var e = 0; e < d; e++)
              a.tty.eb.ub(a.tty, b[c + e]);
          } catch (g) {
            throw new N(29);
          }
          d && (a.node.mtime = a.node.ctime = Date.now());
          return e;
        } }, wb = { Bb() {
          a: {
            if (!hb.length) {
              var a = null;
              if (ca) {
                var b = Buffer.alloc(256), c = 0, d = process.stdin.fd;
                try {
                  c = fs8.readSync(d, b, 0, 256);
                } catch (e) {
                  if (e.toString().includes("EOF"))
                    c = 0;
                  else
                    throw e;
                }
                0 < c && (a = b.slice(0, c).toString("utf-8"));
              } else
                globalThis.window?.prompt && (a = window.prompt("Input: "), null !== a && (a += "\n"));
              if (!a) {
                a = null;
                break a;
              }
              b = Array(ib(a) + 1);
              a = M(a, b, 0, b.length);
              b.length = a;
              hb = b;
            }
            a = hb.shift();
          }
          return a;
        }, ub(a, b) {
          null === b || 10 === b ? (Da(gb(a.output)), a.output = []) : 0 != b && a.output.push(b);
        }, fsync(a) {
          0 < a.output?.length && (Da(gb(a.output)), a.output = []);
        }, hc() {
          return { bc: 25856, dc: 5, ac: 191, cc: 35387, $b: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
        }, ic() {
          return 0;
        }, jc() {
          return [24, 80];
        } }, xb = { ub(a, b) {
          null === b || 10 === b ? (B(gb(a.output)), a.output = []) : 0 != b && a.output.push(b);
        }, fsync(a) {
          0 < a.output?.length && (B(gb(a.output)), a.output = []);
        } }, O = { Wa: null, Xa() {
          return O.createNode(null, "/", 16895, 0);
        }, createNode(a, b, c, d) {
          if (24576 === (c & 61440) || 4096 === (c & 61440))
            throw new N(63);
          O.Wa || (O.Wa = { dir: { node: { Ta: O.La.Ta, Ua: O.La.Ua, lookup: O.La.lookup, ib: O.La.ib, rename: O.La.rename, unlink: O.La.unlink, rmdir: O.La.rmdir, readdir: O.La.readdir, symlink: O.La.symlink }, stream: { Va: O.Ma.Va } }, file: { node: { Ta: O.La.Ta, Ua: O.La.Ua }, stream: { Va: O.Ma.Va, read: O.Ma.read, write: O.Ma.write, jb: O.Ma.jb, kb: O.Ma.kb } }, link: { node: { Ta: O.La.Ta, Ua: O.La.Ua, readlink: O.La.readlink }, stream: {} }, yb: { node: { Ta: O.La.Ta, Ua: O.La.Ua }, stream: yb } });
          c = zb(a, b, c, d);
          P(c.mode) ? (c.La = O.Wa.dir.node, c.Ma = O.Wa.dir.stream, c.Na = {}) : 32768 === (c.mode & 61440) ? (c.La = O.Wa.file.node, c.Ma = O.Wa.file.stream, c.Ra = 0, c.Na = null) : 40960 === (c.mode & 61440) ? (c.La = O.Wa.link.node, c.Ma = O.Wa.link.stream) : 8192 === (c.mode & 61440) && (c.La = O.Wa.yb.node, c.Ma = O.Wa.yb.stream);
          c.atime = c.mtime = c.ctime = Date.now();
          a && (a.Na[b] = c, a.atime = a.mtime = a.ctime = c.atime);
          return c;
        }, fc(a) {
          return a.Na ? a.Na.subarray ? a.Na.subarray(0, a.Ra) : new Uint8Array(a.Na) : new Uint8Array(0);
        }, La: {
          Ta(a) {
            var b = {};
            b.dev = 8192 === (a.mode & 61440) ? a.id : 1;
            b.ino = a.id;
            b.mode = a.mode;
            b.nlink = 1;
            b.uid = 0;
            b.gid = 0;
            b.rdev = a.rdev;
            P(a.mode) ? b.size = 4096 : 32768 === (a.mode & 61440) ? b.size = a.Ra : 40960 === (a.mode & 61440) ? b.size = a.link.length : b.size = 0;
            b.atime = new Date(a.atime);
            b.mtime = new Date(a.mtime);
            b.ctime = new Date(a.ctime);
            b.blksize = 4096;
            b.blocks = Math.ceil(b.size / b.blksize);
            return b;
          },
          Ua(a, b) {
            for (var c of ["mode", "atime", "mtime", "ctime"])
              null != b[c] && (a[c] = b[c]);
            void 0 !== b.size && (b = b.size, a.Ra != b && (0 == b ? (a.Na = null, a.Ra = 0) : (c = a.Na, a.Na = new Uint8Array(b), c && a.Na.set(c.subarray(0, Math.min(b, a.Ra))), a.Ra = b)));
          },
          lookup() {
            O.nb || (O.nb = new N(44), O.nb.stack = "<generic error, no stack>");
            throw O.nb;
          },
          ib(a, b, c, d) {
            return O.createNode(a, b, c, d);
          },
          rename(a, b, c) {
            try {
              var d = Q(b, c);
            } catch (g) {
            }
            if (d) {
              if (P(a.mode))
                for (var e in d.Na)
                  throw new N(55);
              Ab(d);
            }
            delete a.parent.Na[a.name];
            b.Na[c] = a;
            a.name = c;
            b.ctime = b.mtime = a.parent.ctime = a.parent.mtime = Date.now();
          },
          unlink(a, b) {
            delete a.Na[b];
            a.ctime = a.mtime = Date.now();
          },
          rmdir(a, b) {
            var c = Q(a, b), d;
            for (d in c.Na)
              throw new N(55);
            delete a.Na[b];
            a.ctime = a.mtime = Date.now();
          },
          readdir(a) {
            return [".", "..", ...Object.keys(a.Na)];
          },
          symlink(a, b, c) {
            a = O.createNode(a, b, 41471, 0);
            a.link = c;
            return a;
          },
          readlink(a) {
            if (40960 !== (a.mode & 61440))
              throw new N(28);
            return a.link;
          }
        }, Ma: { read(a, b, c, d, e) {
          var g = a.node.Na;
          if (e >= a.node.Ra)
            return 0;
          a = Math.min(a.node.Ra - e, d);
          if (8 < a && g.subarray)
            b.set(g.subarray(e, e + a), c);
          else
            for (d = 0; d < a; d++)
              b[c + d] = g[e + d];
          return a;
        }, write(a, b, c, d, e, g) {
          b.buffer === m.buffer && (g = false);
          if (!d)
            return 0;
          a = a.node;
          a.mtime = a.ctime = Date.now();
          if (b.subarray && (!a.Na || a.Na.subarray)) {
            if (g)
              return a.Na = b.subarray(c, c + d), a.Ra = d;
            if (0 === a.Ra && 0 === e)
              return a.Na = b.slice(c, c + d), a.Ra = d;
            if (e + d <= a.Ra)
              return a.Na.set(b.subarray(c, c + d), e), d;
          }
          g = e + d;
          var h = a.Na ? a.Na.length : 0;
          h >= g || (g = Math.max(g, h * (1048576 > h ? 2 : 1.125) >>> 0), 0 != h && (g = Math.max(g, 256)), h = a.Na, a.Na = new Uint8Array(g), 0 < a.Ra && a.Na.set(h.subarray(0, a.Ra), 0));
          if (a.Na.subarray && b.subarray)
            a.Na.set(b.subarray(c, c + d), e);
          else
            for (g = 0; g < d; g++)
              a.Na[e + g] = b[c + g];
          a.Ra = Math.max(a.Ra, e + d);
          return d;
        }, Va(a, b, c) {
          1 === c ? b += a.position : 2 === c && 32768 === (a.node.mode & 61440) && (b += a.node.Ra);
          if (0 > b)
            throw new N(28);
          return b;
        }, jb(a, b, c, d, e) {
          if (32768 !== (a.node.mode & 61440))
            throw new N(43);
          a = a.node.Na;
          if (e & 2 || !a || a.buffer !== m.buffer) {
            e = true;
            d = 65536 * Math.ceil(b / 65536);
            var g = Bb(65536, d);
            g && C.fill(0, g, g + d);
            d = g;
            if (!d)
              throw new N(48);
            if (a) {
              if (0 < c || c + b < a.length)
                a.subarray ? a = a.subarray(c, c + b) : a = Array.prototype.slice.call(a, c, c + b);
              m.set(a, d);
            }
          } else
            e = false, d = a.byteOffset;
          return { Xb: d, Eb: e };
        }, kb(a, b, c, d) {
          O.Ma.write(a, b, 0, d, c, false);
          return 0;
        } } }, ja = (a, b) => {
          var c = 0;
          a && (c |= 365);
          b && (c |= 146);
          return c;
        }, Cb = null, Db = {}, Eb = [], Fb = 1, R = null, Gb = false, Hb = true, N = class {
          name = "ErrnoError";
          constructor(a) {
            this.Pa = a;
          }
        }, Ib = class {
          hb = {};
          node = null;
          get flags() {
            return this.hb.flags;
          }
          set flags(a) {
            this.hb.flags = a;
          }
          get position() {
            return this.hb.position;
          }
          set position(a) {
            this.hb.position = a;
          }
        }, Jb = class {
          La = {};
          Ma = {};
          bb = null;
          constructor(a, b, c, d) {
            a ||= this;
            this.parent = a;
            this.Xa = a.Xa;
            this.id = Fb++;
            this.name = b;
            this.mode = c;
            this.rdev = d;
            this.atime = this.mtime = this.ctime = Date.now();
          }
          get read() {
            return 365 === (this.mode & 365);
          }
          set read(a) {
            a ? this.mode |= 365 : this.mode &= -366;
          }
          get write() {
            return 146 === (this.mode & 146);
          }
          set write(a) {
            a ? this.mode |= 146 : this.mode &= -147;
          }
        };
        function S(a, b = {}) {
          if (!a)
            throw new N(44);
          b.pb ?? (b.pb = true);
          "/" === a.charAt(0) || (a = "//" + a);
          var c = 0;
          a:
            for (; 40 > c; c++) {
              a = a.split("/").filter((q) => !!q);
              for (var d = Cb, e = "/", g = 0; g < a.length; g++) {
                var h = g === a.length - 1;
                if (h && b.parent)
                  break;
                if ("." !== a[g])
                  if (".." === a[g])
                    if (e = bb(e), d === d.parent) {
                      a = e + "/" + a.slice(g + 1).join("/");
                      c--;
                      continue a;
                    } else
                      d = d.parent;
                  else {
                    e = ia(e + "/" + a[g]);
                    try {
                      d = Q(d, a[g]);
                    } catch (q) {
                      if (44 === q?.Pa && h && b.Wb)
                        return { path: e };
                      throw q;
                    }
                    !d.bb || h && !b.pb || (d = d.bb.root);
                    if (40960 === (d.mode & 61440) && (!h || b.ab)) {
                      if (!d.La.readlink)
                        throw new N(52);
                      d = d.La.readlink(d);
                      "/" === d.charAt(0) || (d = bb(e) + "/" + d);
                      a = d + "/" + a.slice(g + 1).join("/");
                      continue a;
                    }
                  }
              }
              return { path: e, node: d };
            }
          throw new N(32);
        }
        function ha(a) {
          for (var b; ; ) {
            if (a === a.parent)
              return a = a.Xa.Db, b ? "/" !== a[a.length - 1] ? `${a}/${b}` : a + b : a;
            b = b ? `${a.name}/${b}` : a.name;
            a = a.parent;
          }
        }
        function Kb(a, b) {
          for (var c = 0, d = 0; d < b.length; d++)
            c = (c << 5) - c + b.charCodeAt(d) | 0;
          return (a + c >>> 0) % R.length;
        }
        function Ab(a) {
          var b = Kb(a.parent.id, a.name);
          if (R[b] === a)
            R[b] = a.cb;
          else
            for (b = R[b]; b; ) {
              if (b.cb === a) {
                b.cb = a.cb;
                break;
              }
              b = b.cb;
            }
        }
        function Q(a, b) {
          var c = P(a.mode) ? (c = Lb(a, "x")) ? c : a.La.lookup ? 0 : 2 : 54;
          if (c)
            throw new N(c);
          for (c = R[Kb(a.id, b)]; c; c = c.cb) {
            var d = c.name;
            if (c.parent.id === a.id && d === b)
              return c;
          }
          return a.La.lookup(a, b);
        }
        function zb(a, b, c, d) {
          a = new Jb(a, b, c, d);
          b = Kb(a.parent.id, a.name);
          a.cb = R[b];
          return R[b] = a;
        }
        function P(a) {
          return 16384 === (a & 61440);
        }
        function Lb(a, b) {
          return Hb ? 0 : b.includes("r") && !(a.mode & 292) || b.includes("w") && !(a.mode & 146) || b.includes("x") && !(a.mode & 73) ? 2 : 0;
        }
        function Mb(a, b) {
          if (!P(a.mode))
            return 54;
          try {
            return Q(a, b), 20;
          } catch (c) {
          }
          return Lb(a, "wx");
        }
        function Nb(a, b, c) {
          try {
            var d = Q(a, b);
          } catch (e) {
            return e.Pa;
          }
          if (a = Lb(a, "wx"))
            return a;
          if (c) {
            if (!P(d.mode))
              return 54;
            if (d === d.parent || "/" === ha(d))
              return 10;
          } else if (P(d.mode))
            return 31;
          return 0;
        }
        function Ob(a) {
          if (!a)
            throw new N(63);
          return a;
        }
        function T(a) {
          a = Eb[a];
          if (!a)
            throw new N(8);
          return a;
        }
        function Pb(a, b = -1) {
          a = Object.assign(new Ib(), a);
          if (-1 == b)
            a: {
              for (b = 0; 4096 >= b; b++)
                if (!Eb[b])
                  break a;
              throw new N(33);
            }
          a.fd = b;
          return Eb[b] = a;
        }
        function Qb(a, b = -1) {
          a = Pb(a, b);
          a.Ma?.ec?.(a);
          return a;
        }
        function Rb(a, b, c) {
          var d = a?.Ma.Ua;
          a = d ? a : b;
          d ??= b.La.Ua;
          Ob(d);
          d(a, c);
        }
        var yb = { open(a) {
          a.Ma = Db[a.node.rdev].Ma;
          a.Ma.open?.(a);
        }, Va() {
          throw new N(70);
        } };
        function mb(a, b) {
          Db[a] = { Ma: b };
        }
        function Sb(a, b) {
          var c = "/" === b;
          if (c && Cb)
            throw new N(10);
          if (!c && b) {
            var d = S(b, { pb: false });
            b = d.path;
            d = d.node;
            if (d.bb)
              throw new N(10);
            if (!P(d.mode))
              throw new N(54);
          }
          b = { type: a, kc: {}, Db: b, Vb: [] };
          a = a.Xa(b);
          a.Xa = b;
          b.root = a;
          c ? Cb = a : d && (d.bb = b, d.Xa && d.Xa.Vb.push(b));
        }
        function Tb(a, b, c) {
          var d = S(a, { parent: true }).node;
          a = cb(a);
          if (!a)
            throw new N(28);
          if ("." === a || ".." === a)
            throw new N(20);
          var e = Mb(d, a);
          if (e)
            throw new N(e);
          if (!d.La.ib)
            throw new N(63);
          return d.La.ib(d, a, b, c);
        }
        function ka(a, b = 438) {
          return Tb(a, b & 4095 | 32768, 0);
        }
        function U(a, b = 511) {
          return Tb(a, b & 1023 | 16384, 0);
        }
        function Ub(a, b, c) {
          "undefined" == typeof c && (c = b, b = 438);
          Tb(a, b | 8192, c);
        }
        function Vb(a, b) {
          if (!fb(a))
            throw new N(44);
          var c = S(b, { parent: true }).node;
          if (!c)
            throw new N(44);
          b = cb(b);
          var d = Mb(c, b);
          if (d)
            throw new N(d);
          if (!c.La.symlink)
            throw new N(63);
          c.La.symlink(c, b, a);
        }
        function Wb(a) {
          var b = S(a, { parent: true }).node;
          a = cb(a);
          var c = Q(b, a), d = Nb(b, a, true);
          if (d)
            throw new N(d);
          if (!b.La.rmdir)
            throw new N(63);
          if (c.bb)
            throw new N(10);
          b.La.rmdir(b, a);
          Ab(c);
        }
        function ua(a) {
          var b = S(a, { parent: true }).node;
          if (!b)
            throw new N(44);
          a = cb(a);
          var c = Q(b, a), d = Nb(b, a, false);
          if (d)
            throw new N(d);
          if (!b.La.unlink)
            throw new N(63);
          if (c.bb)
            throw new N(10);
          b.La.unlink(b, a);
          Ab(c);
        }
        function Xb(a, b) {
          a = S(a, { ab: !b }).node;
          return Ob(a.La.Ta)(a);
        }
        function Yb(a, b, c, d) {
          Rb(a, b, { mode: c & 4095 | b.mode & -4096, ctime: Date.now(), Lb: d });
        }
        function la(a, b) {
          a = "string" == typeof a ? S(a, { ab: true }).node : a;
          Yb(null, a, b);
        }
        function Zb(a, b, c) {
          if (P(b.mode))
            throw new N(31);
          if (32768 !== (b.mode & 61440))
            throw new N(28);
          var d = Lb(b, "w");
          if (d)
            throw new N(d);
          Rb(a, b, { size: c, timestamp: Date.now() });
        }
        function ma(a, b, c = 438) {
          if ("" === a)
            throw new N(44);
          if ("string" == typeof b) {
            var d = { r: 0, "r+": 2, w: 577, "w+": 578, a: 1089, "a+": 1090 }[b];
            if ("undefined" == typeof d)
              throw Error(`Unknown file open mode: ${b}`);
            b = d;
          }
          c = b & 64 ? c & 4095 | 32768 : 0;
          if ("object" == typeof a)
            d = a;
          else {
            var e = a.endsWith("/");
            var g = S(a, { ab: !(b & 131072), Wb: true });
            d = g.node;
            a = g.path;
          }
          g = false;
          if (b & 64)
            if (d) {
              if (b & 128)
                throw new N(20);
            } else {
              if (e)
                throw new N(31);
              d = Tb(a, c | 511, 0);
              g = true;
            }
          if (!d)
            throw new N(44);
          8192 === (d.mode & 61440) && (b &= -513);
          if (b & 65536 && !P(d.mode))
            throw new N(54);
          if (!g && (d ? 40960 === (d.mode & 61440) ? e = 32 : (e = ["r", "w", "rw"][b & 3], b & 512 && (e += "w"), e = P(d.mode) && ("r" !== e || b & 576) ? 31 : Lb(d, e)) : e = 44, e))
            throw new N(e);
          b & 512 && !g && (e = d, e = "string" == typeof e ? S(e, { ab: true }).node : e, Zb(null, e, 0));
          b = Pb({ node: d, path: ha(d), flags: b & -131713, seekable: true, position: 0, Ma: d.Ma, Yb: [], error: false });
          b.Ma.open && b.Ma.open(b);
          g && la(d, c & 511);
          return b;
        }
        function oa(a) {
          if (null === a.fd)
            throw new N(8);
          a.rb && (a.rb = null);
          try {
            a.Ma.close && a.Ma.close(a);
          } catch (b) {
            throw b;
          } finally {
            Eb[a.fd] = null;
          }
          a.fd = null;
        }
        function $b(a, b, c) {
          if (null === a.fd)
            throw new N(8);
          if (!a.seekable || !a.Ma.Va)
            throw new N(70);
          if (0 != c && 1 != c && 2 != c)
            throw new N(28);
          a.position = a.Ma.Va(a, b, c);
          a.Yb = [];
        }
        function ac(a, b, c, d, e) {
          if (0 > d || 0 > e)
            throw new N(28);
          if (null === a.fd)
            throw new N(8);
          if (1 === (a.flags & 2097155))
            throw new N(8);
          if (P(a.node.mode))
            throw new N(31);
          if (!a.Ma.read)
            throw new N(28);
          var g = "undefined" != typeof e;
          if (!g)
            e = a.position;
          else if (!a.seekable)
            throw new N(70);
          b = a.Ma.read(a, b, c, d, e);
          g || (a.position += b);
          return b;
        }
        function na(a, b, c, d, e) {
          if (0 > d || 0 > e)
            throw new N(28);
          if (null === a.fd)
            throw new N(8);
          if (0 === (a.flags & 2097155))
            throw new N(8);
          if (P(a.node.mode))
            throw new N(31);
          if (!a.Ma.write)
            throw new N(28);
          a.seekable && a.flags & 1024 && $b(a, 0, 2);
          var g = "undefined" != typeof e;
          if (!g)
            e = a.position;
          else if (!a.seekable)
            throw new N(70);
          b = a.Ma.write(a, b, c, d, e, void 0);
          g || (a.position += b);
          return b;
        }
        function ta(a) {
          var b = b || 0;
          var c = "binary";
          "utf8" !== c && "binary" !== c && Ma(`Invalid encoding type "${c}"`);
          b = ma(a, b);
          a = Xb(a).size;
          var d = new Uint8Array(a);
          ac(b, d, 0, a, 0);
          "utf8" === c && (d = gb(d));
          oa(b);
          return d;
        }
        function W(a, b, c) {
          a = ia("/dev/" + a);
          var d = ja(!!b, !!c);
          W.Cb ?? (W.Cb = 64);
          var e = W.Cb++ << 8 | 0;
          mb(e, { open(g) {
            g.seekable = false;
          }, close() {
            c?.buffer?.length && c(10);
          }, read(g, h, q, w) {
            for (var t = 0, x = 0; x < w; x++) {
              try {
                var D = b();
              } catch (pb) {
                throw new N(29);
              }
              if (void 0 === D && 0 === t)
                throw new N(6);
              if (null === D || void 0 === D)
                break;
              t++;
              h[q + x] = D;
            }
            t && (g.node.atime = Date.now());
            return t;
          }, write(g, h, q, w) {
            for (var t = 0; t < w; t++)
              try {
                c(h[q + t]);
              } catch (x) {
                throw new N(29);
              }
            w && (g.node.mtime = g.node.ctime = Date.now());
            return t;
          } });
          Ub(a, d, e);
        }
        var X = {};
        function Y(a, b, c) {
          if ("/" === b.charAt(0))
            return b;
          a = -100 === a ? "/" : T(a).path;
          if (0 == b.length) {
            if (!c)
              throw new N(44);
            return a;
          }
          return a + "/" + b;
        }
        function kc(a, b) {
          F[a >> 2] = b.dev;
          F[a + 4 >> 2] = b.mode;
          F[a + 8 >> 2] = b.nlink;
          F[a + 12 >> 2] = b.uid;
          F[a + 16 >> 2] = b.gid;
          F[a + 20 >> 2] = b.rdev;
          G[a + 24 >> 3] = BigInt(b.size);
          E[a + 32 >> 2] = 4096;
          E[a + 36 >> 2] = b.blocks;
          var c = b.atime.getTime(), d = b.mtime.getTime(), e = b.ctime.getTime();
          G[a + 40 >> 3] = BigInt(Math.floor(c / 1e3));
          F[a + 48 >> 2] = c % 1e3 * 1e6;
          G[a + 56 >> 3] = BigInt(Math.floor(d / 1e3));
          F[a + 64 >> 2] = d % 1e3 * 1e6;
          G[a + 72 >> 3] = BigInt(Math.floor(e / 1e3));
          F[a + 80 >> 2] = e % 1e3 * 1e6;
          G[a + 88 >> 3] = BigInt(b.ino);
          return 0;
        }
        var Cc = void 0, Ec = () => {
          var a = E[+Cc >> 2];
          Cc += 4;
          return a;
        }, Fc = 0, Gc = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], Hc = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], Ic = {}, Jc = (a) => {
          Ga = a;
          Ya || 0 < Fc || (k.onExit?.(a), Fa = true);
          xa(a, new Sa(a));
        }, Kc = (a) => {
          if (!Fa)
            try {
              a();
            } catch (b) {
              b instanceof Sa || "unwind" == b || xa(1, b);
            } finally {
              if (!(Ya || 0 < Fc))
                try {
                  Ga = a = Ga, Jc(a);
                } catch (b) {
                  b instanceof Sa || "unwind" == b || xa(1, b);
                }
            }
        }, Lc = {}, Nc = () => {
          if (!Mc) {
            var a = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8", _: wa || "./this.program" }, b;
            for (b in Lc)
              void 0 === Lc[b] ? delete a[b] : a[b] = Lc[b];
            var c = [];
            for (b in a)
              c.push(`${b}=${a[b]}`);
            Mc = c;
          }
          return Mc;
        }, Mc, Oc = (a, b, c, d) => {
          var e = { string: (t) => {
            var x = 0;
            if (null !== t && void 0 !== t && 0 !== t) {
              x = ib(t) + 1;
              var D = y(x);
              M(t, C, D, x);
              x = D;
            }
            return x;
          }, array: (t) => {
            var x = y(t.length);
            m.set(t, x);
            return x;
          } };
          a = k["_" + a];
          var g = [], h = 0;
          if (d)
            for (var q = 0; q < d.length; q++) {
              var w = e[c[q]];
              w ? (0 === h && (h = pa()), g[q] = w(d[q])) : g[q] = d[q];
            }
          c = a(...g);
          return c = function(t) {
            0 !== h && ra(h);
            return "string" === b ? z(t) : "boolean" === b ? !!t : t;
          }(c);
        }, fa = (a) => {
          var b = ib(a) + 1, c = da(b);
          c && M(a, C, c, b);
          return c;
        }, Pc, Qc = [], A = (a) => {
          Pc.delete(Z.get(a));
          Z.set(a, null);
          Qc.push(a);
        }, Rc = (a) => {
          const b = a.length;
          return [b % 128 | 128, b >> 7, ...a];
        }, Sc = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 }, Tc = (a) => Rc(Array.from(a, (b) => Sc[b])), va = (a, b) => {
          if (!Pc) {
            Pc = /* @__PURE__ */ new WeakMap();
            var c = Z.length;
            if (Pc)
              for (var d = 0; d < 0 + c; d++) {
                var e = Z.get(d);
                e && Pc.set(e, d);
              }
          }
          if (c = Pc.get(a) || 0)
            return c;
          c = Qc.length ? Qc.pop() : Z.grow(1);
          try {
            Z.set(c, a);
          } catch (g) {
            if (!(g instanceof TypeError))
              throw g;
            b = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0, 1, ...Rc([1, 96, ...Tc(b.slice(1)), ...Tc("v" === b[0] ? "" : b[0])]), 2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
            b = new WebAssembly.Module(b);
            b = new WebAssembly.Instance(b, { e: { f: a } }).exports.f;
            Z.set(c, b);
          }
          Pc.set(a, c);
          return c;
        };
        R = Array(4096);
        Sb(O, "/");
        U("/tmp");
        U("/home");
        U("/home/web_user");
        (function() {
          U("/dev");
          mb(259, { read: () => 0, write: (d, e, g, h) => h, Va: () => 0 });
          Ub("/dev/null", 259);
          kb(1280, wb);
          kb(1536, xb);
          Ub("/dev/tty", 1280);
          Ub("/dev/tty1", 1536);
          var a = new Uint8Array(1024), b = 0, c = () => {
            0 === b && (eb(a), b = a.byteLength);
            return a[--b];
          };
          W("random", c);
          W("urandom", c);
          U("/dev/shm");
          U("/dev/shm/tmp");
        })();
        (function() {
          U("/proc");
          var a = U("/proc/self");
          U("/proc/self/fd");
          Sb({ Xa() {
            var b = zb(a, "fd", 16895, 73);
            b.Ma = { Va: O.Ma.Va };
            b.La = { lookup(c, d) {
              c = +d;
              var e = T(c);
              c = { parent: null, Xa: { Db: "fake" }, La: { readlink: () => e.path }, id: c + 1 };
              return c.parent = c;
            }, readdir() {
              return Array.from(Eb.entries()).filter(([, c]) => c).map(([c]) => c.toString());
            } };
            return b;
          } }, "/proc/self/fd");
        })();
        k.noExitRuntime && (Ya = k.noExitRuntime);
        k.print && (Da = k.print);
        k.printErr && (B = k.printErr);
        k.wasmBinary && (Ea = k.wasmBinary);
        k.thisProgram && (wa = k.thisProgram);
        if (k.preInit)
          for ("function" == typeof k.preInit && (k.preInit = [k.preInit]); 0 < k.preInit.length; )
            k.preInit.shift()();
        k.stackSave = () => pa();
        k.stackRestore = (a) => ra(a);
        k.stackAlloc = (a) => y(a);
        k.cwrap = (a, b, c, d) => {
          var e = !c || c.every((g) => "number" === g || "boolean" === g);
          return "string" !== b && e && !d ? k["_" + a] : (...g) => Oc(a, b, c, g);
        };
        k.addFunction = va;
        k.removeFunction = A;
        k.UTF8ToString = z;
        k.stringToNewUTF8 = fa;
        k.writeArrayToMemory = (a, b) => {
          m.set(a, b);
        };
        var da, ea, Bb, Uc, ra, y, pa, La, Z, Vc = {
          a: (a, b, c, d) => Ma(`Assertion failed: ${z(a)}, at: ` + [b ? z(b) : "unknown filename", c, d ? z(d) : "unknown function"]),
          i: function(a, b) {
            try {
              return a = z(a), la(a, b), 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name)
                throw c;
              return -c.Pa;
            }
          },
          L: function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b);
              if (c & -8)
                return -28;
              var d = S(b, { ab: true }).node;
              if (!d)
                return -44;
              a = "";
              c & 4 && (a += "r");
              c & 2 && (a += "w");
              c & 1 && (a += "x");
              return a && Lb(d, a) ? -2 : 0;
            } catch (e) {
              if ("undefined" == typeof X || "ErrnoError" !== e.name)
                throw e;
              return -e.Pa;
            }
          },
          j: function(a, b) {
            try {
              var c = T(a);
              Yb(c, c.node, b, false);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name)
                throw d;
              return -d.Pa;
            }
          },
          h: function(a) {
            try {
              var b = T(a);
              Rb(b, b.node, { timestamp: Date.now(), Lb: false });
              return 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name)
                throw c;
              return -c.Pa;
            }
          },
          b: function(a, b, c) {
            Cc = c;
            try {
              var d = T(a);
              switch (b) {
                case 0:
                  var e = Ec();
                  if (0 > e)
                    break;
                  for (; Eb[e]; )
                    e++;
                  return Qb(d, e).fd;
                case 1:
                case 2:
                  return 0;
                case 3:
                  return d.flags;
                case 4:
                  return e = Ec(), d.flags |= e, 0;
                case 12:
                  return e = Ec(), Ha[e + 0 >> 1] = 2, 0;
                case 13:
                case 14:
                  return 0;
              }
              return -28;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name)
                throw g;
              return -g.Pa;
            }
          },
          g: function(a, b) {
            try {
              var c = T(a), d = c.node, e = c.Ma.Ta;
              a = e ? c : d;
              e ??= d.La.Ta;
              Ob(e);
              var g = e(a);
              return kc(b, g);
            } catch (h) {
              if ("undefined" == typeof X || "ErrnoError" !== h.name)
                throw h;
              return -h.Pa;
            }
          },
          H: function(a, b) {
            b = -9007199254740992 > b || 9007199254740992 < b ? NaN : Number(b);
            try {
              if (isNaN(b))
                return -61;
              var c = T(a);
              if (0 > b || 0 === (c.flags & 2097155))
                throw new N(28);
              Zb(c, c.node, b);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name)
                throw d;
              return -d.Pa;
            }
          },
          G: function(a, b) {
            try {
              if (0 === b)
                return -28;
              var c = ib("/") + 1;
              if (b < c)
                return -68;
              M("/", C, a, b);
              return c;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name)
                throw d;
              return -d.Pa;
            }
          },
          K: function(a, b) {
            try {
              return a = z(a), kc(b, Xb(a, true));
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name)
                throw c;
              return -c.Pa;
            }
          },
          C: function(a, b, c) {
            try {
              return b = z(b), b = Y(a, b), U(b, c), 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name)
                throw d;
              return -d.Pa;
            }
          },
          J: function(a, b, c, d) {
            try {
              b = z(b);
              var e = d & 256;
              b = Y(a, b, d & 4096);
              return kc(c, e ? Xb(b, true) : Xb(b));
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name)
                throw g;
              return -g.Pa;
            }
          },
          x: function(a, b, c, d) {
            Cc = d;
            try {
              b = z(b);
              b = Y(a, b);
              var e = d ? Ec() : 0;
              return ma(b, c, e).fd;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name)
                throw g;
              return -g.Pa;
            }
          },
          v: function(a, b, c, d) {
            try {
              b = z(b);
              b = Y(a, b);
              if (0 >= d)
                return -28;
              var e = S(b).node;
              if (!e)
                throw new N(44);
              if (!e.La.readlink)
                throw new N(28);
              var g = e.La.readlink(e);
              var h = Math.min(d, ib(g)), q = m[c + h];
              M(
                g,
                C,
                c,
                d + 1
              );
              m[c + h] = q;
              return h;
            } catch (w) {
              if ("undefined" == typeof X || "ErrnoError" !== w.name)
                throw w;
              return -w.Pa;
            }
          },
          u: function(a) {
            try {
              return a = z(a), Wb(a), 0;
            } catch (b) {
              if ("undefined" == typeof X || "ErrnoError" !== b.name)
                throw b;
              return -b.Pa;
            }
          },
          f: function(a, b) {
            try {
              return a = z(a), kc(b, Xb(a));
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name)
                throw c;
              return -c.Pa;
            }
          },
          r: function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b);
              if (c)
                if (512 === c)
                  Wb(b);
                else
                  return -28;
              else
                ua(b);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name)
                throw d;
              return -d.Pa;
            }
          },
          q: function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b, true);
              var d = Date.now(), e, g;
              if (c) {
                var h = F[c >> 2] + 4294967296 * E[c + 4 >> 2], q = E[c + 8 >> 2];
                1073741823 == q ? e = d : 1073741822 == q ? e = null : e = 1e3 * h + q / 1e6;
                c += 16;
                h = F[c >> 2] + 4294967296 * E[c + 4 >> 2];
                q = E[c + 8 >> 2];
                1073741823 == q ? g = d : 1073741822 == q ? g = null : g = 1e3 * h + q / 1e6;
              } else
                g = e = d;
              if (null !== (g ?? e)) {
                a = e;
                var w = S(b, { ab: true }).node;
                Ob(w.La.Ua)(w, { atime: a, mtime: g });
              }
              return 0;
            } catch (t) {
              if ("undefined" == typeof X || "ErrnoError" !== t.name)
                throw t;
              return -t.Pa;
            }
          },
          m: () => Ma(""),
          l: () => {
            Ya = false;
            Fc = 0;
          },
          A: function(a, b) {
            a = -9007199254740992 > a || 9007199254740992 < a ? NaN : Number(a);
            a = new Date(1e3 * a);
            E[b >> 2] = a.getSeconds();
            E[b + 4 >> 2] = a.getMinutes();
            E[b + 8 >> 2] = a.getHours();
            E[b + 12 >> 2] = a.getDate();
            E[b + 16 >> 2] = a.getMonth();
            E[b + 20 >> 2] = a.getFullYear() - 1900;
            E[b + 24 >> 2] = a.getDay();
            var c = a.getFullYear();
            E[b + 28 >> 2] = (0 !== c % 4 || 0 === c % 100 && 0 !== c % 400 ? Hc : Gc)[a.getMonth()] + a.getDate() - 1 | 0;
            E[b + 36 >> 2] = -(60 * a.getTimezoneOffset());
            c = new Date(a.getFullYear(), 6, 1).getTimezoneOffset();
            var d = new Date(a.getFullYear(), 0, 1).getTimezoneOffset();
            E[b + 32 >> 2] = (c != d && a.getTimezoneOffset() == Math.min(d, c)) | 0;
          },
          y: function(a, b, c, d, e, g, h) {
            e = -9007199254740992 > e || 9007199254740992 < e ? NaN : Number(e);
            try {
              var q = T(d);
              if (0 !== (b & 2) && 0 === (c & 2) && 2 !== (q.flags & 2097155))
                throw new N(2);
              if (1 === (q.flags & 2097155))
                throw new N(2);
              if (!q.Ma.jb)
                throw new N(43);
              if (!a)
                throw new N(28);
              var w = q.Ma.jb(q, a, e, b, c);
              var t = w.Xb;
              E[g >> 2] = w.Eb;
              F[h >> 2] = t;
              return 0;
            } catch (x) {
              if ("undefined" == typeof X || "ErrnoError" !== x.name)
                throw x;
              return -x.Pa;
            }
          },
          z: function(a, b, c, d, e, g) {
            g = -9007199254740992 > g || 9007199254740992 < g ? NaN : Number(g);
            try {
              var h = T(e);
              if (c & 2) {
                c = g;
                if (32768 !== (h.node.mode & 61440))
                  throw new N(43);
                if (!(d & 2)) {
                  var q = C.slice(a, a + b);
                  h.Ma.kb && h.Ma.kb(h, q, c, b, d);
                }
              }
            } catch (w) {
              if ("undefined" == typeof X || "ErrnoError" !== w.name)
                throw w;
              return -w.Pa;
            }
          },
          n: (a, b) => {
            Ic[a] && (clearTimeout(Ic[a].id), delete Ic[a]);
            if (!b)
              return 0;
            var c = setTimeout(() => {
              delete Ic[a];
              Kc(() => Uc(a, performance.now()));
            }, b);
            Ic[a] = { id: c, lc: b };
            return 0;
          },
          B: (a, b, c, d) => {
            var e = (/* @__PURE__ */ new Date()).getFullYear(), g = new Date(e, 0, 1).getTimezoneOffset();
            e = new Date(e, 6, 1).getTimezoneOffset();
            F[a >> 2] = 60 * Math.max(g, e);
            E[b >> 2] = Number(g != e);
            b = (h) => {
              var q = Math.abs(h);
              return `UTC${0 <= h ? "-" : "+"}${String(Math.floor(q / 60)).padStart(2, "0")}${String(q % 60).padStart(2, "0")}`;
            };
            a = b(g);
            b = b(e);
            e < g ? (M(a, C, c, 17), M(b, C, d, 17)) : (M(a, C, d, 17), M(b, C, c, 17));
          },
          d: () => Date.now(),
          s: () => 2147483648,
          c: () => performance.now(),
          o: (a) => {
            var b = C.length;
            a >>>= 0;
            if (2147483648 < a)
              return false;
            for (var c = 1; 4 >= c; c *= 2) {
              var d = b * (1 + 0.2 / c);
              d = Math.min(d, a + 100663296);
              a: {
                d = (Math.min(2147483648, 65536 * Math.ceil(Math.max(
                  a,
                  d
                ) / 65536)) - La.buffer.byteLength + 65535) / 65536 | 0;
                try {
                  La.grow(d);
                  Ka();
                  var e = 1;
                  break a;
                } catch (g) {
                }
                e = void 0;
              }
              if (e)
                return true;
            }
            return false;
          },
          E: (a, b) => {
            var c = 0, d = 0, e;
            for (e of Nc()) {
              var g = b + c;
              F[a + d >> 2] = g;
              c += M(e, C, g, Infinity) + 1;
              d += 4;
            }
            return 0;
          },
          F: (a, b) => {
            var c = Nc();
            F[a >> 2] = c.length;
            a = 0;
            for (var d of c)
              a += ib(d) + 1;
            F[b >> 2] = a;
            return 0;
          },
          e: function(a) {
            try {
              var b = T(a);
              oa(b);
              return 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name)
                throw c;
              return c.Pa;
            }
          },
          p: function(a, b) {
            try {
              var c = T(a);
              m[b] = c.tty ? 2 : P(c.mode) ? 3 : 40960 === (c.mode & 61440) ? 7 : 4;
              Ha[b + 2 >> 1] = 0;
              G[b + 8 >> 3] = BigInt(0);
              G[b + 16 >> 3] = BigInt(0);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name)
                throw d;
              return d.Pa;
            }
          },
          w: function(a, b, c, d) {
            try {
              a: {
                var e = T(a);
                a = b;
                for (var g, h = b = 0; h < c; h++) {
                  var q = F[a >> 2], w = F[a + 4 >> 2];
                  a += 8;
                  var t = ac(e, m, q, w, g);
                  if (0 > t) {
                    var x = -1;
                    break a;
                  }
                  b += t;
                  if (t < w)
                    break;
                  "undefined" != typeof g && (g += t);
                }
                x = b;
              }
              F[d >> 2] = x;
              return 0;
            } catch (D) {
              if ("undefined" == typeof X || "ErrnoError" !== D.name)
                throw D;
              return D.Pa;
            }
          },
          D: function(a, b, c, d) {
            b = -9007199254740992 > b || 9007199254740992 < b ? NaN : Number(b);
            try {
              if (isNaN(b))
                return 61;
              var e = T(a);
              $b(e, b, c);
              G[d >> 3] = BigInt(e.position);
              e.rb && 0 === b && 0 === c && (e.rb = null);
              return 0;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name)
                throw g;
              return g.Pa;
            }
          },
          I: function(a) {
            try {
              var b = T(a);
              return b.Ma?.fsync?.(b);
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name)
                throw c;
              return c.Pa;
            }
          },
          t: function(a, b, c, d) {
            try {
              a: {
                var e = T(a);
                a = b;
                for (var g, h = b = 0; h < c; h++) {
                  var q = F[a >> 2], w = F[a + 4 >> 2];
                  a += 8;
                  var t = na(e, m, q, w, g);
                  if (0 > t) {
                    var x = -1;
                    break a;
                  }
                  b += t;
                  if (t < w)
                    break;
                  "undefined" != typeof g && (g += t);
                }
                x = b;
              }
              F[d >> 2] = x;
              return 0;
            } catch (D) {
              if ("undefined" == typeof X || "ErrnoError" !== D.name)
                throw D;
              return D.Pa;
            }
          },
          k: Jc
        };
        function Wc() {
          function a() {
            k.calledRun = true;
            if (!Fa) {
              if (!k.noFSInit && !Gb) {
                var b, c;
                Gb = true;
                b ??= k.stdin;
                c ??= k.stdout;
                d ??= k.stderr;
                b ? W("stdin", b) : Vb("/dev/tty", "/dev/stdin");
                c ? W("stdout", null, c) : Vb("/dev/tty", "/dev/stdout");
                d ? W("stderr", null, d) : Vb("/dev/tty1", "/dev/stderr");
                ma("/dev/stdin", 0);
                ma("/dev/stdout", 1);
                ma("/dev/stderr", 1);
              }
              Xc.N();
              Hb = false;
              k.onRuntimeInitialized?.();
              if (k.postRun)
                for ("function" == typeof k.postRun && (k.postRun = [k.postRun]); k.postRun.length; ) {
                  var d = k.postRun.shift();
                  Ua.push(d);
                }
              Ta(Ua);
            }
          }
          if (0 < J)
            Xa = Wc;
          else {
            if (k.preRun)
              for ("function" == typeof k.preRun && (k.preRun = [k.preRun]); k.preRun.length; )
                Wa();
            Ta(Va);
            0 < J ? Xa = Wc : k.setStatus ? (k.setStatus("Running..."), setTimeout(() => {
              setTimeout(() => k.setStatus(""), 1);
              a();
            }, 1)) : a();
          }
        }
        var Xc;
        (async function() {
          function a(c) {
            c = Xc = c.exports;
            k._sqlite3_free = c.P;
            k._sqlite3_value_text = c.Q;
            k._sqlite3_prepare_v2 = c.R;
            k._sqlite3_step = c.S;
            k._sqlite3_reset = c.T;
            k._sqlite3_exec = c.U;
            k._sqlite3_finalize = c.V;
            k._sqlite3_column_name = c.W;
            k._sqlite3_column_text = c.X;
            k._sqlite3_column_type = c.Y;
            k._sqlite3_errmsg = c.Z;
            k._sqlite3_clear_bindings = c._;
            k._sqlite3_value_blob = c.$;
            k._sqlite3_value_bytes = c.aa;
            k._sqlite3_value_double = c.ba;
            k._sqlite3_value_int = c.ca;
            k._sqlite3_value_type = c.da;
            k._sqlite3_result_blob = c.ea;
            k._sqlite3_result_double = c.fa;
            k._sqlite3_result_error = c.ga;
            k._sqlite3_result_int = c.ha;
            k._sqlite3_result_int64 = c.ia;
            k._sqlite3_result_null = c.ja;
            k._sqlite3_result_text = c.ka;
            k._sqlite3_aggregate_context = c.la;
            k._sqlite3_column_count = c.ma;
            k._sqlite3_data_count = c.na;
            k._sqlite3_column_blob = c.oa;
            k._sqlite3_column_bytes = c.pa;
            k._sqlite3_column_double = c.qa;
            k._sqlite3_bind_blob = c.ra;
            k._sqlite3_bind_double = c.sa;
            k._sqlite3_bind_int = c.ta;
            k._sqlite3_bind_text = c.ua;
            k._sqlite3_bind_parameter_index = c.va;
            k._sqlite3_sql = c.wa;
            k._sqlite3_normalized_sql = c.xa;
            k._sqlite3_changes = c.ya;
            k._sqlite3_close_v2 = c.za;
            k._sqlite3_create_function_v2 = c.Aa;
            k._sqlite3_update_hook = c.Ba;
            k._sqlite3_open = c.Ca;
            da = k._malloc = c.Da;
            ea = k._free = c.Ea;
            k._RegisterExtensionFunctions = c.Fa;
            Bb = c.Ga;
            Uc = c.Ha;
            ra = c.Ia;
            y = c.Ja;
            pa = c.Ka;
            La = c.M;
            Z = c.O;
            Ka();
            J--;
            k.monitorRunDependencies?.(J);
            0 == J && Xa && (c = Xa, Xa = null, c());
            return Xc;
          }
          J++;
          k.monitorRunDependencies?.(J);
          var b = { a: Vc };
          if (k.instantiateWasm)
            return new Promise((c) => {
              k.instantiateWasm(b, (d, e) => {
                c(a(d, e));
              });
            });
          Na ??= k.locateFile ? k.locateFile("sql-wasm.wasm", za) : za + "sql-wasm.wasm";
          return a((await Ra(b)).instance);
        })();
        Wc();
        return Module;
      });
      return initSqlJsPromise;
    };
    if (typeof exports2 === "object" && typeof module2 === "object") {
      module2.exports = initSqlJs;
      module2.exports.default = initSqlJs;
    } else if (typeof define === "function" && define["amd"]) {
      define([], function() {
        return initSqlJs;
      });
    } else if (typeof exports2 === "object") {
      exports2["Module"] = initSqlJs;
    }
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode2 = __toESM(require("vscode"));

// src/logger.ts
function createLogger(channel) {
  const prefix = () => `[${(/* @__PURE__ */ new Date()).toISOString()}]`;
  return {
    log(message) {
      channel.appendLine(`${prefix()} INFO  ${message}`);
    },
    warn(message) {
      channel.appendLine(`${prefix()} WARN  ${message}`);
    },
    error(message, err) {
      const detail = err instanceof Error ? ` \u2014 ${err.message}` : err ? ` \u2014 ${String(err)}` : "";
      channel.appendLine(`${prefix()} ERROR ${message}${detail}`);
    },
    show() {
      channel.show(true);
    }
  };
}

// src/ui/commands.ts
var vscode = __toESM(require("vscode"));
var path7 = __toESM(require("path"));
var fs7 = __toESM(require("fs"));

// src/storage/cursorStorage.ts
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
function getCursorUserDataPath(logger) {
  const override = process.env["CURSOR_APPDATA"];
  if (override) {
    logger.log(`Using CURSOR_APPDATA override: ${override}`);
    return override;
  }
  const platform = process.platform;
  if (platform === "win32") {
    const appData = process.env["APPDATA"];
    if (!appData) {
      logger.error("APPDATA environment variable is not set on Windows.");
      return null;
    }
    return path.join(appData, "Cursor", "User");
  }
  if (platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Cursor", "User");
  }
  const xdgConfig = process.env["XDG_CONFIG_HOME"];
  if (xdgConfig) {
    return path.join(xdgConfig, "Cursor", "User");
  }
  return path.join(os.homedir(), ".config", "Cursor", "User");
}
function getWorkspaceStoragePath(logger) {
  const userDataPath = getCursorUserDataPath(logger);
  if (!userDataPath) {
    return null;
  }
  const wsStorage = path.join(userDataPath, "workspaceStorage");
  logger.log(`Cursor workspaceStorage path: ${wsStorage}`);
  if (!fs.existsSync(wsStorage)) {
    logger.error(`workspaceStorage directory not found at: ${wsStorage}`);
    return null;
  }
  return wsStorage;
}
function getGlobalStoragePath(logger) {
  const userDataPath = getCursorUserDataPath(logger);
  if (!userDataPath) {
    return null;
  }
  const globalStorage = path.join(userDataPath, "globalStorage");
  logger.log(`Cursor globalStorage path: ${globalStorage}`);
  if (!fs.existsSync(globalStorage)) {
    logger.warn(`globalStorage directory not found: ${globalStorage}`);
    return null;
  }
  return globalStorage;
}

// src/storage/workspaceScanner.ts
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));
function scanWorkspaceStorage(workspaceStoragePath, logger) {
  const entries = [];
  let hashes;
  try {
    hashes = fs2.readdirSync(workspaceStoragePath);
  } catch (err) {
    logger.error(`Failed to read workspaceStorage directory: ${workspaceStoragePath}`, err);
    return entries;
  }
  logger.log(`Found ${hashes.length} entries under workspaceStorage`);
  for (const hash of hashes) {
    const storagePath = path2.join(workspaceStoragePath, hash);
    let stat;
    try {
      stat = fs2.statSync(storagePath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) {
      continue;
    }
    const entry = resolveEntry(storagePath, hash, logger);
    entries.push(entry);
  }
  return entries;
}
function resolveEntry(storagePath, hash, logger) {
  let workspacePath = null;
  let workspaceLabel = null;
  const workspaceJsonPath = path2.join(storagePath, "workspace.json");
  if (fs2.existsSync(workspaceJsonPath)) {
    try {
      const raw = fs2.readFileSync(workspaceJsonPath, "utf8");
      const json = JSON.parse(raw);
      const folder = json["folder"] ?? json["workspace"] ?? json["folderUri"];
      if (typeof folder === "string") {
        workspacePath = fileUriToFsPath(folder);
        workspaceLabel = workspacePath ? path2.basename(workspacePath) : null;
      }
    } catch (err) {
      logger.warn(`Could not parse workspace.json at ${workspaceJsonPath}: ${String(err)}`);
    }
  }
  const dbPath = path2.join(storagePath, "state.vscdb");
  const dbExists = fs2.existsSync(dbPath);
  if (workspacePath) {
    logger.log(`  [${hash}] \u2192 ${workspacePath} (db: ${dbExists ? "yes" : "no"})`);
  }
  return {
    storagePath,
    hash,
    workspacePath,
    workspaceLabel,
    dbPath: dbExists ? dbPath : null
  };
}
function fileUriToFsPath(uri) {
  try {
    const url = new URL(uri);
    if (url.protocol !== "file:") {
      return uri;
    }
    let fsPath = decodeURIComponent(url.pathname);
    if (process.platform === "win32" && /^\/[A-Za-z]:/.test(fsPath)) {
      fsPath = fsPath.slice(1);
    }
    if (process.platform === "win32") {
      fsPath = fsPath.replace(/\//g, "\\");
    }
    return fsPath;
  } catch {
    return uri.replace(/^file:\/\//, "").replace(/\//g, process.platform === "win32" ? "\\" : "/");
  }
}
function findMatchingEntries(entries, targetWorkspacePath, logger) {
  const normalise = (p) => {
    let n = p.trim().replace(/[\\/]+$/, "");
    if (process.platform === "win32") {
      n = n.toLowerCase().replace(/\//g, "\\");
    }
    return n;
  };
  const target = normalise(targetWorkspacePath);
  const matches = entries.filter((e) => {
    if (!e.workspacePath) {
      return false;
    }
    return normalise(e.workspacePath) === target;
  });
  logger.log(`Workspace match: ${matches.length} entries match "${targetWorkspacePath}"`);
  return matches;
}

// src/storage/cursorDiskKV.ts
var fs4 = __toESM(require("fs"));
var path4 = __toESM(require("path"));

// src/storage/sqliteReader.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var sqlJsPromise = null;
async function getSqlJs(logger) {
  if (!sqlJsPromise) {
    sqlJsPromise = (async () => {
      const wasmPath = path3.join(__dirname, "sql-wasm.wasm");
      logger.log(`Loading sql-wasm.wasm from: ${wasmPath}`);
      if (!fs3.existsSync(wasmPath)) {
        throw new Error(
          `sql-wasm.wasm not found at ${wasmPath}. Run 'npm run compile' to copy it into the out/ directory.`
        );
      }
      const initFn = require_sql_wasm();
      const SQL = await initFn({
        locateFile: () => wasmPath
      });
      logger.log("sql.js initialized successfully.");
      return SQL;
    })();
  }
  try {
    return await sqlJsPromise;
  } catch (err) {
    sqlJsPromise = null;
    logger.error("Failed to initialize sql.js", err);
    return null;
  }
}
async function openDatabase(dbPath, logger) {
  const SQL = await getSqlJs(logger);
  if (!SQL) {
    return null;
  }
  if (!fs3.existsSync(dbPath)) {
    logger.warn(`Database file not found: ${dbPath}`);
    return null;
  }
  try {
    const fileBuffer = fs3.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);
    logger.log(`Opened DB (in-memory, read-only): ${dbPath}`);
    return db;
  } catch (err) {
    logger.error(`Failed to open database: ${dbPath}`, err);
    return null;
  }
}
function closeDatabase(db, logger) {
  if (!db) {
    return;
  }
  try {
    db.close();
  } catch (err) {
    logger.warn(`Error closing database: ${String(err)}`);
  }
}
function listTables(db, logger) {
  const tables = [];
  try {
    const result = db.exec(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
    if (!result.length || !result[0].values.length) {
      logger.log("No tables found in DB.");
      return tables;
    }
    const names = result[0].values.map((row) => String(row[0]));
    for (const name of names) {
      try {
        const pragmaResult = db.exec(`PRAGMA table_info(${JSON.stringify(name)})`);
        const columns = pragmaResult.length ? pragmaResult[0].values.map((row) => String(row[1])) : [];
        tables.push({ name, columns });
      } catch {
        tables.push({ name, columns: [] });
      }
    }
  } catch (err) {
    logger.error("Failed to list tables", err);
  }
  logger.log(`Tables in DB: ${tables.map((t) => t.name).join(", ") || "(none)"}`);
  return tables;
}
function readItemTable(db, logger, tableName = "ItemTable") {
  try {
    const result = db.exec(`SELECT key, value FROM ${JSON.stringify(tableName)}`);
    if (!result.length) {
      logger.log(`Table "${tableName}" is empty or does not exist.`);
      return [];
    }
    const rows = result[0].values.map((row) => ({
      key: String(row[0] ?? ""),
      value: row[1] instanceof Uint8Array ? Buffer.from(row[1]) : row[1] === null ? null : String(row[1])
    }));
    logger.log(`Read ${rows.length} rows from ${tableName}`);
    return rows;
  } catch (err) {
    logger.warn(`Could not read table "${tableName}": ${String(err)}`);
    return [];
  }
}

// src/storage/cursorDiskKV.ts
function hasCursorDiskKV(db, logger) {
  const tables = listTables(db, logger);
  return tables.some((t) => t.name === "cursorDiskKV");
}
function readAllComposerHeaders(db, logger) {
  const headers = [];
  try {
    const result = db.exec(
      `SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'`
    );
    if (!result.length || !result[0].values.length) {
      logger.log("No composerData entries found in cursorDiskKV");
      return headers;
    }
    logger.log(`Found ${result[0].values.length} composerData entries`);
    for (const [key, rawValue] of result[0].values) {
      try {
        const str = rawValue instanceof Uint8Array ? Buffer.from(rawValue).toString("utf8") : rawValue === null ? null : String(rawValue);
        if (!str) {
          continue;
        }
        const parsed = JSON.parse(str);
        const header = parseComposerData(key, parsed, logger);
        if (header) {
          headers.push(header);
        }
      } catch (err) {
        logger.warn(`Failed to parse composerData for key "${key}": ${String(err)}`);
      }
    }
  } catch (err) {
    logger.error("Failed to read composerData from cursorDiskKV", err);
  }
  logger.log(`Parsed ${headers.length} composer headers`);
  return headers;
}
function parseComposerData(key, data, logger) {
  const composerId = stringField(data, "composerId");
  if (!composerId) {
    logger.warn(`composerData entry missing composerId: ${key}`);
    return null;
  }
  const wsId = data["workspaceIdentifier"];
  let workspaceFsPath = null;
  let workspaceExternalUri = null;
  let workspaceStorageId = null;
  if (wsId) {
    workspaceStorageId = stringField(wsId, "id");
    const uri = wsId["uri"];
    if (uri) {
      workspaceFsPath = stringField(uri, "fsPath");
      workspaceExternalUri = stringField(uri, "external");
    }
  }
  const rawHeaders = data["fullConversationHeadersOnly"];
  const parsedHeaders = [];
  if (Array.isArray(rawHeaders)) {
    for (const h of rawHeaders) {
      if (!h || typeof h !== "object") {
        continue;
      }
      const hh = h;
      const g = hh["grouping"] ?? {};
      parsedHeaders.push({
        bubbleId: String(hh["bubbleId"] ?? ""),
        type: typeof hh["type"] === "number" ? hh["type"] : 0,
        isRenderable: g["isRenderable"] !== false,
        hasText: g["hasText"] === true,
        isSimulatedMsg: g["isSimulatedMsg"] === true,
        capabilityType: typeof g["capabilityType"] === "number" ? g["capabilityType"] : null,
        toolFormerTool: typeof g["toolFormerTool"] === "number" ? g["toolFormerTool"] : null,
        toolCallId: stringField(g, "toolCallId"),
        hasThinking: g["hasThinking"] === true
      });
    }
  }
  return {
    composerId,
    name: stringField(data, "name"),
    createdAt: numberField(data, "createdAt"),
    lastUpdatedAt: numberField(data, "lastUpdatedAt"),
    isNAL: typeof data["isNAL"] === "boolean" ? data["isNAL"] : void 0,
    workspaceFsPath,
    workspaceExternalUri,
    workspaceStorageId,
    unifiedMode: stringField(data, "unifiedMode"),
    subtitle: stringField(data, "subtitle"),
    messageCount: parsedHeaders.length,
    headers: parsedHeaders
  };
}
function loadBubblesForComposer(db, composerId, logger) {
  const map = /* @__PURE__ */ new Map();
  try {
    const result = db.exec(
      `SELECT key, value FROM cursorDiskKV WHERE key LIKE ?`,
      [`bubbleId:${composerId}:%`]
    );
    if (!result.length || !result[0].values.length) {
      logger.log(`No bubble records found for composer ${composerId}`);
      return map;
    }
    logger.log(`Loading ${result[0].values.length} bubbles for composer ${composerId}`);
    for (const [key, rawValue] of result[0].values) {
      try {
        const str = rawValue instanceof Uint8Array ? Buffer.from(rawValue).toString("utf8") : rawValue === null ? null : String(rawValue);
        if (!str) {
          continue;
        }
        const parsed = JSON.parse(str);
        const bubble = parseBubbleContent(composerId, parsed);
        if (bubble) {
          map.set(bubble.bubbleId, bubble);
        }
      } catch (err) {
        logger.warn(`Failed to parse bubble "${key}": ${String(err)}`);
      }
    }
  } catch (err) {
    logger.error(`Failed to load bubbles for composer ${composerId}`, err);
  }
  return map;
}
function parseBubbleContent(composerId, data) {
  const bubbleId = stringField(data, "bubbleId");
  if (!bubbleId) {
    return null;
  }
  const typeNum = typeof data["type"] === "number" ? data["type"] : 0;
  let text = stringField(data, "text") ?? "";
  const richText = stringField(data, "richText");
  if (!text.trim() && richText) {
    text = extractTextFromLexicalJson(richText);
  }
  return {
    bubbleId,
    composerId,
    type: typeNum,
    text,
    richText,
    createdAt: numberField(data, "createdAt"),
    capabilityType: typeof data["capabilityType"] === "number" ? data["capabilityType"] : null,
    thinking: stringField(data, "thinking"),
    isSimulated: false
    // set from header
  };
}
function extractTextFromLexicalJson(richTextJson) {
  try {
    const root = JSON.parse(richTextJson);
    const parts = [];
    collectLexicalText(root, parts);
    return parts.join("");
  } catch {
    return "";
  }
}
function collectLexicalText(node, parts) {
  if (!node || typeof node !== "object") {
    return;
  }
  const n = node;
  if (n["type"] === "text" && typeof n["text"] === "string") {
    parts.push(n["text"]);
    return;
  }
  if (n["type"] === "linebreak") {
    parts.push("\n");
    return;
  }
  const children = n["children"];
  if (Array.isArray(children)) {
    for (const child of children) {
      collectLexicalText(child, parts);
    }
    if (n["type"] === "paragraph" || n["type"] === "heading") {
      parts.push("\n");
    }
  }
  const rootNode = n["root"];
  if (rootNode) {
    collectLexicalText(rootNode, parts);
  }
}
function filterComposersByWorkspace(composers, workspacePath, logger, workspaceStorageHashes = []) {
  const normTarget = normaliseWsPath(workspacePath);
  const hashSet = new Set(workspaceStorageHashes.map((h) => h.toLowerCase()));
  const matches = composers.filter((c) => {
    if (c.workspaceFsPath && normaliseWsPath(c.workspaceFsPath) === normTarget) {
      return true;
    }
    if (c.workspaceExternalUri) {
      const decoded = fileUriToFsPath2(c.workspaceExternalUri);
      if (decoded && normaliseWsPath(decoded) === normTarget) {
        return true;
      }
    }
    if (c.workspaceStorageId && hashSet.has(c.workspaceStorageId.toLowerCase())) {
      return true;
    }
    return false;
  });
  logger.log(
    `Workspace filter: ${matches.length}/${composers.length} composers match "${workspacePath}"` + (workspaceStorageHashes.length > 0 ? ` (hashes: ${workspaceStorageHashes.join(", ")})` : "")
  );
  return matches;
}
function normaliseWsPath(p) {
  let n = p.replace(/[\\/]+$/, "").trim();
  if (process.platform === "win32") {
    n = n.toLowerCase().replace(/\//g, "\\");
  }
  return n;
}
function fileUriToFsPath2(uri) {
  try {
    const url = new URL(uri);
    if (url.protocol !== "file:") {
      return null;
    }
    let p = decodeURIComponent(url.pathname);
    if (process.platform === "win32" && /^\/[A-Za-z]:/.test(p)) {
      p = p.slice(1);
    }
    if (process.platform === "win32") {
      p = p.replace(/\//g, "\\");
    }
    return p;
  } catch {
    return null;
  }
}
async function openGlobalStorageDb(globalStoragePath, logger) {
  const dbPath = path4.join(globalStoragePath, "state.vscdb");
  if (!fs4.existsSync(dbPath)) {
    logger.warn(`globalStorage DB not found: ${dbPath}`);
    return null;
  }
  const sizeMB = (fs4.statSync(dbPath).size / 1024 / 1024).toFixed(1);
  logger.log(`Opening globalStorage DB (${sizeMB} MB): ${dbPath}`);
  const db = await openDatabase(dbPath, logger);
  if (!db) {
    return null;
  }
  if (!hasCursorDiskKV(db, logger)) {
    logger.warn(
      "globalStorage DB does not have cursorDiskKV table. This may be an older Cursor version. Falling back to ItemTable scan."
    );
    return db;
  }
  return db;
}
function stringField(obj, key) {
  const v = obj[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  return null;
}
function numberField(obj, key) {
  const v = obj[key];
  if (typeof v === "number" && v > 0) {
    return v;
  }
  return null;
}

// src/chat/schemaDiscovery.ts
var CHAT_KEY_PATTERNS = [
  /composer/i,
  /aichat/i,
  /aiService/i,
  /chatdata/i,
  /cursor\.chat/i,
  /cursor\.composer/i,
  /cursor\.agent/i,
  /chatHistory/i,
  /conversationHistory/i,
  /bubbleId/i,
  /tabs/i
  // composer stores tabs array
];
function filterChatRecords(records, logger) {
  const chatRecords = records.filter(
    (r) => CHAT_KEY_PATTERNS.some((p) => p.test(r.key))
  );
  logger.log(
    `filterChatRecords: ${chatRecords.length}/${records.length} records match chat key patterns`
  );
  if (chatRecords.length > 0) {
    logger.log(`  Matched keys: ${chatRecords.map((r) => r.key).join(", ")}`);
  }
  return chatRecords;
}

// src/chat/chatParser.ts
var CAPABILITY_LABELS = {
  15: "Tool Call",
  19: "Terminal",
  30: "Thinking",
  33: "Plan",
  40: "Read File",
  41: "Edit File",
  42: "Create File",
  50: "Search",
  60: "Browser"
};
function composerToConversation(composer, bubbles, logger) {
  const messages = [];
  const parseErrors = [];
  for (const header of composer.headers) {
    if (!header.isRenderable) {
      continue;
    }
    const bubble = bubbles.get(header.bubbleId);
    if (!bubble) {
      if (header.hasText) {
        const role = headerToRole(header);
        logger.warn(
          `Bubble ${header.bubbleId} not in cursorDiskKV \u2014 may be encrypted (isNAL=${composer.isNAL})`
        );
        messages.push({
          role,
          content: `[Message content not available locally \u2014 may be server-encrypted]`,
          missingAttachments: [`bubbleId:${header.bubbleId}`]
        });
      }
      continue;
    }
    try {
      const msg = bubbleToMessage(bubble, header, logger);
      if (msg) {
        messages.push(msg);
      }
    } catch (err) {
      const e = `Bubble ${header.bubbleId} parse error: ${String(err)}`;
      parseErrors.push(e);
      logger.warn(e);
    }
  }
  return {
    id: composer.composerId,
    title: composer.name,
    createdAt: composer.createdAt ? new Date(composer.createdAt).toISOString() : null,
    updatedAt: composer.lastUpdatedAt ? new Date(composer.lastUpdatedAt).toISOString() : null,
    messages,
    storagePath: "globalStorage/cursorDiskKV",
    sessionType: composer.unifiedMode ?? "composer",
    hasParseErrors: parseErrors.length > 0,
    parseErrors: parseErrors.length > 0 ? parseErrors : void 0
  };
}
function bubbleToMessage(bubble, header, logger) {
  const role = bubbleTypeToRole(bubble.type, header);
  let content = bubble.text?.trim() ?? "";
  if (bubble.thinking?.trim()) {
    content = `> **Thinking:**
> ${bubble.thinking.replace(/\n/g, "\n> ")}

` + content;
  }
  if (header.capabilityType !== null) {
    const label = CAPABILITY_LABELS[header.capabilityType] ?? `Tool (type ${header.capabilityType})`;
    const toolLabel = header.toolCallId ? `**${label}** \`${header.toolCallId}\`` : `**${label}**`;
    if (!content.trim()) {
      content = toolLabel;
    } else {
      content = `${toolLabel}

${content}`;
    }
  }
  if (!content.trim()) {
    if (bubble.type !== 1) {
      return null;
    }
  }
  return {
    role,
    content,
    timestampMs: bubble.createdAt ?? void 0,
    missingAttachments: void 0
  };
}
function bubbleTypeToRole(type, header) {
  if (type === 1) {
    return header.isSimulatedMsg ? "system" : "user";
  }
  if (type === 2) {
    if (header.capabilityType !== null) {
      if (header.capabilityType === 30) {
        return "assistant";
      }
      return "tool";
    }
    return "assistant";
  }
  if (type === 3) {
    return "system";
  }
  return "unknown";
}
function headerToRole(header) {
  return bubbleTypeToRole(header.type, header);
}
function inferConversationTitle(conversation, fallbackIndex) {
  if (conversation.title?.trim()) {
    return cleanTitle(conversation.title);
  }
  const firstUser = conversation.messages.find((m) => m.role === "user");
  if (firstUser?.content?.trim()) {
    const line = firstUser.content.split("\n")[0].trim();
    if (line.length > 3) {
      return cleanTitle(line);
    }
    const secondLine = firstUser.content.split("\n").find((l) => l.trim().length > 3);
    if (secondLine) {
      return cleanTitle(secondLine);
    }
  }
  const firstMsg = conversation.messages[0];
  if (firstMsg?.content?.trim()) {
    return cleanTitle(firstMsg.content.split("\n")[0]);
  }
  return `Untitled Chat ${String(fallbackIndex).padStart(2, "0")}`;
}
function cleanTitle(raw) {
  return raw.replace(/^#{1,6}\s+/, "").replace(/[*_`]+/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

// src/export/markdownExporter.ts
var fs5 = __toESM(require("fs"));
var path5 = __toESM(require("path"));

// src/export/exportFilter.ts
function getMessageTextForFiltering(message) {
  const value = message.content;
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object") {
        if (typeof item.text === "string") {
          return item.text;
        }
        if (typeof item.content === "string") {
          return item.content;
        }
        if (typeof item.value === "string") {
          return item.value;
        }
      }
      return "";
    }).join("\n");
  }
  if (value && typeof value === "object") {
    if (typeof value.text === "string") {
      return value.text;
    }
    if (typeof value.content === "string") {
      return value.content;
    }
    if (typeof value.value === "string") {
      return value.value;
    }
    return "";
  }
  return "";
}
function normalizeTextForFiltering(text) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}
function isEffectivelyEmpty(text) {
  if (!text || !text.trim()) {
    return true;
  }
  const cleaned = text.replace(/^[-=*]{3,}$/gm, "").replace(/\s/g, "");
  return cleaned.length === 0;
}
function isThinkingOnly(text) {
  if (!text || !text.trim()) {
    return true;
  }
  const stripped = text.replace(/\*/g, "").replace(/_/g, "").replace(/\./g, "").replace(/…/g, "").replace(/:/g, "").trim().toLowerCase();
  if (stripped === "thinking" || stripped === "") {
    return true;
  }
  const lines = text.split("\n");
  const nonBlockquoteLines = lines.filter((l) => !l.trimStart().startsWith(">")).map((l) => l.trim()).filter((l) => l.length > 0 && !/^[-=*]{3,}$/.test(l));
  if (nonBlockquoteLines.length === 0) {
    const blockquoteContent = lines.filter((l) => l.trimStart().startsWith(">")).map((l) => l.replace(/^>+\s*/, "").trim()).filter((l) => l.length > 0);
    if (blockquoteContent.length === 0) {
      return true;
    }
    const isOnlyThinkingHeader = blockquoteContent.every((l) => {
      const cleaned = l.replace(/\*/g, "").replace(/_/g, "").replace(/:/g, "").trim().toLowerCase();
      return cleaned === "thinking" || cleaned === "";
    });
    if (isOnlyThinkingHeader) {
      return true;
    }
  }
  return false;
}
function shouldExportMessage(message, options, logger) {
  try {
    const text = getMessageTextForFiltering(message);
    const normalized = normalizeTextForFiltering(text);
    if (!options.includeEmptyMessages && isEffectivelyEmpty(normalized)) {
      return false;
    }
    if (!options.includeToolCalls && message.role === "tool") {
      return false;
    }
    if (!options.includeThinkingBlocks && message.role === "assistant") {
      if (isThinkingOnly(normalized)) {
        return false;
      }
    }
    return true;
  } catch (err) {
    const id = message.id ?? "unknown";
    logger?.warn(`Filter error for message id=${id} role=${message.role} \u2014 keeping. ${String(err)}`);
    return true;
  }
}
function filterMessages(messages, options, logger) {
  logger?.log(`Filtering ${messages.length} messages (includeToolCalls=${options.includeToolCalls}, includeThinkingBlocks=${options.includeThinkingBlocks}, includeEmptyMessages=${options.includeEmptyMessages})`);
  const visibleMessages = [];
  let filteredCount = 0;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    try {
      if (shouldExportMessage(msg, options, logger)) {
        visibleMessages.push(msg);
      } else {
        filteredCount++;
      }
    } catch (err) {
      logger?.warn(`Unexpected error at message index=${i}, role=${msg.role} \u2014 keeping. ${String(err)}`);
      visibleMessages.push(msg);
    }
  }
  logger?.log(`Filter result: visible=${visibleMessages.length}, filtered=${filteredCount}`);
  return { visibleMessages, filteredCount };
}

// src/types.ts
function defaultExportOptions() {
  return {
    includeToolCalls: false,
    includeThinkingBlocks: false,
    includeEmptyMessages: false
  };
}
function fullExportOptions() {
  return {
    includeToolCalls: true,
    includeThinkingBlocks: true,
    includeEmptyMessages: true
  };
}

// src/export/markdownExporter.ts
var ROLE_HEADING = {
  user: "User",
  assistant: "Assistant",
  system: "System",
  tool: "Tool",
  unknown: "Other"
};
function roleHeading(msg) {
  const label = ROLE_HEADING[msg.role] ?? "Other";
  return msg.toolName ? `${label} (${msg.toolName})` : label;
}
function conversationToMarkdown(conversation, workspacePath, exportedAt = /* @__PURE__ */ new Date(), options = defaultExportOptions(), logger) {
  const { visibleMessages, filteredCount } = filterMessages(
    conversation.messages,
    options,
    logger
  );
  const lines = [];
  const title = inferConversationTitle(conversation, 1);
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`- **Workspace:** ${workspacePath}`);
  lines.push(`- **Exported at:** ${exportedAt.toISOString()}`);
  if (conversation.createdAt) {
    lines.push(`- **Original date:** ${conversation.createdAt}`);
  }
  if (conversation.updatedAt && conversation.updatedAt !== conversation.createdAt) {
    lines.push(`- **Last updated:** ${conversation.updatedAt}`);
  }
  if (conversation.sessionType) {
    lines.push(`- **Session type:** ${conversation.sessionType}`);
  }
  lines.push(`- **Messages:** ${visibleMessages.length}`);
  if (filteredCount > 0) {
    lines.push(`- **Filtered internal messages:** ${filteredCount}`);
  }
  lines.push("- **Source:** Cursor local chat storage");
  if (conversation.hasParseErrors && conversation.parseErrors?.length) {
    lines.push("");
    lines.push("> **Note:** Some messages in this conversation had parse errors:");
    for (const e of conversation.parseErrors) {
      lines.push(`> - ${e}`);
    }
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  if (visibleMessages.length === 0) {
    lines.push("*(No messages to display after filtering.)*");
    lines.push("");
  } else {
    for (const msg of visibleMessages) {
      lines.push(`## ${roleHeading(msg)}`);
      lines.push("");
      lines.push(normaliseContent(msg.content));
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }
  return {
    markdown: lines.join("\n"),
    visibleCount: visibleMessages.length,
    filteredCount
  };
}
function normaliseContent(content) {
  if (!content) {
    return "*(empty)*";
  }
  return content;
}
function writeMarkdownFile(outputDir, filename, markdown, logger) {
  try {
    fs5.mkdirSync(outputDir, { recursive: true });
  } catch (err) {
    const msg = `Failed to create output directory: ${outputDir} \u2014 ${String(err)}`;
    logger.error(msg);
    return { outputPath: path5.join(outputDir, filename), skipped: false, error: msg };
  }
  const outputPath = path5.join(outputDir, filename);
  try {
    fs5.writeFileSync(outputPath, markdown, "utf8");
    logger.log(`Wrote: ${outputPath}`);
    return { outputPath, skipped: false };
  } catch (err) {
    const msg = `Failed to write file: ${outputPath} \u2014 ${String(err)}`;
    logger.error(msg);
    return { outputPath, skipped: false, error: msg };
  }
}

// src/export/filenameSanitizer.ts
var WINDOWS_ILLEGAL = /[\\/:*?"<>|]/g;
var COLLAPSE_TO_HYPHEN = /[\s_+,.;!@#$%^&()=[\]{}'`~]+/g;
var MULTI_HYPHEN = /-{2,}/g;
var EDGE_HYPHEN = /^-+|-+$/g;
function sanitizeFilenameSegment(input, maxLen = 80) {
  return input.toLowerCase().replace(WINDOWS_ILLEGAL, "").replace(COLLAPSE_TO_HYPHEN, "-").replace(MULTI_HYPHEN, "-").replace(EDGE_HYPHEN, "").slice(0, maxLen).replace(EDGE_HYPHEN, "");
}
function formatDatePrefix(date) {
  if (!date) {
    return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}
function buildConversationFilename(title, firstUserMessage, date, fallbackIndex) {
  const datePrefix = formatDatePrefix(date);
  let slug;
  if (title && title.trim()) {
    slug = sanitizeFilenameSegment(title.trim(), 80);
  } else if (firstUserMessage && firstUserMessage.trim()) {
    slug = sanitizeFilenameSegment(firstUserMessage.trim().slice(0, 60), 80);
  } else {
    slug = `untitled-chat-${String(fallbackIndex).padStart(2, "0")}`;
  }
  if (!slug) {
    slug = `untitled-chat-${String(fallbackIndex).padStart(2, "0")}`;
  }
  return `${datePrefix}__${slug}`;
}
function makeUniqueFilename(baseName, usedNames, ext = ".md") {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName + ext;
  }
  for (let i = 2; i < 1e3; i++) {
    const candidate2 = `${baseName}-${i}`;
    if (!usedNames.has(candidate2)) {
      usedNames.add(candidate2);
      return candidate2 + ext;
    }
  }
  const ts = Date.now().toString(36);
  const candidate = `${baseName}-${ts}`;
  usedNames.add(candidate);
  return candidate + ext;
}

// src/export/indexGenerator.ts
var fs6 = __toESM(require("fs"));
var path6 = __toESM(require("path"));
function writeIndexFile(outputDir, workspacePath, results, exportedAt, logger) {
  const lines = [];
  const successful = results.filter((r) => !r.error && !r.skipped);
  const skipped = results.filter((r) => r.skipped);
  const failed = results.filter((r) => r.error);
  const totalVisible = successful.reduce((sum, r) => sum + (r.visibleCount ?? r.conversation.messages.length), 0);
  const totalFiltered = successful.reduce((sum, r) => sum + (r.filteredCount ?? 0), 0);
  lines.push("# Cursor Chat Export \u2014 Index");
  lines.push("");
  lines.push(`- **Export date:** ${exportedAt.toISOString()}`);
  lines.push(`- **Workspace:** ${workspacePath}`);
  lines.push(`- **Total conversations selected:** ${results.length}`);
  lines.push(`- **Successfully exported:** ${successful.length}`);
  if (skipped.length > 0) {
    lines.push(`- **Skipped (already existed):** ${skipped.length}`);
  }
  if (failed.length > 0) {
    lines.push(`- **Failed:** ${failed.length}`);
  }
  if (totalFiltered > 0) {
    lines.push(`- **Total internal messages filtered:** ${totalFiltered}`);
    lines.push(`- **Total visible messages exported:** ${totalVisible}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Exported Files");
  lines.push("");
  for (const r of successful) {
    const filename = path6.basename(r.outputPath);
    const title = r.conversation.title ?? "*(untitled)*";
    const date = r.conversation.createdAt ? ` \u2014 ${r.conversation.createdAt.slice(0, 10)}` : "";
    const visibleCount = r.visibleCount ?? r.conversation.messages.length;
    const filteredCount = r.filteredCount ?? 0;
    const msgs = r.conversation.messages;
    const visibleMsgs = r.visibleMessages ?? msgs;
    const roleCounts = {};
    for (const m of visibleMsgs) {
      roleCounts[m.role] = (roleCounts[m.role] ?? 0) + 1;
    }
    const roleStr = ["user", "assistant", "tool", "system"].filter((role) => roleCounts[role]).map((role) => `${role.charAt(0).toUpperCase() + role.slice(1)}: ${roleCounts[role]}`).join(", ");
    const unknownCount = roleCounts["unknown"] ?? 0;
    let line = `- [\`${filename}\`](./${filename}) \u2014 **${title}**${date}`;
    line += `
  - Messages exported: ${visibleCount}`;
    if (filteredCount > 0) {
      line += `, Internal filtered: ${filteredCount}`;
    }
    if (roleStr) {
      line += `
  - Roles: ${roleStr}`;
      if (unknownCount > 0) {
        line += ` \u26A0\uFE0F Other: ${unknownCount}`;
      }
    }
    lines.push(line);
    if (unknownCount > visibleCount * 0.3 && visibleCount > 3) {
      logger.warn(
        `High "unknown" role count for "${title}": ${unknownCount}/${visibleCount}. Role detection may be incomplete for this conversation format.`
      );
    }
  }
  if (failed.length > 0) {
    lines.push("");
    lines.push("## Failed Exports");
    lines.push("");
    for (const r of failed) {
      lines.push(`- \`${path6.basename(r.outputPath)}\` \u2014 ${r.error}`);
    }
  }
  if (skipped.length > 0) {
    lines.push("");
    lines.push("## Skipped (File Already Existed)");
    lines.push("");
    for (const r of skipped) {
      lines.push(`- \`${path6.basename(r.outputPath)}\``);
    }
  }
  const indexPath = path6.join(outputDir, "INDEX.md");
  try {
    fs6.mkdirSync(outputDir, { recursive: true });
    fs6.writeFileSync(indexPath, lines.join("\n"), "utf8");
    logger.log(`Wrote index: ${indexPath}`);
  } catch (err) {
    logger.error(`Failed to write INDEX.md`, err);
  }
}

// src/ui/commands.ts
var EXPORT_FOLDER = ".cursor-chat-export";
function registerCommands(context, logger) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cursorChatExport.exportCurrentWorkspace",
      () => cmdExportCurrentWorkspace(logger)
    ),
    vscode.commands.registerCommand(
      "cursorChatExport.exportAllWorkspaces",
      () => cmdExportAllWorkspaces(logger)
    ),
    vscode.commands.registerCommand(
      "cursorChatExport.openExportFolder",
      () => cmdOpenExportFolder(logger)
    ),
    vscode.commands.registerCommand(
      "cursorChatExport.diagnose",
      () => cmdDiagnose(logger)
    )
  );
  logger.log("Commands registered.");
}
async function cmdExportCurrentWorkspace(logger) {
  logger.show();
  logger.log("=== Export Current Workspace Chats ===");
  const workspacePath = getActiveWorkspacePath();
  if (!workspacePath) {
    vscode.window.showErrorMessage(
      "Cursor Chat Bulk Export: No workspace folder is currently open."
    );
    return;
  }
  logger.log(`Active workspace: ${workspacePath}`);
  const globalStoragePath = getGlobalStoragePath(logger);
  if (!globalStoragePath) {
    vscode.window.showErrorMessage(
      "Cursor Chat Bulk Export: Could not locate Cursor globalStorage directory. Make sure you are running this extension inside Cursor IDE."
    );
    return;
  }
  let conversations = [];
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Scanning Cursor storage\u2026",
      cancellable: false
    },
    async () => {
      conversations = await loadConversationsForWorkspace(
        globalStoragePath,
        workspacePath,
        logger
      );
    }
  );
  if (conversations.length === 0) {
    vscode.window.showInformationMessage(
      'Cursor Chat Bulk Export: No conversations found for the current workspace.\nCheck the "Cursor Chat Bulk Export" Output Channel for diagnostics.'
    );
    logger.show();
    return;
  }
  const selected = await showConversationPicker(conversations);
  if (!selected || selected.length === 0) {
    return;
  }
  const exportOptions = await showExportModePicker();
  if (!exportOptions) {
    return;
  }
  const outputDir = path7.join(workspacePath, EXPORT_FOLDER);
  await runExport(selected, workspacePath, outputDir, exportOptions, logger);
}
async function cmdExportAllWorkspaces(logger) {
  logger.show();
  logger.log("=== Export All Detected Workspace Chats ===");
  const globalStoragePath = getGlobalStoragePath(logger);
  if (!globalStoragePath) {
    vscode.window.showErrorMessage(
      "Cursor Chat Bulk Export: Could not locate Cursor globalStorage directory."
    );
    return;
  }
  let allComposers = [];
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Scanning all Cursor chats\u2026",
      cancellable: false
    },
    async () => {
      const db = await openGlobalStorageDb(globalStoragePath, logger);
      if (!db) {
        return;
      }
      try {
        allComposers = readAllComposerHeaders(db, logger);
      } finally {
        closeDatabase(db, logger);
      }
    }
  );
  if (allComposers.length === 0) {
    vscode.window.showWarningMessage(
      "Cursor Chat Bulk Export: No conversations found in Cursor storage."
    );
    return;
  }
  const workspaceMap = /* @__PURE__ */ new Map();
  for (const c of allComposers) {
    const wsKey = c.workspaceFsPath ?? c.workspaceExternalUri ?? "(unknown workspace)";
    let label = wsKey;
    if (c.workspaceFsPath) {
      label = path7.basename(c.workspaceFsPath) + "  " + c.workspaceFsPath;
    }
    if (!workspaceMap.has(wsKey)) {
      workspaceMap.set(wsKey, { label, composers: [] });
    }
    workspaceMap.get(wsKey).composers.push(c);
  }
  const workspaceItems = [...workspaceMap.entries()].map(([key, { label, composers }]) => ({
    label: path7.basename(key === "(unknown workspace)" ? "Unknown" : key),
    description: key,
    detail: `${composers.length} conversation(s)`,
    key
  }));
  const pickedWs = await vscode.window.showQuickPick(workspaceItems, {
    title: `Select Workspace  (${workspaceItems.length} workspaces found)`,
    placeHolder: "Choose a workspace to export chats from\u2026"
  });
  if (!pickedWs) {
    return;
  }
  const targetComposers = workspaceMap.get(pickedWs.key).composers;
  let conversations = [];
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Loading conversations\u2026",
      cancellable: false
    },
    async () => {
      conversations = await loadConversationsFromComposers(
        globalStoragePath,
        targetComposers,
        logger
      );
    }
  );
  if (conversations.length === 0) {
    vscode.window.showInformationMessage(
      `Cursor Chat Bulk Export: No conversation content found for "${pickedWs.label}".`
    );
    return;
  }
  const selected = await showConversationPicker(conversations);
  if (!selected || selected.length === 0) {
    return;
  }
  const exportOptions = await showExportModePicker();
  if (!exportOptions) {
    return;
  }
  const activeWs = getActiveWorkspacePath();
  const outputDir = activeWs ? path7.join(activeWs, EXPORT_FOLDER) : path7.join(pickedWs.key, EXPORT_FOLDER);
  await runExport(selected, pickedWs.key, outputDir, exportOptions, logger);
}
async function cmdOpenExportFolder(logger) {
  const workspacePath = getActiveWorkspacePath();
  if (!workspacePath) {
    vscode.window.showErrorMessage(
      "Cursor Chat Bulk Export: No workspace folder is currently open."
    );
    return;
  }
  const exportDir = path7.join(workspacePath, EXPORT_FOLDER);
  if (!fs7.existsSync(exportDir)) {
    const create = await vscode.window.showInformationMessage(
      `Export folder does not exist yet: ${exportDir}`,
      "Create it",
      "Cancel"
    );
    if (create === "Create it") {
      fs7.mkdirSync(exportDir, { recursive: true });
    } else {
      return;
    }
  }
  await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(exportDir));
}
async function cmdDiagnose(logger) {
  logger.show();
  logger.log("=== Diagnose Current Workspace Chat Schema ===");
  const workspacePath = getActiveWorkspacePath();
  if (!workspacePath) {
    logger.warn("No workspace folder is currently open.");
    vscode.window.showWarningMessage("Cursor Chat Bulk Export: Open a workspace folder first.");
    return;
  }
  logger.log(`Active workspace: ${workspacePath}`);
  const globalStoragePath = getGlobalStoragePath(logger);
  if (!globalStoragePath) {
    logger.error("Could not locate globalStorage directory.");
    return;
  }
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Diagnosing Cursor storage\u2026",
      cancellable: false
    },
    async () => {
      const db = await openGlobalStorageDb(globalStoragePath, logger);
      if (!db) {
        logger.error("Could not open globalStorage DB.");
        return;
      }
      try {
        const tables = listTables(db, logger);
        logger.log(`Tables: ${tables.map((t) => t.name).join(", ")}`);
        const hasDKV = hasCursorDiskKV(db, logger);
        logger.log(`Has cursorDiskKV: ${hasDKV}`);
        if (hasDKV) {
          const wsStoragePath = getWorkspaceStoragePath(logger);
          let wsHashes = [];
          if (wsStoragePath) {
            const entries = scanWorkspaceStorage(wsStoragePath, logger);
            const matchingEntries = findMatchingEntries(entries, workspacePath, logger);
            wsHashes = matchingEntries.map((e) => e.hash);
            logger.log(`workspaceStorage hashes: ${wsHashes.join(", ") || "(none found)"}`);
          }
          const allComposers = readAllComposerHeaders(db, logger);
          logger.log(`
Total composers in cursorDiskKV: ${allComposers.length}`);
          const matching = filterComposersByWorkspace(allComposers, workspacePath, logger, wsHashes);
          logger.log(`Composers matching current workspace: ${matching.length}`);
          if (matching.length === 0) {
            logger.warn("No matching composers. Listing all workspace paths found:");
            const paths = new Set(allComposers.map((c) => c.workspaceFsPath ?? c.workspaceExternalUri ?? "(none)"));
            for (const p of paths) {
              logger.log(`  ${p}`);
            }
          }
          for (const comp of matching.slice(0, 5)) {
            logger.log(`
Composer: "${comp.name}" (${comp.composerId})`);
            logger.log(`  isNAL: ${comp.isNAL}`);
            logger.log(`  Headers: ${comp.headers.length}`);
            logger.log(`  Mode: ${comp.unifiedMode}`);
            const bubbles = loadBubblesForComposer(db, comp.composerId, logger);
            logger.log(`  Bubble records loaded: ${bubbles.size}`);
            let sampleCount = 0;
            for (const header of comp.headers.slice(0, 40)) {
              if (!header.isRenderable) {
                continue;
              }
              const bubble = bubbles.get(header.bubbleId);
              const roleStr = header.type === 1 ? "USER" : header.type === 2 ? "ASSISTANT" : `TYPE(${header.type})`;
              const textPreview = bubble?.text?.trim().slice(0, 60) ?? "(no bubble record)";
              logger.log(`  [${roleStr}] ${header.bubbleId} \u2014 "${textPreview}"`);
              if (++sampleCount >= 20) {
                break;
              }
            }
          }
        } else {
          logger.log("Falling back to ItemTable scan...");
          const rows = readItemTable(db, logger, "ItemTable");
          logger.log(`ItemTable rows: ${rows.length}`);
          const chatRows = filterChatRecords(rows, logger);
          logger.log(`Chat-related rows: ${chatRows.length}`);
          for (const r of chatRows) {
            logger.log(`  Key: "${r.key}"`);
          }
        }
      } finally {
        closeDatabase(db, logger);
      }
    }
  );
  vscode.window.showInformationMessage(
    "Cursor Chat Bulk Export: Diagnosis complete \u2014 see Output Channel for details.",
    "Show Output"
  ).then((action) => {
    if (action === "Show Output") {
      logger.show();
    }
  });
}
async function loadConversationsForWorkspace(globalStoragePath, workspacePath, logger) {
  const wsStoragePath = getWorkspaceStoragePath(logger);
  let workspaceHashes = [];
  if (wsStoragePath) {
    const entries = scanWorkspaceStorage(wsStoragePath, logger);
    const matching = findMatchingEntries(entries, workspacePath, logger);
    workspaceHashes = matching.map((e) => e.hash);
    logger.log(`Workspace storage hashes: ${workspaceHashes.join(", ") || "(none)"}`);
  }
  const db = await openGlobalStorageDb(globalStoragePath, logger);
  if (!db) {
    return [];
  }
  try {
    const allComposers = readAllComposerHeaders(db, logger);
    const matching = filterComposersByWorkspace(allComposers, workspacePath, logger, workspaceHashes);
    if (matching.length === 0) {
      logger.warn(`No composers found for workspace: ${workspacePath}`);
      logger.warn("All workspace paths found in storage:");
      const paths = new Set(allComposers.map(
        (c) => c.workspaceFsPath ?? c.workspaceExternalUri ?? `(hash: ${c.workspaceStorageId ?? "none"})`
      ));
      for (const p of paths) {
        logger.log(`  ${p}`);
      }
      return [];
    }
    return await loadConversationsFromComposers(globalStoragePath, matching, logger, db);
  } finally {
    closeDatabase(db, logger);
  }
}
async function loadConversationsFromComposers(globalStoragePath, composers, logger, existingDb) {
  const conversations = [];
  let ownDb = false;
  let db = existingDb;
  if (!db) {
    db = await openGlobalStorageDb(globalStoragePath, logger);
    ownDb = true;
  }
  if (!db) {
    return conversations;
  }
  try {
    for (const composer of composers) {
      logger.log(`
Loading composer: "${composer.name}" (${composer.composerId})`);
      logger.log(
        `  Headers: ${composer.headers.length}  isNAL: ${composer.isNAL}  mode: ${composer.unifiedMode}`
      );
      const renderableHeaders = composer.headers.filter((h) => h.isRenderable);
      logger.log(`  Renderable headers: ${renderableHeaders.length}`);
      if (renderableHeaders.length === 0) {
        logger.log("  Skipping \u2014 no renderable messages");
        continue;
      }
      const bubbles = loadBubblesForComposer(db, composer.composerId, logger);
      logger.log(`  Bubble records: ${bubbles.size}`);
      const conv = composerToConversation(composer, bubbles, logger);
      const msgCountByRole = conv.messages.reduce(
        (acc, m) => {
          acc[m.role] = (acc[m.role] ?? 0) + 1;
          return acc;
        },
        {}
      );
      logger.log(`  Messages extracted: ${conv.messages.length}  ${JSON.stringify(msgCountByRole)}`);
      if (conv.messages.length === 0) {
        logger.log("  Skipping \u2014 no messages after parse");
        continue;
      }
      conversations.push(conv);
    }
  } finally {
    if (ownDb) {
      closeDatabase(db, logger);
    }
  }
  logger.log(`
Total conversations loaded: ${conversations.length}`);
  return conversations;
}
async function showConversationPicker(conversations) {
  const items = conversations.map((c, i) => {
    const title = inferConversationTitle(c, i + 1);
    const date = c.createdAt ? c.createdAt.slice(0, 10) : "unknown date";
    const msgCount = c.messages.length;
    const type = c.sessionType ? ` [${c.sessionType}]` : "";
    const userMsgs = c.messages.filter((m) => m.role === "user").length;
    const aiMsgs = c.messages.filter((m) => m.role === "assistant").length;
    return {
      label: title,
      description: `${date}${type}`,
      detail: `${msgCount} messages (User: ${userMsgs}, Assistant: ${aiMsgs})`,
      picked: true,
      conversation: c
    };
  });
  const picked = await vscode.window.showQuickPick(items, {
    title: `Select Conversations to Export  (${conversations.length} found)`,
    placeHolder: "Space to toggle \u2022 Enter to confirm \u2022 Esc to cancel",
    canPickMany: true,
    matchOnDescription: true,
    matchOnDetail: false
  });
  if (!picked) {
    return null;
  }
  return picked.map((p) => p.conversation);
}
async function showExportModePicker() {
  const items = [
    {
      label: "$(check) Clean export (recommended)",
      description: "User & assistant messages only \u2014 tool calls and thinking blocks removed",
      options: defaultExportOptions(),
      picked: true
    },
    {
      label: "$(archive) Full raw export",
      description: "Everything included \u2014 tool calls, thinking blocks, empty messages",
      options: fullExportOptions(),
      picked: false
    }
  ];
  const picked = await vscode.window.showQuickPick(items, {
    title: "Export Mode",
    placeHolder: "Choose how to filter the exported Markdown\u2026"
  });
  return picked ? picked.options : null;
}
async function runExport(conversations, workspacePath, outputDir, options, logger) {
  logger.log(`Exporting ${conversations.length} conversation(s) to: ${outputDir}`);
  logger.log(`Export mode: includeToolCalls=${options.includeToolCalls}, includeThinkingBlocks=${options.includeThinkingBlocks}, includeEmptyMessages=${options.includeEmptyMessages}`);
  const exportedAt = /* @__PURE__ */ new Date();
  const usedNames = /* @__PURE__ */ new Set();
  const results = [];
  if (fs7.existsSync(outputDir)) {
    try {
      const existing = fs7.readdirSync(outputDir);
      for (const f of existing) {
        if (f.endsWith(".md") && f !== "INDEX.md") {
          usedNames.add(f.slice(0, -3));
        }
      }
    } catch {
    }
  }
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Exporting conversations\u2026",
      cancellable: false
    },
    async (progress) => {
      for (let i = 0; i < conversations.length; i++) {
        const c = conversations[i];
        progress.report({
          message: `${i + 1}/${conversations.length}`,
          increment: 1 / conversations.length * 100
        });
        const displayTitle = inferConversationTitle(c, i + 1);
        const firstUserMsg = c.messages.find((m) => m.role === "user")?.content ?? null;
        const baseName = buildConversationFilename(
          displayTitle !== `Untitled Chat ${String(i + 1).padStart(2, "0")}` ? displayTitle : null,
          firstUserMsg,
          c.createdAt,
          i + 1
        );
        const filename = makeUniqueFilename(baseName, usedNames);
        const renderResult = conversationToMarkdown(c, workspacePath, exportedAt, options, logger);
        const writeResult = writeMarkdownFile(outputDir, filename, renderResult.markdown, logger);
        const { visibleMessages } = filterMessages(c.messages, options, logger);
        results.push({
          conversation: c,
          outputPath: writeResult.outputPath,
          skipped: writeResult.skipped,
          error: writeResult.error,
          visibleCount: renderResult.visibleCount,
          filteredCount: renderResult.filteredCount,
          visibleMessages
        });
        logger.log(
          `  "${displayTitle}" \u2014 visible: ${renderResult.visibleCount}, filtered: ${renderResult.filteredCount}`
        );
      }
    }
  );
  writeIndexFile(outputDir, workspacePath, results, exportedAt, logger);
  const succeeded = results.filter((r) => !r.error && !r.skipped).length;
  const failed = results.filter((r) => r.error).length;
  const summary = `Exported ${succeeded} conversation(s) to \`${EXPORT_FOLDER}/\`` + (failed > 0 ? ` (${failed} failed \u2014 see Output channel)` : "");
  const action = await vscode.window.showInformationMessage(
    `Cursor Chat Bulk Export: ${summary}`,
    "Open Folder",
    "Dismiss"
  );
  if (action === "Open Folder") {
    await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(outputDir));
  }
}
function getActiveWorkspacePath() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return null;
  }
  return folders[0].uri.fsPath;
}

// src/extension.ts
var outputChannel;
function activate(context) {
  outputChannel = vscode2.window.createOutputChannel("Cursor Chat Bulk Export");
  const logger = createLogger(outputChannel);
  logger.log("Cursor Chat Bulk Export extension activated.");
  registerCommands(context, logger);
}
function deactivate() {
  if (outputChannel) {
    outputChannel.dispose();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
