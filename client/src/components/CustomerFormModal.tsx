import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  item?: any;
  onClose: () => void;
  onSave: (data: any) => void;
  isLoading: boolean;
  inline?: boolean;
}

export default function CustomerFormModal({ item, onClose, onSave, isLoading, inline }: Props) {
  const [form, setForm] = useState({
    status: item?.status ?? "active",
    name: item?.name ?? "",
    manager: item?.manager ?? "",
    grade: item?.grade ?? "",
    category: item?.category ?? "",
    mobile: item?.mobile ?? "",
    homePhone: item?.homePhone ?? "",
    companyPhone: item?.companyPhone ?? "",
    fax: item?.fax ?? "",
    budget: item?.budget ?? "",
    wantIndustry: item?.wantIndustry ?? "",
    wantArea: item?.wantArea ?? "",
    wantType: item?.wantType ?? "",
    wantFeature: item?.wantFeature ?? "",
    depositMin: item?.depositMin ? String(parseFloat(item.depositMin)) : "",
    depositMax: item?.depositMax ? String(parseFloat(item.depositMax)) : "",
    premiumMin: item?.premiumMin ? String(parseFloat(item.premiumMin)) : "",
    premiumMax: item?.premiumMax ? String(parseFloat(item.premiumMax)) : "",
    monthlyMin: item?.monthlyMin ? String(parseFloat(item.monthlyMin)) : "",
    monthlyMax: item?.monthlyMax ? String(parseFloat(item.monthlyMax)) : "",
    memo: item?.memo ?? "",
    note1: item?.note1 ?? "",
    note2: item?.note2 ?? "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const toNum = (v: string) => v ? parseFloat(v) : undefined;
    onSave({
      ...form,
      depositMin: toNum(form.depositMin),
      depositMax: toNum(form.depositMax),
      premiumMin: toNum(form.premiumMin),
      premiumMax: toNum(form.premiumMax),
      monthlyMin: toNum(form.monthlyMin),
      monthlyMax: toNum(form.monthlyMax),
    });
  };

  if (inline) {
    return (
      <div className="flex flex-col h-full overflow-auto">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40 shrink-0">
          <h3 className="font-semibold text-[14px]">{item ? "고객 수정" : "고객 신규 등록"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">상태</label>
            <div className="flex gap-2">
              {["active", "hold"].map(s => (
                <button key={s} onClick={() => set("status", s)}
                  className={`px-4 py-1.5 text-[12px] rounded-md border transition-colors ${
                    form.status === s ? "bg-primary text-white border-primary" : "border-input bg-background hover:bg-accent"
                  }`}>
                  {s === "active" ? "관리" : "보류"}
                </button>
              ))}
            </div>
          </div>
          <Section title="기본 정보">
            <Field label="고객명" value={form.name} onChange={v => set("name", v)} />
            <Field label="담당자" value={form.manager} onChange={v => set("manager", v)} />
            <Field label="등급" value={form.grade} onChange={v => set("grade", v)} />
            <Field label="분류" value={form.category} onChange={v => set("category", v)} />
          </Section>
          <Section title="연락처">
            <Field label="핸드폰" value={form.mobile} onChange={v => set("mobile", v)} />
            <Field label="자택전화" value={form.homePhone} onChange={v => set("homePhone", v)} />
            <Field label="회사전화" value={form.companyPhone} onChange={v => set("companyPhone", v)} />
            <Field label="팩스" value={form.fax} onChange={v => set("fax", v)} />
          </Section>
          <Section title="구입 조건">
            <Field label="희망업종" value={form.wantIndustry} onChange={v => set("wantIndustry", v)} />
            <Field label="희망지역" value={form.wantArea} onChange={v => set("wantArea", v)} />
            <Field label="희망종류" value={form.wantType} onChange={v => set("wantType", v)} />
            <Field label="예산" value={form.budget} onChange={v => set("budget", v)} />
          </Section>
          <Section title="금액 범위 (만원)">
            <Field label="보증금 최소" value={form.depositMin} onChange={v => set("depositMin", v)} type="number" />
            <Field label="보증금 최대" value={form.depositMax} onChange={v => set("depositMax", v)} type="number" />
            <Field label="권리금 최소" value={form.premiumMin} onChange={v => set("premiumMin", v)} type="number" />
            <Field label="권리금 최대" value={form.premiumMax} onChange={v => set("premiumMax", v)} type="number" />
            <Field label="월세 최소" value={form.monthlyMin} onChange={v => set("monthlyMin", v)} type="number" />
            <Field label="월세 최대" value={form.monthlyMax} onChange={v => set("monthlyMax", v)} type="number" />
          </Section>
          <Section title="메모">
            <TextArea label="메모" value={form.memo} onChange={v => set("memo", v)} />
            <TextArea label="기타1" value={form.note1} onChange={v => set("note1", v)} />
            <TextArea label="기타2" value={form.note2} onChange={v => set("note2", v)} />
          </Section>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border bg-card shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] border border-input rounded-md hover:bg-accent transition-colors">취소</button>
          <button onClick={handleSave} disabled={isLoading}
            className="px-5 py-2 text-[13px] bg-primary text-white rounded-md hover:bg-primary/80 transition-colors disabled:opacity-50">
            {isLoading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold text-[15px]">{item ? "고객 수정" : "고객 신규 등록"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* 상태 */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">상태</label>
            <div className="flex gap-2">
              {["active", "hold"].map(s => (
                <button key={s} onClick={() => set("status", s)}
                  className={`px-4 py-1.5 text-[12px] rounded-md border transition-colors ${
                    form.status === s ? "bg-primary text-white border-primary" : "border-input bg-background hover:bg-accent"
                  }`}>
                  {s === "active" ? "관리" : "보류"}
                </button>
              ))}
            </div>
          </div>

          {/* 기본 정보 */}
          <Section title="기본 정보">
            <Field label="고객명" value={form.name} onChange={v => set("name", v)} />
            <Field label="담당자" value={form.manager} onChange={v => set("manager", v)} />
            <Field label="등급" value={form.grade} onChange={v => set("grade", v)} />
            <Field label="분류" value={form.category} onChange={v => set("category", v)} />
          </Section>

          {/* 연락처 */}
          <Section title="연락처">
            <Field label="핸드폰" value={form.mobile} onChange={v => set("mobile", v)} />
            <Field label="자택전화" value={form.homePhone} onChange={v => set("homePhone", v)} />
            <Field label="회사전화" value={form.companyPhone} onChange={v => set("companyPhone", v)} />
            <Field label="팩스" value={form.fax} onChange={v => set("fax", v)} />
          </Section>

          {/* 구입 조건 */}
          <Section title="구입 조건">
            <Field label="희망업종" value={form.wantIndustry} onChange={v => set("wantIndustry", v)} />
            <Field label="희망지역" value={form.wantArea} onChange={v => set("wantArea", v)} />
            <Field label="희망종류" value={form.wantType} onChange={v => set("wantType", v)} />
            <Field label="예산" value={form.budget} onChange={v => set("budget", v)} />
          </Section>

          {/* 금액 범위 (만원) */}
          <Section title="금액 범위 (만원)">
            <Field label="보증금 최소" value={form.depositMin} onChange={v => set("depositMin", v)} type="number" />
            <Field label="보증금 최대" value={form.depositMax} onChange={v => set("depositMax", v)} type="number" />
            <Field label="권리금 최소" value={form.premiumMin} onChange={v => set("premiumMin", v)} type="number" />
            <Field label="권리금 최대" value={form.premiumMax} onChange={v => set("premiumMax", v)} type="number" />
            <Field label="월세 최소" value={form.monthlyMin} onChange={v => set("monthlyMin", v)} type="number" />
            <Field label="월세 최대" value={form.monthlyMax} onChange={v => set("monthlyMax", v)} type="number" />
          </Section>

          {/* 메모 */}
          <Section title="메모">
            <TextArea label="메모" value={form.memo} onChange={v => set("memo", v)} />
            <TextArea label="기타1" value={form.note1} onChange={v => set("note1", v)} />
            <TextArea label="기타2" value={form.note2} onChange={v => set("note2", v)} />
          </Section>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border sticky bottom-0 bg-card">
          <button onClick={onClose} className="px-4 py-2 text-[13px] border border-input rounded-md hover:bg-accent transition-colors">취소</button>
          <button onClick={handleSave} disabled={isLoading}
            className="px-5 py-2 text-[13px] bg-primary text-white rounded-md hover:bg-primary/80 transition-colors disabled:opacity-50">
            {isLoading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide border-b border-border pb-1">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] text-muted-foreground mb-0.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full text-[12px] border border-input rounded-md px-2.5 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="col-span-2">
      <label className="block text-[10px] text-muted-foreground mb-0.5">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
        className="w-full text-[12px] border border-input rounded-md px-2.5 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
    </div>
  );
}
