'use client'

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DatePickerInputProps {
  value?: Date | string | null
  onChange?: (date: Date | null) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  id?: string
  name?: string
  required?: boolean
}

/**
 * Parsea fechas en múltiples formatos comunes (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY, DDMMYYYY, etc.)
 */
export function parseDateFlexible(input: string): Date | null {
  if (!input || typeof input !== "string") return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // 1. Formato ISO: YYYY-MM-DD o YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10)
    const month = parseInt(isoMatch[2], 10)
    const day = parseInt(isoMatch[3], 10)
    return validateAndCreateDate(year, month, day)
  }

  // 2. Formato latino / peruano: DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10)
    const month = parseInt(dmyMatch[2], 10)
    let year = parseInt(dmyMatch[3], 10)
    if (year < 100) {
      year += year < 50 ? 2000 : 1900
    }
    return validateAndCreateDate(year, month, day)
  }

  // 3. 8 dígitos corridos: DDMMYYYY
  const digits8 = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/)
  if (digits8) {
    const day = parseInt(digits8[1], 10)
    const month = parseInt(digits8[2], 10)
    const year = parseInt(digits8[3], 10)
    return validateAndCreateDate(year, month, day)
  }

  // 4. Intento con Date estándar
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) {
    return d
  }

  return null
}

function validateAndCreateDate(year: number, month: number, day: number): Date | null {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }
  const date = new Date(year, month - 1, day, 12, 0, 0)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null // Fecha inválida (ej. 31 de febrero)
  }
  return date
}

function formatDateToDMY(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return ""
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function formatDateToISO(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return ""
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${year}-${month}-${day}`
}

export const DatePickerInput = React.forwardRef<HTMLInputElement, DatePickerInputProps>(
  ({ value, onChange, disabled, placeholder = "dd/mm/aaaa", className, id, name, required }, ref) => {
    const [textValue, setTextValue] = React.useState<string>(() => formatDateToDMY(value))
    const nativePickerRef = React.useRef<HTMLInputElement>(null)

    // Sincronizar texto cuando el value externo cambia
    React.useEffect(() => {
      setTextValue(formatDateToDMY(value))
    }, [value])

    // Manejar pegado de texto completo (Ctrl + V)
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData("text")
      if (!pastedText) return

      const parsed = parseDateFlexible(pastedText)
      if (parsed) {
        e.preventDefault()
        const formatted = formatDateToDMY(parsed)
        setTextValue(formatted)
        onChange?.(parsed)
      }
    }

    // Manejar tipeo manual con auto-formateo
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      // Permitir solo números y barras/guiones
      const cleaned = raw.replace(/[^\d/-]/g, "")
      
      // Auto-insertar barras si el usuario escribe solo dígitos
      let formatted = cleaned
      if (/^\d{3,8}$/.test(cleaned) && !cleaned.includes("/") && !cleaned.includes("-")) {
        if (cleaned.length >= 5) {
          formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`
        } else if (cleaned.length >= 3) {
          formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`
        }
      }

      setTextValue(formatted)

      // Si tiene formato completo DD/MM/YYYY, validar y actualizar
      if (formatted.length === 10) {
        const parsed = parseDateFlexible(formatted)
        if (parsed) {
          onChange?.(parsed)
        }
      } else if (formatted === "") {
        onChange?.(null)
      }
    }

    // Validar al salir del campo (onBlur)
    const handleBlur = () => {
      if (!textValue || textValue.trim() === "") {
        setTextValue("")
        onChange?.(null)
        return
      }

      const parsed = parseDateFlexible(textValue)
      if (parsed) {
        const formatted = formatDateToDMY(parsed)
        setTextValue(formatted)
        onChange?.(parsed)
      } else {
        // Si lo ingresado es inválido, revertir a la fecha válida actual o limpiar
        setTextValue(formatDateToDMY(value))
      }
    }

    // Al seleccionar fecha en el picker nativo de calendario
    const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isoVal = e.target.value
      if (!isoVal) {
        setTextValue("")
        onChange?.(null)
        return
      }
      const parsed = parseDateFlexible(isoVal)
      if (parsed) {
        setTextValue(formatDateToDMY(parsed))
        onChange?.(parsed)
      }
    }

    const openCalendarPicker = () => {
      if (disabled) return
      try {
        if (nativePickerRef.current) {
          if (typeof nativePickerRef.current.showPicker === "function") {
            nativePickerRef.current.showPicker()
          } else {
            nativePickerRef.current.focus()
          }
        }
      } catch {
        nativePickerRef.current?.focus()
      }
    }

    return (
      <div className="relative flex items-center w-full">
        <input
          ref={ref}
          type="text"
          id={id}
          name={name}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={textValue}
          onChange={handleInputChange}
          onPaste={handlePaste}
          onBlur={handleBlur}
          maxLength={10}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        />
        
        {/* Botón de ícono de calendario */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={openCalendarPicker}
          title="Seleccionar del calendario"
          className="absolute right-2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted focus:outline-none disabled:opacity-50 cursor-pointer"
        >
          <CalendarIcon className="h-4 w-4" />
        </button>

        {/* Input nativo date invisible para usar su popup de calendario cuando se hace clic en el icono */}
        <input
          ref={nativePickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
          value={formatDateToISO(value)}
          onChange={handleNativePickerChange}
          className="sr-only absolute pointer-events-none opacity-0 w-0 h-0"
        />
      </div>
    )
  }
)

DatePickerInput.displayName = "DatePickerInput"
