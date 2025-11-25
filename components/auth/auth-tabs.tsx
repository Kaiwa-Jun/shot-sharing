"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";

interface AuthTabsProps {
  activeTab?: "login" | "signup";
  onTabChange?: (tab: "login" | "signup") => void;
  onClose?: () => void;
  redirectPath?: string;
  className?: string;
  onTermsClick?: () => void;
  onPrivacyClick?: () => void;
}

export function AuthTabs({
  activeTab = "login",
  onTabChange,
  onClose,
  redirectPath,
  className,
  onTermsClick,
  onPrivacyClick,
}: AuthTabsProps) {
  const handleTabChange = (value: string) => {
    console.log("🔍 [AuthTabs] Tab changed:", {
      from: activeTab,
      to: value,
    });
    onTabChange?.(value as "login" | "signup");
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className={className}
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">ログイン</TabsTrigger>
        <TabsTrigger value="signup">新規登録</TabsTrigger>
      </TabsList>

      <TabsContent value="login" className="mt-6">
        <LoginForm onClose={onClose} redirectPath={redirectPath} />
      </TabsContent>

      <TabsContent value="signup" className="mt-6">
        <SignupForm
          onClose={onClose}
          redirectPath={redirectPath}
          onTermsClick={onTermsClick}
          onPrivacyClick={onPrivacyClick}
        />
      </TabsContent>
    </Tabs>
  );
}
