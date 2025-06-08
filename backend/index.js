import { http } from "@google-cloud/functions-framework";
import { GoogleGenAI } from "@google/genai";
import busboy from "busboy";
import { createWriteStream } from "fs";
import { rm, mkdtemp } from "fs/promises";
import path from "path";

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

http("generateBudget", async (req, res) => {
  // CORS
  
  // only allow http://localhost:5173 and https://budgeted.ruhangupta.com
  const allowedOrigins = [
    "http://localhost:5173",
    "https://budgeted.ruhangupta.com",
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }
  } else {
    return res.status(403).send("Forbidden: Origin not allowed.");
  }
  
  // only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }
  if (!req.body) {
    return res.status(400).send("Bad Request: Missing request body.");
  }

  const fields = {};
  const files = [];

  const uploadDir = await mkdtemp("budget-files");

  try {
    const uploadPromises = [];

    // parse fields and files from the request body using busboy
    const bb = busboy({ headers: req.headers });
    bb.on("field", (fieldname, val) => {
      fields[fieldname] = val;
    });
    bb.on("file", (_fieldname, file, { filename, encoding, mimeType }) => {
      // only allow PDF files (for now)
      if (mimeType !== "application/pdf") {
        return res.status(400).send("Bad Request: Only PDF files are allowed.");
      }
      // upload to the temporary directory
      const filePath = path.join(uploadDir, filename);
      const writeStream = createWriteStream(filePath);
      file.pipe(writeStream);

      // keep track of the write process
      const uploadPromise = new Promise((resolve, reject) => {
        file.on("end", () => writeStream.end());
        writeStream.on("close", () => resolve());
        writeStream.on("error", (err) => reject(err));
      });
      uploadPromises.push(uploadPromise);

      files.push({ filePath, encoding, mimeType });
    });

    const uploadPromise = Promise.withResolvers();
    bb.on("finish", async () => {
      // wait for all uploads to finish
      await Promise.all(uploadPromises);

      uploadPromise.resolve();
    });

    bb.end(req.rawBody);

    // wait for the busboy parsing to finish
    await uploadPromise.promise;

    const feedback = fields.feedback;
    const context = fields.context;
    // files are in `files` array, each with `filePath`, `encoding`, and `mimeType`

    try {
      const model = ai.getGenAIModel("gemini-2.0-flash"); // lets figure out which model to use
          
      const response = await model.generateContent({
          prompt: prompt,
          maxOutputTokens: 1000,
          temperature: 0.5
      });

      const generatedContent = response.content;

      return res.status(200).json({ content: "" });
    }
    catch (error) {
      console.error("Error generating content:", error);
      return res.status(500).send("Internal Server Error");
    }

  } finally {
    // clean up temporary files
    await rm(uploadDir, { recursive: true, force: true });
  }
});