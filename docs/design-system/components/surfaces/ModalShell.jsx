import React from "react";
import { Cap } from "../labels/Cap.jsx";
import { IconButton } from "../actions/IconButton.jsx";
import { Icon } from "../icons/Icon.jsx";
const cx = (...c) => c.filter(Boolean).join(" ");

export function ModalShell({ eyebrow, title, onClose, inline, footer, children }) {
  return (
    <div className={cx("kp-scrim", inline && "kp-scrim--inline")} onClick={onClose}>
      <div className="kp-panel kp-panel--paper kp-modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="kp-modal__head">
          <div>
            {eyebrow && <Cap tone="accent">{eyebrow}</Cap>}
            <p className="kp-modal__title">{title}</p>
          </div>
          <IconButton variant="round" label="Close" onClick={onClose}><Icon name="x" size={20} /></IconButton>
        </div>
        <div className="kp-modal__body">{children}</div>
        {footer && <div className="kp-modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
