#!/usr/bin/env tsx

import { loadPosseContent } from "./posse-utils";

function parseArgs(args: string[]) {
	let notePath = "";
	let max = 240;
	let site = "https://foudubus.fr";

	for (let i = 0; i < args.length; i++) {
		const token = args[i];
		if (!token) continue;

		if (token === "--max") {
			const next = args[i + 1];
			if (!next || Number.isNaN(Number(next))) {
				throw new Error("Expected numeric value after --max");
			}
			max = Number(next);
			i++;
			continue;
		}

		if (token === "--site") {
			const next = args[i + 1];
			if (!next) {
				throw new Error("Expected URL value after --site");
			}
			site = next;
			i++;
			continue;
		}

		if (!notePath) {
			notePath = token;
		}
	}

	if (!notePath) {
		throw new Error("Usage: pnpm posse:prepare <note-file> [--max 240] [--site https://foudubus.fr]");
	}

	return { notePath, max, site };
}

try {
	const { notePath, max, site } = parseArgs(process.argv.slice(2));
	const data = loadPosseContent(notePath, max, site);

	console.log("POSSE teaser preparation");
	console.log("========================");
	if (data.title) console.log(`Title: ${data.title}`);
	console.log(`Source file: ${data.notePath}`);
	console.log(`Canonical: ${data.canonical}`);
	console.log("");
	console.log("Bluesky");
	console.log("-------");
	console.log(data.text);
	console.log("");
	console.log("Mastodon");
	console.log("--------");
	console.log(data.text);
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
