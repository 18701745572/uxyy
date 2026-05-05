import { authHandlers } from "./auth";
import { crmHandlers } from "./crm";

export const handlers = [...authHandlers, ...crmHandlers];
