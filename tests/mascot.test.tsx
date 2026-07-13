import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Mascot from "@/components/Mascot";

describe("Mascot", () => {
  it("renders an accessible bear image by default", () => {
    render(<Mascot />);
    expect(screen.getByRole("img", { name: /bear/i })).toBeInTheDocument();
  });

  it("is decorative (no role/label) when title is empty", () => {
    const { container } = render(<Mascot title="" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("respects the size prop", () => {
    const { container } = render(<Mascot size={72} title="" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("72");
  });
});
