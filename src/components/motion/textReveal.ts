/** Temporary measured masks; original text nodes keep layout, semantics and React ownership. */
export function prepareTextReveal(element: HTMLElement) {
  const fallback = () => ({
    surfaces: [element],
    mode: "fade" as "lines" | "fade",
    restore() {},
  });
  const source = element.firstChild;
  if (!source || source.nodeType !== 3 || element.childNodes.length !== 1)
    return fallback();
  const text = source.textContent ?? "";
  const bounds = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const lines: {
    text: string;
    top: number;
    left: number;
    height: number;
    end: number;
  }[] = [];
  try {
    const range = document.createRange();
    for (const match of text.matchAll(/\S+/g)) {
      range.setStart(source, match.index);
      range.setEnd(source, match.index + match[0].length);
      const rect = range.getBoundingClientRect();
      if (!rect.height) continue;
      const height = Number.parseFloat(style.lineHeight) || rect.height;
      const top = rect.top - bounds.top - (height - rect.height) / 2;
      const previous = lines.at(-1);
      if (!previous || Math.abs(previous.top - top) > 1)
        lines.push({
          text: match[0],
          top,
          left: rect.left - bounds.left,
          height,
          end: match.index + match[0].length,
        });
      else {
        previous.text += text.slice(
          previous.end,
          match.index + match[0].length,
        );
        previous.end = match.index + match[0].length;
      }
    }
  } catch {
    return fallback();
  }
  if (!lines.length) return fallback();
  const saved = ["color", "position"].map((name) => ({
    name,
    value: element.style.getPropertyValue(name),
    priority: element.style.getPropertyPriority(name),
  }));
  const overlay = document.createElement("span");
  overlay.setAttribute("aria-hidden", "true");
  overlay.dataset.motionLines = "";
  Object.assign(overlay.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    color: style.color,
  });
  const surfaces = lines.map((line) => {
    const mask = document.createElement("span");
    Object.assign(mask.style, {
      position: "absolute",
      display: "block",
      overflow: "hidden",
      left: `calc(${line.left}px - 0.3em)`,
      right: "-0.3em",
      top: `calc(${line.top}px - 0.3em)`,
      height: `calc(${line.height}px + 0.6em)`,
      lineHeight: `${line.height}px`,
    });
    const fragment = document.createElement("span");
    fragment.dataset.motionLine = "";
    fragment.textContent = line.text;
    Object.assign(fragment.style, {
      display: "block",
      whiteSpace: "pre",
      padding: "0.3em",
      transform: "translateY(115%)",
    });
    mask.append(fragment);
    overlay.append(mask);
    return fragment;
  });
  if (!style.position || style.position === "static")
    element.style.position = "relative";
  element.style.color = "transparent";
  element.append(overlay);
  return {
    surfaces,
    mode: "lines" as "lines" | "fade",
    restore() {
      overlay.remove();
      for (const item of saved)
        if (item.value)
          element.style.setProperty(item.name, item.value, item.priority);
        else element.style.removeProperty(item.name);
    },
  };
}
