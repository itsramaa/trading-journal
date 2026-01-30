/**
 * Auth Flow E2E Tests
 * Tests complete authentication user journeys
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock auth functions
const mockSignIn = vi.fn().mockResolvedValue({ error: null });
const mockSignUp = vi.fn().mockResolvedValue({ error: null });
const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockResetPassword = vi.fn().mockResolvedValue({ error: null });
const mockUpdatePassword = vi.fn().mockResolvedValue({ error: null });
const mockSignInWithGoogle = vi.fn().mockResolvedValue({ error: null });

let mockIsAuthenticated = false;

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: mockSignOut,
    resetPassword: mockResetPassword,
    updatePassword: mockUpdatePassword,
    signInWithGoogle: mockSignInWithGoogle,
    isAuthenticated: mockIsAuthenticated,
    loading: false,
    user: mockIsAuthenticated ? { id: "user-1", email: "test@example.com" } : null,
  }),
}));

// Import after mocks
import Auth from "@/pages/Auth";

describe("E2E: Authentication Flow", () => {
  let queryClient: QueryClient;

  const renderAuth = (initialEntries = ["/auth"]) => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <Auth />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = false;
  });

  describe("Sign In Flow", () => {
    it("should render sign in form by default", () => {
      renderAuth();
      
      expect(screen.getByText("Welcome")).toBeInTheDocument();
      expect(screen.getByText("Sign in to your account or create a new one")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /sign up/i })).toBeInTheDocument();
    });

    it("should show validation errors for empty form submission", async () => {
      const user = userEvent.setup();
      renderAuth();
      
      // Find and click sign in button without filling form
      const signInButton = screen.getByRole("button", { name: /^sign in$/i });
      await user.click(signInButton);

      // Wait for validation messages
      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it("should submit valid credentials", async () => {
      const user = userEvent.setup();
      renderAuth();
      
      // Fill in credentials
      const emailInput = screen.getByPlaceholderText("you@example.com");
      const passwordInput = screen.getByPlaceholderText("••••••••");
      
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      // Submit form
      const signInButton = screen.getByRole("button", { name: /^sign in$/i });
      await user.click(signInButton);

      // Verify signIn was called with correct arguments
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
      });
    });

    it("should show Google sign in option", () => {
      renderAuth();
      
      expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    });

    it("should trigger Google sign in", async () => {
      const user = userEvent.setup();
      renderAuth();
      
      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      await user.click(googleButton);

      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });
  });

  describe("Sign Up Flow", () => {
    it("should switch to sign up tab", async () => {
      const user = userEvent.setup();
      renderAuth();
      
      const signUpTab = screen.getByRole("tab", { name: /sign up/i });
      await user.click(signUpTab);

      // Should show additional fields
      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });
    });

    it("should validate password confirmation", async () => {
      const user = userEvent.setup();
      renderAuth();
      
      // Switch to sign up
      const signUpTab = screen.getByRole("tab", { name: /sign up/i });
      await user.click(signUpTab);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      // Fill form with mismatched passwords
      await user.type(screen.getByLabelText(/full name/i), "Test User");
      
      const emailInputs = screen.getAllByPlaceholderText("you@example.com");
      await user.type(emailInputs[emailInputs.length - 1], "test@example.com");
      
      const passwordInputs = screen.getAllByPlaceholderText("••••••••");
      await user.type(passwordInputs[passwordInputs.length - 2], "password123");
      await user.type(passwordInputs[passwordInputs.length - 1], "different");

      // Submit
      const signUpButton = screen.getByRole("button", { name: /create account/i });
      await user.click(signUpButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });

    it("should submit valid sign up", async () => {
      const user = userEvent.setup();
      renderAuth();
      
      // Switch to sign up
      const signUpTab = screen.getByRole("tab", { name: /sign up/i });
      await user.click(signUpTab);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      // Fill form
      await user.type(screen.getByLabelText(/full name/i), "Test User");
      
      const emailInputs = screen.getAllByPlaceholderText("you@example.com");
      await user.type(emailInputs[emailInputs.length - 1], "newuser@example.com");
      
      const passwordInputs = screen.getAllByPlaceholderText("••••••••");
      await user.type(passwordInputs[passwordInputs.length - 2], "password123");
      await user.type(passwordInputs[passwordInputs.length - 1], "password123");

      // Submit
      const signUpButton = screen.getByRole("button", { name: /create account/i });
      await user.click(signUpButton);

      // Verify signUp was called
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith("newuser@example.com", "password123", "Test User");
      });
    });
  });

  describe("Forgot Password Flow", () => {
    it("should navigate to forgot password", async () => {
      const user = userEvent.setup();
      renderAuth();
      
      const forgotLink = screen.getByRole("button", { name: /forgot password/i });
      await user.click(forgotLink);

      await waitFor(() => {
        expect(screen.getByText("Reset Password")).toBeInTheDocument();
        expect(screen.getByText("Enter your email to receive a password reset link")).toBeInTheDocument();
      });
    });

    it("should submit reset password request", async () => {
      const user = userEvent.setup();
      renderAuth();
      
      // Navigate to forgot password
      const forgotLink = screen.getByRole("button", { name: /forgot password/i });
      await user.click(forgotLink);

      await waitFor(() => {
        expect(screen.getByText("Reset Password")).toBeInTheDocument();
      });

      // Fill email
      const emailInput = screen.getByPlaceholderText("you@example.com");
      await user.type(emailInput, "reset@example.com");

      // Submit
      const sendButton = screen.getByRole("button", { name: /send reset link/i });
      await user.click(sendButton);

      // Verify reset was called
      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith("reset@example.com");
      });
    });

    it("should allow navigation back to sign in", async () => {
      const user = userEvent.setup();
      renderAuth();
      
      // Navigate to forgot password
      const forgotLink = screen.getByRole("button", { name: /forgot password/i });
      await user.click(forgotLink);

      await waitFor(() => {
        expect(screen.getByText("Reset Password")).toBeInTheDocument();
      });

      // Click back
      const backButton = screen.getByRole("button", { name: /back to sign in/i });
      await user.click(backButton);

      // Should show sign in form again
      await waitFor(() => {
        expect(screen.getByText("Welcome")).toBeInTheDocument();
      });
    });
  });

  describe("Password Recovery Mode", () => {
    it("should show new password form in recovery mode", () => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter initialEntries={["/auth?type=recovery"]}>
            <Auth />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText("Set New Password")).toBeInTheDocument();
      expect(screen.getByText("Enter your new password below")).toBeInTheDocument();
    });

    it("should validate password match in recovery", async () => {
      const user = userEvent.setup();
      render(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter initialEntries={["/auth?type=recovery"]}>
            <Auth />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const passwordInputs = screen.getAllByPlaceholderText("••••••••");
      await user.type(passwordInputs[0], "newpassword123");
      await user.type(passwordInputs[1], "different");

      const updateButton = screen.getByRole("button", { name: /update password/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });

    it("should submit new password", async () => {
      const user = userEvent.setup();
      render(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter initialEntries={["/auth?type=recovery"]}>
            <Auth />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const passwordInputs = screen.getAllByPlaceholderText("••••••••");
      await user.type(passwordInputs[0], "newpassword123");
      await user.type(passwordInputs[1], "newpassword123");

      const updateButton = screen.getByRole("button", { name: /update password/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockUpdatePassword).toHaveBeenCalledWith("newpassword123");
      });
    });
  });

  describe("UI State", () => {
    it("should have accessible form labels", () => {
      renderAuth();
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });
  });
});
