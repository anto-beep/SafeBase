import { useParams, Link } from "react-router-dom";
import MarketingLayout from "@/components/marketing/Layout";
import { getPost, BLOG_POSTS } from "@/content/blogPosts";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Clock, User } from "@phosphor-icons/react";

export default function BlogPost() {
  const { slug } = useParams();
  const post = getPost(slug);

  if (!post) return (
    <MarketingLayout>
      <section className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="font-display text-4xl font-black">Article not found</div>
          <Link to="/blog" className="underline mt-3 inline-block">← Back to blog</Link>
        </div>
      </section>
    </MarketingLayout>
  );

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug && p.category === post.category).slice(0, 3);

  return (
    <MarketingLayout>
      <article className="py-16 px-6" data-testid="blog-post">
        <div className="max-w-3xl mx-auto">
          <Link to="/blog" className="label-eyebrow hover:text-ink flex items-center gap-1"><ArrowLeft size={12} />All articles</Link>

          <div className="flex items-center gap-2 mt-6 text-xs">
            <span className="bg-warning text-ink px-2 py-0.5 font-bold tracking-widest">{post.category.toUpperCase()}</span>
            <span className="text-muted-foreground flex items-center gap-1"><Clock size={12} />{post.read_mins} min</span>
          </div>

          <h1 className="font-display text-4xl lg:text-5xl font-black tracking-tighter mt-4">{post.title}</h1>
          <p className="text-lg text-muted-foreground mt-4">{post.excerpt}</p>

          <div className="flex items-center gap-4 mt-6 pb-6 border-b border-border text-sm">
            <div className="flex items-center gap-2"><User size={16} weight="duotone" />{post.author}</div>
            <div className="text-muted-foreground">{new Date(post.date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</div>
          </div>

          <div className="prose prose-lg max-w-none mt-8 font-sans whitespace-pre-line leading-relaxed text-base text-foreground" data-testid="blog-body">
            {post.body}
          </div>

          <div className="mt-12 border-2 border-ink p-6 bg-warning">
            <div className="label-eyebrow text-ink">/ Put it into practice</div>
            <div className="font-display text-2xl font-black tracking-tight mt-1">SafeBase does all of this for you.</div>
            <p className="text-sm text-ink/80 mt-2">AI-generated SWMS, licence expiry tracking, risk register, toolbox talks and 20+ more modules — from A$150/mo.</p>
            <Link to="/register"><Button className="btn-sharp mt-4 bg-ink text-white hover:bg-authority">Start 14-day free trial <ArrowRight className="ml-1" /></Button></Link>
          </div>

          {related.length > 0 && (
            <div className="mt-16">
              <div className="label-eyebrow mb-4">Keep reading / {post.category}</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {related.map((r) => (
                  <Link to={`/blog/${r.slug}`} key={r.slug} className="border border-border p-4 hover:border-ink" data-testid={`related-${r.slug}`}>
                    <div className="font-display font-black text-sm line-clamp-2">{r.title}</div>
                    <div className="text-xs text-muted-foreground mt-2">{r.read_mins} min read</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </MarketingLayout>
  );
}
