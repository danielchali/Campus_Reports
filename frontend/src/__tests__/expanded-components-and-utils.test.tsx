import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import AppDialog, { useAlertDialog, useConfirmDialog } from "../components/AppDialog";
import BottomNav from "../components/BottomNav";
import DarkModeToggle from "../components/DarkModeToggle";
import OfflineIndicator from "../components/OfflineIndicator";
import SchemaCategoryPicker from "../components/reporting/SchemaCategoryPicker";
import SchemaFormFields from "../components/reporting/SchemaFormFields";
import SignatureField from "../components/SignatureField";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getNavLinksForRole, isNavigationPathActive, splitNavLinksForMobile } from "../utils/navigation";
import { getCampusReportsAssistantSystemPrompt } from "../utils/guidedReporting";
import { canEditWorkOrderPart, workOrderPartLabel } from "../utils/workOrderPermissions";
import { getDisplayFirstName, getDisplayFullName } from "../utils/userDisplay";

jest.mock("next/navigation", () => ({
  usePathname: () => "/student-dashboard",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../context/ThemeContext", () => ({
  useTheme: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseTheme = useTheme as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseTheme.mockReturnValue({ theme: "light", toggleTheme: jest.fn() });
  mockedUseAuth.mockReturnValue({ user: null, token: null, loading: false });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});

describe("navigation utilities", () => {
  it("returns student navigation links and a logout fallback for unknown roles", () => {
    const studentLinks = getNavLinksForRole("student");
    expect(studentLinks.map((link) => link.label)).toEqual([
      "Dashboard",
      "My Reports",
      "Maintenance Request",
      "Security/Disciplinary Issue",
      "My Profile",
      "Help",
      "Logout",
      "UAT Survey",
    ]);
    expect(getNavLinksForRole("unknown").map((link) => link.label)).toEqual(["Logout"]);
  });

  it("uses the actual role and route map in the assistant system prompt", () => {
    const prompt = getCampusReportsAssistantSystemPrompt("/student-dashboard", "student", "Student dashboard guidance");
    expect(prompt).toContain("Campus Reports AI");
    expect(prompt).toContain("Chali Daniel and Namonje Grace");
    expect(prompt).toContain("/student-dashboard");
    expect(prompt).toContain("student");
    expect(prompt).toContain("/security-dashboard");
    expect(prompt).toContain("/maintenance-dashboard");
    expect(prompt).toContain("Do not invent pages or actions not present in this codebase");
  });

  it("splits navigation into mobile and sidebar groups while excluding profile links", () => {
    const links = getNavLinksForRole("admin");
    const { bottomNav, sidebarNav } = splitNavLinksForMobile(links);
    expect(bottomNav).toHaveLength(4);
    expect(bottomNav.map((link) => link.label)).not.toContain("Profile & Settings");
    expect(sidebarNav.map((link) => link.label)).toEqual(
      expect.arrayContaining(["Manage Users", "System Settings", "Logout"]),
    );
  });

  it("keeps the correct report type active after its route redirects to the report form", () => {
    expect(
      isNavigationPathActive(
        "/make-report",
        "/maintenance-request",
        new URLSearchParams("category=maintenance_issue"),
      ),
    ).toBe(true);
    expect(
      isNavigationPathActive(
        "/make-report",
        "/file-security-disciplinary-issue",
        new URLSearchParams("category=disciplinary_case"),
      ),
    ).toBe(true);
    expect(
      isNavigationPathActive(
        "/make-report",
        "/maintenance-request",
        new URLSearchParams("category=disciplinary_case"),
      ),
    ).toBe(false);
  });
});

describe("BottomNav", () => {
  it("renders nothing for signed-out users", () => {
    const { container } = render(<BottomNav />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders student links and marks the current page active", () => {
    mockedUseAuth.mockReturnValue({ user: { role: "student" } });
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /Dashboard/i })).toHaveAttribute("href", "/student-dashboard");
    expect(screen.getByRole("link", { name: /Dashboard/i })).toHaveClass("bg-kmuGreen/10");
    expect(screen.getByRole("link", { name: /My Reports/i })).toHaveAttribute("href", "/my-reports");
  });
});

describe("simple UI components", () => {
  it("calls the theme toggle action", () => {
    const toggleTheme = jest.fn();
    mockedUseTheme.mockReturnValue({ toggleTheme });
    render(<DarkModeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle dark mode" }));
    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });

  it("renders the footer and preserves custom classes", () => {
    render(<SiteFooter className="custom-footer" />);
    expect(screen.getByText("by Chali Daniel and Namonje Grace")).toHaveClass("custom-footer");
  });

  it("hides OfflineIndicator when online or signed out", () => {
    const { container, rerender } = render(<OfflineIndicator />);
    expect(container).toBeEmptyDOMElement();
    mockedUseAuth.mockReturnValue({ user: { id: "student-1" } });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    rerender(<OfflineIndicator />);
    fireEvent(window, new Event("offline"));
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("Offline mode available")).toBeInTheDocument();
  });

  it("responds to online and offline browser events", () => {
    mockedUseAuth.mockReturnValue({ user: { id: "student-1" } });
    render(<OfflineIndicator />);
    fireEvent(window, new Event("offline"));
    expect(screen.getByText("Offline")).toBeInTheDocument();
    fireEvent(window, new Event("online"));
    expect(screen.queryByText("Offline")).not.toBeInTheDocument();
  });
});

describe("SchemaCategoryPicker", () => {
  const categories = [
    { id: "maintenance", label: "Maintenance", description: "Report a facility issue", icon: "wrench", color: "blue" },
    { id: "disciplinary", label: "Disciplinary", description: "Report a security issue", icon: "shield-alert", color: "rose" },
  ] as any;

  it("renders categories and reports selection changes", () => {
    const onChange = jest.fn();
    render(<SchemaCategoryPicker categories={categories} value="maintenance" onChange={onChange} />);
    expect(screen.getAllByText("Maintenance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Report a facility issue").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByDisplayValue("disciplinary"));
    expect(onChange).toHaveBeenCalledWith("disciplinary");
  });

  it("renders the mobile select and locked category state", () => {
    const onChange = jest.fn();
    const { rerender } = render(<SchemaCategoryPicker categories={categories} value="maintenance" onChange={onChange} compact />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "disciplinary" } });
    expect(onChange).toHaveBeenCalledWith("disciplinary");
    rerender(<SchemaCategoryPicker categories={categories} value="maintenance" onChange={onChange} lockedCategory="maintenance" />);
    expect(screen.getByText("Report a facility issue")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders nothing when a locked category cannot be found", () => {
    const { container } = render(<SchemaCategoryPicker categories={categories} value="maintenance" onChange={jest.fn()} lockedCategory="missing" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("SchemaFormFields", () => {
  const fields = [
    { id: "title", label: "Title", type: "text", required: true, placeholder: "Enter title" },
    { id: "description", label: "Description", type: "textarea", rows: 5 },
    { id: "priority", label: "Priority", type: "select", options: ["low", "high"] },
    { id: "studentInvolved", label: "Student involved", type: "toggle", helpText: "Select if applicable" },
  ] as any;

  it("renders text, textarea, select and toggle fields", () => {
    render(<SchemaFormFields fields={fields} values={{ title: "Existing", priority: "high", studentInvolved: "true" }} onChange={jest.fn()} />);
    expect(screen.getByRole("textbox", { name: /Title/ })).toHaveValue("Existing");
    expect(screen.getByRole("textbox", { name: "Description" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Priority" })).toHaveValue("high");
    expect(screen.getByRole("button", { name: "Student involved" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Select if applicable")).toBeInTheDocument();
  });

  it("reports field and toggle changes to the parent", () => {
    const onChange = jest.fn();
    render(<SchemaFormFields fields={fields} values={{}} onChange={onChange} idPrefix="report" />);
    fireEvent.change(screen.getByRole("textbox", { name: /Title/ }), { target: { value: "New title" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), { target: { value: "Details" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Priority" }), { target: { value: "high" } });
    fireEvent.click(screen.getByRole("button", { name: "Student involved" }));
    expect(onChange).toHaveBeenNthCalledWith(1, "title", "New title");
    expect(onChange).toHaveBeenNthCalledWith(2, "description", "Details");
    expect(onChange).toHaveBeenNthCalledWith(3, "priority", "high");
    expect(onChange).toHaveBeenNthCalledWith(4, "studentInvolved", "true");
  });

  it("returns no markup for an empty field list", () => {
    const { container } = render(<SchemaFormFields fields={[]} values={{}} onChange={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("SignatureField", () => {
  it("shows a disabled signature and prevents edit controls", () => {
    render(<SignatureField label="Dean signature" value="Ada Lovelace" onChange={jest.fn()} disabled />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("You are not authorised to sign this section.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit Dean signature/i })).not.toBeInTheDocument();
  });

  it("allows a user to enter and leave signature editing mode", async () => {
    render(<SignatureField label="Student signature" value="" onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit Student signature/i }));
    expect(screen.getByRole("button", { name: "Done signing" })).toBeInTheDocument();
    expect(screen.getByText("Loading signature pad...")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done signing" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Edit Student signature/i })).toBeInTheDocument());
  });
});

describe("AppDialog hooks", () => {
  function ConfirmHarness({ onResult }: { onResult: (value: boolean) => void }) {
    const { confirm, confirmDialog } = useConfirmDialog();
    return (
      <>
        <button onClick={async () => onResult(await confirm({ title: "Delete record", message: "Confirm deletion", tone: "danger" }))}>Open confirm</button>
        {confirmDialog}
      </>
    );
  }

  function AlertHarness() {
    const { showAlert, alertDialog } = useAlertDialog();
    return (
      <>
        <button onClick={() => showAlert({ title: "Saved", message: "Changes saved", tone: "success" })}>Open alert</button>
        {alertDialog}
      </>
    );
  }

  it("resolves a confirmation promise for cancel and confirm actions", async () => {
    const onResult = jest.fn();
    render(<ConfirmHarness onResult={onResult} />);
    fireEvent.click(screen.getByRole("button", { name: "Open confirm" }));
    expect(screen.getByText("Confirm deletion")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));

    fireEvent.click(screen.getByRole("button", { name: "Open confirm" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  it("opens and closes an alert dialog", () => {
    render(<AlertHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Open alert" }));
    expect(screen.getByText("Changes saved")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByText("Changes saved")).not.toBeInTheDocument();
  });
});

describe("display and work-order utilities", () => {
  it("chooses display names and first names with fallbacks", () => {
    expect(getDisplayFullName("  Ada Lovelace ", "ada")).toBe("Ada Lovelace");
    expect(getDisplayFullName("", "ada")).toBe("ada");
    expect(getDisplayFullName("", "", "Unknown person")).toBe("Unknown person");
    expect(getDisplayFirstName("Ada Lovelace")).toBe("Ada");
    expect(getDisplayFirstName(undefined, "ada.user")).toBe("ada.user");
  });

  it("applies work-order edit permissions by role and labels every part", () => {
    expect(canEditWorkOrderPart("maintenance", "partB")).toBe(true);
    expect(canEditWorkOrderPart("student", "partB")).toBe(false);
    expect(canEditWorkOrderPart(undefined, "partA")).toBe(false);
    expect(canEditWorkOrderPart("admin", "partE")).toBe(true);
    expect(workOrderPartLabel("partA")).toContain("requesting department");
    expect(workOrderPartLabel("partE")).toContain("maintenance officer");
  });
});
