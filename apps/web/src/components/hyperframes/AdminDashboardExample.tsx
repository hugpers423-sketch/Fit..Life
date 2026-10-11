"use client"

import {
  KPICard,
  KPICardGrid,
  Modal,
  FormModal,
  ConfirmModal,
  PageTransition,
  StaggerContainer,
  StaggerItem,
  LiveIndicator,
  StatusBadge,
  ConnectionStatus,
  TypingIndicator,
  ProgressRing,
  LiveCounter,
} from "@/components/hyperframes"
import { Users, DollarSign, TrendingDown, TrendingUp, ShoppingBag, Activity, Wifi, WifiOff, Loader2, Check } from "lucide-react"
import { useState, Fragment } from "react"
import { motion } from "framer-motion"

export function AdminDashboardExample() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)

  const kpiItems = [
    {
      label: "Usuarios totales",
      value: "1,247",
      delta: { value: "18%", trend: "up" as const, note: "este mes" },
      icon: <Users className="w-6 h-6" />,
      color: "emerald" as const,
    },
    {
      label: "Ingresos al mes",
      value: "$18,450",
      delta: { value: "22%", trend: "up" as const, note: "vs mes anterior" },
      icon: <DollarSign className="w-6 h-6" />,
      color: "cyan" as const,
    },
    {
      label: "Clientes que se van",
      value: "3.2%",
      delta: { value: "0.8%", trend: "down" as const, note: "mejoró" },
      icon: <TrendingDown className="w-6 h-6" />,
      color: "amber" as const,
    },
    {
      label: "Valor por cliente",
      value: "$142",
      delta: { value: "$12", trend: "up" as const, note: "vs trimestre" },
      icon: <TrendingUp className="w-6 h-6" />,
      color: "violet" as const,
    },
    {
      label: "Costo por cliente",
      value: "$18.40",
      delta: { value: "$3.20", trend: "down" as const, note: "más eficiente" },
      icon: <ShoppingBag className="w-6 h-6" />,
      color: "rose" as const,
    },
  ]

  const handleSubmit = async (data: FormData) => {
    await new Promise((r) => setTimeout(r, 1500))
    console.log("Form submitted:", Object.fromEntries(data))
    setIsFormModalOpen(false)
  }

  const gymFields = [
    { name: "nombre", label: "Nombre del gimnasio", type: "text" as const, placeholder: "Gimnasio FitLife", required: true },
    { name: "direccion", label: "Dirección", type: "text" as const, placeholder: "Av. Principal 123", required: true },
    { name: "servicio", label: "Servicio que ofrece", type: "text" as const, placeholder: "Crossfit, Yoga, Pesas", required: true },
    { name: "video", label: "URL del video (opcional)", type: "url" as const, placeholder: "https://youtube.com/..." },
    { name: "abre", label: "Abre (0-23)", type: "number" as const, placeholder: "6", required: true },
    { name: "cierra", label: "Cierra (0-23)", type: "number" as const, placeholder: "22", required: true },
  ]

  const restaurantFields = [
    { name: "nombre", label: "Nombre del restaurante", type: "text" as const, placeholder: "Green Bowl", required: true },
    { name: "direccion", label: "Dirección", type: "text" as const, placeholder: "Calle Saludable 45", required: true },
    { name: "servicio", label: "Tipo de comida", type: "text" as const, placeholder: "Vegano, Sin gluten", required: true },
    { name: "video", label: "URL del video (opcional)", type: "url" as const, placeholder: "https://instagram.com/..." },
    { name: "abre", label: "Abre (0-23)", type: "number" as const, placeholder: "11", required: true },
    { name: "cierra", label: "Cierra (0-23)", type: "number" as const, placeholder: "23", required: true },
  ]

  return (
    <>
      <PageTransition type="spring">
      <div className="p-6 space-y-8">
        {/* Header con live indicators */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Admin General</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Visión global de la plataforma · Actualizado hace 2 min
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionStatus isConnected={true} showLabel />
            <StatusBadge status="live" size="sm" />
            <StatusBadge status="streaming" size="sm" />
            <LiveCounter value={184} size="sm" color="emerald" prefix="" suffix=" evt/h" />
          </div>
        </motion.div>

        {/* KPI Grid con stagger */}
        <StaggerContainer delay={0.06}>
          <KPICardGrid items={kpiItems} />
        </StaggerContainer>

        {/* Apps Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Apps independientes — información en vivo
            </h2>
            <LiveIndicator color="emerald" label="live" size="sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "App Usuario", color: "emerald", icon: Activity, desc: "Registros de comidas y entrenos personales" },
              { label: "App Orientador", color: "amber", icon: Users, desc: "Guía nutricional y seguimiento" },
              { label: "App Servicio", color: "rose", icon: ShoppingBag, desc: "Restaurantes, gimnasios y ventas" },
            ].map((app, i) => (
              <StaggerItem key={app.label} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)" }}
                  whileTap={{ scale: 0.98 }}
                  className="p-5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-2xl border border-neutral-200 dark:border-neutral-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{app.label}</p>
                      <p className="mt-2 text-xl font-bold text-neutral-900 dark:text-white">—</p>
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{app.desc}</p>
                    </div>
                    <motion.div
                      initial={{ scale: 0.8, rotate: -12 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 20 }}
                      className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
                        app.color === "emerald" && "bg-emerald-500",
                        app.color === "amber" && "bg-amber-500",
                        app.color === "rose" && "bg-rose-500"
                      )}
                    >
                      <app.icon className="w-6 h-6 text-white" />
                    </motion.div>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </div>
        </motion.section>

        {/* Gyms & Restaurants Forms */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Gimnasios y restaurantes saludables
            </h2>
            <LiveIndicator color="emerald" label="live" size="sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsFormModalOpen(true)}
              className="p-5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-2xl border border-neutral-200 dark:border-neutral-800 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">Agregar Gimnasio</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Registrar nuevo gimnasio</p>
                </div>
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsFormModalOpen(true)}
              className="p-5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-2xl border border-neutral-200 dark:border-neutral-800 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">Agregar Restaurante</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Registrar nuevo restaurante</p>
                </div>
              </div>
            </motion.button>
          </div>
        </motion.section>

        {/* Progress & Live Data */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.div className="p-5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Progreso del día</h3>
            <ProgressRing progress={0.68} size={120} strokeWidth={8} color="emerald" showValue />
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-3">68% completado</p>
          </motion.div>
          <motion.div className="p-5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Actividad en vivo</h3>
            <div className="space-y-3">
              {[
                { text: "Carlos Miz completó un reto de 7 días", type: "chal", time: "hace 1 min" },
                { text: "Nuevo usuario registrado — plan Pro", type: "user", time: "hace 3 min" },
                { text: "Pago recibido: $49.99 — Plan Pro", type: "money", time: "hace 5 min" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50"
                >
                  <LiveIndicator size="xs" color="emerald" pulse />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{item.text}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.time}</p>
                  </div>
                  <StatusBadge status={item.type === "chal" ? "live" : item.type === "user" ? "online" : "recording"} size="xs" />
                </motion.div>
              ))}
            </div>
          </motion.div>
          <motion.div className="p-5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Métricas en tiempo real</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <LiveCounter value={184} size="md" color="emerald" suffix=" evt/h" />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Eventos/hora</p>
              </div>
              <div className="text-center">
                <LiveCounter value={63} size="md" color="amber" suffix=" online" />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Usuarios online</p>
              </div>
              <div className="text-center">
                <LiveCounter value={99.98} size="md" color="amber" suffix="%" prefix="" />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Uptime</p>
              </div>
            </div>
          </motion.div>
        </motion.section>
      </div>
    </PageTransition>

      {/* Modals */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detalles del Gimnasio" size="lg">
        <p className="text-neutral-600 dark:text-neutral-400">Contenido del modal de detalles...</p>
      </Modal>

      <FormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title="Agregar Gimnasio"
        description="Completa la información para registrar un nuevo gimnasio"
        onSubmit={handleSubmit}
        submitLabel="Agregar Gimnasio"
        fields={gymFields}
        size="lg"
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={async () => { await new Promise(r => setTimeout(r, 1000)); console.log("Eliminado") }}
        title="Eliminar Gimnasio"
        message="¿Estás seguro de que quieres eliminar este gimnasio? Esta acción no se puede deshacer."
        variant="danger"
      />
    </>
  )
}

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ")