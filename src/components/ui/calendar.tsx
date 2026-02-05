"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

// 1. SELECTOR PERSONALIZADO CORREGIDO (COMPARACIÓN ESTRICTA DE VALORES)
function CustomDropdown({ 
  options, 
  value, 
  onChange 
}: { 
  options: { value: number; label: string }[], 
  value: number, 
  onChange: (val: number) => void 
}) {
  const [open, setOpen] = React.useState(false);
  const currentLabel = options.find(o => Number(o.value) === Number(value))?.label;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between bg-blue-600 text-white px-3 py-1.5 rounded-md min-w-[100px] text-[11px] font-black uppercase shadow-md hover:bg-blue-700 transition-all border-none"
      >
        <span className="truncate">{currentLabel}</span>
        <div className="flex flex-col ml-2 opacity-80">
          <ChevronUp className="h-2 w-2" />
          <ChevronDown className="h-2 w-2" />
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 bg-white border border-slate-200 shadow-2xl rounded-md z-40 w-full max-h-[180px] overflow-y-auto overflow-x-hidden">
            {options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "px-3 py-2 text-[10px] font-bold uppercase cursor-pointer transition-colors text-left",
                  // CORRECCIÓN: Comparación numérica para asegurar el azul sólido
                  Number(opt.value) === Number(value) 
                    ? "bg-blue-600 text-white hover:bg-blue-600" 
                    : "text-slate-600 hover:bg-blue-50"
                )}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-0 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-4 pb-6",
        caption: "flex justify-center py-6 relative items-center bg-[#0a0a4d] text-white px-12",
        caption_label: "hidden", 
        caption_dropdowns: "flex justify-center gap-2 z-20",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 bg-transparent p-0 text-white hover:bg-white/10 opacity-100 border-none"
        ),
        nav_button_previous: "absolute left-2",
        nav_button_next: "absolute right-2",
        table: "w-full border-collapse space-y-1 px-6",
        head_row: "flex justify-center gap-1 mt-4 px-6",
        head_cell: "text-slate-400 w-9 font-black text-[10px] uppercase tracking-[0.2em]",
        row: "flex w-full mt-2 justify-center gap-1 px-6",
        cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-bold text-slate-600 transition-all rounded-full hover:bg-blue-50 hover:text-blue-600"
        ),
        day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white rounded-full font-black shadow-lg scale-110",
        day_today: "text-blue-600 font-black border-b-2 border-blue-600 rounded-none",
        day_outside: "text-slate-300 opacity-20",
        day_disabled: "text-slate-200 opacity-50",
        day_hidden: "invisible",
        vhidden: "hidden", 
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-5 w-5" />,
        IconRight: () => <ChevronRight className="h-5 w-5" />,
        Dropdown: ({ value, onChange, children }: any) => {
          const options = React.Children.toArray(children).map((child: any) => ({
            value: Number(child.props.value),
            label: String(child.props.children),
          }));
          return (
            <CustomDropdown
              options={options}
              value={Number(value)}
              onChange={(val) => {
                const event = { target: { value: String(val) } } as any;
                onChange?.(event);
              }}
            />
          );
        }
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }