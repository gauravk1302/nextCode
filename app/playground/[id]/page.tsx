"use client"
import { usePlayground } from '@/modules/playground/hooks/usePlayground';
import { useParams } from 'next/navigation'
import React from 'react'

const MainPagePlayground = () => {
    const {id} = useParams<{id:string}>();

    const {playgroundData,
    templateData,
    isLoading,
    error,
    loadPlayground,
    saveTemplateData,} = usePlayground(id)

    console.log("templateData",templateData)
    console.log("playgroundData",playgroundData)
  return (
    <div> 
        <span className=' text-[20px]'>Params: {id}</span>
    </div>
  )
}

export default MainPagePlayground

//based onn this id we are going to fetch the user data of playround which will give us the template which will give us the template files/folder path and then  with the help of the path-to-json we will render the template on the monaco editor 