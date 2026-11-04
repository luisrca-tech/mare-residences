import { afterEach, expect, it, vi } from "vitest";
import { prepareTextReveal } from "./textReveal";

const descriptor = Object.getOwnPropertyDescriptor(
  Range.prototype,
  "getBoundingClientRect",
);
afterEach(() => {
  if (descriptor)
    Object.defineProperty(Range.prototype, "getBoundingClientRect", descriptor);
  else Reflect.deleteProperty(Range.prototype, "getBoundingClientRect");
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
function heading() {
  const node = document.createElement("h2");
  node.textContent = "One two three four";
  node.style.lineHeight = "32px";
  node.style.color = "rgb(1, 2, 3)";
  document.body.append(node);
  vi.spyOn(node, "getBoundingClientRect").mockReturnValue({
    top: 96,
    left: 0,
    height: 64,
    width: 300,
    bottom: 160,
    right: 300,
  } as DOMRect);
  return node;
}
it("measures actual lines, conceals their fragments and restores original semantic nodes/styles", () => {
  const node = heading();
  const original = node.firstChild;
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value(this: Range) {
      const top = this.startOffset < 8 ? 100 : 132;
      return {
        top,
        bottom: top + 24,
        left: 0,
        right: 120,
        width: 120,
        height: 24,
      };
    },
  });
  const prepared = prepareTextReveal(node);
  expect(prepared.mode).toBe("lines");
  expect(prepared.surfaces).toHaveLength(2);
  expect(prepared.surfaces.map((x) => x.textContent)).toEqual([
    "One two",
    "three four",
  ]);
  expect(
    prepared.surfaces.every((x) => x.style.transform === "translateY(115%)"),
  ).toBe(true);
  expect(node.querySelector('[aria-hidden="true"]')).not.toBeNull();
  expect(node.firstChild).toBe(original);
  expect(node.style.color).toBe("transparent");
  expect(node.getBoundingClientRect().height).toBe(64);
  prepared.restore();
  prepared.restore();
  expect(node.children).toHaveLength(0);
  expect(node.firstChild).toBe(original);
  expect(node.style.color).toBe("rgb(1, 2, 3)");
  expect(node.style.position).toBe("");
});
it("keeps a visible fade alternative if browser line geometry is unavailable", () => {
  const node = heading();
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ height: 0 }),
  });
  const prepared = prepareTextReveal(node);
  expect(prepared.mode).toBe("fade");
  expect(prepared.surfaces).toEqual([node]);
  expect(node.children).toHaveLength(0);
  expect(node.style.color).toBe("rgb(1, 2, 3)");
});
