import { Router } from "express";
import { MessageService } from "../services/MessageService.js";

export function MessageController(service: MessageService) {
  const router = Router();

  router.post("/messages", async (req, res) => {
    const doc = await service.create(req.body);
    res.json(doc);
  });

  router.get("/messages", async (_req, res) => {
    res.json(await service.list());
  });

  router.delete("/messages/:id", async (req, res) => {
    const ok = await service.delete(req.params.id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  });

  router.get("/dlq", async (_req, res) => {
    res.json(await service.getFailed());
  });

  router.post("/dlq/:id/reprocess", async (req, res) => {
    const ok = await service.reprocess(req.params.id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  });

  return router;
}
