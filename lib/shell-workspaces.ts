import { APP_ROUTES } from "@/lib/config";

export type ShellWorkspaceId =
  | "order"
  | "receive"
  | "credits"
  | "settings"
  | "configuration";

/** Routes that open as shell drawers from More (stay on Business). */
export const SHELL_WORKSPACE_BY_HREF: Readonly<
  Record<string, ShellWorkspaceId>
> = {
  [APP_ROUTES.order]: "order",
  [APP_ROUTES.orderReceive]: "receive",
  [APP_ROUTES.creditsOnTab]: "credits",
  [APP_ROUTES.businessSettings]: "settings",
  [APP_ROUTES.businessConfiguration]: "configuration",
};
