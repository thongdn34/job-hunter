import type { CodeBlock as CodeBlockData } from "@/domain/common/schema";
import { CopyButton } from "./CopyButton";

/** Pre-formatted code with language label and copy action (no runtime highlighter = small bundle). */
export function CodeBlock({ block }: { block: CodeBlockData }) {
  return (
    <figure className="bg-muted/40 my-3 overflow-hidden rounded-lg border">
      <div className="text-muted-foreground flex items-center justify-between border-b px-3 py-1.5 text-xs">
        <span className="font-mono">{block.language}</span>
        <CopyButton text={block.code} label="Copy code" size="xs" variant="ghost" />
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed">
        <code className={`language-${block.language} font-mono`}>{block.code}</code>
      </pre>
      {block.caption && (
        <figcaption className="text-muted-foreground border-t px-3 py-1.5 text-xs">{block.caption}</figcaption>
      )}
    </figure>
  );
}
