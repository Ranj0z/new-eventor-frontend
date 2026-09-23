import { createApi } from "@reduxjs/toolkit/query/react";
import { authBaseQuery } from "../../utils/authBaseQuery";

export type TWalletTransactionType = "credit" | "debit";
export type TWithdrawalStatus = "Pending" | "Approved" | "Rejected";

export type TWallet = {
  WalletID: number;
  UserID: number;
  balance: string;
  createdAt: string;
  updatedAt: string;
};

export type TWalletTransaction = {
  TransactionID: number;
  WalletID: number;
  type: TWalletTransactionType;
  amount: string;
  PaymentID: number | null;
  WithdrawalID: number | null;
  description: string | null;
  createdAt: string;
};

export type TWithdrawalRequest = {
  WithdrawalID: number;
  WalletID: number;
  amount: string;
  status: TWithdrawalStatus;
  payoutMethod: string | null;
  payoutReference: string | null;
  requestedAt: string;
  reviewedBy: number | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
};

// Admin's all-wallets listing joins host name/email onto the wallet row —
// see eventor-wallet-frontend-plan.md §1.
export type TAdminWalletRow = TWallet & { hostName: string; hostEmail: string };

export type TPaginationParams = { limit?: number; offset?: number };

export const walletAPI = createApi({
  reducerPath: "walletAPI",
  baseQuery: authBaseQuery(),
  tagTypes: ["Wallet", "WalletTransactions", "Withdrawals"],
  endpoints: (builder) => ({
    // --- host ---
    getWalletBalance: builder.query<TWallet, void>({
      query: () => "/wallet/balance",
      providesTags: ["Wallet"],
    }),
    getWalletTransactions: builder.query<TWalletTransaction[], TPaginationParams | void>({
      query: (params) => ({ url: "/wallet/transactions", params: params ?? undefined }),
      providesTags: ["WalletTransactions"],
    }),
    requestWithdrawal: builder.mutation<TWithdrawalRequest, { amount: number }>({
      query: (body) => ({
        url: "/wallet/withdrawals",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Wallet", "Withdrawals"],
    }),
    getMyWithdrawals: builder.query<TWithdrawalRequest[], void>({
      query: () => "/wallet/withdrawals",
      providesTags: ["Withdrawals"],
    }),

    // --- admin ---
    getAllWithdrawals: builder.query<TWithdrawalRequest[], { status?: TWithdrawalStatus } | void>({
      query: (params) => ({ url: "/admin/withdrawals", params: params ?? undefined }),
      providesTags: ["Withdrawals"],
    }),
    reviewWithdrawal: builder.mutation<
      TWithdrawalRequest,
      {
        withdrawalId: number;
        decision: "Approved" | "Rejected";
        payoutMethod?: string;
        payoutReference?: string;
        rejectionReason?: string;
      }
    >({
      query: ({ withdrawalId, ...body }) => ({
        url: `/admin/withdrawals/${withdrawalId}`,
        method: "PATCH",
        body,
      }),
      // Balance only actually changes on approval, but invalidating Wallet
      // unconditionally is simpler than branching on `decision` here and
      // costs one extra (cheap, cached) refetch on rejection.
      invalidatesTags: ["Withdrawals", "Wallet"],
    }),
    getAllWallets: builder.query<
      TAdminWalletRow[],
      (TPaginationParams & { sortBy?: "balance" | "createdAt"; sortOrder?: "asc" | "desc" }) | void
    >({
      query: (params) => ({ url: "/admin/wallets", params: params ?? undefined }),
      providesTags: ["Wallet"],
    }),
    getWalletLedgerByAdmin: builder.query<TWalletTransaction[], { walletId: number } & TPaginationParams>({
      query: ({ walletId, ...params }) => ({
        url: `/admin/wallets/${walletId}/transactions`,
        params,
      }),
      providesTags: ["WalletTransactions"],
    }),
  }),
});

export const {
  useGetWalletBalanceQuery,
  useGetWalletTransactionsQuery,
  useRequestWithdrawalMutation,
  useGetMyWithdrawalsQuery,
  useGetAllWithdrawalsQuery,
  useReviewWithdrawalMutation,
  useGetAllWalletsQuery,
  useGetWalletLedgerByAdminQuery,
} = walletAPI;
