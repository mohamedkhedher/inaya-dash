import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 bg-gray-50">
        <Header />
        <main className="flex-1 overflow-auto pt-16 lg:pt-0 bg-gray-50">
          <div className="container mx-auto px-4 py-6 lg:px-6 lg:py-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}



