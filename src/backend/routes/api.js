import express from "express";

import verifyRelevance from "../controller/verifier.js";

const APIRouter = express.Router();
const router = APIRouter;

router.post("/verify", verifyRelevance);

export default APIRouter;