#!/usr/bin/env tsx

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPosseContent } from "./posse-utils";

type CliArgs = {
	notePath: string;
	max: number;
	site: string;
	dryRun: boolean;
};

function parseArgs(args: string[]): CliArgs {
	let notePath = "";
	let max = 240;
	let site = "https://foudubus.fr";
	let dryRun = false;

	for (let i = 0; i < args.length; i++) {
		const token = args[i];
		if (!token) continue;

		if (token === "--dry-run") {
			dryRun = true;
			continue;
		}

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

		if (!notePath) notePath = token;
	}

	if (!notePath) {
		throw new Error(
			"Usage: pnpm posse:post:mastodon <note-file> [--dry-run] [--max 240] [--site https://foudubus.fr]"
		);
	}

	return { notePath, max, site, dryRun };
}

function loadEnvFile() {
	const envPath = resolve(".env");
	if (!existsSync(envPath)) return;
	const content = readFileSync(envPath, "utf8");
	for (const rawLine of content.split("\n")) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const sep = line.indexOf("=");
		if (sep === -1) continue;
		const key = line.slice(0, sep).trim();
		const value = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, "");
		if (key && process.env[key] === undefined) {
			process.env[key] = value;
		}
	}
}

async function postToMastodon(baseUrl: string, token: string, status: string) {
	const endpoint = `${baseUrl.replace(/\/+$/, "")}/api/v1/statuses`;
	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			authorization: `Bearer ${token}`,
			"content-type": "application/json"
		},
		body: JSON.stringify({ status, visibility: "public" })
	});

	if (!response.ok) {
		const details = await response.text();
		throw new Error(`Mastodon API error (${response.status}): ${details}`);
	}

	const payload = (await response.json()) as { url?: string; uri?: string; id?: string };
	return payload;
}

try {
	const args = parseArgs(process.argv.slice(2));
	loadEnvFile();

	const mastodonBaseUrl = process.env.MASTODON_BASE_URL;
	const mastodonToken = process.env.MASTODON_ACCESS_TOKEN;
	const data = loadPosseContent(args.notePath, args.max, args.site);

	console.log("POSSE Mastodon post");
	console.log("===================");
	if (data.title) console.log(`Title: ${data.title}`);
	console.log(`Source file: ${data.notePath}`);
	console.log(`Canonical: ${data.canonical}`);
	console.log("");
	console.log("Post body");
	console.log("---------");
	console.log(data.text);

	if (args.dryRun) {
		console.log("");
		console.log("Dry run enabled: no post was published.");
		process.exit(0);
	}

	if (!mastodonBaseUrl || !mastodonToken) {
		throw new Error("Missing MASTODON_BASE_URL or MASTODON_ACCESS_TOKEN. Add them to .env (see .env.dist).");
	}

	const result = await postToMastodon(mastodonBaseUrl, mastodonToken, data.text);
	console.log("");
	console.log("Published successfully.");
	if (result.url) console.log(`Mastodon URL: ${result.url}`);
	else if (result.uri) console.log(`Mastodon URI: ${result.uri}`);
	else if (result.id) console.log(`Mastodon ID: ${result.id}`);
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
