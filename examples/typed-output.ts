import { z } from "zod";

import { createCodexCliDecide, runAgent } from "../src/index";

const HeadingResult = z.object({
  heading: z.string(),
});

const result = await runAgent({
  task: 'Go to example.com and report the H1 text via done(data={"heading":"..."}).',
  startUrl: "https://example.com",
  maxSteps: 5,
  launch: { headless: true },
  outputSchema: HeadingResult,
  decide: createCodexCliDecide({ model: "gpt-5.3-codex" }),
});

if (result.success && result.data) {
  console.log(result.data.heading);
} else {
  console.log(JSON.stringify(result, null, 2));
}
