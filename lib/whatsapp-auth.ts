import type { AppUser } from "@/lib/db";
import { decryptCredential } from "@/lib/credential-crypto";
import { providerMessagingToken, providerModeEnabled } from "@/lib/meta-provider";

export function whatsappApiToken(user: Pick<AppUser, "wa_token">): string | null {
  if (providerModeEnabled()) {
    return providerMessagingToken();
  }
  return decryptCredential(user.wa_token);
}
