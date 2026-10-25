import { Platform, Share } from "react-native";

// Web/exe: copy to clipboard. Android: open the share sheet (WhatsApp, copy, etc).
export async function shareText(text: string): Promise<"copied" | "shared"> {
  if (Platform.OS === "web") {
    await navigator.clipboard.writeText(text);
    return "copied";
  }
  await Share.share({ message: text });
  return "shared";
}
