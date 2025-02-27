import { Request, Response, NextFunction } from "express";

export const checkAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  let apiKey: string | undefined;

  if (authHeader) {
    const [bearer, token] = authHeader.split(" ");
    if (bearer === "Bearer" && token) {
      apiKey = token;
    } else {
      console.log("Invalid Authorization header");
      res.status(401).json({ message: "Invalid Authorization header" });
      return;
    }
  }

  if (!apiKey) {
    console.log("No API key found in Authorization header");
    res
      .status(401)
      .json({ message: "No API key found in Authorization header" });
    return;
  }

  if (apiKey !== process.env.API_KEY) {
    console.log("Invalid API key");
    res.status(401).json({ message: "Invalid API key" });
    return;
  }
  next();
};

export const checkFileOkay = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.file) {
    res.status(400).json({
      error: true,
      message: "No file uploaded",
    });
    return;
  }

  const fileSizeInMb = (req.file?.buffer?.length as number) / (1024 * 1024);
  if (fileSizeInMb > 50) {
    res.status(400).json({
      error: true,
      message: "File size exceeds the limit of 50MB",
    });
    return;
  }
  next();
};
