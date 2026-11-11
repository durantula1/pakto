import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Imported for its side effect: it registers the NotoSans family (Latin + Cyrillic + €) the PDF uses.
import "@/modules/pdf/change-document";
import type { InvoiceSeller } from "@/db/schema";
import { formatAmount } from "@/lib/money";
import { dateOnly } from "@/lib/dates";
import { lineAmounts } from "@/modules/invoices/totals";
import { logoBox, type LogoSize } from "@/modules/organizations/logo-box";

const muted = "#66706b";
const rule = "#dfe3df";
const quantityFormat = new Intl.NumberFormat("bg-BG", { maximumFractionDigits: 3 });
const day = (value: string | null) => (value ? dateOnly.format(new Date(`${value}T12:00:00Z`)) : "—");

export type InvoicePdfProps = {
  title: string;
  accent: string;
  number: string | null;
  status: "draft" | "issued" | "paid" | "void";
  logo: { data: Buffer; width: number; height: number; size: LogoSize } | null;
  seller: InvoiceSeller;
  buyer: { name: string; vat: string | null; address: string | null };
  issueDate: string | null;
  supplyDate: string | null;
  dueDate: string | null;
  currency: string;
  lines: { description: string; quantity: string; unit: string | null; unitPrice: string; taxRate: string }[];
  subtotal: string;
  taxTotal: string;
  total: string;
  note: string | null;
  headerNote: string | null;
  footerNote: string | null;
  paymentNote: string | null;
};

export function InvoiceDocument(props: InvoicePdfProps) {
  const { accent } = props;
  const styles = StyleSheet.create({
    page: { fontFamily: "NotoSans", paddingTop: 40, paddingBottom: 60, paddingHorizontal: 44, color: "#1c2420", fontSize: 10, lineHeight: 1.4 },
    header: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 14, borderBottom: `1.5 solid ${accent}` },
    title: { fontSize: 20, fontWeight: 600, color: accent, textAlign: "right" },
    number: { fontSize: 11, textAlign: "right", marginTop: 2 },
    parties: { flexDirection: "row", gap: 24, marginTop: 18 },
    party: { width: "50%" },
    label: { fontSize: 8, color: muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 },
    name: { fontSize: 11, fontWeight: 600 },
    dates: { flexDirection: "row", marginTop: 14, gap: 24 },
    head: { flexDirection: "row", marginTop: 20, paddingVertical: 6, borderBottom: `1 solid ${accent}`, fontSize: 8, color: muted, textTransform: "uppercase" },
    row: { flexDirection: "row", paddingVertical: 6, borderBottom: `0.75 solid ${rule}` },
    cDesc: { width: "40%", paddingRight: 8 },
    cQty: { width: "14%", textAlign: "right", paddingRight: 8 },
    cPrice: { width: "18%", textAlign: "right", paddingRight: 8 },
    cTax: { width: "10%", textAlign: "right", paddingRight: 8 },
    cTotal: { width: "18%", textAlign: "right" },
    summary: { marginTop: 10, marginLeft: "auto", width: "48%" },
    sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
    sumTotal: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 8, borderTop: `1.5 solid ${accent}`, fontSize: 12, fontWeight: 600 },
    note: { marginTop: 16, color: muted },
    footer: { position: "absolute", bottom: 24, left: 44, right: 44, fontSize: 7, color: muted, borderTop: `0.75 solid ${rule}`, paddingTop: 6 },
    watermark: { position: "absolute", top: 300, left: 90, fontSize: 70, color: "#d9a0a0", opacity: 0.35, transform: "rotate(-25deg)" },
  });
  const symbol = props.currency === "EUR" ? "€" : props.currency;
  const box = props.logo ? logoBox({ width: props.logo.width, height: props.logo.height }, props.logo.size) : null;
  return (
    <Document title={`${props.title} ${props.number ?? "чернова"}`}>
      <Page size="A4" style={styles.page}>
        {props.status === "void" ? <Text style={styles.watermark}>АНУЛИРАНА</Text> : props.status === "draft" ? <Text style={styles.watermark}>ЧЕРНОВА</Text> : null}
        <View style={styles.header}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
            {props.logo && box ? <Image src={props.logo.data} style={{ width: box.width, height: box.height, objectFit: "contain", marginBottom: 6 }} /> : null}
            {props.headerNote ? <Text style={{ color: muted }}>{props.headerNote}</Text> : null}
          </View>
          <View>
            <Text style={styles.title}>{props.title}</Text>
            <Text style={styles.number}>№ {props.number ?? "—"}</Text>
          </View>
        </View>
        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.label}>Доставчик</Text>
            <Text style={styles.name}>{props.seller.name}</Text>
            {props.seller.address ? <Text>{props.seller.address}</Text> : null}
            {props.seller.companyIdNumber ? <Text>ЕИК: {props.seller.companyIdNumber}</Text> : null}
            {props.seller.vatId ? <Text>ИН по ЗДДС: {props.seller.vatId}</Text> : null}
            {props.seller.email ? <Text>{props.seller.email}</Text> : null}
          </View>
          <View style={styles.party}>
            <Text style={styles.label}>Получател</Text>
            <Text style={styles.name}>{props.buyer.name}</Text>
            {props.buyer.address ? <Text>{props.buyer.address}</Text> : null}
            {props.buyer.vat ? <Text>ЕИК / ИН по ЗДДС: {props.buyer.vat}</Text> : null}
          </View>
        </View>
        <View style={styles.dates}>
          <View><Text style={styles.label}>Дата на издаване</Text><Text>{day(props.issueDate)}</Text></View>
          <View><Text style={styles.label}>Дата на доставка</Text><Text>{day(props.supplyDate)}</Text></View>
          <View><Text style={styles.label}>Падеж</Text><Text>{day(props.dueDate)}</Text></View>
        </View>
        <View style={styles.head}>
          <Text style={styles.cDesc}>Описание</Text><Text style={styles.cQty}>Кол.</Text><Text style={styles.cPrice}>Ед. цена</Text><Text style={styles.cTax}>ДДС</Text><Text style={styles.cTotal}>Сума</Text>
        </View>
        {props.lines.map((line, index) => (
          <View key={index} style={styles.row} wrap={false}>
            <Text style={styles.cDesc}>{line.description}</Text>
            <Text style={styles.cQty}>{quantityFormat.format(Number(line.quantity))}{line.unit ? ` ${line.unit}` : ""}</Text>
            <Text style={styles.cPrice}>{formatAmount(line.unitPrice)} {symbol}</Text>
            <Text style={styles.cTax}>{Number(line.taxRate)}%</Text>
            <Text style={styles.cTotal}>{formatAmount(lineAmounts(line).net / 100)} {symbol}</Text>
          </View>
        ))}
        <View style={styles.summary}>
          <View style={styles.sumRow}><Text>Данъчна основа</Text><Text>{formatAmount(props.subtotal)} {symbol}</Text></View>
          <View style={styles.sumRow}><Text>ДДС</Text><Text>{formatAmount(props.taxTotal)} {symbol}</Text></View>
          <View style={styles.sumTotal}><Text>Общо</Text><Text>{formatAmount(props.total)} {symbol}</Text></View>
        </View>
        {props.paymentNote ? <Text style={styles.note}>{props.paymentNote}</Text> : null}
        {props.note ? <Text style={styles.note}>{props.note}</Text> : null}
        <Text style={styles.footer} fixed>{props.footerNote ?? ""}</Text>
      </Page>
    </Document>
  );
}
