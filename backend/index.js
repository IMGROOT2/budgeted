import 'dotenv/config';
import { http } from "@google-cloud/functions-framework";
import { GoogleGenAI } from "@google/genai";
import busboy from "busboy";
import { createReadStream, createWriteStream } from "fs";
import { rm, mkdtemp } from "fs/promises";
import path from "path";
import os from "os";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

http("generateBudget", async (req, res) => {
  // Set CORS headers
  const allowedOrigins = [
    "http://localhost:5173",
    "https://budgeted.ruhangupta.com",
  ];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  } else if (origin) {
    return res.status(403).send("Forbidden: Origin not allowed.");
  }

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  // Basic method/body validation
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  if (!req.rawBody) {
    return res.status(400).send("Bad Request: Missing request body.");
  }

  let uploadDir;

  try {
    // Initialize a temporary directory for file uploads
    uploadDir = await mkdtemp(path.join(os.tmpdir(), "budget-files-"));

    const fields = {};
    const filePromises = [];

    const bb = busboy({ headers: req.headers });

    // Parse all normal fields
    bb.on("field", (fieldname, val) => {
      fields[fieldname] = val;
    });

    bb.on("file", (fieldname, file, { filename, mimeType }) => {
      // Only process PDF files
      if (mimeType !== "application/pdf") {
        file.resume();
        console.warn(`Skipping non-PDF file: "${filename}" (MIME Type: ${mimeType})`);
        return;
      }

      // convert the file stream to a base64 string
      const fileB64Promise = new Promise((resolve, reject) => {
        const chunks = [];
        file.on('data', chunk => chunks.push(chunk));
        file.on('error', reject);
        // concat the chunks and resolve the promise with the base64 string
        file.on('end', () => {
          const content = Buffer.concat(chunks);
          // Restrict files to a maximum size of 20MB
          if (content.length > 20 * 1024 * 1024) {
            return reject(new Error(`File "${filename}" exceeds the maximum size of 20MB.`));
          }
          resolve({ filename, content: content.toString('base64'), mimeType })
        });
      });

      
      filePromises.push(fileB64Promise);
    });

    // Promise that waits for all body parsing to finish
    const bbPromise = new Promise((resolve, reject) => {
      bb.on("close", () => resolve());
      bb.on("error", (err) => reject(new Error(`Busboy parsing error: ${err.message}`)));
    });

    bb.end(req.rawBody);

    // Wait for the busboy parsing to finish
    await bbPromise;

    let files = [];
    
    try {
      // Wait for all file parsing promises to resolve
      files = await Promise.all(filePromises);
    } catch (fileError) {
      // This could be due to file size limits or other issues
      console.error("Error processing uploaded files:", fileError);
      return res.status(400).send(`Bad Request: ${fileError.message}`);
    }
    const { feedback, context } = fields;

    // maybe we should change this eventually - maybe people can still use the app without a file or smth
    if (!feedback && !context && files.length === 0) {
      return res.status(400).send("Bad Request: Please provide feedback, context, or upload a PDF file.");
    }

    let promptParts = [];

    // add the main prompt part
    promptParts.push({ text: `You are a helpful AI Agent designed to create, manage, or edit school budgets and provide an in-depth report that helps the user make budgeting decisions for the school district. 
        Your goal is to follow the user's instructions and provide analytical and thorough reports based on the user's requirements. You have access to files which the user has provided. Be very thorough in these files
        and use the necessary context to create an output that satisfies the user's requirements. The user has provided two sets of input, in addition to the files.` });
    
    // add the prompts for the feedback and context portions if the user has provided them
    if (feedback) {
      promptParts.push({ text: `The first set of input is a set of feedback,
        that includes constraints to keep in mind while crafting reports, and potentially, feedback from students and staff about district needs and budget feedback. Do NOT restate these instructions. 
        Do NOT answer conversationally. Do NOT attempt to interact with the user. Do NOT explain what you are doing, just do it.
         Here is the following feedback: ${feedback}` });
    }
    if (context) {
      promptParts.push({ text: `Secondly, the user has provided some context which will help you understand specifically what the user is requesting from you. Use the following context to get a better understanding
        of the user's requirements and directions. Do NOT restate these instructions. You must be thorough and very detailed in your report. Do NOT answer conversationally. Do NOT attempt to interact with the user. 
        Do NOT explain what you are doing, just do it. Here is the context: ${context}` });
    }

    // add the prompt for the files if the user has provided any
    if (files.length > 0) {
      promptParts.push({ text: `The user has also provided a number of budget reports from previous fiscal years. These will help you understand the various areas of expense within the school district.
        The resulting feedback report should be based on the categories in the budgets provided. You must be thorough and very detailed in your report.
        Do NOT restate these instructions. Do NOT answer conversationally. Do NOT attempt to interact with the user. Do NOT explain what you are doing, just do it. ` });
      
      // upload files to the Gemini API
      for (const file of files) {
        promptParts.push({
          inlineData: {
            data: file.content,
            mimeType: file.mimeType
          }
        });
      }
    }

    const modelName = 'gemini-2.0-flash';

    const result = await ai.models.generateContent({
        model: modelName,
        contents: promptParts
    });

    let generatedContent = "";
    // Extract the generated AI response from the result
    if (result && result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0 &&
        result.candidates[0].content.parts[0].text) {

        generatedContent = result.candidates[0].content.parts[0].text;
    } else {
        console.warn('Gemini API response did not contain expected text content structure.');
        generatedContent = "No content generated or unexpected response format.";
    }

    return res.status(200).json({ content: generatedContent });

  } catch (error) {
    // Basic 500 error handling
    console.error("Error in generateBudget function:", error);
    const errorMessage = error.message || "Internal Server Error";
    return res.status(500).send(`Error generating budget: ${errorMessage}`);
  } finally {
    // Clean up the temporary directory if it was created
    if (uploadDir) {
      try {
        await rm(uploadDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error("Error cleaning up temporary directory:", cleanupError);
      }
    }
  }
});