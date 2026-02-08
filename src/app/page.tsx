import ChatInterface from "@/components/chat-interface";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return <ChatInterface user={session.user} />;
}
