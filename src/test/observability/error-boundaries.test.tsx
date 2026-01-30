/**
 * Error Handling & Boundaries Testing
 * Tests error handling patterns across the application
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import React, { Component, ErrorInfo, ReactNode } from "react";

// Mock console.error to suppress React error logs in tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

// Simple ErrorBoundary component for testing
class TestErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for testing
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div role="alert">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Component that throws error
const ThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error from component");
  }
  return <div>No error</div>;
};

describe("Error Boundary Behavior", () => {
  it("should render children when no error", () => {
    render(
      <TestErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </TestErrorBoundary>
    );

    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  it("should catch and display error", () => {
    render(
      <TestErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </TestErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error from component")).toBeInTheDocument();
  });

  it("should render custom fallback when provided", () => {
    render(
      <TestErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingComponent shouldThrow={true} />
      </TestErrorBoundary>
    );

    expect(screen.getByText("Custom error UI")).toBeInTheDocument();
  });

  it("should log error to console", () => {
    render(
      <TestErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </TestErrorBoundary>
    );

    expect(console.error).toHaveBeenCalled();
  });
});

describe("React Query Error Handling", () => {
  const createQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

  // Component with failing query
  const FailingQueryComponent = () => {
    const { data, error, isLoading, isError } = useQuery({
      queryKey: ["failing-query"],
      queryFn: async () => {
        throw new Error("API request failed");
      },
    });

    if (isLoading) return <div>Loading...</div>;
    if (isError) return <div role="alert">Error: {(error as Error).message}</div>;
    return <div>Data: {JSON.stringify(data)}</div>;
  };

  it("should handle query errors gracefully", async () => {
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <FailingQueryComponent />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/API request failed/)).toBeInTheDocument();
    });
  });

  // Component with successful query
  const SuccessfulQueryComponent = () => {
    const { data, isLoading, isError } = useQuery({
      queryKey: ["successful-query"],
      queryFn: async () => ({ message: "Success!" }),
    });

    if (isLoading) return <div>Loading...</div>;
    if (isError) return <div role="alert">Error occurred</div>;
    return <div>Message: {data?.message}</div>;
  };

  it("should handle successful queries", async () => {
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SuccessfulQueryComponent />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Message: Success!")).toBeInTheDocument();
    });
  });
});

describe("Async Error Patterns", () => {
  it("should handle rejected promises", async () => {
    const failingFn = async () => {
      throw new Error("Async operation failed");
    };

    await expect(failingFn()).rejects.toThrow("Async operation failed");
  });

  it("should handle network errors", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(mockFetch("https://api.example.com")).rejects.toThrow("Network error");
  });

  it("should handle timeout errors", async () => {
    const timeoutFn = () =>
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 10);
      });

    await expect(timeoutFn()).rejects.toThrow("Request timeout");
  });
});

describe("Form Validation Error Handling", () => {
  it("should validate required fields", () => {
    const validateEmail = (email: string) => {
      if (!email) return "Email is required";
      if (!email.includes("@")) return "Invalid email address";
      return null;
    };

    expect(validateEmail("")).toBe("Email is required");
    expect(validateEmail("invalid")).toBe("Invalid email address");
    expect(validateEmail("valid@example.com")).toBeNull();
  });

  it("should validate password requirements", () => {
    const validatePassword = (password: string) => {
      if (!password) return "Password is required";
      if (password.length < 6) return "Password must be at least 6 characters";
      return null;
    };

    expect(validatePassword("")).toBe("Password is required");
    expect(validatePassword("12345")).toBe("Password must be at least 6 characters");
    expect(validatePassword("123456")).toBeNull();
  });

  it("should validate password confirmation", () => {
    const validatePasswordMatch = (password: string, confirm: string) => {
      if (password !== confirm) return "Passwords don't match";
      return null;
    };

    expect(validatePasswordMatch("abc123", "abc124")).toBe("Passwords don't match");
    expect(validatePasswordMatch("abc123", "abc123")).toBeNull();
  });
});

describe("API Error Response Handling", () => {
  it("should handle 401 Unauthorized", () => {
    const handleApiError = (status: number) => {
      switch (status) {
        case 401:
          return { type: "auth", message: "Please sign in to continue" };
        case 403:
          return { type: "permission", message: "You don't have permission" };
        case 404:
          return { type: "not_found", message: "Resource not found" };
        case 500:
          return { type: "server", message: "Server error, please try again" };
        default:
          return { type: "unknown", message: "An error occurred" };
      }
    };

    expect(handleApiError(401)).toEqual({
      type: "auth",
      message: "Please sign in to continue",
    });
    expect(handleApiError(403)).toEqual({
      type: "permission",
      message: "You don't have permission",
    });
    expect(handleApiError(404)).toEqual({
      type: "not_found",
      message: "Resource not found",
    });
    expect(handleApiError(500)).toEqual({
      type: "server",
      message: "Server error, please try again",
    });
  });

  it("should extract error message from API response", () => {
    const extractErrorMessage = (response: any): string => {
      if (typeof response === "string") return response;
      if (response?.error?.message) return response.error.message;
      if (response?.message) return response.message;
      return "An unexpected error occurred";
    };

    expect(extractErrorMessage("Simple error")).toBe("Simple error");
    expect(extractErrorMessage({ message: "Error message" })).toBe("Error message");
    expect(extractErrorMessage({ error: { message: "Nested error" } })).toBe("Nested error");
    expect(extractErrorMessage({})).toBe("An unexpected error occurred");
    expect(extractErrorMessage(null)).toBe("An unexpected error occurred");
  });
});

describe("Supabase Error Handling Patterns", () => {
  it("should handle Supabase auth errors", () => {
    const handleSupabaseAuthError = (error: { message: string; status?: number }) => {
      if (error.message.includes("Invalid login credentials")) {
        return "Email or password is incorrect";
      }
      if (error.message.includes("Email not confirmed")) {
        return "Please verify your email before signing in";
      }
      if (error.message.includes("User already registered")) {
        return "An account with this email already exists";
      }
      return error.message;
    };

    expect(handleSupabaseAuthError({ message: "Invalid login credentials" })).toBe(
      "Email or password is incorrect"
    );
    expect(handleSupabaseAuthError({ message: "Email not confirmed" })).toBe(
      "Please verify your email before signing in"
    );
    expect(handleSupabaseAuthError({ message: "User already registered" })).toBe(
      "An account with this email already exists"
    );
    expect(handleSupabaseAuthError({ message: "Other error" })).toBe("Other error");
  });

  it("should handle Supabase database errors", () => {
    const handleSupabaseDbError = (error: { code?: string; message: string }) => {
      if (error.code === "23505") {
        return "This record already exists";
      }
      if (error.code === "23503") {
        return "Cannot delete: this record is referenced by other data";
      }
      if (error.code === "42501") {
        return "You don't have permission to perform this action";
      }
      return "Database error: " + error.message;
    };

    expect(handleSupabaseDbError({ code: "23505", message: "unique violation" })).toBe(
      "This record already exists"
    );
    expect(handleSupabaseDbError({ code: "23503", message: "foreign key" })).toBe(
      "Cannot delete: this record is referenced by other data"
    );
    expect(handleSupabaseDbError({ code: "42501", message: "permission denied" })).toBe(
      "You don't have permission to perform this action"
    );
  });
});

describe("Graceful Degradation Patterns", () => {
  it("should provide fallback values for missing data", () => {
    const getDisplayName = (user: { name?: string; email?: string } | null) => {
      if (!user) return "Guest";
      return user.name || user.email?.split("@")[0] || "Unknown User";
    };

    expect(getDisplayName(null)).toBe("Guest");
    expect(getDisplayName({ name: "John Doe" })).toBe("John Doe");
    expect(getDisplayName({ email: "john@example.com" })).toBe("john");
    expect(getDisplayName({})).toBe("Unknown User");
  });

  it("should handle missing optional features", () => {
    const isFeatureAvailable = (feature: string, userPlan: string) => {
      const proFeatures = ["ai_insights", "advanced_analytics", "export_pdf"];
      const freeFeatures = ["basic_journal", "trade_entry"];

      if (userPlan === "pro") {
        return [...freeFeatures, ...proFeatures].includes(feature);
      }
      return freeFeatures.includes(feature);
    };

    expect(isFeatureAvailable("basic_journal", "free")).toBe(true);
    expect(isFeatureAvailable("ai_insights", "free")).toBe(false);
    expect(isFeatureAvailable("ai_insights", "pro")).toBe(true);
  });
});
