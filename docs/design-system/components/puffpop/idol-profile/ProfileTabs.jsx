import React from "react";
const DEF = [{ id: "profile", label: "Profile", ko: "프로필" }, { id: "career", label: "Career", ko: "경력" }, { id: "status", label: "Status", ko: "상태" }];
export function ProfileTabs({ tabs = DEF, active, onChange }) {
  const cur = active ?? tabs[0].id;
  return (
    <nav role="tablist" aria-label="Idol sections" className="ip-tabs">
      {tabs.map((t, k) => (
        <div key={t.id} style={{ animationDelay: 160 + k * 80 + "ms" }}>
          <button role="tab" aria-selected={cur === t.id} className="ip-tab" onClick={() => onChange && onChange(t.id)}>
            <span className="ip-tab__n">0{k + 1}</span><span>{t.label}</span>{t.ko ? <span className="ip-tab__ko" lang="ko">{t.ko}</span> : null}
          </button>
        </div>
      ))}
    </nav>
  );
}
