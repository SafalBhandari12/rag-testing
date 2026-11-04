import { prisma } from "./src/db";

async function main() {
  const doc = await prisma.document.create({
    data: { title: "pgvector smoke test", body: "hello vectors" },
  });

  // `embedding` is Unsupported in Prisma, so vector reads/writes go through raw SQL.
  const embedding = Array.from({ length: 384 }, (_, i) => (i === 0 ? 1 : 0));
  const vec = `[${embedding.join(",")}]`;
  await prisma.$executeRaw`
    INSERT INTO "Chunk" ("documentId", content, embedding)
    VALUES (${doc.id}, 'hello vectors', ${vec}::vector)`;

  const nearest = await prisma.$queryRaw<{ id: number; content: string; distance: number }[]>`
    SELECT id, content, embedding <=> ${vec}::vector AS distance
    FROM "Chunk" ORDER BY distance LIMIT 3`;
  console.log(nearest);

  await prisma.document.delete({ where: { id: doc.id } }); // cascades to chunks
}

main().finally(() => prisma.$disconnect());
