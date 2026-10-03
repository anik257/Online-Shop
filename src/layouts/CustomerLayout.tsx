import React from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Footer } from '../components/common/Footer'

export const CustomerLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F6] text-neutral-900">
      <Header />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
