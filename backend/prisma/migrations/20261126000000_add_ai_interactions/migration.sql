-- Nhật ký gọi trợ lý AI (hạn mức, mức gợi ý, số liệu đánh giá)
CREATE TABLE "ai_interactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "problem_id" TEXT,
    "submission_id" TEXT,
    "kind" TEXT NOT NULL,
    "level" INTEGER,
    "context" TEXT,
    "source" TEXT NOT NULL,
    "model" TEXT,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "latency_ms" INTEGER,
    "blocked_code" BOOLEAN NOT NULL DEFAULT false,
    "feedback" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_interactions_user_id_created_at_idx" ON "ai_interactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_interactions_user_id_problem_id_kind_idx" ON "ai_interactions"("user_id", "problem_id", "kind");

-- AddForeignKey
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
