// Layout vacío para que /miembros/registro no herede el sidebar de /miembros
export default function RegistroLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
