export type PFEnvironment = "sandbox" | "prod";

export type PFAmountType = "deposit" | "full";

export type PFCreateLinkParams = {
  amount: number;
  description: string;
  returnUrl: string;
  reservationId: string;
  paymentId: string;
  customerEmail?: string | null;
  expiresIn?: number;
};

export type PFCreateLinkResponse = {
  success: boolean;
  message?: string;
  data?: {
    url?: string;
    code?: string;
  };
};

export type PFWebhookPayload = {
  date?: string;
  codOper?: string;
  relatedTx?: string;
  operationType?: string;
  status?: number | string;
  authStatus?: string;
  messageSys?: string;
  totalPay?: string | number;
  requestPayAmount?: string | number;
  cardType?: string;
  displayNum?: string;
  cardToken?: string;
  email?: string;
  userName?: string;
  idtx?: number | string;
  inRevision?: boolean;
  merchantDescriptor?: string;
  returnUrl?: string;
  binInfo?: Record<string, unknown>;
  PARM_1?: string;
  PARM_2?: string;
  [key: string]: unknown;
};

export type PFMgmtTransaction = {
  codOper?: string;
  authAmount?: string | number;
  totalPay?: string | number;
  requestPayAmount?: string | number;
  status?: number | string;
  authStatus?: string;
  cardType?: string;
  type?: string;
  email?: string;
  userName?: string;
  name?: string;
  displayNum?: string;
  idMerchant?: string;
  messageSys?: string;
  operationType?: string;
  [key: string]: unknown;
};

export type PFReturnParams = {
  TotalPagado?: string;
  Estado?: string;
  Oper?: string;
  Razon?: string;
  Email?: string;
  PARM_1?: string;
  PARM_2?: string;
  [key: string]: string | undefined;
};
