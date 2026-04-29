import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "@phosphor-icons/react";

function renderMarkdown(md) {
  if (!md) return "";
  const esc = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let html = esc;
  html = html.replace(/^###### (.*$)/gm, '<h6 class="font-display font-bold text-xs mt-4 mb-1 uppercase tracking-widest">$1</h6>');
  html = html.replace(/^##### (.*$)/gm, '<h5 class="font-display font-bold text-sm mt-4 mb-1">$1</h5>');
  html = html.replace(/^#### (.*$)/gm, '<h4 class="font-display font-bold text-base mt-5 mb-2">$1</h4>');
  html = html.replace(/^### (.*$)/gm, '<h3 class="font-display font-bold text-lg mt-6 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="font-display font-black text-2xl mt-8 mb-3 tracking-tight border-b border-border pb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="font-display font-black text-3xl mt-8 mb-4 tracking-tight">$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // tables
  html = html.replace(/((?:^\|.*\|\s*\n)+)/gm, (block) => {
    const rows = block.trim().split("\n").filter((r) => !/^\|\s*-+/.test(r));
    if (rows.length < 2) return block;
    const [head, ...body] = rows;
    const headCells = head.split("|").slice(1, -1).map((c) => `<th class="border border-border px-3 py-2 bg-muted text-left font-bold">${c.trim()}</th>`).join("");
    const bodyRows = body.map((r) => `<tr>${r.split("|").slice(1, -1).map((c) => `<td class="border border-border px-3 py-2 align-top">${c.trim()}</td>`).join("")}</tr>`).join("");
    return `<table class="w-full my-4 border border-border text-sm"><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });
  // bullets
  html = html.replace(/(?:^|\n)((?:[-*] .*(?:\n|$))+)/g, (m, list) => {
    const items = list.trim().split("\n").map((l) => `<li>${l.replace(/^[-*]\s+/, "")}</li>`).join("");
    return `\n<ul class="list-disc pl-6 my-3 space-y-1">${items}</ul>`;
  });
  // paragraphs
  html = html.split(/\n\n+/).map((p) => /^\s*<(h\d|ul|ol|table|li|strong|em)/.test(p.trim()) ? p : `<p class="my-3 leading-relaxed">${p.replace(/\n/g, "<br/>")}</p>`).join("\n");
  return html;
}

export default function DocumentView() {
  const { documentId } = useParams();
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    api.get(`/documents/${documentId}`).then((r) => setDoc(r.data)).catch(() => {});
  }, [documentId]);

  if (!doc) return <div className="label-eyebrow">Loading…</div>;

  return (
    <div className="space-y-6" data-testid="document-view">
      <div className="flex items-end justify-between flex-wrap gap-3 border-b border-border pb-6">
        <div>
          <Link to="/dashboard/documents" className="label-eyebrow flex items-center gap-1 mb-2"><ArrowLeft size={12} /> Back to documents</Link>
          <h1 className="font-display text-3xl lg:text-4xl font-black tracking-tighter">{doc.title}</h1>
          <div className="text-sm text-muted-foreground mt-1">{new Date(doc.created_at).toLocaleString("en-AU")} · {doc.document_type.replace(/_/g, ' ').toUpperCase()}</div>
        </div>
        <Button onClick={() => window.print()} variant="outline" className="btn-sharp border-ink" data-testid="doc-print-btn"><Printer className="mr-2" />Print / Save PDF</Button>
      </div>
      <article className="bg-background border border-border p-8 lg:p-12 prose-sm max-w-none print:border-0">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }} />
      </article>
    </div>
  );
}
