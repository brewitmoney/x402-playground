import { Router, type Request, type Response } from "express";

const router: Router = Router();

router.get("/square", async (_req: Request, res: Response) => {
  // Return static data - no fetch call needed
  const number = _req.query.number as string;
  const numberInt = parseInt(number);
  if (isNaN(numberInt)) {
    return res.status(400).json({ error: "Invalid number" });
  }
  const square = numberInt ** 2;
  const response = {
    success: true,
    message: "Square endpoint response",
    data: {
      result: "Square of " + number + " is " + square,
    },
  };

  res.json(response);
});

export default router;

