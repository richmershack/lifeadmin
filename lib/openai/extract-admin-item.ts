export type ExtractedAdminItem = {
  title: string | null;
  category: string | null;
  company: string | null;
  dueDate: string | null;
  amount: string | null;
  action: string | null;
  summary: string | null;
  confidence: "low" | "medium" | "high";
};

type ExtractAdminItemInput = {
  text: string;
  document?: File | null;
  fallbackDate: string;
};

type ResponseContent = {
  type?: string;
  text?: string;
};

type ResponseOutput = {
  type?: string;
  content?: ResponseContent[];
};

const imageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const pdfTypes = new Set(["application/pdf"]);
const maxImageBytesForAi = 4 * 1024 * 1024;
const maxPdfBytesForAi = 8 * 1024 * 1024;

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: ["string", "null"] },
    category: {
      type: ["string", "null"],
      enum: [
        "Bill",
        "Renewal",
        "Subscription",
        "Contract",
        "Warranty",
        "Tax document",
        "Appointment",
        "Other",
        null
      ]
    },
    company: { type: ["string", "null"] },
    dueDate: {
      type: ["string", "null"],
      description: "ISO date in YYYY-MM-DD format when a deadline, renewal, payment, or review date is visible."
    },
    amount: {
      type: ["string", "null"],
      description: "Money amount exactly as shown, including currency symbol when visible."
    },
    action: {
      type: ["string", "null"],
      description: "Short next action the user should take."
    },
    summary: {
      type: ["string", "null"],
      description: "One sentence summary of the admin item."
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] }
  },
  required: ["title", "category", "company", "dueDate", "amount", "action", "summary", "confidence"]
} as const;

function normalizeDate(value: unknown, fallbackDate: string) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const parsed = new Date(`${trimmed}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallbackDate : trimmed;
}

function asNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function getOutputText(payload: { output_text?: string; output?: ResponseOutput[] }) {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  for (const item of payload.output || []) {
    if (item.type !== "message") {
      continue;
    }

    const text = item.content?.find((content) => content.type === "output_text")?.text;
    if (text) {
      return text;
    }
  }

  return null;
}

async function fileToDataUrl(file: File, fallbackType?: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || fallbackType || "application/octet-stream"};base64,${buffer.toString("base64")}`;
}

export async function extractAdminItemWithAi({
  text,
  document,
  fallbackDate
}: ExtractAdminItemInput): Promise<ExtractedAdminItem | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const documentName = document instanceof File && document.size > 0 ? document.name : "No file attached";
  const canReadImage =
    document instanceof File &&
    document.size > 0 &&
    document.size <= maxImageBytesForAi &&
    imageTypes.has(document.type);
  const canReadPdf =
    document instanceof File &&
    document.size > 0 &&
    document.size <= maxPdfBytesForAi &&
    (pdfTypes.has(document.type) || document.name.toLowerCase().endsWith(".pdf"));

  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string }
    | { type: "input_file"; filename: string; file_data: string; detail: "low" | "high" }
  > = [
    {
      type: "input_text",
      text: [
        "Extract the life admin details from this capture.",
        "Return null for fields that are not clearly visible.",
        `Today's date is ${fallbackDate}.`,
        `Attached file name: ${documentName}`,
        canReadPdf
          ? "The attached PDF may contain billing, renewal, contract, receipt, or deadline details. Read the PDF before deciding."
          : "",
        text ? `Pasted text:\n${text}` : "No pasted text was provided."
      ]
        .filter(Boolean)
        .join("\n\n")
    }
  ];

  if (canReadImage) {
    content.push({
      type: "input_image",
      image_url: await fileToDataUrl(document)
    });
  }

  if (canReadPdf) {
    content.push({
      type: "input_file",
      filename: document.name || "document.pdf",
      file_data: await fileToDataUrl(document, "application/pdf"),
      detail: "low"
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        input: [
          {
            role: "system",
            content:
              "You turn bills, renewals, contracts, receipts, and notices into concise structured admin tasks."
          },
          {
            role: "user",
            content
          }
        ],
        max_output_tokens: 600,
        text: {
          format: {
            type: "json_schema",
            name: "lifeadmin_capture",
            strict: true,
            schema
          }
        }
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { output_text?: string; output?: ResponseOutput[] };
    const outputText = getOutputText(payload);
    if (!outputText) {
      return null;
    }

    const parsed = JSON.parse(outputText) as Partial<ExtractedAdminItem>;
    return {
      title: asNullableString(parsed.title),
      category: asNullableString(parsed.category),
      company: asNullableString(parsed.company),
      dueDate: normalizeDate(parsed.dueDate, fallbackDate),
      amount: asNullableString(parsed.amount),
      action: asNullableString(parsed.action),
      summary: asNullableString(parsed.summary),
      confidence: parsed.confidence === "high" || parsed.confidence === "medium" ? parsed.confidence : "low"
    };
  } catch {
    return null;
  }
}
