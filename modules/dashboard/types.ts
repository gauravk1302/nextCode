export interface User {
  id: string
  name: string
  email: string
  image: string
  role: string
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  title: string
  description: string
  template: string
  createdAt: Date
  updatedAt: Date
  userId: string
  is_marked?: boolean | null
  user_name?: string | null
  user_email?: string | null
  user_image?: string | null
  Starmark: { isMarked: boolean }[]
   user?: {
    name?: string | null
    image?: string | null
    email?: string | null
  }
}
