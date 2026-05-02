#!/usr/bin/env bun
import {
  createAnthropicDecide,
  createCodexCliDecide,
  createOpenAIDecide,
  runAgent,
} from "../src/index";

type Provider = "codex" | "openai" | "anthropic";

interface CliOptions {
  task: string;
  url?: string;
  maxSteps?: number;
  headless: boolean;
  model?: string;
  verbose: boolean;
  provider: Provider;
  apiKey?: string;
  baseUrl?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const positional: string[] = [];
  const opts: Partial<CliOptions> = { headless: true, verbose: false, provider: "codex" };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--url") {
      opts.url = argv[++i];
    } else if (arg === "--max-steps") {
      opts.maxSteps = Number.parseInt(argv[++i] ?? "0", 10);
    } else if (arg === "--no-headless") {
      opts.headless = false;
    } else if (arg === "--headless") {
      opts.headless = true;
    } else if (arg === "--model") {
      opts.model = argv[++i];
    } else if (arg === "--provider") {
      opts.provider = argv[++i] as Provider;
    } else if (arg === "--api-key") {
      opts.apiKey = argv[++i];
    } else if (arg === "--base-url") {
      opts.baseUrl = argv[++i];
    } else if (arg === "--verbose" || arg === "-v") {
      opts.verbose = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg !== undefined) {
      positional.push(arg);
    }
  }

  const task = positional.join(" ").trim();
  if (!task) {
    printHelp();
    process.exit(1);
  }

  return {
    task,
    url: opts.url,
    maxSteps: opts.maxSteps,
    headless: opts.headless ?? true,
    model: opts.model,
    verbose: opts.verbose ?? false,
    provider: opts.provider ?? "codex",
    apiKey: opts.apiKey,
    baseUrl: opts.baseUrl,
  };
}

function writeVerbose(event: string, data: unknown) {
  console.error(JSON.stringify({ event, data }));
}

function printHelp() {
  console.log(`browser-agent — run a browser task with an LLM agent.

Usage:
  browser-agent "<task>" [--url <start-url>] [--max-steps N] [--no-headless]
    [--provider codex|openai|anthropic] [--model <model>] [--api-key <key>]
    [--base-url <url>] [--verbose]

Providers:
  codex      OpenAI Codex CLI (default)
  openai     OpenAI Chat Completions API (other compatible providers may work via --base-url)
  anthropic  Anthropic Messages API

Env (recommended over --api-key, which appears in process listings and shell history):
  CODEX_BIN         path to codex binary (default: codex)
  OPENAI_API_KEY    used when --provider=openai and --api-key omitted
  ANTHROPIC_API_KEY used when --provider=anthropic and --api-key omitted

Examples:
  browser-agent "Go to example.com and report the H1"
  browser-agent "Find top 5 frontend jobs on seek.com.au" --url https://seek.com.au --max-steps 30
  browser-agent "Summarize page" --provider openai --model gpt-4.1-mini
`);
}

const opts = parseArgs(process.argv.slice(2));

function buildDecide(opts: CliOptions) {
  switch (opts.provider) {
    case "openai":
      return createOpenAIDecide({
        model: opts.model ?? "gpt-4.1-mini",
        apiKey: opts.apiKey,
        baseURL: opts.baseUrl,
      });
    case "anthropic":
      return createAnthropicDecide({
        model: opts.model ?? "claude-sonnet-4-5",
        apiKey: opts.apiKey,
        baseURL: opts.baseUrl,
      });
    case "codex":
    default:
      return createCodexCliDecide({
        model: opts.model ?? "gpt-5.3-codex",
        onRaw: opts.verbose ? (raw, step) => writeVerbose("model.raw", { step, raw }) : undefined,
      });
  }
}

const result = await runAgent({
  task: opts.task,
  startUrl: opts.url,
  maxSteps: opts.maxSteps,
  launch: { headless: opts.headless },
  decide: buildDecide(opts),
  onStep: (step) => {
    if (opts.verbose) {
      writeVerbose("agent.step", step);
    }
    const short = step.action.name === "done" ? "" : ` -> ${step.result.message}`;
    console.error(
      `[${step.step}] ${step.action.name}(${JSON.stringify(step.action.params)})${short}`,
    );
  },
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
