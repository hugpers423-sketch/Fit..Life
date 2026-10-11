"use client"

import { motion, AnimatePresence, type Variant, type Transition } from "framer-motion"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"

const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98, filter: "blur(8px)" },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0)",
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
      duration: 0.5,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 1.02,
    filter: "blur(8px)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 35,
      duration: 0.3,
    },
  },
} as const satisfies Record<string, Variant>

const slideVariants = {
  initial: { opacity: 0, x: 30 },
  enter: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 500, damping: 30 } },
  exit: { opacity: 0, x: -30, transition: { type: "spring", stiffness: 400, damping: 35 } },
} as const satisfies Record<string, Variant>

const fadeVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
} as const satisfies Record<string, Variant>

const scaleVariants = {
  initial: { opacity: 0, scale: 0.9, filter: "blur(4px)" },
  enter: { opacity: 1, scale: 1, filter: "blur(0)", transition: { type: "spring", stiffness: 500, damping: 28 } },
  exit: { opacity: 0, scale: 1.05, filter: "blur(4px)", transition: { type: "spring", stiffness: 400, damping: 35 } },
} as const satisfies Record<string, Variant>

type TransitionType = "spring" | "slide" | "fade" | "scale"

interface PageTransitionProps {
  children: ReactNode
  type?: TransitionType
  className?: string
  layoutId?: string
}

export function PageTransition({
  children,
  type = "spring",
  className,
  layoutId = "page",
}: PageTransitionProps) {
  const pathname = usePathname()

  const variants = {
    spring: pageVariants,
    slide: slideVariants,
    fade: fadeVariants,
    scale: scaleVariants,
  }[type]

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={variants}
        layoutId={layoutId}
        className={className}
        style={{ width: "100%" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function PageTransitionWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen"
    >
      <PageTransition type="spring">{children}</PageTransition>
    </motion.div>
  )
}

export function StaggerContainer({ children, delay = 0.1 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { transition: { staggerChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function LayoutTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div layout className="relative">
      <AnimatePresence mode="popLayout">{children}</AnimatePresence>
    </motion.div>
  )
}

export function ReorderGroup({
  items,
  onReorder,
  children,
  axis = "y",
  className,
}: {
  items: string[]
  onReorder: (newItems: string[]) => void
  children: (item: string, index: number) => ReactNode
  axis?: "x" | "y"
  className?: string
}) {
  return (
    <motion.ul
      className={cn("flex flex-col gap-2", className)}
    >
      {items.map((item, index) => (
        <motion.li key={item} layout drag={axis === "y" ? "y" : "x"} dragElastic={0.2}>
          {children(item, index)}
        </motion.li>
      ))}
    </motion.ul>
  )
}

export function SharedLayout({ children, id }: { children: ReactNode; id: string }) {
  return <motion.div layoutId={id}>{children}</motion.div>
}

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ")