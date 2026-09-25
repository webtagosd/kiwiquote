// Copies the static site into dist/ with content/content.json baked in, so a dashboard
// Publish (which commits content.json) ships on the next Vercel build. index.html keeps
// its literal copy, so it still works opened raw.
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from "node:fs";
import { parseHTML } from "linkedom";

const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const content = JSON.parse(read("content/content.json"));

// Same dot-path resolution as the editor bridge (numeric segments index arrays).
const get = (path) => path.split(".").reduce((cur, seg) => (cur == null ? undefined : cur[seg]), content);
// ponytail: schema says "comma-separated", but bullets like "No jargon, no hard sell" hold a
// comma, so an item only starts where the next word is capitalised or a number.
const commaList = (path) => String(get(path) ?? "").split(/,\s*(?=[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const { document } = parseHTML(read("index.html"));

// ponytail: list items are the repeats already in index.html, so hero.reassurances (3),
// check.miniList (3), check.questions (4), how.steps (3) and faq.list (4) can't grow past
// those counts, and a removed item fails the build here instead of shipping stale copy.
// Upgrade path: render those lists from a <template> per item.
for (const el of document.querySelectorAll("[data-wt]")) {
  const key = el.getAttribute("data-wt");
  const value = get(key);
  if (value === undefined || (value !== null && typeof value === "object")) {
    throw new Error(`content.json has no text value for data-wt="${key}"`);
  }
  const str = value == null ? "" : String(value);
  const attr = el.getAttribute("data-wt-attr");
  if (attr === "background") {
    if (str) el.setAttribute("style", [el.getAttribute("style"), `background-image:url("${str.replace(/"/g, '\\"')}")`, "background-size:cover", "background-position:center"].filter(Boolean).join(";"));
  } else if (attr) {
    if (str) el.setAttribute(attr, str); // empty means "keep what's there", same as the bridge
  } else {
    el.textContent = str;
  }
}

// Build-only bindings the canvas can't live-edit (they need markup around the value).
const name = get("business.name");
document.title = `${name}, ${get("seo.title")}`;
document.querySelector('meta[name="description"]').setAttribute("content", get("seo.description"));

const headline = get("hero.headline");
const highlight = get("hero.highlight");
const h1 = document.getElementById("heroHeadline");
if (highlight && headline.includes(highlight)) {
  const [before, ...after] = headline.split(highlight);
  h1.innerHTML = `${esc(before)}<span class="hl">${esc(highlight)}</span>${esc(after.join(highlight))}`;
} else {
  h1.textContent = headline;
}

for (const ul of document.querySelectorAll("[data-cms-benefits]")) {
  ul.innerHTML = commaList(ul.getAttribute("data-cms-benefits"))
    .map((item) => `<li><span class="bdot"></span> ${esc(item)}</li>`).join("");
}

get("check.questions").forEach((q, i) => {
  const step = document.querySelector(`.survey-step[data-step="${i}"]`);
  const group = step.querySelector(".choices");
  const fieldName = step.getAttribute("data-name");
  const idPrefix = group.querySelector("input").id.replace(/\d+$/, "");
  group.innerHTML = commaList(`check.questions.${i}.options`)
    .map((opt, n) => `<span class="choice"><input type="radio" id="${idPrefix}${n + 1}" name="${fieldName}" value="${esc(opt)}" /><label for="${idPrefix}${n + 1}">${esc(opt)}</label></span>`)
    .join("");
  if (q.required === "yes") step.setAttribute("data-required", "1");
  else step.removeAttribute("data-required");
});

// tel:/mailto: are built from the value, never attr-bound (see BRIEF).
document.querySelector("[data-cms-mailto]").setAttribute("href", `mailto:${get("business.email")}`);
document.querySelector("[data-cms-tel]").setAttribute("href", `tel:${get("business.phone.tel").replace(/\s+/g, "")}`);

const bridge = document.createElement("script");
bridge.setAttribute("src", "/editor-bridge.js");
bridge.setAttribute("defer", "");
document.head.appendChild(bridge);

// --- Search engines ---------------------------------------------------------
// One page, reachable as both / and /index.html, so the canonical points both
// at /. Structured data carries only what content.json actually holds: the
// phone number is still the 0800 000 000 placeholder, so it stays out.
const SITE_URL = "https://kiwiquote.webtag.co.nz";
// Demos are noindex: they carry placeholder copy and unverified reviews under a
// real business's name. Flip to true at go-live — robots.txt and the meta robots
// tag both read this one value.
const INDEXABLE = false;
const ogImage = get("business.logo_image_url");
const head = (html) => document.head.insertAdjacentHTML("beforeend", html);
head(`<link rel="canonical" href="${SITE_URL}/" />`);
if (!INDEXABLE) head(`<meta name="robots" content="noindex,nofollow" />`);
head(`<link rel="icon" href="/assets/kiwi-head.png" />`);
head(`<meta property="og:type" content="website" />`);
head(`<meta property="og:site_name" content="${esc(get("business.name"))}" />`);
head(`<meta property="og:title" content="${esc(document.title)}" />`);
head(`<meta property="og:description" content="${esc(get("seo.description"))}" />`);
head(`<meta property="og:url" content="${SITE_URL}/" />`);
head(`<meta property="og:image" content="${esc(ogImage)}" />`);
head(`<meta name="twitter:card" content="summary_large_image" />`);
head(`<meta name="twitter:image" content="${esc(ogImage)}" />`);
head(
  `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "InsuranceAgency",
    name: get("business.name"),
    description: get("seo.description"),
    slogan: get("business.tagline"),
    url: SITE_URL,
    email: get("business.email"),
    image: ogImage,
    logo: ogImage,
    areaServed: get("business.locationLabel"),
  })}</script>`,
);

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
cpSync(new URL("assets/", root), new URL("assets/", dist), { recursive: true });
cpSync(new URL("editor-bridge.js", root), new URL("editor-bridge.js", dist));
cpSync(new URL("site.js", root), new URL("site.js", dist));
cpSync(new URL("404.html", root), new URL("404.html", dist));
writeFileSync(new URL("index.html", dist), document.toString());
// One `User-agent: *` Allow covers GPTBot, ClaudeBot, PerplexityBot and the
// rest. Do not add per-bot Disallow lines: blocking them is how a site
// disappears from AI answers.
writeFileSync(
  new URL("robots.txt", dist),
  INDEXABLE
    ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
    : `User-agent: *\nDisallow: /\n`,
);
writeFileSync(
  new URL("sitemap.xml", dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc></url>\n</urlset>\n`,
);
console.log("built dist/index.html, robots.txt, sitemap.xml");
