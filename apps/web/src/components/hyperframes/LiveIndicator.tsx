"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

interface LiveIndicatorProps {
  size?: "xs" | "sm" | "md" | "lg"
  color?: "emerald" | "amber" | "rose" | "cyan" | "violet"
  label?: string
  pulse?: boolean
  className?: string
  showDot?: boolean
}

const sizeClasses = {
  xs: "w-1.5 h-1.5 text-[10px]",
  sm: "w-2 h-2 text-[11px]",
  md: "w-2.5 h-2.5 text-[12px]",
  lg: "w-3 h-3 text-[13px]",
}

const colorClasses = {
  emerald: "bg-emerald-500 shadow-emerald-500/50",
  amber: "bg-amber-500 shadow-amber-500/50",
  rose: "bg-rose-500 shadow-rose-500/50",
  cyan: "bg-cyan-500 shadow-cyan-500/50",
  violet: "bg-violet-500 shadow-violet-500/50",
}

export function LiveIndicator({
  size = "md",
  color = "emerald",
  label,
  pulse = true,
  className,
  showDot = true,
}: LiveIndicatorProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        sizeClasses[size],
        className
      )}
      style={{ color: "inherit" }}
    >
      {showDot && (
        <motion.span
          className={cn(
            "relative rounded-full flex-shrink-0",
            sizeClasses[size].replace("text-", ""),
            colorClasses[color]
          )}
          animate={pulse && !prefersReducedMotion ? { scale: [1, 1.3, 1], opacity: [1, 0.4, 1] } : {}}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 0.5,
            ease: "easeInOut",
          }}
        >
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: "inherit" }}
            animate={pulse && !prefersReducedMotion ? { scale: [1, 2, 1], opacity: [0.6, 0, 0] } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
              ease: "easeOut",
            }}
          />
        </motion.span>
      )}
      {label && <span className="whitespace-nowrap">{label}</span>}
    </motion.span>
  )
}

interface StatusBadgeProps {
  status: "live" | "online" | "busy" | "away" | "offline" | "recording" | "streaming"
  size?: "xs" | "sm" | "md"
  className?: string
}

const statusConfig = {
  live: { color: "rose", label: "EN VIVO", pulse: true },
  online: { color: "emerald", label: "ONLINE", pulse: true },
  busy: { color: "amber", label: "OCUPADO", pulse: false },
  away: { color: "amber", label: "AUSENTE", pulse: false },
  offline: { color: "emerald", label: "OFFLINE", pulse: false },
  recording: { color: "rose", label: "GRABANDO", pulse: true },
  streaming: { color: "violet", label: "STREAMING", pulse: true },
} as const

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return <LiveIndicator size={size} color={config.color} label={config.label} pulse={config.pulse} className={className} />
}

export function ConnectionStatus({
  isConnected,
  size = "md",
  showLabel = true,
}: { isConnected: boolean; size?: "xs" | "sm" | "md"; showLabel?: boolean }) {
  return (
    <LiveIndicator
      size={size}
      color={isConnected ? "emerald" : "rose"}
      label={showLabel ? (isConnected ? "Conectado" : "Desconectado") : undefined}
      pulse={isConnected}
    />
  )
}

export function TypingIndicator({ size = "md", color = "cyan" }: { size?: "xs" | "sm" | "md"; color?: "emerald" | "amber" | "rose" | "cyan" | "violet" }) {
  return (
    <motion.span className="inline-flex items-center gap-1">
      <motion.span
        className={cn("rounded-full", sizeClasses[size], colorClasses[color])}
        animate={{ scale: [1, 0.5, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className={cn("rounded-full", sizeClasses[size], colorClasses[color])}
        animate={{ scale: [1, 0.5, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
      />
      <motion.span
        className={cn("rounded-full", sizeClasses[size], colorClasses[color])}
        animate={{ scale: [1, 0.5, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
      />
    </motion.span>
  )
}

export function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  color = "emerald",
  showValue = true,
  className,
}: {
  progress: number
  size?: number
  strokeWidth?: number
  color?: "emerald" | "amber" | "rose" | "cyan" | "violet"
  showValue?: boolean
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)))

  const colorMap = {
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    rose: "text-rose-500",
    cyan: "text-cyan-500",
    violet: "text-violet-500",
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-neutral-200 dark:text-neutral-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(colorMap[color], "transition-all duration-500")}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transformOrigin: "center",
            transform: "rotate(-90deg)",
          }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: "spring", stiffness: 300, damping: 25, duration: 1 }}
        />
      </svg>
      {showValue && (
        <motion.span
          className="absolute inset-0 flex items-center justify-center font-bold"
          style={{ fontSize: size * 0.18 }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 20 }}
        >
          {Math.round(progress * 100)}%
        </motion.span>
      )}
    </div>
  )
}

export function LiveCounter({
  value,
  size = "md",
  color = "emerald",
  prefix = "",
  suffix = "",
  className,
}: {
  value: number
  size?: "xs" | "sm" | "md" | "lg"
  color?: "emerald" | "amber" | "rose" | "cyan" | "violet"
  prefix?: string
  suffix?: string
  className?: string
}) {
  return (
    <motion.span
      className={cn("inline-flex items-center gap-1 font-bold", sizeClasses[size], className)}
      style={{ color: "inherit" }}
    >
      {prefix}
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
        className={cn("text-neutral-900 dark:text-white", colorClasses[color].replace("bg-", "text-").replace("shadow-", ""))}
      >
        {value.toLocaleString()}
      </motion.span>
      {suffix}
    </motion.span>
  )
}

