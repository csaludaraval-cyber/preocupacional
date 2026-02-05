"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date
  onSelect: (date: Date | undefined) => void
  placeholder?: string
}

export function DatePicker({ value, onSelect, placeholder = "SELECCIONAR FECHA" }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-black text-[11px] h-11 bg-white border-slate-200 hover:border-blue-400 transition-all uppercase tracking-widest",
            !value && "text-slate-400 font-bold"
          )}
        >
          <CalendarIcon className="mr-3 h-4 w-4 text-blue-600" />
          {value ? format(value, "dd 'de' MMMM, yyyy", { locale: es }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-xl overflow-hidden" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onSelect}
          initialFocus
          locale={es}
          captionLayout="dropdown" // Modo dropdown limpio
          fromYear={1945}
          toYear={new Date().getFullYear() + 1}
        />
      </PopoverContent>
    </Popover>
  )
}