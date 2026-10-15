import axios from "axios";

// FAQ pages from the Retype documentation site (https://github.com/DanBot-Hosting/Documentation-Site)
// Each page is structured as "## Category" headings containing "### Question" headings.
const docsUrl = "https://docs.danbot.host";
const rawUrl = "https://raw.githubusercontent.com/DanBot-Hosting/Documentation-Site/main/src";

const sources: FaqSource[] = [
    { key: "general", label: "General", path: "faq.md", page: "/faq/" },
    { key: "vps", label: "VPS", path: "vps/faq.md", page: "/vps/faq/" }
]

// How long fetched FAQs are kept before being refreshed
const cacheTime = 15 * 60 * 1000;

export type FaqSource = {
    key: string;
    label: string;
    path: string;
    page: string;
}

export type FaqEntry = {
    id: string;
    source: FaqSource;
    category: string;
    question: string;
    answer: string;
    url: string;
}

let cache: FaqEntry[] = [];
let cachedAt = 0;
let pending: Promise<FaqEntry[]> = null;

// Matches Retype's heading anchor IDs, e.g. "Donations & Premium Servers" -> "donations--premium-servers"
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9 _-]/g, "")
        .trim()
        .replace(/ /g, "-");
}

// Converts Retype markdown into something Discord renders properly
function toDiscordMarkdown(lines: string[]): string {
    const output: string[] = [];
    let inCodeBlock = false;
    let indent = 0;

    for(const line of lines) {
        const trimmed = line.trim();

        if(trimmed.startsWith("```")) {
            if(!inCodeBlock) indent = Math.max(line.search(/\S/), 0);
            inCodeBlock = !inCodeBlock;
            output.push(trimmed);
            continue;
        }

        if(inCodeBlock) {
            // Remove the indentation of the code fence from its contents
            output.push(line.replace(new RegExp(`^ {0,${indent}}`), ""));
            continue;
        }

        // Make relative docs links absolute
        output.push(trimmed.replace(/\]\((\/[^)]*)\)/g, `](${docsUrl}$1)`));
    }

    return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function parseFaq(markdown: string, source: FaqSource): FaqEntry[] {
    const entries: FaqEntry[] = [];
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");

    let category: string = null;
    let current: { question: string, category: string, lines: string[] } = null;
    let inCodeBlock = false;
    let inCallout = false;
    let i = 0;

    // Skip frontmatter
    if(lines[0]?.trim() === "---") {
        i = 1;
        while(i < lines.length && lines[i].trim() !== "---") i++;
        i++;
    }

    const finish = () => {
        if(!current) return;

        const answer = toDiscordMarkdown(current.lines);

        if(answer) {
            entries.push({
                id: "",
                source,
                category: current.category,
                question: current.question,
                answer,
                url: `${docsUrl}${source.page}#${slugify(current.question)}`
            })
        }

        current = null;
    }

    for(; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if(trimmed.startsWith("```")) inCodeBlock = !inCodeBlock;

        if(!inCodeBlock) {
            // Retype callouts (e.g. "!!!info Title" ... "!!!") become quotes inside answers
            if(trimmed.startsWith("!!!")) {
                const title = trimmed.replace(/^!!!\S*\s*/, "");

                inCallout = !inCallout || title.length > 0;
                if(inCallout && title && current) current.lines.push(`> **${title}**`);
                continue;
            }

            if(inCallout) {
                if(current && trimmed) current.lines.push(`> ${trimmed}`);
                continue;
            }

            if(/^---+$/.test(trimmed)) {
                finish();
                continue;
            }

            if(line.startsWith("# ")) {
                finish();
                category = null;
                continue;
            }

            if(line.startsWith("## ")) {
                finish();
                category = line.slice(3).trim().replace(/:$/, "").trim();
                continue;
            }

            if(line.startsWith("### ")) {
                finish();
                current = { question: line.slice(4).trim().replace(/:$/, ""), category: category ?? source.label, lines: [] };
                continue;
            }
        }

        if(current) current.lines.push(line);
    }

    finish();

    return entries;
}

async function fetchEntries(): Promise<FaqEntry[]> {
    const results = await Promise.all(sources.map(async source => {
        const res = await axios.get(`${rawUrl}/${source.path}`, { responseType: "text", timeout: 5000 });

        return parseFaq(res.data, source);
    }))

    const entries: FaqEntry[] = [];
    const ids: { [id: string]: boolean } = {};

    for(const list of results) {
        for(const entry of list) {
            // Autocomplete values are limited to 100 characters
            const base = `${entry.source.key}:${slugify(entry.question)}`.slice(0, 95);
            let id = base;
            let n = 2;

            while(ids[id]) id = `${base}-${n++}`;

            ids[id] = true;
            entry.id = id;
            entries.push(entry);
        }
    }

    return entries;
}

// Returns the cached FAQs, refreshing them from GitHub when stale.
// If a refresh fails, the previously cached FAQs are returned instead.
export async function getFaqEntries(force = false): Promise<FaqEntry[]> {
    if(!force && cache.length && Date.now() - cachedAt < cacheTime) return cache;

    if(!pending) {
        pending = fetchEntries()
            .then(entries => {
                if(!entries.length) throw new Error("No FAQs were found in the documentation.");

                cache = entries;
                cachedAt = Date.now();

                return entries;
            })
            .then(entries => {
                pending = null;
                return entries;
            }, err => {
                pending = null;
                // Retry in a minute instead of on every request
                if(cache.length) cachedAt = Date.now() - cacheTime + 60 * 1000;
                throw err;
            });
    }

    try {
        return await pending;
    } catch(err) {
        if(cache.length) return cache;

        throw err;
    }
}

// Topics that aren't phrased as questions (e.g. "Online") are prefixed with their category for context
export function getFaqTitle(entry: FaqEntry): string {
    return entry.question.endsWith("?") ? entry.question : `${entry.category} › ${entry.question}`;
}

export function getCachedFaqEntries(): FaqEntry[] {
    return cache;
}

export function searchFaq(entries: FaqEntry[], query: string): FaqEntry[] {
    const words = query.toLowerCase().split(/\s+/).filter(word => word.length);

    if(!words.length) return entries;

    return entries
        .map(entry => {
            const question = entry.question.toLowerCase();
            // Include the source label so searches like "vps" match that page's FAQs
            const category = `${entry.source.label} ${entry.category}`.toLowerCase();
            const answer = entry.answer.toLowerCase();

            let score = 0;

            if(question.indexOf(query.toLowerCase().trim()) !== -1) score += 10;

            for(const word of words) {
                if(question.indexOf(word) !== -1) score += 3;
                else if(category.indexOf(word) !== -1) score += 2;
                else if(answer.indexOf(word) !== -1) score += 1;
                else return { entry, score: 0 };
            }

            return { entry, score };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(result => result.entry);
}
