# 2025 Census attachment rights-gate alternatives

**Review date:** 2026-11-07 (Asia/Seoul)
**Current state:** Exact item-specific KOGL type not verified; the inquiry draft is not sent; `rights_status` remains pending.

## Executive conclusion

An official written answer can resolve the gate, but only if it identifies the permissions **for each attachment separately** and can be matched to the intended reuse. A reply that merely repeats the generic page notice, or a cover image without identifying which attachment it governs, is insufficient. If it confirms a KOGL type, the type's conditions still need to be compared with the actual use (reproduction, excerpting, transformation, commercial/noncommercial distribution). If it supplies a separate written permission, preserve the exact scope, conditions, sender/office, and date.

The best next route is the MODS copyright-practice contact already found. If they do not provide the mark/image through ordinary contact, an information-disclosure request for existing records is a reasonable next evidence route. Neither the statutory public-work rule nor a substitute data table should be treated as a shortcut that clears this attachment packet without verifying applicability.

## Options assessed

| Route | What it can establish | Can it close this gate? | Assessment |
|---|---|---|---|
| **Written reply from MODS copyright-practice staff** | Exact KOGL type, separate conditions, or written permission for the named PDF and XLS | **Yes**, if it is authoritative, file-specific, and covers the actual use | **Recommended first.** Official copyright policy names the practice contact Kim Ju-young (042-481-6963) and management officer Woo Young-je (042-481-6902); it directs users to consult them for works without a mark. Ask separately about PDF `seq=11` and XLS `seq=12`. Inquiry draft: [`KR-PHC-2025-KOGL-INQUIRY.md`](./KR-PHC-2025-KOGL-INQUIRY.md). |
| **Retrieve and visually inspect the official cover/first page** | The mark displayed on the artifact and its type | **Potentially**, for the particular artifact shown | Good corroborating evidence if the image can be tied to the official attachment. A PDF cover does not automatically establish the XLS license. Existing MODS/KOSTAT Synap image endpoints returned HTTP 500; Korea.kr exposed PDF text but not the cover image. |
| **Information-disclosure request through Open.go.kr** | Existing records held by the agency, such as the cover scan, source file, attachment license record, or written rights determination | **Potentially**, if the released record explicitly identifies the item and conditions; a copy of the cover alone may need a follow-up rights interpretation | **Recommended fallback if the contact route stalls.** Request records already held, not a new legal opinion: (1) the first page/cover for each named attachment showing KOGL, (2) any attachment-level license/rights record, and (3) any existing decision about reuse. Open.go.kr describes online submission and a 10-day decision process; this is not a promise of release or a license grant. |
| **Apply Copyright Act Article 24-2 directly** | A possible statutory basis for free use of a work made and published by the State in official duties, or wholly rights-owned under contract | **Not on current evidence alone** | The statute has exceptions, and it must be established that each file and all included material qualify. MODS itself directs users to consult the copyright staff for unmarked material, while the release says to follow the attachment's KOGL type. Treat this as a legal-analysis route, not an operational clearance. |
| **Use only the population facts with source citation; do not redistribute the XLS/PDF or reproduce their layout/graphics** | A narrower use of factual values rather than the source artifact's expression | **May reduce the reuse question for that limited use; does not clear the source packet** | Could be a lower-risk fallback for a narrative that cites 51,805,547, 51,817,499, and the calculated change. It does not authenticate source bytes, authorize copying tables/graphics, or approve redistributing the workbook. Review database/contract terms and the exact intended use separately. |
| **Switch to a KOSIS table or another official data product** | A different official data artifact with its own metadata and terms | **Only for the replacement source** | Could be practical if an exact table, series, unit, date, and license are verified. Same-source-family agreement is not independent corroboration, and a KOSIS route would not retroactively clear MODS's PDF/XLS attachments. Current reader-only/dynamic candidates have not met that bar. |
| **Infer from Korea.kr's type-1 footer or another Census release** | Only the rights statement for that page/item | **No** | Korea.kr explicitly limits its type-1 footer to its page text. A different release or a neighboring census notice is not item-specific evidence for these two attachments. |

## Legal and license checks if an answer arrives

The official MODS copyright policy describes:

- KOGL 1: attribution; commercial/noncommercial use and changes allowed.
- KOGL 2: attribution; noncommercial use only; changes allowed.
- KOGL 3: attribution; commercial/noncommercial use; changes prohibited.
- KOGL 4: attribution; noncommercial use only; changes prohibited.
- The current policy also presents 0 and AI types; record the exact mark rather than assuming the older four-type set.

For this dataset, a license result is not enough by itself if the use involves copying the spreadsheet, extracting/translating/reformatting tables, redistributing a packet, or commercial activity. Check the exact proposed act against the item-specific conditions. If the mark is absent, preserve the agency's written permission or conditions rather than inferring a type.

## Recommended decision path

1. Use the prepared inquiry draft with MODS copyright-practice staff; ask for **separate answers for the PDF and XLS**, an official cover image/link, and the conditions applicable to each.
2. On receiving a response, record the sender/office, date, exact filenames and attachment sequences, the type/conditions, and the intended use covered. Do not treat an oral answer as a visual cover check; record it as an official verbal response and seek written confirmation if the gate requires an auditable record.
3. If the response is missing or generic, submit an Open.go.kr request for the existing cover/license records described above. Keep the reuse gate pending while it is processed.
4. If no item-specific evidence can be obtained, either keep the source out of redistribution packets or narrow the use to cited facts, while keeping the original XLS rights status pending. Do not set `approved_for_packet=true` on that basis.

## Official references

- [MODS release record, list_no=446219](https://mods.go.kr/board.es?mid=a10301020200&bid=203&act=view&list_no=446219)
- [MODS copyright policy and named contacts](https://mods.go.kr/menu.es?mid=a10706000000)
- [Copyright Act, Article 24-2, National Law Information Center](https://www.law.go.kr/LSW//lsLawLinkInfo.do?lsJoLnkSeq=1000751940&chrClsCd=010202)
- [Open.go.kr information-disclosure procedure](https://www.open.go.kr/infOthbc/infOthbc/infOthbc.do)
- [Korea.kr republication (its type-1 statement is text-only)](https://www.korea.kr/briefing/pressReleaseView.do?newsId=156772417&call_from=seoul_paper)
