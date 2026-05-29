
import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"
import Image from "next/image"

const AddRepo = () => {
  return (
    <div
  className="group flex items-center justify-between rounded-lg border bg-muted px-6 py-6 cursor-pointer transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-[#30AF5B] hover:bg-[#30AF5B]/5 shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-[0_0_50px_rgba(48,175,91,0.4)]"
>
  <div className="flex items-start gap-4">
    <Button
      variant="outline"
      size="icon"
      className="bg-white transition-colors duration-300 group-hover:border-[#30AF5B] group-hover:bg-[#f5fff8] group-hover:text-[#30AF5B]"
    >
      <ArrowDown
        size={30}
        className="transition-transform duration-300 group-hover:translate-y-1"
      />
    </Button>

    <div>
      <h1 className="text-xl font-bold text-[#30AF5B]">
        Open GitHub Repository
      </h1>

      <p className="max-w-[220px] text-sm text-muted-foreground">
        Work with your repositories in our editor
      </p>
    </div>
  </div>

  <div className="relative overflow-hidden">
    <Image
      src="/github.svg"
      alt="Open GitHub repository"
      width={150}
      height={150}
      className="transition-transform duration-300 group-hover:scale-110"
    />
  </div>
</div>
  )
}

export default AddRepo


