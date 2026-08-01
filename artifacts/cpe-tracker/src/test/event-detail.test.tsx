import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventDetail from "@/pages/event-detail";

// ─── Mocks ──────────────────────────────────────────────────────────────────

// wouter
vi.mock("wouter", () => ({
  useParams: () => ({ id: "1" }),
}));

// react-query client
const invalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

// toast
const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));

// ── Spy handles for mutation fns ──────────────────────────────────────────
const checkInMutate = vi.fn();
const createMemberMutate = vi.fn();

// ── Default data ──────────────────────────────────────────────────────────
const defaultEvent = {
  id: 1,
  name: "Test Event",
  date: "2026-08-01T00:00:00.000Z",
  groupType: "Group A",
  cpeCredits: 1.5,
  attendeeCount: 0,
  description: "A test event",
};

const defaultMembers = [
  { id: 42, firstName: "Jane", lastName: "Doe", isc2Number: "ISC-001" },
  { id: 43, firstName: "John", lastName: "Smith", isc2Number: "ISC-002" },
];

// ── Spyable hook implementations ──────────────────────────────────────────
// These are assigned to vi.fn() so individual tests can override them with
// mockReturnValueOnce / mockImplementationOnce.

const mockUseGetEvent = vi.fn((_id: unknown, _opts: unknown) => ({
  data: defaultEvent,
  isLoading: false,
}));

const mockUseListEventAttendees = vi.fn((_id: unknown, _opts: unknown) => ({
  data: [] as any[],
  isLoading: false,
}));

const mockUseListMembers = vi.fn(
  (_params: unknown, opts: { query: { enabled: boolean } }) => ({
    data: opts.query.enabled ? defaultMembers : [],
    isLoading: false,
  })
);

vi.mock("@workspace/api-client-react", () => ({
  getGetEventQueryKey: (id: number) => ["event", id],
  getListEventAttendeesQueryKey: (id: number) => ["attendees", id],
  getListMembersQueryKey: (params: unknown) => ["members", params],

  useGetEvent: (id: number, opts: unknown) => mockUseGetEvent(id, opts),
  useListEventAttendees: (id: number, opts: unknown) => mockUseListEventAttendees(id, opts),
  useListMembers: (params: unknown, opts: { query: { enabled: boolean } }) =>
    mockUseListMembers(params, opts),

  useCheckInAttendee: ({ mutation }: { mutation: { onSuccess: () => void } }) => {
    checkInMutate.mockImplementation(() => mutation.onSuccess());
    return { mutate: checkInMutate, isPending: false };
  },
  useRemoveAttendee: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateMember: ({
    mutation,
  }: {
    mutation: { onSuccess: (data: { id: number }) => void };
  }) => {
    createMemberMutate.mockImplementation(() =>
      mutation.onSuccess({ id: 99 })
    );
    return { mutate: createMemberMutate, isPending: false };
  },
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("EventDetail – existing-member check-in", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the search input", () => {
    render(<EventDetail />);
    expect(screen.getByTestId("input-search-checkin")).toBeInTheDocument();
  });

  it("shows search results after typing in the search box", async () => {
    const user = userEvent.setup();
    render(<EventDetail />);

    await user.type(screen.getByTestId("input-search-checkin"), "Jane");

    // Component debounces 300ms; waitFor retries until results appear
    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });
  });

  it("each search result row has min-h-[44px] (mobile tap target)", async () => {
    const user = userEvent.setup();
    render(<EventDetail />);

    await user.type(screen.getByTestId("input-search-checkin"), "Jane");

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    // Each result row carries min-h-[44px] for mobile tap-target compliance
    const janeRow = screen.getByText("Jane Doe").closest("div.flex");
    expect(janeRow).toHaveClass("min-h-[44px]");
  });

  it("calls checkIn.mutate with the correct memberId when Check In is clicked", async () => {
    const user = userEvent.setup();
    render(<EventDetail />);

    await user.type(screen.getByTestId("input-search-checkin"), "Jane");

    await waitFor(() => {
      expect(screen.getByTestId("button-checkin-member-42")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("button-checkin-member-42"));
    expect(checkInMutate).toHaveBeenCalledWith({ id: 1, data: { memberId: 42 } });
  });
});

describe("EventDetail – new-member form", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders all three new-member inputs", () => {
    render(<EventDetail />);
    expect(screen.getByTestId("input-new-first-name")).toBeInTheDocument();
    expect(screen.getByTestId("input-new-last-name")).toBeInTheDocument();
    expect(screen.getByTestId("input-new-isc2-number")).toBeInTheDocument();
  });

  it("does not submit when fields are empty", async () => {
    const user = userEvent.setup();
    render(<EventDetail />);

    await user.click(screen.getByTestId("button-create-checkin"));
    expect(createMemberMutate).not.toHaveBeenCalled();
  });

  it("calls createMember.mutate with all three fields when the form is filled and submitted", async () => {
    const user = userEvent.setup();
    render(<EventDetail />);

    await user.type(screen.getByTestId("input-new-first-name"), "Alice");
    await user.type(screen.getByTestId("input-new-last-name"), "Wang");
    await user.type(screen.getByTestId("input-new-isc2-number"), "ISC-999");

    await user.click(screen.getByTestId("button-create-checkin"));

    expect(createMemberMutate).toHaveBeenCalledWith({
      data: { firstName: "Alice", lastName: "Wang", isc2Number: "ISC-999" },
    });
  });

  it("chains check-in after member creation", async () => {
    const user = userEvent.setup();
    render(<EventDetail />);

    await user.type(screen.getByTestId("input-new-first-name"), "Bob");
    await user.type(screen.getByTestId("input-new-last-name"), "Lee");
    await user.type(screen.getByTestId("input-new-isc2-number"), "ISC-888");

    await user.click(screen.getByTestId("button-create-checkin"));

    // createMember onSuccess immediately calls checkIn.mutate with returned id (99)
    await waitFor(() => {
      expect(checkInMutate).toHaveBeenCalledWith({ id: 1, data: { memberId: 99 } });
    });
  });
});

describe("EventDetail – name grid at small viewport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("first-name and last-name inputs share a single grid container", () => {
    render(<EventDetail />);

    const firstWrapper = screen
      .getByTestId("input-new-first-name")
      .closest(".space-y-2")?.parentElement;
    const lastWrapper = screen
      .getByTestId("input-new-last-name")
      .closest(".space-y-2")?.parentElement;

    expect(firstWrapper).toBe(lastWrapper);
    expect(firstWrapper).toHaveClass("grid");
  });

  it("name grid declares grid-cols-1 (mobile-first single column)", () => {
    render(<EventDetail />);

    const grid = screen
      .getByTestId("input-new-first-name")
      .closest(".space-y-2")?.parentElement;

    expect(grid).toHaveClass("grid-cols-1");
  });

  it("name grid declares sm:grid-cols-2 (two columns at sm+ breakpoint)", () => {
    render(<EventDetail />);

    const grid = screen
      .getByTestId("input-new-first-name")
      .closest(".space-y-2")?.parentElement;

    expect(grid).toHaveClass("sm:grid-cols-2");
  });

  it("mobile attendee rows are rendered inside the sm:hidden container", () => {
    const attendees = [
      {
        memberId: 10,
        firstName: "Test",
        lastName: "User",
        isc2Number: "ISC-010",
        checkedInAt: "2026-08-01T12:00:00.000Z",
      },
    ];

    // Override the attendees query for this single render
    mockUseListEventAttendees.mockReturnValueOnce({
      data: attendees,
      isLoading: false,
    });

    render(<EventDetail />);

    // The mobile list container carries sm:hidden
    const mobileList = document.querySelector(".sm\\:hidden");
    expect(mobileList).toBeInTheDocument();

    // The attendee row exists inside it
    const row = within(mobileList as HTMLElement).getByTestId("row-attendee-10");
    expect(row).toBeInTheDocument();
  });
});
