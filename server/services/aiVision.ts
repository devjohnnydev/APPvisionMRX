import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface CircuitBoardAnalysis {
  boardType: string;
  manufacturer: string | null;
  model: string | null;
  confidence: number;
  components: string[];
  description: string;
}

export async function analyzeCircuitBoard(base64Image: string): Promise<CircuitBoardAnalysis> {
  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert in electronic circuit board identification. Analyze the image and identify the type of circuit board, manufacturer, model, and key components. Provide your response in JSON format with the following structure:
          {
            "boardType": "string (e.g., 'Arduino Uno R3', 'Raspberry Pi 4', 'ESP32 DevKit')",
            "manufacturer": "string or null (e.g., 'Arduino', 'Raspberry Pi Foundation', 'Espressif')",
            "model": "string or null (specific model number)",
            "confidence": number (0.0 to 1.0, representing how confident you are in the identification),
            "components": ["array of key components visible"],
            "description": "string (brief description of what you see)"
          }
          
          Focus on identifying common development boards like Arduino variants, Raspberry Pi models, ESP32/ESP8266 boards, STM32 boards, and other microcontroller development boards. If you cannot identify the specific board, provide your best guess with a lower confidence score.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this circuit board image and identify the board type, manufacturer, model, and key components."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate and format the response
    return {
      boardType: result.boardType || "Unknown Board",
      manufacturer: result.manufacturer || null,
      model: result.model || null,
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
      components: Array.isArray(result.components) ? result.components : [],
      description: result.description || "Circuit board analysis completed",
    };

  } catch (error) {
    console.error("Error analyzing circuit board:", error);
    throw new Error("Failed to analyze circuit board image");
  }
}
