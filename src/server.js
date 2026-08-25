import express from "express";
import triageRouter from "./routes/triage.js";

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "32kb" }));
app.use(triageRouter);

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Support triage API listening on http://localhost:${port}`);
});
