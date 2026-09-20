import OpenAI from "openai";
import { env } from "./config.js";
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    is_leaf: { type: "boolean" },
    image_quality: { type: "string", enum: ["poor", "acceptable", "good"] },
    plant: { type: "string" },
    scientific_name: { type: "string" },
    condition: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    severity: {
      type: "string",
      enum: ["UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },
    symptoms: { type: "array", items: { type: "string" } },
    likely_causes: { type: "array", items: { type: "string" } },
    immediate_actions: { type: "array", items: { type: "string" } },
    treatment: { type: "array", items: { type: "string" } },
    prevention: { type: "array", items: { type: "string" } },
    when_to_consult_expert: { type: "string" },
    safety_note: { type: "string" },
    translations: {
      type: "object",
      additionalProperties: false,
      properties: {
        en: { $ref: "#/$defs/lang" },
        te: { $ref: "#/$defs/lang" },
        hi: { $ref: "#/$defs/lang" },
      },
      required: ["en", "te", "hi"],
    },
  },
  required: [
    "is_leaf",
    "image_quality",
    "plant",
    "scientific_name",
    "condition",
    "confidence",
    "severity",
    "symptoms",
    "likely_causes",
    "immediate_actions",
    "treatment",
    "prevention",
    "when_to_consult_expert",
    "safety_note",
    "translations",
  ],
  $defs: {
    lang: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        symptoms: { type: "array", items: { type: "string" } },
        actions: { type: "array", items: { type: "string" } },
        disclaimer: { type: "string" },
      },
      required: ["summary", "symptoms", "actions", "disclaimer"],
    },
  },
};

export async function analyzeLeaf(image, mimeType) {
  const response = await openai.responses.create({
    model: env.OPENAI_VISION_MODEL,
    instructions:
      "You are a cautious agronomy image-screening assistant. Analyze only visible evidence. Do not invent certainty. If this is not a clear plant leaf or image quality is poor, say so and request a better image. Distinguish disease from pest, nutrient, water, sun, and mechanical damage. Provide practical low-risk steps. Never recommend restricted pesticide dosages. State that this is AI screening, not a laboratory diagnosis. Return all user-facing content in natural English, Telugu, and Hindi.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Analyze this plant leaf. Identify the likely plant and condition, visible symptoms, alternatives, severity, safe actions, treatment categories, prevention, and when an agricultural expert/lab test is needed.",
          },
          {
            type: "input_image",
            image_url: `data:${mimeType};base64,${image.toString("base64")}`,
            detail: "high",
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "leaf_analysis",
        strict: true,
        schema,
      },
    },
  });
  return { id: response.id, data: JSON.parse(response.output_text) };
}
