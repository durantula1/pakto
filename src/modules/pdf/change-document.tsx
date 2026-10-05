import path from "node:path";

import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { discountLabel } from "@/modules/change-orders/pricing";
import { termAmounts } from "@/modules/change-orders/payment-terms";
import { cents } from "@/modules/projects/state";
import { logoBox, type LogoSize } from "@/modules/organizations/logo-box";

// Full Noto Sans (Latin + Cyrillic + €). The @fontsource woff files are unicode-range subsets,
// and react-pdf cannot merge subsets into one family, so every missing glyph rendered blank.
const fontDirectory = path.join(process.cwd(), "src/modules/pdf/fonts");
Font.register({ family: "NotoSans", fonts: [
  { src: path.join(fontDirectory, "NotoSans-Regular.ttf"), fontWeight: 400 },
  { src: path.join(fontDirectory, "NotoSans-SemiBold.ttf"), fontWeight: 600 },
] });
// Words are wrapped as a whole; the default hyphenation splits Bulgarian words at random places.
Font.registerHyphenationCallback((word) => [word]);

const ink = "#1c2420";
const muted = "#66706b";
const rule = "#dfe3df";

const styles = StyleSheet.create({
  page: { fontFamily: "NotoSans", paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, color: ink, fontSize: 10, lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16, borderBottom: `1.5 solid ${ink}` },
  organization: { fontSize: 11, fontWeight: 600 },
  logo: { objectFit: "contain", marginBottom: 8 },
  kind: { fontSize: 9, color: muted, textTransform: "uppercase", letterSpacing: 0.6 },
  code: { fontSize: 16, fontWeight: 600, textAlign: "right" },
  title: { fontSize: 18, fontWeight: 600, marginTop: 18, lineHeight: 1.25 },
  facts: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: 0 },
  fact: { width: "50%", paddingVertical: 3, paddingRight: 12 },
  factLabel: { fontSize: 8, color: muted, textTransform: "uppercase", letterSpacing: 0.4 },
  section: { marginTop: 22 },
  heading: { fontSize: 11, fontWeight: 600, marginBottom: 6 },
  paragraph: { color: ink },
  note: { marginTop: 6, color: muted },
  tableHead: { flexDirection: "row", paddingVertical: 6, borderBottom: `1 solid ${ink}`, fontSize: 8, color: muted, textTransform: "uppercase", letterSpacing: 0.4 },
  tableRow: { flexDirection: "row", paddingVertical: 7, borderBottom: `0.75 solid ${rule}` },
  colDescription: { width: "52%", paddingRight: 10 },
  colQuantity: { width: "14%", textAlign: "right", paddingRight: 8 },
  colPrice: { width: "16%", textAlign: "right", paddingRight: 8 },
  colTotal: { width: "18%", textAlign: "right" },
  summary: { marginTop: 10, marginLeft: "auto", width: "48%" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  summaryTotal: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 8, borderTop: `1.5 solid ${ink}`, fontSize: 12, fontWeight: 600 },
  decision: { marginTop: 22, padding: 12, borderRadius: 6, backgroundColor: "#f1f4f1" },
  signature: { marginTop: 10, width: 200 },
  signatureImage: { height: 70, objectFit: "contain", objectPosition: "left" },
  signatureCaption: { fontSize: 8, color: muted, marginTop: 3, paddingTop: 3, borderTop: `0.75 solid ${muted}` },
  photos: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  photo: { width: "49%", marginBottom: 10 },
  photoImage: { width: "100%", height: 170, objectFit: "cover", borderRadius: 4 },
  photoCaption: { fontSize: 8, color: muted, marginTop: 3 },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: muted, borderTop: `0.75 solid ${rule}`, paddingTop: 6 },
});

type Line = { description: string; quantity: string; unit: string | null; unitPrice: string; lineTotal: string };
export type PdfPhoto = { name: string; data: Buffer };
export type PdfLogo = { data: Buffer; width: number; height: number; size: LogoSize };

const quantityFormat = new Intl.NumberFormat("bg-BG", { maximumFractionDigits: 3 });
const dateFormat = new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeZone: "Europe/Sofia" });
const dateTimeFormat = new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Sofia" });

function formatDeadline(value: string | null) {
  return value ? dateFormat.format(new Date(`${value}T12:00:00Z`)) : null;
}

export function ChangePdfDocument({ organization, logo, project, siteAddress, contact, kind, code, revision, lines, schedule = [], paymentTerms = [], absorbedChanges = [], decision, photos = [] }: {
  organization: string; logo?: PdfLogo | null; project: string; siteAddress: string; contact: string; kind: "offer" | "change"; code: string;
  revision: { title: string; description: string; reason: string | null; revisionNumber: number; changeKind: string; subtotal: string; taxAmount: string; total: string; currency: string; taxRate: string; agreedDeadline: string | null; contentHash: string | null; frozenAt: Date | null; clientNote: string | null; responseDueAt?: Date | null; discountType?: "percent" | "amount" | null; discountValue?: string | null; discountAmount?: string | null };
  lines: Line[];
  /** The indicative schedule of an offer; not a commitment, the agreed deadline is. */
  schedule?: Array<{ title: string; durationDays: number }>;
  /** When and how much is due; approved with the offer. */
  paymentTerms?: Array<{ title: string; percent: number; dueTrigger: string; dueOn: string | null; stageTitle: string | null }>;
  /** Approved changes this version includes in its price. */
  absorbedChanges?: Array<{ title: string; total: string }>;
  decision: { decision: string; typedName: string; createdAt: Date; verifiedEmail?: string | null; ip?: string | null; signature?: Buffer | null } | null;
  photos?: PdfPhoto[];
}) {
  const money = new Intl.NumberFormat("bg-BG", { style: "currency", currency: revision.currency.trim() || "EUR" });
  const sign = revision.changeKind === "credit" ? "−" : "";
  const amount = (value: string) => `${sign}${money.format(Number(value))}`;
  const noun = kind === "offer" ? "Оферта" : "Промяна";
  const deadline = formatDeadline(revision.agreedDeadline);
  const rows = lines.length
    ? lines
    : [{ description: revision.title, quantity: "1", unit: "усл.", unitPrice: revision.subtotal, lineTotal: revision.subtotal }];

  return <Document title={`${code} · ${revision.title}`} author={organization} creator="Pakto"><Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <View>
        {/* Explicit width and height: with only one of them react-pdf shrinks the image far below the box. */}
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt attribute */}
        {logo ? <Image src={logo.data} style={[styles.logo, logoBox(logo, logo.size)]} /> : null}
        <Text style={styles.organization}>{organization}</Text>
        <Text style={{ color: muted, fontSize: 9 }}>Създадено с Pakto</Text>
      </View>
      <View>
        <Text style={[styles.kind, { textAlign: "right" }]}>{noun} · версия {revision.revisionNumber}</Text>
        <Text style={styles.code}>{code}</Text>
      </View>
    </View>

    <Text style={styles.title}>{revision.title}</Text>
    <View style={styles.facts}>
      <View style={styles.fact}><Text style={styles.factLabel}>Обект</Text><Text>{project}</Text></View>
      <View style={styles.fact}><Text style={styles.factLabel}>Клиент</Text><Text>{contact}</Text></View>
      <View style={styles.fact}><Text style={styles.factLabel}>Адрес</Text><Text>{siteAddress}</Text></View>
      <View style={styles.fact}><Text style={styles.factLabel}>{kind === "offer" ? "Срок за изпълнение" : "Нов краен срок"}</Text><Text>{deadline ?? (kind === "offer" ? "Не е посочен" : "Без промяна")}</Text></View>
      <View style={styles.fact}><Text style={styles.factLabel}>Изпратена</Text><Text>{revision.frozenAt ? dateFormat.format(revision.frozenAt) : "—"}</Text></View>
      {revision.responseDueAt ? <View style={styles.fact}><Text style={styles.factLabel}>Валидна до</Text><Text>{dateFormat.format(revision.responseDueAt)}</Text></View> : null}
    </View>

    <View style={styles.section}>
      <Text style={styles.heading}>{kind === "offer" ? "Обхват на работата" : "Какво се променя"}</Text>
      <Text style={styles.paragraph}>{revision.description}</Text>
      {revision.reason ? <Text style={styles.note}>Причина: {revision.reason}</Text> : null}
      {revision.clientNote ? <Text style={styles.note}>Бележка към клиента: {revision.clientNote}</Text> : null}
    </View>

    <View style={styles.section}>
      <View style={styles.tableHead} fixed>
        <Text style={styles.colDescription}>Описание</Text>
        <Text style={styles.colQuantity}>Кол.</Text>
        <Text style={styles.colPrice}>Ед. цена</Text>
        <Text style={styles.colTotal}>Сума</Text>
      </View>
      {rows.map((line, index) => (
        <View key={index} style={styles.tableRow} wrap={false}>
          <Text style={styles.colDescription}>{line.description}</Text>
          <Text style={styles.colQuantity}>{quantityFormat.format(Number(line.quantity))}{line.unit ? ` ${line.unit}` : ""}</Text>
          <Text style={styles.colPrice}>{money.format(Number(line.unitPrice))}</Text>
          <Text style={styles.colTotal}>{amount(line.lineTotal)}</Text>
        </View>
      ))}
      <View style={styles.summary} wrap={false}>
        {Number(revision.discountAmount ?? 0) ? <>
          <View style={styles.summaryRow}><Text style={{ color: muted }}>Сума без отстъпка</Text><Text>{amount(String(Number(revision.subtotal) + Number(revision.discountAmount)))}</Text></View>
          <View style={styles.summaryRow}><Text style={{ color: muted }}>{discountLabel(revision.discountType ?? null, revision.discountValue ?? null)}</Text><Text>−{money.format(Number(revision.discountAmount))}</Text></View>
        </> : null}
        {Number(revision.taxRate) ? <>
          <View style={styles.summaryRow}><Text style={{ color: muted }}>Без ДДС</Text><Text>{amount(revision.subtotal)}</Text></View>
          <View style={styles.summaryRow}><Text style={{ color: muted }}>ДДС {Number(revision.taxRate)}%</Text><Text>{amount(revision.taxAmount)}</Text></View>
        </> : <View style={styles.summaryRow}><Text style={{ color: muted }}>Не се начислява ДДС</Text><Text> </Text></View>}
        <View style={styles.summaryTotal}><Text>Общо</Text><Text>{amount(revision.total)}</Text></View>
      </View>
    </View>

    {schedule.length ? (
      <View style={styles.section} wrap={false}>
        <Text style={styles.heading}>Ориентировъчен график</Text>
        {schedule.map((item, index) => (
          <View key={index} style={styles.summaryRow}>
            <Text>{index + 1}. {item.title}</Text>
            <Text>{item.durationDays === 1 ? "1 ден" : `${item.durationDays} дни`}</Text>
          </View>
        ))}
        <Text style={styles.note}>
          Общо около {schedule.reduce((sum, item) => sum + item.durationDays, 0)} дни. Графикът е ориентировъчен: точните дати се уточняват след одобрение{deadline ? `, а договореният срок за изпълнение е ${deadline}` : ""}.
        </Text>
      </View>
    ) : null}

    {paymentTerms.length ? (
      <View style={styles.section} wrap={false}>
        <Text style={styles.heading}>Плащане</Text>
        {termAmounts(cents(revision.total), paymentTerms).map((minor, index) => {
          const term = paymentTerms[index]!;
          const when = term.dueTrigger === "on_date" && term.dueOn ? `до ${formatDeadline(term.dueOn)}` : term.dueTrigger === "on_stage" ? `след „${term.stageTitle ?? "етап"}“` : term.dueTrigger === "on_completion" ? "при завършване" : "при одобрение";
          return (
            <View key={index} style={styles.summaryRow}>
              <Text>{term.title} · {Number(term.percent)}% · {when}</Text>
              <Text>{money.format(Number(minor) / 100)}</Text>
            </View>
          );
        })}
      </View>
    ) : null}

    {absorbedChanges.length ? (
      <View style={styles.section} wrap={false}>
        <Text style={styles.heading}>Включени одобрени промени</Text>
        {absorbedChanges.map((change, index) => (
          <View key={index} style={styles.summaryRow}><Text>{change.title}</Text><Text>{money.format(Number(change.total))}</Text></View>
        ))}
        <Text style={styles.note}>Тези промени са част от цената на тази версия и не се добавят отделно.</Text>
      </View>
    ) : null}

    {decision ? (
      <View style={styles.decision} wrap={false}>
        <Text style={styles.heading}>Решение на клиента</Text>
        <Text>{decision.decision === "approved" ? "Одобрено" : decision.decision === "declined" ? "Отказано" : "Поискана промяна"} от {decision.typedName} на {dateTimeFormat.format(decision.createdAt)}.</Text>
        {decision.verifiedEmail ? <Text style={{ color: muted }}>Потвърдено с еднократен код, изпратен до {decision.verifiedEmail}{decision.ip ? `, IP ${decision.ip}` : ""}.</Text> : null}
        {decision.signature ? (
          <View style={styles.signature}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt attribute */}
            <Image src={decision.signature} style={styles.signatureImage} />
            <Text style={styles.signatureCaption}>Нарисувано от: {decision.typedName}</Text>
          </View>
        ) : null}
      </View>
    ) : null}

    {photos.length ? (
      <View style={styles.section} break={photos.length > 2}>
        <Text style={styles.heading}>Снимки</Text>
        <View style={styles.photos}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photo} wrap={false}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt attribute */}
              <Image src={photo.data} style={styles.photoImage} />
              <Text style={styles.photoCaption}>{photo.name}</Text>
            </View>
          ))}
        </View>
      </View>
    ) : null}

    <View style={styles.footer} fixed>
      <Text>{code} · версия {revision.revisionNumber} · отпечатък {revision.contentHash?.slice(0, 16) ?? "—"}</Text>
      <Text render={({ pageNumber, totalPages }) => `Страница ${pageNumber} от ${totalPages}`} />
    </View>
  </Page></Document>;
}
