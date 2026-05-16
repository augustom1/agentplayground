import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no session required.
// Returns vault notes tagged #blog-post with status: published.
export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 50);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
  const slug = req.nextUrl.searchParams.get("slug");

  if (slug) {
    const note = await prisma.vaultNote.findFirst({
      where: {
        tags: { has: "blog-post" },
        path: { contains: slug },
        NOT: { path: { contains: "-social" } },
      },
      select: { path: true, title: true, tags: true, content: true, updatedAt: true },
    });
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Only serve published posts
    const frontmatterMatch = note.content?.match(/status:\s*(\w+)/);
    const status = frontmatterMatch?.[1] ?? "draft";
    if (status !== "published") return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ note });
  }

  // List all published blog posts
  const allNotes = await prisma.vaultNote.findMany({
    where: {
      tags: { has: "blog-post" },
      NOT: { path: { contains: "-social" } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit * 3, // fetch extra to filter by status
    skip: offset,
    select: { path: true, title: true, tags: true, content: true, updatedAt: true },
  });

  const published = allNotes
    .filter((n) => {
      const match = n.content?.match(/status:\s*(\w+)/);
      return match?.[1] === "published";
    })
    .slice(0, limit)
    .map((n) => {
      const summaryMatch = n.content?.match(/summary:\s*(.+)/);
      const slugMatch = n.path.match(/Blog\/(.+)\.md/);
      return {
        path: n.path,
        title: n.title,
        tags: n.tags,
        updatedAt: n.updatedAt,
        summary: summaryMatch?.[1]?.trim() ?? "",
        slug: slugMatch?.[1] ?? n.path,
        // strip frontmatter for summary view
        content: n.content?.replace(/^---[\s\S]+?---\n/, "").slice(0, 300),
      };
    });

  return NextResponse.json({ posts: published, total: published.length });
}
