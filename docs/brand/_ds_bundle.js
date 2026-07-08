/* @ds-bundle: {"format":4,"namespace":"RhizolveDesignSystem_959827","components":[{"name":"ChatBubble","sourcePath":"components/chat/ChatBubble.jsx"},{"name":"CountermeasureReviewCard","sourcePath":"components/chat/CountermeasureReviewCard.jsx"},{"name":"GembaCheckCard","sourcePath":"components/chat/GembaCheckCard.jsx"},{"name":"HypothesisReviewCard","sourcePath":"components/chat/HypothesisReviewCard.jsx"},{"name":"SuggestionCard","sourcePath":"components/chat/SuggestionCard.jsx"},{"name":"ValidatorReviewCard","sourcePath":"components/chat/ValidatorReviewCard.jsx"},{"name":"ConnectivityIndicator","sourcePath":"components/investigation/ConnectivityIndicator.jsx"},{"name":"MaturityMeter","sourcePath":"components/investigation/MaturityMeter.jsx"},{"name":"ModeIndicator","sourcePath":"components/investigation/ModeIndicator.jsx"},{"name":"NodeStatusMarker","sourcePath":"components/investigation/NodeStatusMarker.jsx"},{"name":"StatusDot","sourcePath":"components/investigation/StatusDot.jsx"},{"name":"Badge","sourcePath":"components/primitives/Badge.jsx"},{"name":"Button","sourcePath":"components/primitives/Button.jsx"},{"name":"Card","sourcePath":"components/primitives/Card.jsx"},{"name":"CardHeader","sourcePath":"components/primitives/Card.jsx"},{"name":"Input","sourcePath":"components/primitives/Input.jsx"},{"name":"ProjectCard","sourcePath":"components/project/ProjectCard.jsx"}],"sourceHashes":{"components/chat/ChatBubble.jsx":"b0198cc93f31","components/chat/CountermeasureReviewCard.jsx":"bceef4c4b5c3","components/chat/GembaCheckCard.jsx":"431612f0aca8","components/chat/HypothesisReviewCard.jsx":"04f57c0b202d","components/chat/SuggestionCard.jsx":"3a80fbfae031","components/chat/ValidatorReviewCard.jsx":"92bbec83080f","components/investigation/ConnectivityIndicator.jsx":"732b98118f6a","components/investigation/MaturityMeter.jsx":"de38e8ce8cc2","components/investigation/ModeIndicator.jsx":"93278f33cda4","components/investigation/NodeStatusMarker.jsx":"0979fb4521ef","components/investigation/StatusDot.jsx":"869d029b72c5","components/primitives/Badge.jsx":"ec63e102b741","components/primitives/Button.jsx":"c0974cfb4ccd","components/primitives/Card.jsx":"46d52c8abb72","components/primitives/Input.jsx":"6389ae46881c","components/project/ProjectCard.jsx":"894ad8c40ff7","ui_kits/android/MobileScreens.jsx":"ae6721dc088f","ui_kits/web/DashboardScreen.jsx":"4fdaf9f5269f","ui_kits/web/InvestigationScreen.jsx":"3bd51007c7c9","ui_kits/web/LoginScreen.jsx":"b9025f4afdf0","ui_kits/web/Logo.jsx":"6da835373890","ui_kits/web/ReportScreen.jsx":"dbc852b89ba3","ui_kits/web/WhyTree.jsx":"754104f9f722"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.RhizolveDesignSystem_959827 = window.RhizolveDesignSystem_959827 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/chat/ChatBubble.jsx
try { (() => {
/**
 * ChatBubble — a single message in the investigation thread. The typeface tells
 * the user who is speaking before they read a word:
 *   author="agent" → Source Serif 4 voice (AI-authored: TL;DR, shallow answers)
 *   author="user"  → Inter sans, right-aligned, on a subtle fill
 * System notes render as centred muted mono-ish captions.
 */
function ChatBubble({
  author = 'agent',
  name = null,
  children,
  style = {}
}) {
  if (author === 'system') {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        margin: '6px 0',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-caption-size)',
        color: 'var(--text-muted)',
        ...style
      }
    }, children);
  }
  const isUser = author === 'user';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      margin: '10px 0',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '78%'
    }
  }, name && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-muted)',
      marginBottom: 4,
      textAlign: isUser ? 'right' : 'left'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
      background: isUser ? 'color-mix(in srgb, var(--accent) 12%, var(--surface-2))' : 'var(--surface-1)',
      border: '1px solid var(--border)',
      color: 'var(--text-primary)',
      fontFamily: isUser ? 'var(--font-sans)' : 'var(--font-voice)',
      fontSize: isUser ? 15 : 16,
      lineHeight: isUser ? 1.5 : 'var(--text-body-lh)'
    }
  }, children)));
}
Object.assign(__ds_scope, { ChatBubble });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chat/ChatBubble.jsx", error: String((e && e.message) || e) }); }

// components/investigation/ConnectivityIndicator.jsx
try { (() => {
/**
 * ConnectivityIndicator — Android auto-mode network state. The app measures
 * signal continuously and routes inference automatically:
 *   cloud  — strong/moderate signal, cloud APIs
 *   hybrid — weak signal, OpenRouter + Cactus fallback
 *   local  — no signal, fully on-device Cactus
 * Always visible on the field surface.
 */
function ConnectivityIndicator({
  mode = 'cloud',
  style = {}
}) {
  const map = {
    cloud: {
      label: 'Cloud',
      color: 'var(--success)',
      bars: 3
    },
    hybrid: {
      label: 'Hybrid',
      color: 'var(--warning)',
      bars: 2
    },
    local: {
      label: 'On-device',
      color: 'var(--text-muted)',
      bars: 1
    }
  };
  const m = map[mode] || map.cloud;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      height: 26,
      padding: '0 10px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-caption-size)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-secondary)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'flex-end',
      gap: 2,
      height: 12
    }
  }, [6, 9, 12].map((h, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 3,
      height: h,
      borderRadius: 1,
      background: i < m.bars ? m.color : 'var(--border-strong)'
    }
  }))), m.label);
}
Object.assign(__ds_scope, { ConnectivityIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/investigation/ConnectivityIndicator.jsx", error: String((e && e.message) || e) }); }

// components/investigation/MaturityMeter.jsx
try { (() => {
/**
 * MaturityMeter — the 1–5 organisation maturity scale that governs hypothesis
 * complexity (1 = basic poka-yoke gaps → 5 = complex systemic failures).
 * Five segments fill up to the current level; neutral chrome, no coral.
 */
function MaturityMeter({
  level = 3,
  showLabel = true,
  style = {}
}) {
  const labels = ['Basic', 'Developing', 'Defined', 'Managed', 'Optimising'];
  const clamped = Math.max(1, Math.min(5, level));
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 3
    }
  }, [1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 16,
      height: 5,
      borderRadius: 'var(--radius-pill)',
      background: i <= clamped ? 'var(--accent-fill)' : 'var(--border-strong)'
    }
  }))), showLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-caption-size)',
      color: 'var(--text-secondary)',
      fontWeight: 'var(--weight-medium)'
    }
  }, "L", clamped, " \xB7 ", labels[clamped - 1]));
}
Object.assign(__ds_scope, { MaturityMeter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/investigation/MaturityMeter.jsx", error: String((e && e.message) || e) }); }

// components/investigation/ModeIndicator.jsx
try { (() => {
/**
 * ModeIndicator — the subtle Shallow/Deep routing pill in the chat composer.
 * ● Shallow = direct conversational answer, no graph.
 * ◆ Deep = the 5 Whys graph is running.
 * Deliberately quiet chrome; the agent decides the mode, the user can override.
 */
function ModeIndicator({
  mode = 'shallow',
  onClick,
  style = {}
}) {
  const isDeep = mode === 'deep';
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 24,
      padding: '0 10px',
      borderRadius: 'var(--radius-pill)',
      border: '1px solid var(--border)',
      background: 'var(--surface-1)',
      color: 'var(--text-secondary)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-caption-size)',
      fontWeight: 'var(--weight-medium)',
      cursor: onClick ? 'pointer' : 'default',
      lineHeight: 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)',
      fontSize: 10
    }
  }, isDeep ? '◆' : '●'), isDeep ? 'Deep' : 'Shallow');
}
Object.assign(__ds_scope, { ModeIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/investigation/ModeIndicator.jsx", error: String((e && e.message) || e) }); }

// components/investigation/NodeStatusMarker.jsx
try { (() => {
/**
 * NodeStatusMarker — the heart of Rhizolve's visual identity. Renders the five
 * node-status states of the why-tree / fault-tree, identically across renderers.
 * Coral lives ONLY here (and the fault-tree SVG). Never a UI-chrome affordance.
 *
 * states: active | confirmed | ruledOut | rootCause | suspended | conflict
 * `emphaticRuledOut` draws the red-X treatment for a ruled-out node that needs
 * explicit attention (per the DESIGN.md mapping table).
 */
function NodeStatusMarker({
  status = 'active',
  size = 32,
  emphaticRuledOut = false,
  style = {}
}) {
  const r = size / 2;
  const cx = r;
  const cy = r;
  const stroke = Math.max(2, size * 0.08);
  const surface = 'var(--surface-2)';
  let body;
  let groupOpacity = 1;
  switch (status) {
    case 'active':
      // Under review: solid coral BORDER, surface fill (a ring, not a disc).
      body = /*#__PURE__*/React.createElement("circle", {
        cx: cx,
        cy: cy,
        r: r - stroke,
        fill: surface,
        stroke: "var(--node-active)",
        strokeWidth: stroke
      });
      break;
    case 'confirmed':
      // Verified real cause (Gemba NOK): solid coral fill.
      body = /*#__PURE__*/React.createElement("circle", {
        cx: cx,
        cy: cy,
        r: r - stroke,
        fill: "var(--node-active)"
      });
      break;
    case 'ruledOut':
      // Dead end (Gemba OK): grey outline, faded to 50%.
      groupOpacity = 0.5;
      body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
        cx: cx,
        cy: cy,
        r: r - stroke,
        fill: surface,
        stroke: "var(--node-ruled-out)",
        strokeWidth: stroke
      }), emphaticRuledOut && /*#__PURE__*/React.createElement("path", {
        d: `M${cx - size * 0.18},${cy - size * 0.18} L${cx + size * 0.18},${cy + size * 0.18} M${cx + size * 0.18},${cy - size * 0.18} L${cx - size * 0.18},${cy + size * 0.18}`,
        stroke: "var(--danger)",
        strokeWidth: stroke,
        strokeLinecap: "round"
      }));
      break;
    case 'rootCause':
      // Terminal cause: green outline, subtle teal fill, green-plus marker.
      body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
        cx: cx,
        cy: cy,
        r: r - stroke,
        fill: "color-mix(in srgb, var(--node-root-cause) 16%, var(--surface-2))",
        stroke: "var(--node-root-cause)",
        strokeWidth: stroke
      }), /*#__PURE__*/React.createElement("path", {
        d: `M${cx},${cy - size * 0.2} L${cx},${cy + size * 0.2} M${cx - size * 0.2},${cy} L${cx + size * 0.2},${cy}`,
        stroke: "var(--node-root-cause)",
        strokeWidth: stroke,
        strokeLinecap: "round"
      }));
      break;
    case 'suspended':
      body = /*#__PURE__*/React.createElement("circle", {
        cx: cx,
        cy: cy,
        r: r - stroke,
        fill: surface,
        stroke: "var(--node-suspended)",
        strokeWidth: stroke,
        strokeDasharray: `${size * 0.16} ${size * 0.12}`
      });
      break;
    case 'conflict':
      body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
        d: `M${cx},${stroke} a${r - stroke},${r - stroke} 0 0 1 0,${2 * (r - stroke)} Z`,
        fill: "var(--node-conflict)"
      }), /*#__PURE__*/React.createElement("path", {
        d: `M${cx},${size - stroke} a${r - stroke},${r - stroke} 0 0 1 0,${-2 * (r - stroke)} Z`,
        fill: "var(--node-active)"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: cx,
        cy: cy,
        r: r * 0.42,
        fill: surface
      }));
      break;
    default:
      body = /*#__PURE__*/React.createElement("circle", {
        cx: cx,
        cy: cy,
        r: r - stroke,
        fill: "var(--node-active)"
      });
  }
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    style: {
      opacity: groupOpacity,
      ...style
    },
    "aria-label": status,
    role: "img"
  }, body);
}
Object.assign(__ds_scope, { NodeStatusMarker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/investigation/NodeStatusMarker.jsx", error: String((e && e.message) || e) }); }

// components/investigation/StatusDot.jsx
try { (() => {
/**
 * StatusDot — project / investigation status dot on dashboard cards.
 * Reuses the Search Party node vocabulary: solid coral = active, hollow = closed,
 * amber = draft. This is the ONE chrome context where coral appears, because a
 * project's status IS its investigation state, not a decorative accent.
 */
function StatusDot({
  status = 'active',
  size = 10,
  withLabel = false,
  style = {}
}) {
  const map = {
    active: {
      fill: 'var(--node-active)',
      border: 'var(--node-active)',
      label: 'Active'
    },
    closed: {
      fill: 'transparent',
      border: 'var(--node-ruled-out)',
      label: 'Closed'
    },
    draft: {
      fill: 'var(--warning)',
      border: 'var(--warning)',
      label: 'Draft'
    }
  };
  const s = map[status] || map.active;
  const dot = /*#__PURE__*/React.createElement("span", {
    "data-status": status,
    style: {
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: 'var(--radius-pill)',
      background: s.fill,
      border: `2px solid ${s.border}`,
      boxSizing: 'border-box',
      flexShrink: 0
    }
  });
  if (!withLabel) return dot;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-caption-size)',
      color: 'var(--text-secondary)',
      ...style
    }
  }, dot, s.label);
}
Object.assign(__ds_scope, { StatusDot });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/investigation/StatusDot.jsx", error: String((e && e.message) || e) }); }

// components/primitives/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rhizolve Badge — small pill label for domain tags, counts, and states.
 * `tone` maps to semantic colours (neutral chrome by default). Coral is NOT
 * available here — node status uses NodeStatusMarker / StatusDot, never a badge.
 */
function Badge({
  tone = 'neutral',
  children,
  style = {},
  ...rest
}) {
  const tones = {
    neutral: {
      background: 'var(--surface-1)',
      color: 'var(--text-secondary)',
      border: 'var(--border)'
    },
    accent: {
      background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
      color: 'var(--accent)',
      border: 'color-mix(in srgb, var(--accent) 30%, transparent)'
    },
    success: {
      background: 'color-mix(in srgb, var(--success) 12%, transparent)',
      color: 'var(--success)',
      border: 'color-mix(in srgb, var(--success) 30%, transparent)'
    },
    danger: {
      background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
      color: 'var(--danger)',
      border: 'color-mix(in srgb, var(--danger) 30%, transparent)'
    },
    warning: {
      background: 'color-mix(in srgb, var(--warning) 14%, transparent)',
      color: 'var(--warning)',
      border: 'color-mix(in srgb, var(--warning) 32%, transparent)'
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 22,
      padding: '0 10px',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-caption-size)',
      fontWeight: 'var(--weight-medium)',
      lineHeight: 1,
      borderRadius: 'var(--radius-pill)',
      background: t.background,
      color: t.color,
      border: `1px solid ${t.border}`,
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/primitives/Badge.jsx", error: String((e && e.message) || e) }); }

// components/primitives/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rhizolve Button — the primary chrome affordance.
 * Chrome is blue: the solid variant uses accent-fill. Never coral (coral is
 * reserved for node-status meaning). Two weights, sentence case, 8px radius.
 */
function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  leadingIcon = null,
  trailingIcon = null,
  children,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      height: 32,
      padding: '0 12px',
      fontSize: 13
    },
    md: {
      height: 40,
      padding: '0 16px',
      fontSize: 14
    },
    lg: {
      height: 48,
      padding: '0 20px',
      fontSize: 15
    }
  };
  const variants = {
    primary: {
      background: 'var(--accent-fill)',
      color: 'var(--on-accent)',
      border: '1px solid transparent'
    },
    secondary: {
      background: 'var(--surface-2)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-strong)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--accent)',
      border: '1px solid transparent'
    },
    danger: {
      background: 'transparent',
      color: 'var(--danger)',
      border: '1px solid var(--danger)'
    }
  };
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: s.height,
      padding: s.padding,
      fontSize: s.fontSize,
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      lineHeight: 1,
      borderRadius: 'var(--radius-control)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'background 120ms ease, opacity 120ms ease, box-shadow 120ms ease',
      whiteSpace: 'nowrap',
      ...v,
      ...style
    }
  }, rest), leadingIcon, children, trailingIcon);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/primitives/Button.jsx", error: String((e && e.message) || e) }); }

// components/chat/SuggestionCard.jsx
try { (() => {
/**
 * SuggestionCard — the AI Co-Pilot "staged suggestion" (DESIGN v0.2.0). When the
 * agent proposes an addition to the 5 Whys chain, it renders as a DASHED-outline
 * serif card adjacent to the target node. The graph only transforms once a human
 * accepts (primary blue button); the AI never mutates the tree autonomously.
 */
function SuggestionCard({
  targetNode = null,
  suggestion,
  onAccept,
  onDismiss,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 460,
      background: 'var(--surface-2)',
      border: '1.5px dashed var(--accent)',
      borderRadius: 'var(--radius-card)',
      padding: 'var(--space-lg)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 'var(--weight-medium)',
      color: 'var(--accent)'
    }
  }, "Suggested branch"), targetNode && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, "\u2192 node ", targetNode)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-voice)',
      fontSize: 15,
      lineHeight: 1.6,
      color: 'var(--text-primary)',
      marginBottom: 16
    }
  }, suggestion), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "sm",
    onClick: onAccept
  }, "Accept suggestion"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "ghost",
    size: "sm",
    onClick: onDismiss
  }, "Dismiss")));
}
Object.assign(__ds_scope, { SuggestionCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chat/SuggestionCard.jsx", error: String((e && e.message) || e) }); }

// components/primitives/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rhizolve Card — the raised container used throughout the app: project cards,
 * chat interrupt cards, dashboard panels. Surface-2 with a hairline border,
 * 12px radius, soft editorial shadow.
 */
function Card({
  elevation = 'md',
  padded = true,
  children,
  style = {},
  ...rest
}) {
  const shadows = {
    flat: 'none',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-card)',
      boxShadow: shadows[elevation] ?? shadows.md,
      padding: padded ? 'var(--space-lg)' : 0,
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, rest), children);
}

/** Optional titled header row for a Card. Sentence case. */
function CardHeader({
  title,
  meta = null,
  children,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-md)',
      marginBottom: 'var(--space-md)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-h3-size)',
      fontWeight: 'var(--weight-medium)'
    }
  }, title), meta, children);
}
Object.assign(__ds_scope, { Card, CardHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/primitives/Card.jsx", error: String((e && e.message) || e) }); }

// components/chat/CountermeasureReviewCard.jsx
try { (() => {
/**
 * CountermeasureReviewCard — the countermeasure-review interrupt (interrupt_after).
 * The agent drafts a corrective action for a confirmed root cause; the driver
 * accepts, edits, or rejects. The proposed text is AI-authored → serif voice.
 */
function CountermeasureReviewCard({
  rootCause,
  countermeasure,
  onAccept,
  onEdit,
  onReject,
  style = {}
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    elevation: "md",
    style: {
      maxWidth: 520,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-caption-size)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--accent)',
      marginBottom: 12
    }
  }, "Countermeasure review"), rootCause && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-muted)',
      marginBottom: 4
    }
  }, "For root cause"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      border: '2px solid var(--node-root-cause)',
      boxSizing: 'border-box'
    }
  }), rootCause)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-voice)',
      fontSize: 15,
      lineHeight: 1.65,
      color: 'var(--text-primary)',
      padding: '12px 14px',
      borderRadius: 'var(--radius-control)',
      border: '1px solid var(--border)',
      background: 'var(--surface-1)',
      marginBottom: 16
    }
  }, countermeasure), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "danger",
    size: "sm",
    onClick: onReject
  }, "Reject"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "sm",
    onClick: onEdit
  }, "Edit"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "sm",
    style: {
      marginLeft: 'auto'
    },
    onClick: onAccept
  }, "Accept")));
}
Object.assign(__ds_scope, { CountermeasureReviewCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chat/CountermeasureReviewCard.jsx", error: String((e && e.message) || e) }); }

// components/chat/GembaCheckCard.jsx
try { (() => {
/**
 * GembaCheckCard — the field verification interrupt. Docks inline in the chat
 * thread (web) and is the primary field surface (Android). Evidence capture
 * comes FIRST (record what you saw), then the three stacked ≥56dp result
 * buttons carrying the node vocabulary: OK = hollow, NOK = solid coral,
 * Root cause = green-plus.
 */
function GembaCheckCard({
  hypothesis,
  instructions,
  branch = null,
  onSubmit,
  style = {}
}) {
  const [result, setResult] = React.useState(null);
  const results = [{
    key: 'OK',
    status: 'ruledOut',
    title: 'OK',
    subtitle: 'Checked out — this is not the cause',
    accent: 'var(--node-ruled-out)'
  }, {
    key: 'NOK',
    status: 'confirmed',
    title: 'NOK',
    subtitle: 'Confirmed — this is a real cause',
    accent: 'var(--node-active)'
  }, {
    key: 'ROOT_CAUSE',
    status: 'rootCause',
    title: 'Root cause',
    subtitle: 'Fixing this prevents recurrence',
    accent: 'var(--node-root-cause)'
  }];
  const evidence = [{
    key: 'voice',
    label: 'Voice'
  }, {
    key: 'photo',
    label: 'Photo'
  }, {
    key: 'type',
    label: 'Type'
  }];
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    elevation: "md",
    style: {
      maxWidth: 520,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-caption-size)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--accent)',
      textTransform: 'none'
    }
  }, "Gemba check"), branch && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, "branch ", branch)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 16,
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-primary)',
      marginBottom: 6
    }
  }, hypothesis), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--text-secondary)',
      lineHeight: 1.6,
      marginBottom: 16
    }
  }, instructions), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-muted)',
      marginBottom: 8
    }
  }, "Record what you observed"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 18
    }
  }, evidence.map(e => /*#__PURE__*/React.createElement("button", {
    key: e.key,
    style: {
      flex: 1,
      height: 48,
      borderRadius: 'var(--radius-control)',
      border: '1px dashed var(--border-strong)',
      background: 'var(--surface-1)',
      color: 'var(--text-secondary)',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 'var(--weight-medium)',
      cursor: 'pointer'
    }
  }, e.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, results.map(r => {
    const selected = result === r.key;
    return /*#__PURE__*/React.createElement("button", {
      key: r.key,
      onClick: () => setResult(r.key),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        minHeight: 'var(--touch-gemba)',
        padding: '0 16px',
        textAlign: 'left',
        borderRadius: 'var(--radius-control)',
        border: `2px solid ${selected ? r.accent : 'var(--border-strong)'}`,
        background: selected ? `color-mix(in srgb, ${r.accent} 12%, var(--surface-2))` : 'var(--surface-2)',
        cursor: 'pointer',
        transition: 'border-color 120ms ease, background 120ms ease'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.NodeStatusMarker, {
      status: r.status,
      size: 28,
      emphaticRuledOut: r.key === 'OK'
    }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontFamily: 'var(--font-sans)',
        fontSize: 16,
        fontWeight: 'var(--weight-medium)',
        color: 'var(--text-primary)'
      }
    }, r.title), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        color: 'var(--text-secondary)'
      }
    }, r.subtitle)));
  })), /*#__PURE__*/React.createElement("button", {
    disabled: !result,
    onClick: () => onSubmit?.({
      result
    }),
    style: {
      marginTop: 16,
      width: '100%',
      height: 'var(--touch-gemba)',
      borderRadius: 'var(--radius-control)',
      border: 'none',
      background: 'var(--accent-fill)',
      color: 'var(--on-accent)',
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      fontWeight: 'var(--weight-medium)',
      cursor: result ? 'pointer' : 'not-allowed',
      opacity: result ? 1 : 0.45
    }
  }, "Submit result"));
}
Object.assign(__ds_scope, { GembaCheckCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chat/GembaCheckCard.jsx", error: String((e && e.message) || e) }); }

// components/chat/HypothesisReviewCard.jsx
try { (() => {
/**
 * HypothesisReviewCard — the hypothesis-review interrupt. The agent proposes a
 * ranked list of hypotheses; the driver can remove, reorder, and add before
 * generating Gemba checks. AI-authored hypothesis text renders in the serif voice.
 */
function HypothesisReviewCard({
  hypotheses = [],
  onConfirm,
  onRemove,
  onAdd,
  style = {}
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    elevation: "md",
    style: {
      maxWidth: 520,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-caption-size)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--accent)'
    }
  }, "Hypothesis review"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, hypotheses.length, " candidates \xB7 drag to reorder")), /*#__PURE__*/React.createElement("ol", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, hypotheses.map((h, i) => /*#__PURE__*/React.createElement("li", {
    key: h.id ?? i,
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '10px 12px',
      borderRadius: 'var(--radius-control)',
      border: '1px solid var(--border)',
      background: 'var(--surface-1)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-muted)',
      marginTop: 3,
      cursor: 'grab'
    }
  }, "\u283F ", i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-voice)',
      fontSize: 15,
      lineHeight: 1.55,
      color: 'var(--text-primary)'
    }
  }, typeof h === 'string' ? h : h.text), /*#__PURE__*/React.createElement("button", {
    onClick: () => onRemove?.(h.id ?? i),
    "aria-label": "Remove hypothesis",
    style: {
      border: 'none',
      background: 'transparent',
      color: 'var(--text-muted)',
      cursor: 'pointer',
      fontSize: 16,
      lineHeight: 1,
      padding: 2
    }
  }, "\xD7")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "sm",
    onClick: onAdd
  }, "Add hypothesis"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "sm",
    style: {
      marginLeft: 'auto'
    },
    onClick: onConfirm
  }, "Generate checks")));
}
Object.assign(__ds_scope, { HypothesisReviewCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chat/HypothesisReviewCard.jsx", error: String((e && e.message) || e) }); }

// components/chat/ValidatorReviewCard.jsx
try { (() => {
/**
 * ValidatorReviewCard — the validator-decision interrupt (interrupt_after).
 * The agent proposes whether a confirmed node is the true root cause, with a
 * confidence reading; the driver accepts or overrides. AI rationale = serif voice.
 */
function ValidatorReviewCard({
  decision = 'root_cause',
  confidence = 0.82,
  rationale,
  onAccept,
  onOverride,
  style = {}
}) {
  const pct = Math.round(confidence * 100);
  const isRoot = decision === 'root_cause';
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    elevation: "md",
    style: {
      maxWidth: 520,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-caption-size)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--accent)',
      marginBottom: 12
    }
  }, "Validator decision"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 'var(--weight-medium)',
      color: isRoot ? 'var(--success)' : 'var(--text-secondary)',
      padding: '4px 10px',
      borderRadius: 'var(--radius-pill)',
      border: `1px solid ${isRoot ? 'var(--success)' : 'var(--border-strong)'}`,
      background: isRoot ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'var(--surface-1)'
    }
  }, isRoot ? 'Confirmed root cause' : 'Go deeper')), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--text-muted)',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", null, "Confidence"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-secondary)'
    }
  }, pct, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--border)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct}%`,
      height: '100%',
      background: 'var(--accent-fill)'
    }
  }))), rationale && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-voice)',
      fontSize: 15,
      lineHeight: 1.6,
      color: 'var(--text-primary)',
      marginBottom: 16
    }
  }, rationale), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "sm",
    onClick: onOverride
  }, "Override"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "sm",
    style: {
      marginLeft: 'auto'
    },
    onClick: onAccept
  }, "Accept decision")));
}
Object.assign(__ds_scope, { ValidatorReviewCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chat/ValidatorReviewCard.jsx", error: String((e && e.message) || e) }); }

// components/primitives/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rhizolve Input — text field / textarea used in forms, project setup, and the
 * chat composer. Hairline border, 8px radius, accent focus ring.
 */
function Input({
  as = 'input',
  label = null,
  hint = null,
  invalid = false,
  leadingIcon = null,
  style = {},
  wrapperStyle = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const Tag = as;
  const borderColor = invalid ? 'var(--danger)' : focused ? 'var(--ring)' : 'var(--border-strong)';
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-sans)',
      ...wrapperStyle
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginBottom: 6,
      fontSize: 'var(--text-caption-size)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-secondary)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: as === 'textarea' ? 'flex-start' : 'center',
      gap: 8,
      background: 'var(--surface-2)',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-control)',
      padding: as === 'textarea' ? '10px 12px' : '0 12px',
      boxShadow: focused ? '0 0 0 3px color-mix(in srgb, var(--ring) 22%, transparent)' : 'none',
      transition: 'border-color 120ms ease, box-shadow 120ms ease'
    }
  }, leadingIcon, /*#__PURE__*/React.createElement(Tag, _extends({
    onFocus: e => {
      setFocused(true);
      rest.onFocus?.(e);
    },
    onBlur: e => {
      setFocused(false);
      rest.onBlur?.(e);
    },
    style: {
      flex: 1,
      width: '100%',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-body-size)',
      lineHeight: as === 'textarea' ? 1.6 : undefined,
      height: as === 'textarea' ? undefined : 40,
      resize: as === 'textarea' ? 'vertical' : undefined,
      minHeight: as === 'textarea' ? 72 : undefined,
      ...style
    }
  }, rest))), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 6,
      fontSize: 'var(--text-caption-size)',
      color: invalid ? 'var(--danger)' : 'var(--text-muted)'
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/primitives/Input.jsx", error: String((e && e.message) || e) }); }

// components/project/ProjectCard.jsx
try { (() => {
/**
 * ProjectCard — a project tile on the dashboard grid. Shows name, domain badge,
 * one-line description, status dot (coral = active), active-investigation count,
 * maturity level, and member count.
 */
function ProjectCard({
  project = {},
  onClick,
  style = {}
}) {
  const {
    name = 'Untitled project',
    domain = 'General',
    description = '',
    status = 'active',
    investigations = 0,
    maturity = 3,
    members = 1,
    visibility = 'Team'
  } = project;
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    elevation: "sm",
    onClick: onClick,
    style: {
      cursor: onClick ? 'pointer' : 'default',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      minWidth: 260,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StatusDot, {
    status: status
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 16,
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, name)), /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "neutral"
  }, domain)), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--text-secondary)',
      lineHeight: 1.5,
      textWrap: 'pretty'
    }
  }, description), /*#__PURE__*/React.createElement(__ds_scope.MaturityMeter, {
    level: maturity
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      marginTop: 2,
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text-secondary)',
      fontWeight: 'var(--weight-medium)'
    }
  }, investigations), " active"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text-secondary)',
      fontWeight: 'var(--weight-medium)'
    }
  }, members), " members"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }, visibility)));
}
Object.assign(__ds_scope, { ProjectCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/project/ProjectCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/android/MobileScreens.jsx
try { (() => {
// Mobile screens for the Rhizolve Android client (chat-first + Gemba field surface).
const MNS = window.RhizolveDesignSystem_959827;
const {
  Button,
  ChatBubble,
  GembaCheckCard,
  ConnectivityIndicator,
  NodeStatusMarker
} = MNS;
function TopBar({
  title,
  connectivity,
  onMenu
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '14px 16px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface-1)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 16,
      fontWeight: 500,
      color: 'var(--text-primary)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(ConnectivityIndicator, {
    mode: connectivity
  })));
}
function TabRow({
  tab,
  setTab
}) {
  const tabs = [['chat', 'Chat'], ['tree', 'Why tree']];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface-1)'
    }
  }, tabs.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setTab(k),
    style: {
      flex: 1,
      minHeight: 52,
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 500,
      color: tab === k ? 'var(--accent)' : 'var(--text-muted)',
      borderTop: tab === k ? '2px solid var(--accent)' : '2px solid transparent'
    }
  }, l)));
}

// Chat-first investigation screen
function MobileChatScreen({
  connectivity,
  onOpenGemba
}) {
  const [tab, setTab] = React.useState('chat');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--surface-0)'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "Line 3 seal failures",
    connectivity: connectivity
  }), tab === 'chat' ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: '12px 14px'
    }
  }, /*#__PURE__*/React.createElement(ChatBubble, {
    author: "user",
    name: "You"
  }, "Line 3 keeps stopping mid-shift."), /*#__PURE__*/React.createElement(ChatBubble, {
    author: "agent"
  }, "Opening a Deep-mode run. I have a Gemba check ready for the worn-seal hypothesis on branch 1.2.2."), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '10px 0'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onOpenGemba,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      minHeight: 56,
      padding: '0 14px',
      borderRadius: 8,
      border: '2px solid var(--node-active)',
      background: 'color-mix(in srgb, var(--node-active) 10%, var(--surface-2))',
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement(NodeStatusMarker, {
    status: "active",
    size: 26
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      fontWeight: 500,
      color: 'var(--text-primary)'
    }
  }, "Gemba check assigned"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, "Worn conveyor seal \xB7 tap to open"))))) : /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 22,
      paddingTop: 8
    }
  }, [['active', 'Line 3 stops mid-shift', 36], ['active', 'Drive motor overheats', 32], ['rootCause', 'Worn conveyor seal', 32]].map(([s, l, sz], i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(NodeStatusMarker, {
    status: s,
    size: sz
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, l)), i < 2 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 2,
      height: 18,
      background: 'var(--border-strong)'
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      padding: '10px 14px',
      borderTop: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 8,
      border: '1px solid var(--border-strong)',
      background: 'var(--surface-2)',
      color: 'var(--text-secondary)',
      fontSize: 18,
      cursor: 'pointer'
    }
  }, "\uD83C\uDF99"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      borderRadius: 8,
      border: '1px solid var(--border-strong)',
      background: 'var(--surface-2)',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--text-muted)'
    }
  }, "Message\u2026"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    style: {
      height: 44
    }
  }, "Send")), /*#__PURE__*/React.createElement(TabRow, {
    tab: tab,
    setTab: setTab
  }));
}

// Full-screen Gemba field surface
function MobileGembaScreen({
  connectivity,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--surface-0)'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "Gemba check",
    connectivity: connectivity
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      background: 'transparent',
      border: 'none',
      color: 'var(--accent)',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
      padding: '2px 0 12px'
    }
  }, "\u2039 Back to chat"), /*#__PURE__*/React.createElement(GembaCheckCard, {
    hypothesis: "Worn conveyor seal on line 3",
    instructions: "Inspect the seal at station 3. Record what you observe, photograph any wear, then choose a result.",
    branch: "1.2.2",
    onSubmit: onBack,
    style: {
      maxWidth: '100%'
    }
  })));
}
Object.assign(window, {
  MobileChatScreen,
  MobileGembaScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/android/MobileScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/DashboardScreen.jsx
try { (() => {
// DashboardScreen — project grid + metrics row + needs-attention rail.
const {
  ProjectCard,
  Card,
  Badge,
  Button
} = window.RhizolveDesignSystem_959827;
const RzLogo = window.RzLogo;
const PROJECTS = [{
  name: 'Line 3 seal failures',
  domain: 'Manufacturing',
  description: 'Recurring conveyor stoppages on the packaging line.',
  status: 'active',
  investigations: 2,
  maturity: 4,
  members: 5,
  visibility: 'Team'
}, {
  name: 'Checkout latency spikes',
  domain: 'IT infrastructure',
  description: 'Intermittent p99 latency on the payments service.',
  status: 'active',
  investigations: 1,
  maturity: 3,
  members: 3,
  visibility: 'Organisation'
}, {
  name: 'Batch 22 potency drift',
  domain: 'Pharmaceuticals',
  description: 'Assay results trending below spec across three lots.',
  status: 'draft',
  investigations: 0,
  maturity: 5,
  members: 2,
  visibility: 'Private'
}, {
  name: 'Turbine vibration alarm',
  domain: 'Utilities & energy',
  description: 'Bearing-2 vibration exceeding threshold intermittently.',
  status: 'active',
  investigations: 1,
  maturity: 4,
  members: 4,
  visibility: 'Team'
}, {
  name: 'Claims backlog SLA miss',
  domain: 'Financial services',
  description: 'Tier-2 claims exceeding the 5-day resolution SLA.',
  status: 'closed',
  investigations: 0,
  maturity: 2,
  members: 6,
  visibility: 'Organisation'
}];
const METRICS = [{
  label: 'Active investigations',
  value: '7'
}, {
  label: 'Root causes found',
  value: '34'
}, {
  label: 'Avg depth to cause',
  value: '3.8'
}, {
  label: 'Gemba completion',
  value: '92%'
}];
const ATTENTION = [{
  kind: 'Gemba assigned',
  text: 'Worn seal check · branch 3.1',
  dot: 'var(--node-active)'
}, {
  kind: 'Conflict flag',
  text: 'Field result disputes 2.4',
  dot: 'var(--node-conflict)'
}, {
  kind: 'Awaiting quorum',
  text: 'Turbine vibration · 2 of 3 ready',
  dot: 'var(--accent)'
}];
function DashboardScreen({
  onOpenProject,
  onSignOut
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflow: 'auto',
      background: 'var(--surface-0)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '16px 28px',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      background: 'color-mix(in srgb, var(--surface-0) 88%, transparent)',
      backdropFilter: 'blur(8px)',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement(RzLogo, {
    style: {
      height: 30
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: onSignOut
  }, "Sign out"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: 'var(--accent-fill)',
      color: 'var(--on-accent)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 500
    }
  }, "AR"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 300px',
      gap: 28,
      padding: '28px',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 22,
      color: 'var(--text-primary)',
      margin: '0 0 18px'
    }
  }, "Projects"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 14,
      marginBottom: 24
    }
  }, METRICS.map(m => /*#__PURE__*/React.createElement(Card, {
    key: m.label,
    elevation: "sm",
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 28,
      fontWeight: 500,
      color: 'var(--text-primary)',
      lineHeight: 1
    }
  }, m.value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--text-muted)',
      marginTop: 6
    }
  }, m.label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 14
    }
  }, PROJECTS.map((p, i) => /*#__PURE__*/React.createElement(ProjectCard, {
    key: i,
    project: p,
    onClick: () => onOpenProject?.(p)
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpenProject?.(PROJECTS[0]),
    style: {
      border: '1.5px dashed var(--border-strong)',
      borderRadius: 12,
      background: 'transparent',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 500,
      cursor: 'pointer',
      minHeight: 140,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8
    }
  }, "+ New project"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 16,
      color: 'var(--text-primary)',
      margin: '2px 0 12px'
    }
  }, "Needs attention"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, ATTENTION.map((a, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    elevation: "sm",
    style: {
      padding: 14,
      cursor: 'pointer'
    },
    onClick: () => onOpenProject?.(PROJECTS[0])
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: a.dot
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 500,
      color: 'var(--text-muted)',
      textTransform: 'none'
    }
  }, a.kind)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, a.text)))))));
}
window.DashboardScreen = DashboardScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/InvestigationScreen.jsx
try { (() => {
// InvestigationScreen — the three-column flagship: sidebar / chat / why-tree.
const NS = window.RhizolveDesignSystem_959827;
const {
  Button,
  Input,
  Badge,
  ChatBubble,
  ModeIndicator,
  GembaCheckCard,
  HypothesisReviewCard,
  ValidatorReviewCard,
  CountermeasureReviewCard
} = NS;
const RzLogo = window.RzLogo;
const SIDEBAR_PROJECTS = [{
  name: 'Line 3 seal failures',
  active: true
}, {
  name: 'Checkout latency spikes',
  active: false
}, {
  name: 'Turbine vibration alarm',
  active: false
}, {
  name: 'Batch 22 potency drift',
  active: false
}];
const PRESENCE = [{
  initials: 'AR',
  name: 'A. Rivera',
  role: 'Owner',
  driver: true,
  color: 'var(--accent-fill)'
}, {
  initials: 'JT',
  name: 'J. Tan',
  role: 'Analyst',
  driver: false,
  color: '#0F6E56'
}, {
  initials: 'MK',
  name: 'M. Koch',
  role: 'Operator',
  driver: false,
  color: '#854F0B'
}];
const LEGEND = [['active', 'Active'], ['ruledOut', 'Ruled out'], ['rootCause', 'Root cause'], ['suspended', 'Suspended'], ['conflict', 'Conflict']];
function InvestigationScreen({
  onBack,
  onExportReport
}) {
  const [messages, setMessages] = React.useState([{
    author: 'user',
    name: 'A. Rivera',
    text: 'Line 3 keeps stopping mid-shift, roughly twice a day.'
  }, {
    author: 'agent',
    text: 'That is worth a full investigation. I have opened a Deep-mode 5 Whys run and extracted the phenomenon, domain (manufacturing) and maturity (L4). Confirm to proceed.'
  }, {
    author: 'system',
    text: 'Switched to Deep mode · investigation inv-8f21c'
  }]);
  const [card, setCard] = React.useState('gemba'); // gemba | hypothesis | validator | countermeasure | none
  const [draft, setDraft] = React.useState('');
  const [legendOpen, setLegendOpen] = React.useState(false);
  const [selectedNode, setSelectedNode] = React.useState('1.2.2');
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, card]);
  const send = () => {
    if (!draft.trim()) return;
    setMessages(m => [...m, {
      author: 'user',
      name: 'A. Rivera',
      text: draft.trim()
    }]);
    setDraft('');
    setTimeout(() => setMessages(m => [...m, {
      author: 'agent',
      text: 'Noted — I have injected that into the investigation context and re-ranked the open hypotheses.'
    }]), 400);
  };
  const advanceCard = () => {
    const order = ['gemba', 'validator', 'countermeasure', 'none'];
    setCard(c => order[Math.min(order.indexOf(c) + 1, order.length - 1)]);
  };
  const renderCard = () => {
    if (card === 'gemba') return /*#__PURE__*/React.createElement(GembaCheckCard, {
      hypothesis: "Worn conveyor seal on line 3",
      instructions: "Inspect the seal at station 3. Photograph any visible wear or debris before deciding.",
      branch: "1.2.2",
      onSubmit: advanceCard
    });
    if (card === 'hypothesis') return /*#__PURE__*/React.createElement(HypothesisReviewCard, {
      hypotheses: [{
        id: 'h1',
        text: 'Worn conveyor seal on line 3'
      }, {
        id: 'h2',
        text: 'Drive motor overheating'
      }],
      onConfirm: advanceCard
    });
    if (card === 'validator') return /*#__PURE__*/React.createElement(ValidatorReviewCard, {
      decision: "root_cause",
      confidence: 0.86,
      rationale: "The Gemba check confirms seal wear, and no deeper cause remains unexamined on this branch.",
      onAccept: advanceCard,
      onOverride: advanceCard
    });
    if (card === 'countermeasure') return /*#__PURE__*/React.createElement(CountermeasureReviewCard, {
      rootCause: "Worn conveyor seal, line 3",
      countermeasure: "Replace the seal and add a monthly wear inspection to the preventive-maintenance schedule for line 3.",
      onAccept: advanceCard,
      onReject: advanceCard,
      onEdit: advanceCard
    });
    return null;
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '320px 1fr 400px',
      height: '100%',
      background: 'var(--surface-0)'
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      borderRight: '1px solid var(--border)',
      background: 'var(--surface-1)',
      display: 'flex',
      flexDirection: 'column',
      padding: 16
    }
  }, /*#__PURE__*/React.createElement(RzLogo, {
    style: {
      height: 28,
      marginBottom: 20,
      alignSelf: 'flex-start',
      cursor: 'pointer'
    },
    onClick: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 500,
      color: 'var(--text-muted)',
      marginBottom: 8,
      textTransform: 'none'
    }
  }, "Projects"), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, SIDEBAR_PROJECTS.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 10px',
      borderRadius: 8,
      background: p.active ? 'var(--surface-2)' : 'transparent',
      border: p.active ? '1px solid var(--border)' : '1px solid transparent',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: p.active ? 'var(--node-active)' : 'var(--border-strong)',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: p.active ? 'var(--text-primary)' : 'var(--text-secondary)',
      fontWeight: p.active ? 500 : 400,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, p.name)))), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    style: {
      marginTop: 10,
      justifyContent: 'flex-start'
    }
  }, "+ New project"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, "proj-014 \xB7 L4 manufacturing")), /*#__PURE__*/React.createElement("main", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 20px',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      fontWeight: 500,
      color: 'var(--text-primary)'
    }
  }, "Line 3 seal failures"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      marginLeft: 8
    }
  }, PRESENCE.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: p.initials,
    title: `${p.name} · ${p.role}${p.driver ? ' · driver' : ''}`,
    style: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: p.color,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 500,
      marginLeft: i ? -6 : 0,
      border: p.driver ? '2px solid var(--accent)' : '2px solid var(--surface-0)'
    }
  }, p.initials))), /*#__PURE__*/React.createElement(Badge, {
    tone: "accent",
    style: {
      marginLeft: 4
    }
  }, "A. Rivera driving"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: onExportReport
  }, "Export report"))), /*#__PURE__*/React.createElement("div", {
    ref: scrollRef,
    style: {
      flex: 1,
      overflow: 'auto',
      padding: '16px 20px'
    }
  }, messages.map((m, i) => /*#__PURE__*/React.createElement(ChatBubble, {
    key: i,
    author: m.author,
    name: m.name
  }, m.text)), card !== 'none' && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '8px 0 4px'
    }
  }, renderCard())), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border)',
      padding: '12px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(ModeIndicator, {
    mode: "deep"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, "type ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)'
    }
  }, "/btw"), " for a side question")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    as: "textarea",
    placeholder: "Message the investigation\u2026",
    value: draft,
    onChange: e => setDraft(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    style: {
      minHeight: 44
    }
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: send
  }, "Send")))), /*#__PURE__*/React.createElement("aside", {
    style: {
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--text-primary)'
    }
  }, "Why tree"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setLegendOpen(o => !o),
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--accent)',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 500
    }
  }, legendOpen ? 'Hide legend' : 'Legend')), legendOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px 14px',
      padding: '10px 16px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface-1)'
    }
  }, LEGEND.map(([s, l]) => /*#__PURE__*/React.createElement("span", {
    key: s,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(NS.NodeStatusMarker, {
    status: s,
    size: 14
  }), " ", l))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 12
    }
  }, /*#__PURE__*/React.createElement(WhyTree, {
    selected: selectedNode,
    onNodeClick: n => setSelectedNode(n.id)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 16px',
      borderTop: '1px solid var(--border)',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, "depth 3 \xB7 5 nodes \xB7 1 root cause")));
}
window.InvestigationScreen = InvestigationScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/InvestigationScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/LoginScreen.jsx
try { (() => {
// LoginScreen — Rhizolve sign-in. Warm editorial split: brand rail + form card.
const {
  Button,
  Input
} = window.RhizolveDesignSystem_959827;
const RzLogo = window.RzLogo;
function LoginScreen({
  onSignIn
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.1fr 1fr',
      height: '100%',
      background: 'var(--surface-0)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-1)',
      borderRight: '1px solid var(--border)',
      padding: '56px 56px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(RzLogo, {
    style: {
      height: 40
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 30,
      lineHeight: 1.25,
      color: 'var(--text-primary)',
      margin: '0 0 16px',
      maxWidth: 420
    }
  }, "From observation to verified root cause."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-voice)',
      fontSize: 18,
      lineHeight: 1.6,
      color: 'var(--text-secondary)',
      margin: 0,
      maxWidth: 400
    }
  }, "A structured 5\xA0Whys investigation any team can trust \u2014 defensible regardless of who reviews it.")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, "Internal enterprise tool \xB7 ISO 9001 output")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 340
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 22,
      color: 'var(--text-primary)',
      margin: '0 0 4px'
    }
  }, "Sign in"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--text-muted)',
      margin: '0 0 24px'
    }
  }, "Continue to your projects"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Work email",
    placeholder: "you@company.com",
    defaultValue: "a.rivera@northform.io"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Password",
    type: "password",
    defaultValue: "\xB7\xB7\xB7\xB7\xB7\xB7\xB7\xB7"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: onSignIn,
    style: {
      width: '100%',
      marginTop: 4
    }
  }, "Sign in")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--text-muted)',
      marginTop: 20,
      textAlign: 'center'
    }
  }, "No account? ", /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onSignIn?.();
    },
    style: {
      color: 'var(--accent)',
      fontWeight: 500
    }
  }, "Request access")))));
}
window.LoginScreen = LoginScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/LoginScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Logo.jsx
try { (() => {
// RzLogo — theme-aware Rhizolve mark. Swaps to the dark asset when the document
// (or nearest ancestor) carries data-theme="dark", so the wordmark stays legible
// in both modes. Pass through style / onClick / alt like an <img>.
function RzLogo({
  style,
  ...rest
}) {
  const R = window.React;
  const [dark, setDark] = R.useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  R.useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.getAttribute('data-theme') === 'dark');
    const obs = new MutationObserver(sync);
    obs.observe(el, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    sync();
    return () => obs.disconnect();
  }, []);
  return R.createElement('img', {
    src: dark ? '../../assets/logo-dark.svg' : '../../assets/logo-light.svg',
    alt: 'Rhizolve',
    style,
    ...rest
  });
}
window.RzLogo = RzLogo;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Logo.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/ReportScreen.jsx
try { (() => {
// ReportScreen — the completed-investigation report view (E08). Embeds the same
// static fault-tree SVG the PDF uses (node-status vocabulary), an AI TL;DR in the
// serif voice, root causes + countermeasures, a steering log, a download panel,
// and the HMAC signature footer in mono.
const RNS = window.RhizolveDesignSystem_959827;
const {
  Card,
  Badge,
  Button,
  NodeStatusMarker
} = RNS;
const RzLogo = window.RzLogo;
const FT_NODES = [{
  id: '1',
  label: 'Line 3 stops mid-shift',
  status: 'confirmed',
  x: 210,
  y: 34,
  size: 34,
  parent: null
}, {
  id: '1.1',
  label: 'Belt slips',
  status: 'ruledOut',
  x: 96,
  y: 132,
  size: 26,
  parent: '1'
}, {
  id: '1.2',
  label: 'Motor overheats',
  status: 'confirmed',
  x: 324,
  y: 132,
  size: 30,
  parent: '1'
}, {
  id: '1.2.1',
  label: 'Coolant flow low',
  status: 'ruledOut',
  x: 244,
  y: 232,
  size: 26,
  parent: '1.2'
}, {
  id: '1.2.2',
  label: 'Worn conveyor seal',
  status: 'rootCause',
  x: 392,
  y: 232,
  size: 32,
  parent: '1.2'
}];
function orth(a, b) {
  const midY = a.y + (b.y - a.y) / 2;
  return `M ${a.x} ${a.y} L ${a.x} ${midY} L ${b.x} ${midY} L ${b.x} ${b.y}`;
}
function FaultTree() {
  const byId = Object.fromEntries(FT_NODES.map(n => [n.id, n]));
  const edges = FT_NODES.filter(n => n.parent).map(n => ({
    from: byId[n.parent],
    to: n
  }));
  const legend = [['confirmed', 'Confirmed cause'], ['ruledOut', 'Ruled out'], ['rootCause', 'Root cause']];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      height: 290,
      background: 'var(--surface-1)',
      borderRadius: 'var(--radius-control)',
      border: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: "290",
    viewBox: "0 20 490 280",
    style: {
      position: 'absolute',
      inset: 0
    }
  }, edges.map((e, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: orth(e.from, e.to),
    fill: "none",
    stroke: "var(--border-strong)",
    strokeWidth: "1.5"
  }))), FT_NODES.map(n => /*#__PURE__*/React.createElement("div", {
    key: n.id,
    style: {
      position: 'absolute',
      left: n.x,
      top: n.y,
      transform: 'translate(-50%,-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      width: 110
    }
  }, /*#__PURE__*/React.createElement(NodeStatusMarker, {
    status: n.status,
    size: n.size
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 10,
      lineHeight: 1.2,
      color: 'var(--text-secondary)',
      textAlign: 'center'
    }
  }, n.label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      marginTop: 10
    }
  }, legend.map(([s, l]) => /*#__PURE__*/React.createElement("span", {
    key: s,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(NodeStatusMarker, {
    status: s,
    size: 13
  }), " ", l))));
}
function SectionTitle({
  children
}) {
  return /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 18,
      color: 'var(--text-primary)',
      margin: '0 0 12px'
    }
  }, children);
}
function ReportScreen({
  onBack
}) {
  const steering = [['Hypothesis review', 'A. Rivera removed "contaminated lubricant"', '09:42'], ['Gemba check', 'M. Koch submitted NOK · worn seal', '11:18'], ['Validator decision', 'A. Rivera accepted root cause · 86%', '11:31'], ['Countermeasure', 'A. Rivera accepted corrective action', '11:35']];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflow: 'auto',
      background: 'var(--surface-0)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 24px',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      background: 'color-mix(in srgb, var(--surface-0) 88%, transparent)',
      backdropFilter: 'blur(8px)',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      background: 'transparent',
      border: 'none',
      color: 'var(--accent)',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer'
    }
  }, "\u2039 Investigation"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      fontWeight: 500,
      color: 'var(--text-primary)'
    }
  }, "Investigation report"), /*#__PURE__*/React.createElement(Badge, {
    tone: "success",
    style: {
      marginLeft: 4
    }
  }, "Complete")), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 760,
      margin: '0 auto',
      padding: '28px 24px 60px',
      display: 'flex',
      flexDirection: 'column',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(RzLogo, {
    style: {
      height: 26
    }
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 24,
      color: 'var(--text-primary)',
      margin: '8px 0 6px'
    }
  }, "Line 3 seal failures"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, "Manufacturing"), /*#__PURE__*/React.createElement(Badge, {
    tone: "accent"
  }, "ISO 9001"), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, "Maturity L4"), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, "Depth 3"))), /*#__PURE__*/React.createElement(Card, {
    elevation: "sm"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 500,
      color: 'var(--text-muted)',
      marginBottom: 8
    }
  }, "Summary (TL;DR)"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-voice)',
      fontSize: 16,
      lineHeight: 1.65,
      color: 'var(--text-primary)',
      margin: 0
    }
  }, "Line 3 stopped roughly twice per shift. Investigation traced the phenomenon through motor overheating to a worn conveyor seal at station 3, confirmed by an on-floor Gemba check. Belt slippage and low coolant flow were ruled out. The countermeasure \u2014 seal replacement plus a monthly wear inspection added to preventive maintenance \u2014 was accepted. Time to verified root cause: 1\xA0h\xA053\xA0m.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionTitle, null, "Fault tree"), /*#__PURE__*/React.createElement(FaultTree, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    elevation: "sm"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(NodeStatusMarker, {
    status: "rootCause",
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--text-primary)'
    }
  }, "Root cause")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      lineHeight: 1.6,
      color: 'var(--text-secondary)',
      margin: 0
    }
  }, "Worn conveyor seal on line 3, station 3 \u2014 allowed debris ingress and drive-motor overheating.")), /*#__PURE__*/React.createElement(Card, {
    elevation: "sm"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--text-primary)',
      marginBottom: 8
    }
  }, "Countermeasure"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-voice)',
      fontSize: 14.5,
      lineHeight: 1.6,
      color: 'var(--text-primary)',
      margin: 0
    }
  }, "Replace the seal and add a monthly wear inspection to the preventive-maintenance schedule for line 3."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionTitle, null, "Steering decisions"), /*#__PURE__*/React.createElement(Card, {
    elevation: "sm",
    padded: false
  }, steering.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderTop: i ? '1px solid var(--border)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-muted)',
      width: 46
    }
  }, s[2]), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--accent)',
      width: 130
    }
  }, s[0]), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, s[1]))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionTitle, null, "Export"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary"
  }, "Download PDF"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary"
  }, "Markdown"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary"
  }, "AIAG 8D"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost"
  }, "Download all (ZIP)"))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border)',
      paddingTop: 14,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-muted)',
      lineHeight: 1.9
    }
  }, /*#__PURE__*/React.createElement("div", null, "investigation inv-8f21c-3a \xB7 model attribution: openrouter/anthropic + cactus (2 nodes)"), /*#__PURE__*/React.createElement("div", null, "sha-256 a3f9e1c7b0d4\u202682ce \xB7 hmac signed \xB7 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--success)'
    }
  }, "verified \u2713")))));
}
window.ReportScreen = ReportScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/ReportScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/WhyTree.jsx
try { (() => {
// WhyTree — cosmetic recreation of the interactive xyflow why-tree.
// Static d3-hierarchy-style top-down layout with orthogonal (right-angle)
// connectors and NodeStatusMarker nodes. Node size encodes depth/importance.
const {
  NodeStatusMarker
} = window.RhizolveDesignSystem_959827;

// Hand-laid tree: {id, label, status, x, y, size, parent}
const WHY_NODES = [{
  id: '1',
  label: 'Line 3 stops mid-shift',
  status: 'active',
  x: 200,
  y: 40,
  size: 40,
  parent: null
}, {
  id: '1.1',
  label: 'Belt slips under load',
  status: 'ruledOut',
  x: 90,
  y: 150,
  size: 30,
  parent: '1'
}, {
  id: '1.2',
  label: 'Drive motor overheats',
  status: 'active',
  x: 310,
  y: 150,
  size: 34,
  parent: '1'
}, {
  id: '1.2.1',
  label: 'Coolant flow low',
  status: 'suspended',
  x: 220,
  y: 262,
  size: 28,
  parent: '1.2'
}, {
  id: '1.2.2',
  label: 'Worn conveyor seal',
  status: 'rootCause',
  x: 380,
  y: 262,
  size: 34,
  parent: '1.2'
}];
function orthPath(a, b) {
  const midY = a.y + (b.y - a.y) / 2;
  return `M ${a.x} ${a.y} L ${a.x} ${midY} L ${b.x} ${midY} L ${b.x} ${b.y}`;
}
function WhyTree({
  onNodeClick,
  selected
}) {
  const byId = Object.fromEntries(WHY_NODES.map(n => [n.id, n]));
  const edges = WHY_NODES.filter(n => n.parent).map(n => ({
    from: byId[n.parent],
    to: n
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      height: 340
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: "340",
    viewBox: "0 40 480 320",
    style: {
      position: 'absolute',
      inset: 0
    }
  }, edges.map((e, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: orthPath(e.from, e.to),
    fill: "none",
    stroke: "var(--border-strong)",
    strokeWidth: "1.5"
  }))), WHY_NODES.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.id,
    onClick: () => onNodeClick?.(n),
    title: n.label,
    style: {
      position: 'absolute',
      left: n.x,
      top: n.y,
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: 4,
      width: 120
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: 3,
      borderRadius: '50%',
      boxShadow: selected === n.id ? '0 0 0 3px color-mix(in srgb, var(--accent) 40%, transparent)' : 'none'
    }
  }, /*#__PURE__*/React.createElement(NodeStatusMarker, {
    status: n.status,
    size: n.size
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 10.5,
      lineHeight: 1.2,
      color: 'var(--text-secondary)',
      textAlign: 'center'
    }
  }, n.label))));
}
window.WhyTree = WhyTree;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/WhyTree.jsx", error: String((e && e.message) || e) }); }

__ds_ns.ChatBubble = __ds_scope.ChatBubble;

__ds_ns.CountermeasureReviewCard = __ds_scope.CountermeasureReviewCard;

__ds_ns.GembaCheckCard = __ds_scope.GembaCheckCard;

__ds_ns.HypothesisReviewCard = __ds_scope.HypothesisReviewCard;

__ds_ns.SuggestionCard = __ds_scope.SuggestionCard;

__ds_ns.ValidatorReviewCard = __ds_scope.ValidatorReviewCard;

__ds_ns.ConnectivityIndicator = __ds_scope.ConnectivityIndicator;

__ds_ns.MaturityMeter = __ds_scope.MaturityMeter;

__ds_ns.ModeIndicator = __ds_scope.ModeIndicator;

__ds_ns.NodeStatusMarker = __ds_scope.NodeStatusMarker;

__ds_ns.StatusDot = __ds_scope.StatusDot;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardHeader = __ds_scope.CardHeader;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.ProjectCard = __ds_scope.ProjectCard;

})();
