import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  item?: any;
  onClose: () => void;
  onSave: (data: any) => void;
  isLoading: boolean;
  inline?: boolean;
}

export default function KwonriFormModal({ item, onClose, onSave, isLoading, inline }: Props) {
  const [form, setForm] = useState({
    status: item?.status ?? "active",
    dealType: item?.dealType ?? "monthly",
    name: item?.name ?? "",
    address: item?.address ?? "",
    location: item?.location ?? "",
    type: item?.type ?? "",
    industry: item?.industry ?? "",
    manager: item?.manager ?? "",
    grade: item?.grade ?? "",
    ownerName: item?.ownerName ?? "",
    phone1: item?.phone1 ?? "",
    phone2: item?.phone2 ?? "",
    homePhone: item?.homePhone ?? "",
    mobile: item?.mobile ?? "",
    rentArea: item?.rentArea ?? "",
    realArea: item?.realArea ?? "",
    floors: item?.floors ?? "",
    deposit: item?.deposit ? String(parseFloat(item.deposit)) : "",
    premium: item?.premium ? String(parseFloat(item.premium)) : "",
    total: item?.total ? String(parseFloat(item.total)) : "",
    monthlyRent: item?.monthlyRent ? String(parseFloat(item.monthlyRent)) : "",
    manageFee: item?.manageFee ? String(parseFloat(item.manageFee)) : "",
    vat: item?.vat ?? "",
    memo1: item?.memo1 ?? "",
    memo2: item?.memo2 ?? "",
    specialFeature: item?.specialFeature ?? "",
    saleInfo: item?.saleInfo ?? "",
    recommendIndustry: item?.recommendIndustry ?? "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const toNum = (v: string) => v ? parseFloat(v) : undefined;
    onSave({
      ...form,
      deposit: toNum(form.deposit),
      premium: toNum(form.premium),
      total: toNum(form.total),
      monthlyRent: toNum(form.monthlyRent),
      manageFee: toNum(form.manageFee),
    });
  };

  if (inline) {
    return (
      <div className="bg-card h-full flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold text-[15px]">물건 수정</h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded" title="취소"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 상태 + 거래유형 */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">거래유형</label>
              <div className="flex gap-2">
                {(["monthly", "sale"] as const).map(d => (
                  <button key={d} onClick={() => set("dealType", d)}
                    className={`px-4 py-1.5 text-[12px] rounded-md border transition-colors ${
                      form.dealType === d
                        ? d === "monthly" ? "bg-blue-500 text-white border-blue-500" : "bg-orange-500 text-white border-orange-500"
                        : "border-input bg-background hover:bg-accent"
                    }`}>
                    {d === "monthly" ? "월세" : "매매"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Section title="기본 정보">
            <Field label="물건명" value={form.name} onChange={v => set("name", v)} />
            <Field label="주소" value={form.address} onChange={v => set("address", v)} />
            <Field label="위치" value={form.location} onChange={v => set("location", v)} />
            <Field label="종류" value={form.type} onChange={v => set("type", v)} />
            <Field label="업종" value={form.industry} onChange={v => set("industry", v)} />
            <Field label="담당자" value={form.manager} onChange={v => set("manager", v)} />
            <Field label="등급" value={form.grade} onChange={v => set("grade", v)} />
          </Section>
          <Section title="면적 · 층수">
            <Field label="임대평수" value={form.rentArea} onChange={v => set("rentArea", v)} type="number" />
            <Field label="실평수" value={form.realArea} onChange={v => set("realArea", v)} type="number" />
            <Field label="층수" value={form.floors} onChange={v => set("floors", v)} />
          </Section>
          <Section title="금액 (만원 단위)">
            <Field label="보증금" value={form.deposit} onChange={v => set("deposit", v)} type="number" placeholder="만원" />
            <Field label="권리금" value={form.premium} onChange={v => set("premium", v)} type="number" placeholder="만원" />
            <Field label="합계" value={form.total} onChange={v => set("total", v)} type="number" placeholder="만원" />
            <Field label="월세" value={form.monthlyRent} onChange={v => set("monthlyRent", v)} type="number" placeholder="만원" />
            <Field label="관리비" value={form.manageFee} onChange={v => set("manageFee", v)} type="number" placeholder="만원" />
            <Field label="부가세" value={form.vat} onChange={v => set("vat", v)} />
          </Section>
          <Section title="연락처">
            <Field label="성명" value={form.ownerName} onChange={v => set("ownerName", v)} />
            <Field label="업소전화" value={form.phone1} onChange={v => set("phone1", v)} />
            <Field label="전화2" value={form.phone2} onChange={v => set("phone2", v)} />
            <Field label="자택전화" value={form.homePhone} onChange={v => set("homePhone", v)} />
            <Field label="핸드폰" value={form.mobile} onChange={v => set("mobile", v)} />
          </Section>
          <Section title="메모">
            <TextArea label="메모1" value={form.memo1} onChange={v => set("memo1", v)} />
            <TextArea label="메모2" value={form.memo2} onChange={v => set("memo2", v)} />
            <TextArea label="특이사항" value={form.specialFeature} onChange={v => set("specialFeature", v)} />
            <TextArea label="매출내역" value={form.saleInfo} onChange={v => set("saleInfo", v)} />
            <Field label="추천업종" value={form.recommendIndustry} onChange={v => set("recommendIndustry", v)} />
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
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold text-[15px]">{item ? "물건 수정" : "물건 신규 등록"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* 상태 + 거래유형 */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">거래유형</label>
              <div className="flex gap-2">
                {(["monthly", "sale"] as const).map(d => (
                  <button key={d} onClick={() => set("dealType", d)}
                    className={`px-4 py-1.5 text-[12px] rounded-md border transition-colors ${
                      form.dealType === d
                        ? d === "monthly" ? "bg-blue-500 text-white border-blue-500" : "bg-orange-500 text-white border-orange-500"
                        : "border-input bg-background hover:bg-accent"
                    }`}>
                    {d === "monthly" ? "월세" : "매매"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 기본 정보 */}
          <Section title="기본 정보">
            <Field label="물건명" value={form.name} onChange={v => set("name", v)} />
            <Field label="주소" value={form.address} onChange={v => set("address", v)} />
            <Field label="위치" value={form.location} onChange={v => set("location", v)} />
            <Field label="종류" value={form.type} onChange={v => set("type", v)} />
            <Field label="업종" value={form.industry} onChange={v => set("industry", v)} />
            <Field label="담당자" value={form.manager} onChange={v => set("manager", v)} />
            <Field label="등급" value={form.grade} onChange={v => set("grade", v)} />
          </Section>

          {/* 면적/층수 */}
          <Section title="면적 · 층수">
            <Field label="임대평수" value={form.rentArea} onChange={v => set("rentArea", v)} type="number" />
            <Field label="실평수" value={form.realArea} onChange={v => set("realArea", v)} type="number" />
            <Field label="층수" value={form.floors} onChange={v => set("floors", v)} />
          </Section>

          {/* 금액 (만원 단위) */}
          <Section title="금액 (만원 단위)">
            <Field label="보증금" value={form.deposit} onChange={v => set("deposit", v)} type="number" placeholder="만원" />
            <Field label="권리금" value={form.premium} onChange={v => set("premium", v)} type="number" placeholder="만원" />
            <Field label="합계" value={form.total} onChange={v => set("total", v)} type="number" placeholder="만원" />
            <Field label="월세" value={form.monthlyRent} onChange={v => set("monthlyRent", v)} type="number" placeholder="만원" />
            <Field label="관리비" value={form.manageFee} onChange={v => set("manageFee", v)} type="number" placeholder="만원" />
            <Field label="부가세" value={form.vat} onChange={v => set("vat", v)} />
          </Section>

          {/* 연락처 */}
          <Section title="연락처">
            <Field label="성명" value={form.ownerName} onChange={v => set("ownerName", v)} />
            <Field label="업소전화" value={form.phone1} onChange={v => set("phone1", v)} />
            <Field label="전화2" value={form.phone2} onChange={v => set("phone2", v)} />
            <Field label="자택전화" value={form.homePhone} onChange={v => set("homePhone", v)} />
            <Field label="핸드폰" value={form.mobile} onChange={v => set("mobile", v)} />
          </Section>

          {/* 메모 */}
          <Section title="메모">
            <TextArea label="메모1" value={form.memo1} onChange={v => set("memo1", v)} />
            <TextArea label="메모2" value={form.memo2} onChange={v => set("memo2", v)} />
            <TextArea label="특이사항" value={form.specialFeature} onChange={v => set("specialFeature", v)} />
            <TextArea label="매출내역" value={form.saleInfo} onChange={v => set("saleInfo", v)} />
            <Field label="추천업종" value={form.recommendIndustry} onChange={v => set("recommendIndustry", v)} />
          </Section>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border sticky bottom-0 bg-card">
          <button onClick={onClose} className="px-4 py-2 text-[13px] border border-input rounded-md hover:bg-accent transition-colors">
            취소
          </button>
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
