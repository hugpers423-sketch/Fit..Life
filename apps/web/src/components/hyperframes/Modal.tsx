"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, FormEvent } from "react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl" | "full"
  showCloseButton?: boolean
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-6xl",
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showCloseButton = true,
}: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 28,
              duration: 0.35,
            }}
            className={cn(
              "fixed inset-0 z-50 flex items-center justify-center p-4",
              "pointer-events-none"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.05 }}
              className={cn(
                "relative w-full bg-white dark:bg-neutral-950 rounded-2xl shadow-2xl",
                "overflow-hidden pointer-events-auto",
                sizeClasses[size]
              )}
            >
              <div className="flex items-start justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h2>
                  {description && (
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="flex-shrink-0 p-1.5 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    aria-label="Cerrar"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                )}
              </div>
              <div className="p-5 max-h-[70vh] overflow-y-auto">
                {children}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

interface FormModalProps extends Omit<ModalProps, "children"> {
  onSubmit: (data: FormData) => Promise<void>
  submitLabel?: string
  isLoading?: boolean
  fields: FormField[]
}

interface FormField {
  name: string
  label: string
  type?: "text" | "email" | "number" | "tel" | "url" | "textarea" | "select"
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  className?: string
}

export function FormModal({
  isOpen,
  onClose,
  title,
  description,
  onSubmit,
  submitLabel = "Guardar",
  isLoading = false,
  fields,
  ...modalProps
}: FormModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    fields.forEach((field) => {
      const value = formData.get(field.name)
      if (field.required && (!value || (typeof value === "string" && !value.trim()))) {
        newErrors[field.name] = `${field.label} es requerido`
      }
    })
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    const formElement = e.currentTarget
    const formData = new FormData(formElement)
    await onSubmit(formData)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} {...modalProps}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <motion.div
            key={field.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * fields.indexOf(field) }}
            className={cn("space-y-1.5", field.className)}
          >
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {field.label} {field.required && <span className="text-rose-500">*</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea
                name={field.name}
                value={formData[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                rows={3}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-white dark:bg-neutral-900",
                  "text-neutral-900 dark:text-white placeholder:text-neutral-400",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  errors[field.name] && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                )}
                disabled={isLoading}
              />
            ) : field.type === "select" ? (
              <select
                name={field.name}
                value={formData[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-white dark:bg-neutral-900",
                  "text-neutral-900 dark:text-white",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  errors[field.name] && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                )}
                disabled={isLoading}
              >
                <option value="">Seleccionar...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type || "text"}
                name={field.name}
                value={formData[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-white dark:bg-neutral-900",
                  "text-neutral-900 dark:text-white placeholder:text-neutral-400",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  errors[field.name] && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                )}
                disabled={isLoading}
              />
            )}
            {errors[field.name] && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-rose-500"
              >
                {errors[field.name]}
              </motion.p>
            )}
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * (fields.length + 1) }}
          className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </motion.button>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "px-6 py-2.5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700",
              "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:ring-offset-2 dark:focus:ring-offset-neutral-950",
              "transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </span>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                {submitLabel}
              </>
            )}
          </motion.button>
        </motion.div>
      </form>
    </Modal>
  )
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  isLoading = false,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "primary"
  isLoading?: boolean
}) {
  const handleConfirm = async () => {
    await onConfirm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-neutral-600 dark:text-neutral-400 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          disabled={isLoading}
        >
          {cancelLabel}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleConfirm}
          className={cn(
            "px-6 py-2.5 rounded-xl font-semibold text-white transition-all",
            variant === "danger"
              ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/20"
              : "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/20"
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
          ) : (
            confirmLabel
          )}
        </motion.button>
      </div>
    </Modal>
  )
}