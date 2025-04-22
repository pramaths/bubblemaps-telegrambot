import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export async function analyzeToken(tokenAddress: string, topHolders: { address?: string; balance?: string; percentage?: string }[]) {
    
    // Validate inputs
    if (!tokenAddress || !topHolders || !Array.isArray(topHolders) || topHolders.length === 0) {
      return "ERROR: Missing required token address or holder information";
    }
  
    // Initialize Google Gemini AI
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  
    // Format holder information for the prompt
    const holdersInfo = topHolders.map((holder, index) => 
      `Holder ${index + 1}: ${holder.address || 'Unknown'}, Balance: ${holder.balance || 'Unknown'}, Percentage: ${holder.percentage || 'Unknown'}`
    ).join('\n');
  
    // Create prompt for analysis
    const prompt = `
  Token Address: ${tokenAddress}
  
  Top 5 Holders Information:
  ${holdersInfo}
  
  Based solely on this token address and holder distribution information, provide a concise 2-3 line verdict on whether this appears to be a good token investment. Consider holder concentration, distribution patterns, and potential red flags. Format your response as a direct recommendation.Use a single emoji at the start to indicate the emotion of the response like danger signals or green signals etc...
  `;
  
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
  
    //   console.log("AI Response:", response);
      return response.text;
    } catch (error) {
      console.error("Error analyzing token:", error);
      return "Analysis failed. Unable to provide recommendation due to technical error.";
    }
  }