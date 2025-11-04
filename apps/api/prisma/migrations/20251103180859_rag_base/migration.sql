-- CreateTable
CREATE TABLE "CorpusDoc" (
    "id" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "license" TEXT,
    "s3Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorpusDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passage" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "ord" INTEGER NOT NULL,
    "section" TEXT,
    "page" TEXT,
    "textHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Passage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Passage" ADD CONSTRAINT "Passage_docId_fkey" FOREIGN KEY ("docId") REFERENCES "CorpusDoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
