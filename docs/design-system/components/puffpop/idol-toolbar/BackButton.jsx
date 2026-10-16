import React from "react";
export function BackButton({ href, onClick, label = "Back to idols" }) {
  const icon = <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1418" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>;
  return href ? <a className="ip-back" href={href} onClick={onClick} aria-label={label}>{icon}</a> : <button className="ip-back" onClick={onClick} aria-label={label}>{icon}</button>;
}
