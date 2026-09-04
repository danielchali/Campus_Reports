import { act, fireEvent, render, screen } from "@testing-library/react";
import Notification from "../components/Notification";
import QuickCaseTemplates from "../components/QuickCaseTemplates";

describe("Notification", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders nothing when it is not visible", () => {
    const { container } = render(
      <Notification type="info" message="Hidden" isVisible={false} onClose={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the message and closes when the user clicks the close button", () => {
    const onClose = jest.fn();
    render(
      <Notification type="success" message="Saved successfully" isVisible onClose={onClose} />,
    );

    expect(screen.getByText("Saved successfully")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("automatically closes after the configured duration", () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    render(
      <Notification type="error" message="Something went wrong" isVisible onClose={onClose} duration={1500} />,
    );

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("QuickCaseTemplates", () => {
  it("filters templates and sends the selected template to the parent", () => {
    const onTemplateSelect = jest.fn();
    render(<QuickCaseTemplates onTemplateSelect={onTemplateSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /quick templates/i }));
    expect(screen.getByText("Bullying/Harassment")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search templates..."), {
      target: { value: "theft" },
    });
    expect(screen.getAllByText("Theft")[0]).toBeInTheDocument();
    expect(screen.queryByText("Bullying/Harassment")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Theft")[0]);
    expect(onTemplateSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "theft", name: "Theft" }),
    );
    expect(screen.queryByPlaceholderText("Search templates...")).not.toBeInTheDocument();
  });
});
