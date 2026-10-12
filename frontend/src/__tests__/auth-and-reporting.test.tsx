import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginView from "../components/LoginView";
import ProtectedRoute from "../app/(protected)/ProtectedRoute";
import RoleProtectedRoute from "../app/(protected)/RoleProtectedRoute";
import MakeReportPage from "../app/make-report/page";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { createStudentReport } from "../utils/studentReports";
import { getProfile } from "../utils/api";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../context/ThemeContext", () => ({
  useTheme: jest.fn(),
}));

jest.mock("../utils/api", () => ({
  getProfile: jest.fn(),
}));

jest.mock("../utils/studentReports", () => ({
  createStudentReport: jest.fn(),
}));

jest.mock("../utils/guidedReportBridge", () => ({
  subscribeGuidedApply: jest.fn(() => () => undefined),
}));

jest.mock("../utils/applyGuidedReportFields", () => ({
  applyGuidedFieldsToMakeReport: jest.fn(),
}));

jest.mock("../utils/dateTimeDefaults", () => ({
  getTodayDateInputValue: jest.fn(() => "2026-09-04"),
}));

jest.mock("../components/CampusBackground", () => () => <div data-testid="campus-background" />);
jest.mock("../components/PageSkeleton", () => ({ PageSkeleton: () => <div data-testid="page-skeleton" /> }));
jest.mock("@/components/icons", () => {
  const Icon = () => null;
  return {
    AlertTriangle: Icon,
    Camera: Icon,
    CheckCircle2: Icon,
    ChevronDown: Icon,
    Eye: Icon,
    EyeOff: Icon,
    FilePenLine: Icon,
    Globe: Icon,
    Ghost: Icon,
    Heart: Icon,
    Lock: Icon,
    Megaphone: Icon,
    Moon: Icon,
    Paperclip: Icon,
    ShieldAlert: Icon,
    ShieldCheck: Icon,
    Sun: Icon,
    TrendingUp: Icon,
    Users: Icon,
    Wrench: Icon,
    X: Icon,
  };
}, { virtual: true });

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseTheme = useTheme as jest.Mock;
const mockedCreateStudentReport = createStudentReport as jest.Mock;
const mockedGetProfile = getProfile as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseTheme.mockReturnValue({ theme: "light", toggleTheme: jest.fn() });
  mockedUseAuth.mockReturnValue({
    user: null,
    token: null,
    login: jest.fn(),
    loginOffline: jest.fn(),
    isOnline: true,
    loading: false,
  });
  mockedGetProfile.mockResolvedValue({});
});

describe("LoginView", () => {
  it("shows a clear Google sign-in loading state before the native control is ready", () => {
    const previousGoogleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-google-client";

    try {
      render(<LoginView />);
      expect(screen.getByRole("status")).toHaveTextContent("Preparing Google sign-in…");
    } finally {
      if (previousGoogleClientId === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      else process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = previousGoogleClientId;
    }
  });

  it("submits credentials through the auth context and redirects on success", async () => {
    const login = jest.fn().mockResolvedValue(true);
    const replace = jest.fn();
    jest.requireMock("next/navigation").useRouter = () => ({ replace, push: jest.fn() });
    mockedUseAuth.mockReturnValue({
      user: null,
      token: null,
      login,
      loginOffline: jest.fn(),
      isOnline: true,
      loading: false,
    });

    render(<LoginView />);
    fireEvent.change(screen.getByPlaceholderText("Email address or Student ID"), {
      target: { value: "student-001" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "correct-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log In" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("student-001", "correct-password");
    });
  });

  it("shows the authentication error when login fails", async () => {
    const login = jest.fn().mockResolvedValue(false);
    mockedUseAuth.mockReturnValue({
      user: null,
      token: null,
      login,
      loginOffline: jest.fn(),
      isOnline: true,
      loading: false,
    });

    render(<LoginView />);
    fireEvent.change(screen.getByPlaceholderText("Email address or Student ID"), {
      target: { value: "unknown" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log In" }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials|login failed/i)).toBeInTheDocument();
    });
  });
});

describe("ProtectedRoute", () => {
  it("renders a loading skeleton while authentication is being checked", () => {
    mockedUseAuth.mockReturnValue({ token: null, user: null, loading: true });
    render(<ProtectedRoute><div>Private content</div></ProtectedRoute>);
    expect(screen.getByTestId("page-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users and renders authenticated content", () => {
    const replace = jest.fn();
    jest.requireMock("next/navigation").useRouter = () => ({ replace, push: jest.fn() });
    mockedUseAuth.mockReturnValue({ token: null, user: null, loading: false });
    const { rerender } = render(<ProtectedRoute><div>Private content</div></ProtectedRoute>);
    expect(replace).toHaveBeenCalledWith("/login");

    mockedUseAuth.mockReturnValue({ token: "token", user: { role: "student" }, loading: false });
    rerender(<ProtectedRoute><div>Private content</div></ProtectedRoute>);
    expect(screen.getByText("Private content")).toBeInTheDocument();
  });
});

describe("RoleProtectedRoute", () => {
  it("denies users who do not have access to the requested page", () => {
    const replace = jest.fn();
    jest.requireMock("next/navigation").useRouter = () => ({ replace, push: jest.fn() });
    mockedUseAuth.mockReturnValue({
      token: "token",
      user: { role: "student" },
      loading: false,
    });

    render(
      <RoleProtectedRoute pageKey="adminUsers" deniedRedirect="/student-dashboard">
        <div>Admin content</div>
      </RoleProtectedRoute>,
    );

    expect(screen.getByText("Access denied.")).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/student-dashboard");
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
  });
});

describe("MakeReportPage", () => {
  it("submits the required report fields for an authenticated student", async () => {
    mockedUseAuth.mockReturnValue({
      token: "token",
      user: { id: "student-1", username: "student.one", name: "Student One", role: "student" },
      loading: false,
    });
    mockedCreateStudentReport.mockResolvedValue({ trackingCode: "TRACK-001" });

    render(<MakeReportPage />);
    fireEvent.change(screen.getByLabelText("Report Title"), {
      target: { value: "Broken classroom light" },
    });
    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "Block A, Room 101" },
    });
    fireEvent.change(screen.getByLabelText("Full Description"), {
      target: { value: "The main light is not working." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Report" }));

    await waitFor(() => {
      expect(mockedCreateStudentReport).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Broken classroom light",
          location: "Block A, Room 101",
          description: "The main light is not working.",
          studentInvolved: true,
          attachments: [],
        }),
        expect.objectContaining({ id: "student-1", username: "student.one" }),
      );
    });
    expect(await screen.findByText("Report Submitted")).toBeInTheDocument();
    expect(screen.getByText("TRACK-001")).toBeInTheDocument();
  });
});
