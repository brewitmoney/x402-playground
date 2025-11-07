import { Router, type Request, type Response } from "express";
import { generatePassword, shortenUrl, getInspirationalQuote, type QuoteCategory } from "../lib/services.js";

const router: Router = Router();

// 1. Password Generator - Generate secure random password
router.post("/generate-password", async (req: Request, res: Response) => {
  try {
    const {
      length = 16,
      includeNumbers = true,
      includeSymbols = true,
      includeUppercase = true,
      includeLowercase = true,
    } = req.body;

    const result = generatePassword({
      length,
      includeNumbers,
      includeSymbols,
      includeUppercase,
      includeLowercase,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      error: "Failed to generate password",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// 2. URL Shortener using is.gd API
router.post("/shorten-url", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    const result = await shortenUrl(url);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      error: "Failed to shorten URL",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// 3. Get Inspirational Quote (Free endpoint)
router.get("/quote", async (req: Request, res: Response) => {
  try {
    const category = (req.query.category as string) || "random";
    const validCategories: QuoteCategory[] = ["motivation", "success", "wisdom", "creativity", "random"];
    const selectedCategory = validCategories.includes(category as QuoteCategory) 
      ? (category as QuoteCategory) 
      : "random";

    const result = getInspirationalQuote(selectedCategory);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get quote",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

