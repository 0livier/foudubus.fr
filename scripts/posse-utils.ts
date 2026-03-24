import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

type ParsedFrontmatter = {
	title?: string;
	description?: string;
	tags?: string[];
	openGraphDescription?: string;
	twitterDescription?: string;
};

function stripYamlQuotes(value: string): string {
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1).trim();
	}
	return trimmed;
}

function splitFrontmatter(raw: string) {
	if (!raw.startsWith("---\n")) return { frontmatter: "", body: raw };
	const end = raw.indexOf("\n---\n", 4);
	if (end === -1) return { frontmatter: "", body: raw };
	return {
		frontmatter: raw.slice(4, end),
		body: raw.slice(end + 5)
	};
}

function parseFrontmatter(frontmatter: string): ParsedFrontmatter {
	const lines = frontmatter.split("\n");
	const result: ParsedFrontmatter = {};
	let currentSection: "openGraph" | "twitter" | null = null;

	for (const line of lines) {
		if (/^\S/.test(line)) currentSection = null;
		if (/^openGraph:\s*$/.test(line)) {
			currentSection = "openGraph";
			continue;
		}
		if (/^twitter:\s*$/.test(line)) {
			currentSection = "twitter";
			continue;
		}

		const title = line.match(/^title:\s*(.+)\s*$/);
		if (title) {
			result.title = stripYamlQuotes(title[1]);
			continue;
		}
		const description = line.match(/^description:\s*(.+)\s*$/);
		if (description) {
			result.description = stripYamlQuotes(description[1]);
			continue;
		}

		const tags = line.match(/^tags:\s*\[(.+)\]\s*$/);
		if (tags) {
			result.tags = tags[1]
				.split(",")
				.map(value => value.trim())
				.filter(Boolean);
			continue;
		}

		if (currentSection === "openGraph") {
			const nestedDescription = line.match(/^\s+description:\s*(.+)\s*$/);
			if (nestedDescription) {
				result.openGraphDescription = stripYamlQuotes(nestedDescription[1]);
				continue;
			}
		}

		if (currentSection === "twitter") {
			const nestedDescription = line.match(/^\s+description:\s*(.+)\s*$/);
			if (nestedDescription) {
				result.twitterDescription = stripYamlQuotes(nestedDescription[1]);
			}
		}
	}

	return result;
}

function cleanMarkdown(input: string): string {
	return input
		.replace(/^#{1,6}\s+/gm, "")
		.replace(/^>\s?/gm, "")
		.replace(/^\s*[-*+]\s+/gm, "")
		.replace(/^\s*\d+\.\s+/gm, "")
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/[*_~]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function firstParagraph(body: string): string {
	const blocks = body.split(/\n\s*\n/g);
	for (const block of blocks) {
		const text = cleanMarkdown(block);
		if (text.length > 0) return text;
	}
	return "";
}

function truncateText(input: string, max: number): string {
	if (input.length <= max) return input;
	const clipped = input.slice(0, Math.max(0, max - 1));
	const boundary = clipped.lastIndexOf(" ");
	if (boundary > 40) {
		return `${clipped.slice(0, boundary)}…`;
	}
	return `${clipped.trim()}…`;
}

function noteSlugFromPath(notePath: string): string {
	const absolute = resolve(notePath);
	const relativePath = relative(resolve("src/content/note"), absolute).replaceAll("\\", "/");

	if (relativePath.startsWith("..")) {
		throw new Error("The note file must be inside src/content/note");
	}

	let slug = relativePath;
	if (slug.endsWith("/index.md")) slug = slug.slice(0, -"/index.md".length);
	else if (slug.endsWith(".md")) slug = slug.slice(0, -3);

	return slug;
}

function normalizeSite(site: string): string {
	return site.replace(/\/+$/, "");
}

function toHashtag(tag: string): string {
	const normalized = tag
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^\p{L}\p{N}]+/gu, "")
		.trim();
	return normalized ? `#${normalized}` : "";
}

function buildHashtags(tags: string[] | undefined): string {
	if (!tags || tags.length === 0) return "";
	const unique = Array.from(new Set(tags.map(toHashtag).filter(Boolean))).slice(0, 4);
	return unique.join(" ");
}

function buildCopy(teaser: string, canonical: string, hashtags: string) {
	const intro = teaser.trim();
	const linkLine = `Lire sur foudubus.fr : ${canonical}`;
	const tagsLine = hashtags ? `\n\n${hashtags}` : "";
	return `${intro}\n\n${linkLine}${tagsLine}`;
}

export function loadPosseContent(notePath: string, max = 240, site = "https://foudubus.fr") {
	const raw = readFileSync(resolve(notePath), "utf8");
	const { frontmatter, body } = splitFrontmatter(raw);
	const parsed = parseFrontmatter(frontmatter);
	const teaserSource =
		parsed.twitterDescription || parsed.openGraphDescription || parsed.description || firstParagraph(body);

	if (!teaserSource) {
		throw new Error("Could not extract teaser from description or body.");
	}

	const teaser = truncateText(cleanMarkdown(teaserSource), max);
	const hashtags = buildHashtags(parsed.tags);
	const slug = noteSlugFromPath(notePath);
	const canonical = `${normalizeSite(site)}/note/${slug}/`;
	const text = buildCopy(teaser, canonical, hashtags);

	return {
		title: parsed.title,
		notePath,
		canonical,
		text
	};
}
