-- CreateIndex
CREATE INDEX "Question_input_idx" ON "Question" USING GIN ("input");