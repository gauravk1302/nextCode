import { Button } from "@/components/ui/button";
import UserButton from "@/modules/auth/components/user-button";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Button className="w-auto">Hello</Button>
      <UserButton></UserButton>
    </div>
  );
}