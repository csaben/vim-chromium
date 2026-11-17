// Unit checks for the content script and the service worker, with no browser: both files are
// run in a vm context against stub chrome.* APIs, so key handling, the per-site pause and the
// dev auto-reload can be asserted directly. Run: node test/unit.mjs
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { webcrypto } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const CONTENT = read("content.js"), BACKGROUND = read("background.js");

let fails = 0;
const t = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want), ok = g === w;
  if (!ok) fails++;
  console.log((ok ? "PASS" : "FAIL").padEnd(5), label.padEnd(52), "got=" + g, ok ? "" : "want=" + w);
};
const section = (s) => console.log("\n-- " + s + " " + "-".repeat(Math.max(0, 60 - s.length)));

// ---- content script ------------------------------------------------------------------------
class KeyEv extends Event {
  constructor(key, m = {}) {
    super("keydown", { cancelable: true, bubbles: true });
    Object.defineProperty(this, "isTrusted", { value: true });
    this.key = key; this.code = m.code || key;
    this.ctrlKey = !!m.ctrlKey; this.altKey = !!m.altKey; this.metaKey = !!m.metaKey; this.shiftKey = !!m.shiftKey;
  }
}

function world(o = {}) {
  const sent = [];
  const el = { scrollBy() {}, scrollTo() {}, scrollHeight: 1000, clientHeight: 100 };
  const doc = new EventTarget(); doc.scrollingElement = el; doc.querySelectorAll = () => [];
  const win = new EventTarget(); win.document = doc; win.innerHeight = 800; win.postMessage = () => {};
  win.top = o.topHost
    ? Object.assign(new EventTarget(), { location: { hostname: o.topHost }, document: { querySelectorAll: () => [], scrollingElement: el } })
    : win;
  if (win.top === win) win.location = { hostname: o.host || "example.com" };
  const state = { pausedSites: o.paused !== undefined ? o.paused : ["leetcode.com", "neetcode.io", "coderpad.io"] };
  const ctx = {
    window: win, document: doc, innerHeight: 800, URL, setTimeout, clearTimeout, console,
    Event, CustomEvent, EventTarget, AbortController, Object, Array, Set, JSON, String, Promise,
    location: { hostname: o.host || "example.com", ancestorOrigins: o.ancestors || [] },
    chrome: { runtime: { id: "abc", sendMessage: (m) => sent.push(m) },
      storage: { sync: { get: (d, cb) => cb({ ...d, ...state }) }, local: {}, onChanged: { addListener: () => {} } } },
  };
  vm.createContext(ctx);
  return { sent, ctx, state,
    inject: () => vm.runInContext(CONTENT, ctx),
    press: (key, m = {}) => { const e = new KeyEv(key, m); doc.dispatchEvent(e); return e } };
}
const live = (w, ...args) => w.press(...args).defaultPrevented;

section("per-site pause");
{
  const w = world({ host: "example.com" }); w.inject();
  t("example.com: keys active", live(w, "j"), true);
  for (const h of ["leetcode.com", "www.leetcode.com", "neetcode.io", "coderpad.io", "app.coderpad.io"]) {
    const s = world({ host: h }); s.inject();
    t(h + ": paused", live(s, "j"), false);
    t("  " + h + ": sends nothing", s.sent.length, 0);
  }
  for (const h of ["notleetcode.com", "leetcode.com.evil.io"]) {
    const s = world({ host: h }); s.inject();
    t(h + ": not paused by lookalike", live(s, "j"), true);
  }
  let s = world({ host: "cdn.example.com", ancestors: ["https://leetcode.com"] }); s.inject();
  t("iframe under a paused page: paused", live(s, "j"), false);
  s = world({ host: "cdn.example.com", topHost: "neetcode.io" }); s.inject();
  t("iframe via top frame host: paused", live(s, "j"), false);
  s = world({ host: "leetcode.com", paused: [] }); s.inject();
  t("empty list: nothing paused", live(s, "j"), true);
}

section("re-injection after a self-reload");
{
  // The isolated world outlives an extension reload, so a re-injected copy has to take over
  // from the old one. Guarding with a global flag would leave the dead copy in charge instead.
  const w = world({ host: "example.com", paused: ["example.com"] });
  w.inject();
  t("first copy: paused as loaded", live(w, "j"), false);
  w.state.pausedSites = [];
  w.inject();
  t("re-injected copy is the one in charge", live(w, "j"), true);

  const d = world({ host: "docs.google.com" }); d.inject(); d.inject(); d.inject();
  d.press("Escape"); d.sent.length = 0; d.press("y"); d.press("y");
  t("injected 3x: exactly one live handler", d.sent.filter((m) => m.action === "docs-keys").length, 1);

  const o = world({ host: "example.com" }); o.inject(); o.ctx.chrome.runtime.id = undefined;
  t("orphaned context: stops handling keys", live(o, "j"), false);
}

section("google docs normal mode");
{
  const seq = (label, keys, want) => {
    const d = world({ host: "docs.google.com" }); d.inject();
    d.press("Escape"); d.sent.length = 0;
    for (const [k, m] of keys) d.press(k, m);
    t(label, d.sent.filter((x) => x.action === "docs-keys").map((x) =>
      (x.seq.map((y) => (y.ctrlKey ? "C-" : "") + (y.shiftKey ? "S-" : "") + y.key + (y.command ? "(" + y.command + ")" : "")).join(" ") || "-")
      + (x.mode ? " =>" + x.mode : "")).join(" | "), want);
  };
  const sh = (k) => [k, { shiftKey: true }];
  seq("yy yanks the line", [["y", {}], ["y", {}]], "Home S-End C-c(copy) Home");
  seq("dd cuts the line", [["d", {}], ["d", {}]], "Home S-End C-x(cut) Delete");
  seq("yy then p duplicates below", [["y", {}], ["y", {}], ["p", {}]], "Home S-End C-c(copy) Home | End Enter C-v(paste)");
  seq("yy then P puts above", [["y", {}], ["y", {}], sh("P")], "Home S-End C-c(copy) Home | Home Enter ArrowUp C-v(paste)");
  seq("o opens below", [["o", {}]], "End Enter =>insert");
  seq("O opens above", [sh("O")], "Home Enter ArrowUp =>insert");
  seq("A appends at line end", [sh("A")], "End =>insert");
  seq("I inserts at line start", [sh("I")], "Home =>insert");
  seq("a appends after cursor", [["a", {}]], "ArrowRight =>insert");
  seq("i inserts at cursor", [["i", {}]], "- =>insert");
  seq("gg to document start", [["g", {}], ["g", {}]], "C-Home");
  seq("G to document end", [sh("G")], "C-End");
  seq("hjkl move the cursor", [["h", {}], ["j", {}], ["k", {}], ["l", {}]], "ArrowLeft | ArrowDown | ArrowUp | ArrowRight");
  seq("w b e move by word", [["w", {}], ["b", {}], ["e", {}]], "C-ArrowRight | C-ArrowLeft | C-ArrowRight");
  seq("0 and $ jump within the line", [["0", {}], ["$", {}]], "Home | End");
  const d = world({ host: "docs.google.com" }); d.inject(); d.press("Escape");
  t("Ctrl+V passes through to the page", d.press("v", { ctrlKey: true }).defaultPrevented, false);
}

// ---- service worker ------------------------------------------------------------------------
section("service worker");
const rejects = [];
process.on("unhandledRejection", (e) => rejects.push(String((e && e.message) || e)));

const noop = () => {}, lis = { addListener: noop };
const files = {}, local = {};
let reloads = 0, injections = 0, timeouts = 0, intervals = 0, tabs = [];
for (const f of ["manifest.json", "background.js", "content.js", "options.html", "options.js", "popup.html", "popup.js"]) files[f] = "v1 " + f;
const chromeStub = {
  runtime: { id: "x", onInstalled: lis, onStartup: lis, onMessage: lis,
    getManifest: () => ({ version: "0.3.0" }), getURL: (p) => "ext://" + p, reload: () => { reloads++ } },
  storage: { sync: { get: (d, cb) => cb && cb(typeof d === "object" && d ? { ...d } : {}), set: async () => {} },
    local: { get: async (k) => (k in local ? { [k]: local[k] } : {}), set: async (o) => { Object.assign(local, o) } },
    onChanged: lis },
  tabs: { query: async () => tabs, get: async (id) => tabs.find((x) => x.id === id), onActivated: lis, onUpdated: lis },
  action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
  commands: { onCommand: lis }, alarms: { create: noop, onAlarm: lis },
  debugger: { onDetach: lis, attach: async () => {}, detach: async () => {} },
  scripting: { executeScript: async () => { injections++ } },
  management: { getSelf: async () => ({ installType: "development" }) },
};
const bgCtx = {
  chrome: chromeStub, crypto: webcrypto, TextEncoder, console, Date, URL, Set, Map, Promise, Object, String, Uint8Array, Array, JSON,
  fetch: async (u) => {
    const n = String(u).replace("ext://", "");
    if (files[n] !== undefined) return { text: async () => files[n] };
    if (String(u).includes("raw.githubusercontent")) return { json: async () => ({ version: "0.3.0" }) };
    throw new Error("404");
  },
  setTimeout: () => { timeouts++ }, clearTimeout: noop, setInterval: () => { intervals++ },
};
vm.createContext(bgCtx);
vm.runInContext(BACKGROUND, bgCtx);
const bg = (code) => vm.runInContext(code, bgCtx);

await new Promise((r) => setTimeout(r, 80));
t("loads with no unhandled rejection", rejects, []);
t("dev watcher armed", intervals, 1);

t("norm strips scheme, path and www", bg("norm('https://www.LeetCode.com/problems/x')"), "leetcode.com");
bg("pausedCache=['coderpad.io']");
t("a parent domain pauses subdomains", bg("isPaused('app.coderpad.io')"), true);
t("a lookalike host is not paused", bg("isPaused('notcoderpad.io')"), false);
t("a suffix trick is not paused", bg("isPaused('coderpad.io.evil.com')"), false);
const setP = async (list, host, on) => { bg("pausedCache=" + JSON.stringify(list)); await bg(`setPaused(${JSON.stringify(host)},${on})`); return bg("pausedCache") };
t("resuming a subdomain drops the parent entry", await setP(["coderpad.io"], "app.coderpad.io", false), []);
t("pausing strips www", await setP([], "www.leetcode.com", true), ["leetcode.com"]);
t("pausing twice is idempotent", await setP(["leetcode.com"], "leetcode.com", true), ["leetcode.com"]);
t("pausing keeps the other entries", await setP(["leetcode.com"], "neetcode.io", true), ["leetcode.com", "neetcode.io"]);
tabs = [{ id: 7, url: "https://app.coderpad.io/sandbox", active: true }];
bg("pausedCache=['coderpad.io']");
t("toggle resumes a tab paused by its parent", await bg("togglePause()"), { host: "app.coderpad.io", paused: false });
tabs = [{ id: 8, url: "chrome://extensions", active: true }];
t("toggle ignores non-http pages", await bg("togglePause()"), null);
tabs = [];

await bg("devCheck()");
t("first check records the fingerprint", reloads, 0);
t("  fingerprint is a sha-1", typeof local.devFp === "string" && local.devFp.length === 40, true);
const fp1 = local.devFp;
await bg("devCheck()");
t("unchanged files: no reload", reloads, 0);
files["content.js"] = "v2 edited";
await bg("devCheck()");
t("edit seen: waits for the files to settle", reloads, 0);
t("  a retry is scheduled", timeouts > 0, true);
await bg("devCheck()");
t("settled edit: reloads itself", reloads, 1);
t("  the new fingerprint is stored", local.devFp !== fp1, true);
bg("attached.add(99)");
files["content.js"] = "v3 edited again";
await bg("devCheck()"); await bg("devCheck()");
t("held back while the debugger is attached", reloads, 1);
bg("attached.delete(99)");
await bg("devCheck()");
t("proceeds once the debugger detaches", reloads, 2);
tabs = [{ id: 1, url: "https://example.com" }, { id: 2, url: "https://docs.google.com/x" }];
await bg("reinjectTabs()");
t("re-injects every http tab", injections, 2);
t("no unhandled rejections overall", rejects, []);

console.log(fails ? "\n" + fails + " FAILURE(S)" : "\nall checks passed");
process.exit(fails ? 1 : 0);
