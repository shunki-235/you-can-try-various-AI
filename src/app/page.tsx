import { redirect } from "next/navigation";

export default function Home() {
  // ルートパスにアクセスした場合はチャット画面へサーバーサイドでリダイレクトする。
  redirect("/chat");
}


