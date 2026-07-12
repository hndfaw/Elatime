import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AboutData from "@/components/AboutData";

describe("AboutData", () => {
  it("discloses live vs sample sources honestly", () => {
    render(<AboutData />);
    expect(screen.getByText(/About this data/i)).toBeInTheDocument();
    expect(screen.getByText(/Live sources:/i)).toBeInTheDocument();
    expect(screen.getByText(/Sample data:/i)).toBeInTheDocument();
    // Names the real live sources.
    expect(screen.getByText(/Lee County Library System/i)).toBeInTheDocument();
    expect(screen.getByText(/City of Fort Myers/i)).toBeInTheDocument();
  });
});
