
"use client";

import { Button } from "@/components/ui/button"
// import { createPlayground } from "@/features/playground/actions";
import { Plus } from 'lucide-react'
import Image from "next/image"
import { useRouter } from "next/navigation";
import { useState } from "react"
import { toast } from "sonner";
import TemplateSelectingModal from "./template-selecting-modal";
import { createPlayground } from "../actions";

const AddNewButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
 const [selectedTemplate, setSelectedTemplate] = useState<{
    title: string;
    template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
    description?: string;
  } | null>(null)
  const router = useRouter()


  const handleSubmit = async (data:{
      title: string;
    template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
    description?: string;
  })=>{
    setSelectedTemplate(data)

    const res = await createPlayground(data);
    toast.success("Playground Created successfully"
      
    )
    setIsModalOpen(false)
    router.push(`/playground/${res?.id}`)
  }


  return (
    <>
     <div
  onClick={() => setIsModalOpen(true)}
  className="group flex items-center justify-between rounded-lg border bg-muted px-6 py-6 cursor-pointer transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-[#30AF5B] hover:bg-[#30AF5B]/5 shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-[0_0_50px_rgba(48,175,91,0.4)]"
>
  <div className="flex items-start gap-4">
    <Button
      variant="outline"
      size="icon"
      className="bg-white transition-colors duration-300 group-hover:border-[#30AF5B] group-hover:bg-[#f5fff8] group-hover:text-[#30AF5B]"
    >
      <Plus
        size={30}
        className="transition-transform duration-300 group-hover:rotate-90"
      />
    </Button>

    <div>
      <h1 className="text-xl font-bold text-[#30AF5B]">
        Add New
      </h1>

      <p className="max-w-[220px] text-sm text-muted-foreground">
        Create a new playground
      </p>
    </div>
  </div>

  <div className="relative overflow-hidden">
    <Image
      src="/add-new.svg"
      alt="Create new playground"
      width={150}
      height={150}
      className="transition-transform duration-300 group-hover:scale-110"
    />
  </div>
</div>
      <TemplateSelectingModal
      isOpen={isModalOpen}
      onClose={()=>setIsModalOpen(false)}
      onSubmit={handleSubmit}
      />
   
    </>
  )
}

export default AddNewButton
