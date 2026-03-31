import express, { Request, Response } from "express";
// import { stat } from "fs";

const app = express();
const port = Number(process.env.MCP_RECIPES_PORT ?? 8001);
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "mcp-recipes" });
});

app.get("/recipes/supported", (_req: Request, res: Response) => {
  res.json({
    recipes: [
      "python.formatOnSave",
      "python.debugStarter",
      "jsts.eslintPrettier",
      "jsts.formatOnSave",
    ],
  });
});

app.post("/tools/get_recipe_for_workspace", (req: Request, res: Response) => {
  const workspaceMarkers = req.body?.workspaceMarkers ?? [];
  res.json({
    status: "placeholder",
    message: "not implemnted yet",
    workspaceMarkers,
    suggestedRecipes: [],
  });
});

app.listen(port, () => {
  console.log(`mcp-recipes listening on http://127.0.0.1:${port}`);
});
