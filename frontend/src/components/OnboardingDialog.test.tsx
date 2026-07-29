import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OnboardingDialog from "./OnboardingDialog";

describe("OnboardingDialog", () => {
  it("moves between steps and completes flow", () => {
    const onClose = vi.fn();
    const onComplete = vi.fn();

    render(
      <MemoryRouter>
        <OnboardingDialog open onClose={onClose} onComplete={onComplete} />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Welcome to Bridge Watch" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Developer Help" })).toHaveAttribute(
      "href",
      "https://developers.stellar.org/docs/build/smart-contracts"
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Start on the Dashboard" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Compare assets in Analytics" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});

