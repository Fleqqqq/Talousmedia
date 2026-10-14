import { Suspense } from "react";
import { getArticleById, getAllArticles } from "@/lib/articles";
import ArticleViewer from "@/components/ArticleViewer";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticleById(params.id);
  if (!article) {
    return {
      title: "Artikkelia ei löytynyt | Talousmedia",
    };
  }
  return {
    title: `${article.company}: ${article.title} | Talousmedia`,
    description: article.quickSummary || "Lue pörssiyhtiön syväanalyysi ja automaattinen DCF-malli.",
  };
}

export default function ArticlePage({ params }: Props) {
  const article = getArticleById(params.id);
  const allArticles = getAllArticles();
  const recentArticles = allArticles.filter((a) => a.id !== params.id).slice(0, 8);

  if (!article) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center font-sans">
        <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-500 mb-2">404 • Ei Löytynyt</div>
        <h1 className="text-2xl font-serif font-bold text-white mb-3">Artikkelia ei löytynyt</h1>
        <p className="text-neutral-400 text-sm mb-6">
          Pyytämääsi analyysia ei ole saatavilla tai sen linkki on vanhentunut.
        </p>
        <Link
          href="/"
          className="inline-block border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white px-4 py-2 text-xs font-mono rounded-sm transition"
        >
          ← Palaa etusivun uutisvirtaan
        </Link>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12 text-center text-xs font-mono text-neutral-500">Ladataan analyysia...</div>}>
      <ArticleViewer article={article} recentArticles={recentArticles} />
    </Suspense>
  );
}
