import React from "react";
export function GroupTag({ group, ko }) {
  return <span className="ip-gtag"><span>{group.toUpperCase()}</span>{ko ? <><span className="ip-gtag__dot"></span><span className="ip-gtag__ko" lang="ko">{ko}</span></> : null}</span>;
}
