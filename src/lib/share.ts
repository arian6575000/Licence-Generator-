import { Share } from "react-native";

// Android share sheet (WhatsApp, copy, etc).
export async function shareText(text: string): Promise<void> {
  await Share.share({ message: text });
}
