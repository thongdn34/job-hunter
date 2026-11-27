import type { InterviewPackage, SectionContentMap } from "@/domain/package/schema";
import type { SectionKey } from "@/domain/package/sections";

/** Props every section renderer receives. `data` is the validated section content. */
export interface SectionProps<K extends SectionKey> {
  pkg: InterviewPackage;
  data: SectionContentMap[K];
}
