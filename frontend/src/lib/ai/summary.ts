export async function generatePlayerSummary(opts: {
  athleteName: string;
  sportLabel: string;
  team?: string | null;
  conference?: string | null;
  ovr?: number | null;
  globalRank?: number | null;
  stats: Record<string, unknown>;
  segment?: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const statLines = Object.entries(opts.stats)
    .filter(([k, v]) => {
      if (["player_name", "team", "conference", "conference_code", "season", "sport"].includes(k)) {
        return false;
      }
      return v != null && v !== "" && v !== 0;
    })
    .slice(0, 24)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const prompt = `Write a 2-3 paragraph scouting-style summary for a NCAA Division III ${opts.sportLabel} athlete.
Tone: professional sports media (ESPN/247 style), factual, no hype clichés.
Player: ${opts.athleteName}
Team: ${opts.team ?? "Unknown"}
Conference: ${opts.conference ?? "Unknown"}
OVR: ${opts.ovr ?? "N/A"}
National rank: ${opts.globalRank ?? "N/A"}
${opts.segment ? `Segment: ${opts.segment}` : ""}

Key stats:
${statLines || "(limited stat line)"}

Return markdown only (no title heading).`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SUMMARY_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You write concise D3 college sports player summaries for D3Rank.com. Be specific with stats when provided.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "Summary unavailable.";
}
