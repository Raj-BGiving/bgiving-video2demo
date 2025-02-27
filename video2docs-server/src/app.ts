import express, { Request, Response } from "express";
import cors from "cors";
import videoRouter from "./router/videoRouter";
import { checkAuth } from "./middleware";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to Video2Docs Server" });
});

app.route("/health").get((req: Request, res: Response) => {
  res.status(200).json({ message: "Video Router is healthy" });
});

app.use("/api/v1", checkAuth, videoRouter);

export default app;
