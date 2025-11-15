'use client'
import CitizenSidebar from '../../components/CitizenSidebar'

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <CitizenSidebar />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
