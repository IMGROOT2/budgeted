import axios from "axios";
import { http } from "@google-cloud/functions-framework";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

http("generateBudget", async (req, res) => {
    console.log(req.body);
    if(!req.body || !req.body.prompt) {
        return res.status(400).send("Bad Request: Missing prompt in request body.");
    }

    const prompt = req.body.prompt;

    try {
       const model = ai.getGenAIModel("gemini-2.0-flash"); // lets figure out which model to use
        
        const response = await model.generateContent({
            prompt: prompt,
            maxOutputTokens: 1000,
            temperature: 0.5
        });

        const generatedContent = response.content;

        return res.status(200).json({ content: generatedContent });
    }
    catch (error) {
        console.error("Error generating content:", error);
        return res.status(500).send("Internal Server Error");
    }

    /*const response = await ai.models.generateContent({

    });*/
});