import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface ElectronicBoardAnalysis {
  boardType: string;
  category: string; // TV, notebook, radio, smartphone, etc.
  manufacturer: string | null;
  model: string | null;
  confidence: number;
  components: string[];
  description: string;
  deviceType: string; // Main board, power board, control board, etc.
}

export async function analyzeElectronicBoard(base64Image: string): Promise<ElectronicBoardAnalysis> {
  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert in electronic board identification for all types of electronic devices. Analyze the image and identify the type of electronic board, device category, manufacturer, model, and key components. This includes boards from:

          - TVs (main boards, power boards, T-CON boards, LED driver boards)
          - Notebooks/Laptops (motherboards, charging boards, keyboard controllers)
          - Smartphones/Tablets (main boards, charging boards, display controllers)
          - Radios/Audio equipment (amplifier boards, tuner boards, control boards)
          - Home appliances (washing machines, refrigerators, microwaves)
          - Gaming consoles (main boards, power supplies, controllers)
          - Networking equipment (routers, modems, switches)
          - Development boards (Arduino, Raspberry Pi, ESP32, STM32)
          - Industrial equipment and control systems
          - Car electronics (ECUs, entertainment systems, sensors)

          Provide your response in JSON format with the following structure:
          {
            "boardType": "string (specific board identification like 'Samsung UN55TU7000 Main Board', 'MacBook Pro A1502 Logic Board')",
            "category": "string (TV, notebook, smartphone, radio, appliance, gaming, networking, development, industrial, automotive, etc.)",
            "manufacturer": "string or null (Samsung, Apple, Sony, LG, etc.)",
            "model": "string or null (specific model number or part number)",
            "deviceType": "string (main board, power board, control board, charging board, etc.)",
            "confidence": number (0.0 to 1.0, representing confidence in identification),
            "components": ["array of key components visible like processors, memory, connectors, ICs"],
            "description": "string (detailed description of what you see and device it likely belongs to)"
          }
          
          If you cannot identify the specific board, provide your best educated guess based on visible components, connectors, and layout patterns. Focus on practical identification that would help a technician or repair person.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this electronic board image and identify the board type, category, manufacturer, model, device type, and key components."
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
      category: result.category || "Unknown",
      manufacturer: result.manufacturer || null,
      model: result.model || null,
      deviceType: result.deviceType || "Unknown",
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
      components: Array.isArray(result.components) ? result.components : [],
      description: result.description || "Electronic board analysis completed",
    };

  } catch (error) {
    console.error("Error analyzing electronic board:", error);
    throw new Error("Failed to analyze electronic board image");
  }
}

// Maintain backward compatibility
export const analyzeCircuitBoard = analyzeElectronicBoard;
