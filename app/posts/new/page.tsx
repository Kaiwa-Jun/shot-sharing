import { redirect } from "next/navigation";

export default async function NewPostPage() {
  // モーダルに移行したため、トップページにリダイレクト
  redirect("/");
}
