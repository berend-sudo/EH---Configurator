import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM_PROMPT = `You analyse architectural floor plan images for a prefab-timber-home company in Uganda. You return strict JSON — no prose, no markdown, no commentary — describing every visible wall, room, furniture item, door, window, and the overall building dimensions.

Coordinate system
- Use percentage coordinates 0–100 relative to the building footprint visible in the image (not the whole PNG — just the bounded floor plan region).
- X=0 is the west/left edge of the building, Y=0 is the north/top edge.
- Thickness of walls: "exterior" for thick perimeter walls, "partition" for thin internal divisions.

Real-world scale
- If dimension annotations are visible, read them and return overallWidthMm and overallDepthMm in millimetres.
- If no dimensions are visible, return your best estimate in mm based on typical residential scale — never zero.

Furniture types (map to canonical names)
bed-single, bed-double, wardrobe, dining-table, dining-chair, sofa, armchair, kitchen-counter, sink-kitchen, sink-bathroom, toilet, bathtub, shower, fridge, stove.

Door swing
- Use "NE" | "NW" | "SE" | "SW" for which quadrant the door opens into.

Output exactly this JSON shape — no additional keys:
{
  "overallWidthMm": number,
  "overallDepthMm": number,
  "walls":     [{"x1Pct":n,"y1Pct":n,"x2Pct":n,"y2Pct":n,"thickness":"exterior"|"partition"}],
  "rooms":     [{"xPct":n,"yPct":n,"widthPct":n,"heightPct":n,"label":string,"areaSqm":n}],
  "furniture": [{"type":string,"xPct":n,"yPct":n,"widthMm":n,"heightMm":n,"rotationDeg":n}],
  "doors":     [{"xPct":n,"yPct":n,"widthMm":n,"swing":"NE"|"NW"|"SE"|"SW"}],
  "windows":   [{"x1Pct":n,"y1Pct":n,"x2Pct":n,"y2Pct":n,"widthMm":n}]
}`;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    imageBase64?: string;
    mediaType?: string;
  } | null;
  if (!body?.imageBase64) {
    return NextResponse.json({ error: "imageBase64 is required." }, { status: 400 });
  }
  const mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp" =
    body.mediaType === "image/jpeg" ||
    body.mediaType === "image/gif" ||
    body.mediaType === "image/webp"
      ? body.mediaType
      : "image/png";

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: body.imageBase64,
              },
            },
            {
              type: "text",
              text: 'Analyze this architectural floor plan. Return the JSON object described in the system prompt only — no prose. Read dimension annotations to determine real-world scale in mm.',
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    if (!textBlock) {
      return NextResponse.json(
        { error: "No text returned from the vision model." },
        { status: 502 },
      );
    }
    // The model sometimes wraps JSON in ```json fences — strip those.
    const raw = textBlock.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          error: "Model did not return valid JSON.",
          rawResponse: raw.slice(0, 2000),
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ detected: parsed, usage: response.usage });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Anthropic API error ${err.status}: ${err.message}` },
        { status: 502 },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
