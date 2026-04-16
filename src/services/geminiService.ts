import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalysisResult {
  signalScore: number;
  moatAnalysis: string;
  sentiment: number;
  founderPedigreeScore: number;
  technicalMoatScore: number;
  hypeCoefficient: number;
}

export async function analyzeStartup(startupData: any): Promise<AnalysisResult> {
  const prompt = `
    Analyze the following YC startup data and provide a "YC Signal" assessment.
    
    Startup: ${startupData.name}
    Description: ${startupData.description}
    Founders: ${JSON.stringify(startupData.founders)}
    HN Sentiment: ${startupData.hnContext || "No context provided"}
    
    Assess the following:
    1. Technical Moat: Is it a simple wrapper or a deep tech play?
    2. Founder Pedigree: Stanford/IIT/CMU or Ex-FAANG background?
    3. Sentiment: How is the developer community reacting?
    4. Hype Coefficient: Is the social noise backed by technical substance?
    
    Return a JSON object with:
    - signalScore (0-100)
    - moatAnalysis (1-2 sentences)
    - sentiment (0-1)
    - founderPedigreeScore (0-1)
    - technicalMoatScore (0-1)
    - hypeCoefficient (1-5, where 1 is low noise/high substance and 5 is high noise/low substance)
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          signalScore: { type: Type.NUMBER },
          moatAnalysis: { type: Type.STRING },
          sentiment: { type: Type.NUMBER },
          founderPedigreeScore: { type: Type.NUMBER },
          technicalMoatScore: { type: Type.NUMBER },
          hypeCoefficient: { type: Type.NUMBER },
        },
        required: ["signalScore", "moatAnalysis", "sentiment", "founderPedigreeScore", "technicalMoatScore", "hypeCoefficient"]
      }
    }
  });

  return JSON.parse(response.text);
}
