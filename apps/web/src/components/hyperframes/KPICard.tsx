"use client"

import { motion, stagger } from "framer-motion"
import { cn } from "@/lib/utils"

interface KPICardProps {
  label: string
  value: string | number
  delta?: { value: string; trend: "up" | "down"; note: string }
  icon?: React.ReactNode
  color?: "emerald" | "amber" | "cyan" | "rose" | "violet"
  href?: string
  children?: React.ReactNode
  index?: number
}

const colorClasses = {
  emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
  cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400",
  rose: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  violet: "bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400",
}

const iconBg = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  cyan: "bg-cyan-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
}

export function KPICard({
  label,
  value,
  delta,
  icon,
  color = "emerald",
  href,
  children,
  index = 0,
}: KPICardProps) {
  const Component = href ? "a" : "div"

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        delay: index * 0.08,
      }}
      whileHover={{ y: -4, scale: 1.01, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)", transition: { type: "spring", stiffness: 400, damping: 17 } }}
      whileTap={{ scale: 0.98, transition: { type: "spring", stiffness: 400, damping: 17 } }}
    >
      <Component
        className={cn(
          "relative group flex flex-col p-5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm",
          "rounded-2xl border transition-all duration-300",
          colorClasses[color],
          "hover:border-opacity-40 hover:shadow-xl"
        )}
        href={href}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              {label}
            </p>
            <motion.p
              key={String(value)}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white"
            >
              {value}
            </motion.p>
            {delta && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 25 }}
                className="mt-2 flex items-center gap-1.5"
              >
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-semibold",
                    delta.trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {delta.trend === "up" ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/><path d="M12 19V5"/></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/><path d="M12 5v14"/></svg>
                  )}
                  {delta.value}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{delta.note}</span>
              </motion.div>
            )}
          </div>
          {icon && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 20 }}
              className={cn(
                "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
                iconBg[color]
              )}
            >
              <span className="text-white">{icon}</span>
            </motion.div>
          )}
        </div>
        {children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ delay: 0.4 }}
            className="mt-4 pt-4 border-t border-current/10"
          >
            {children}
          </motion.div>
        )}
      </Component>
    </motion.div>
  )
}

export function KPICardGrid({ items }: { items: KPICardProps[] }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { transition: { staggerChildren: 0.06 } },
      }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
      role="list"
    >
      {items.map((item, i) => (
        <KPICard key={item.label} {...item} index={i} />
      ))}
    </motion.div>
  )
}